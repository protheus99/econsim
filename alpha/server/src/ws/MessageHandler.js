/**
 * MessageHandler - Process WebSocket messages
 *
 * Defines the message protocol and handles each message type
 */

export class MessageHandler {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
    }

    /**
     * Handle incoming message
     * @returns {Object|null} Response to send back, or null for no response
     */
    handle(ws, message, clientInfo) {
        switch (message.type) {
            case 'PING':
                return this.handlePing(message);

            case 'JOIN_SESSION':
                return this.handleJoinSession(ws, message, clientInfo);

            case 'LEAVE_SESSION':
                return this.handleLeaveSession(ws, clientInfo);

            case 'COMMAND':
                return this.handleCommand(ws, message, clientInfo);

            case 'GET_STATE':
                return this.handleGetState(clientInfo);

            case 'GET_DISPLAY_DATA':
                return this.handleGetDisplayData(clientInfo);

            case 'LIST_SESSIONS':
                return this.handleListSessions();

            default:
                return {
                    type: 'ERROR',
                    payload: { message: `Unknown message type: ${message.type}` }
                };
        }
    }

    /**
     * Handle PING message
     */
    handlePing(message) {
        return {
            type: 'PONG',
            timestamp: Date.now(),
            echo: message.timestamp
        };
    }

    /**
     * Handle JOIN_SESSION - Connect client to a game session
     */
    handleJoinSession(ws, message, clientInfo) {
        const { sessionId } = message;

        if (!sessionId) {
            return {
                type: 'ERROR',
                payload: { message: 'sessionId required' }
            };
        }

        try {
            const session = this.sessionManager.connectClient(ws, sessionId);

            return {
                type: 'SESSION_JOINED',
                payload: {
                    sessionId,
                    session: session.getInfo()
                }
            };

        } catch (error) {
            return {
                type: 'ERROR',
                payload: { message: error.message }
            };
        }
    }

    /**
     * Handle LEAVE_SESSION - Disconnect client from current session
     */
    handleLeaveSession(ws, clientInfo) {
        if (!clientInfo.sessionId) {
            return {
                type: 'ERROR',
                payload: { message: 'Not in a session' }
            };
        }

        const session = this.sessionManager.getSession(clientInfo.sessionId);
        if (session) {
            session.removeClient(ws);
        }

        const oldSessionId = clientInfo.sessionId;
        clientInfo.sessionId = null;

        return {
            type: 'SESSION_LEFT',
            payload: { sessionId: oldSessionId }
        };
    }

    /**
     * Handle COMMAND - Execute command in session
     */
    handleCommand(ws, message, clientInfo) {
        if (!clientInfo.sessionId) {
            return {
                type: 'ERROR',
                payload: { message: 'Not in a session. Send JOIN_SESSION first.' }
            };
        }

        const session = this.sessionManager.getSession(clientInfo.sessionId);
        if (!session) {
            return {
                type: 'ERROR',
                payload: { message: 'Session not found' }
            };
        }

        const { command, payload } = message;

        try {
            const result = session.handleCommand(command, payload);

            return {
                type: 'COMMAND_RESULT',
                command,
                success: true,
                payload: result
            };

        } catch (error) {
            return {
                type: 'COMMAND_RESULT',
                command,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle GET_STATE - Get full state for current session
     */
    handleGetState(clientInfo) {
        if (!clientInfo.sessionId) {
            return {
                type: 'ERROR',
                payload: { message: 'Not in a session' }
            };
        }

        const session = this.sessionManager.getSession(clientInfo.sessionId);
        if (!session) {
            return {
                type: 'ERROR',
                payload: { message: 'Session not found' }
            };
        }

        return {
            type: 'FULL_STATE',
            payload: session.getState()
        };
    }

    /**
     * Handle GET_DISPLAY_DATA - Get display-friendly data
     */
    handleGetDisplayData(clientInfo) {
        if (!clientInfo.sessionId) {
            return {
                type: 'ERROR',
                payload: { message: 'Not in a session' }
            };
        }

        const session = this.sessionManager.getSession(clientInfo.sessionId);
        if (!session) {
            return {
                type: 'ERROR',
                payload: { message: 'Session not found' }
            };
        }

        return {
            type: 'DISPLAY_DATA',
            payload: session.engine?.getDisplayData()
        };
    }

    /**
     * Handle LIST_SESSIONS - Get all active sessions
     */
    handleListSessions() {
        return {
            type: 'SESSIONS_LIST',
            payload: {
                sessions: this.sessionManager.getAllSessions()
            }
        };
    }
}

/**
 * Message Protocol Documentation
 *
 * === Client -> Server ===
 *
 * PING:
 *   { type: "PING", timestamp?: number }
 *   Response: { type: "PONG", timestamp, echo }
 *
 * JOIN_SESSION:
 *   { type: "JOIN_SESSION", sessionId: string }
 *   Response: { type: "SESSION_JOINED", payload: { sessionId, session } }
 *   Note: Server will start sending TICK_UPDATE messages after joining
 *
 * LEAVE_SESSION:
 *   { type: "LEAVE_SESSION" }
 *   Response: { type: "SESSION_LEFT", payload: { sessionId } }
 *
 * COMMAND:
 *   { type: "COMMAND", command: string, payload?: any }
 *   Commands: PAUSE, RESUME, SET_SPEED, SAVE, GET_STATE, GET_DISPLAY_DATA
 *   Response: { type: "COMMAND_RESULT", command, success, payload? }
 *
 * GET_STATE:
 *   { type: "GET_STATE" }
 *   Response: { type: "FULL_STATE", payload: { ... full state } }
 *
 * GET_DISPLAY_DATA:
 *   { type: "GET_DISPLAY_DATA" }
 *   Response: { type: "DISPLAY_DATA", payload: { ... display data } }
 *
 * LIST_SESSIONS:
 *   { type: "LIST_SESSIONS" }
 *   Response: { type: "SESSIONS_LIST", payload: { sessions: [...] } }
 *
 *
 * === Server -> Client ===
 *
 * CONNECTED:
 *   { type: "CONNECTED", payload: { clientId, message, timestamp, activeSessions } }
 *   Sent immediately on connection
 *
 * INITIAL_STATE:
 *   { type: "INITIAL_STATE", payload: { sessionId, name, ...full state, displayData } }
 *   Sent after JOIN_SESSION
 *
 * TICK_UPDATE:
 *   { type: "TICK_UPDATE", payload: { clock, totalHours, formatted, stats, ... } }
 *   Sent every simulation tick (hourly)
 *
 * CONTROL_UPDATE:
 *   { type: "CONTROL_UPDATE", payload: { event, isPaused, speed } }
 *   Sent when simulation state changes (pause/resume/speed)
 *
 * ERROR:
 *   { type: "ERROR", payload: { message } }
 *   Sent on errors
 *
 * SESSION_CLOSED:
 *   { type: "SESSION_CLOSED", payload: { sessionId } }
 *   Sent when session is destroyed
 */
