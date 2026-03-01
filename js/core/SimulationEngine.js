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
// GlobalMarket removed - local suppliers only
import { TransactionLog } from '../core/TransactionLog.js';
import { ProductCostCalculator } from '../core/ProductCostCalculator.js';
import { LotRegistry } from '../core/Lot.js';
import { CityRetailDemandManager } from '../core/CityRetailDemandManager.js';
import { PurchaseManager } from './purchasing/PurchaseManager.js';
import { getLotSizeForProduct } from '../core/LotSizings.js';

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

        // Global Market System - REMOVED (local suppliers only)

        // Pending local deliveries (for transport time simulation)
        this.pendingLocalDeliveries = [];

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
                // Use new PurchaseManager system (set to false for legacy behavior)
                useNewSystem: true,
                // Enable contract-based purchasing
                enableContracts: true,
                // Enable supplier scoring with transport costs
                enableSupplierScoring: true,
                // Global market premium multiplier
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

        // Initialize city manager with countries and config
        this.cityManager = new CityManager(this.countries, this.config);
        this.cities = this.cityManager.generateInitialCities(); // Uses config.cities.initial

        // Generate corporations and build lookup Map
        this.corporations = this.generateCorporations();
        this.corporations.forEach(corp => this.corporationsById.set(corp.id, corp));

        // Generate firms (mining, logging, farms, manufacturing, retail, banks)
        this.generateFirms();

        // Wire up ContractManager to firms for production throttling
        this.wireContractManagerToFirms();

        // Auto-create supply contracts for manufacturers
        this.initializeSupplyContracts();

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

        // Derive corporation count from expected total firms and firmsPerCorp config
        const firmsPerCity = this.config.firms?.perCity ?? { min: 5, max: 10 };
        const avgFirmsPerCity = (firmsPerCity.min + firmsPerCity.max) / 2;
        const totalCities = this.config.cities?.initial ?? 8;
        const expectedTotalFirms = totalCities * avgFirmsPerCity;
        const firmsPerCorp = this.config.corporations?.firmsPerCorp ?? 4;
        const corpCount = Math.min(Math.max(Math.round(expectedTotalFirms / firmsPerCorp), 2), names.length);

        console.log(`📊 Corporations: ${corpCount} (from ~${expectedTotalFirms} expected firms, ${firmsPerCorp} firms/corp)`);

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

        // Shuffle names using seeded RNG to get variety across different configs
        const shuffled = [...names];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const selectedNames = shuffled.slice(0, corpCount);
        const colorStep = 360 / corpCount;

        return selectedNames.map((name, i) => ({
            id: i + 1,
            name: name,
            abbreviation: generateAbbreviation(name),
            character: characters[Math.floor(this.random() * characters.length)],
            cash: 0,
            revenue: 0,
            expenses: 0,
            profit: 0,
            monthlyRevenue: 0,
            monthlyExpenses: 0,
            monthlyProfit: 0,
            employees: 0,
            facilities: [],
            color: `hsl(${(i * colorStep) % 360}, 70%, 60%)`
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
        // Support both combined MANUFACTURING (split 50/50) or separate MANUFACTURING_SEMI/MANUFACTURING
        const mfgSemiPct = distributionConfig.MANUFACTURING_SEMI ?? (distributionConfig.MANUFACTURING ?? 0.25) / 2;
        const mfgFinalPct = distributionConfig.MANUFACTURING ?? (distributionConfig.MANUFACTURING_SEMI ? 0.15 : 0.25 / 2);

        const firmTypeTargets = {
            'MINING': Math.floor(totalFirmsTarget * (distributionConfig.MINING ?? 0.12)),
            'LOGGING': Math.floor(totalFirmsTarget * (distributionConfig.LOGGING ?? 0.08)),
            'FARM': Math.floor(totalFirmsTarget * (distributionConfig.FARM ?? 0.15)),
            'MANUFACTURING_SEMI': Math.floor(totalFirmsTarget * mfgSemiPct),
            'MANUFACTURING': Math.floor(totalFirmsTarget * (distributionConfig.MANUFACTURING_SEMI ? (distributionConfig.MANUFACTURING ?? 0.15) : mfgFinalPct)),
            'RETAIL': Math.floor(totalFirmsTarget * (distributionConfig.RETAIL ?? 0.25)),
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

        // Ensure product coverage - create firms for any products without producers
        this.ensureProductCoverage();

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

    ensureProductCoverage() {
        // Get all products that need producers
        const semiRawProducts = this.productRegistry.getProductsByTier('SEMI_RAW');
        const manufacturedProducts = this.productRegistry.getProductsByTier('MANUFACTURED');

        // Find which products are already being produced
        const producedProducts = new Set();
        this.firms.forEach(firm => {
            if (firm.type === 'MANUFACTURING' && firm.product) {
                producedProducts.add(firm.product.id);
            }
        });

        // Create firms for missing SEMI_RAW products
        const missingSemiRaw = semiRawProducts.filter(p => !producedProducts.has(p.id));
        // Create firms for missing MANUFACTURED products
        const missingManufactured = manufacturedProducts.filter(p => !producedProducts.has(p.id));

        if (missingSemiRaw.length > 0 || missingManufactured.length > 0) {
            console.log(`⚠️ Missing product coverage: ${missingSemiRaw.length} SEMI_RAW, ${missingManufactured.length} MANUFACTURED`);

            const citiesArray = Array.from(this.cities);
            let cityIndex = 0;

            // Create SEMI_RAW manufacturers for missing products
            missingSemiRaw.forEach(product => {
                const city = citiesArray[cityIndex % citiesArray.length];
                cityIndex++;
                const corp = this.corporations[Math.floor(this.random() * this.corporations.length)];
                const firmId = `FIRM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const firm = new ManufacturingPlant({ city: city }, city.country, product.id, this.productRegistry, firmId);
                firm.isSemiRawProducer = true;
                firm.corporationId = corp.id;
                firm.corporationAbbreviation = corp.abbreviation;
                firm.retailConfig = this.config.retail || { maxRetailQuantity: 3, purchaseChance: 0.3 };
                firm.lotRegistry = this.lotRegistry; // Connect to global lot registry
                firm.initializeLotSystem(); // Initialize lot-based inventory

                // Initialize inventory
                const weeklyHours = 24 * 7 * (this.config.inventory?.initialStockWeeks ?? 1);
                if (firm.product?.inputs) {
                    firm.product.inputs.forEach(input => {
                        const inventory = firm.rawMaterialInventory.get(input.material);
                        if (inventory) {
                            const hourlyUsage = input.quantity * (firm.productionLine?.outputPerHour || 10);
                            inventory.quantity = hourlyUsage * weeklyHours;
                            inventory.minRequired = hourlyUsage * 24 * 7 * (this.config.inventory?.reorderThresholdWeeks ?? 4);
                            inventory.capacity = Math.max(inventory.capacity, inventory.quantity * 2);
                        }
                    });
                }

                this.firms.set(firm.id, firm);
                corp.facilities.push(firm);
                console.log(`  + Created SEMI_RAW producer for: ${product.name}`);
            });

            // Create MANUFACTURED manufacturers for missing products
            missingManufactured.forEach(product => {
                const city = citiesArray[cityIndex % citiesArray.length];
                cityIndex++;
                const corp = this.corporations[Math.floor(this.random() * this.corporations.length)];
                const firmId = `FIRM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const firm = new ManufacturingPlant({ city: city }, city.country, product.id, this.productRegistry, firmId);
                firm.isSemiRawProducer = false;
                firm.corporationId = corp.id;
                firm.corporationAbbreviation = corp.abbreviation;
                firm.retailConfig = this.config.retail || { maxRetailQuantity: 3, purchaseChance: 0.3 };
                firm.lotRegistry = this.lotRegistry; // Connect to global lot registry
                firm.initializeLotSystem(); // Initialize lot-based inventory

                // Initialize inventory
                const weeklyHours = 24 * 7 * (this.config.inventory?.initialStockWeeks ?? 1);
                if (firm.product?.inputs) {
                    firm.product.inputs.forEach(input => {
                        const inventory = firm.rawMaterialInventory.get(input.material);
                        if (inventory) {
                            const hourlyUsage = input.quantity * (firm.productionLine?.outputPerHour || 10);
                            inventory.quantity = hourlyUsage * weeklyHours;
                            inventory.minRequired = hourlyUsage * 24 * 7 * (this.config.inventory?.reorderThresholdWeeks ?? 4);
                            inventory.capacity = Math.max(inventory.capacity, inventory.quantity * 2);
                        }
                    });
                }

                this.firms.set(firm.id, firm);
                corp.facilities.push(firm);
                console.log(`  + Created MANUFACTURED producer for: ${product.name}`);
            });

            console.log(`✅ Product coverage complete. Added ${missingSemiRaw.length + missingManufactured.length} firms.`);
        } else {
            console.log('✅ All products have at least one producer');
        }
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
                        firm = new MiningCompany({ city: city }, country, resource, firmId, this.productRegistry);
                    }
                    break;

                case 'LOGGING':
                    const timberTypes = ['Softwood Logs', 'Hardwood Logs', 'Bamboo'];
                    const timberType = timberTypes[Math.floor(this.random() * timberTypes.length)];
                    firm = new LoggingCompany({ city: city }, country, timberType, firmId, this.productRegistry);
                    break;

                case 'FARM':
                    const farmType = this.random() < 0.6 ? 'CROP' : 'LIVESTOCK';
                    firm = new Farm({ city: city }, country, farmType, firmId, this.productRegistry);
                    break;

                case 'MANUFACTURING_SEMI':
                    // Create manufacturers for SEMI_RAW products (Steel, Copper Wire, etc.)
                    const semiRawProducts = this.productRegistry.getProductsByTier('SEMI_RAW');
                    if (semiRawProducts.length > 0) {
                        const product = semiRawProducts[Math.floor(this.random() * semiRawProducts.length)];
                        firm = new ManufacturingPlant({ city: city }, country, product.id, this.productRegistry, firmId);
                        firm.isSemiRawProducer = true; // Mark as semi-raw producer
                        firm.lotRegistry = this.lotRegistry; // Connect to global lot registry
                        firm.initializeLotSystem(); // Initialize lot-based inventory

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
                        firm.lotRegistry = this.lotRegistry; // Connect to global lot registry
                        firm.initializeLotSystem(); // Initialize lot-based inventory

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
                    firm.retailConfig = this.config.retail || { maxRetailQuantity: 3, purchaseChance: 0.3 };
                    firm.productRegistry = this.productRegistry; // For necessityIndex lookups

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
            console.log('⏭️ Contract auto-creation disabled in config');
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

        // Track committed capacity per supplier (supplierId -> weekly committed volume)
        const supplierCommitments = new Map();

        // Helper to get supplier's max weekly production (with 10% buffer)
        const getSupplierWeeklyCapacity = (supplier) => {
            let dailyCapacity = 0;

            // Manufacturing plants
            if (supplier.productionLine?.outputPerHour) {
                dailyCapacity = supplier.productionLine.outputPerHour * 24;
            }
            // Mining companies
            else if (supplier.extractionRate) {
                dailyCapacity = supplier.extractionRate * 24;
            }
            // Logging companies
            else if (supplier.harvestRate) {
                dailyCapacity = supplier.harvestRate * 24;
            }
            // Farms
            else if (supplier.productionRate) {
                dailyCapacity = supplier.productionRate * 24;
            }
            // Default fallback
            else {
                dailyCapacity = 100; // Conservative default
            }

            // Weekly capacity with 10% buffer (only commit 90% of capacity)
            return dailyCapacity * 7 * 0.9;
        };

        // Get all manufacturing firms with input requirements
        const manufacturers = Array.from(this.firms.values()).filter(firm =>
            firm.type === 'MANUFACTURING' && firm.product?.inputs?.length > 0
        );

        console.log(`📋 Contract init: Found ${manufacturers.length} manufacturers with inputs`);

        for (const manufacturer of manufacturers) {
            for (const input of manufacturer.product.inputs) {
                // Calculate weekly volume need (70% coverage via contracts)
                const hourlyUsage = input.quantity * (manufacturer.productionLine?.outputPerHour || 10);
                const weeklyNeed = hourlyUsage * 24 * 7;
                let requestedVolume = Math.floor(weeklyNeed * 0.7);

                // Align to lot sizes - contracts should be in whole lots
                const lotSize = getLotSizeForProduct(input.material, this.productRegistry);
                if (lotSize > 0) {
                    // Round up to nearest lot, minimum 2 lots per week for efficiency
                    const lotsNeeded = Math.max(2, Math.ceil(requestedVolume / lotSize));
                    requestedVolume = lotsNeeded * lotSize;
                } else {
                    // No lot size defined, use minimum of 100
                    requestedVolume = Math.max(100, requestedVolume);
                }

                // Find best supplier using existing SupplierSelector
                // Note: requireInventory=false since suppliers haven't produced yet at init time
                // Note: forSpotPurchase=false since we're setting up contracts, not spot buying
                const selection = supplierSelector.selectBest({
                    buyer: manufacturer,
                    productName: input.material,
                    quantity: requestedVolume,
                    considerPrice: true,
                    considerTransport: true,
                    considerRelationship: true,
                    requireInventory: false,
                    forSpotPurchase: false
                });

                if (!selection?.supplier) {
                    noSupplierCount++;
                    continue; // No supplier found, rely on spot market
                }

                const supplier = selection.supplier;
                const supplierId = supplier.id;

                // Check supplier's available capacity
                const maxWeeklyCapacity = getSupplierWeeklyCapacity(supplier);
                const currentCommitment = supplierCommitments.get(supplierId) || 0;
                const availableCapacity = maxWeeklyCapacity - currentCommitment;

                if (availableCapacity <= 0) {
                    capacityLimitedCount++;
                    continue; // Supplier fully committed, skip
                }

                // Limit contract volume to available capacity (round down to whole lots)
                let contractVolume = Math.min(requestedVolume, Math.floor(availableCapacity));

                // Re-align to lot boundaries after capacity limiting
                if (lotSize > 0) {
                    const wholeLots = Math.floor(contractVolume / lotSize);
                    if (wholeLots < 2) {
                        capacityLimitedCount++;
                        continue; // Less than 2 lots per week - not worth a contract
                    }
                    contractVolume = wholeLots * lotSize;
                } else if (contractVolume < 100) {
                    capacityLimitedCount++;
                    continue; // Too small to be worth a contract
                }

                // Get base price for product
                const product = this.productRegistry.getProductByName(input.material);
                const basePrice = product?.basePrice || 50;
                const contractPrice = basePrice * 0.97; // 3% discount for contract commitment

                // Create the contract
                const contract = contractManager.createContract({
                    supplierId: supplierId,
                    buyerId: manufacturer.id,
                    product: input.material,
                    type: 'fixed_volume',
                    volumePerPeriod: contractVolume,
                    periodType: 'weekly',
                    pricePerUnit: contractPrice,
                    priceType: 'fixed',
                    minQuality: 0.5
                });

                if (contract) {
                    contractsCreated++;
                    // Track the commitment
                    supplierCommitments.set(supplierId, currentCommitment + contractVolume);
                }
            }
        }

        console.log(`✅ Auto-created ${contractsCreated} supply contracts for ${manufacturers.length} manufacturers`);
        console.log(`   📊 ${noSupplierCount} inputs had no supplier, ${capacityLimitedCount} limited by supplier capacity`);
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

        // Process pending local deliveries
        this.processLocalDeliveries();

        // Process contract deliveries that have arrived
        if (this.purchaseManager) {
            this.purchaseManager.processArrivedDeliveries();
        }

        // Hourly critical inventory check (for fast-moving goods)
        this.checkCriticalInventoryLevels();

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

        this.firms.forEach(firm => {
            if (firm.type === 'MANUFACTURING') {
                this.checkCriticalManufacturingInventory(firm, hourlyThresholdPct);
            } else if (firm.type === 'RETAIL') {
                this.checkCriticalRetailInventory(firm, hourlyThresholdPct);
            }
        });
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
     */
    checkCriticalRetailInventory(retailer, thresholdPct) {
        if (!retailer.productInventory || retailer.productInventory.size === 0) return;

        const retailConfig = this.config.retail?.inventory || {};
        const storeType = retailer.storeType || 'DEPARTMENT';
        const capacityByType = retailConfig.capacityByStoreType?.[storeType] || {};

        retailer.productInventory.forEach((inventory, productId) => {
            const product = this.productRegistry?.getProduct(productId);
            const productName = inventory.productName || product?.name || productId;
            const productCategory = product?.category || 'default';

            // Get capacity
            const capacity = capacityByType[productCategory] || capacityByType.default || inventory.capacity || 500;
            const criticalThreshold = capacity * thresholdPct;

            if (inventory.quantity < criticalThreshold) {
                // Urgent restock
                const urgentQuantity = Math.floor(capacity * 0.3); // Restock 30% of capacity
                if (urgentQuantity <= 0) return;

                // Check affordability
                const unitPrice = product?.basePrice || 100;
                const estimatedCost = urgentQuantity * unitPrice * 2;
                if (retailer.cash < estimatedCost * 0.3) return;

                // Try local purchase only (no global market fallback)
                this.tryLocalRetailPurchase(retailer, productId, productName, urgentQuantity);
            }
        });
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

    checkRetailInventory(retailer) {
        if (!retailer.productInventory || retailer.productInventory.size === 0) return;

        const retailConfig = this.config.retail?.inventory || {};
        const storeType = retailer.storeType || 'DEPARTMENT';
        const capacityByType = retailConfig.capacityByStoreType?.[storeType] || {};

        // Collect all products needing restock for bulk ordering
        const ordersNeeded = [];

        // Check each product in inventory
        retailer.productInventory.forEach((inventory, productId) => {
            const product = this.productRegistry?.getProduct(productId);
            const productName = inventory.productName || product?.name || productId;
            const productCategory = product?.category || 'default';

            // Get capacity based on store type and product category
            const capacity = capacityByType[productCategory] || capacityByType.default || inventory.capacity || 500;

            // Config-based thresholds
            const reorderThresholdPct = retailConfig.reorderThresholdPct || 0.25;
            const targetStockPct = retailConfig.targetStockPct || 0.85;
            const urgentThresholdPct = retailConfig.urgentThresholdPct || 0.10;

            const reorderThreshold = capacity * reorderThresholdPct;
            const targetStock = capacity * targetStockPct;
            const urgentThreshold = capacity * urgentThresholdPct;

            if (inventory.quantity < reorderThreshold) {
                // Calculate order quantity capped by reorderQuantityWeeks equivalent
                const maxOrderQty = capacity * 0.5; // Max 50% of capacity per order
                const orderQuantity = Math.floor(Math.min(targetStock - inventory.quantity, maxOrderQty));

                if (orderQuantity > 0) {
                    ordersNeeded.push({
                        productId,
                        productName,
                        product,
                        quantity: orderQuantity,
                        currentStock: inventory.quantity,
                        capacity,
                        isUrgent: inventory.quantity < urgentThreshold,
                        priority: inventory.quantity / reorderThreshold // Lower = more urgent
                    });
                }
            }
        });

        // Sort by priority (most urgent first) and process orders
        ordersNeeded.sort((a, b) => a.priority - b.priority);

        for (const order of ordersNeeded) {
            // Try to buy from local manufacturers only (no global market fallback)
            this.tryLocalRetailPurchase(retailer, order.productId, order.productName, order.quantity);
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

        // Try to find local producers for this material
        const allManufacturers = Array.from(this.firms.values()).filter(f => f.type === 'MANUFACTURING');
        const primaryProducers = Array.from(this.firms.values()).filter(f =>
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
     * Try to purchase finished goods from local manufacturers for retail
     * @param {Firm} buyer - The retail firm buying products
     * @param {number} productId - Product ID to buy
     * @param {string} productName - Name of the product
     * @param {number} quantity - Desired quantity
     * @returns {number} Actual quantity fulfilled
     */
    tryLocalRetailPurchase(buyer, productId, productName, quantity) {
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
            corp.employees = 0;
            corp.revenue = 0;
            corp.monthlyRevenue = 0;
            corp.profit = 0;
            corp.monthlyProfit = 0;
            corp.cash = 0;
            corp.expenses = 0;
            corp.monthlyExpenses = 0;
        });

        this.firms.forEach(firm => {
            const corp = this.corporationsById.get(firm.corporationId);
            if (corp) {
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

    processFirmOperations() {
        const currentHour = this.clock.hour;

        // Step 1: Non-retail firms produce
        this.firms.forEach(firm => {
            try {
                if (firm.type !== 'RETAIL') {
                    firm.produceHourly();
                }
            } catch (error) {
                console.error(`Error in production for firm ${firm.id}:`, error);
            }
        });

        // Step 2 & 3: Process purchasing and supply chain
        if (this.config.purchasing?.useNewSystem && this.purchaseManager) {
            // New unified purchasing system handles:
            // - Contract fulfillment
            // - Manufacturer purchasing with supplier scoring
            // - Retail restocking
            // - Competitive retail sales
            this.purchaseManager.processPurchasing(currentHour);
        } else {
            // Legacy system: separate retail and supply chain processing
            // Step 2: Process competitive retail sales using city-wide demand
            this.processCompetitiveRetailSales(currentHour);

            // Step 3: Process supply chain transactions
            this.processSupplyChain();
        }

        // Debug: Log supply chain stats every 24 hours (once per game day)
        if (this.dailyTick === 0) {
            this.logSupplyChainStats();
        }
    }

    /**
     * Process competitive retail sales using city-wide demand distribution
     * Replaces the old per-retailer sellHourly system
     */
    processCompetitiveRetailSales(currentHour) {
        if (!this.cityRetailDemandManager) return;

        // Process city-wide demand and distribute to retailers competitively
        const demandStats = this.cityRetailDemandManager.processCompetitiveRetailSales(currentHour);

        // Log retail sales for each retailer
        this.firms.forEach(firm => {
            if (firm.type === 'RETAIL') {
                const sales = firm.getPendingCompetitiveSales();
                if (sales && sales.length > 0) {
                    this.logCompetitiveRetailSales(firm, sales);
                }
            }
        });

        // Update stats
        this.stats.competitiveRetailDemand = demandStats.totalDemand;
        this.stats.competitiveRetailFulfilled = demandStats.fulfilledDemand;
        this.stats.competitiveRetailUnfulfilled = demandStats.unfulfilledDemand;

        // Log demand stats periodically (every 24 hours)
        if (this.dailyTick === 0 && demandStats.totalDemand > 0) {
            const fulfillmentRate = (demandStats.fulfilledDemand / demandStats.totalDemand * 100).toFixed(1);
            console.log(`📊 Retail Demand: ${demandStats.totalDemand} total, ${demandStats.fulfilledDemand} fulfilled (${fulfillmentRate}%)`);
        }
    }

    /**
     * Log sales from competitive retail system
     */
    logCompetitiveRetailSales(retailer, sales) {
        let totalRevenue = 0;
        let totalTransactions = 0;

        sales.forEach(sale => {
            this.transactionLog.logConsumerSale(
                retailer,
                sale.productName,
                sale.quantity,
                sale.unitPrice,
                sale.total,
                retailer.city?.name || 'Unknown'
            );
            totalRevenue += sale.total;
            totalTransactions++;
        });

        // Update stats
        this.stats.consumerSales = (this.stats.consumerSales || 0) + totalTransactions;
        this.stats.consumerRevenue = (this.stats.consumerRevenue || 0) + totalRevenue;
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

        // Helper: Categorize suppliers by location relative to buyer
        const categorizeSuppliers = (suppliers, buyerCity, buyerCountry) => {
            const local = [];
            const domestic = [];
            const international = [];

            suppliers.forEach(s => {
                const supplierCity = s.city?.name;
                const supplierCountry = s.city?.country?.name || s.country?.name;

                if (supplierCity === buyerCity) {
                    local.push(s);
                } else if (supplierCountry === buyerCountry) {
                    domestic.push(s);
                } else {
                    international.push(s);
                }
            });

            return { local, domestic, international };
        };

        // Helper: Select best supplier by location priority (local > domestic > international)
        const selectBestSupplier = (categorized, getInventoryQty) => {
            // Sort each group by inventory quantity (highest first)
            const sortByQty = arr => arr.sort((a, b) => getInventoryQty(b) - getInventoryQty(a));

            if (categorized.local.length > 0) {
                return { supplier: sortByQty(categorized.local)[0], source: 'local' };
            }
            if (categorized.domestic.length > 0) {
                return { supplier: sortByQty(categorized.domestic)[0], source: 'domestic' };
            }
            if (categorized.international.length > 0) {
                return { supplier: sortByQty(categorized.international)[0], source: 'international' };
            }
            return null;
        };

        // TIER 1: Primary producers sell RAW materials to SEMI_RAW manufacturers
        semiRawManufacturers.forEach(manufacturer => {
            if (!manufacturer.product || !manufacturer.product.inputs) return;

            const buyerCity = manufacturer.city?.name;
            const buyerCountry = manufacturer.city?.country?.name || manufacturer.country?.name;

            manufacturer.product.inputs.forEach(input => {
                const neededMaterial = input.material; // e.g., "Iron Ore", "Coal"
                const currentStock = manufacturer.rawMaterialInventory.get(neededMaterial);
                if (currentStock && currentStock.quantity >= currentStock.minRequired) return; // Already stocked

                const neededQuantity = Math.floor(input.quantity * 50); // Buy enough for ~50 hours

                // Find primary producers that produce this RAW material
                const allSuppliers = primaryProducers.filter(p => {
                    const producesType = p.resourceType || p.timberType || p.cropType || p.livestockType;
                    return producesType === neededMaterial && p.inventory && p.inventory.quantity > 0;
                });

                const categorized = categorizeSuppliers(allSuppliers, buyerCity, buyerCountry);
                const selection = selectBestSupplier(categorized, s => s.inventory?.quantity || 0);

                if (selection) {
                    this.executeTrade(selection.supplier, manufacturer, neededMaterial, neededQuantity);
                }
                // No global market fallback - local suppliers only
            });
        });

        // TIER 2: SEMI_RAW manufacturers sell to MANUFACTURED manufacturers
        finalManufacturers.forEach(manufacturer => {
            if (!manufacturer.product || !manufacturer.product.inputs) return;

            const buyerCity = manufacturer.city?.name;
            const buyerCountry = manufacturer.city?.country?.name || manufacturer.country?.name;

            manufacturer.product.inputs.forEach(input => {
                const neededMaterial = input.material; // e.g., "Steel", "Copper Wire"
                const currentStock = manufacturer.rawMaterialInventory.get(neededMaterial);
                if (currentStock && currentStock.quantity >= currentStock.minRequired) return;

                const neededQuantity = Math.floor(input.quantity * 50); // Buy enough for ~50 hours

                // Find SEMI_RAW manufacturers that produce this material
                const allSuppliers = semiRawManufacturers.filter(m => {
                    return m.product &&
                           m.product.name === neededMaterial &&
                           m.finishedGoodsInventory &&
                           m.finishedGoodsInventory.quantity > 0;
                });

                const categorized = categorizeSuppliers(allSuppliers, buyerCity, buyerCountry);
                const selection = selectBestSupplier(categorized, s => s.finishedGoodsInventory?.quantity || 0);

                if (selection) {
                    this.executeManufacturerToManufacturerTrade(selection.supplier, manufacturer, neededMaterial, neededQuantity);
                }
                // No global market fallback - local suppliers only
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

    /**
     * Execute a trade from semi-raw manufacturer to final manufacturer
     * Uses lot-based system for SEMI_RAW products
     * @returns {number} Actual quantity traded (0 if trade failed)
     */
    executeManufacturerToManufacturerTrade(seller, buyer, materialName, requestedQuantity) {
        // Get product info for minimum B2B quantity
        const product = seller.product || this.productRegistry.getProductByName(materialName);
        const price = product ? product.basePrice : 100;
        const minB2BQuantity = product ? product.minB2BQuantity : 1;

        // Calculate current game day for lot selection
        const gameTime = this.clock.getGameTime();
        const currentDay = gameTime.day + (gameTime.month - 1) * 30 + (gameTime.year - 2025) * 365;

        // Check if seller uses lot-based inventory (SEMI_RAW producer)
        let tradeQuantity = 0;
        let selectedLots = [];
        let avgQuality = 50;

        if (seller.lotInventory && seller.selectLotsForSale) {
            // Lot-based trade (all tiers: RAW, SEMI_RAW, MANUFACTURED)
            const selection = seller.selectLotsForSale(requestedQuantity, currentDay);

            if (selection.lots.length === 0) return 0;

            selectedLots = selection.lots;
            tradeQuantity = selection.totalQuantity;
            avgQuality = selection.avgQuality;

            // Enforce minimum B2B quantity
            if (tradeQuantity < minB2BQuantity) return 0;
        } else {
            // Legacy quantity-based trade (backward compatibility for firms without lot system)
            if (!seller.finishedGoodsInventory || seller.finishedGoodsInventory.quantity <= 0) return 0;

            const availableQuantity = seller.finishedGoodsInventory.quantity;
            if (availableQuantity < minB2BQuantity) return 0;

            tradeQuantity = Math.floor(Math.min(
                Math.max(requestedQuantity, minB2BQuantity),
                availableQuantity
            ));

            if (tradeQuantity < minB2BQuantity) return 0;
        }

        const productCost = tradeQuantity * price;

        // Calculate transportation cost and time
        let transportCost = 0;
        let transitHours = 0;
        let transportDetails = null;

        if (seller.city && buyer.city && this.cityManager?.transportation) {
            const route = this.cityManager.transportation.findOptimalRoute(
                seller.city, buyer.city, tradeQuantity, 'balanced'
            );

            if (route.optimalRoute) {
                transportCost = route.optimalRoute.baseCost || 0;
                transitHours = Math.ceil(route.optimalRoute.transitTime?.hours || 0);
                transportDetails = {
                    distance: route.distance,
                    mode: route.optimalRoute.type,
                    modeName: route.optimalRoute.typeName,
                    originCity: seller.city.name,
                    destinationCity: buyer.city.name
                };
            }
        }

        const totalCost = productCost + transportCost;

        // Check if buyer can afford (including transport)
        if (buyer.cash < totalCost) return 0;

        // Execute transaction
        if (selectedLots.length > 0) {
            // Transfer lots from seller
            const transferredLots = seller.transferLots(selectedLots, transitHours > 0 ? `DEL_${Date.now()}` : null);

            // Update seller financials
            seller.cash += totalCost;
            seller.revenue += totalCost;
            seller.monthlyRevenue += totalCost;
        } else {
            // Legacy quantity-based transfer
            seller.finishedGoodsInventory.quantity -= tradeQuantity;
            seller.cash += totalCost;
            seller.revenue += totalCost;
            seller.monthlyRevenue += totalCost;
        }

        buyer.cash -= totalCost;
        buyer.expenses += totalCost;

        // Track last B2B sale for excess inventory check
        seller.lastB2BSaleHour = this.clock.totalHours;
        seller.hasPendingDemand = true;

        // Track transaction
        this.hourlyTransactions.count++;
        this.hourlyTransactions.value += totalCost;

        // If transit time > 0, create pending delivery; otherwise immediate transfer
        if (transitHours > 0) {
            this.createPendingLocalDelivery({
                type: 'SEMI_TO_MANUFACTURED',
                seller: seller,
                buyer: buyer,
                materialName: materialName,
                quantity: tradeQuantity,
                productCost: productCost,
                transportCost: transportCost,
                transitHours: transitHours,
                deliveryHour: this.clock.totalHours + transitHours,
                transportDetails: transportDetails,
                lots: selectedLots.map(lot => lot.id),
                lotObjects: selectedLots, // Store actual lot objects for transfer
                avgQuality: avgQuality
            });
        } else {
            // Immediate delivery for same-city or zero-distance trades
            if (selectedLots.length > 0 && buyer.receiveLots) {
                // Lot-based transfer - pass actual lots to buyer
                selectedLots.forEach(lot => lot.markDelivered?.());
                buyer.receiveLots(materialName, selectedLots);
            } else if (buyer.rawMaterialInventory && buyer.rawMaterialInventory.has(materialName)) {
                // Fallback to quantity-based transfer
                const buyerInv = buyer.rawMaterialInventory.get(materialName);
                buyerInv.quantity += tradeQuantity;
            }
        }

        // Log detailed transaction
        this.transactionLog.logB2BTransaction(
            seller, buyer, materialName, tradeQuantity, price, totalCost, 'SEMI_TO_MANUFACTURED'
        );

        return tradeQuantity;
    }

    /**
     * Execute a trade from primary producer to manufacturer
     * Uses lot-based system for RAW materials
     * @returns {number} Actual quantity traded (0 if trade failed)
     */
    executeTrade(seller, buyer, materialName, requestedQuantity) {
        // Get product info by name
        const product = this.productRegistry.getProductByName(materialName);
        const price = product ? product.basePrice : 50;
        const minB2BQuantity = product ? product.minB2BQuantity : 1;

        // Calculate current game day for lot selection
        const gameTime = this.clock.getGameTime();
        const currentDay = gameTime.day + (gameTime.month - 1) * 30 + (gameTime.year - 2025) * 365;

        // Check if seller uses lot-based inventory
        let tradeQuantity = 0;
        let selectedLots = [];
        let avgQuality = 50;

        if (seller.lotInventory && seller.selectLotsForSale) {
            // Lot-based trade
            const selection = seller.selectLotsForSale(requestedQuantity, currentDay);

            if (selection.lots.length === 0) return 0;

            selectedLots = selection.lots;
            tradeQuantity = selection.totalQuantity;
            avgQuality = selection.avgQuality;

            // Enforce minimum B2B quantity
            if (tradeQuantity < minB2BQuantity) return 0;
        } else {
            // Legacy quantity-based trade (backward compatibility)
            if (!seller.inventory || seller.inventory.quantity <= 0) return 0;

            const availableQuantity = seller.inventory.quantity;
            if (availableQuantity < minB2BQuantity) return 0;

            tradeQuantity = Math.floor(Math.min(
                Math.max(requestedQuantity, minB2BQuantity),
                availableQuantity
            ));

            if (tradeQuantity < minB2BQuantity) return 0;
        }

        const productCost = tradeQuantity * price;

        // Calculate transportation cost and time
        let transportCost = 0;
        let transitHours = 0;
        let transportDetails = null;

        if (seller.city && buyer.city && this.cityManager?.transportation) {
            const route = this.cityManager.transportation.findOptimalRoute(
                seller.city, buyer.city, tradeQuantity, 'balanced'
            );

            if (route.optimalRoute) {
                transportCost = route.optimalRoute.baseCost || 0;
                transitHours = Math.ceil(route.optimalRoute.transitTime?.hours || 0);
                transportDetails = {
                    distance: route.distance,
                    mode: route.optimalRoute.type,
                    modeName: route.optimalRoute.typeName,
                    originCity: seller.city.name,
                    destinationCity: buyer.city.name
                };
            }
        }

        const totalCost = productCost + transportCost;

        // Check if buyer can afford (including transport)
        if (buyer.cash < totalCost) return 0;

        // Execute transaction
        if (selectedLots.length > 0) {
            // Transfer lots from seller
            const transferredLots = seller.transferLots(selectedLots, transitHours > 0 ? `DEL_${Date.now()}` : null);

            // Update seller financials
            seller.cash += totalCost;
            seller.revenue += totalCost;
            seller.monthlyRevenue += totalCost;
        } else {
            // Legacy quantity-based transfer
            seller.inventory.quantity -= tradeQuantity;
            seller.cash += totalCost;
            seller.revenue += totalCost;
            seller.monthlyRevenue += totalCost;
        }

        buyer.cash -= totalCost;
        buyer.expenses += totalCost;

        // Track last B2B sale for excess inventory check
        seller.lastB2BSaleHour = this.clock.totalHours;
        seller.hasPendingDemand = true;

        // Track transaction for market activity
        this.hourlyTransactions.count++;
        this.hourlyTransactions.value += totalCost;

        // If transit time > 0, create pending delivery; otherwise immediate transfer
        if (transitHours > 0) {
            this.createPendingLocalDelivery({
                type: 'RAW_TO_SEMI',
                seller: seller,
                buyer: buyer,
                materialName: materialName,
                quantity: tradeQuantity,
                productCost: productCost,
                transportCost: transportCost,
                transitHours: transitHours,
                deliveryHour: this.clock.totalHours + transitHours,
                transportDetails: transportDetails,
                lots: selectedLots.map(lot => lot.id),
                lotObjects: selectedLots, // Store actual lot objects for transfer
                avgQuality: avgQuality
            });
        } else {
            // Immediate delivery for same-city or zero-distance trades
            if (selectedLots.length > 0 && buyer.receiveLots) {
                // Lot-based transfer - pass actual lots to buyer
                selectedLots.forEach(lot => lot.markDelivered?.());
                buyer.receiveLots(materialName, selectedLots);
            } else if (buyer.rawMaterialInventory && buyer.rawMaterialInventory.has(materialName)) {
                // Fallback to quantity-based transfer
                const buyerInv = buyer.rawMaterialInventory.get(materialName);
                buyerInv.quantity += tradeQuantity;
            }
        }

        // Log detailed transaction
        this.transactionLog.logB2BTransaction(
            seller, buyer, materialName, tradeQuantity, price, totalCost, 'RAW_TO_SEMI'
        );

        return tradeQuantity;
    }

    /**
     * Execute a retail purchase from manufacturer
     * @param {Firm} manufacturer - The manufacturing firm selling
     * @param {Firm} retailer - The retail firm buying
     * @param {number} productIdParam - Optional product ID (if known)
     * @param {string} productNameParam - Optional product name (if known)
     * @param {number} quantity - Requested quantity
     * @returns {number} Actual quantity traded (0 if trade failed)
     */
    executeRetailPurchase(manufacturer, retailer, productIdParam, productNameParam, quantity) {
        // Handle legacy calls with just 3 args (manufacturer, retailer, quantity)
        let actualQuantity = quantity;
        let actualProductId = productIdParam;
        let actualProductName = productNameParam;

        if (typeof productIdParam === 'number' && productNameParam === undefined && quantity === undefined) {
            // Legacy call: executeRetailPurchase(manufacturer, retailer, quantity)
            actualQuantity = productIdParam;
            actualProductId = null;
            actualProductName = null;
        }

        // Get product info
        const product = manufacturer.product;
        const productId = actualProductId || product?.id || manufacturer.productType || 'generic';
        const productName = actualProductName || product?.name || manufacturer.productType || 'Unknown Product';
        const minB2BQuantity = product?.minB2BQuantity || 1;

        // Check if retailer can sell this type of product
        if (productId && !retailer.canSellProductById(productId, this.productRegistry)) {
            return 0; // Retailer doesn't sell this category of product
        }

        // Calculate current game day for lot selection
        const gameTime = this.clock.getGameTime();
        const currentDay = gameTime.day + (gameTime.month - 1) * 30 + (gameTime.year - 2025) * 365;

        // Check if manufacturer uses lot-based inventory
        let tradeQuantity = 0;
        let selectedLots = [];
        let avgQuality = 50;

        if (manufacturer.lotInventory && manufacturer.selectLotsForSale) {
            // Lot-based trade
            const selection = manufacturer.selectLotsForSale(actualQuantity, currentDay);

            if (selection.lots.length === 0) return 0;

            selectedLots = selection.lots;
            tradeQuantity = selection.totalQuantity;
            avgQuality = selection.avgQuality;

            // Enforce minimum B2B quantity
            if (tradeQuantity < minB2BQuantity) return 0;
        } else {
            // Legacy quantity-based trade (backward compatibility)
            if (!manufacturer.finishedGoodsInventory || manufacturer.finishedGoodsInventory.quantity <= 0) return 0;

            const availableQuantity = manufacturer.finishedGoodsInventory.quantity;
            if (availableQuantity < minB2BQuantity) return 0;

            tradeQuantity = Math.floor(Math.min(
                Math.max(actualQuantity, minB2BQuantity),
                availableQuantity
            ));

            if (tradeQuantity < minB2BQuantity) return 0;
        }

        // Calculate price based on production cost + markup (quality adjusted)
        const costPerUnit = manufacturer.calculateProductionCost ? manufacturer.calculateProductionCost() : 100;
        const qualityMultiplier = avgQuality / 50;
        const wholesalePrice = costPerUnit * 1.2 * Math.sqrt(qualityMultiplier); // 20% markup, quality adjusted
        const productCost = tradeQuantity * wholesalePrice;

        // Calculate transportation cost and time
        let transportCost = 0;
        let transitHours = 0;
        let transportDetails = null;

        if (manufacturer.city && retailer.city && this.cityManager?.transportation) {
            const route = this.cityManager.transportation.findOptimalRoute(
                manufacturer.city, retailer.city, tradeQuantity, 'balanced'
            );

            if (route.optimalRoute) {
                transportCost = route.optimalRoute.baseCost || 0;
                transitHours = Math.ceil(route.optimalRoute.transitTime?.hours || 0);
                transportDetails = {
                    distance: route.distance,
                    mode: route.optimalRoute.type,
                    modeName: route.optimalRoute.typeName,
                    originCity: manufacturer.city.name,
                    destinationCity: retailer.city.name
                };
            }
        }

        const totalCost = productCost + transportCost;

        // Check if retailer can afford (including transport)
        if (retailer.cash < totalCost) return 0;

        // Transfer lots from manufacturer
        if (selectedLots.length > 0) {
            const transferredLots = manufacturer.transferLots(selectedLots, transitHours > 0 ? `DEL_${Date.now()}` : null);

            // Update manufacturer financials
            manufacturer.cash += totalCost;
            manufacturer.revenue += totalCost;
            manufacturer.monthlyRevenue += totalCost;
        } else {
            // Legacy quantity-based transfer
            manufacturer.finishedGoodsInventory.quantity -= tradeQuantity;
            manufacturer.cash += totalCost;
            manufacturer.revenue += totalCost;
            manufacturer.monthlyRevenue += totalCost;
        }

        // For immediate delivery
        if (transitHours <= 0) {
            if (selectedLots.length > 0 && retailer.receiveLots) {
                // Lot-based transfer to retailer
                selectedLots.forEach(lot => lot.markDelivered?.());
                retailer.receiveLots(productId, productName, selectedLots, wholesalePrice);
            } else {
                // Legacy: Add to retailer inventory
                const purchaseSuccess = retailer.purchaseInventory(productId, tradeQuantity, wholesalePrice, productName);
                if (!purchaseSuccess) {
                    return 0; // Retailer couldn't complete purchase
                }
            }
            // Handle cash for retailer
            retailer.cash -= totalCost;
            retailer.expenses += totalCost;
        } else {
            // Deferred delivery - handle cash manually, inventory added later
            retailer.cash -= totalCost;
            retailer.expenses += totalCost;

            this.createPendingLocalDelivery({
                type: 'RETAIL_PURCHASE',
                seller: manufacturer,
                buyer: retailer,
                productId: productId,
                productName: productName,
                quantity: tradeQuantity,
                wholesalePrice: wholesalePrice,
                productCost: productCost,
                transportCost: transportCost,
                transitHours: transitHours,
                deliveryHour: this.clock.totalHours + transitHours,
                transportDetails: transportDetails,
                lots: selectedLots.map(lot => lot.id),
                lotObjects: selectedLots, // Store actual lot objects for transfer
                avgQuality: avgQuality
            });
        }

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

        return tradeQuantity;
    }

    /**
     * Create a pending local delivery for transport time simulation
     */
    createPendingLocalDelivery(deliveryData) {
        const delivery = {
            id: `LOCAL_DEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...deliveryData,
            status: 'IN_TRANSIT',
            createdAt: this.clock.totalHours
        };
        this.pendingLocalDeliveries.push(delivery);
        return delivery;
    }

    /**
     * Process pending local deliveries - called each hour
     * Completes deliveries when their transit time has elapsed
     */
    processLocalDeliveries() {
        const currentHour = this.clock.totalHours;
        const delivered = [];
        const failed = [];

        this.pendingLocalDeliveries = this.pendingLocalDeliveries.filter(delivery => {
            // Check for stuck deliveries (NaN or invalid deliveryHour)
            if (isNaN(delivery.deliveryHour) || delivery.deliveryHour === undefined) {
                console.error(`Stuck delivery detected: invalid deliveryHour`, delivery.id);
                delivery.status = 'FAILED';
                delivery.failureReason = 'INVALID_DELIVERY_HOUR';
                failed.push(delivery);
                return false;
            }

            // Check for excessively old deliveries (stuck for > 720 hours / 30 days)
            const age = currentHour - (delivery.createdAt || 0);
            if (age > 720 && currentHour < delivery.deliveryHour) {
                console.warn(`Delivery stuck for ${age} hours, forcing completion`, delivery.id);
                delivery.deliveryHour = currentHour; // Force completion
            }

            if (currentHour >= delivery.deliveryHour) {
                try {
                    this.completeLocalDelivery(delivery);
                    delivered.push(delivery);
                } catch (error) {
                    console.error(`Error completing delivery ${delivery.id}:`, error);
                    delivery.status = 'FAILED';
                    delivery.failureReason = error.message;
                    failed.push(delivery);
                }
                return false;
            }
            return true;
        });

        return { delivered, failed };
    }

    /**
     * Complete a local delivery - transfer inventory to buyer
     */
    completeLocalDelivery(delivery) {
        const { buyer, materialName, quantity, type, productId, productName, wholesalePrice, lots, lotObjects, avgQuality } = delivery;

        // Validate buyer still exists
        if (!buyer || !this.firms.has(buyer.id)) {
            console.warn(`Delivery failed: buyer ${buyer?.id || 'unknown'} no longer exists`);
            delivery.status = 'FAILED';
            delivery.failureReason = 'BUYER_NOT_FOUND';
            // Release lots back to available if possible
            if (lots && lots.length > 0) {
                lots.forEach(lotId => {
                    const lot = this.lotRegistry.getLot(lotId);
                    if (lot) {
                        lot.releaseReservation();
                    }
                });
            }
            return;
        }

        if (type === 'RAW_TO_SEMI' || type === 'SEMI_TO_MANUFACTURED') {
            // B2B trade - transfer lots or quantity to buyer's raw material inventory

            // Mark lots as delivered
            if (lots && lots.length > 0) {
                lots.forEach(lotId => {
                    const lot = this.lotRegistry.getLot(lotId);
                    if (lot) {
                        lot.markDelivered();
                    }
                });
            }

            // Transfer using lot-based system if buyer supports it
            if (lotObjects && lotObjects.length > 0 && buyer.receiveLots) {
                // Lot-based transfer - pass actual lots to buyer
                buyer.receiveLots(materialName, lotObjects);
            } else if (buyer.rawMaterialInventory && buyer.rawMaterialInventory.has(materialName)) {
                // Fallback to quantity-based transfer
                const buyerInv = buyer.rawMaterialInventory.get(materialName);
                buyerInv.quantity += quantity;
                // Update average quality if available
                if (avgQuality && buyer.receiveQuantity) {
                    buyer.receiveQuantity(materialName, quantity, avgQuality);
                }
            }
        } else if (type === 'RETAIL_PURCHASE') {
            // Retail purchase - add to retailer's inventory
            // Note: Cash was already deducted at order time, so we just add inventory

            // Mark lots as delivered
            if (lots && lots.length > 0) {
                lots.forEach(lotId => {
                    const lot = this.lotRegistry.getLot(lotId);
                    if (lot) {
                        lot.markDelivered();
                    }
                });
            }

            // Transfer using lot-based system if buyer supports it
            if (lotObjects && lotObjects.length > 0 && buyer.receiveLots) {
                // Lot-based transfer to retailer
                buyer.receiveLots(productId, productName, lotObjects, wholesalePrice);
            } else if (buyer.productInventory) {
                // Fallback: use productInventory Map (RetailStore)
                buyer.receiveDelivery(productId, quantity, wholesalePrice, productName);
            } else if (buyer.inventory) {
                // Legacy fallback: use inventory array
                const existingItem = buyer.inventory.find(item => item.productId === productId);
                if (existingItem) {
                    existingItem.quantity += quantity;
                } else {
                    buyer.inventory.push({
                        productId: productId,
                        productName: productName,
                        quantity: quantity,
                        purchasePrice: wholesalePrice
                    });
                }
            }
        }

        delivery.status = 'DELIVERED';
        delivery.deliveredAt = this.clock.totalHours;
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
