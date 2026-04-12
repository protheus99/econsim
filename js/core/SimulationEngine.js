// js/core/SimulationEngine.js
import { GameClock } from '../core/GameClock.js';
import { CityManager } from '../core/CityManager.js';
import { ProductRegistry } from '../core/Product.js';
import { Country, FICTIONAL_COUNTRIES } from '../core/Country.js';
// GlobalMarket removed - local suppliers only
import { TransactionLog } from '../core/TransactionLog.js';
import { ProductCostCalculator } from '../core/ProductCostCalculator.js';
import { LotRegistry } from '../core/Lot.js';
import { CityRetailDemandManager } from '../core/CityRetailDemandManager.js';
import { PurchaseManager } from './purchasing/PurchaseManager.js';
import { getLotSizeForProduct } from '../core/LotSizings.js';
import { Contract } from './purchasing/Contract.js';

// Extracted modules for smaller file size
import { FirmGenerator } from './generators/FirmGenerator.js';
import { DeliveryManager } from './managers/DeliveryManager.js';
import { TradeExecutor } from './trading/TradeExecutor.js';

// Corporate organic growth system
import { CorporationManager } from './corporations/CorporationManager.js';

// Persistent storage (IndexedDB)
import { gameStorage } from './GameStorage.js';

const DEBUG_SIMULATION = false;

export class SimulationEngine {
    constructor() {
        this.clock = new GameClock();
        this.gameName = '';
        this.productRegistry = new ProductRegistry();
        this.countries = new Map();
        this.cityManager = null;
        this.firms = new Map();
        this.corporations = [];

        // Pre-partitioned firm arrays — rebuilt once after generateFirms(), never per-tick
        this.producerFirms = [];       // MINING, LOGGING, FARM
        this.manufacturerFirms = [];   // MANUFACTURING
        this.retailerFirms = [];       // RETAIL
        this.nonRetailFirms = [];      // all except RETAIL

        // City product coverage tracking - prevents retailer convergence on same products
        // Map<cityId, Map<productId, Set<retailerId>>>
        this.cityProductRetailers = new Map();
        this.corporationsById = new Map(); // O(1) lookup by corporation ID
        this.events = [];
        this.marketHistory = [];
        this.hourlyTransactions = { count: 0, value: 0 }; // Track B2B + retail transactions
        this.speed = 1;
        this.isInitialized = false;

        this.hourlyInterval = null;
        this.dailyTick = 0;
        this.monthlyTick = 0;
        this.yearlyTick = 0;

        // Counter for deterministic firm ID generation
        this.firmCreationIndex = 0;

        // Global Market System - REMOVED (local suppliers only)

        // Extracted modules for cleaner architecture
        this.firmGenerator = new FirmGenerator(this);
        this.deliveryManager = new DeliveryManager(this);
        this.tradeExecutor = new TradeExecutor(this);

        // Corporation Manager for organic growth system
        this.corporationManager = null; // Initialized after config load

        // Legacy alias for backward compatibility
        this.pendingLocalDeliveries = this.deliveryManager.pendingDeliveries;

        // Transaction Log for detailed activity tracking
        this.transactionLog = new TransactionLog(1000);
        this.transactionLog.setClock(this.clock); // Use game time for timestamps

        // Product Cost Calculator for balancing
        this.costCalculator = null;

        // Lot Registry for lot-based inventory system
        this.lotRegistry = new LotRegistry();

        // City Retail Demand Manager for competitive retail system
        this.cityRetailDemandManager = null;

        // Purchase Manager for unified supply chain and purchasing
        this.purchaseManager = null;

        // Configuration settings (loaded from config.json or use defaults)
        this.config = {
            simulation: {
                version: '1.0.0',
                startYear: 2025,
                timeScale: { realSecond: 1000, gameHour: 1 }
            },
            inventory: {
                initialStockWeeks: 1,
                reorderThresholdWeeks: 4,
                reorderQuantityWeeks: 2,
                maxStockWeeks: 8
            },
            countries: {
                count: 25,
                tariffs: { raw: 0.05, semiRaw: 0.10, manufactured: 0.15 }
            },
            cities: {
                initial: 25,
                minPopulation: 250000,
                maxPopulation: 5000000,
                salaryLevel: { min: 0.1, max: 1.0, default: 0.5 },
                demographics: { nonWorkingPercentage: 0.30, employmentRate: 0.85 },
                infrastructure: { airportThreshold: 500000, seaportRequiresCoastal: true, railwayThreshold: 250000 }
            },
            firms: {
                perCity: { min: 20, max: 35 },
                distribution: { MINING: 0.15, LOGGING: 0.10, FARM: 0.20, MANUFACTURING: 0.25, RETAIL: 0.20, BANK: 0.10 }
            },
            products: {
                tiers: ['RAW', 'SEMI_RAW', 'MANUFACTURED']
            },
            transportation: {
                types: {
                    LOCAL_ROAD: { costPerKm: 0.50, speedKmh: 50, reliability: 0.85 },
                    HIGHWAY: { costPerKm: 0.30, speedKmh: 90, reliability: 0.95 },
                    TRAIN: { costPerKm: 0.15, speedKmh: 80, reliability: 0.90 },
                    AIR: { costPerKm: 2.50, speedKmh: 600, reliability: 0.92, baseCost: 500 },
                    SEA: { costPerKm: 0.08, speedKmh: 40, reliability: 0.85, baseCost: 1000 }
                }
            },
            labor: {
                benefitsMultiplier: 1.30,
                wagesByFirm: {}
            },
            banking: {
                reserveRequirement: 0.10,
                baseInterestRate: 0.05,
                bankMargin: 0.03,
                depositRate: 0.02,
                minCreditScore: 40,
                maxLoanToAssetRatio: 0.80,
                defaultThreshold: 3
            },
            purchasing: {
                // Enable contract-based purchasing
                enableContracts: true,
                // Enable supplier scoring with transport costs
                enableSupplierScoring: true
            },
            corporations: {
                // Enable organic growth (firms created via board meetings)
                organicGrowth: false,  // Set to true to enable organic growth
                // Firms per corporation for generation
                firmsPerCorp: 4,
                // Initial firms created per corporation when organic growth is disabled
                initialFirmsPerCorp: 0
            }
        };

        // Will be loaded from config.json
        this.configLoaded = false;

        // Statistics
        this.stats = {
            totalPopulation: 0,
            totalGDP: 0,
            totalEmployed: 0,
            totalFirms: 0,
            totalProducts: 0,
            avgSalaryLevel: 0,
        };
    }

    async loadConfig() {
        try {
            const response = await fetch('data/config.json');
            if (response.ok) {
                const loadedConfig = await response.json();
                // Merge all config sections with defaults
                this.mergeConfig(loadedConfig);
                this.configLoaded = true;
                console.log('✅ Configuration loaded from config.json');
            }
        } catch (error) {
            console.warn('⚠️ Could not load config.json, using defaults:', error.message);
        }
    }

