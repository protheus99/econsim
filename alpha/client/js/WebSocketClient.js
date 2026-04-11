/**
 * WebSocketClient - Browser WebSocket client for EconSim
 *
 * Handles connection, reconnection, and message routing
 */

export class WebSocketClient {
    constructor(options = {}) {
        this.url = options.url || this._getDefaultUrl();
        this.autoReconnect = options.autoReconnect ?? true;
        this.reconnectDelay = options.reconnectDelay || 1000;
        this.maxReconnectDelay = options.maxReconnectDelay || 30000;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;

        this.ws = null;
        this.clientId = null;
        this.sessionId = null;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;

        // Event handlers
        this.handlers = {
            connected: [],
            disconnected: [],
            error: [],
            message: [],
            // Specific message types
            tick: [],
            initialState: [],
            controlUpdate: [],
            deltaUpdate: [],
            sessionJoined: [],
            sessionLeft: []
        };

        // Pending requests (for request-response pattern)
        this.pendingRequests = new Map();
        this.requestId = 0;
    }

    /**
     * Get default WebSocket URL based on current location
     */
    _getDefaultUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//localhost:3000/ws`;
    }

    /**
     * Connect to server
     */
    connect() {
        return new Promise((resolve, reject) => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                resolve(this.clientId);
                return;
            }

            console.log(`[WS] Connecting to ${this.url}...`);

            try {
                this.ws = new WebSocket(this.url);
            } catch (error) {
                reject(error);
                return;
            }

            this.ws.onopen = () => {
                console.log('[WS] Connected');
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                this._handleMessage(event.data, resolve);
            };

            this.ws.onclose = (event) => {
                console.log(`[WS] Disconnected (code: ${event.code})`);
                this._emit('disconnected', { code: event.code, reason: event.reason });

                if (this.autoReconnect && event.code !== 1000) {
                    this._scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WS] Error:', error);
                this._emit('error', error);
                reject(error);
            };
        });
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        this.autoReconnect = false;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }

        this.sessionId = null;
        this.clientId = null;
    }

    /**
     * Handle incoming message
     */
    _handleMessage(data, connectResolve) {
        try {
            const message = JSON.parse(data);

            // Handle specific message types
            switch (message.type) {
                case 'CONNECTED':
                    this.clientId = message.payload.clientId;
                    console.log(`[WS] Client ID: ${this.clientId}`);
                    this._emit('connected', message.payload);
                    if (connectResolve) connectResolve(this.clientId);
                    break;

                case 'SESSION_JOINED':
                    this.sessionId = message.payload.sessionId;
                    this._emit('sessionJoined', message.payload);
                    break;

                case 'SESSION_LEFT':
                    this.sessionId = null;
                    this._emit('sessionLeft', message.payload);
                    break;

                case 'INITIAL_STATE':
                    this._emit('initialState', message.payload);
                    break;

                case 'TICK_UPDATE':
                    this._emit('tick', message.payload);
                    break;

                case 'DELTA_UPDATE':
                    this._emit('deltaUpdate', message.payload);
                    break;

                case 'CONTROL_UPDATE':
                    this._emit('controlUpdate', message.payload);
                    break;

                case 'PONG':
                    // Handle pong (latency calculation could go here)
                    break;

                case 'COMMAND_RESULT':
                case 'FULL_STATE':
                case 'DISPLAY_DATA':
                case 'SESSIONS_LIST':
                    // Handle request-response
                    this._handleResponse(message);
                    break;

                case 'ERROR':
                    console.error('[WS] Server error:', message.payload.message);
                    this._emit('error', message.payload);
                    this._handleResponse(message);
                    break;

                default:
                    // Generic message handler
                    this._emit('message', message);
            }

        } catch (error) {
            console.error('[WS] Failed to parse message:', error);
        }
    }

    /**
     * Handle response to pending request
     */
    _handleResponse(message) {
        // Check for pending request matching this response
        for (const [id, request] of this.pendingRequests) {
            if (this._matchesRequest(request, message)) {
                this.pendingRequests.delete(id);
                if (message.type === 'ERROR') {
                    request.reject(new Error(message.payload.message));
                } else {
                    request.resolve(message.payload);
                }
                return;
            }
        }
    }

    /**
     * Check if message matches pending request
     */
    _matchesRequest(request, message) {
        // Match COMMAND_RESULT to COMMAND request
        if (message.type === 'COMMAND_RESULT' && request.type === 'COMMAND') {
            return message.command === request.command;
        }
        // Match type-based responses
        const typeMap = {
            'FULL_STATE': 'GET_STATE',
            'DISPLAY_DATA': 'GET_DISPLAY_DATA',
            'SESSIONS_LIST': 'LIST_SESSIONS'
        };
        return typeMap[message.type] === request.type;
    }

    /**
     * Send message to server
     */
    send(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Not connected');
        }
        this.ws.send(JSON.stringify(message));
    }

    /**
     * Send request and wait for response
     */
    request(message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const id = ++this.requestId;

            // Set timeout
            const timer = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error('Request timeout'));
            }, timeout);

            // Store pending request
            this.pendingRequests.set(id, {
                ...message,
                resolve: (data) => {
                    clearTimeout(timer);
                    resolve(data);
                },
                reject: (error) => {
                    clearTimeout(timer);
                    reject(error);
                }
            });

            // Send message
            this.send(message);
        });
    }

    /**
     * Schedule reconnection attempt
     */
    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[WS] Max reconnection attempts reached');
            this._emit('error', { message: 'Max reconnection attempts reached' });
            return;
        }

        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );

        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect().catch(() => {
                // Will schedule another reconnect on close
            });
        }, delay);
    }

    // ==================== High-level API ====================

    /**
     * Join a game session
     */
    async joinSession(sessionId) {
        this.send({ type: 'JOIN_SESSION', sessionId });
        // The response comes as SESSION_JOINED + INITIAL_STATE
    }

    /**
     * Leave current session
     */
    leaveSession() {
        this.send({ type: 'LEAVE_SESSION' });
    }

    /**
     * Send command to current session
     */
    async command(command, payload) {
        return this.request({ type: 'COMMAND', command, payload });
    }

    /**
     * Pause simulation
     */
    pause() {
        return this.command('PAUSE');
    }

    /**
     * Resume simulation
     */
    resume() {
        return this.command('RESUME');
    }

    /**
     * Set simulation speed
     */
    setSpeed(speed) {
        return this.command('SET_SPEED', { speed });
    }

    /**
     * Save game
     */
    save(slot) {
        return this.command('SAVE', { slot });
    }

    /**
     * Get full state
     */
    getState() {
        return this.request({ type: 'GET_STATE' });
    }

    /**
     * Get display data
     */
    getDisplayData() {
        return this.request({ type: 'GET_DISPLAY_DATA' });
    }

    /**
     * List available sessions
     */
    listSessions() {
        return this.request({ type: 'LIST_SESSIONS' });
    }

    /**
     * Send ping
     */
    ping() {
        this.send({ type: 'PING', timestamp: Date.now() });
    }

    // ==================== Event handling ====================

    /**
     * Register event handler
     */
    on(event, handler) {
        if (!this.handlers[event]) {
            this.handlers[event] = [];
        }
        this.handlers[event].push(handler);
        return () => this.off(event, handler);
    }

    /**
     * Remove event handler
     */
    off(event, handler) {
        if (this.handlers[event]) {
            this.handlers[event] = this.handlers[event].filter(h => h !== handler);
        }
    }

    /**
     * Emit event to handlers
     */
    _emit(event, data) {
        if (this.handlers[event]) {
            this.handlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`[WS] Event handler error (${event}):`, error);
                }
            });
        }
    }

    // ==================== Status ====================

    /**
     * Check if connected
     */
    get isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Check if in a session
     */
    get inSession() {
        return this.sessionId !== null;
    }
}

// Export singleton for convenience
export const wsClient = new WebSocketClient();
