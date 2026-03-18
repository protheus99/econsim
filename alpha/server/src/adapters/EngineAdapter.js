/**
 * EngineAdapter - Wraps SimulationEngine for Node.js server usage
 *
 * Responsibilities:
 * - Load config from file system instead of fetch
 * - Provide event hooks for WebSocket broadcasts
 * - Handle state serialization for SQLite persistence
 * - Manage server-side tick loop
 */

import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEventBus } from './BrowserPolyfills.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to core simulation code (relative to alpha/server/src/adapters/)
const CORE_PATH = path.resolve(__dirname, '../../../../js/core');

export class EngineAdapter extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            seed: options.seed || Date.now(),
            configPath: options.configPath || path.resolve(__dirname, '../../../../data/config.json'),
            ...options
        };

        this.engine = null;
        this.tickInterval = null;
        this.speed = 1;
        this.isPaused = true;
        this.lastTickTime = null;

        // Bind browser event bus to our events
        this._setupEventBridge();
    }

    /**
     * Bridge browser-style events to EventEmitter
     */
    _setupEventBridge() {
        const eventBus = getEventBus();

        // Forward simulation events
        const events = [
            'simulation-update',
            'simulation-hour',
            'simulation-day',
            'simulation-month',
            'clock-day-change',
            'clock-month-change',
            'clock-year-change'
        ];

        events.forEach(eventName => {
            eventBus.on(eventName, (event) => {
                this.emit(eventName, event?.detail || event);
            });
        });
    }

    /**
     * Load config from file system
     */
    loadConfigFromFile() {
        try {
            const configPath = this.options.configPath;
            const configContent = readFileSync(configPath, 'utf8');
            return JSON.parse(configContent);
        } catch (error) {
            console.warn(`Could not load config from ${this.options.configPath}:`, error.message);
            return null;
        }
    }

    /**
     * Initialize the simulation engine
     */
    async initialize() {
        console.log('🔧 EngineAdapter initializing...');

        // Override global fetch to use file system for config
        const originalFetch = globalThis.fetch;
        const configData = this.loadConfigFromFile();

        globalThis.fetch = async (url) => {
            if (url === 'data/config.json' && configData) {
                return {
                    ok: true,
                    json: async () => configData
                };
            }
            // Fall back to real fetch for other URLs
            return originalFetch(url);
        };

        try {
            // Dynamically import SimulationEngine (after polyfills are installed)
            const { SimulationEngine } = await import(`file://${CORE_PATH}/SimulationEngine.js`);

            // Create engine instance
            this.engine = new SimulationEngine();

            // Set the seed before initialization
            if (this.options.seed) {
                this._setSeed(this.options.seed);
            }

            // Initialize (this calls loadConfig internally, which now uses our file system fetch)
            await this.engine.initialize();

            console.log('✅ EngineAdapter initialized');
            return true;
        } catch (error) {
            console.error('❌ EngineAdapter initialization failed:', error);
            throw error;
        } finally {
            // Restore original fetch
            globalThis.fetch = originalFetch;
        }
    }

    /**
     * Set RNG seed for deterministic simulation
     */
    _setSeed(seed) {
        // Store seed for session management
        sessionStorage.setItem('simulation_session', JSON.stringify({
            seed,
            created: new Date().toISOString()
        }));
    }

    /**
     * Start the simulation tick loop
     */
    start() {
        if (this.tickInterval) {
            return; // Already running
        }

        this.isPaused = false;
        this.lastTickTime = Date.now();

        // Get base interval from config (default 1000ms = 1 game hour per second)
        const baseInterval = this.engine?.config?.simulation?.timeScale?.realSecond || 1000;
        const interval = Math.max(10, Math.floor(baseInterval / this.speed));

        this.tickInterval = setInterval(() => {
            this._tick();
        }, interval);

        console.log(`▶️ Simulation started (speed: ${this.speed}x, interval: ${interval}ms)`);
        this.emit('started', { speed: this.speed });
    }

    /**
     * Pause the simulation
     */
    pause() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        this.isPaused = true;
        this.engine?.clock?.pause();

        console.log('⏸️ Simulation paused');
        this.emit('paused');
    }

    /**
     * Resume the simulation
     */
    resume() {
        this.engine?.clock?.resume();
        this.start();
        this.emit('resumed');
    }

    /**
     * Set simulation speed
     * @param {number} speed - Speed multiplier (1, 2, 4, 8, 24, 168)
     */
    setSpeed(speed) {
        const validSpeeds = [1, 2, 4, 8, 24, 168];
        if (!validSpeeds.includes(speed)) {
            console.warn(`Invalid speed ${speed}, using closest valid speed`);
            speed = validSpeeds.reduce((prev, curr) =>
                Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev
            );
        }

        this.speed = speed;

        // Restart interval with new speed if running
        if (!this.isPaused && this.tickInterval) {
            this.pause();
            this.start();
        }

        console.log(`⏩ Speed set to ${speed}x`);
        this.emit('speedChanged', { speed });
    }

    /**
     * Execute one simulation tick
     */
    _tick() {
        if (!this.engine || this.isPaused) return;

        try {
            // Call the engine's hourly update
            this.engine.updateHourly();

            // Emit tick event with current state summary
            const tickData = this.getTickState();
            this.emit('tick', tickData);

        } catch (error) {
            console.error('Tick error:', error);
            this.emit('error', { type: 'tick', error: error.message });
        }
    }

    /**
     * Get minimal tick state for WebSocket broadcast
     */
    getTickState() {
        const clock = this.engine.clock;
        return {
            clock: clock.getGameTime(),
            totalHours: clock.totalHours,
            formatted: clock.getFormatted(),
            stats: this.engine.stats,
            firmCount: this.engine.firms.size,
            speed: this.speed,
            isPaused: this.isPaused
        };
    }

    /**
     * Get full simulation state for initial sync or save
     */
    getFullState() {
        if (!this.engine) return null;

        const state = {
            version: 1,
            savedAt: Date.now(),
            seed: this.options.seed,

            // Clock state
            clock: {
                hour: this.engine.clock.hour,
                day: this.engine.clock.day,
                month: this.engine.clock.month,
                year: this.engine.clock.year,
                isPaused: this.engine.clock.isPaused
            },

            // Control state
            speed: this.speed,

            // Statistics
            stats: this.engine.stats,

            // Firms
            firms: {},

            // Cities
            cities: {},

            // Corporations
            corporations: [],

            // Contracts
            contracts: [],
            pendingDeliveries: []
        };

        // Serialize firms
        for (const [id, firm] of this.engine.firms) {
            if (firm.getSerializableState) {
                state.firms[id] = firm.getSerializableState();
            }
        }

        // Serialize cities
        const cities = this.engine.cityManager?.getAllCities() || [];
        for (const city of cities) {
            if (city.getSerializableState) {
                state.cities[city.id] = city.getSerializableState();
            }
        }

        // Serialize corporations
        for (const corp of this.engine.corporations) {
            if (corp.getSerializableState) {
                state.corporations.push(corp.getSerializableState());
            }
        }

        // Serialize contracts
        const contractManager = this.engine.purchaseManager?.contractManager;
        if (contractManager) {
            for (const contract of contractManager.contracts.values()) {
                state.contracts.push(contract.toJSON());
            }
            state.pendingDeliveries = contractManager.pendingDeliveries || [];
        }

        return state;
    }

    /**
     * Restore simulation state from saved data
     */
    async restoreState(state) {
        if (!this.engine) {
            throw new Error('Engine not initialized');
        }

        // Use engine's built-in restore logic
        // First, store in sessionStorage so restoreState() can read it
        sessionStorage.setItem('gameState', JSON.stringify(state));

        // Call engine's restore
        const restored = this.engine.restoreState();

        // Restore control state
        if (state.speed) {
            this.setSpeed(state.speed);
        }

        return restored;
    }

    /**
     * Get summarized data for client display
     */
    getDisplayData() {
        if (!this.engine) return null;

        const cities = this.engine.cityManager?.getAllCities() || [];
        const firms = Array.from(this.engine.firms.values());

        return {
            clock: this.engine.clock.getGameTime(),
            clockFormatted: this.engine.clock.getFormatted(),
            stats: this.engine.stats,
            speed: this.speed,
            isPaused: this.isPaused,

            cities: cities.map(city => ({
                id: city.id,
                name: city.name,
                population: city.population,
                country: city.country?.name,
                coordinates: city.coordinates,
                hasAirport: city.hasAirport,
                hasSeaport: city.hasSeaport,
                hasRailway: city.hasRailway
            })),

            firmsSummary: {
                total: firms.length,
                byType: this._countByType(firms),
                healthDistribution: this._getHealthDistribution(firms)
            },

            corporations: this.engine.corporations.map(corp => ({
                id: corp.id,
                name: corp.name,
                firmCount: corp.firms?.length || 0,
                totalCash: corp.totalCash || 0
            }))
        };
    }

    _countByType(firms) {
        const counts = {};
        firms.forEach(firm => {
            const type = firm.type || 'UNKNOWN';
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    }

    _getHealthDistribution(firms) {
        const dist = { healthy: 0, struggling: 0, critical: 0 };
        firms.forEach(firm => {
            const health = firm.getFinancialHealth?.() || 'healthy';
            if (dist[health] !== undefined) dist[health]++;
            else dist.healthy++;
        });
        return dist;
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.pause();
        if (this.engine) {
            this.engine.stop?.();
            this.engine = null;
        }
        this.removeAllListeners();
        console.log('🗑️ EngineAdapter destroyed');
    }
}