    mergeConfig(loadedConfig) {
        // Deep merge helper for nested objects
        const deepMerge = (target, source) => {
            for (const key of Object.keys(source)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
            return target;
        };

        // Merge each config section
        const sections = [
            'simulation', 'inventory', 'countries', 'cities',
            'firms', 'products', 'transportation', 'labor', 'banking',
            'corporations', 'purchasing'
        ];

        for (const section of sections) {
            if (loadedConfig[section]) {
                if (!this.config[section]) {
                    this.config[section] = {};
                }
                deepMerge(this.config[section], loadedConfig[section]);
            }
        }
    }

    async initialize() {
        console.log('🚀 Initializing Enhanced Simulation Engine...');

        // Initialize persistent storage (IndexedDB)
        await gameStorage.initialize();
        console.log('✅ Game Storage initialized (IndexedDB)');

        // Initialize seeded RNG for consistent generation within a session
        this.initializeRng();

        // Load config and wait for it before initializing systems that depend on it
        await this.loadConfig();

        // Global Market REMOVED - using local suppliers only

        // Initialize Product Cost Calculator for game balancing
        this.costCalculator = new ProductCostCalculator(this.productRegistry);
        console.log('✅ Product Cost Calculator initialized');

        // Initialize City Retail Demand Manager for competitive retail
        this.cityRetailDemandManager = new CityRetailDemandManager(this);
        console.log('✅ City Retail Demand Manager initialized');

        // Initialize Purchase Manager for unified supply chain
        this.purchaseManager = new PurchaseManager(this);
        this.purchaseManager.setRetailDemandManager(this.cityRetailDemandManager);
        console.log('✅ Purchase Manager initialized');

        // Initialize countries first
        this.initializeCountries();

        // Initialize city manager with countries and config (pass seeded random for deterministic generation)
        this.cityManager = new CityManager(this.countries, this.config, () => this.random());
        this.cities = this.cityManager.generateInitialCities(); // Uses config.cities.initial

        // Initialize Corporation Manager for organic growth
        this.corporationManager = new CorporationManager(this);

        // Generate corporations and build lookup Map
        if (this.config.corporations?.organicGrowth) {
            // Use new organic growth system - corporations with personas.
            // IMPORTANT: push into the existing array rather than replacing it.
            // ensureMineralCoverage() (called inside generateCorporations) pushes mineral corps
            // directly to this.corporations via this.engine.corporations.push().
            // If we replace the array reference, those corps would be lost.
            const newCorps = this.corporationManager.generateCorporations();
            this.corporations.push(...newCorps);
            console.log('✅ Using organic growth system - firms created via roadmap');
        } else {
            // Legacy system - simple corporations
            this.corporations = this.generateCorporations();
        }
        this.corporations.forEach(corp => this.corporationsById.set(corp.id, corp));

        // Generate firms (mining, logging, farms, manufacturing, retail, banks)
        // In organic growth mode, firms are created via monthly board meetings
        if (!this.config.corporations?.organicGrowth) {
            this.generateFirms();
        } else {
            console.log('📋 Organic growth: Firms will be created via monthly board meetings');
        }

        // Wire up ContractManager to firms for production throttling
        // In organic growth mode, firms are created later via board meetings
        if (!this.config.corporations?.organicGrowth) {
            this.wireContractManagerToFirms();

            // Auto-create supply contracts for manufacturers
            this.initializeSupplyContracts();
        }

        // Restore saved state if available (for cross-page persistence)
        const stateRestored = this.restoreState();
        if (stateRestored) {
            console.log('♻️ Game state restored from previous page');
            // Regenerate any missing city coordinates (for saves before coordinates were persisted)
            this.cityManager.regenerateMissingCoordinates();
        }

        // Initialize statistics before first render
        this.updateStatistics();

        // Setup intervals
        this.setupIntervals();

        // Setup page lifecycle handlers for state persistence
        this.setupPageLifecycleHandlers();

        this.isInitialized = true;

        console.log('✅ Enhanced Simulation initialized with:');
        console.log(`   - ${this.countries.size} countries`);
        console.log(`   - ${this.cities.length} cities`);
        console.log(`   - ${this.cityManager.getTotalPopulation().toLocaleString()} total population`);
        console.log(`   - ${this.firms.size} firms operating`);
        console.log(`   - ${this.productRegistry.getAllProducts().length} products available`);

        this.addEvent('success', 'Simulation Started', 'Enhanced economic simulation initialized successfully');
    }

    initializeCountries() {
        // Use config count, default to all available countries
        const countryCount = this.config.countries?.count ?? FICTIONAL_COUNTRIES.length;
        const countriesToLoad = FICTIONAL_COUNTRIES.slice(0, countryCount);

        countriesToLoad.forEach(countryConfig => {
            const country = new Country(countryConfig);
            this.countries.set(country.id, country);
        });

        // Establish some trade agreements
        this.establishTradeAgreements();

        console.log(`✅ Initialized ${this.countries.size} countries (config: ${countryCount})`);
    }

    establishTradeAgreements() {
        const countries = Array.from(this.countries.values());
        
        // Continental trade agreements
        const continents = {};
        countries.forEach(country => {
            if (!continents[country.continent]) {
                continents[country.continent] = [];
            }
            continents[country.continent].push(country);
        });

        // Countries on same continent have trade agreements
        Object.values(continents).forEach(continentCountries => {
            continentCountries.forEach(c1 => {
                continentCountries.forEach(c2 => {
                    if (c1.id !== c2.id) {
                        c1.tradeAgreements.add(c2.id);
                    }
                });
            });
        });
    }

    generateCorporations() {
        // Delegated to FirmGenerator module
        return this.firmGenerator.generateCorporations();
    }

    generateFirms() {
        // Delegated to FirmGenerator module
        this.firmGenerator.generateFirms();
        this._rebuildFirmPartitions();
        // Invalidate retailer-by-city cache so it rebuilds on first use
        this.cityRetailDemandManager?.invalidateRetailerCache();
    }

    /**
     * Rebuild pre-partitioned firm arrays.
     * Called once after generateFirms() and whenever firms are added/removed.
     * Avoids O(n) Array.from().filter() on every tick.
     */
    _rebuildFirmPartitions() {
        this.producerFirms = [];
        this.manufacturerFirms = [];
        this.retailerFirms = [];
        this.nonRetailFirms = [];
        this.firms.forEach(firm => {
            if (firm.type === 'MINING' || firm.type === 'LOGGING' || firm.type === 'FARM') {
                this.producerFirms.push(firm);
            } else if (firm.type === 'MANUFACTURING') {
                this.manufacturerFirms.push(firm);
            } else if (firm.type === 'RETAIL') {
                this.retailerFirms.push(firm);
            }
            if (firm.type !== 'RETAIL') {
                this.nonRetailFirms.push(firm);
            }
        });
    }

    ensureProductCoverage() {
        // Delegated to FirmGenerator module
        this.firmGenerator.ensureProductCoverage();
    }

    generateRandomFirm(city, country, corporation = null) {
        // Delegated to FirmGenerator module
        this.firmGenerator.generateRandomFirm(city, country, corporation);
    }

    weightedRandomChoice(items, weights) {
        // Delegated to FirmGenerator module
        return this.firmGenerator.weightedRandomChoice(items, weights);
    }

    /**
     * Wire up ContractManager to all producer firms for production throttling
     * This prevents overproduction when contracts don't exist
     */
    wireContractManagerToFirms() {
        if (!this.purchaseManager?.contractManager) {
            console.warn('ContractManager not available, skipping firm wiring');
            return;
        }

        const contractManager = this.purchaseManager.contractManager;
        let wiredCount = 0;

        this.firms.forEach(firm => {
            // Only producers need contract-based throttling (farms, manufacturers)
            if (firm.firmType === 'FARM' || firm.firmType === 'MANUFACTURING') {
                firm.contractManager = contractManager;
                wiredCount++;
            }
        });

        console.log(`✅ Wired ContractManager to ${wiredCount} producer firms for throttling`);
    }

    /**
     * Auto-create supply contracts for manufacturers
     * Called during initialization after firms are generated
     */
    initializeSupplyContracts() {
        if (!this.config.purchasing?.enableContracts) {
            return;
        }

        const contractManager = this.purchaseManager?.contractManager;
        if (!contractManager) {
            console.warn('ContractManager not available, skipping contract creation');
            return;
        }

        let contractsCreated = 0;
        let noSupplierCount = 0;
        let capacityLimitedCount = 0;
        const supplierSelector = this.purchaseManager.supplierSelector;

        // Get all manufacturing firms with input requirements
        const manufacturers = Array.from(this.firms.values()).filter(firm =>
            firm.type === 'MANUFACTURING' && firm.product?.inputs?.length > 0
        );

        for (const manufacturer of manufacturers) {
            for (const input of manufacturer.product.inputs) {
                const hourlyUsage = input.quantity * (manufacturer.productionLine?.outputPerHour || 10);
                const monthlyNeed = Math.floor(hourlyUsage * 24 * 30);
                const lotSize = getLotSizeForProduct(input.material, this.productRegistry);

                const selection = supplierSelector.selectBest({
                    buyer: manufacturer,
                    productName: input.material,
                    quantity: monthlyNeed,
                    requireInventory: false,
                    forSpotPurchase: false
                });

                if (!selection?.supplier) {
                    noSupplierCount++;
                    continue;
                }

                const contract = contractManager.negotiateAndCreate(
                    manufacturer, selection.supplier, input.material, monthlyNeed,
                    { durationMonths: 12, lotSize, minLots: 2 }
                );
                if (contract) contractsCreated++;
                else capacityLimitedCount++;
            }
        }

        // === RETAIL CONTRACTS ===
        // Delegate retail contract creation to RetailPurchaseManager
        const retailPurchaseManager = this.purchaseManager.retailPurchaseManager;
        if (retailPurchaseManager) {
            const retailers = Array.from(this.firms.values()).filter(firm =>
                firm.type === 'RETAIL' && firm.productInventory?.size > 0
            );

            for (const retailer of retailers) {
                retailPurchaseManager.initializeRetailerContracts(retailer);
            }
        }
    }

    /**
     * Initialize supply contracts for a newly created manufacturing firm.
     * Called by FirmGenerator.registerFirm() after a new manufacturer joins.
     * @param {object} firm - The newly created firm
     */
    initializeContractsForNewFirm(firm) {
        if (firm.type !== 'MANUFACTURING') return;
        const contractManager = this.purchaseManager?.contractManager;
        const supplierSelector = this.purchaseManager?.supplierSelector;
        if (!contractManager || !supplierSelector) return;

        for (const input of (firm.product?.inputs || [])) {
            const hourlyUsage = input.quantity * (firm.productionLine?.outputPerHour || 10);
            const monthlyNeed = Math.floor(hourlyUsage * 24 * 30);
            const lotSize = getLotSizeForProduct(input.material, this.productRegistry);

            const selection = supplierSelector.selectBest({
                buyer: firm,
                productName: input.material,
                quantity: monthlyNeed,
                requireInventory: false,
                forSpotPurchase: false
            });
            if (!selection?.supplier) continue;

            contractManager.negotiateAndCreate(
                firm, selection.supplier, input.material, monthlyNeed,
                { durationMonths: 12, lotSize, minLots: 2 }
            );
        }
    }

    setupIntervals() {
        // Use config timeScale for tick rate (default 1000ms = 1 real second per game hour)
        const tickRate = this.config.simulation?.timeScale?.realSecond ?? 1000;

        this.hourlyInterval = setInterval(() => {
            if (!this.clock.isPaused) {
                for (let i = 0; i < this.speed; i++) {
                    this.clock.tick();
                    this.updateHourly();
                }
                // Save state after each tick cycle for cross-page persistence
                this.saveState();
            }
            this.emit('update');
        }, tickRate);

        // Setup periodic autosave to IndexedDB (every 5 minutes of real time)
        this.autosaveInterval = setInterval(async () => {
            if (!this.clock.isPaused && !SimulationEngine.isResetting) {
                try {
                    await this.autosave();
                } catch (e) {
                    console.warn('Autosave failed:', e);
                }
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    updateHourly() {
        this.dailyTick++;
        if (this.dailyTick >= 24) {
            this.dailyTick = 0;
            this.updateDaily();
        }

        // Process hourly operations for all firms
        this.processFirmOperations();

        // Process pending local deliveries
        this.processLocalDeliveries();

        // Process contract deliveries that have arrived
        if (this.purchaseManager) {
            this.purchaseManager.processArrivedDeliveries();
        }

        // Hourly critical inventory check (for fast-moving goods)
        this.checkCriticalInventoryLevels();

        // Update corporation stats from firms (daily is sufficient)
        if (this.dailyTick === 0) this.updateCorporationStats();

        // Update market history
        this.updateMarketHistory();

        // Finalize transaction log for this hour
        this.transactionLog.finalizeHour(this.clock.getGameTime());

        // Update statistics
        this.updateStatistics();
    }

    checkInventoryLevels() {
        // Full inventory check - runs daily
        this.firms.forEach(firm => {
            if (firm.type === 'MANUFACTURING') {
                this.checkManufacturingInventory(firm);
            } else if (firm.type === 'RETAIL') {
                this.checkRetailInventory(firm);
            }
        });
    }

    /**
     * Hourly check for critically low inventory levels
     * Only triggers urgent restocking for items below the hourly threshold
     */
    checkCriticalInventoryLevels() {
        const invConfig = this.config.inventory;
        const hourlyThresholdPct = invConfig.hourlyCheckThresholdPct || 0.15;

        for (const firm of this.manufacturerFirms) {
            this.checkCriticalManufacturingInventory(firm, hourlyThresholdPct);
        }
        for (const firm of this.retailerFirms) {
            this.checkCriticalRetailInventory(firm, hourlyThresholdPct);
        }
    }

    /**
     * Hourly critical check for manufacturing input materials
     */
    checkCriticalManufacturingInventory(firm, thresholdPct) {
        if (!firm.product || !firm.product.inputs) return;

        const invConfig = this.config.inventory;
        const urgentOrderDays = invConfig.urgentOrderDays || 7;

        firm.product.inputs.forEach(input => {
            const inventory = firm.rawMaterialInventory?.get(input.material);
            if (!inventory) return;

            // Calculate usage
            const hourlyUsage = input.quantity * (firm.productionLine?.outputPerHour || 10);
            const dailyUsage = hourlyUsage * 24;
            const weeklyUsage = dailyUsage * 7;
            const maxStock = weeklyUsage * invConfig.maxStockWeeks;

            // Critical threshold: below X% of max stock
            const criticalThreshold = maxStock * thresholdPct;

            if (inventory.quantity < criticalThreshold) {
                // Urgent restock needed
                const urgentQuantity = Math.floor(dailyUsage * urgentOrderDays);
                if (urgentQuantity <= 0) return;

                // Check affordability
                const product = this.productRegistry.getProductByName(input.material);
                const estimatedCost = urgentQuantity * (product?.basePrice || 100) * 2;
                if (firm.cash < estimatedCost * 0.3) return;

                // Try local purchase only (no global market fallback)
                this.tryLocalPurchase(firm, input.material, urgentQuantity);
            }
        });
    }

    /**
     * Hourly critical check for retail inventory
     * NOTE: Retail stores only purchase through contracts, not spot purchases
     * This method now triggers contract fulfillment via PurchaseManager
     */
    checkCriticalRetailInventory(retailer, thresholdPct) {
        if (!retailer.productInventory || retailer.productInventory.size === 0) return;

        // Retail stores only purchase through contracts
        // Critical inventory needs are handled by the contract system
        // The PurchaseManager.processRetailRestocking() handles contract fulfillment
        if (this.purchaseManager) {
            // Contract fulfillment is already processed hourly by PurchaseManager
            // No spot purchases for retail stores
            return;
        }
    }

    checkManufacturingInventory(firm) {
        if (!firm.product || !firm.product.inputs) return;

        const invConfig = this.config.inventory;

        firm.product.inputs.forEach(input => {
            const inventory = firm.rawMaterialInventory?.get(input.material);
            if (!inventory) return;

            // Calculate thresholds based on production rate
            const hourlyUsage = input.quantity * (firm.productionLine?.outputPerHour || 10);
            const dailyUsage = hourlyUsage * 24;
            const weeklyUsage = dailyUsage * 7;

            // Config-based thresholds
            const reorderThreshold = weeklyUsage * invConfig.reorderThresholdWeeks;
            const criticalThreshold = dailyUsage * (invConfig.criticalThresholdDays || 1);
            const maxStock = weeklyUsage * invConfig.maxStockWeeks;
            const reorderQuantityWeeks = invConfig.reorderQuantityWeeks || 4;
            const urgentOrderDays = invConfig.urgentOrderDays || 7;

            // If below threshold, calculate order quantity
            if (inventory.quantity < reorderThreshold) {
                // Calculate order: cap at reorderQuantityWeeks or fill to max
                const targetStock = Math.min(maxStock, inventory.quantity + weeklyUsage * reorderQuantityWeeks);
                let remainingOrder = Math.floor(Math.max(targetStock - inventory.quantity, weeklyUsage * 2));

                if (remainingOrder <= 0) return;

                // Check if firm can afford the order
                const product = this.productRegistry.getProductByName(input.material);
                const estimatedCost = remainingOrder * (product?.basePrice || 100) * 1.5;
                if (firm.cash < estimatedCost * 0.5) return;

                // Try to buy from local producers only (no global market fallback)
                this.tryLocalPurchase(firm, input.material, remainingOrder);
            }
        });
    }

    /**
     * Check retail inventory levels
     * NOTE: Retail stores only purchase through contracts, not spot purchases
     * Inventory replenishment is handled by the contract system via PurchaseManager
     */
    checkRetailInventory(retailer) {
        if (!retailer.productInventory || retailer.productInventory.size === 0) return;

        // Retail stores only purchase through contracts
        // Inventory needs are fulfilled by PurchaseManager.processRetailRestocking()
        // which triggers contract fulfillment - no spot purchases for retail
        if (this.purchaseManager) {
            // Contract fulfillment is already processed hourly by PurchaseManager
            // No spot purchases for retail stores
            return;
        }
    }

    /**
     * Try to purchase materials from local producers
     * @param {Firm} buyer - The firm buying materials
     * @param {string} materialName - Name of the material to buy
     * @param {number} quantity - Desired quantity to purchase
     * @returns {number} Actual quantity fulfilled (0 if none available)
     */
    tryLocalPurchase(buyer, materialName, quantity) {
        let totalFulfilled = 0;
        let remainingQuantity = quantity;

        // Try to find local producers for this material (use pre-partitioned arrays)
        const allManufacturers = this.manufacturerFirms.length > 0 ? this.manufacturerFirms : Array.from(this.firms.values()).filter(f => f.type === 'MANUFACTURING');
        const primaryProducers = this.producerFirms.length > 0 ? this.producerFirms : Array.from(this.firms.values()).filter(f =>
            f.type === 'MINING' || f.type === 'LOGGING' || f.type === 'FARM'
        );

        // Check if it's a raw material (from primary producers)
        const rawSuppliers = primaryProducers.filter(p => {
            const producesType = p.resourceType || p.timberType || p.cropType || p.livestockType;
            return producesType === materialName && p.inventory && p.inventory.quantity > 0;
        }).sort((a, b) => b.inventory.quantity - a.inventory.quantity); // Sort by stock descending

        // Buy from multiple raw suppliers if needed
        for (const supplier of rawSuppliers) {
            if (remainingQuantity <= 0) break;

            const availableQty = Math.floor(supplier.inventory.quantity * 0.8); // Leave 20% buffer
            if (availableQty <= 0) continue;

            const purchaseQty = Math.min(remainingQuantity, availableQty);
            const fulfilled = this.executeTrade(supplier, buyer, materialName, purchaseQty);

            if (fulfilled > 0) {
                totalFulfilled += fulfilled;
                remainingQuantity -= fulfilled;
            }
        }

        // If still need more, check semi-raw material suppliers
        if (remainingQuantity > 0) {
            const semiRawSuppliers = allManufacturers.filter(m =>
                m.isSemiRawProducer &&
                m.product &&
                m.product.name === materialName &&
                m.finishedGoodsInventory &&
                m.finishedGoodsInventory.quantity > 0
            ).sort((a, b) => b.finishedGoodsInventory.quantity - a.finishedGoodsInventory.quantity);

            for (const supplier of semiRawSuppliers) {
                if (remainingQuantity <= 0) break;

                const availableQty = Math.floor(supplier.finishedGoodsInventory.quantity * 0.8);
                if (availableQty <= 0) continue;

                const purchaseQty = Math.min(remainingQuantity, availableQty);
                const fulfilled = this.executeManufacturerToManufacturerTrade(supplier, buyer, materialName, purchaseQty);

                if (fulfilled > 0) {
                    totalFulfilled += fulfilled;
                    remainingQuantity -= fulfilled;
                }
            }
        }

        return totalFulfilled;
    }

    /**
     * @deprecated Retail stores now only purchase through contracts.
     * This method is no longer used - retail purchasing is handled by
     * PurchaseManager.processRetailRestocking() via the contract system.
     * Kept for backwards compatibility but always returns 0.
     */
    tryLocalRetailPurchase(buyer, productId, productName, quantity) {
        // DEPRECATED: Retail stores only purchase through contracts
        console.warn('tryLocalRetailPurchase is deprecated - retail uses contracts only');
        return 0;

        // Legacy code below - no longer executed
        let totalFulfilled = 0;
        let remainingQuantity = quantity;

        // Find manufacturers that produce this product
        const manufacturers = Array.from(this.firms.values()).filter(f =>
            f.type === 'MANUFACTURING' &&
            f.product?.id === productId &&
            f.finishedGoodsInventory &&
            f.finishedGoodsInventory.quantity > 0
        ).sort((a, b) => b.finishedGoodsInventory.quantity - a.finishedGoodsInventory.quantity);

        for (const manufacturer of manufacturers) {
            if (remainingQuantity <= 0) break;

            const availableQty = Math.floor(manufacturer.finishedGoodsInventory.quantity * 0.7); // Leave 30% for other buyers
            if (availableQty <= 0) continue;

            const purchaseQty = Math.min(remainingQuantity, availableQty);
            const fulfilled = this.executeRetailPurchase(manufacturer, buyer, productId, productName, purchaseQty);

            if (fulfilled > 0) {
                totalFulfilled += fulfilled;
                remainingQuantity -= fulfilled;
            }
        }

        return totalFulfilled;
    }

    // Global Market methods removed - local suppliers only

    updateCorporationStats() {
        // Reset and recalculate corporation stats from their firms
        this.corporations.forEach(corp => {
            // Support both legacy objects and new Corporation class
            if (typeof corp.updateStats === 'function') {
                // New Corporation class - use its method
                corp.updateStats();
            } else {
                // Legacy corporation object - manual update
                corp.employees = 0;
                corp.revenue = 0;
                corp.monthlyRevenue = 0;
                corp.profit = 0;
                corp.monthlyProfit = 0;
                corp.cash = 0;
                corp.expenses = 0;
                corp.monthlyExpenses = 0;
            }
        });

        // For legacy corporations, aggregate from firms
        if (!this.config.corporations?.organicGrowth) {
            this.firms.forEach(firm => {
                const corp = this.corporationsById.get(firm.corporationId);
                if (corp && typeof corp.updateStats !== 'function') {
                    corp.employees += firm.totalEmployees || 0;
                    corp.revenue += firm.revenue || 0;
                    corp.monthlyRevenue += firm.monthlyRevenue || 0;
                    corp.profit += firm.profit || 0;
                    corp.monthlyProfit += (firm.monthlyRevenue || 0) - (firm.monthlyExpenses || 0);
                    corp.cash += firm.cash || 0;
                    corp.expenses += firm.expenses || 0;
                    corp.monthlyExpenses += firm.monthlyExpenses || 0;
                }
            });
        }
    }

    processFirmOperations() {
        const currentHour = this.clock.hour;

        // Step 1: Non-retail firms produce (use pre-partitioned array — avoids Map iteration + type check)
        for (const firm of this.nonRetailFirms) {
            try {
                firm.produceHourly();
            } catch (error) {
                console.error(`Error in production for firm ${firm.id}:`, error);
            }
        }

        // Step 2 & 3: Process purchasing and supply chain
        this.purchaseManager.processPurchasing(currentHour);

        // Debug: Log supply chain stats every 24 hours (once per game day)
        if (this.dailyTick === 0) {
            this.logSupplyChainStats();
        }
    }

    logSupplyChainStats() {
        const stats = {
            mining: { count: 0, totalInventory: 0 },
            logging: { count: 0, totalInventory: 0 },
            farm: { count: 0, totalInventory: 0 },
            semiRaw: { count: 0, totalInventory: 0 },
            manufacturing: { count: 0, totalInventory: 0 },
            retail: { count: 0, totalInventory: 0 }
        };

        this.firms.forEach(firm => {
            if (firm.type === 'MINING') {
                stats.mining.count++;
                stats.mining.totalInventory += firm.inventory?.quantity || 0;
            } else if (firm.type === 'LOGGING') {
                stats.logging.count++;
                stats.logging.totalInventory += firm.inventory?.quantity || 0;
            } else if (firm.type === 'FARM') {
                stats.farm.count++;
                stats.farm.totalInventory += firm.inventory?.quantity || 0;
            } else if (firm.type === 'MANUFACTURING') {
                if (firm.isSemiRawProducer) {
                    stats.semiRaw.count++;
                    stats.semiRaw.totalInventory += firm.finishedGoodsInventory?.quantity || 0;
                } else {
                    stats.manufacturing.count++;
                    stats.manufacturing.totalInventory += firm.finishedGoodsInventory?.quantity || 0;
                }
            } else if (firm.type === 'RETAIL') {
                stats.retail.count++;
                let retailInv = 0;
                firm.productInventory?.forEach(inv => { retailInv += inv.quantity; });
                stats.retail.totalInventory += retailInv;
            }
        });

        const dateStr = `Year ${this.clock.year}, Month ${this.clock.month}, Day ${this.clock.day}`;
        const nameStr = this.gameName ? `[${this.gameName}] ` : '';
        console.log(`📊 ${nameStr}Daily Supply Chain Stats (${dateStr}):`, stats);
    }

    /**
     * Execute trade between manufacturers (SEMI_RAW to MANUFACTURED)
     * Delegated to TradeExecutor module
     */
    executeManufacturerToManufacturerTrade(seller, buyer, materialName, requestedQuantity) {
        return this.tradeExecutor.executeManufacturerToManufacturerTrade(seller, buyer, materialName, requestedQuantity);
    }

    /**
     * Execute a trade from primary producer to manufacturer (RAW to SEMI_RAW)
     * Delegated to TradeExecutor module
     */
    executeTrade(seller, buyer, materialName, requestedQuantity) {
        return this.tradeExecutor.executeTrade(seller, buyer, materialName, requestedQuantity);
    }

    /**
     * Execute a retail purchase from manufacturer
     * Delegated to TradeExecutor module
     */
    executeRetailPurchase(manufacturer, retailer, productIdParam, productNameParam, quantity) {
        return this.tradeExecutor.executeRetailPurchase(manufacturer, retailer, productIdParam, productNameParam, quantity);
    }

    /**
     * Create a pending local delivery for transport time simulation
     * Delegated to DeliveryManager module
     */
    createPendingLocalDelivery(deliveryData) {
        return this.deliveryManager.createPendingDelivery(deliveryData);
    }

    /**
     * Process pending local deliveries - called each hour
     * Delegated to DeliveryManager module
     */
    processLocalDeliveries() {
        return this.deliveryManager.processDeliveries();
    }

    /**
     * Complete a local delivery - transfer inventory to buyer
     * Delegated to DeliveryManager module
     */
    completeLocalDelivery(delivery) {
        return this.deliveryManager.completeDelivery(delivery);
    }

    updateMarketHistory() {
        // Include B2B transactions + retail consumer sales
        let retailSales = 0;
        this.firms.forEach(firm => {
            if (firm.type === 'RETAIL' && firm.averageTransactionValue) {
                retailSales += firm.averageTransactionValue;
            }
        });

        this.marketHistory.push({
            hour: this.clock.hour,
            transactions: this.hourlyTransactions.count,
            value: this.hourlyTransactions.value + retailSales
        });

        // Reset hourly counter
        this.hourlyTransactions = { count: 0, value: 0 };

        if (this.marketHistory.length > 24) {
            this.marketHistory.shift();
        }
    }

    updateStatistics() {
        this.stats.totalPopulation = this.cityManager.getTotalPopulation();
        this.stats.totalGDP = this.cityManager.getTotalPurchasingPower();
        this.stats.totalEmployed = this.cityManager.getTotalEmployed();
        this.stats.avgSalaryLevel = this.cityManager.getAverageSalaryLevel();
        this.stats.totalFirms = this.firms.size;
        this.stats.totalProducts = this.productRegistry.getAllProducts().length;
    }

    /**
     * Process lot expiration for all perishable goods
     * Called daily to remove expired lots from inventory
     */
    processLotExpiration() {
        const gameTime = this.clock.getGameTime();
        const currentDay = gameTime.day + (gameTime.month - 1) * 30 + (gameTime.year - 2025) * 365;

        // Process expiration in the global lot registry
        const expiredLots = this.lotRegistry.processAllExpirations(currentDay);

        // Also process expiration in each firm's lot inventory
        this.firms.forEach(firm => {
            if (firm.lotInventory) {
                const firmExpired = firm.lotInventory.processExpiration(currentDay);

                // Log significant losses
                if (firmExpired.length > 0) {
                    let totalLoss = 0;
                    firmExpired.forEach(lot => {
                        const product = this.productRegistry.getProductByName(lot.productName);
                        if (product) {
                            totalLoss += lot.quantity * product.basePrice;
                        }
                    });

                    if (totalLoss > 0) {
                        console.log(`📦 ${firm.getDisplayName?.() || firm.id}: ${firmExpired.length} lot(s) expired (loss: $${totalLoss.toFixed(2)})`);
                    }
                }
            }
        });

        if (expiredLots.length > 0) {
            console.log(`🗑️ Daily: ${expiredLots.length} lots expired globally`);
        }
    }

    updateDaily() {
        this.monthlyTick++;

        // Process lot expiration for perishable goods
        this.processLotExpiration();

        // Daily inventory restocking - check all firms and place bulk orders
        this.checkInventoryLevels();

        // Day 1 (tick 1): Pay first half of wages
        if (this.monthlyTick === 1) {
            this.firms.forEach(firm => {
                try {
                    firm.payWages();
                } catch (error) {
                    console.error(`Error paying wages for firm ${firm.id}:`, error);
                }
            });
            if (DEBUG_SIMULATION) console.log(`💰 Day 1: Paid first payroll to all firms`);
        }

        // Day 15 (tick 15): Pay second half of wages
        if (this.monthlyTick === 15) {
            this.firms.forEach(firm => {
                try {
                    firm.payWages();
                } catch (error) {
                    console.error(`Error paying wages for firm ${firm.id}:`, error);
                }
            });
            if (DEBUG_SIMULATION) console.log(`💰 Day 15: Paid second payroll to all firms`);
        }

        // Day 30 (tick 30): Pay end-of-month expenses
        if (this.monthlyTick >= 30) {
            this.firms.forEach(firm => {
                try {
                    firm.payEndOfMonthExpenses();
                } catch (error) {
                    console.error(`Error paying end-of-month expenses for firm ${firm.id}:`, error);
                }
            });
            if (DEBUG_SIMULATION) console.log(`📋 Day 30: Paid operating expenses and loans for all firms`);

            this.monthlyTick = 0;
            this.updateMonthly();
        }

        // Finalize transaction log for this day
        this.transactionLog.finalizeDay(this.clock.getGameTime());

        // 5% chance of random event (using seeded RNG for determinism)
        if (this.random() < 0.05) {
            this.generateRandomEvent();
        }
    }

    updateMonthly() {
        if (DEBUG_SIMULATION) console.log(`📅 Month ${this.clock.month}, Year ${this.clock.year}`);

        // Conduct monthly planning for organic growth
        if (this.config.corporations?.organicGrowth && this.corporationManager) {
            const gameTime = this.clock.getGameTime();
            const meetingResults = this.corporationManager.conductMonthlyPlanning(gameTime);
            if (DEBUG_SIMULATION) console.log(`📊 Economic Phase: ${meetingResults.economicPhase}`);
        }

        // Update all cities
        this.cityManager.updateAllCities('monthly', this.clock.getGameTime());

        // Update all countries
        this.countries.forEach(country => {
            country.updateMonthly();
        });

        // Reset corporation stats before aggregating
        this.corporations.forEach(corp => {
            corp.employees = 0;
            corp.revenue = 0;
            corp.profit = 0;
            corp.cash = 0;
            corp.expenses = 0;
        });

        // Update all firms and aggregate to corporations
        const snapshotMonth = this.clock.month;
        const snapshotYear  = this.clock.year;
        this.firms.forEach(firm => {
            try {
                // Capture monthly values BEFORE updateMonthly resets them
                const firmMonthlyRevenue = firm.monthlyRevenue || 0;
                const firmMonthlyExpenses = firm.monthlyExpenses || 0;

                if (typeof firm.captureMonthlySnapshot === 'function') {
                    firm.captureMonthlySnapshot(snapshotMonth, snapshotYear);
                }

                firm.updateMonthly();

                // Update corporation stats using captured values (O(1) lookup)
                const corp = this.corporationsById.get(firm.corporationId) || this.corporationsById.get(1);
                if (corp) {
                    corp.employees += firm.totalEmployees;
                    corp.revenue += firmMonthlyRevenue;
                    corp.profit += firm.monthlyProfit;
                    corp.cash += firm.cash || 0;
                    corp.expenses += firmMonthlyExpenses;
                }
            } catch (error) {
                console.error(`Error updating firm ${firm.id}:`, error);
            }
        });

        // Capture corporation snapshots AFTER firm aggregation, BEFORE next-month reset
        this.corporations.forEach(corp => {
            if (typeof corp.captureMonthlySnapshot === 'function') {
                corp.captureMonthlySnapshot(snapshotMonth, snapshotYear);
            }
        });

        // Update commodity prices based on contracted demand vs production capacity
        this._updateCommodityPrices();

        // Generate monthly reports (without resetting stats)
        this.generateMonthlyReport();

        // Check for yearly update
        this.yearlyTick++;
        if (this.yearlyTick >= 12) {
            this.yearlyTick = 0;
            this.updateYearly();
        }
    }

    generateMonthlyReport() {
        const totalRevenue = Array.from(this.firms.values())
            .reduce((sum, firm) => sum + firm.monthlyRevenue, 0);
        
        const totalProfit = Array.from(this.firms.values())
            .reduce((sum, firm) => sum + firm.monthlyProfit, 0);

        this.addEvent('info', 'Monthly Report',
            `Total Revenue: ${this.formatMoney(totalRevenue)}, Total Profit: ${this.formatMoney(totalProfit)}`);
    }

    /**
     * Update commodity prices based on contracted demand vs total production capacity.
     * Called monthly. Sets product.currentPrice which INDEXED contracts use for delivery pricing.
     */
    _updateCommodityPrices() {
        if (!this.purchaseManager?.contractManager) return;
        const contracts = this.purchaseManager.contractManager.contracts;
        const registry  = this.productRegistry;

        // Aggregate contracted demand and production capacity per product
        const demand = new Map();  // productName -> monthly contracted volume
        const supply = new Map();  // productName -> monthly production capacity

        for (const contract of contracts.values()) {
            if (contract.status !== 'active') continue;
            const monthlyVol = contract.periodType === 'monthly' ? contract.volumePerPeriod
                             : contract.periodType === 'weekly'  ? contract.volumePerPeriod * 4
                             : contract.volumePerPeriod * 30;
            demand.set(contract.product, (demand.get(contract.product) || 0) + monthlyVol);
        }

        this.firms.forEach(firm => {
            const productName = firm.product?.name || firm.resourceType || firm.timberType
                              || firm.cropType || firm.livestockType;
            if (!productName) return;
            const monthlyCapacity = (firm.productionLine?.outputPerHour || firm.extractionRate
                                   || firm.harvestRate || firm.productionRate || 0) * 720;
            supply.set(productName, (supply.get(productName) || 0) + monthlyCapacity);
        });

        // Update each product's currentPrice
        for (const [name, demandVol] of demand) {
            const product = registry.getProductByName(name);
            if (!product) continue;
            const supplyVol = supply.get(name) || 1;
            // Price multiplier: 1.0 at equilibrium, up to 3x when oversold, down to 0.5x when oversupplied
            const ratio = demandVol / supplyVol;
            const multiplier = Math.min(3.0, Math.max(0.5, 0.5 + ratio));
            // Smooth: blend 80% old price, 20% new target (prevents instant spikes)
            const targetPrice = product.basePrice * multiplier;
            product.currentPrice = product.currentPrice * 0.8 + targetPrice * 0.2;
        }
    }

    updateYearly() {
        if (DEBUG_SIMULATION) console.log(`🎆 Year ${this.clock.year} complete`);

        // Update cities
        this.cityManager.updateAllCities('yearly', this.clock.getGameTime());

        // Update countries
        this.countries.forEach(country => {
            country.updateMonthly(); // Countries use monthly update
        });

        this.addEvent('success', 'Annual Report', 
            `Year ${this.clock.year} complete - GDP: ${this.formatMoney(this.stats.totalGDP)}`);
    }

    generateRandomEvent() {
        const events = [
            { type: 'info', title: 'Market Update', message: 'Trading volume increased across all markets' },
            { type: 'success', title: 'Economic Growth', message: 'GDP growth exceeded expectations this quarter' },
            { type: 'warning', title: 'Supply Chain', message: 'Minor disruptions reported in logistics networks' },
            { type: 'info', title: 'New Technology', message: 'Manufacturing efficiency improvements announced' }
        ];

        const event = events[Math.floor(this.random() * events.length)];
        this.addEvent(event.type, event.title, event.message);
    }

    addEvent(type, title, message) {
        this.events.unshift({
            type,
            title,
            message,
            time: this.clock.getFormatted()
        });
        if (this.events.length > 50) this.events.pop();
    }

    formatMoney(value) {
        if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
        if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
        return `$${Math.round(value).toLocaleString()}`;
    }

    pause() {
        this.clock.pause();
        this.addEvent('warning', 'Simulation Paused', 'Game time has been paused');
    }

    resume() {
        this.clock.resume();
        this.addEvent('info', 'Simulation Resumed', 'Game time is running');
    }

    setSpeed(multiplier) {
        // Clamp to positive integer (min 1, max 168 for 1W speed)
        this.speed = Math.max(1, Math.min(168, Math.floor(multiplier) || 1));
        this.addEvent('info', 'Speed Changed', `Simulation speed set to ${this.speed}x`);
    }

    emit(event) {
        window.dispatchEvent(new CustomEvent(`simulation-${event}`, {
            detail: this.getState()
        }));
    }

    getState() {
        return {
            clock: this.clock.getGameTime(),
            elapsed: this.clock.getElapsed(),
            countries: Array.from(this.countries.values()),
            cities: this.cities,
            firms: Array.from(this.firms.values()).slice(0, 20), // First 20 for performance
            corporations: this.corporations,
            products: this.productRegistry.getAllProducts(),
            events: this.events,
            marketHistory: this.marketHistory,
            stats: this.stats,
            config: this.config,
            transactionLog: {
                summary: this.transactionLog.getSummary(),
                recentTransactions: this.transactionLog.getRecentTransactions(20),
                hourlyStats: this.transactionLog.getHourlyStats(24)
            }
        };
    }

    // Helper methods for UI
    getFirmsByType(type) {
        return Array.from(this.firms.values()).filter(f => f.type === type);
    }

    getProductsByTier(tier) {
        return this.productRegistry.getProductsByTier(tier);
    }

    getCountryById(id) {
        return this.countries.get(id);
    }

    // Global Market REMOVED - local suppliers only

    // Configuration methods
    setInventoryConfig(config) {
        this.config.inventory = { ...this.config.inventory, ...config };
        this.addEvent('info', 'Configuration', 'Inventory settings updated');
    }

    getConfig() {
        return this.config;
    }

    // Transaction Log methods
    getTransactionLog() {
        return this.transactionLog;
    }

    getRecentTransactions(count = 50) {
        return this.transactionLog.getRecentTransactions(count);
    }

    getTransactionsByType(type, count = 50) {
        return this.transactionLog.getTransactionsByType(type, count);
    }

    getTransactionsByFirm(firmId, count = 50) {
        return this.transactionLog.getTransactionsByFirm(firmId, count);
    }

    getTransactionsByCity(cityName, count = 50) {
        return this.transactionLog.getTransactionsByCity(cityName, count);
    }

    getTransactionStats() {
        return this.transactionLog.getStats();
    }

    getTransactionSummary() {
        return this.transactionLog.getSummary();
    }

    /**
     * Get city product coverage statistics
     * Shows how many retailers sell each product in each city
     * @param {string} cityId - Optional city ID to filter
     * @returns {Object} Coverage statistics
     */
    getCityProductCoverage(cityId = null) {
        const result = {};

        const cities = cityId
            ? [cityId]
            : Array.from(this.cityProductRetailers.keys());

        for (const cId of cities) {
            const cityProductMap = this.cityProductRetailers.get(cId);
            if (!cityProductMap) continue;

            const cityName = this.cities?.find(c => c.id === cId)?.name || cId;
            result[cityName] = {};

            for (const [productId, retailers] of cityProductMap) {
                const product = this.productRegistry.getProduct(productId);
                const productName = product?.name || `Product ${productId}`;
                result[cityName][productName] = {
                    retailerCount: retailers.size,
                    retailers: Array.from(retailers)
                };
            }
        }

        return result;
    }

    /**
     * Get products with too many or too few retailers in a city
     * Useful for diagnosing supply/demand imbalances
     * @param {string} cityId - City ID to analyze
     * @returns {Object} Analysis results
     */
    analyzeRetailProductDistribution(cityId) {
        const maxRetailers = this.config.retail?.maxRetailersPerProductPerCity ?? 3;
        const cityProductMap = this.cityProductRetailers.get(cityId);

        if (!cityProductMap) {
            return { error: 'City not found or no retailers' };
        }

        const saturated = [];
        const undersupplied = [];
        const balanced = [];

        for (const [productId, retailers] of cityProductMap) {
            const product = this.productRegistry.getProduct(productId);
            const productName = product?.name || `Product ${productId}`;
            const count = retailers.size;

            if (count >= maxRetailers) {
                saturated.push({ productName, count, maxAllowed: maxRetailers });
            } else if (count === 1) {
                undersupplied.push({ productName, count, minRecommended: 2 });
            } else {
                balanced.push({ productName, count });
            }
        }

        return {
            cityId,
            maxRetailersPerProduct: maxRetailers,
            saturated,
            undersupplied,
            balanced,
            summary: {
                totalProducts: cityProductMap.size,
                saturatedCount: saturated.length,
                undersuppliedCount: undersupplied.length,
                balancedCount: balanced.length
            }
        };
    }

    getPendingGlobalOrders() {
        return this.transactionLog.getPendingGlobalOrders();
    }

    // Product Cost Calculator methods
    getCostCalculator() {
        return this.costCalculator;
    }

    calculateProductCost(productNameOrId, options = {}) {
        if (!this.costCalculator) return null;
        return this.costCalculator.calculateCost(productNameOrId, options);
    }

    getProductCostAnalysis(options = {}) {
        if (!this.costCalculator) return [];
        return this.costCalculator.analyzeAllProducts(options);
    }

    getSuggestedPrices(options = {}) {
        if (!this.costCalculator) return new Map();
        return this.costCalculator.getSuggestedPrices(options);
    }

    getProductCostReport(productNameOrId, options = {}) {
        if (!this.costCalculator) return 'Cost calculator not initialized';
        return this.costCalculator.generateReport(productNameOrId, options);
    }

    getBalanceReport(options = {}) {
        if (!this.costCalculator) return 'Cost calculator not initialized';
        return this.costCalculator.generateBalanceReport(options);
    }

    // ============================================
    // Corporation and Organic Growth Methods
    // ============================================

    /**
     * Get organic growth status
     */
    getOrganicGrowthStatus() {
        if (!this.corporationManager) {
            return { enabled: false };
        }

        return {
            enabled: this.config.corporations?.organicGrowth ?? false,
            economicPhase: this.corporationManager.economicPhase,
            monthsElapsed: this.corporationManager.monthsElapsed,
            totalCorporations: this.corporationManager.corporations.size,
            pendingFirmCreations: this.corporationManager.pendingFirmCreations.length
        };
    }

    /**
     * Get corporation summary for UI
     */
    getCorporationSummary() {
        const corporations = this.corporationManager?.getAllCorporations() || this.corporations;

        return corporations.map(corp => ({
            id: corp.id,
            name: corp.name,
            abbreviation: corp.abbreviation,
            type: corp.type,
            primaryTier: corp.getPrimaryTier?.() || 'UNKNOWN',
            firmCount: corp.firms?.length || corp.facilities?.length || 0,
            employees: corp.employees || 0,
            capital: corp.capital || 0,
            phase: corp.goals?.phase || 0
        }));
    }

    /**
     * Manually trigger board meetings (for testing)
     */
    triggerBoardMeetings() {
        if (!this.config.corporations?.organicGrowth || !this.corporationManager) {
            console.warn('Board meetings only available with organic growth enabled');
            return null;
        }

        const gameTime = this.clock.getGameTime();
        return this.corporationManager.conductMonthlyPlanning(gameTime);
    }

    // ============================================
    // State Persistence for Cross-Page Navigation
    // ============================================

    static GAME_STATE_KEY = 'gameState';
    static isResetting = false;  // Flag to prevent saving during reset

    /**
     * Save full game state to sessionStorage
     */
    saveState() {
        // Don't save if we're in the middle of a reset
        if (SimulationEngine.isResetting) return;

        try {
            const state = {
                version: 1,
                savedAt: Date.now(),

                // Clock (totalHours is computed from these, don't save it)
                clock: {
                    hour: this.clock.hour,
                    day: this.clock.day,
                    month: this.clock.month,
                    year: this.clock.year,
                    isPaused: this.clock.isPaused
                },

                // Simulation control
                running: this.running,
                timeScale: this.timeScale,

                // Firm states (keyed by firm ID)
                firms: {},

                // City states (keyed by city ID)
                cities: {},

                // Contracts
                contracts: [],
                pendingDeliveries: [],

                // Transaction log (recent entries only to save space)
                recentTransactions: this.transactionLog?.transactions?.slice(-100) || [],

                // Corporation Manager state (organic growth)
                corporationManager: null
            };

            // Serialize corporation manager state (organic growth)
            if (this.config.corporations?.organicGrowth && this.corporationManager) {
                // Serialize pendingFirmCreations with city/country IDs instead of object refs
                const serializedPendingCreations = this.corporationManager.pendingFirmCreations.map(project => ({
                    ...project,
                    cityId: project.city?.id || null,
                    countryName: project.country?.name || null,
                    city: undefined,  // Don't serialize full objects
                    country: undefined
                }));

                state.corporationManager = {
                    monthsElapsed: this.corporationManager.monthsElapsed,
                    economicPhase: this.corporationManager.economicPhase,
                    pendingFirmCreations: serializedPendingCreations,
                    corporations: {}
                };

                for (const [id, corp] of this.corporationManager.corporations) {
                    if (corp.getSerializableState) {
                        state.corporationManager.corporations[id] = corp.getSerializableState();
                    }
                }
            }

            // Serialize firms
            for (const [id, firm] of this.firms) {
                if (firm.getSerializableState) {
                    state.firms[id] = firm.getSerializableState();
                }
            }

            // Serialize cities
            const cities = this.cityManager?.getAllCities() || [];
            for (const city of cities) {
                if (city.getSerializableState) {
                    state.cities[city.id] = city.getSerializableState();
                }
            }

            // Serialize contracts
            const contractManager = this.purchaseManager?.contractManager;
            if (contractManager) {
                for (const contract of contractManager.contracts.values()) {
                    state.contracts.push(contract.toJSON());
                }
                state.pendingDeliveries = contractManager.pendingDeliveries || [];
            }

            // Debug: Try to identify circular reference source
            try {
                JSON.stringify(state.clock);
            } catch (e) { console.error('Circular ref in: clock'); }
            try {
                JSON.stringify(state.firms);
            } catch (e) { console.error('Circular ref in: firms'); }
            try {
                JSON.stringify(state.cities);
            } catch (e) { console.error('Circular ref in: cities'); }
            try {
                JSON.stringify(state.contracts);
            } catch (e) { console.error('Circular ref in: contracts'); }
            try {
                JSON.stringify(state.pendingDeliveries);
            } catch (e) { console.error('Circular ref in: pendingDeliveries'); }
            try {
                JSON.stringify(state.recentTransactions);
            } catch (e) { console.error('Circular ref in: recentTransactions'); }
            try {
                JSON.stringify(state.corporationManager);
            } catch (e) { console.error('Circular ref in: corporationManager'); }

            sessionStorage.setItem(SimulationEngine.GAME_STATE_KEY, JSON.stringify(state));
            // Debug log (uncomment if needed)
            // console.log(`💾 Saved state: ${Object.keys(state.cities).length} cities, ${Object.keys(state.firms).length} firms`);
        } catch (e) {
            console.warn('Failed to save game state:', e);
        }
    }

    /**
     * Restore full game state from sessionStorage
     * @returns {boolean} true if state was restored
     */
    restoreState() {
        const saved = sessionStorage.getItem(SimulationEngine.GAME_STATE_KEY);
        if (!saved) return false;

        try {
            const state = JSON.parse(saved);

            // Restore clock (totalHours is computed automatically from these)
            if (state.clock && this.clock) {
                this.clock.hour = state.clock.hour;
                this.clock.day = state.clock.day;
                this.clock.month = state.clock.month;
                this.clock.year = state.clock.year;
                this.clock.isPaused = state.clock.isPaused ?? false;

                // Sync tick counters with restored clock to prevent delayed monthly updates
                this.dailyTick = state.clock.hour;
                this.monthlyTick = state.clock.day;
            }

            // Restore control state (but don't auto-start, let shared.js handle that)
            this.timeScale = state.timeScale || 1;

            // Restore firm states
            // In organic growth mode, firms may not exist yet - we need to recreate them
            if (state.firms) {
                let firmsRestored = 0;
                const totalFirms = Object.keys(state.firms).length;

                for (const [id, firmState] of Object.entries(state.firms)) {
                    let firm = this.firms.get(id);

                    // If firm doesn't exist (organic growth mode), try to recreate it
                    if (!firm && firmState.type && firmState.cityId) {
                        firm = this.recreateFirmFromState(id, firmState);
                    }

                    if (firm && firm.restoreState) {
                        firm.restoreState(firmState);
                        firmsRestored++;
                    }
                }

                console.log(`   - Firms: ${firmsRestored}/${totalFirms} restored`);
                this._rebuildFirmPartitions();
                this.cityRetailDemandManager?.invalidateRetailerCache();
            }

            // Restore city states
            if (state.cities) {
                const cities = this.cityManager?.getAllCities() || [];
                console.log(`📍 Restoring state for ${cities.length} cities...`);
                for (const city of cities) {
                    const cityState = state.cities[city.id];
                    if (cityState && city.restoreState) {
                        console.log(`   ${city.name} before restore: (${city.coordinates.x.toFixed(0)}, ${city.coordinates.y.toFixed(0)}), saved coords: ${JSON.stringify(cityState.coordinates)}`);
                        city.restoreState(cityState);
                        console.log(`   ${city.name} after restore: (${city.coordinates.x.toFixed(0)}, ${city.coordinates.y.toFixed(0)})`);
                    }
                }
            }

            // Restore contracts
            const contractManager = this.purchaseManager?.contractManager;
            if (contractManager && state.contracts) {
                contractManager.contracts.clear();
                for (const contractData of state.contracts) {
                    const contract = Contract.fromJSON(contractData);
                    contractManager.contracts.set(contract.id, contract);
                }
                // Rebuild indices so getContractsForFirm works correctly
                contractManager.rebuildIndices();
                contractManager.pendingDeliveries = state.pendingDeliveries || [];
            }

            // Restore transaction log
            if (state.recentTransactions && this.transactionLog) {
                this.transactionLog.transactions = state.recentTransactions;
            }

            // Restore corporation manager state (organic growth)
            if (state.corporationManager && this.corporationManager) {
                this.corporationManager.monthsElapsed = state.corporationManager.monthsElapsed || 0;
                this.corporationManager.economicPhase = state.corporationManager.economicPhase || 'FOUNDATION';

                // Restore pendingFirmCreations with city/country references reconstituted
                const restoredPendingCreations = (state.corporationManager.pendingFirmCreations || []).map(project => {
                    const restored = { ...project };
                    // Reconstitute city reference from cityId
                    if (project.cityId && this.cityManager) {
                        restored.city = this.cityManager.getCityById(project.cityId);
                        restored.country = restored.city?.country || null;
                    }
                    return restored;
                });
                this.corporationManager.pendingFirmCreations = restoredPendingCreations;

                // Restore corporation states
                if (state.corporationManager.corporations) {
                    for (const [id, corpState] of Object.entries(state.corporationManager.corporations)) {
                        const corp = this.corporationManager.corporations.get(id);
                        if (corp && corp.restoreState) {
                            corp.restoreState(corpState);
                        }
                    }
                }
            }

            // Count how many were actually restored
            let citiesRestored = 0;
            let firmsRestored = 0;
            const cities = this.cityManager?.getAllCities() || [];
            for (const city of cities) {
                if (state.cities[city.id]) citiesRestored++;
            }
            for (const [id, firmState] of Object.entries(state.firms)) {
                if (this.firms.has(id)) firmsRestored++;
            }

            console.log(`♻️ Restored game state: Day ${this.clock.day}, Hour ${this.clock.hour}`);
            console.log(`   - Cities: ${citiesRestored}/${cities.length} restored`);
            console.log(`   - Firms: ${firmsRestored}/${Object.keys(state.firms).length} restored`);
            return true;
        } catch (e) {
            console.warn('Failed to restore game state:', e);
            sessionStorage.removeItem(SimulationEngine.GAME_STATE_KEY);
            return false;
        }
    }

    /**
     * Check if there is saved state available (sync check for sessionStorage)
     * @returns {boolean}
     */
    hasSavedState() {
        return sessionStorage.getItem(SimulationEngine.GAME_STATE_KEY) !== null;
    }

    /**
     * Clear saved state (both sessionStorage and optionally IndexedDB)
     */
    clearSavedState() {
        sessionStorage.removeItem(SimulationEngine.GAME_STATE_KEY);
    }

    // ============================================
    // IndexedDB Persistent Storage Methods
    // ============================================

    /**
     * Get the current game state as a serializable object
     * @returns {Object} Serialized game state
     */
    getSerializableState() {
        const state = {
            version: 1,
            savedAt: Date.now(),
            clock: {
                hour: this.clock.hour,
                day: this.clock.day,
                month: this.clock.month,
                year: this.clock.year,
                isPaused: this.clock.isPaused
            },
            running: this.running,
            timeScale: this.timeScale,
            firms: {},
            cities: {},
            contracts: [],
            pendingDeliveries: [],
            recentTransactions: this.transactionLog?.transactions?.slice(-100) || [],
            corporationManager: null
        };

        // Serialize corporation manager state
        if (this.config.corporations?.organicGrowth && this.corporationManager) {
            const serializedPendingCreations = this.corporationManager.pendingFirmCreations.map(project => ({
                ...project,
                cityId: project.city?.id || null,
                countryName: project.country?.name || null,
                city: undefined,
                country: undefined
            }));

            state.corporationManager = {
                monthsElapsed: this.corporationManager.monthsElapsed,
                economicPhase: this.corporationManager.economicPhase,
                pendingFirmCreations: serializedPendingCreations,
                corporations: {}
            };

            for (const [id, corp] of this.corporationManager.corporations) {
                if (corp.getSerializableState) {
                    state.corporationManager.corporations[id] = corp.getSerializableState();
                }
            }
        }

        // Serialize firms
        for (const [id, firm] of this.firms) {
            if (firm.getSerializableState) {
                state.firms[id] = firm.getSerializableState();
            }
        }

        // Serialize cities
        const cities = this.cityManager?.getAllCities() || [];
        for (const city of cities) {
            if (city.getSerializableState) {
                state.cities[city.id] = city.getSerializableState();
            }
        }

        // Serialize contracts
        const contractManager = this.purchaseManager?.contractManager;
        if (contractManager) {
            for (const contract of contractManager.contracts.values()) {
                state.contracts.push(contract.toJSON());
            }
            state.pendingDeliveries = contractManager.pendingDeliveries || [];
        }

        return state;
    }

    /**
     * Save game to IndexedDB with a named slot
     * @param {string} slot - Save slot name (e.g., 'save1', 'quicksave')
     * @returns {Promise<string>} Save ID
     */
    async saveToSlot(slot = 'quicksave') {
        const state = this.getSerializableState();
        return await gameStorage.saveGame(slot, state, { isAutosave: false });
    }

    /**
     * Autosave to IndexedDB
     * @returns {Promise<string>} Save ID
     */
    async autosave() {
        const state = this.getSerializableState();
        return await gameStorage.saveGame('autosave', state, { isAutosave: true, maxAutosaves: 5 });
    }

    /**
     * Load game from IndexedDB slot
     * @param {string} slotOrId - Slot name or save ID
     * @returns {Promise<boolean>} Whether state was restored
     */
    async loadFromSlot(slotOrId) {
        const state = await gameStorage.loadGame(slotOrId);
        if (!state) {
            console.warn(`No save found for: ${slotOrId}`);
            return false;
        }

        return this.applyState(state);
    }

    /**
     * Load the most recent save from IndexedDB
     * @returns {Promise<boolean>} Whether state was restored
     */
    async loadLatestSave() {
        const save = await gameStorage.getLatestSave();
        if (!save) {
            console.log('No saves found in IndexedDB');
            return false;
        }

        console.log(`📂 Loading save from ${new Date(save.savedAt).toLocaleString()}`);
        return this.applyState(save.state);
    }

    /**
     * Apply a state object to the simulation
     * @param {Object} state - State to apply
     * @returns {boolean} Whether state was applied
     */
    applyState(state) {
        try {
            // Restore clock
            if (state.clock && this.clock) {
                this.clock.hour = state.clock.hour;
                this.clock.day = state.clock.day;
                this.clock.month = state.clock.month;
                this.clock.year = state.clock.year;
                this.clock.isPaused = state.clock.isPaused ?? false;
                this.dailyTick = state.clock.hour;
                this.monthlyTick = state.clock.day;
            }

            this.timeScale = state.timeScale || 1;

            // Restore firms
            if (state.firms) {
                for (const [id, firmState] of Object.entries(state.firms)) {
                    let firm = this.firms.get(id);
                    if (!firm && firmState.type && firmState.cityId) {
                        firm = this.recreateFirmFromState(id, firmState);
                    }
                    if (firm && firm.restoreState) {
                        firm.restoreState(firmState);
                    }
                }
                this._rebuildFirmPartitions();
                this.cityRetailDemandManager?.invalidateRetailerCache();
            }

            // Restore cities
            if (state.cities) {
                const cities = this.cityManager?.getAllCities() || [];
                for (const city of cities) {
                    const cityState = state.cities[city.id];
                    if (cityState && city.restoreState) {
                        city.restoreState(cityState);
                    }
                }
            }

            // Restore contracts
            const contractManager = this.purchaseManager?.contractManager;
            if (contractManager && state.contracts) {
                contractManager.contracts.clear();
                for (const contractData of state.contracts) {
                    const contract = Contract.fromJSON(contractData);
                    contractManager.contracts.set(contract.id, contract);
                }
                contractManager.rebuildIndices();
                contractManager.pendingDeliveries = state.pendingDeliveries || [];
            }

            // Restore transaction log
            if (state.recentTransactions && this.transactionLog) {
                this.transactionLog.transactions = state.recentTransactions;
            }

            // Restore corporation manager
            if (state.corporationManager && this.corporationManager) {
                this.corporationManager.monthsElapsed = state.corporationManager.monthsElapsed || 0;
                this.corporationManager.economicPhase = state.corporationManager.economicPhase || 'FOUNDATION';

                const restoredPendingCreations = (state.corporationManager.pendingFirmCreations || []).map(project => {
                    const restored = { ...project };
                    if (project.cityId && this.cityManager) {
                        restored.city = this.cityManager.getCityById(project.cityId);
                        restored.country = restored.city?.country || null;
                    }
                    return restored;
                });
                this.corporationManager.pendingFirmCreations = restoredPendingCreations;

                if (state.corporationManager.corporations) {
                    for (const [id, corpState] of Object.entries(state.corporationManager.corporations)) {
                        const corp = this.corporationManager.corporations.get(id);
                        if (corp && corp.restoreState) {
                            corp.restoreState(corpState);
                        }
                    }
                }
            }

            console.log(`✅ State applied: Day ${this.clock.day}, Hour ${this.clock.hour}`);
            return true;

        } catch (e) {
            console.error('Failed to apply state:', e);
            return false;
        }
    }

    /**
     * List all available saves from IndexedDB
     * @returns {Promise<Array>}
     */
    async listSaves() {
        return await gameStorage.listSaves();
    }

    /**
     * Delete a save from IndexedDB
     * @param {string} saveId - Save ID to delete
     * @returns {Promise<boolean>}
     */
    async deleteSave(saveId) {
        return await gameStorage.deleteSave(saveId);
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>}
     */
    async getStorageStats() {
        return await gameStorage.getStats();
    }

    /**
     * Recreate a firm from saved state (for organic growth mode)
     * @param {string} firmId - The firm ID
     * @param {Object} firmState - Saved firm state including type, cityId, etc.
     * @returns {Object|null} The recreated firm or null if failed
     */
    recreateFirmFromState(firmId, firmState) {
        const city = this.cityManager?.getCityById(firmState.cityId);
        if (!city) {
            console.warn(`Cannot recreate firm ${firmId}: city ${firmState.cityId} not found`);
            return null;
        }

        const country = city.country;
        const firmGenerator = this.firmGenerator;
        if (!firmGenerator) {
            console.warn(`Cannot recreate firm ${firmId}: firmGenerator not available`);
            return null;
        }

        let firm = null;
        const type = firmState.type;

        try {
            switch (type) {
                case 'MINING':
                case 'MINING_COMPANY':
                    firm = firmGenerator.createMiningFirmWithResource(
                        city, country, firmId, firmState.resourceType
                    );
                    break;

                case 'LOGGING':
                case 'LOGGING_COMPANY':
                    firm = firmGenerator.createLoggingFirmWithResource(
                        city, country, firmId, firmState.timberType
                    );
                    break;

                case 'FARM':
                case 'FARM_CROP':
                case 'FARM_LIVESTOCK':
                    const resource = firmState.cropType || firmState.livestockType;
                    firm = firmGenerator.createFarmFirmWithResource(
                        city, country, firmId, resource, firmState.farmType
                    );
                    break;

                case 'MANUFACTURING':
                    firm = firmGenerator.createManufacturingFirm(city, country, firmId, false);
                    break;

                case 'RETAIL':
                    firm = firmGenerator.createRetailFirm(city, country, firmId);
                    break;

                default:
                    console.warn(`Unknown firm type for recreation: ${type}`);
                    return null;
            }

            if (firm) {
                // Set corporation association
                firm.corporationId = firmState.corporationId;

                // Find and associate with corporation
                const corp = this.corporationManager?.corporations?.get(firmState.corporationId) ||
                             this.corporationsById?.get(firmState.corporationId);
                if (corp) {
                    firm.corporationAbbreviation = corp.abbreviation;
                    // Add to corporation's firms list if not already there
                    if (typeof corp.addFirm === 'function') {
                        corp.addFirm(firm);
                    }
                }

                // Register the firm
                this.firms.set(firm.id, firm);
                city.firms = city.firms || [];
                if (!city.firms.find(f => f.id === firm.id)) {
                    city.firms.push(firm);
                }

                console.log(`   ✅ Recreated ${type} firm: ${firm.getDisplayName?.() || firm.id}`);
            }
        } catch (error) {
            console.error(`Error recreating firm ${firmId}:`, error);
            return null;
        }

        return firm;
    }

    destroy() {
        if (this.hourlyInterval) {
            clearInterval(this.hourlyInterval);
        }
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        // Save state one final time before destruction (unless resetting)
        if (!SimulationEngine.isResetting) {
            this.saveState();
        }
    }

    /**
     * Setup page lifecycle event handlers to save state when navigating away
     */
    setupPageLifecycleHandlers() {
        // Save state when user leaves the page
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });

        // Save state when tab becomes hidden (more reliable on mobile)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveState();
            }
        });

        // Save state periodically as a safety net (every 10 seconds)
        this.autoSaveInterval = setInterval(() => {
            this.saveState();
        }, 10000);
    }

