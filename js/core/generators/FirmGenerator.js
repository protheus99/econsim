// js/core/generators/FirmGenerator.js
// Extracted from SimulationEngine.js to reduce file size

import { MiningCompany } from '../firms/MiningCompany.js';
import { LoggingCompany } from '../firms/LoggingCompany.js';
import { Farm } from '../firms/Farm.js';
import { ManufacturingPlant } from '../firms/ManufacturingPlant.js';
import { RetailStore } from '../firms/RetailStore.js';
import { Bank } from '../firms/Bank.js';

/**
 * Handles generation of corporations and firms for the simulation
 */
export class FirmGenerator {
    /**
     * @param {Object} engine - Reference to SimulationEngine
     */
    constructor(engine) {
        this.engine = engine;
    }

    // Delegate to engine's random for seeded RNG
    random() {
        return this.engine.random();
    }

    /**
     * Generate corporations based on config
     * @returns {Array} Array of corporation objects
     */
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

        const config = this.engine.config;
        const firmsPerCity = config.firms?.perCity ?? { min: 5, max: 10 };
        const avgFirmsPerCity = (firmsPerCity.min + firmsPerCity.max) / 2;
        const totalCities = config.cities?.initial ?? 8;
        const expectedTotalFirms = totalCities * avgFirmsPerCity;
        const firmsPerCorp = config.corporations?.firmsPerCorp ?? 4;
        const corpCount = Math.min(Math.max(Math.round(expectedTotalFirms / firmsPerCorp), 2), names.length);

        console.log(`📊 Corporations: ${corpCount} (from ~${expectedTotalFirms} expected firms, ${firmsPerCorp} firms/corp)`);

        const generateAbbreviation = (name) => {
            const words = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
            if (words.length >= 3) {
                return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
            } else if (words.length === 2) {
                return (words[0][0] + words[1].substring(0, 2)).toUpperCase();
            } else {
                return words[0].substring(0, 3).toUpperCase();
            }
        };

        // Shuffle names using seeded RNG
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

    /**
     * Generate all firms across cities
     */
    generateFirms() {
        const config = this.engine.config;
        const firmsPerCityConfig = config.firms?.perCity ?? { min: 5, max: 10 };
        const distributionConfig = config.firms?.distribution ?? {
            MINING: 0.15, LOGGING: 0.10, FARM: 0.20, MANUFACTURING: 0.25, RETAIL: 0.20, BANK: 0.10
        };

        const avgFirmsPerCity = (firmsPerCityConfig.min + firmsPerCityConfig.max) / 2;
        const totalFirmsTarget = this.engine.cities.length * avgFirmsPerCity;

        const mfgSemiPct = distributionConfig.MANUFACTURING_SEMI ?? (distributionConfig.MANUFACTURING ?? 0.25) / 2;
        const mfgFinalPct = distributionConfig.MANUFACTURING ?? (distributionConfig.MANUFACTURING_SEMI ? 0.15 : 0.25 / 2);

        let corpIndex = 0;
        const minFirms = firmsPerCityConfig.min;
        const maxFirms = firmsPerCityConfig.max;
        const firmRange = maxFirms - minFirms + 1;

        for (const city of this.engine.cities) {
            const country = city.country;
            const firmsForThisCity = minFirms + Math.floor(this.random() * firmRange);

            for (let i = 0; i < firmsForThisCity; i++) {
                const corp = this.engine.corporations[corpIndex % this.engine.corporations.length];
                corpIndex++;

                try {
                    this.generateRandomFirm(city, country, corp);
                } catch (error) {
                    console.error(`Error creating firm in ${city.name}:`, error);
                }
            }
        }

        console.log(`✅ Generated ${this.engine.firms.size} firms across ${this.engine.cities.length} cities`);

        // Ensure product coverage
        this.ensureProductCoverage();

        // Log distribution
        const typeCount = {};
        this.engine.firms.forEach(firm => {
            typeCount[firm.type] = (typeCount[firm.type] || 0) + 1;
        });
    }

