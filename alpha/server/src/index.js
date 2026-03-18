/**
 * Economic Simulation Server
 * Express + WebSocket server for running the simulation backend
 */

import { installPolyfills, getEventBus } from './adapters/BrowserPolyfills.js';

// Install browser polyfills BEFORE importing simulation code
installPolyfills();

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Import managers
import { Database } from './db/Database.js';
import { SessionManager } from './simulation/SessionManager.js';
import { createGamesRouter } from './api/routes/games.js';
import { createSimulationRouter } from './api/routes/simulation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/econsim.db');

// Initialize database
const database = new Database(DB_PATH);

// Initialize session manager
const sessionManager = new SessionManager({
    maxSessions: 10,
    autosaveInterval: 5 * 60 * 1000, // 5 minutes
    idleTimeout: 30 * 60 * 1000 // 30 minutes
});

// Create Express app
const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || ['http://localhost:8000', 'http://127.0.0.1:8000'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Large limit for full state

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: database.db ? 'connected' : 'disconnected',
        activeSessions: sessionManager.sessions.size
    });
});

// API version info
app.get('/api/v1', (req, res) => {
    const stats = database.db ? database.getStats() : null;
    res.json({
        version: '1.0.0',
        endpoints: {
            games: '/api/v1/games',
            sessions: '/api/v1/sessions',
            health: '/health'
        },
        stats
    });
});

// API routes (will be registered after database init)
let gamesRouter = null;
let simulationRouter = null;

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
    console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'CONNECTED',
        payload: {
            message: 'Connected to EconSim server',
            timestamp: new Date().toISOString(),
            activeSessions: sessionManager.getAllSessions().map(s => ({
                id: s.id,
                name: s.name,
                status: s.status
            }))
        }
    }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`[WS] Received: ${message.type}`);

            switch (message.type) {
                case 'PING':
                    ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
                    break;

                case 'JOIN_SESSION':
                    // Join a game session
                    try {
                        const session = sessionManager.connectClient(ws, message.sessionId);
                        console.log(`[WS] Client joined session ${message.sessionId}`);
                    } catch (error) {
                        ws.send(JSON.stringify({
                            type: 'ERROR',
                            payload: { message: error.message }
                        }));
                    }
                    break;

                case 'COMMAND':
                    // Forward command to session manager
                    sessionManager.handleMessage(ws, message);
                    break;

                default:
                    // Try handling via session manager
                    sessionManager.handleMessage(ws, message);
            }
        } catch (err) {
            console.error('[WS] Invalid message:', err);
            ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Invalid message format' }
            }));
        }
    });

    ws.on('close', () => {
        console.log('[WS] Client disconnected');
    });

    ws.on('error', (err) => {
        console.error('[WS] Error:', err);
    });
});

// Initialize and start server
async function start() {
    try {
        // Initialize database
        await database.initialize();
        sessionManager.setDatabase(database);

        // Register API routes
        gamesRouter = createGamesRouter(sessionManager, database);
        simulationRouter = createSimulationRouter(sessionManager);

        app.use('/api/v1/games', gamesRouter);
        app.use('/api/v1', simulationRouter);

        // Start server
        server.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║         Economic Simulation Server v1.0.0                  ║
╠════════════════════════════════════════════════════════════╣
║  HTTP Server:  http://localhost:${PORT}                        ║
║  WebSocket:    ws://localhost:${PORT}/ws                       ║
║  Health:       http://localhost:${PORT}/health                 ║
║  API Docs:     http://localhost:${PORT}/api/v1                 ║
╠════════════════════════════════════════════════════════════╣
║  Database:     ${DB_PATH.substring(0, 40).padEnd(40)}║
╚════════════════════════════════════════════════════════════╝
            `);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
async function shutdown() {
    console.log('\n🛑 Shutting down server...');

    try {
        // Save all sessions
        await sessionManager.shutdown();

        // Close WebSocket server
        wss.close();

        // Close HTTP server
        server.close();

        // Close database
        database.close();

        console.log('✅ Server shutdown complete');
        process.exit(0);

    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
start();

export { app, server, wss, database, sessionManager };