    // Session state management for cross-page navigation
    static SESSION_KEY = 'simulation_session';

    getOrCreateSessionSeed() {
        let session = sessionStorage.getItem(SimulationEngine.SESSION_KEY);
        if (session) {
            try {
                session = JSON.parse(session);
                if (session.seed) {
                    return session.seed;
                }
            } catch (e) {
                // Invalid session, create new
            }
        }
        // Create new session seed
        const seed = Date.now();
        sessionStorage.setItem(SimulationEngine.SESSION_KEY, JSON.stringify({ seed, created: new Date().toISOString() }));
        return seed;
    }

    // Mulberry32 PRNG - fast and good quality seeded random
    initializeRng() {
        const seed = this.getOrCreateSessionSeed();
        this.rngState = seed;
    }

    // Get next random number (0-1) using Mulberry32 algorithm
    random() {
        if (this.rngState === undefined) {
            this.initializeRng();
        }
        let t = this.rngState += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    // Seeded random for specific index (deterministic)
    seededRandom(seed) {
        let t = seed + 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    generateDeterministicId(prefix, index) {
        const sessionSeed = this.getOrCreateSessionSeed();
        const combinedSeed = sessionSeed + index;
        const randomPart = Math.floor(this.seededRandom(combinedSeed) * 1000000).toString(36);
        return `${prefix}_${sessionSeed}_${randomPart}_${index}`;
    }

    // Clear session (for manual reset)
    static clearSession() {
        sessionStorage.removeItem(SimulationEngine.SESSION_KEY);
    }
}
