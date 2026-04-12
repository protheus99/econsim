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

        // Batch mode: for high speeds we run multiple updateHourly() calls per interval
        // and suppress intermediate daily/monthly delta broadcasts to avoid WS message floods
        this.isBatching = false;

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

        // IMPORTANT: Clear sessionStorage polyfill before creating a new engine
        // This prevents SimulationEngine.restoreState() from loading state from a previous game
        // State restoration is handled explicitly via restoreState() after initialization
        sessionStorage.clear();
        console.log('🧹 Cleared sessionStorage (fresh engine start)');

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

            // Set game name for console logging
            if (this.options.name) {
                this.engine.gameName = this.options.name;
            }

            // CRITICAL: Clear the SimulationEngine's own intervals
            // The engine creates its own tick loop in setupIntervals() which would conflict
            // with our server-controlled tick loop. We manage ticks via EngineAdapter instead.
            this._clearEngineIntervals();

            // Ensure the clock starts paused (server controls when to run)
            this.engine.clock.pause();

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
     * Clear the SimulationEngine's internal intervals
     * The engine sets up its own tick loops in setupIntervals() which would
     * conflict with our server-controlled ticking. We clear them here.
     */
    _clearEngineIntervals() {
        if (!this.engine) return;

        // Clear the main hourly tick interval
        if (this.engine.hourlyInterval) {
            clearInterval(this.engine.hourlyInterval);
            this.engine.hourlyInterval = null;
            console.log('🧹 Cleared engine hourlyInterval');
        }

        // Clear the autosave interval (server handles saves via SessionManager)
        if (this.engine.autosaveInterval) {
            clearInterval(this.engine.autosaveInterval);
            this.engine.autosaveInterval = null;
            console.log('🧹 Cleared engine autosaveInterval');
        }

        // Clear the page lifecycle autosave interval
        if (this.engine.autoSaveInterval) {
            clearInterval(this.engine.autoSaveInterval);
            this.engine.autoSaveInterval = null;
            console.log('🧹 Cleared engine autoSaveInterval');
        }
    }

    /**
     * Start the simulation tick loop
     * Note: This also ensures the clock is resumed. Use pause() to stop.
     */
    start() {
        if (this.tickInterval) {
            return; // Already running
        }

        // Sync both isPaused states
        this.isPaused = false;
        this.engine?.clock?.resume();
        this.lastTickTime = Date.now();

        const { interval, budgetMs } = this._speedParams(this.speed);

        this.tickInterval = setInterval(() => {
            this._tick(budgetMs);
        }, interval);

        console.log(`▶️ Simulation started (speed: ${this.speed}x, interval: ${interval}ms, budget: ${budgetMs ?? 'single'})`);
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
        // Sync both isPaused states
        this.isPaused = true;
        this.engine?.clock?.pause();

        console.log('⏸️ Simulation paused');
        this.emit('paused');
    }

    /**
     * Resume the simulation
     */
    resume() {
        // start() now handles clock.resume() internally
        this.start();
        this.emit('resumed');
    }

    /**
     * Set simulation speed
     * @param {number} speed - Speed multiplier (1, 2, 4, 8, 24, 168)
     */
    /**
     * Compute interval (ms) and budgetMs for a given speed.
     * speeds ≤ 168: 1 tick per interval, interval = max(10, 1000/speed), budgetMs = null
     * speeds > 168:  100ms interval, budgetMs = 50 (run as many ticks as fit in 50ms, yield remaining)
     */
    _speedParams(speed) {
        const baseInterval = this.engine?.config?.simulation?.timeScale?.realSecond || 1000;
        if (speed <= 168) {
            return { interval: Math.max(10, Math.floor(baseInterval / speed)), budgetMs: null };
        }
        // High-speed time-budget mode: fire every 100ms, run ticks until 50ms budget exhausted
        return { interval: 100, budgetMs: 50 };
    }

    setSpeed(speed) {
        const validSpeeds = [1, 2, 4, 8, 24, 168, 720, 8760];
        if (!validSpeeds.includes(speed)) {
            console.warn(`Invalid speed ${speed}, using closest valid speed`);
            speed = validSpeeds.reduce((prev, curr) =>
                Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev
            );
        }

        this.speed = speed;

        // Restart interval with new speed if running
        if (!this.isPaused && this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;

            const { interval, budgetMs } = this._speedParams(speed);
            this.tickInterval = setInterval(() => {
                this._tick(budgetMs);
            }, interval);

            console.log(`⏩ Speed changed to ${speed}x (interval: ${interval}ms, budget: ${budgetMs ?? 'single'})`);
        } else {
            console.log(`⏩ Speed set to ${speed}x (will apply when resumed)`);
        }

        this.emit('speedChanged', { speed });
    }

    /**
     * Execute one or more simulation ticks.
     * @param {number|null} budgetMs - Wall-clock budget for high-speed batch (null = single tick)
     *
     * budgetMs === null: single-tick path (speeds ≤ 168x)
     * budgetMs > 0:     time-budget path — run ticks until wall-clock deadline is reached,
     *                   yielding the remainder of the 100ms interval to I/O.
     *                   isBatching suppresses intermediate delta broadcasts.
     *                   batchComplete fires once after the budget loop.
     */
    _tick(budgetMs = null) {
        if (!this.engine || this.isPaused) return;

        try {
            if (budgetMs !== null) {
                this.isBatching = true;
                const deadline = Date.now() + budgetMs;
                while (Date.now() < deadline && !this.isPaused) {
                    this.engine.clock.tick();
                    this.engine.updateHourly();
                }
                this.isBatching = false;
                this.emit('batchComplete', this.getTickState());
            } else {
                this.engine.clock.tick();
                this.engine.updateHourly();
            }

            const tickData = this.getTickState();
            this.emit('tick', tickData);

        } catch (error) {
            this.isBatching = false;
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
     * Includes ALL simulation data for complete persistence
     */
    getFullState() {
        if (!this.engine) return null;

        const state = {
            version: 2,  // Incremented for comprehensive save format
            savedAt: Date.now(),
            seed: this.options.seed,

            // Clock state (complete)
            clock: {
                hour: this.engine.clock.hour,
                day: this.engine.clock.day,
                month: this.engine.clock.month,
                year: this.engine.clock.year,
                totalHours: this.engine.clock.totalHours,
                isPaused: this.engine.clock.isPaused,
                startYear: this.engine.clock.startYear || 2025
            },

            // Control state
            speed: this.speed,

            // Statistics
            stats: this.engine.stats,

            // Firms - use built-in getSerializableState() for complete data
            firms: {},

            // Cities - comprehensive serialization
            cities: {},

            // Corporations
            corporations: [],

            // Contracts (complete)
            contracts: [],
            pendingDeliveries: [],

            // Lot Registry (global lot tracking)
            lotRegistry: this._serializeLotRegistry(),

            // Transportation network config (if customized)
            transportConfig: this._serializeTransportConfig(),

            // Product market data (prices, supply/demand)
            productMarketData: this._serializeProductMarketData(),

            // Full product catalog (all possible products)
            productCatalog: this._serializeProductCatalog(),

            // Recent transaction history (last 200)
            recentTransactions: this._serializeRecentTransactions(200)
        };

        // Serialize firms using their built-in serialization (includes lot inventories!)
        for (const [id, firm] of this.engine.firms) {
            // Use firm's own getSerializableState if available, otherwise fall back
            if (typeof firm.getSerializableState === 'function') {
                state.firms[id] = firm.getSerializableState();
            } else {
                state.firms[id] = this._serializeFirm(firm);
            }
        }

        // Serialize cities with full economic data
        const cities = this.engine.cityManager?.getAllCities() || [];
        for (const city of cities) {
            state.cities[city.id] = this._serializeCityFull(city);
        }

        // Serialize corporations
        for (const corp of this.engine.corporations) {
            state.corporations.push(this._serializeCorporationFull(corp));
        }

        // Serialize contracts (complete with fulfillment history)
        const contractManager = this.engine.purchaseManager?.contractManager;
        if (contractManager) {
            for (const contract of contractManager.contracts.values()) {
                state.contracts.push(contract.toJSON());
            }
        }
        // Serialize pending deliveries — lives on purchaseManager, not contractManager
        state.pendingDeliveries = this._serializePendingDeliveries(this.engine.purchaseManager);

        return state;
    }

    /**
     * Serialize LotRegistry for persistence
     */
    _serializeLotRegistry() {
        const registry = this.engine.lotRegistry;
        if (!registry) return null;

        const lotsArray = [];
        for (const lot of registry.allLots.values()) {
            lotsArray.push(lot.toJSON ? lot.toJSON() : {
                id: lot.id,
                productName: lot.productName,
                productId: lot.productId,
                producerId: lot.producerId,
                quantity: lot.quantity,
                unit: lot.unit,
                quality: lot.quality,
                status: lot.status,
                createdAt: lot.createdAt,
                createdDay: lot.createdDay,
                expiresDay: lot.expiresDay,
                reservedFor: lot.reservedFor,
                deliveryId: lot.deliveryId
            });
        }

        return {
            lotCounter: registry.lotCounter,
            lots: lotsArray
        };
    }

    /**
     * Serialize transportation configuration
     */
    _serializeTransportConfig() {
        const network = this.engine.transportationNetwork;
        if (!network) return null;

        // Transport types are typically static config, but include for completeness
        return {
            transportTypes: network.transportTypes
        };
    }

    /**
     * Serialize product market data (prices, supply/demand)
     */
    _serializeProductMarketData() {
        const registry = this.engine.productRegistry;
        if (!registry) return null;

        const marketData = {};
        for (const [id, product] of registry.products) {
            marketData[id] = {
                id: product.id,
                name: product.name,
                currentPrice: product.currentPrice,
                basePrice: product.basePrice,
                demand: product.demand,
                supply: product.supply,
                totalProduced: product.totalProduced,
                totalConsumed: product.totalConsumed
            };
        }
        return marketData;
    }

    /**
     * Serialize full product catalog (all possible products)
     */
    _serializeProductCatalog() {
        const registry = this.engine.productRegistry;
        if (!registry) return null;

        const catalog = {};
        for (const [id, product] of registry.products) {
            catalog[id] = {
                id: product.id,
                name: product.name,
                category: product.category,
                tier: product.tier,
                icon: product.icon,
                basePrice: product.basePrice,
                weight: product.weight,
                unit: product.unit,
                necessityIndex: product.necessityIndex,
                minB2BQuantity: product.minB2BQuantity,
                minRetailQuantity: product.minRetailQuantity,
                baseProductionRate: product.baseProductionRate,
                productionTime: product.productionTime,
                technologyRequired: product.technologyRequired,
                inputs: product.inputs || [],
                // Retail attributes
                purchaseFrequency: product.purchaseFrequency,
                publicDemand: product.publicDemand,
                publicNecessity: product.publicNecessity,
                publicLuxury: product.publicLuxury,
                priceConcern: product.priceConcern,
                qualityConcern: product.qualityConcern,
                reputationConcern: product.reputationConcern,
                mainCategory: product.mainCategory,
                subcategory: product.subcategory
            };
        }
        return catalog;
    }

    /**
     * Serialize pending deliveries with full details
     */
    _serializePendingDeliveries(purchaseManager) {
        if (!purchaseManager?.pendingDeliveries) return [];

        return purchaseManager.pendingDeliveries.map(delivery => ({
            id: delivery.id,
            contractId: delivery.contractId,
            supplierId: delivery.supplierId || delivery.seller?.id,
            supplierName: delivery.supplierName || delivery.seller?.name || null,
            buyerId: delivery.buyerId || delivery.buyer?.id,
            buyerName: delivery.buyerName || delivery.buyer?.name || null,
            productName: delivery.productName || delivery.product || null,
            quantity: delivery.quantity,
            quality: delivery.quality,
            unitPrice: delivery.unitPrice || delivery.pricePerUnit,
            totalCost: delivery.totalCost || delivery.totalValue,
            transportCost: delivery.transportCost,
            createdAt: delivery.createdAt || delivery.departureHour,
            arrivalHour: delivery.arrivalHour,
            transportType: delivery.transportType,
            status: delivery.status,
            lotIds: delivery.lotIds || []
        }));
    }

    /**
     * Restore simulation state from saved data
     * Comprehensive restore including all simulation components
     */
    async restoreState(state) {
        if (!this.engine) {
            throw new Error('Engine not initialized');
        }

        console.log('🔄 Restoring simulation state (version:', state.version, ')');

        try {
            // 1. Restore clock state
            if (state.clock) {
                this._restoreClock(state.clock);
            }

            // 2. Restore control state
            if (state.speed) {
                this.setSpeed(state.speed);
            }

            // 3. Restore statistics
            if (state.stats) {
                Object.assign(this.engine.stats, state.stats);
            }

            // 4. Restore lot registry first (firms reference lots)
            if (state.lotRegistry) {
                await this._restoreLotRegistry(state.lotRegistry);
            }

            // 5. Restore firms with their lot inventories
            if (state.firms) {
                this._restoreFirms(state.firms);
            }

            // 6. Restore cities
            if (state.cities) {
                this._restoreCities(state.cities);
            }

            // 7. Restore corporations
            if (state.corporations) {
                this._restoreCorporations(state.corporations);
                // 7b. Re-link firm objects into corp.firms[] using corporationId on each firm
                this._rewireCorporationFirms();
            }

            // 8. Restore contracts
            if (state.contracts) {
                this._restoreContracts(state.contracts);
            }

            // 9. Restore pending deliveries
            if (state.pendingDeliveries) {
                this._restorePendingDeliveries(state.pendingDeliveries);
            }

            // 10. Restore product market data
            if (state.productMarketData) {
                this._restoreProductMarketData(state.productMarketData);
            }

            console.log('✅ State restoration complete');
            return true;

        } catch (error) {
            console.error('❌ State restoration failed:', error);
            throw error;
        }
    }

    /**
     * Restore clock state
     */
    _restoreClock(clockState) {
        const clock = this.engine.clock;
        if (!clock) return;

        // Set the start year first if present (needed for totalHours calculation)
        if (clockState.startYear) {
            clock._startYear = clockState.startYear;
        }

        // Restore time components (totalHours is a computed getter, not settable)
        clock.hour = clockState.hour ?? clock.hour;
        clock.day = clockState.day ?? clock.day;
        clock.month = clockState.month ?? clock.month;
        clock.year = clockState.year ?? clock.year;

        // Always start paused after loading - user must click Play to resume
        // This keeps both isPaused states in sync
        clock.isPaused = true;
        this.isPaused = true;

        console.log(`🕐 Clock restored to ${clock.year}-${String(clock.month).padStart(2, '0')}-${String(clock.day).padStart(2, '0')} ${String(clock.hour).padStart(2, '0')}:00`);
    }

    /**
     * Restore LotRegistry
     */
    async _restoreLotRegistry(registryData) {
        const registry = this.engine.lotRegistry;
        if (!registry || !registryData) return;

        // Clear existing lots
        registry.allLots.clear();
        registry.lotsByProducer.clear();
        registry.lotsByProduct.clear();

        // Restore counter
        registry.lotCounter = registryData.lotCounter || 0;

        // Import Lot class so we restore proper instances (not plain objects)
        const { Lot } = await import(`file://${CORE_PATH}/Lot.js`);

        for (const lotData of registryData.lots || []) {
            const lot = Lot.fromJSON(lotData);
            registry.allLots.set(lot.id, lot);

            // Rebuild producer tracking
            if (lotData.producerId) {
                if (!registry.lotsByProducer.has(lotData.producerId)) {
                    registry.lotsByProducer.set(lotData.producerId, new Set());
                }
                registry.lotsByProducer.get(lotData.producerId).add(lot.id);
            }

            // Rebuild product tracking
            if (lotData.productName) {
                if (!registry.lotsByProduct.has(lotData.productName)) {
                    registry.lotsByProduct.set(lotData.productName, new Set());
                }
                registry.lotsByProduct.get(lotData.productName).add(lot.id);
            }
        }
    }

    /**
     * Restore firms with their complete state
     */
    _restoreFirms(firmsData) {
        for (const [firmId, firmState] of Object.entries(firmsData)) {
            const firm = this.engine.firms.get(firmId);
            if (firm && typeof firm.restoreState === 'function') {
                firm.restoreState(firmState);
            } else if (firm) {
                // Manual restoration for firms without restoreState method
                this._manualFirmRestore(firm, firmState);
            }
        }
    }

    /**
     * Manual firm state restoration for backward compatibility
     */
    _manualFirmRestore(firm, state) {
        // Financial
        firm.cash = state.cash ?? firm.cash;
        firm.revenue = state.revenue ?? firm.revenue;
        firm.expenses = state.expenses ?? firm.expenses;
        firm.profit = state.profit ?? firm.profit;
        firm.monthlyRevenue = state.monthlyRevenue ?? firm.monthlyRevenue;
        firm.monthlyExpenses = state.monthlyExpenses ?? firm.monthlyExpenses;
        firm.monthlyProfit = state.monthlyProfit ?? firm.monthlyProfit;

        // Performance
        firm.brandRating = state.brandRating ?? firm.brandRating;
        firm.technologyLevel = state.technologyLevel ?? firm.technologyLevel;
        firm.efficiency = state.efficiency ?? firm.efficiency;

        // Lot inventory restoration
        if (state.lotInventory && firm.lotInventory) {
            firm.lotInventory.restoreFromJSON?.(state.lotInventory, this.engine.lotRegistry);
        }
    }

    /**
     * Restore cities
     */
    _restoreCities(citiesData) {
        const cityManager = this.engine.cityManager;
        if (!cityManager) return;

        for (const [cityId, cityState] of Object.entries(citiesData)) {
            const city = cityManager.cities?.get(cityId) ||
                         cityManager.getAllCities?.().find(c => c.id === cityId);

            if (city) {
                // Restore economic data
                city.population = cityState.population ?? city.population;
                city.unemploymentRate = cityState.unemploymentRate ?? city.unemploymentRate;
                city.totalPurchasingPower = cityState.totalPurchasingPower ?? city.totalPurchasingPower;
                city.consumerConfidence = cityState.consumerConfidence ?? city.consumerConfidence;
                city.costOfLiving = cityState.costOfLiving ?? city.costOfLiving;
                city.localPreference = cityState.localPreference ?? city.localPreference;

                // Restore demographics
                if (cityState.demographics && city.demographics) {
                    Object.assign(city.demographics, cityState.demographics);
                }

                // Restore economic classes
                if (cityState.economicClasses && city.economicClasses) {
                    Object.assign(city.economicClasses, cityState.economicClasses);
                }

                // Restore monthly stats
                if (cityState.monthlyStats && city.monthlyStats) {
                    Object.assign(city.monthlyStats, cityState.monthlyStats);
                }
            }
        }
    }

    /**
     * Restore corporations — including roadmap, goals, and integration map
     */
    _restoreCorporations(corporationsData) {
        for (const corpState of corporationsData) {
            const corp = this.engine.corporations.find(c => c.id === corpState.id);
            if (corp) {
                // Use Corporation.restoreState() which handles all fields:
                // financials, roadmap, currentGoal, goalStartMonth, goalHistory,
                // integrationMap, isFullyVertical, firms list
                if (typeof corp.restoreState === 'function') {
                    corp.restoreState(corpState);
                } else {
                    // Fallback: financial fields only
                    corp.totalValue = corpState.totalValue ?? corp.totalValue;
                    corp.totalProfit = corpState.totalProfit ?? corp.totalProfit;
                    corp.employeeCount = corpState.employeeCount ?? corp.employeeCount;
                    corp.totalCash = corpState.totalCash ?? corp.totalCash;
                    corp.totalRevenue = corpState.totalRevenue ?? corp.totalRevenue;
                    corp.totalExpenses = corpState.totalExpenses ?? corp.totalExpenses;
                }
            }
        }
    }

    /**
     * Re-link live firm objects into each corporation's firms[] array.
     * Firms are restored before corporations, so corporationId is set on each firm.
     * This must run after both _restoreFirms and _restoreCorporations complete.
     */
    _rewireCorporationFirms() {
        // Clear existing firm refs on all corps (they may be stale from generation)
        for (const corp of this.engine.corporations) {
            corp.firms = [];
        }

        // Re-populate from the engine.firms map using each firm's corporationId
        for (const [, firm] of this.engine.firms) {
            if (!firm.corporationId) continue;
            const corp = this.engine.corporations.find(c => c.id === firm.corporationId);
            if (corp) {
                corp.firms.push(firm);
            }
        }

        // Rebuild integrationMap from the now-populated firms list
        for (const corp of this.engine.corporations) {
            if (typeof corp.updateIntegrationMap === 'function') {
                corp.updateIntegrationMap();
            }
        }
    }

    /**
     * Restore contracts — uses ContractManager.fromJSON() to rebuild Contract
     * instances and all lookup indices (bySupplier, byBuyer, byProduct).
     */
    _restoreContracts(contractsData) {
        const contractManager = this.engine.purchaseManager?.contractManager;
        if (!contractManager) return;

        // ContractManager.fromJSON rebuilds indices and creates proper Contract instances
        if (typeof contractManager.fromJSON === 'function') {
            contractManager.fromJSON({ contracts: contractsData, config: {}, stats: {} });
        } else {
            // Fallback: plain objects (indices not rebuilt — lookup by supplier/buyer won't work)
            contractManager.contracts.clear();
            for (const contractData of contractsData) {
                contractManager.contracts.set(contractData.id, contractData);
            }
        }
    }

    /**
     * Restore pending deliveries — reconstructs the nested seller/buyer shape
     * that PurchaseManager.completeDelivery() expects.
     */
    _restorePendingDeliveries(deliveriesData) {
        const purchaseManager = this.engine.purchaseManager;
        if (!purchaseManager) return;

        purchaseManager.pendingDeliveries = (deliveriesData || []).map(d => ({
            id: d.id,
            contractId: d.contractId || null,
            // Reconstruct nested seller/buyer objects from flat serialized fields
            seller: { id: d.supplierId, name: d.supplierName || d.supplierId || 'Unknown' },
            buyer:  { id: d.buyerId,    name: d.buyerName    || d.buyerId    || 'Unknown' },
            productName:   d.productName,
            quantity:      d.quantity,
            quality:       d.quality  ?? 1.0,
            unitPrice:     d.unitPrice,
            totalCost:     d.totalCost,
            transportCost: d.transportCost || 0,
            createdAt:     d.createdAt,
            arrivalHour:   d.arrivalHour,
            transportType: d.transportType || null,
            status:        d.status || 'in_transit'
        }));
    }

    /**
     * Restore product market data
     */
    _restoreProductMarketData(marketData) {
        const registry = this.engine.productRegistry;
        if (!registry || !marketData) return;

        for (const [productId, data] of Object.entries(marketData)) {
            const product = registry.products.get(Number(productId)) ||
                           registry.products.get(productId);

            if (product) {
                product.currentPrice = data.currentPrice ?? product.currentPrice;
                product.demand = data.demand ?? product.demand;
                product.supply = data.supply ?? product.supply;
                product.totalProduced = data.totalProduced ?? product.totalProduced;
                product.totalConsumed = data.totalConsumed ?? product.totalConsumed;
            }
        }
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

    // ─── Delta snapshot methods ───────────────────────────────────────────────

    /**
     * Serialize recent transactions from TransactionLog.
     * @param {number} limit - Max entries (default 200)
     * @returns {Array}
     */
    _serializeRecentTransactions(limit = 200) {
        const log = this.engine?.transactionLog;
        if (!log) return [];
        return log.getRecentTransactions(limit).map(tx => ({
            id: tx.id,
            category: tx.category,
            gameTime: tx.gameTime || null,
            sellerId: tx.seller?.id || null,
            sellerName: tx.seller?.name || null,
            sellerType: tx.seller?.type || tx.sellerType || null,
            buyerId: tx.buyer?.id || null,
            buyerName: tx.buyer?.name || null,
            buyerType: tx.buyer?.type || tx.buyerType || null,
            productName: tx.product || tx.material || null,
            quantity: tx.quantity || 0,
            unitPrice: tx.unitPrice || 0,
            totalValue: tx.totalCost || tx.totalRevenue || 0,
            cityName: tx.seller?.city || tx.cityName || null,
            contractId: tx.contractId || null
        }));
    }

    /**
     * Financial-only snapshot of all firms.
     * Sent every game day. Only mutable financial fields — no static metadata.
     * @returns {Object} { [firmId]: { cash, revenue, expenses, profit, currentProfit } }
     */
    getFirmFinancialSnapshot() {
        if (!this.engine) return {};
        const result = {};
        for (const [id, firm] of this.engine.firms) {
            result[id] = {
                // Identity (keeps delta self-sufficient; client merge preserves these)
                id:          firm.id,
                type:        firm.type,
                displayName: typeof firm.getDisplayName === 'function' ? firm.getDisplayName() : (firm.displayName || firm.name || firm.id),
                cityName:    firm.city?.name || null,
                corporationId:           firm.corporationId || null,
                corporationAbbreviation: firm.corporationAbbreviation || null,
                // Financials
                cash:         firm.cash         || 0,
                revenue:      firm.revenue       || 0,
                expenses:     firm.expenses      || 0,
                profit:       firm.profit        || 0,
                monthlyRevenue:  firm.monthlyRevenue  || 0,
                monthlyExpenses: firm.monthlyExpenses || 0,
                monthlyProfit:   firm.monthlyProfit   || 0,
                currentProfit: typeof firm.getCurrentProfit === 'function'
                    ? firm.getCurrentProfit()
                    : (firm.profit || 0),
                totalEmployees: firm.totalEmployees || 0,
                consecutiveLossMonths: firm.consecutiveLossMonths || 0,
                noSaleStreak: firm.noSaleStreak || 0,
                consecutiveThrottleCycles: firm.consecutiveThrottleCycles || 0,
                lastThrottleReason: firm.lastThrottleReason || null
            };
        }
        return result;
    }

    /**
     * Summary snapshot of all corporations.
     * Sent every game month. Full array replacement — corps are small.
     * @returns {Array}
     */
    getCorporationSummarySnapshot() {
        if (!this.engine) return [];
        return this.engine.corporations.map(corp => ({
            id:             corp.id,
            name:           corp.name,
            abbreviation:   corp.abbreviation,
            type:           corp.type,
            capital:        corp.capital        || 0,
            cash:           corp.cash           || 0,
            monthlyRevenue: corp.monthlyRevenue  || 0,
            monthlyExpenses:corp.monthlyExpenses || 0,
            monthlyProfit:  corp.monthlyProfit   || 0,
            employees:      corp.employees       || 0,
            firmCount:      corp.firms?.length   || 0,
            currentGoal:    corp.currentGoal     || null,
            isFullyVertical:corp.isFullyVertical  || false,
            monthlyHistory: corp.monthlyHistory  || [],
            primaryPersona: corp.primaryPersona  || null,
            integrationMap: corp.integrationMap  || null,
            headquartersCity: corp.headquartersCity || null
        }));
    }

    /**
     * Economic-indicator snapshot of all cities.
     * Sent every game month. Only fields that change — no static coordinates/infra.
     * @returns {Object} { [cityId]: { ... economic fields } }
     */
    getCityEconomicSnapshot() {
        if (!this.engine) return {};
        const result = {};
        for (const city of this.engine.cities) {
            result[city.id] = {
                population:          city.population           || 0,
                unemploymentRate:     city.unemploymentRate     || 0,
                totalPurchasingPower: city.totalPurchasingPower || 0,
                consumerConfidence:   city.consumerConfidence   || 0,
                salaryLevel:         city.salaryLevel           || 0,
                marketSize:          city.marketSize            || 0,
                demographics: city.demographics ? {
                    employed:   city.demographics.employed   || 0,
                    unemployed: city.demographics.unemployed || 0,
                    population: city.demographics.population || 0
                } : null,
                monthlyStats: city.monthlyStats ? {
                    totalTransactions: city.monthlyStats.totalTransactions || 0,
                    totalVolume:       city.monthlyStats.totalVolume       || 0,
                    avgPrice:          city.monthlyStats.avgPrice          || 0
                } : null
            };
        }
        return result;
    }

    /**
     * Product market data snapshot. Reuses existing serialization.
     * Sent every game day.
     */
    getProductMarketSnapshot() {
        return this._serializeProductMarketData();
    }

    /**
     * Serialize all active contracts for client display.
     * Included in daily delta so contract activity stays up to date.
     * @returns {Array}
     */
    getContractSnapshot() {
        const contractManager = this.engine?.purchaseManager?.contractManager;
        if (!contractManager) return [];
        const result = [];
        for (const contract of contractManager.contracts.values()) {
            result.push(contract.toJSON());
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────

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
     * Serialize a firm without circular references
     */
    _serializeFirm(firm) {
        if (!firm) return null;
        return {
            id: firm.id,
            type: firm.type,
            name: firm.name,
            displayName: firm.displayName || firm.name,
            cityId: firm.cityId || firm.city?.id,
            cityName: firm.city?.name,
            corporationId: firm.corporationId || firm.corporation?.id,
            corporationAbbreviation: firm.corporation?.abbreviation,
            cash: firm.cash || 0,
            revenue: firm.revenue || 0,
            expenses: firm.expenses || 0,
            profit: firm.profit || 0,
            currentProfit: typeof firm.getCurrentProfit === 'function' ? firm.getCurrentProfit() : (firm.profit || 0),
            employees: firm.employees || 0,
            storeType: firm.storeType,
            farmType: firm.farmType,
            cropType: firm.cropType,
            livestockType: firm.livestockType,
            bankType: firm.bankType,
            resourceType: firm.resourceType,
            timberType: firm.timberType,
            productName: firm.product?.name,
            noSaleStreak: firm.noSaleStreak || 0,
            consecutiveThrottleCycles: firm.consecutiveThrottleCycles || 0,
            lastThrottleReason: firm.lastThrottleReason || null
        };
    }

    /**
     * Serialize a city without circular references (basic - for display)
     */
    _serializeCity(city) {
        if (!city) return null;
        return {
            id: city.id,
            name: city.name,
            countryId: city.countryId || city.country?.id,
            countryName: city.country?.name,
            population: city.population || city.demographics?.population || 0,
            demographics: city.demographics ? {
                population: city.demographics.population,
                employed: city.demographics.employed,
                unemployed: city.demographics.unemployed
            } : null,
            hasAirport: !!city.hasAirport,
            hasSeaport: !!city.hasSeaport,
            hasRailway: !!city.hasRailway,
            totalPurchasingPower: city.totalPurchasingPower || 0,
            coordinates: city.coordinates ? { x: city.coordinates.x, y: city.coordinates.y } : null
        };
    }

    /**
     * Serialize a city with FULL economic data (for persistence)
     */
    _serializeCityFull(city) {
        if (!city) return null;
        return {
            id: city.id,
            name: city.name,
            countryId: city.countryId || city.country?.id,
            countryName: city.country?.name,
            population: city.population || 0,

            // Full demographics
            demographics: city.demographics ? {
                total: city.demographics.total,
                population: city.demographics.population,
                nonWorking: city.demographics.nonWorking,
                workingAge: city.demographics.workingAge,
                employed: city.demographics.employed,
                unemployed: city.demographics.unemployed,
                nonWorkingPercent: city.demographics.nonWorkingPercent,
                employedPercent: city.demographics.employedPercent
            } : null,

            // Full economic classes
            economicClasses: city.economicClasses ? this._serializeEconomicClasses(city.economicClasses) : null,

            // Economic indicators
            salaryLevel: city.salaryLevel,
            unemploymentRate: city.unemploymentRate,
            totalPurchasingPower: city.totalPurchasingPower || 0,
            costOfLiving: city.costOfLiving,
            marketSize: city.marketSize,
            consumerConfidence: city.consumerConfidence,
            localPreference: city.localPreference,

            // Infrastructure
            hasAirport: !!city.hasAirport,
            hasSeaport: !!city.hasSeaport,
            hasRailway: !!city.hasRailway,
            isCoastal: !!city.isCoastal,
            infrastructureQuality: city.infrastructureQuality,
            climate: city.climate,

            // Location
            coordinates: city.coordinates ? { x: city.coordinates.x, y: city.coordinates.y } : null,

            // Statistics
            monthlyStats: city.monthlyStats ? {
                totalSales: city.monthlyStats.totalSales,
                avgProductPrice: city.monthlyStats.avgProductPrice,
                employmentChange: city.monthlyStats.employmentChange,
                populationGrowth: city.monthlyStats.populationGrowth
            } : null,

            // Firms in city (just IDs to avoid circular refs)
            firmIds: city.firms?.map(f => f.id || f) || []
        };
    }

    /**
     * Serialize economic classes
     */
    _serializeEconomicClasses(classes) {
        if (!classes) return null;
        const serialized = {};
        for (const [className, data] of Object.entries(classes)) {
            serialized[className] = {
                name: data.name,
                count: data.count,
                percentage: data.percentage,
                salaryRange: data.salaryRange,
                avgSalary: data.avgSalary,
                totalIncome: data.totalIncome,
                disposableIncome: data.disposableIncome
            };
        }
        return serialized;
    }

    /**
     * Serialize a corporation without circular references (basic - for display)
     */
    _serializeCorporation(corp) {
        if (!corp) return null;
        return {
            id: corp.id,
            name: corp.name,
            abbreviation: corp.abbreviation || corp.abbr,
            headquartersCity: corp.headquartersCity?.name || corp.headquarters,
            headquartersCityId: corp.headquartersCity?.id,
            totalValue: corp.totalValue || 0,
            totalProfit: corp.totalProfit || 0,
            employeeCount: corp.employeeCount || 0,
            firmCount: corp.firms?.length || 0,
            firmIds: corp.firms?.map(f => f.id) || []
        };
    }

    /**
     * Serialize a corporation with FULL data (for persistence)
     */
    _serializeCorporationFull(corp) {
        if (!corp) return null;
        return {
            id: corp.id,
            name: corp.name,
            abbreviation: corp.abbreviation || corp.abbr,
            type: corp.type,

            // Location
            headquartersCity: corp.headquartersCity?.name || corp.headquarters,
            headquartersCityId: corp.headquartersCity?.id,

            // Financials
            totalValue: corp.totalValue || 0,
            capital: corp.capital || 0,
            cash: corp.cash || 0,
            totalCash: corp.totalCash || 0,
            totalRevenue: corp.totalRevenue || 0,
            monthlyRevenue: corp.monthlyRevenue || 0,
            totalExpenses: corp.totalExpenses || 0,
            monthlyExpenses: corp.monthlyExpenses || 0,
            totalProfit: corp.totalProfit || 0,
            monthlyProfit: corp.monthlyProfit || 0,
            totalAssets: corp.totalAssets || 0,
            totalLiabilities: corp.totalLiabilities || 0,
            debt: corp.debt || 0,
            creditRating: corp.creditRating,

            // Operations
            employeeCount: corp.employeeCount || 0,
            firmCount: corp.firms?.length || 0,
            firmIds: corp.firms?.map(f => f.id) || [],

            // Strategy/Settings
            expansionStrategy: corp.expansionStrategy,
            reinvestmentRate: corp.reinvestmentRate,

            // Strategic Goals
            strategicGoals: corp.strategicGoals ? {
                primary: corp.strategicGoals.primary,
                targetFirms: corp.strategicGoals.targetFirms,
                targetRevenue: corp.strategicGoals.targetRevenue,
                targetMarketShare: corp.strategicGoals.targetMarketShare,
                expansionPriority: corp.strategicGoals.expansionPriority,
                phase: corp.strategicGoals.phase,
                completedGoals: corp.strategicGoals.completedGoals || []
            } : null,

            // Corporation Attributes
            attributes: corp.attributes ? {
                riskTolerance: corp.attributes.riskTolerance,
                qualityFocus: corp.attributes.qualityFocus,
                efficiencyFocus: corp.attributes.efficiencyFocus,
                growthOrientation: corp.attributes.growthOrientation,
                integrationPreference: corp.attributes.integrationPreference,
                contractPreference: corp.attributes.contractPreference
            } : null,

            // Roadmap State
            roadmap: corp.roadmap ? this._serializeRoadmap(corp.roadmap) : null,
            currentGoal: corp.currentGoal || null,
            goalStartMonth: corp.goalStartMonth || 0,
            goalHistory: corp.goalHistory || [],
            integrationMap: corp.integrationMap || null,
            isFullyVertical: corp.isFullyVertical || false,

            // Personas (industry focus)
            personas: corp.personas?.map(p => ({
                tier: p.tier,
                category: p.category,
                products: p.products,
                firmTypes: p.firmTypes
            })) || [],

            // Creation info
            createdAt: corp.createdAt,
            foundedYear: corp.foundedYear,
            firstFirmAt: corp.firstFirmAt
        };
    }

    /**
     * Serialize a corporation's CorporateRoadmap instance for the client.
     */
    _serializeRoadmap(roadmap) {
        if (!roadmap) return null;
        const serializeAction = a => ({
            id: a.id,
            type: a.type,
            horizon: a.horizon,
            status: a.status,
            scheduledMonth: a.scheduledMonth,
            goal: a.goal,
            subAction: a.subAction || null,
            direction: a.direction || null,
            isAcquisition: a.isAcquisition || false,
            tier: a.tier || null,
            personaType: a.persona?.type || null,
            rationale: a.rationale || null,
            cost: a.cost || 0,
            cityName: a.city?.name || a.cityName || null,
            countryName: a.country?.name || a.countryName || null
        });
        return {
            shortTerm:        (roadmap.shortTerm        || []).map(serializeAction),
            mediumTerm:       (roadmap.mediumTerm       || []).map(serializeAction),
            longTerm:         (roadmap.longTerm         || []).map(serializeAction),
            completedActions: (roadmap.completedActions || []).slice(-6).map(serializeAction)
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Stop our tick interval
        this.pause();

        // Clear any engine intervals that might exist
        this._clearEngineIntervals();

        if (this.engine) {
            // Call engine's destroy if available (clears its intervals too)
            this.engine.destroy?.();
            this.engine = null;
        }

        this.removeAllListeners();
        console.log('🗑️ EngineAdapter destroyed');
    }
}
