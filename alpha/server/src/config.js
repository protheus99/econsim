/**
 * Server Configuration
 *
 * Centralized configuration with environment variable support
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
    // Server settings
    server: {
        port: parseInt(process.env.PORT) || 3001,
        host: process.env.HOST || '0.0.0.0'
    },

    // CORS settings
    cors: {
        origins: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',')
            : ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:3000'],
        credentials: true
    },

    // Database settings
    database: {
        path: process.env.DB_PATH || path.join(__dirname, '../data/econsim.db')
    },

    // Session management
    sessions: {
        maxSessions: parseInt(process.env.MAX_SESSIONS) || 10,
        autosaveInterval: parseInt(process.env.AUTOSAVE_INTERVAL) || 5 * 60 * 1000, // 5 minutes
        idleTimeout: parseInt(process.env.IDLE_TIMEOUT) || 30 * 60 * 1000, // 30 minutes
        maxAutosaves: parseInt(process.env.MAX_AUTOSAVES) || 10
    },

    // WebSocket settings
    websocket: {
        path: '/ws',
        heartbeatInterval: parseInt(process.env.WS_HEARTBEAT) || 30000, // 30 seconds
        maxPayloadSize: parseInt(process.env.WS_MAX_PAYLOAD) || 50 * 1024 * 1024 // 50MB
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        timestamps: true
    },

    // Environment
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production'
};

/**
 * Simple logger with levels
 */
export const logger = {
    _shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const configLevel = levels.indexOf(config.logging.level);
        const messageLevel = levels.indexOf(level);
        return messageLevel >= configLevel;
    },

    _format(level, message, ...args) {
        const timestamp = config.logging.timestamps
            ? `[${new Date().toISOString()}]`
            : '';
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
    },

    debug(message, ...args) {
        if (this._shouldLog('debug')) {
            console.log(this._format('debug', message), ...args);
        }
    },

    info(message, ...args) {
        if (this._shouldLog('info')) {
            console.log(this._format('info', message), ...args);
        }
    },

    warn(message, ...args) {
        if (this._shouldLog('warn')) {
            console.warn(this._format('warn', message), ...args);
        }
    },

    error(message, ...args) {
        if (this._shouldLog('error')) {
            console.error(this._format('error', message), ...args);
        }
    }
};

export default config;