    /**
     * Ensure all products have at least one producer
     */
    ensureProductCoverage() {
        const productRegistry = this.engine.productRegistry;
        const semiRawProducts = productRegistry.getProductsByTier('SEMI_RAW');
        const manufacturedProducts = productRegistry.getProductsByTier('MANUFACTURED');

        const producedProducts = new Set();
        this.engine.firms.forEach(firm => {
            if (firm.type === 'MANUFACTURING' && firm.product) {
                producedProducts.add(firm.product.id);
            }
        });

        const missingSemiRaw = semiRawProducts.filter(p => !producedProducts.has(p.id));
        const missingManufactured = manufacturedProducts.filter(p => !producedProducts.has(p.id));

        if (missingSemiRaw.length > 0 || missingManufactured.length > 0) {
            console.log(`⚠️ Missing product coverage: ${missingSemiRaw.length} SEMI_RAW, ${missingManufactured.length} MANUFACTURED`);

            const citiesArray = Array.from(this.engine.cities);
            let cityIndex = 0;

            // Create SEMI_RAW manufacturers
            missingSemiRaw.forEach(product => {
                const city = citiesArray[cityIndex % citiesArray.length];
                cityIndex++;
                this.createManufacturerForProduct(city, product, true);
                console.log(`  + Created SEMI_RAW producer for: ${product.name}`);
            });

            // Create MANUFACTURED manufacturers
            missingManufactured.forEach(product => {
                const city = citiesArray[cityIndex % citiesArray.length];
                cityIndex++;
                this.createManufacturerForProduct(city, product, false);
                console.log(`  + Created MANUFACTURED producer for: ${product.name}`);
            });

            console.log(`✅ Product coverage complete. Added ${missingSemiRaw.length + missingManufactured.length} firms.`);
        } else {
            console.log('✅ All products have at least one producer');
        }
    }

    /**
     * Create a manufacturer for a specific product
     */
    createManufacturerForProduct(city, product, isSemiRaw) {
        const corp = this.engine.corporations[Math.floor(this.random() * this.engine.corporations.length)];
        const firmId = this.engine.generateDeterministicId('FIRM', this.engine.firmCreationIndex++);
        const config = this.engine.config;

        const firm = new ManufacturingPlant({ city: city }, city.country, product.id, this.engine.productRegistry, firmId);
        firm.engine = this.engine; // Set engine reference for clock access
        firm.isSemiRawProducer = isSemiRaw;
        firm.corporationId = corp.id;
        firm.corporationAbbreviation = corp.abbreviation;
        firm.retailConfig = config.retail || { maxRetailQuantity: 3, purchaseChance: 0.3 };
        firm.lotRegistry = this.engine.lotRegistry;
        firm.initializeLotSystem();

        // Initialize inventory
        const weeklyHours = 24 * 7 * (config.inventory?.initialStockWeeks ?? 1);
        if (firm.product?.inputs) {
            firm.product.inputs.forEach(input => {
                const inventory = firm.rawMaterialInventory.get(input.material);
                if (inventory) {
                    const hourlyUsage = input.quantity * (firm.productionLine?.outputPerHour || 10);
                    inventory.quantity = hourlyUsage * weeklyHours;
                    inventory.minRequired = hourlyUsage * 24 * 7 * (config.inventory?.reorderThresholdWeeks ?? 4);
                    inventory.capacity = Math.max(inventory.capacity, inventory.quantity * 2);
                }
            });
        }

        this.engine.firms.set(firm.id, firm);
        corp.facilities.push(firm);
    }

    /**
     * Generate a random firm based on weighted probabilities
     */
    generateRandomFirm(city, country, corporation = null) {
        const firmTypes = ['MINING', 'LOGGING', 'FARM', 'MANUFACTURING_SEMI', 'MANUFACTURING', 'RETAIL', 'BANK'];
        const weights = [0.15, 0.10, 0.20, 0.15, 0.15, 0.15, 0.10];

        const type = this.weightedRandomChoice(firmTypes, weights);
        let firm = null;

        const firmId = this.engine.generateDeterministicId('FIRM', this.engine.firmCreationIndex++);
        const config = this.engine.config;
        const productRegistry = this.engine.productRegistry;

        try {
            switch (type) {
                case 'MINING':
                    firm = this.createMiningFirm(city, country, firmId);
                    break;

                case 'LOGGING':
                    firm = this.createLoggingFirm(city, country, firmId);
                    break;

                case 'FARM':
                    firm = this.createFarmFirm(city, country, firmId);
                    break;

                case 'MANUFACTURING_SEMI':
                    firm = this.createManufacturingFirm(city, country, firmId, true);
                    break;

                case 'MANUFACTURING':
                    firm = this.createManufacturingFirm(city, country, firmId, false);
                    break;

                case 'RETAIL':
                    firm = this.createRetailFirm(city, country, firmId);
                    break;

                case 'BANK':
                    firm = this.createBankFirm(city, country, firmId);
                    break;
            }

            if (firm) {
                this.registerFirm(firm, city, corporation);
            }
        } catch (error) {
            console.error(`Error creating ${type} firm:`, error);
        }
    }

