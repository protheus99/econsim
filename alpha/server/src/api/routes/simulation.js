/**
 * Simulation Control API Routes
 *
 * REST endpoints for controlling active game sessions
 */

import { Router } from 'express';

export function createSimulationRouter(sessionManager) {
    const router = Router();

    /**
     * Middleware to get session by game ID
     */
    const getSession = (req, res, next) => {
        const session = sessionManager.getSession(req.params.id);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'No active session for this game. Load it first with POST /api/v1/games/:id/load'
            });
        }
        req.session = session;
        next();
    };

    /**
     * GET /api/v1/games/:id/status - Get session status
     */
    router.get('/:id/status', getSession, (req, res) => {
        res.json({
            success: true,
            ...req.session.getInfo()
        });
    });

    /**
     * POST /api/v1/games/:id/start - Start simulation
     */
    router.post('/:id/start', getSession, (req, res) => {
        req.session.start();
        res.json({
            success: true,
            message: 'Simulation started',
            status: req.session.getInfo()
        });
    });

    /**
     * POST /api/v1/games/:id/pause - Pause simulation
     */
    router.post('/:id/pause', getSession, (req, res) => {
        req.session.pause();
        res.json({
            success: true,
            message: 'Simulation paused',
            status: req.session.getInfo()
        });
    });

    /**
     * POST /api/v1/games/:id/resume - Resume simulation
     */
    router.post('/:id/resume', getSession, (req, res) => {
        req.session.resume();
        res.json({
            success: true,
            message: 'Simulation resumed',
            status: req.session.getInfo()
        });
    });

    /**
     * POST /api/v1/games/:id/speed - Set simulation speed
     * Body: { speed: 1|2|4|8|24|168|720|8760 }
     */
    router.post('/:id/speed', getSession, (req, res) => {
        const { speed } = req.body;
        const validSpeeds = [1, 2, 4, 8, 24, 168, 720, 8760];

        if (!speed || !validSpeeds.includes(speed)) {
            return res.status(400).json({
                success: false,
                error: `Speed must be one of: ${validSpeeds.join(', ')}`
            });
        }

        req.session.setSpeed(speed);
        res.json({
            success: true,
            message: `Speed set to ${speed}x`,
            status: req.session.getInfo()
        });
    });

    /**
     * GET /api/v1/games/:id/state - Get full game state
     */
    router.get('/:id/state', getSession, (req, res) => {
        const state = req.session.getState();
        if (!state) {
            return res.status(500).json({
                success: false,
                error: 'Could not get game state'
            });
        }

        res.json({
            success: true,
            state
        });
    });

    /**
     * GET /api/v1/games/:id/display - Get display-friendly data
     */
    router.get('/:id/display', getSession, (req, res) => {
        const data = req.session.engine?.getDisplayData();
        if (!data) {
            return res.status(500).json({
                success: false,
                error: 'Could not get display data'
            });
        }

        res.json({
            success: true,
            ...data
        });
    });

    /**
     * GET /api/v1/sessions - List all active sessions
     */
    router.get('/sessions', (req, res) => {
        const sessions = sessionManager.getAllSessions();
        res.json({
            success: true,
            sessions
        });
    });

    return router;
}
