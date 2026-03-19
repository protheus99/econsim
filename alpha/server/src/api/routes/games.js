/**
 * Games API Routes
 *
 * REST endpoints for game CRUD operations
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function createGamesRouter(sessionManager, database) {
    const router = Router();

    /**
     * POST /api/v1/games - Create new game
     * Body: { name?, seed?, config? }
     */
    router.post('/', async (req, res) => {
        console.log('[POST /games] Creating new game...');
        try {
            const { name, seed, config } = req.body;

            const gameId = uuidv4();
            const gameName = name || `Game ${new Date().toLocaleDateString()}`;
            const gameSeed = seed || Date.now();

            console.log('[POST /games] Game ID:', gameId);

            // Create database record
            console.log('[POST /games] Creating database record...');
            const game = database.createGame(gameId, gameName, gameSeed, config);
            console.log('[POST /games] Database record created');

            // Create active session (this loads the simulation engine)
            console.log('[POST /games] Creating session (this may take a moment)...');
            const session = await sessionManager.createSession({
                id: gameId,
                name: gameName,
                seed: gameSeed,
                config
            });
            console.log('[POST /games] Session created');

            res.status(201).json({
                success: true,
                game: {
                    id: game.id,
                    name: game.name,
                    seed: game.seed,
                    status: game.status,
                    createdAt: game.created_at
                },
                session: session.getInfo()
            });

        } catch (error) {
            console.error('[POST /games] Error creating game:', error);
            console.error('[POST /games] Stack:', error.stack);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/v1/games - List all games
     */
    router.get('/', (req, res) => {
        try {
            const games = database.listGames(null, req.query.status || 'active');

            // Add session info if available
            const gamesWithStatus = games.map(game => ({
                ...game,
                hasActiveSession: sessionManager.getSession(game.id) !== undefined
            }));

            res.json({
                success: true,
                games: gamesWithStatus
            });

        } catch (error) {
            console.error('Error listing games:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/v1/games/:id - Get game details
     */
    router.get('/:id', (req, res) => {
        try {
            const game = database.getGame(req.params.id);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    error: 'Game not found'
                });
            }

            const session = sessionManager.getSession(game.id);
            const saves = database.listGameStates(game.id);

            res.json({
                success: true,
                game,
                session: session?.getInfo() || null,
                saves: saves.slice(0, 20) // Limit to 20 most recent
            });

        } catch (error) {
            console.error('Error getting game:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PATCH /api/v1/games/:id - Update game metadata
     * Body: { name?, status? }
     */
    router.patch('/:id', (req, res) => {
        try {
            const game = database.getGame(req.params.id);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    error: 'Game not found'
                });
            }

            const { name, status } = req.body;
            const updates = {};
            if (name) updates.name = name;
            if (status) updates.status = status;

            const updated = database.updateGame(req.params.id, updates);

            res.json({
                success: true,
                game: updated
            });

        } catch (error) {
            console.error('Error updating game:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/v1/games/:id - Delete game
     */
    router.delete('/:id', async (req, res) => {
        try {
            const game = database.getGame(req.params.id);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    error: 'Game not found'
                });
            }

            // End active session if exists
            await sessionManager.deleteSession(req.params.id);

            // Delete from database
            database.deleteGame(req.params.id);

            res.json({
                success: true,
                message: `Game ${req.params.id} deleted`
            });

        } catch (error) {
            console.error('Error deleting game:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/v1/games/:id/load - Load game into active session
     * Query: ?saveId=X (optional, loads latest if not specified)
     */
    router.post('/:id/load', async (req, res) => {
        try {
            const game = database.getGame(req.params.id);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    error: 'Game not found'
                });
            }

            // Check if already loaded
            let session = sessionManager.getSession(req.params.id);
            if (session) {
                return res.json({
                    success: true,
                    message: 'Game already loaded',
                    session: session.getInfo()
                });
            }

            // Load with optional save ID
            session = await sessionManager.loadSession(
                req.params.id,
                req.query.saveId ? parseInt(req.query.saveId) : null
            );

            res.json({
                success: true,
                session: session.getInfo()
            });

        } catch (error) {
            console.error('Error loading game:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/v1/games/:id/save - Save game state
     * Body: { slot?: string }
     */
    router.post('/:id/save', async (req, res) => {
        try {
            const session = sessionManager.getSession(req.params.id);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'No active session for this game'
                });
            }

            const state = session.getState();
            if (!state) {
                return res.status(500).json({
                    success: false,
                    error: 'Could not get game state'
                });
            }

            // Log state summary
            console.log('💾 Saving game state:');
            console.log('  - Version:', state.version);
            console.log('  - Firms:', Object.keys(state.firms || {}).length);
            console.log('  - Cities:', Object.keys(state.cities || {}).length);
            console.log('  - Corporations:', (state.corporations || []).length);
            console.log('  - Contracts:', (state.contracts || []).length);
            console.log('  - Pending Deliveries:', (state.pendingDeliveries || []).length);
            console.log('  - Lot Registry Lots:', state.lotRegistry?.lots?.length || 0);
            console.log('  - Products with Market Data:', Object.keys(state.productMarketData || {}).length);

            const slotName = req.body.slot || `save_${Date.now()}`;
            const gameHour = state.clock
                ? (state.clock.year - 2025) * 8760 +
                  (state.clock.month - 1) * 730 +
                  (state.clock.day - 1) * 24 +
                  state.clock.hour
                : 0;

            const stateJson = JSON.stringify(state);
            console.log('  - State JSON size:', (stateJson.length / 1024).toFixed(1), 'KB');

            const saveId = database.saveGameState(
                req.params.id,
                gameHour,
                stateJson,
                false,
                slotName
            );

            res.json({
                success: true,
                saveId,
                slot: slotName,
                gameHour,
                stateSize: stateJson.length
            });

        } catch (error) {
            console.error('Error saving game:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/v1/games/:id/state - Get current game state (for debugging)
     * Query: ?summary=true for summary only
     */
    router.get('/:id/state', (req, res) => {
        try {
            const session = sessionManager.getSession(req.params.id);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'No active session for this game'
                });
            }

            const state = session.getState();
            if (!state) {
                return res.status(500).json({
                    success: false,
                    error: 'Could not get game state'
                });
            }

            // If summary requested, return condensed view
            if (req.query.summary === 'true') {
                const firmTypes = {};
                for (const firm of Object.values(state.firms || {})) {
                    firmTypes[firm.type] = (firmTypes[firm.type] || 0) + 1;
                }

                return res.json({
                    success: true,
                    summary: {
                        version: state.version,
                        clock: state.clock,
                        speed: state.speed,
                        stats: state.stats,
                        counts: {
                            firms: Object.keys(state.firms || {}).length,
                            cities: Object.keys(state.cities || {}).length,
                            corporations: (state.corporations || []).length,
                            contracts: (state.contracts || []).length,
                            pendingDeliveries: (state.pendingDeliveries || []).length,
                            lotRegistryLots: state.lotRegistry?.lots?.length || 0,
                            productsWithMarketData: Object.keys(state.productMarketData || {}).length
                        },
                        firmsByType: firmTypes,
                        stateSize: JSON.stringify(state).length
                    }
                });
            }

            // Return full state
            res.json({
                success: true,
                state
            });

        } catch (error) {
            console.error('Error getting state:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/v1/games/:id/state/firms - Get all firms with full data
     */
    router.get('/:id/state/firms', (req, res) => {
        try {
            const session = sessionManager.getSession(req.params.id);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'No active session for this game'
                });
            }

            const state = session.getState();
            res.json({
                success: true,
                count: Object.keys(state.firms || {}).length,
                firms: state.firms || {}
            });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/v1/games/:id/state/cities - Get all cities with full data
     */
    router.get('/:id/state/cities', (req, res) => {
        try {
            const session = sessionManager.getSession(req.params.id);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'No active session for this game'
                });
            }

            const state = session.getState();
            res.json({
                success: true,
                count: Object.keys(state.cities || {}).length,
                cities: state.cities || {}
            });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/v1/games/:id/state/contracts - Get all contracts
     */
    router.get('/:id/state/contracts', (req, res) => {
        try {
            const session = sessionManager.getSession(req.params.id);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'No active session for this game'
                });
            }

            const state = session.getState();
            res.json({
                success: true,
                count: (state.contracts || []).length,
                contracts: state.contracts || [],
                pendingDeliveries: state.pendingDeliveries || []
            });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/v1/games/:id/state/lots - Get lot registry
     */
    router.get('/:id/state/lots', (req, res) => {
        try {
            const session = sessionManager.getSession(req.params.id);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'No active session for this game'
                });
            }

            const state = session.getState();
            res.json({
                success: true,
                lotRegistry: state.lotRegistry || { lots: [], lotCounter: 0 }
            });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/v1/games/:id/saves - List saves for game
     */
    router.get('/:id/saves', (req, res) => {
        try {
            const game = database.getGame(req.params.id);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    error: 'Game not found'
                });
            }

            const saves = database.listGameStates(req.params.id);

            res.json({
                success: true,
                saves
            });

        } catch (error) {
            console.error('Error listing saves:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/v1/games/:id/saves/:saveId - Delete specific save
     */
    router.delete('/:id/saves/:saveId', (req, res) => {
        try {
            const deleted = database.deleteGameState(parseInt(req.params.saveId));

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Save not found'
                });
            }

            res.json({
                success: true,
                message: 'Save deleted'
            });

        } catch (error) {
            console.error('Error deleting save:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
}
