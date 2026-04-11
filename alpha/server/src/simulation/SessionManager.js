/**
 * SessionManager - Manages all active game sessions
 *
 * Responsibilities:
 * - Create/destroy game sessions
 * - Route WebSocket connections to sessions
 * - Handle autosave for all active sessions
 * - Clean up idle sessions
 */

import { EventEmitter } from 'events';
import { GameSession } from './GameSession.js';
import { v4 as uuidv4 } from 'uuid';

export class SessionManager extends EventEmitter {
    constructor(options = {}) {
        super();

        this.sessions = new Map(); // id -> GameSession
        this.clientSessions = new Map(); // ws -> sessionId

        // Configuration
        this.options = {
            maxSessions: options.maxSessions || 10,
            autosaveInterval: options.autosaveInterval || 5 * 60 * 1000, // 5 minutes
            idleTimeout: options.idleTimeout || 30 * 60 * 1000, // 30 minutes
            ...options
        };

        // Database reference (injected)
        this.db = options.db || null;

        // Start background tasks
        this._startAutosave();
        this._startIdleCleanup();
    }

    /**
     * Inject database reference
     */
    setDatabase(db) {
        this.db = db;
    }

    /**
     * Create a new game session
     * @param {Object} options - Session options
     * @returns {Promise<GameSession>}
     */
    async createSession(options = {}) {
        // Check session limit
        if (this.sessions.size >= this.options.maxSessions) {
            throw new Error(`Maximum session limit (${this.options.maxSessions}) reached`);
        }

        const sessionId = options.id || uuidv4();
        const session = new GameSession({
            id: sessionId,
            name: options.name || `Game ${this.sessions.size + 1}`,
            seed: options.seed || Date.now(),
            config: options.config || {},
            userId: options.userId
        });

        // Initialize engine
        const savedState = options.savedState || null;
        await session.initialize(savedState);

        // Store session
        this.sessions.set(sessionId, session);

        // Set up session event handlers
        this._setupSessionEvents(session);

        console.log(`📝 Created session ${sessionId} (${this.sessions.size} active)`);
        this.emit('sessionCreated', session.getInfo());

        return session;
    }

    /**
     * Get session by ID
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    /**
     * Get all sessions info
     */
    getAllSessions() {
        return Array.from(this.sessions.values()).map(s => s.getInfo());
    }