    createMiningFirm(city, country, firmId) {
        const validMiningResources = ['Iron Ore', 'Copper Ore', 'Coal', 'Gold Ore', 'Silver Ore',
                                      'Aluminum Ore', 'Limestone', 'Salt', 'Crude Oil', 'Natural Gas'];
        const miningResources = country.resources.filter(r => validMiningResources.includes(r));
        if (miningResources.length > 0) {
            const resource = miningResources[Math.floor(this.random() * miningResources.length)];
            const firm = new MiningCompany({ city: city }, country, resource, firmId, this.engine.productRegistry);
            firm.engine = this.engine; // Set engine reference for clock access
            return firm;
        }
        return null;
    }

    createLoggingFirm(city, country, firmId) {
        const timberTypes = ['Softwood Logs', 'Hardwood Logs', 'Bamboo'];
        const timberType = timberTypes[Math.floor(this.random() * timberTypes.length)];
        const firm = new LoggingCompany({ city: city }, country, timberType, firmId, this.engine.productRegistry);
        firm.engine = this.engine; // Set engine reference for clock access
        return firm;
    }

    createFarmFirm(city, country, firmId) {
        const farmType = this.random() < 0.6 ? 'CROP' : 'LIVESTOCK';
        const firm = new Farm({ city: city }, country, farmType, firmId, this.engine.productRegistry);
        firm.engine = this.engine; // Set engine reference for clock access
        return firm;
    }

    createManufacturingFirm(city, country, firmId, isSemiRaw) {
        const config = this.engine.config;
        const productRegistry = this.engine.productRegistry;
        const tier = isSemiRaw ? 'SEMI_RAW' : 'MANUFACTURED';
        const products = productRegistry.getProductsByTier(tier);

        if (products.length > 0) {
            const product = products[Math.floor(this.random() * products.length)];
            const firm = new ManufacturingPlant({ city: city }, country, product.id, productRegistry, firmId);
            firm.engine = this.engine; // Set engine reference for clock access
            firm.isSemiRawProducer = isSemiRaw;
            firm.lotRegistry = this.engine.lotRegistry;
            firm.initializeLotSystem();

            // Initialize with raw materials
            const weeklyHours = 24 * 7 * config.inventory.initialStockWeeks;
            if (firm.product?.inputs) {
                firm.product.inputs.forEach(input => {
                    const inventory = firm.rawMaterialInventory.get(input.material);
                    if (inventory) {
                        const hourlyUsage = input.quantity * (firm.productionLine?.outputPerHour || 10);
                        inventory.quantity = hourlyUsage * weeklyHours;
                        inventory.minRequired = hourlyUsage * 24 * 7 * config.inventory.reorderThresholdWeeks;
                        inventory.capacity = Math.max(inventory.capacity, inventory.quantity * 2);
                    }
                });
            }
            return firm;
        }
        return null;
    }

    createRetailFirm(city, country, firmId) {
        const config = this.engine.config;
        const productRegistry = this.engine.productRegistry;

        const storeTypes = [
            'SUPERMARKET', 'SUPERMARKET_GROCERY', 'SUPERMARKET_PHARMACY',
            'DEPARTMENT', 'DEPARTMENT_HOME', 'DEPARTMENT_FASHION',
            'ELECTRONICS',
            'FURNITURE', 'FURNITURE_LIVING', 'FURNITURE_BEDROOM',
            'FASHION', 'FASHION_BOUTIQUE',
            'HARDWARE', 'AUTO', 'PHARMACY', 'BABY', 'TOYS'
        ];
        const storeType = storeTypes[Math.floor(this.random() * storeTypes.length)];
        const firm = new RetailStore({ city: city }, country, storeType, firmId);
        firm.engine = this.engine; // Set engine reference for clock access
        firm.retailConfig = config.retail || { maxRetailQuantity: 3, purchaseChance: 0.3 };
        firm.productRegistry = productRegistry;

        // Initialize with products - prefer unsaturated products
        const allProducts = productRegistry.getAllProducts();
        const allowedProducts = allProducts.filter(p => firm.canSellProduct(p.category));

        if (allowedProducts.length > 0) {
            this.initializeRetailInventory(firm, city, firmId, allowedProducts);
        }

        return firm;
    }

