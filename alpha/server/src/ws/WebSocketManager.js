/**
 * WebSocketManager - Central WebSocket connection management
 *
 * Responsibilities:
 * - Handle WebSocket connections
 * - Route messages to appropriate handlers
 * - Manage heartbeat/ping-pong
 * - Track connected clients
 */

import { EventEmitter } from 'events';
import { MessageHandler } from './MessageHandler.js';

export class WebSocketManager extends EventEmitter {
    constructor(wss, sessionManager) {
        super();

        this.wss = wss;
        this.sessionManager = sessionManager;
        this.messageHandler = new MessageHandler(sessionManager);

        // Track all connected clients
        this.clients = new Map(); // ws -> { id, sessionId, connectedAt, lastPing }

        // Heartbeat settings
        this.heartbeatInterval = 30000; // 30 seconds
        this.heartbeatTimer = null;

        // Set up WebSocket server events
        this._setupWSS();

        // Start heartbeat
        this._startHeartbeat();
    }

    /**
     * Set up WebSocket server event handlers
     */
    _setupWSS() {
        this.wss.on('connection', (ws, req) => {
            this._handleConnection(ws, req);
        });
    }

    /**
     * Handle new WebSocket connection
     */
    _handleConnection(ws, req) {
        const clientId = this._generateClientId();
        const clientInfo = {
            id: clientId,
            sessionId: null,
            connectedAt: new Date(),
            lastPing: Date.now(),
            remoteAddress: req.socket.remoteAddress
        };

        this.clients.set(ws, clientInfo);

        console.log(`[WS] Client ${clientId} connected from ${clientInfo.remoteAddress} (${this.clients.size} total)`);

        // Send welcome message with client ID
        this._send(ws, {
            type: 'CONNECTED',
            payload: {
                clientId,
                message: 'Connected to EconSim server',
                timestamp: new Date().toISOString(),
                activeSessions: this.sessionManager.getAllSessions().map(s => ({
                    id: s.id,
                    name: s.name,
                    status: s.status
                }))
            }
        });

        // Handle messages
        ws.on('message', (data) => {
            this._handleMessage(ws, data);
        });

        // Handle close
        ws.on('close', (code, reason) => {
            this._handleClose(ws, code, reason);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`[WS] Client ${clientId} error:`, error.message);
        });

        // Set up pong handler for heartbeat
        ws.on('pong', () => {
            const info = this.clients.get(ws);
            if (info) {
                info.lastPing = Date.now();
            }
        });

        this.emit('connection', { clientId, ws });
    }

    /**
     * Handle incoming WebSocket message
     */
    _handleMessage(ws, data) {
        const clientInfo = this.clients.get(ws);
        if (!clientInfo) return;

        try {
            const message = JSON.parse(data.toString());

            // Update last activity
            clientInfo.lastPing = Date.now();

            // Log non-ping messages
            if (message.type !== 'PING') {
                console.log(`[WS] Client ${clientInfo.id}: ${message.type}`);
            }

            // Handle via message handler
            const response = this.messageHandler.handle(ws, message, clientInfo);

            // Update session ID if joined
            if (message.type === 'JOIN_SESSION' && !response?.error) {
                clientInfo.sessionId = message.sessionId;
            }

            // Send response if any
            if (response) {
                this._send(ws, response);
            }

        } catch (error) {
            console.error(`[WS] Client ${clientInfo.id} message error:`, error.message);
            this._send(ws, {
                type: 'ERROR',
                payload: { message: 'Invalid message format' }
            });
        }
    }

    /**
     * Handle WebSocket close
     */
    _handleClose(ws, code, reason) {
        const clientInfo = this.clients.get(ws);
        if (clientInfo) {
            console.log(`[WS] Client ${clientInfo.id} disconnected (code: ${code})`);
            this.emit('disconnection', { clientId: clientInfo.id, code, reason });
        }
        this.clients.delete(ws);
    }

    /**
     * Send message to specific client
     */
    _send(ws, message) {
        if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Broadcast message to all connected clients
     */
    broadcast(message) {
        const data = JSON.stringify(message);
        this.clients.forEach((info, ws) => {
            if (ws.readyState === 1) {
                ws.send(data);
            }
        });
    }

    /**
     * Broadcast to clients in a specific session
     */
    broadcastToSession(sessionId, message) {
        const data = JSON.stringify(message);
        this.clients.forEach((info, ws) => {
            if (info.sessionId === sessionId && ws.readyState === 1) {
                ws.send(data);
            }
        });
    }

    /**
     * Start heartbeat interval
     */
    _startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            const now = Date.now();
            const timeout = this.heartbeatInterval * 2;

            this.clients.forEach((info, ws) => {
                // Check if client missed heartbeats
                if (now - info.lastPing > timeout) {
                    console.log(`[WS] Client ${info.id} heartbeat timeout, closing`);
                    ws.terminate();
                    return;
                }

                // Send ping
                if (ws.readyState === 1) {
                    ws.ping();
                }
            });
        }, this.heartbeatInterval);
    }

    /**
     * Generate unique client ID
     */
    _generateClientId() {
        return `client_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    }

    /**
     * Get connection statistics
     */
    getStats() {
        const sessionCounts = {};
        this.clients.forEach(info => {
            if (info.sessionId) {
                sessionCounts[info.sessionId] = (sessionCounts[info.sessionId] || 0) + 1;
            }
        });

        return {
            totalConnections: this.clients.size,
            sessionCounts
        };
    }

    /**
     * Shutdown manager
     */
    shutdown() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        // Close all connections
        this.clients.forEach((info, ws) => {
            ws.close(1001, 'Server shutting down');
        });

        this.clients.clear();
        this.removeAllListeners();
    }
}