    /**
     * Delete a session
     */
    async deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }

        // Save final state before destroying
        if (this.db) {
            try {
                await this._saveSession(session, 'final_save');
            } catch (e) {
                console.warn(`Could not save final state for session ${sessionId}:`, e);
            }
        }

        // Clean up
        session.destroy();
        this.sessions.delete(sessionId);

        // Remove client mappings
        for (const [ws, sid] of this.clientSessions) {
            if (sid === sessionId) {
                this.clientSessions.delete(ws);
            }
        }

        console.log(`🗑️ Deleted session ${sessionId} (${this.sessions.size} active)`);
        this.emit('sessionDeleted', { sessionId });

        return true;
    }

    /**
     * Connect a WebSocket client to a session
     */
    connectClient(ws, sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Check if already connected to this session
        const existingSessionId = this.clientSessions.get(ws);
        if (existingSessionId === sessionId) {
            // Already connected to this session, just return it
            return session;
        }

        // If connected to a different session, leave it first
        if (existingSessionId) {
            const oldSession = this.sessions.get(existingSessionId);
            if (oldSession) {
                oldSession.removeClient(ws);
            }
        }

        // Track client -> session mapping
        this.clientSessions.set(ws, sessionId);

        // Add client to session
        session.addClient(ws);

        // Handle disconnect - use 'once' since close only fires once per connection
        // and check if we haven't already added a listener for this ws
        if (!ws._sessionManagerCloseHandler) {
            ws._sessionManagerCloseHandler = () => {
                this.clientSessions.delete(ws);
            };
            ws.once('close', ws._sessionManagerCloseHandler);
        }

        return session;
    }

    /**
     * Handle WebSocket message from client
     */
    handleMessage(ws, message) {
        const sessionId = this.clientSessions.get(ws);
        if (!sessionId) {
            console.warn('Message from unconnected client');
            return;
        }

        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn(`Session ${sessionId} not found for client message`);
            return;
        }

        try {
            const data = typeof message === 'string' ? JSON.parse(message) : message;

            switch (data.type) {
                case 'COMMAND':
                    const result = session.handleCommand(data.command, data.payload);
                    if (result !== undefined) {
                        ws.send(JSON.stringify({
                            type: 'COMMAND_RESULT',
                            command: data.command,
                            payload: result
                        }));
                    }
                    break;

                case 'PING':
                    ws.send(JSON.stringify({
                        type: 'PONG',
                        timestamp: Date.now()
                    }));
                    break;

                default:
                    console.warn(`Unknown message type: ${data.type}`);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: error.message }
            }));
        }
    }

    /**
     * Set up event handlers for a session
     */
    _setupSessionEvents(session) {
        session.on('error', (error) => {
            console.error(`Session ${session.id} error:`, error);
            this.emit('sessionError', { sessionId: session.id, error });
        });

        session.on('tick', (tickData) => {
            // Could aggregate metrics here
        });

        // Save whenever the simulation is paused so progress is never lost
        session.on('paused', () => {
            this._saveSession(session, 'pause_save').catch(e => {
                console.warn(`Could not save on pause for session ${session.id}:`, e);
            });
        });
    }

    /**
     * Save session state to database
     */
    async _saveSession(session, slotName = 'autosave') {
        if (!this.db) return;

        const state = session.getState();
        if (!state) return;

        try {
            const stateJson = JSON.stringify(state);
            const gameHour = state.clock
                ? (state.clock.year - 2025) * 8760 +
                  (state.clock.month - 1) * 730 +
                  (state.clock.day - 1) * 24 +
                  state.clock.hour
                : 0;

            // Save to database
            await this.db.saveGameState(
                session.id,
                gameHour,
                stateJson,
                slotName === 'autosave',
                slotName
            );

            console.log(`💾 Saved session ${session.id} (${slotName})`);
        } catch (error) {
            console.error(`Failed to save session ${session.id}:`, error);
            throw error;
        }
    }

    /**
     * Load session from database
     */
    async loadSession(gameId, saveId = null) {
        if (!this.db) {
            throw new Error('Database not configured');
        }

        // Get game info
        const game = await this.db.getGame(gameId);
        if (!game) {
            throw new Error(`Game ${gameId} not found`);
        }

        // Get saved state
        const save = saveId
            ? await this.db.getGameState(saveId)
            : await this.db.getLatestGameState(gameId);

        let savedState = null;
        if (save?.state_json) {
            savedState = JSON.parse(save.state_json);
        }

        // Create session with saved state
        return this.createSession({
            id: game.id,
            name: game.name,
            seed: game.seed,
            config: typeof game.config === 'string' ? JSON.parse(game.config) : (game.config || {}),
            savedState
        });
    }

    /**
     * Start autosave interval
     */
    _startAutosave() {
        if (this.autosaveTimer) return;

        this.autosaveTimer = setInterval(async () => {
            for (const session of this.sessions.values()) {
                if (session.status === 'active' || session.status === 'paused') {
                    try {
                        await this._saveSession(session, 'autosave');
                    } catch (e) {
                        // Continue with other sessions
                    }
                }
            }
        }, this.options.autosaveInterval);
    }

    /**
     * Start idle session cleanup
     */
    _startIdleCleanup() {
        if (this.cleanupTimer) return;

        this.cleanupTimer = setInterval(() => {
            const now = Date.now();
            for (const [id, session] of this.sessions) {
                // Skip if clients connected
                if (session.clients.size > 0) continue;

                const idleTime = now - session.lastActivity.getTime();
                if (idleTime > this.options.idleTimeout) {
                    console.log(`⏰ Session ${id} idle for ${Math.round(idleTime / 60000)}m, cleaning up`);
                    this.deleteSession(id);
                }
            }
        }, 60000); // Check every minute
    }

    /**
     * Shutdown all sessions
     */
    async shutdown() {
        console.log('🛑 SessionManager shutting down...');

        // Clear timers
        if (this.autosaveTimer) {
            clearInterval(this.autosaveTimer);
        }
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        // Save all sessions
        for (const session of this.sessions.values()) {
            try {
                await this._saveSession(session, 'shutdown_save');
            } catch (e) {
                console.warn(`Could not save session ${session.id} on shutdown`);
            }
        }

        // Destroy all sessions
        for (const id of Array.from(this.sessions.keys())) {
            await this.deleteSession(id);
        }

        this.removeAllListeners();
        console.log('✅ SessionManager shutdown complete');
    }
}