    initializeRetailInventory(firm, city, firmId, allowedProducts) {
        const config = this.engine.config;
        const cityId = city.id;

        if (!this.engine.cityProductRetailers.has(cityId)) {
            this.engine.cityProductRetailers.set(cityId, new Map());
        }
        const cityProductMap = this.engine.cityProductRetailers.get(cityId);

        const maxRetailersPerProduct = config.retail?.maxRetailersPerProductPerCity ?? 3;
        const unsaturatedPreference = config.retail?.unsaturatedProductPreference ?? 0.7;

        // Separate products into saturated and unsaturated
        const unsaturatedProducts = [];
        const saturatedProducts = [];

        for (const product of allowedProducts) {
            const productRetailers = cityProductMap.get(product.id);
            const retailerCount = productRetailers ? productRetailers.size : 0;

            if (retailerCount < maxRetailersPerProduct) {
                unsaturatedProducts.push(product);
            } else {
                saturatedProducts.push(product);
            }
        }

        const numProducts = Math.min(5 + Math.floor(this.random() * 10), allowedProducts.length);
        const selectedProducts = new Set();

        // First, fill with unsaturated products
        const unsaturatedTarget = Math.floor(numProducts * unsaturatedPreference);
        while (selectedProducts.size < unsaturatedTarget && unsaturatedProducts.length > 0) {
            const idx = Math.floor(this.random() * unsaturatedProducts.length);
            const product = unsaturatedProducts[idx];
            if (!selectedProducts.has(product.id)) {
                selectedProducts.add(product.id);
                const quantity = 50 + Math.floor(this.random() * 150);
                const wholesalePrice = product.basePrice * 0.7;
                firm.purchaseInventory(product.id, quantity, wholesalePrice, product.name, product.category);

                if (!cityProductMap.has(product.id)) {
                    cityProductMap.set(product.id, new Set());
                }
                cityProductMap.get(product.id).add(firmId);

                if (cityProductMap.get(product.id).size >= maxRetailersPerProduct) {
                    unsaturatedProducts.splice(idx, 1);
                }
            }
        }

        // Fill remaining with any available products
        const remainingPool = [...unsaturatedProducts, ...saturatedProducts];
        while (selectedProducts.size < numProducts && remainingPool.length > 0) {
            const idx = Math.floor(this.random() * remainingPool.length);
            const product = remainingPool[idx];
            if (!selectedProducts.has(product.id)) {
                selectedProducts.add(product.id);
                const quantity = 50 + Math.floor(this.random() * 150);
                const wholesalePrice = product.basePrice * 0.7;
                firm.purchaseInventory(product.id, quantity, wholesalePrice, product.name, product.category);

                if (!cityProductMap.has(product.id)) {
                    cityProductMap.set(product.id, new Set());
                }
                cityProductMap.get(product.id).add(firmId);
            }
            remainingPool.splice(idx, 1);
        }
    }

    createBankFirm(city, country, firmId) {
        const bankTypes = ['COMMERCIAL', 'INVESTMENT'];
        const bankType = bankTypes[Math.floor(this.random() * bankTypes.length)];
        const firm = new Bank({ city: city }, country, bankType, firmId);
        firm.engine = this.engine; // Set engine reference for clock access
        return firm;
    }

    registerFirm(firm, city, corporation) {
        const corp = corporation || this.engine.corporations[Math.floor(this.random() * this.engine.corporations.length)];
        firm.corporationId = corp.id;
        firm.corporationAbbreviation = corp.abbreviation;

        // Support both legacy corporation objects and new Corporation class
        if (typeof corp.addFirm === 'function') {
            // New Corporation class with organic growth
            corp.addFirm(firm);
        } else {
            // Legacy corporation object
            corp.facilities = corp.facilities || [];
            corp.facilities.push(firm);
            corp.employees = (corp.employees || 0) + firm.totalEmployees;
        }

        this.engine.firms.set(firm.id, firm);
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
}
