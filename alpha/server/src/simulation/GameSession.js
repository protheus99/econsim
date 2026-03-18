/**
 * GameSession - Wraps a single game instance with its EngineAdapter
 *
 * Manages the lifecycle of one game:
 * - Engine initialization and state
 * - Connected WebSocket clients
 * - Tick event broadcasting
 * - Save/load operations
 */

import { EventEmitter } from 'events';
import { EngineAdapter } from '../adapters/EngineAdapter.js';

export class GameSession extends EventEmitter {
    constructor(options = {}) {
        super();

        this.id = options.id;
        this.name = options.name || `Game ${this.id}`;
        this.seed = options.seed || Date.now();
        this.config = options.config || {};
        this.userId = options.userId || null; // For future multi-user support

        this.engine = null;
        this.clients = new Set(); // Connected WebSocket clients
        this.status = 'initializing'; // initializing, active, paused, error
        this.createdAt = new Date();
        this.lastActivity = new Date();

        // State tracking for delta updates
        this.previousState = null;
        this.tickCount = 0;
    }

    /**
     * Initialize the game session with a new or restored engine
     * @param {Object} savedState - Optional saved state to restore
     */
    async initialize(savedState = null) {
        try {
            console.log(`🎮 Initializing game session: ${this.id}`);

            // Create engine adapter
            this.engine = new EngineAdapter({
                seed: this.seed,
                ...this.config
            });

            // Hook into engine events
            this._setupEngineEvents();

            // Initialize engine
            await this.engine.initialize();

            // Restore state if provided
            if (savedState) {
                await this.engine.restoreState(savedState);
                console.log(`📂 Restored game state from save`);
            }

            this.status = 'paused';
            console.log(`✅ Game session ${this.id} ready`);

            this.emit('initialized', this.getInfo());
            return true;

        } catch (error) {
            this.status = 'error';
            console.error(`❌ Game session ${this.id} initialization failed:`, error);
            this.emit('error', { type: 'init', error: error.message });
            throw error;
        }
    }

    /**
     * Set up event forwarding from engine
     */
    _setupEngineEvents() {
        // Forward tick events to connected clients
        this.engine.on('tick', (tickData) => {
            this.tickCount++;
            this.lastActivity = new Date();

            // Calculate delta if we have previous state
            const delta = this._calculateDelta(tickData);
            this.previousState = tickData;

            // Emit for broadcasting
            this.emit('tick', {
                sessionId: this.id,
                tick: this.tickCount,
                ...delta
            });

            // Broadcast to connected clients
            this._broadcast({
                type: 'TICK_UPDATE',
                payload: delta
            });
        });

        // Forward control events
        ['started', 'paused', 'resumed', 'speedChanged'].forEach(event => {
            this.engine.on(event, (data) => {
                this.status = event === 'paused' ? 'paused' : 'active';
                this._broadcast({
                    type: 'CONTROL_UPDATE',
                    payload: {
                        event,
                        isPaused: this.engine.isPaused,
                        speed: this.engine.speed,
                        ...data
                    }
                });
            });
        });

        // Forward errors
        this.engine.on('error', (error) => {
            this.emit('error', error);
            this._broadcast({
                type: 'ERROR',
                payload: error
            });
        });
    }

    /**
     * Calculate delta between current and previous state
     */
    _calculateDelta(currentState) {
        // For now, send essential tick data
        // TODO: Implement proper delta compression for large state
        return {
            clock: currentState.clock,
            totalHours: currentState.totalHours,
            formatted: currentState.formatted,
            stats: currentState.stats,
            firmCount: currentState.firmCount,
            speed: currentState.speed,
            isPaused: currentState.isPaused
        };
    }

    /**
     * Add a WebSocket client to this session
     */
    addClient(ws) {
        this.clients.add(ws);
        console.log(`👤 Client joined session ${this.id} (${this.clients.size} connected)`);

        // Send initial state to new client
        const initialState = this.engine?.getFullState();
        if (initialState) {
            this._send(ws, {
                type: 'INITIAL_STATE',
                payload: {
                    sessionId: this.id,
                    name: this.name,
                    ...initialState,
                    displayData: this.engine.getDisplayData()
                }
            });
        }

        // Handle client disconnect
        ws.on('close', () => {
            this.removeClient(ws);
        });
    }

    /**
     * Remove a WebSocket client from this session
     */
    removeClient(ws) {
        this.clients.delete(ws);
        console.log(`👋 Client left session ${this.id} (${this.clients.size} connected)`);
    }

    /**
     * Broadcast message to all connected clients
     */
    _broadcast(message) {
        const data = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(data);
            }
        });
    }

    /**
     * Send message to specific client
     */
    _send(ws, message) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Start the simulation
     */
    start() {
        this.engine?.start();
        this.status = 'active';
    }

    /**
     * Pause the simulation
     */
    pause() {
        this.engine?.pause();
        this.status = 'paused';
    }

    /**
     * Resume the simulation
     */
    resume() {
        this.engine?.resume();
        this.status = 'active';
    }

    /**
     * Set simulation speed
     */
    setSpeed(speed) {
        this.engine?.setSpeed(speed);
    }

    /**
     * Get current game state for saving
     */
    getState() {
        return this.engine?.getFullState() || null;
    }

    /**
     * Get session info (for API responses)
     */
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            seed: this.seed,
            status: this.status,
            createdAt: this.createdAt,
            lastActivity: this.lastActivity,
            connectedClients: this.clients.size,
            tickCount: this.tickCount,
            clock: this.engine?.engine?.clock?.getGameTime() || null,
            clockFormatted: this.engine?.engine?.clock?.getFormatted() || null,
            speed: this.engine?.speed || 1,
            isPaused: this.engine?.isPaused ?? true,
            stats: this.engine?.engine?.stats || null
        };
    }

    /**
     * Handle command from client
     */
    handleCommand(command, payload) {
        switch (command) {
            case 'PAUSE':
                this.pause();
                break;
            case 'RESUME':
                this.resume();
                break;
            case 'SET_SPEED':
                if (payload?.speed) {
                    this.setSpeed(payload.speed);
                }
                break;
            case 'GET_STATE':
                return this.getState();
            case 'GET_DISPLAY_DATA':
                return this.engine?.getDisplayData();
            default:
                console.warn(`Unknown command: ${command}`);
        }
    }

    /**
     * Clean up session resources
     */
    destroy() {
        console.log(`🗑️ Destroying game session: ${this.id}`);

        // Notify clients
        this._broadcast({
            type: 'SESSION_CLOSED',
            payload: { sessionId: this.id }
        });

        // Close all client connections
        this.clients.forEach(client => {
            try {
                client.close(1000, 'Session closed');
            } catch (e) {
                // Ignore close errors
            }
        });
        this.clients.clear();

        // Destroy engine
        this.engine?.destroy();
        this.engine = null;

        this.status = 'destroyed';
        this.removeAllListeners();
    }
}
