/**
 * index.js - Express + WebSocket entry point
 *
 * Economic Simulation Backend Server
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// Install browser polyfills FIRST (before any simulation code loads)
import { installGlobalPolyfills } from './adapters/BrowserPolyfills.js';
installGlobalPolyfills();

// Import route handlers (factory functions)
import { createGamesRouter } from './api/routes/games.js';
import { createSimulationRouter } from './api/routes/simulation.js';

// Import WebSocket handler
import { WebSocketManager } from './ws/WebSocketManager.js';

// Import session manager
import { SessionManager } from './simulation/SessionManager.js';

// Import database
import { Database } from './db/Database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

async function main() {
    // Initialize database
    const db = new Database();
    await db.initialize();
    console.log('✅ Database initialized');

    // Initialize session manager (handles active game sessions)
    const sessionManager = new SessionManager({ db });

    // Create Express app
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../../client')));

    // CORS for development
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });

    // Create routers with dependencies
    const gamesRouter = createGamesRouter(sessionManager, db);
    const simulationRouter = createSimulationRouter(sessionManager);

    // API routes
    app.use('/api/v1/games', gamesRouter);
    app.use('/api/v1/games', simulationRouter);

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            activeSessions: sessionManager.sessions.size,
            dbStats: db.getStats()
        });
    });

    // Serve static files for client
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../../client/index.html'));
    });

    // Create HTTP server
    const server = createServer(app);

    // Create WebSocket server
    const wss = new WebSocketServer({ server, path: '/ws' });
    const wsManager = new WebSocketManager(wss, sessionManager);

    // Start server
    server.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════════╗
║     Economic Simulation Server                       ║
╠══════════════════════════════════════════════════════╣
║  HTTP:      http://localhost:${PORT}                   ║
║  WebSocket: ws://localhost:${PORT}/ws                  ║
║  API:       http://localhost:${PORT}/api/v1            ║
╚══════════════════════════════════════════════════════╝
        `);
    });

    // Graceful shutdown
    const shutdown = async () => {
        console.log('\nShutting down...');
        wsManager.shutdown();
        await sessionManager.shutdown();
        server.close(() => {
            db.close();
            process.exit(0);
        });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

main().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
