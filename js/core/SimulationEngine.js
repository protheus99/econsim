// js/core/SimulationEngine.js
import { GameClock } from '../core/GameClock.js';
import { CityManager } from '../core/CityManager.js';
import { ProductRegistry } from '../core/Product.js';
import { Country, FICTIONAL_COUNTRIES } from '../core/Country.js';
import { MiningCompany } from '../core/firms/MiningCompany.js';
import { LoggingCompany } from '../core/firms/LoggingCompany.js';
import { Farm } from '../core/firms/Farm.js';
import { ManufacturingPlant } from '../core/firms/ManufacturingPlant.js';
import { RetailStore } from '../core/firms/RetailStore.js';
import { Bank } from '../core/firms/Bank.js';
import { GlobalMarket } from '../core/GlobalMarket.js';
import { TransactionLog } from '../core/TransactionLog.js';
import { ProductCostCalculator } from '../core/ProductCostCalculator.js';

export class SimulationEngine {
    constructor() {
        this.clock = new GameClock();
        this.productRegistry = new ProductRegistry();
        this.countries = new Map();
        this.cityManager = null;
        this.firms = new Map();
        this.corporations = [];
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

        // Global Market System
        this.globalMarket = null;

        // Transaction Log for detailed activity tracking
        this.transactionLog = new TransactionLog(1000);
        this.transactionLog.setClock(this.clock); // Use game time for timestamps

        // Product Cost Calculator for balancing
        this.costCalculator = null;

        // Configuration settings (loaded from config.json or use defaults)
        this.config = {
            simulation: {
                version: '1.0.0',
                startYear: 2025,
                timeScale: { realSecond: 1000, gameHour: 1 }
            },
            globalMarket: {
                enabled: true,
                priceMultiplier: 1.5,
                availabilityFactor: 0.8,
                deliveryDelayHours: 24,
                minimumOrderSize: 10,
                maxOrdersPerHour: 5
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
                initial: 8,
                minPopulation: 250000,
                maxPopulation: 5000000,
                salaryLevel: { min: 0.1, max: 1.0, default: 0.5 },
                demographics: { nonWorkingPercentage: 0.30, employmentRate: 0.85 },
                infrastructure: { airportThreshold: 500000, seaportRequiresCoastal: true, railwayThreshold: 250000 }
            },
            firms: {
                perCity: { min: 5, max: 10 },
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
            globalMarketOrders: 0,
            globalMarketSpend: 0
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
            'simulation', 'globalMarket', 'inventory', 'countries', 'cities',
            'firms', 'products', 'transportation', 'labor', 'banking'
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

        // Initialize seeded RNG for consistent generation within a session
        this.initializeRng();

        // Load config and wait for it before initializing systems that depend on it
        await this.loadConfig();

        // Initialize Global Market first (needed for firm initialization)
        this.globalMarket = new GlobalMarket(this.productRegistry, this.config.globalMarket);
        // Initialize market with 500 orders for non-retail products
        this.globalMarket.initializeOrders();
        console.log(`✅ Global Market initialized (multiplier: ${this.config.globalMarket.priceMultiplier}x, orders: ${this.globalMarket.availableOrders.length})`);

        // Initialize Product Cost Calculator for game balancing
        this.costCalculator = new ProductCostCalculator(this.productRegistry);
        console.log('✅ Product Cost Calculator initialized');

        // Initialize countries first
        this.initializeCountries();

        // Initialize city manager with countries and config
        this.cityManager = new CityManager(this.countries, this.config);
        this.cities = this.cityManager.generateInitialCities(); // Uses config.cities.initial

        // Generate corporations and build lookup Map
        this.corporations = this.generateCorporations();
        this.corporations.forEach(corp => this.corporationsById.set(corp.id, corp));

        // Generate firms (mining, logging, farms, manufacturing, retail, banks)
        this.generateFirms();

        // Give GlobalMarket reference to firms for inventory updates during delivery
        this.globalMarket.setFirms(this.firms);

        // Initialize statistics before first render
        this.updateStatistics();

        // Setup intervals
        this.setupIntervals();

        this.isInitialized = true;

        console.log('✅ Enhanced Simulation initialized with:');
        console.log(`   - ${this.countries.size} countries`);
        console.log(`   - ${this.cities.length} cities`);
        console.log(`   - ${this.cityManager.getTotalPopulation().toLocaleString()} total population`);
        console.log(`   - ${this.firms.size} firms operating`);
        console.log(`   - ${this.productRegistry.getAllProducts().length} products available`);
        console.log(`   - Global Market: ${this.config.globalMarket.enabled ? 'ENABLED' : 'DISABLED'}`);

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
        const names = [
            // Tech & Electronics
            'TechCorp Global', 'DigiSystems Inc', 'CyberNex Holdings', 'QuantumTech Ltd', 'NovaSoft International',
            // Retail & Consumer
            'MegaRetail Group', 'GlobalMart Corp', 'ValueChain Industries', 'PrimeGoods Inc', 'ShopWorld Holdings',
            // Industrial & Manufacturing
            'IndustrialGiant Corp', 'SteelWorks International', 'MetalForge Industries', 'HeavyMach Group', 'BuildPro Holdings',
            // Food & Agriculture
            'FoodCo International', 'AgriGlobal Corp', 'FreshFarms Holdings', 'NutriCorp Industries', 'HarvestKing Group',
            // Automotive & Transport
            'AutoMakers Global', 'MotorCraft Industries', 'SpeedTrans Holdings', 'VehiclePro Corp', 'DriveForce International',
            // Pharma & Healthcare
            'PharmaTech Global', 'MediCare Holdings', 'HealthFirst Corp', 'BioGen Industries', 'CureWell International',
            // Energy & Resources
            'PowerGen Holdings', 'EnergyMax Corp', 'FuelCorp International', 'ResourceOne Group', 'MineralEx Industries',
            // Finance & Banking
            'CapitalBank Holdings', 'WealthTrust Corp', 'InvestCo Global', 'FinanceHub International', 'MoneyWise Group',
            // Diversified Conglomerates
            'Apex Holdings', 'Titan Enterprises', 'Meridian Group', 'Vanguard International', 'Summit Industries',
            'Horizon Corp', 'Pinnacle Holdings', 'Atlas Global', 'Nexus Industries', 'Stellar Enterprises'
        ];
        const characters = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE', 'VERY_AGGRESSIVE'];

        // Generate 3-letter abbreviation from name
        const generateAbbreviation = (name) => {
            const words = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
            if (words.length >= 3) {
                // Take first letter of first 3 significant words
                return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
            } else if (words.length === 2) {
                // Take first letter of first word + first two letters of second
                return (words[0][0] + words[1].substring(0, 2)).toUpperCase();
            } else {
                // Single word - take first 3 letters
                return words[0].substring(0, 3).toUpperCase();
            }
        };

        return names.map((name, i) => ({
            id: i + 1,
            name: name,
            abbreviation: generateAbbreviation(name),
            character: characters[Math.floor(this.random() * characters.length)],
            cash: 0, // Will be aggregated from firms
            revenue: 0,
            expenses: 0,
            profit: 0,
            monthlyRevenue: 0,
            monthlyExpenses: 0,
            monthlyProfit: 0,
            employees: 0,
            facilities: [],
            color: `hsl(${(i * 7.2) % 360}, 70%, 60%)` // Better color distribution for 50 corps
        }));
    }

    generateFirms() {
        // Get firm generation config
        const firmsPerCityConfig = this.config.firms?.perCity ?? { min: 5, max: 10 };
        const distributionConfig = this.config.firms?.distribution ?? {
            MINING: 0.15, LOGGING: 0.10, FARM: 0.20, MANUFACTURING: 0.25, RETAIL: 0.20, BANK: 0.10
        };

        // Calculate average firms per city for distribution targets
        const avgFirmsPerCity = (firmsPerCityConfig.min + firmsPerCityConfig.max) / 2;
        const totalFirmsTarget = this.cities.length * avgFirmsPerCity;

        // Distribution targets by type (using config)
        const firmTypeTargets = {
            'MINING': Math.floor(totalFirmsTarget * (distributionConfig.MINING ?? 0.15)),
            'LOGGING': Math.floor(totalFirmsTarget * (distributionConfig.LOGGING ?? 0.10)),
            'FARM': Math.floor(totalFirmsTarget * (distributionConfig.FARM ?? 0.20)),
            'MANUFACTURING_SEMI': Math.floor(totalFirmsTarget * ((distributionConfig.MANUFACTURING ?? 0.25) / 2)),
            'MANUFACTURING': Math.floor(totalFirmsTarget * ((distributionConfig.MANUFACTURING ?? 0.25) / 2)),
            'RETAIL': Math.floor(totalFirmsTarget * (distributionConfig.RETAIL ?? 0.20)),
            'BANK': Math.floor(totalFirmsTarget * (distributionConfig.BANK ?? 0.10))
        };

        let totalCreated = 0;
        let corpIndex = 0;

        // Create firms for each city using config min/max
        const minFirms = firmsPerCityConfig.min;
        const maxFirms = firmsPerCityConfig.max;
        const firmRange = maxFirms - minFirms + 1;

        for (const city of this.cities) {
            const country = city.country;
            const firmsForThisCity = minFirms + Math.floor(this.random() * firmRange);

            for (let i = 0; i < firmsForThisCity; i++) {
                // Cycle through corporations
                const corp = this.corporations[corpIndex % this.corporations.length];
                corpIndex++;

                try {
                    this.generateRandomFirm(city, country, corp);
                    totalCreated++;
                } catch (error) {
                    console.error(`Error creating firm in ${city.name}:`, error);
                }
            }
        }

        console.log(`✅ Generated ${this.firms.size} firms across ${this.cities.length} cities`);

        // Log distribution
        const typeCount = {};
        this.firms.forEach(firm => {
            typeCount[firm.type] = (typeCount[firm.type] || 0) + 1;
        });
        console.log('📊 Firm distribution:', typeCount);

        // Debug: Log corporation facility counts
        console.log('📊 Corporation facility counts:');
        this.corporations.forEach(corp => {
            if (corp.facilities.length > 0) {
                console.log(`  - ${corp.name}: ${corp.facilities.length} facilities`);
            }
        });
        const totalFacilities = this.corporations.reduce((sum, c) => sum + (c.facilities?.length || 0), 0);
        console.log(`📊 Total facilities across all corporations: ${totalFacilities}`);
    }

    generateRandomFirm(city, country, corporation = null) {
        // Generate a random firm based on weighted probabilities
        const firmTypes = ['MINING', 'LOGGING', 'FARM', 'MANUFACTURING_SEMI', 'MANUFACTURING', 'RETAIL', 'BANK'];
        const weights = [0.15, 0.10, 0.20, 0.15, 0.15, 0.15, 0.10]; // Probability weights

        const type = this.weightedRandomChoice(firmTypes, weights);
        let firm = null;

        // Generate deterministic ID for this firm
        const firmId = this.generateDeterministicId('FIRM', this.firmCreationIndex++);

        try {
            switch (type) {
                case 'MINING':
                    // Filter to only valid mining resources (not agricultural)
                    const validMiningResources = ['Iron Ore', 'Copper Ore', 'Coal', 'Gold Ore', 'Silver Ore',
                                                  'Aluminum Ore', 'Limestone', 'Salt', 'Crude Oil', 'Natural Gas'];
                    const miningResources = country.resources.filter(r => validMiningResources.includes(r));
                    if (miningResources.length > 0) {
                        const resource = miningResources[Math.floor(this.random() * miningResources.length)];
                        firm = new MiningCompany({ city: city }, country, resource, firmId);
                    }
                    break;

                case 'LOGGING':
                    const timberTypes = ['Softwood Logs', 'Hardwood Logs', 'Bamboo'];
                    const timberType = timberTypes[Math.floor(this.random() * timberTypes.length)];
                    firm = new LoggingCompany({ city: city }, country, timberType, firmId);
                    break;

                case 'FARM':
                    const farmType = this.random() < 0.6 ? 'CROP' : 'LIVESTOCK';
                    firm = new Farm({ city: city }, country, farmType, firmId);
                    break;

                case 'MANUFACTURING_SEMI':
                    // Create manufacturers for SEMI_RAW products (Steel, Copper Wire, etc.)
                    const semiRawProducts = this.productRegistry.getProductsByTier('SEMI_RAW');
                    if (semiRawProducts.length > 0) {
                        const product = semiRawProducts[Math.floor(this.random() * semiRawProducts.length)];
                        firm = new ManufacturingPlant({ city: city }, country, product.id, this.productRegistry, firmId);
                        firm.isSemiRawProducer = true; // Mark as semi-raw producer

                        // Initialize with 1 week worth of raw materials (168 hours)
                        const weeklyHours = 24 * 7 * this.config.inventory.initialStockWeeks;
                        if (firm && firm.product && firm.product.inputs) {
                            firm.product.inputs.forEach(input => {
                                const inventory = firm.rawMaterialInventory.get(input.material);
                                if (inventory) {
                                    const hourlyUsage = input.quantity * (firm.productionLine?.outputPerHour || 10);
                                    inventory.quantity = hourlyUsage * weeklyHours;
                                    inventory.minRequired = hourlyUsage * 24 * 7 * this.config.inventory.reorderThresholdWeeks;
                                    inventory.capacity = Math.max(inventory.capacity, inventory.quantity * 2);
                                }
                            });
                        }
                    }
                    break;

                case 'MANUFACTURING':
                    const manufacturedProducts = this.productRegistry.getProductsByTier('MANUFACTURED');
                    if (manufacturedProducts.length > 0) {
                        const product = manufacturedProducts[Math.floor(this.random() * manufacturedProducts.length)];
                        firm = new ManufacturingPlant({ city: city }, country, product.id, this.productRegistry, firmId);
                        firm.isSemiRawProducer = false;

                        // Initialize with 1 week worth of semi-raw materials (168 hours)
                        const weeklyHoursFinal = 24 * 7 * this.config.inventory.initialStockWeeks;
                        if (firm && firm.product && firm.product.inputs) {
                            firm.product.inputs.forEach(input => {
                                const inventory = firm.rawMaterialInventory.get(input.material);
                                if (inventory) {
                                    const hourlyUsage = input.quantity * (firm.productionLine?.outputPerHour || 10);
                                    inventory.quantity = hourlyUsage * weeklyHoursFinal;
                                    inventory.minRequired = hourlyUsage * 24 * 7 * this.config.inventory.reorderThresholdWeeks;
                                    inventory.capacity = Math.max(inventory.capacity, inventory.quantity * 2);
                                }
                            });
                        }
                    }
                    break;

                case 'RETAIL':
                    const storeTypes = ['SUPERMARKET', 'DEPARTMENT', 'ELECTRONICS', 'FURNITURE', 'FASHION', 'HARDWARE', 'AUTO'];
                    const storeType = storeTypes[Math.floor(this.random() * storeTypes.length)];
                    firm = new RetailStore({ city: city }, country, storeType, firmId);

                    // Initialize with products matching the store's allowed categories
                    if (firm) {
                        const allProducts = this.productRegistry.getAllProducts();
                        // Filter to only products this store type can sell
                        const allowedProducts = allProducts.filter(p => firm.canSellProduct(p.category));

                        if (allowedProducts.length > 0) {
                            const numProducts = Math.min(5 + Math.floor(this.random() * 10), allowedProducts.length);
                            const selectedProducts = new Set();

                            while (selectedProducts.size < numProducts) {
                                const product = allowedProducts[Math.floor(this.random() * allowedProducts.length)];
                                if (!selectedProducts.has(product.id)) {
                                    selectedProducts.add(product.id);
                                    const quantity = 50 + Math.floor(this.random() * 150);
                                    const wholesalePrice = product.basePrice * 0.7;
                                    firm.purchaseInventory(product.id, quantity, wholesalePrice, product.name);
                                }
                            }
                        }
                    }
                    break;

                case 'BANK':
                    const bankTypes = ['COMMERCIAL', 'INVESTMENT'];
                    const bankType = bankTypes[Math.floor(this.random() * bankTypes.length)];
                    firm = new Bank({ city: city }, country, bankType, firmId);
                    break;
            }

            if (firm) {
                // Assign firm to specified corporation or random one
                const corp = corporation || this.corporations[Math.floor(this.random() * this.corporations.length)];
                firm.corporationId = corp.id;
                firm.corporationAbbreviation = corp.abbreviation;
                corp.facilities.push(firm);
                corp.employees += firm.totalEmployees;

                this.firms.set(firm.id, firm);

                // Add firm to city's firms array
                city.firms.push(firm);

                // Track industry presence in city
                const industryType = firm.type;
                if (!city.industries.has(industryType)) {
                    city.industries.set(industryType, []);
                }
                city.industries.get(industryType).push(firm);

                // Add employment to city
                city.addEmployment(firm.totalEmployees, firm.calculateLaborCosts() / firm.totalEmployees);
            }
        } catch (error) {
            console.error(`Error creating ${type} firm:`, error);
        }
    }

    weightedRandomChoice(items, weights) {
        const total = weights.reduce((sum, w) => sum + w, 0);
        let random = this.random() * total;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }
        
        return items[0];
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
            }
            this.emit('update');
        }, tickRate);
    }

    updateHourly() {
        this.dailyTick++;
        if (this.dailyTick >= 24) {
            this.dailyTick = 0;
            this.updateDaily();
        }

        // Process hourly operations for all firms
        this.processFirmOperations();

        // Get current game time for global market
        const gameTime = this.clock.getGameTime();
        const currentHour = gameTime.hour;
        const currentDay = gameTime.day + (gameTime.month - 1) * 30 + (gameTime.year - 2025) * 365;

        // Process global market (bidding windows and deliveries)
        if (this.globalMarket) {
            const marketResult = this.globalMarket.processHourly(currentHour, currentDay);

            // Have firms bid on available orders during bidding hours (9am-12pm)
            if (currentHour >= 9 && currentHour < 12) {
                this.processFirmBidding();
            }

            if (marketResult.delivered > 0) {
                this.stats.globalMarketOrders += marketResult.delivered;

                // Sync delivered orders with TransactionLog
                marketResult.deliveredOrders.forEach(order => {
                    this.transactionLog.updateGlobalMarketOrderByGMId(order.id, 'DELIVERED');
                });
            }
        }

        // Check inventory levels and auto-purchase from global market
        this.checkInventoryLevels();

        // Check for excess inventory and sell to global market
        this.checkExcessInventory();

        // Update corporation stats from firms
        this.updateCorporationStats();

        // Update market history
        this.updateMarketHistory();

        // Finalize transaction log for this hour
        this.transactionLog.finalizeHour(this.clock.getGameTime());

        // Update statistics
        this.updateStatistics();
    }

    checkInventoryLevels() {
        // Check all manufacturing firms for low inventory
        this.firms.forEach(firm => {
            if (firm.type === 'MANUFACTURING') {
                this.checkManufacturingInventory(firm);
            } else if (firm.type === 'RETAIL') {
                this.checkRetailInventory(firm);
            }
        });
    }

    checkManufacturingInventory(firm) {
        if (!firm.product || !firm.product.inputs) return;

        firm.product.inputs.forEach(input => {
            const inventory = firm.rawMaterialInventory?.get(input.material);
            if (!inventory) return;

            // Calculate thresholds based on production rate
            const hourlyUsage = input.quantity * (firm.productionLine?.outputPerHour || 10);
            const reorderThreshold = hourlyUsage * 24 * 7 * this.config.inventory.reorderThresholdWeeks;

            // If below threshold, try to purchase
            if (inventory.quantity < reorderThreshold) {
                // Calculate how much to order (2 weeks worth by default) - must be integer > 0
                const orderQuantity = Math.floor(hourlyUsage * 24 * 7 * this.config.inventory.reorderQuantityWeeks);

                if (orderQuantity <= 0) return;

                // First try to buy from local producers via supply chain
                const purchased = this.tryLocalPurchase(firm, input.material, orderQuantity);

                // If local purchase didn't fulfill the need, use global market
                if (!purchased && this.globalMarket && this.globalMarket.canPlaceOrder()) {
                    const result = this.globalMarket.placeOrder(firm, input.material, orderQuantity, 'normal');
                    if (result.success) {
                        this.stats.globalMarketSpend += result.order.totalCost;

                        // Log global market order with the GlobalMarket order ID for syncing
                        const deliveryHours = this.config.globalMarket?.deliveryDelayHours || 24;
                        this.transactionLog.logGlobalMarketOrder(
                            firm,
                            input.material,
                            orderQuantity,
                            result.order.unitPrice,
                            result.order.totalCost,
                            'PENDING',
                            deliveryHours,
                            result.order.id  // Pass GlobalMarket order ID
                        );
                    }
                }
            }
        });
    }

    checkRetailInventory(retailer) {
        if (!retailer.productInventory || retailer.productInventory.size === 0) return;
        if (!this.globalMarket || !this.globalMarket.canPlaceOrder()) return;

        // Check each product in inventory
        retailer.productInventory.forEach((inventory, productId) => {
            const reorderThreshold = 20; // Reorder when below 20 units
            const reorderQuantity = 100; // Order 100 units at a time

            if (inventory.quantity < reorderThreshold) {
                // Get product info for ordering
                const product = this.productRegistry?.getProduct(productId);
                const productName = inventory.productName || product?.name || productId;

                // Check if retailer can afford the order
                const unitPrice = this.globalMarket.getMarketPrice(productName);
                const totalCost = reorderQuantity * unitPrice;

                if (retailer.cash >= totalCost) {
                    const result = this.globalMarket.placeOrder(retailer, productName, reorderQuantity, 'normal');
                    if (result.success) {
                        this.stats.globalMarketSpend += result.order.totalCost;

                        // Calculate delivery hours from config or use default
                        const deliveryHours = this.config.globalMarket?.deliveryDelayHours || 24;

                        this.transactionLog.logGlobalMarketOrder(
                            retailer,
                            productName,
                            reorderQuantity,
                            result.order.unitPrice || unitPrice,
                            result.order.totalCost || totalCost,
                            'PENDING',
                            deliveryHours,
                            result.order.id
                        );
                    }
                }
            }
        });
    }

    tryLocalPurchase(buyer, materialName, quantity) {
        // Try to find local producers for this material
        const allManufacturers = Array.from(this.firms.values()).filter(f => f.type === 'MANUFACTURING');
        const primaryProducers = Array.from(this.firms.values()).filter(f =>
            f.type === 'MINING' || f.type === 'LOGGING' || f.type === 'FARM'
        );

        // Check if it's a raw material (from primary producers)
        const rawSuppliers = primaryProducers.filter(p => {
            const producesType = p.resourceType || p.timberType || p.cropType || p.livestockType;
            return producesType === materialName && p.inventory && p.inventory.quantity > quantity * 0.5;
        });

        if (rawSuppliers.length > 0) {
            const supplier = rawSuppliers.sort((a, b) => b.inventory.quantity - a.inventory.quantity)[0];
            this.executeTrade(supplier, buyer, materialName, quantity);
            return true;
        }

        // Check if it's a semi-raw material (from semi-raw manufacturers)
        const semiRawSuppliers = allManufacturers.filter(m =>
            m.isSemiRawProducer &&
            m.product &&
            m.product.name === materialName &&
            m.finishedGoodsInventory &&
            m.finishedGoodsInventory.quantity > quantity * 0.5
        );

        if (semiRawSuppliers.length > 0) {
            const supplier = semiRawSuppliers.sort((a, b) =>
                b.finishedGoodsInventory.quantity - a.finishedGoodsInventory.quantity)[0];
            this.executeManufacturerToManufacturerTrade(supplier, buyer, materialName, quantity);
            return true;
        }

        return false;
    }

    checkExcessInventory() {
        // Check mining, logging, and manufacturing firms for excess inventory
        // Sell to global market if inventory > 7 days worth AND no recent B2B orders
        const EXCESS_THRESHOLD_HOURS = 24 * 7; // 7 days worth of production
        const NO_DEMAND_HOURS = 24; // Consider no demand if no sales in 24 hours

        this.firms.forEach(firm => {
            // Reset pending demand flag at start of check
            const hoursSinceLastSale = this.clock.totalHours - (firm.lastB2BSaleHour || 0);
            if (hoursSinceLastSale > NO_DEMAND_HOURS) {
                firm.hasPendingDemand = false;
            }

            // Skip if firm has pending demand (recent orders from other firms)
            if (firm.hasPendingDemand) return;

            let inventory = null;
            let productionRate = 0;
            let productName = null;

            if (firm.type === 'MINING') {
                inventory = firm.inventory;
                productionRate = firm.actualExtractionRate || firm.baseExtractionRate || 25;
                productName = firm.resourceType;
            } else if (firm.type === 'LOGGING') {
                inventory = firm.inventory;
                productionRate = firm.actualHarvestRate || firm.baseHarvestRate || 25;
                productName = firm.timberType;
            } else if (firm.type === 'MANUFACTURING') {
                inventory = firm.finishedGoodsInventory;
                productionRate = firm.productionLine?.outputPerHour || 10;
                productName = firm.product?.name || firm.productType;
            } else {
                return; // Skip other firm types
            }

            if (!inventory || !productName) return;

            // Calculate 7 days worth of production
            const sevenDaysWorth = productionRate * EXCESS_THRESHOLD_HOURS;

            // Check if inventory exceeds 7 days worth
            if (inventory.quantity > sevenDaysWorth) {
                // Calculate excess to sell (keep 7 days worth)
                const excessQuantity = Math.floor(inventory.quantity - sevenDaysWorth);

                // Minimum order size check
                if (excessQuantity >= this.globalMarket.config.minimumOrderSize) {
                    // Sell excess to global market
                    const result = this.globalMarket.sellToGlobalMarket(firm, productName, excessQuantity);

                    if (result.success) {
                        // Log the sale to transaction log
                        this.transactionLog.logGlobalMarketSale(
                            firm,
                            productName,
                            excessQuantity,
                            result.sale.unitPrice,
                            result.sale.totalRevenue
                        );

                        this.stats.globalMarketSales = (this.stats.globalMarketSales || 0) + 1;
                        this.stats.globalMarketSalesRevenue = (this.stats.globalMarketSalesRevenue || 0) + result.sale.totalRevenue;
                    }
                }
            }
        });
    }

    // Have firms bid on global market orders they can fulfill
    processFirmBidding() {
        const biddingOrders = this.globalMarket.getBiddingOrders();
        if (biddingOrders.length === 0) return;

        // Collect firms that can produce and bid
        const producers = Array.from(this.firms.values()).filter(f =>
            f.type === 'MINING' || f.type === 'LOGGING' || f.type === 'FARM' || f.type === 'MANUFACTURING'
        );

        biddingOrders.forEach(order => {
            // Find firms that produce this product
            const eligibleFirms = producers.filter(firm => {
                let productName = null;
                let inventory = null;

                if (firm.type === 'MINING') {
                    productName = firm.resourceType;
                    inventory = firm.inventory;
                } else if (firm.type === 'LOGGING') {
                    productName = firm.timberType;
                    inventory = firm.inventory;
                } else if (firm.type === 'FARM') {
                    productName = firm.cropType || firm.livestockType;
                    inventory = firm.inventory;
                } else if (firm.type === 'MANUFACTURING') {
                    productName = firm.product?.name;
                    inventory = firm.finishedGoodsInventory;
                }

                // Check if firm produces this product and has enough inventory
                return productName === order.productName &&
                       inventory &&
                       inventory.quantity >= order.quantity;
            });

            // Each eligible firm places a bid
            eligibleFirms.forEach(firm => {
                // Only bid if not already bid on this order
                const alreadyBid = order.bids.some(b => b.firmId === firm.id);
                if (alreadyBid) return;

                // Calculate bid price based on production cost + profit margin
                const baseCost = order.basePrice;
                // Random profit margin 5-25% (using seeded RNG for determinism)
                const profitMargin = 1.05 + this.random() * 0.20;
                const bidPrice = baseCost * profitMargin;

                // Calculate delivery fee based on quantity
                const deliveryFee = order.quantity * 0.3 * (1 + this.random());

                // Place the bid
                this.globalMarket.placeBid(firm, order.id, bidPrice, deliveryFee);
            });
        });
    }

    updateCorporationStats() {
        // Reset and recalculate corporation stats from their firms
        this.corporations.forEach(corp => {
            corp.employees = 0;
            corp.revenue = 0;
            corp.profit = 0;
            corp.cash = 0;
            corp.expenses = 0;
        });

        this.firms.forEach(firm => {
            const corp = this.corporationsById.get(firm.corporationId);
            if (corp) {
                corp.employees += firm.totalEmployees || 0;
                corp.revenue += firm.revenue || 0;
                corp.profit += firm.profit || 0;
                corp.cash += firm.cash || 0;
                corp.expenses += firm.expenses || 0;
            }
        });
    }

    processFirmOperations() {
        const currentHour = this.clock.hour;

        // Step 1: All firms produce
        this.firms.forEach(firm => {
            try {
                if (firm.type === 'RETAIL') {
                    // Process retail sales and log consumer transactions
                    const salesResult = firm.sellHourly(currentHour);
                    if (salesResult && salesResult.productSales && salesResult.productSales.length > 0) {
                        this.logRetailConsumerSales(firm, salesResult);
                    }
                } else {
                    firm.produceHourly();
                }
            } catch (error) {
                console.error(`Error in production for firm ${firm.id}:`, error);
            }
        });

        // Step 2: Process supply chain transactions
        this.processSupplyChain();

        // Debug: Log supply chain stats every 24 hours (once per game day)
        if (this.dailyTick === 0) {
            this.logSupplyChainStats();
        }
    }

    logRetailConsumerSales(retailer, salesResult) {
        // Aggregate sales by product for cleaner logging
        const aggregatedSales = new Map();

        salesResult.productSales.forEach(sale => {
            const key = sale.productId;
            if (aggregatedSales.has(key)) {
                const existing = aggregatedSales.get(key);
                existing.quantity += sale.quantity;
                existing.total += sale.total;
            } else {
                aggregatedSales.set(key, {
                    productName: sale.productName,
                    quantity: sale.quantity,
                    unitPrice: sale.unitPrice,
                    total: sale.total
                });
            }
        });

        // Log each product sale as a consumer transaction
        aggregatedSales.forEach((sale, productId) => {
            this.transactionLog.logConsumerSale(
                retailer,
                sale.productName,
                sale.quantity,
                sale.unitPrice,
                sale.total,
                retailer.city?.name || 'Unknown'
            );
        });

        // Update stats
        this.stats.consumerSales = (this.stats.consumerSales || 0) + salesResult.transactions;
        this.stats.consumerRevenue = (this.stats.consumerRevenue || 0) + salesResult.revenue;
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

        console.log('📊 Daily Supply Chain Stats:', stats);
    }

    processSupplyChain() {
        const allManufacturers = Array.from(this.firms.values()).filter(f => f.type === 'MANUFACTURING');
        const semiRawManufacturers = allManufacturers.filter(m => m.isSemiRawProducer === true);
        const finalManufacturers = allManufacturers.filter(m => m.isSemiRawProducer === false);
        const retailers = Array.from(this.firms.values()).filter(f => f.type === 'RETAIL');
        const primaryProducers = Array.from(this.firms.values()).filter(f =>
            f.type === 'MINING' || f.type === 'LOGGING' || f.type === 'FARM'
        );

        // TIER 1: Primary producers sell RAW materials to SEMI_RAW manufacturers
        semiRawManufacturers.forEach(manufacturer => {
            if (!manufacturer.product || !manufacturer.product.inputs) return;

            manufacturer.product.inputs.forEach(input => {
                const neededMaterial = input.material; // e.g., "Iron Ore", "Coal"
                const currentStock = manufacturer.rawMaterialInventory.get(neededMaterial);
                if (currentStock && currentStock.quantity >= currentStock.minRequired) return; // Already stocked

                const neededQuantity = Math.floor(input.quantity * 50); // Buy enough for ~50 hours

                // Find primary producers that produce this RAW material
                const suppliers = primaryProducers.filter(p => {
                    const producesType = p.resourceType || p.timberType || p.cropType || p.livestockType;
                    return producesType === neededMaterial && p.inventory && p.inventory.quantity > 0;
                });

                if (suppliers.length > 0) {
                    const supplier = suppliers.sort((a, b) => b.inventory.quantity - a.inventory.quantity)[0];
                    this.executeTrade(supplier, manufacturer, neededMaterial, neededQuantity);
                }
            });
        });

        // TIER 2: SEMI_RAW manufacturers sell to MANUFACTURED manufacturers
        finalManufacturers.forEach(manufacturer => {
            if (!manufacturer.product || !manufacturer.product.inputs) return;

            manufacturer.product.inputs.forEach(input => {
                const neededMaterial = input.material; // e.g., "Steel", "Copper Wire"
                const currentStock = manufacturer.rawMaterialInventory.get(neededMaterial);
                if (currentStock && currentStock.quantity >= currentStock.minRequired) return;

                const neededQuantity = Math.floor(input.quantity * 50); // Buy enough for ~50 hours

                // Find SEMI_RAW manufacturers that produce this material
                const suppliers = semiRawManufacturers.filter(m => {
                    return m.product &&
                           m.product.name === neededMaterial &&
                           m.finishedGoodsInventory &&
                           m.finishedGoodsInventory.quantity > 0;
                });

                if (suppliers.length > 0) {
                    const supplier = suppliers.sort((a, b) =>
                        b.finishedGoodsInventory.quantity - a.finishedGoodsInventory.quantity)[0];
                    this.executeManufacturerToManufacturerTrade(supplier, manufacturer, neededMaterial, neededQuantity);
                }
            });
        });

        // TIER 3: MANUFACTURED manufacturers sell to retailers
        retailers.forEach(retailer => {
            // Find final manufacturers with finished goods (not semi-raw)
            const suppliersWithGoods = finalManufacturers.filter(m =>
                m.finishedGoodsInventory && m.finishedGoodsInventory.quantity > 0
            );

            suppliersWithGoods.forEach(manufacturer => {
                const buyQuantity = Math.floor(Math.min(
                    manufacturer.finishedGoodsInventory.quantity * 0.5,
                    200 // Max purchase per hour
                ));

                if (buyQuantity > 0) {
                    this.executeRetailPurchase(manufacturer, retailer, buyQuantity);
                }
            });
        });
    }

    executeManufacturerToManufacturerTrade(seller, buyer, materialName, requestedQuantity) {
        if (!seller.finishedGoodsInventory || seller.finishedGoodsInventory.quantity <= 0) return;

        // Get product info for minimum B2B quantity
        const product = seller.product || this.productRegistry.getProductByName(materialName);
        const price = product ? product.basePrice : 100;
        const minB2BQuantity = product ? product.minB2BQuantity : 1;

        const availableQuantity = seller.finishedGoodsInventory.quantity;

        // Enforce minimum B2B quantity
        if (availableQuantity < minB2BQuantity) return;

        // Trade quantity must be at least minB2BQuantity
        const tradeQuantity = Math.floor(Math.min(
            Math.max(requestedQuantity, minB2BQuantity),
            availableQuantity
        ));

        if (tradeQuantity < minB2BQuantity) return;

        const totalCost = tradeQuantity * price;

        // Check if buyer can afford
        if (buyer.cash < totalCost) return;

        // Execute transaction
        seller.finishedGoodsInventory.quantity -= tradeQuantity;
        seller.cash += totalCost;
        seller.revenue += totalCost;
        seller.monthlyRevenue += totalCost;

        buyer.cash -= totalCost;
        buyer.expenses += totalCost;

        // Add to buyer's raw material inventory
        if (buyer.rawMaterialInventory && buyer.rawMaterialInventory.has(materialName)) {
            const buyerInv = buyer.rawMaterialInventory.get(materialName);
            buyerInv.quantity += tradeQuantity;
        }

        // Track last B2B sale for excess inventory check
        seller.lastB2BSaleHour = this.clock.totalHours;
        seller.hasPendingDemand = true;

        // Track transaction
        this.hourlyTransactions.count++;
        this.hourlyTransactions.value += totalCost;

        // Log detailed transaction
        this.transactionLog.logB2BTransaction(
            seller, buyer, materialName, tradeQuantity, price, totalCost, 'SEMI_TO_MANUFACTURED'
        );
    }

    executeTrade(seller, buyer, materialName, requestedQuantity) {
        if (!seller.inventory || seller.inventory.quantity <= 0) return;

        // Get product info by name
        const product = this.productRegistry.getProductByName(materialName);
        const price = product ? product.basePrice : 50;
        const minB2BQuantity = product ? product.minB2BQuantity : 1;

        const availableQuantity = seller.inventory.quantity;

        // Enforce minimum B2B quantity - only trade if we can meet minimum
        if (availableQuantity < minB2BQuantity) return;

        // Trade quantity must be at least minB2BQuantity
        const tradeQuantity = Math.floor(Math.min(
            Math.max(requestedQuantity, minB2BQuantity),
            availableQuantity
        ));

        if (tradeQuantity < minB2BQuantity) return;

        const totalCost = tradeQuantity * price;

        // Check if buyer can afford
        if (buyer.cash < totalCost) return;

        // Execute transaction
        seller.inventory.quantity -= tradeQuantity;
        seller.cash += totalCost;
        seller.revenue += totalCost;
        seller.monthlyRevenue += totalCost;

        buyer.cash -= totalCost;
        buyer.expenses += totalCost;

        // Add to buyer's raw material inventory
        if (buyer.rawMaterialInventory && buyer.rawMaterialInventory.has(materialName)) {
            const buyerInv = buyer.rawMaterialInventory.get(materialName);
            buyerInv.quantity += tradeQuantity;
        }

        // Track last B2B sale for excess inventory check
        seller.lastB2BSaleHour = this.clock.totalHours;
        seller.hasPendingDemand = true;

        // Track transaction for market activity
        this.hourlyTransactions.count++;
        this.hourlyTransactions.value += totalCost;

        // Log detailed transaction
        this.transactionLog.logB2BTransaction(
            seller, buyer, materialName, tradeQuantity, price, totalCost, 'RAW_TO_SEMI'
        );
    }

    executeRetailPurchase(manufacturer, retailer, quantity) {
        if (!manufacturer.finishedGoodsInventory || manufacturer.finishedGoodsInventory.quantity <= 0) return;

        // Get product info
        const product = manufacturer.product;
        const productId = product?.id || manufacturer.productType || 'generic';
        const productName = product?.name || manufacturer.productType || 'Unknown Product';
        const minB2BQuantity = product?.minB2BQuantity || 1;

        // Check if retailer can sell this type of product
        if (productId && !retailer.canSellProductById(productId, this.productRegistry)) {
            return; // Retailer doesn't sell this category of product
        }

        const availableQuantity = manufacturer.finishedGoodsInventory.quantity;

        // Enforce minimum B2B quantity
        if (availableQuantity < minB2BQuantity) return;

        // Trade quantity must be at least minB2BQuantity
        const tradeQuantity = Math.floor(Math.min(
            Math.max(quantity, minB2BQuantity),
            availableQuantity
        ));

        if (tradeQuantity < minB2BQuantity) return;

        // Calculate price based on production cost + markup
        const costPerUnit = manufacturer.calculateProductionCost ? manufacturer.calculateProductionCost() : 100;
        const wholesalePrice = costPerUnit * 1.2; // 20% markup
        const totalCost = tradeQuantity * wholesalePrice;

        // Check if retailer can afford
        if (retailer.cash < totalCost) return;

        // Execute transaction
        manufacturer.finishedGoodsInventory.quantity -= tradeQuantity;
        manufacturer.cash += totalCost;
        manufacturer.revenue += totalCost;
        manufacturer.monthlyRevenue += totalCost;

        retailer.cash -= totalCost;

        // Add to retailer inventory with proper product name
        retailer.purchaseInventory(productId, tradeQuantity, wholesalePrice, productName);

        // Track last B2B sale for excess inventory check
        manufacturer.lastB2BSaleHour = this.clock.totalHours;
        manufacturer.hasPendingDemand = true;

        // Track transaction for market activity
        this.hourlyTransactions.count++;
        this.hourlyTransactions.value += totalCost;

        // Log detailed transaction
        this.transactionLog.logRetailPurchase(
            manufacturer, retailer, productName, tradeQuantity, wholesalePrice, totalCost
        );
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

    updateDaily() {
        this.monthlyTick++;

        // Day 1 (tick 1): Pay first half of wages
        if (this.monthlyTick === 1) {
            this.firms.forEach(firm => {
                try {
                    firm.payWages();
                } catch (error) {
                    console.error(`Error paying wages for firm ${firm.id}:`, error);
                }
            });
            console.log(`💰 Day 1: Paid first payroll to all firms`);
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
            console.log(`💰 Day 15: Paid second payroll to all firms`);
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
            console.log(`📋 Day 30: Paid operating expenses and loans for all firms`);

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
        console.log(`📅 Month ${this.clock.month}, Year ${this.clock.year}`);

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
        this.firms.forEach(firm => {
            try {
                // Capture monthly values BEFORE updateMonthly resets them
                const firmMonthlyRevenue = firm.monthlyRevenue || 0;
                const firmMonthlyExpenses = firm.monthlyExpenses || 0;

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

    updateYearly() {
        console.log(`🎆 Year ${this.clock.year} complete`);

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
        // Clamp to positive integer (min 1, max 16) for use as loop bound
        this.speed = Math.max(1, Math.min(16, Math.floor(multiplier) || 1));
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
            globalMarket: this.globalMarket ? this.globalMarket.getStats() : null,
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

    // Global Market control methods
    setGlobalMarketMultiplier(multiplier) {
        if (multiplier < 1.0) {
            console.warn('Global market multiplier should be >= 1.0');
            multiplier = 1.0;
        }
        this.config.globalMarket.priceMultiplier = multiplier;
        if (this.globalMarket) {
            this.globalMarket.updatePriceMultiplier(multiplier);
        }
        this.addEvent('info', 'Global Market', `Price multiplier set to ${multiplier}x`);
    }

    getGlobalMarketMultiplier() {
        return this.config.globalMarket.priceMultiplier;
    }

    enableGlobalMarket(enabled = true) {
        this.config.globalMarket.enabled = enabled;
        if (this.globalMarket) {
            this.globalMarket.config.enabled = enabled;
        }
        this.addEvent('info', 'Global Market', `Global market ${enabled ? 'enabled' : 'disabled'}`);
    }

    getGlobalMarketStats() {
        return this.globalMarket ? this.globalMarket.getStats() : null;
    }

    getGlobalMarketPrices() {
        return this.globalMarket ? this.globalMarket.getMarketData() : [];
    }

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

    destroy() {
        if (this.hourlyInterval) {
            clearInterval(this.hourlyInterval);
        }
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
