// js/core/corporations/CorporationManager.js
// Manages corporations, board meetings, and organic firm creation

import { Corporation, CORPORATION_TYPES, INDUSTRY_TIERS, GOAL_TYPES } from './Corporation.js';
import { DECISION_TYPES, determineEconomicPhase, FIRM_CREATION_TIMELINE, CAPITAL_REQUIREMENTS } from './BoardMeeting.js';
import { CorporateRoadmap, ROAD_HORIZON } from './CorporateRoadmap.js';

/**
 * Corporation type weights for generation
 */
const CORPORATION_TYPE_WEIGHTS = {
    [CORPORATION_TYPES.SPECIALIST]: 0.60,
    [CORPORATION_TYPES.HORIZONTAL]: 0.20,
    [CORPORATION_TYPES.VERTICAL]: 0.12,
    [CORPORATION_TYPES.CONGLOMERATE]: 0.06,
    [CORPORATION_TYPES.FULL_VERTICAL]: 0.02
};

/**
 * Tier weights for specialist corporations
 */
const SPECIALIST_TIER_WEIGHTS = {
    [INDUSTRY_TIERS.RAW]: 0.20,
    [INDUSTRY_TIERS.SEMI_RAW]: 0.25,
    [INDUSTRY_TIERS.MANUFACTURED]: 0.35,
    [INDUSTRY_TIERS.RETAIL]: 0.15,
    [INDUSTRY_TIERS.SERVICES]: 0.05
};

/**
 * RAW tier persona definitions
 */
const RAW_PERSONAS = {
    MINING_COMPANY: {
        type: 'MINING_COMPANY',
        tier: INDUSTRY_TIERS.RAW,
        firmType: 'MINING',
        weight: 0.30,
        productFocuses: {
            FERROUS_METALS: { products: ['Iron Ore', 'Coal'], weight: 0.30, downstreamAffinity: ['STEEL_PROCESSING'] },
            NON_FERROUS_METALS: { products: ['Copper Ore', 'Aluminum Ore'], weight: 0.25, downstreamAffinity: ['METAL_PROCESSING'] },
            PRECIOUS_METALS: { products: ['Gold Ore', 'Silver Ore'], weight: 0.15, downstreamAffinity: ['ACCESSORIES'] },
            ENERGY_RESOURCES: { products: ['Crude Oil', 'Natural Gas'], weight: 0.20, downstreamAffinity: ['PETROLEUM_REFINERY'] },
            INDUSTRIAL_MINERALS: { products: ['Limestone', 'Salt', 'Silica Sand'], weight: 0.10, downstreamAffinity: ['GLASS_MANUFACTURING', 'CHEMICAL_PRODUCTION'] }
        }
    },
    LOGGING_COMPANY: {
        type: 'LOGGING_COMPANY',
        tier: INDUSTRY_TIERS.RAW,
        firmType: 'LOGGING',
        weight: 0.10,
        productFocuses: {
            COMMERCIAL_TIMBER: { products: ['Softwood Logs', 'Hardwood Logs'], weight: 1.0, downstreamAffinity: ['LUMBER_MILL', 'PULP_MILL'] }
        }
    },
    FARM_CROP: {
        type: 'FARM_CROP',
        tier: INDUSTRY_TIERS.RAW,
        firmType: 'FARM',
        weight: 0.35,
        productFocuses: {
            GRAIN_FARMING: { products: ['Wheat', 'Corn', 'Rice', 'Soybeans'], weight: 0.50, downstreamAffinity: ['FOOD_INGREDIENT_PROCESSOR'] },
            INDUSTRIAL_CROPS: { products: ['Cotton', 'Sugarcane', 'Rubber Latex'], weight: 0.30, downstreamAffinity: ['TEXTILE_MILL', 'FOOD_INGREDIENT_PROCESSOR', 'RUBBER_PROCESSOR'] },
            PRODUCE_FARMING: { products: ['Fresh Fruits', 'Vegetables'], weight: 0.20, downstreamAffinity: ['FOOD_INGREDIENT_PROCESSOR', 'PACKAGED_FOOD'] }
        }
    },
    FARM_LIVESTOCK: {
        type: 'FARM_LIVESTOCK',
        tier: INDUSTRY_TIERS.RAW,
        firmType: 'FARM',
        weight: 0.25,
        productFocuses: {
            CATTLE_RANCHING: { products: ['Cattle'], weight: 0.30, downstreamAffinity: ['MEAT_PROCESSOR', 'TEXTILE_MILL'] },
            PIG_FARMING: { products: ['Pigs'], weight: 0.20, downstreamAffinity: ['MEAT_PROCESSOR'] },
            POULTRY_FARMING: { products: ['Chickens'], weight: 0.25, downstreamAffinity: ['MEAT_PROCESSOR', 'PACKAGED_FOOD'] },
            DAIRY_FARMING: { products: ['Cattle'], weight: 0.15, downstreamAffinity: ['DAIRY_PROCESSOR'] },
            COMMERCIAL_FISHING: { products: ['Fish'], weight: 0.10, downstreamAffinity: ['SEAFOOD_PROCESSOR'] }
        }
    }
};

/**
 * SEMI_RAW tier persona definitions
 */
const SEMI_RAW_PERSONAS = {
    STEEL_PROCESSING: {
        type: 'STEEL_PROCESSING',
        tier: INDUSTRY_TIERS.SEMI_RAW,
        firmType: 'MANUFACTURING',
        weight: 0.12,
        products: ['Steel'],
        upstreamSource: ['Iron Ore', 'Coal'],
        downstreamAffinity: ['VEHICLE', 'AUTO_PARTS', 'APPLIANCE']
    },
    METAL_PROCESSING: {
        type: 'METAL_PROCESSING',
        tier: INDUSTRY_TIERS.SEMI_RAW,
        firmType: 'MANUFACTURING',
        weight: 0.12,
        products: ['Copper Wire', 'Aluminum Sheets'],
        upstreamSource: ['Copper Ore', 'Aluminum Ore'],
        downstreamAffinity: ['ELECTRONICS', 'APPLIANCE']
    },
    PETROLEUM_REFINERY: {
        type: 'PETROLEUM_REFINERY',
        tier: INDUSTRY_TIERS.SEMI_RAW,
        firmType: 'MANUFACTURING',
        weight: 0.10,
        products: ['Gasoline', 'Diesel', 'Plastic Pellets', 'Industrial Chemicals'],
        upstreamSource: ['Crude Oil'],
        downstreamAffinity: ['CHEMICAL_PRODUCTION']
    },
    LUMBER_MILL: {
        type: 'LUMBER_MILL',
        tier: INDUSTRY_TIERS.SEMI_RAW,
        firmType: 'MANUFACTURING',
        weight: 0.08,
        products: ['Plywood'],
        upstreamSource: ['Softwood Logs', 'Hardwood Logs'],
        downstreamAffinity: ['FURNITURE']
    },
    FOOD_INGREDIENT_PROCESSOR: {
        type: 'FOOD_INGREDIENT_PROCESSOR',
        tier: INDUSTRY_TIERS.SEMI_RAW,
        firmType: 'MANUFACTURING',
        weight: 0.15,
        products: ['Flour', 'Sugar', 'Vegetable Oil', 'Fruit Concentrate'],
        upstreamSource: ['Wheat', 'Sugarcane', 'Soybeans', 'Fresh Fruits'],
        downstreamAffinity: ['PACKAGED_FOOD']
    },
    DAIRY_PROCESSOR: {
        type: 'DAIRY_PROCESSOR',
        tier: INDUSTRY_TIERS.SEMI_RAW,
        firmType: 'MANUFACTURING',
        weight: 0.06,
        products: ['Pasteurized Milk'],
        upstreamSource: ['Raw Milk'],
        downstreamAffinity: ['PACKAGED_FOOD']
    },
    MEAT_PROCESSOR: {
        type: 'MEAT_PROCESSOR',
        tier: INDUSTRY_TIERS.SEMI_RAW,
        firmType: 'MANUFACTURING',
        weight: 0.10,
        products: ['Beef', 'Pork', 'Chicken'],
        upstreamSource: ['Cattle', 'Pigs', 'Chickens'],
        downstreamAffinity: ['PACKAGED_FOOD']
    },
    TEXTILE_MILL: {
        type: 'TEXTILE_MILL',
        tier: INDUSTRY_TIERS.SEMI_RAW,
        firmType: 'MANUFACTURING',
        weight: 0.08,
        products: ['Cotton Fabric', 'Leather'],
        upstreamSource: ['Cotton', 'Raw Hides'],
        downstreamAffinity: ['CLOTHING']
    }
};

/**
 * MANUFACTURED tier persona definitions
 */
const MANUFACTURED_PERSONAS = {
    PACKAGED_FOOD: {
        type: 'PACKAGED_FOOD',
        tier: INDUSTRY_TIERS.MANUFACTURED,
        firmType: 'MANUFACTURING',
        weight: 0.18,
        productFocuses: {
            BAKERY: { products: ['Bread', 'Cake'], weight: 0.25, upstreamSource: ['Flour', 'Sugar', 'Eggs'] },
            CONFECTIONERY: { products: ['Candy', 'Ice Cream'], weight: 0.15, upstreamSource: ['Sugar', 'Pasteurized Milk'] },
            BREAKFAST_FOODS: { products: ['Breakfast Cereal'], weight: 0.15, upstreamSource: ['Corn', 'Wheat', 'Sugar'] },
            CANNED_GOODS: { products: ['Canned Goods'], weight: 0.10, upstreamSource: ['Steel', 'Vegetables'] },
            PACKAGED_PROTEINS: { products: ['Packaged Meat', 'Packaged Seafood'], weight: 0.20, upstreamSource: ['Beef', 'Pork', 'Chicken', 'Processed Fish'] },
            DIVERSIFIED_FOOD: { products: ['Bread', 'Packaged Meat', 'Breakfast Cereal', 'Canned Goods'], weight: 0.15, upstreamSource: ['Multiple'] }
        }
    },
    BEVERAGE: {
        type: 'BEVERAGE',
        tier: INDUSTRY_TIERS.MANUFACTURED,
        firmType: 'MANUFACTURING',
        weight: 0.08,
        products: ['Soda', 'Alcohol'],
        upstreamSource: ['Sugar', 'Plastic Pellets', 'Glass']
    },
    CLOTHING: {
        type: 'CLOTHING',
        tier: INDUSTRY_TIERS.MANUFACTURED,
        firmType: 'MANUFACTURING',
        weight: 0.12,
        productFocuses: {
            CASUAL_WEAR: { products: ['Shirts', 'Jeans', 'Sweaters', 'Socks'], weight: 0.40, upstreamSource: ['Cotton Fabric'] },
            OUTERWEAR: { products: ['Jackets'], weight: 0.15, upstreamSource: ['Cotton Fabric', 'Steel'] },
            FOOTWEAR: { products: ['Shoes'], weight: 0.25, upstreamSource: ['Leather', 'Rubber', 'Cotton Fabric'] },
            FULL_APPAREL: { products: ['Shirts', 'Jeans', 'Jackets', 'Sweaters', 'Shoes', 'Socks'], weight: 0.20, upstreamSource: ['Cotton Fabric', 'Leather', 'Rubber'] }
        }
    },
    ELECTRONICS: {
        type: 'ELECTRONICS',
        tier: INDUSTRY_TIERS.MANUFACTURED,
        firmType: 'MANUFACTURING',
        weight: 0.08,
        productFocuses: {
            COMPUTING: { products: ['Laptops', 'Personal Computer', 'Tablets', 'Monitors'], weight: 0.30, upstreamSource: ['Aluminum Sheets', 'Copper Wire', 'Gold Ore', 'Plastic Pellets'] },
            MOBILE: { products: ['Cellphone'], weight: 0.20, upstreamSource: ['Aluminum Sheets', 'Copper Wire', 'Gold Ore'] },
            ENTERTAINMENT: { products: ['TV', 'Console', 'Headphones'], weight: 0.20, upstreamSource: ['Aluminum Sheets', 'Copper Wire', 'Steel'] },
            FULL_ELECTRONICS: { products: ['Laptops', 'Cellphone', 'TV', 'Tablets'], weight: 0.30, upstreamSource: ['Multiple metals'] }
        }
    },
    APPLIANCE: {
        type: 'APPLIANCE',
        tier: INDUSTRY_TIERS.MANUFACTURED,
        firmType: 'MANUFACTURING',
        weight: 0.06,
        products: ['Vacuums', 'Microwave', 'Air Conditioner', 'Washing Machine', 'Dryer'],
        upstreamSource: ['Steel', 'Copper Wire', 'Aluminum Sheets']
    },
    FURNITURE: {
        type: 'FURNITURE',
        tier: INDUSTRY_TIERS.MANUFACTURED,
        firmType: 'MANUFACTURING',
        weight: 0.05,
        products: ['Sofa', 'Tables', 'Beds', 'Dresser'],
        upstreamSource: ['Plywood', 'Cotton Fabric', 'Steel']
    }
};

/**
 * RETAIL tier persona definitions
 */
const RETAIL_PERSONAS = {
    SUPERMARKET: {
        type: 'SUPERMARKET',
        tier: INDUSTRY_TIERS.RETAIL,
        firmType: 'RETAIL',
        weight: 0.20,
        storeType: 'SUPERMARKET',
        productsSold: ['Food', 'Beverages', 'Cleaning', 'Health', 'Beauty']
    },
    CONVENIENCE_STORE: {
        type: 'CONVENIENCE_STORE',
        tier: INDUSTRY_TIERS.RETAIL,
        firmType: 'RETAIL',
        weight: 0.15,
        storeType: 'CONVENIENCE',
        productsSold: ['Snacks', 'Beverages']
    },
    ELECTRONICS_RETAIL: {
        type: 'ELECTRONICS_RETAIL',
        tier: INDUSTRY_TIERS.RETAIL,
        firmType: 'RETAIL',
        weight: 0.08,
        storeType: 'ELECTRONICS',
        productsSold: ['Electronics', 'Appliances']
    },
    FASHION_RETAIL: {
        type: 'FASHION_RETAIL',
        tier: INDUSTRY_TIERS.RETAIL,
        firmType: 'RETAIL',
        weight: 0.12,
        storeType: 'FASHION',
        productsSold: ['Clothing', 'Accessories']
    },
    HOME_GOODS_RETAIL: {
        type: 'HOME_GOODS_RETAIL',
        tier: INDUSTRY_TIERS.RETAIL,
        firmType: 'RETAIL',
        weight: 0.06,
        storeType: 'FURNITURE',
        productsSold: ['Furniture', 'Appliances']
    },
    AUTO_RETAIL: {
        type: 'AUTO_RETAIL',
        tier: INDUSTRY_TIERS.RETAIL,
        firmType: 'RETAIL',
        weight: 0.06,
        storeType: 'AUTO',
        productsSold: ['Vehicles', 'Auto Parts']
    }
};

/**
 * Name components for corporation name generation
 */
const NAME_COMPONENTS = {
    regions: ['Pacific', 'Atlantic', 'Continental', 'National', 'American', 'Global',
              'Midwest', 'Southern', 'Northern', 'Western', 'Eastern', 'Central'],
    adjectives: ['Premier', 'United', 'Allied', 'Modern', 'Advanced', 'Quality',
                 'Superior', 'Prime', 'First', 'Excel', 'Apex', 'Summit'],
    suffixes: ['Corp', 'Inc', 'Co', 'Industries', 'Holdings', 'Group',
               'Enterprises', 'International', 'Corporation', 'Company'],
    founders: ['Anderson', 'Baker', 'Carter', 'Davis', 'Evans', 'Foster',
               'Graham', 'Harris', 'Irving', 'Johnson', 'Kennedy', 'Lewis',
               'Mitchell', 'Nelson', 'Parker', 'Roberts', 'Stevens', 'Taylor']
};

/**
 * CorporationManager class
 * Handles corporation lifecycle, board meetings, and organic growth
 */
export class CorporationManager {
    /**
     * @param {Object} engine - Reference to SimulationEngine
     */
    constructor(engine) {
        this.engine = engine;
        this.corporations = new Map();
        this.corporationsById = new Map();

        // Track firm creation projects
        this.pendingFirmCreations = [];

        // Economic phase tracking
        this.economicPhase = 'FOUNDATION';
        this.monthsElapsed = 0;

        // Track available products in the market (for viability checking)
        this.availableProducts = new Set();

        // Track how many corps to create total
        this.targetTotalCorporations = engine.config?.corporations?.targetTotalCorporations ?? 80;
        this.monthlyCreationLimit = engine.config?.corporations?.monthlyCreationLimit ?? 3;

        // Viability thresholds from config
        const viabilityConfig = engine.config?.corporations?.viability ?? {};
        this.viabilityThresholds = {
            semiRawMinInputs: viabilityConfig.semiRawMinInputs ?? 1,
            manufacturedMinInputPercent: viabilityConfig.manufacturedMinInputPercent ?? 0.5,
            retailMinProductPercent: viabilityConfig.retailMinProductPercent ?? 0.3
        };
    }

    /**
     * Get seeded random from engine
     */
    random() {
        return this.engine.random();
    }

    /**
     * Generate corporations based on config
     * Called at startup (creates RAW + vertical corps) and monthly (creates more as viable)
     * @returns {Array<Corporation>} Generated corporations
     */
    generateCorporations() {
        const config = this.engine.config;

        // Calculate how many corps we should try to create
        const isStartup = this.corporations.size === 0;
        let targetCount;

        if (isStartup) {
            // At startup, calculate based on expected firms
            const firmsPerCityConfig = config.firms?.perCity ?? { min: 5, max: 10 };
            const avgFirmsPerCity = (firmsPerCityConfig.min + firmsPerCityConfig.max) / 2;
            const totalCities = config.cities?.initial ?? 8;
            const expectedTotalFirms = totalCities * avgFirmsPerCity;
            const firmsPerCorp = config.corporations?.firmsPerCorp ?? 4;
            targetCount = Math.max(5, Math.round(expectedTotalFirms / firmsPerCorp));
        } else {
            // Monthly: try to create up to limit if under target
            targetCount = Math.min(
                this.monthlyCreationLimit,
                this.targetTotalCorporations - this.corporations.size
            );
        }

        if (targetCount <= 0) {
            return [];
        }

        // Update available products before checking viability
        this.updateAvailableProducts();

        console.log(`📊 Generating corporations (viability check enabled)`);
        console.log(`   Available products: ${this.availableProducts.size > 0 ? Array.from(this.availableProducts).slice(0, 5).join(', ') + '...' : '(none yet)'}`);

        const corporations = [];
        let created = 0;
        let skipped = 0;
        const startIndex = this.corporations.size;

        // At startup, we may need multiple passes to reach target
        // because non-viable corps are skipped
        const maxAttempts = isStartup ? targetCount * 3 : targetCount * 2;

        for (let attempt = 0; attempt < maxAttempts && created < targetCount; attempt++) {
            // Generate corporation blueprint
            const corporation = this.generateCorporation(startIndex + attempt);

            // Check viability before activating
            if (this.checkViability(corporation)) {
                corporations.push(corporation);
                this.corporations.set(corporation.id, corporation);
                this.corporationsById.set(corporation.id, corporation);
                created++;
            } else {
                skipped++;
                // Don't add to corporations - will be attempted again next month
            }
        }

        // Log results
        console.log(`   Created: ${created}, Skipped (not viable): ${skipped}`);
        this.logTierDistribution(corporations);

        // Seed roadmaps for all newly-created corporations
        const marketState = this.calculateMarketState();
        for (const corp of corporations) {
            this.seedCorporationRoadmap(corp, marketState);
        }

        // At startup: guarantee minimum mineral coverage so all raw materials have producers from day 1
        if (isStartup) {
            this.ensureMineralCoverage(2);
        }

        return corporations;
    }

    /**
     * Guarantee at least `minFirms` mining firms per mineral product at startup.
     * Creates firms directly (bypassing board meetings) so they are operational from day 1.
     * If no active country has a required mineral, adds the resource to a suitable country.
     * @param {number} minFirms - Minimum number of firms per mineral product
     * @returns {Array} Created firms
     */
    ensureMineralCoverage(minFirms = 2) {
        const firmGenerator = this.engine.firmGenerator;
        if (!firmGenerator) {
            console.warn('FirmGenerator not available for mineral coverage');
            return [];
        }

        const miningPersonaDef = RAW_PERSONAS.MINING_COMPANY;
        const allFocuses = miningPersonaDef.productFocuses;

        // Build complete list of all mining products
        const allProducts = [];
        for (const focusData of Object.values(allFocuses)) {
            for (const product of focusData.products) {
                allProducts.push(product);
            }
        }

        // Count existing firms per product
        const firmCoverage = new Map();
        for (const product of allProducts) firmCoverage.set(product, 0);

        for (const firm of this.engine.firms.values()) {
            if (firm.type === 'MINING' && firm.resource) {
                if (firmCoverage.has(firm.resource)) {
                    firmCoverage.set(firm.resource, firmCoverage.get(firm.resource) + 1);
                }
            }
        }

        const createdFirms = [];

        for (const product of allProducts) {
            const existing = firmCoverage.get(product) || 0;
            const needed = minFirms - existing;
            if (needed <= 0) continue;

            for (let i = 0; i < needed; i++) {
                const firm = this._createGuaranteedMiningFirm(product, firmGenerator);
                if (firm) {
                    createdFirms.push(firm);
                    console.log(`   ⛏️ Guaranteed mining firm: ${firm.id} → ${product}`);
                }
            }
        }

        if (createdFirms.length > 0) {
            console.log(`   Mineral coverage: created ${createdFirms.length} guaranteed mining firms`);
        }
        return createdFirms;
    }

    /**
     * Create a single mining firm for a specific mineral.
     * Finds a city in a country that has the resource; if none, adds the resource
     * to a suitable existing country so the firm can be placed.
     * @param {string} product - Mineral to mine (e.g. 'Iron Ore')
     * @param {Object} firmGenerator - FirmGenerator instance
     * @returns {Object|null} Created firm or null
     */
    _createGuaranteedMiningFirm(product, firmGenerator) {
        const cities = this.engine.cities;

        // Find a city in a country that already has this resource
        let city = null;
        let country = null;
        const suitableCities = cities.filter(c => c.country?.resources?.includes(product));

        if (suitableCities.length > 0) {
            // Pick a random suitable city
            const chosen = suitableCities[Math.floor(this.random() * suitableCities.length)];
            city = chosen;
            country = chosen.country;
        } else {
            // No country has this resource — add it to the country with the most mining potential
            // (prefer DEVELOPED countries; fall back to any)
            const countries = [...new Set(cities.map(c => c.country).filter(Boolean))];
            const developed = countries.filter(c => c.economicLevel === 'DEVELOPED');
            const candidates = developed.length > 0 ? developed : countries;
            country = candidates[Math.floor(this.random() * candidates.length)];

            if (!country) return null;

            country.resources = country.resources || [];
            country.resources.push(product);
            console.log(`   🌍 Added ${product} to ${country.name} (no existing producer country in active set)`);

            // Pick any city in that country
            const countryCities = cities.filter(c => c.country === country);
            city = countryCities[Math.floor(this.random() * countryCities.length)];
        }

        if (!city || !country) return null;

        // Create a corporation to own this firm
        const focusKey = this._getFocusKeyForProduct(product);
        const focusData = RAW_PERSONAS.MINING_COMPANY.productFocuses[focusKey];
        const persona = {
            ...RAW_PERSONAS.MINING_COMPANY,
            selectedFocus: focusKey,
            products: [product],
            downstreamAffinity: focusData?.downstreamAffinity || [],
            productFocuses: RAW_PERSONAS.MINING_COMPANY.productFocuses
        };

        const corpIndex = this.corporations.size;
        const corpName = this.generateCorporationName(CORPORATION_TYPES.SPECIALIST, persona);
        const corp = new Corporation({
            id: `CORP_MINERAL_${product.replace(/\s+/g, '_')}_${corpIndex}`,
            name: corpName,
            abbreviation: this.generateAbbreviation(corpName),
            type: CORPORATION_TYPES.SPECIALIST,
            integrationLevel: 1,
            primaryPersona: { ...persona },
            secondaryPersonas: [],
            capital: this.calculateStartingCapital(INDUSTRY_TIERS.RAW, CORPORATION_TYPES.SPECIALIST),
            attributes: this.generateAttributes(),
            targetFirms: this.calculateTargetFirms(CORPORATION_TYPES.SPECIALIST, 1),
            homeCity: city,
            homeCountry: country
        });
        corp.createdAt = Date.now();
        this.corporations.set(corp.id, corp);
        this.corporationsById.set(corp.id, corp);
        this.engine.corporations.push(corp);
        this.engine.corporationsById.set(corp.id, corp);

        // Create the firm directly
        const firmId = this.engine.generateDeterministicId('FIRM', this.engine.firmCreationIndex++);
        const firm = firmGenerator.createMiningFirmWithResource(city, country, firmId, product);
        if (!firm) return null;

        firm.corporationId = corp.id;
        firm.corporationAbbreviation = corp.abbreviation;
        firmGenerator.registerFirm(firm, city, corp);
        return firm;
    }

    /**
     * Get the focus key for a given mining product
     */
    _getFocusKeyForProduct(product) {
        for (const [focusKey, focusData] of Object.entries(RAW_PERSONAS.MINING_COMPANY.productFocuses)) {
            if (focusData.products.includes(product)) return focusKey;
        }
        return 'INDUSTRIAL_MINERALS';
    }

    /**
     * Log tier distribution for created corporations
     * @param {Array<Corporation>} corporations - Corporations to log
     */
    logTierDistribution(corporations) {
        if (corporations.length === 0) return;

        const typeCounts = {};
        const tierCounts = {};
        for (const corp of corporations) {
            typeCounts[corp.type] = (typeCounts[corp.type] || 0) + 1;
            const tier = corp.getPrimaryTier();
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        }

        console.log(`   Types: ${JSON.stringify(typeCounts)}`);
        console.log(`   Tiers: ${JSON.stringify(tierCounts)}`);
    }

    /**
     * Generate a single corporation
     */
    generateCorporation(index) {
        // Select corporation type
        const corpType = this.weightedSelect(CORPORATION_TYPE_WEIGHTS);

        // Select primary tier
        const primaryTier = this.selectTierForType(corpType);

        // Select primary persona
        const primaryPersona = this.selectPersonaForTier(primaryTier);

        // Select product focus if persona has options
        if (primaryPersona.productFocuses) {
            const focusKey = this.weightedSelect(
                Object.fromEntries(
                    Object.entries(primaryPersona.productFocuses).map(([k, v]) => [k, v.weight])
                )
            );
            const focus = primaryPersona.productFocuses[focusKey];
            primaryPersona.selectedFocus = focusKey;
            primaryPersona.products = focus.products;
            primaryPersona.upstreamSource = focus.upstreamSource;
            primaryPersona.downstreamAffinity = focus.downstreamAffinity;
        }

        // Determine integration level
        const integrationLevel = this.determineIntegrationLevel(corpType);

        // Select secondary personas for non-specialists
        const secondaryPersonas = this.selectSecondaryPersonas(corpType, primaryPersona, integrationLevel);

        // Generate name
        const name = this.generateCorporationName(corpType, primaryPersona);
        const abbreviation = this.generateAbbreviation(name);

        // Generate attributes
        const attributes = this.generateAttributes();

        // Calculate starting capital
        const capital = this.calculateStartingCapital(primaryTier, corpType);

        // Select headquarters city
        const headquarters = this.selectHeadquartersCity();

        // Create corporation
        const corporation = new Corporation({
            id: `CORP_${index + 1}`,
            name,
            abbreviation,
            type: corpType,
            integrationLevel,
            primaryPersona: { ...primaryPersona },
            secondaryPersonas,
            capital,
            attributes,
            targetFirms: this.calculateTargetFirms(corpType, integrationLevel),
            homeCity: headquarters.city,
            homeCountry: headquarters.country
        });

        corporation.createdAt = Date.now();

        return corporation;
    }

    /**
     * Select tier based on corporation type
     */
    selectTierForType(corpType) {
        if (corpType === CORPORATION_TYPES.SPECIALIST || corpType === CORPORATION_TYPES.HORIZONTAL) {
            return this.weightedSelect(SPECIALIST_TIER_WEIGHTS);
        }

        // Vertical chains start from different tiers
        const verticalWeights = {
            [INDUSTRY_TIERS.RAW]: 0.35,
            [INDUSTRY_TIERS.SEMI_RAW]: 0.40,
            [INDUSTRY_TIERS.MANUFACTURED]: 0.25
        };

        return this.weightedSelect(verticalWeights);
    }

    /**
     * Select persona for a given tier
     */
    selectPersonaForTier(tier) {
        let personas;

        switch (tier) {
            case INDUSTRY_TIERS.RAW:
                personas = RAW_PERSONAS;
                break;
            case INDUSTRY_TIERS.SEMI_RAW:
                personas = SEMI_RAW_PERSONAS;
                break;
            case INDUSTRY_TIERS.MANUFACTURED:
                personas = MANUFACTURED_PERSONAS;
                break;
            case INDUSTRY_TIERS.RETAIL:
                personas = RETAIL_PERSONAS;
                break;
            default:
                personas = RAW_PERSONAS;
        }

        const weights = Object.fromEntries(
            Object.entries(personas).map(([key, persona]) => [key, persona.weight])
        );

        const selectedKey = this.weightedSelect(weights);
        return { ...personas[selectedKey] };
    }

    /**
     * Determine integration level based on corporation type
     */
    determineIntegrationLevel(corpType) {
        switch (corpType) {
            case CORPORATION_TYPES.SPECIALIST:
            case CORPORATION_TYPES.HORIZONTAL:
                return 0;

            case CORPORATION_TYPES.VERTICAL:
                return this.random() < 0.70 ? 1 : 2;

            case CORPORATION_TYPES.CONGLOMERATE:
                return this.random() < 0.60 ? 2 : 3;

            case CORPORATION_TYPES.FULL_VERTICAL:
                return this.random() < 0.70 ? 3 : 4;

            default:
                return 0;
        }
    }

    /**
     * Select secondary personas based on affinity
     */
    selectSecondaryPersonas(corpType, primaryPersona, integrationLevel) {
        const secondaryPersonas = [];

        if (corpType === CORPORATION_TYPES.SPECIALIST) {
            return secondaryPersonas;
        }

        const maxSecondary = this.getMaxSecondaryPersonas(corpType, integrationLevel);

        if (corpType === CORPORATION_TYPES.HORIZONTAL) {
            // Same tier, different personas
            const sameTierPersonas = this.getPersonasForTier(primaryPersona.tier);
            for (const [key, persona] of Object.entries(sameTierPersonas)) {
                if (secondaryPersonas.length >= maxSecondary) break;
                if (key !== primaryPersona.type && this.random() < 0.4) {
                    secondaryPersonas.push({ ...persona });
                }
            }
        } else if (corpType === CORPORATION_TYPES.VERTICAL || corpType === CORPORATION_TYPES.FULL_VERTICAL) {
            // Add personas from adjacent tiers based on affinity
            const affinities = primaryPersona.downstreamAffinity || [];
            for (const affinityType of affinities) {
                if (secondaryPersonas.length >= maxSecondary) break;
                const persona = this.findPersonaByType(affinityType);
                if (persona && this.random() < 0.7) {
                    secondaryPersonas.push({ ...persona });
                }
            }
        }

        return secondaryPersonas;
    }

    /**
     * Get max secondary personas based on type and integration level
     */
    getMaxSecondaryPersonas(corpType, integrationLevel) {
        switch (corpType) {
            case CORPORATION_TYPES.SPECIALIST: return 0;
            case CORPORATION_TYPES.HORIZONTAL: return 2;
            case CORPORATION_TYPES.VERTICAL: return integrationLevel;
            case CORPORATION_TYPES.CONGLOMERATE: return 4;
            case CORPORATION_TYPES.FULL_VERTICAL: return 5;
            default: return 0;
        }
    }

    /**
     * Get all personas for a tier
     */
    getPersonasForTier(tier) {
        switch (tier) {
            case INDUSTRY_TIERS.RAW: return RAW_PERSONAS;
            case INDUSTRY_TIERS.SEMI_RAW: return SEMI_RAW_PERSONAS;
            case INDUSTRY_TIERS.MANUFACTURED: return MANUFACTURED_PERSONAS;
            case INDUSTRY_TIERS.RETAIL: return RETAIL_PERSONAS;
            default: return {};
        }
    }

    /**
     * Find persona by type across all tiers
     */
    findPersonaByType(type) {
        const allPersonas = { ...RAW_PERSONAS, ...SEMI_RAW_PERSONAS, ...MANUFACTURED_PERSONAS, ...RETAIL_PERSONAS };
        return allPersonas[type] || null;
    }

    /**
     * Generate corporation name
     */
    generateCorporationName(corpType, primaryPersona) {
        const region = NAME_COMPONENTS.regions[Math.floor(this.random() * NAME_COMPONENTS.regions.length)];
        const adjective = NAME_COMPONENTS.adjectives[Math.floor(this.random() * NAME_COMPONENTS.adjectives.length)];
        const suffix = NAME_COMPONENTS.suffixes[Math.floor(this.random() * NAME_COMPONENTS.suffixes.length)];
        const founder = NAME_COMPONENTS.founders[Math.floor(this.random() * NAME_COMPONENTS.founders.length)];

        const patterns = [
            `${region} ${this.getIndustryName(primaryPersona)} ${suffix}`,
            `${adjective} ${this.getIndustryName(primaryPersona)}`,
            `${founder} ${suffix}`,
            `${region} ${adjective} ${suffix}`
        ];

        return patterns[Math.floor(this.random() * patterns.length)];
    }

    /**
     * Get industry name for naming
     */
    getIndustryName(persona) {
        const industryNames = {
            'MINING_COMPANY': 'Mining',
            'LOGGING_COMPANY': 'Timber',
            'FARM_CROP': 'Agricultural',
            'FARM_LIVESTOCK': 'Ranch',
            'STEEL_PROCESSING': 'Steel',
            'METAL_PROCESSING': 'Metals',
            'PETROLEUM_REFINERY': 'Energy',
            'FOOD_INGREDIENT_PROCESSOR': 'Foods',
            'PACKAGED_FOOD': 'Foods',
            'BEVERAGE': 'Beverages',
            'CLOTHING': 'Apparel',
            'ELECTRONICS': 'Electronics',
            'APPLIANCE': 'Appliances',
            'FURNITURE': 'Furnishings',
            'SUPERMARKET': 'Markets',
            'FASHION_RETAIL': 'Fashion'
        };

        return industryNames[persona.type] || 'Industries';
    }

    /**
     * Generate abbreviation from name
     */
    generateAbbreviation(name) {
        const words = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 3) {
            return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
        } else if (words.length === 2) {
            return (words[0][0] + words[1].substring(0, 2)).toUpperCase();
        }
        return words[0].substring(0, 3).toUpperCase();
    }

    /**
     * Generate random attributes
     */
    generateAttributes() {
        return {
            riskTolerance: 0.3 + this.random() * 0.4,      // 0.3 - 0.7
            qualityFocus: 0.3 + this.random() * 0.4,
            efficiencyFocus: 0.3 + this.random() * 0.4,
            growthOrientation: 0.4 + this.random() * 0.4,  // 0.4 - 0.8
            integrationPreference: 0.3 + this.random() * 0.5,
            contractPreference: 0.4 + this.random() * 0.4
        };
    }

    /**
     * Calculate starting capital based on tier and type
     */
    calculateStartingCapital(tier, corpType) {
        const baseCosts = {
            [INDUSTRY_TIERS.RAW]: 5000000,
            [INDUSTRY_TIERS.SEMI_RAW]: 10000000,
            [INDUSTRY_TIERS.MANUFACTURED]: 8000000,
            [INDUSTRY_TIERS.RETAIL]: 3000000
        };

        const typeMultipliers = {
            [CORPORATION_TYPES.SPECIALIST]: 1.0,
            [CORPORATION_TYPES.HORIZONTAL]: 1.5,
            [CORPORATION_TYPES.VERTICAL]: 2.0,
            [CORPORATION_TYPES.CONGLOMERATE]: 3.0,
            [CORPORATION_TYPES.FULL_VERTICAL]: 5.0
        };

        const base = baseCosts[tier] || 5000000;
        const multiplier = typeMultipliers[corpType] || 1.0;

        return Math.floor(base * multiplier * (0.8 + this.random() * 0.4));
    }

    /**
     * Select a headquarters city for a new corporation
     * Prefers larger cities with better infrastructure
     */
    selectHeadquartersCity() {
        const cities = this.engine.cities;
        if (!cities || cities.length === 0) {
            return { city: null, country: null };
        }

        // Score cities based on population and infrastructure
        const scoredCities = cities.map(city => {
            let score = city.population || 10000;

            // Bonus for infrastructure
            if (city.hasAirport) score *= 1.3;
            if (city.hasSeaport) score *= 1.2;
            if (city.hasRailway) score *= 1.1;

            return { city, score };
        });

        // Sort by score descending
        scoredCities.sort((a, b) => b.score - a.score);

        // Weighted selection favoring top cities
        // Top 30% of cities have higher chance
        const topCount = Math.max(1, Math.floor(cities.length * 0.3));
        const useTopCity = this.random() < 0.7;

        let selectedCity;
        if (useTopCity) {
            const topIndex = Math.floor(this.random() * topCount);
            selectedCity = scoredCities[topIndex].city;
        } else {
            const index = Math.floor(this.random() * scoredCities.length);
            selectedCity = scoredCities[index].city;
        }

        return {
            city: selectedCity,
            country: selectedCity.country || null
        };
    }

    /**
     * Calculate target firms based on type and integration level
     */
    calculateTargetFirms(corpType, integrationLevel) {
        const baseFirms = {
            [CORPORATION_TYPES.SPECIALIST]: 2,
            [CORPORATION_TYPES.HORIZONTAL]: 4,
            [CORPORATION_TYPES.VERTICAL]: 3,
            [CORPORATION_TYPES.CONGLOMERATE]: 6,
            [CORPORATION_TYPES.FULL_VERTICAL]: 8
        };

        return (baseFirms[corpType] || 2) + integrationLevel;
    }

    /**
     * Weighted selection from weights object
     */
    weightedSelect(weights) {
        const entries = Object.entries(weights);
        const total = entries.reduce((sum, [, w]) => sum + w, 0);
        let roll = this.random() * total;

        for (const [key, weight] of entries) {
            roll -= weight;
            if (roll <= 0) {
                return key;
            }
        }

        return entries[0][0];
    }

    // ========================================
    // VIABILITY CHECKING METHODS
    // ========================================

    /**
     * Update the set of available products based on existing firms
     * A product is "available" when at least one firm exists that can PRODUCE it
     */
    updateAvailableProducts() {
        this.availableProducts.clear();

        for (const firm of this.engine.firms.values()) {
            // RAW firms - add their output product
            if (firm.type === 'MINING' && firm.resourceType) {
                this.availableProducts.add(firm.resourceType);
            }
            if (firm.type === 'LOGGING' && firm.timberType) {
                this.availableProducts.add(firm.timberType);
            }
            if (firm.type === 'FARM') {
                if (firm.cropType) this.availableProducts.add(firm.cropType);
                if (firm.livestockType) this.availableProducts.add(firm.livestockType);
            }

            // Manufacturing firms - add their output product
            if (firm.type === 'MANUFACTURING' && firm.product?.name) {
                this.availableProducts.add(firm.product.name);
            }

            // Retail firms don't produce - they only sell, so no products added
        }
    }

    /**
     * Check if a corporation is viable based on supply chain dependencies
     * @param {Corporation} corp - Corporation to check
     * @returns {boolean} True if corporation can operate
     */
    checkViability(corp) {
        const tier = corp.getPrimaryTier();
        const persona = corp.primaryPersona;

        // RAW tier is ALWAYS viable - no input dependencies
        if (tier === INDUSTRY_TIERS.RAW) {
            return true;
        }

        // Vertically integrated corps that have RAW capability are viable
        if (this.canSelfSupply(corp)) {
            return true;
        }

        // Check tier-specific viability
        switch (tier) {
            case INDUSTRY_TIERS.SEMI_RAW:
                return this.checkSemiRawViability(persona);

            case INDUSTRY_TIERS.MANUFACTURED:
                return this.checkManufacturedViability(persona);

            case INDUSTRY_TIERS.RETAIL:
                return this.checkRetailViability(persona);

            default:
                return false;
        }
    }

    /**
     * Check if corporation can self-supply through vertical integration
     * @param {Corporation} corp - Corporation to check
     * @returns {boolean} True if has RAW capability
     */
    canSelfSupply(corp) {
        const type = corp.type;

        // Only vertical types can self-supply
        if (type !== CORPORATION_TYPES.VERTICAL &&
            type !== CORPORATION_TYPES.FULL_VERTICAL &&
            type !== CORPORATION_TYPES.CONGLOMERATE) {
            return false;
        }

        // Check if has RAW capability in primary or secondary
        if (corp.getPrimaryTier() === INDUSTRY_TIERS.RAW) {
            return true;
        }

        for (const persona of corp.secondaryPersonas || []) {
            if (persona.tier === INDUSTRY_TIERS.RAW) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check viability for SEMI_RAW tier corporations
     * @param {Object} persona - Corporation persona
     * @returns {boolean} True if at least one input is available
     */
    checkSemiRawViability(persona) {
        const upstreamSources = persona.upstreamSource || [];
        if (upstreamSources.length === 0) return true; // No specific requirements

        let availableCount = 0;
        for (const material of upstreamSources) {
            if (this.availableProducts.has(material)) {
                availableCount++;
            }
        }

        // Need at least 1 input available
        return availableCount >= this.viabilityThresholds.semiRawMinInputs;
    }

    /**
     * Check viability for MANUFACTURED tier corporations
     * @param {Object} persona - Corporation persona
     * @returns {boolean} True if enough inputs are available
     */
    checkManufacturedViability(persona) {
        const inputs = this.getPersonaInputs(persona);
        if (inputs.length === 0) return true;

        const availableCount = inputs.filter(i =>
            this.availableProducts.has(i)
        ).length;

        // Need at least 50% of inputs available
        const percent = availableCount / inputs.length;
        return percent >= this.viabilityThresholds.manufacturedMinInputPercent;
    }

    /**
     * Check viability for RETAIL tier corporations
     * @param {Object} persona - Corporation persona
     * @returns {boolean} True if enough products to sell are available
     */
    checkRetailViability(persona) {
        const productsSold = persona.productsSold || [];
        if (productsSold.length === 0) return true;

        // For retail, we check if manufactured products in their categories exist
        // Since productsSold are categories like 'Food', 'Electronics', we need to
        // check if any products in those categories are available
        let availableCount = 0;
        for (const category of productsSold) {
            if (this.hasProductsInCategory(category)) {
                availableCount++;
            }
        }

        // Need at least 30% of categories to have products
        const percent = availableCount / productsSold.length;
        return percent >= this.viabilityThresholds.retailMinProductPercent;
    }

    /**
     * Check if any products exist in a retail category
     * @param {string} category - Category name like 'Food', 'Electronics'
     * @returns {boolean} True if products exist in this category
     */
    hasProductsInCategory(category) {
        // Map retail categories to manufactured products
        const categoryProducts = {
            'Food': ['Bread', 'Cake', 'Candy', 'Ice Cream', 'Breakfast Cereal', 'Canned Goods', 'Packaged Meat', 'Packaged Seafood'],
            'Beverages': ['Soda', 'Alcohol'],
            'Cleaning': ['Cleaning Products'],
            'Health': ['Medicine', 'Vitamins'],
            'Beauty': ['Cosmetics', 'Personal Care'],
            'Snacks': ['Candy', 'Chips'],
            'Electronics': ['Laptops', 'Personal Computer', 'Tablets', 'Monitors', 'Cellphone', 'TV', 'Console', 'Headphones'],
            'Appliances': ['Vacuums', 'Microwave', 'Air Conditioner', 'Washing Machine', 'Dryer'],
            'Clothing': ['Shirts', 'Jeans', 'Sweaters', 'Socks', 'Jackets', 'Shoes'],
            'Accessories': ['Watches', 'Jewelry'],
            'Furniture': ['Sofa', 'Tables', 'Beds', 'Dresser'],
            'Vehicles': ['Cars', 'Trucks'],
            'Auto Parts': ['Tires', 'Batteries']
        };

        const products = categoryProducts[category] || [];
        return products.some(p => this.availableProducts.has(p));
    }

    /**
     * Get input requirements from persona
     * @param {Object} persona - Corporation persona
     * @returns {Array<string>} List of input product names
     */
    getPersonaInputs(persona) {
        // Check direct upstreamSource
        if (persona.upstreamSource && Array.isArray(persona.upstreamSource)) {
            return persona.upstreamSource;
        }

        // Check product focus for inputs
        if (persona.selectedFocus && persona.productFocuses) {
            const focus = persona.productFocuses[persona.selectedFocus];
            if (focus?.upstreamSource) {
                return Array.isArray(focus.upstreamSource) ? focus.upstreamSource : [];
            }
        }

        return [];
    }

    /**
     * Conduct monthly planning for all corporations (replaces conductBoardMeetings)
     */
    conductMonthlyPlanning(gameTime) {
        this.monthsElapsed++;

        // Calculate current market state
        const marketState = this.calculateMarketState();

        // Update economic phase
        this.economicPhase = determineEconomicPhase(marketState);

        console.log(`📋 Month ${this.monthsElapsed}: Roadmap planning (Phase: ${this.economicPhase})`);

        // Try to create new corporations if under target
        let newCorpsCreated = 0;
        if (this.corporations.size < this.targetTotalCorporations) {
            const newCorps = this.generateCorporations();
            newCorpsCreated = newCorps.length;
            if (newCorpsCreated > 0) {
                this.engine.corporations.push(...newCorps);
                newCorps.forEach(corp => this.engine.corporationsById.set(corp.id, corp));
                // Seed roadmaps for new corps
                for (const corp of newCorps) {
                    this.seedCorporationRoadmap(corp, marketState);
                }
                console.log(`   New corporations created: ${newCorpsCreated}`);
            }
        }

        let totalActions = 0;

        for (const corporation of this.corporations.values()) {
            // Seed roadmap if this corp has never had one yet (e.g. loaded from old save)
            if (!corporation.roadmap.hasPendingAction() && corporation.firms.length === 0) {
                this.seedCorporationRoadmap(corporation, marketState);
            }

            // Update roadmap: promote actions, evaluate goals
            const readyActions = corporation.roadmap.update(corporation, marketState, this.monthsElapsed);
            totalActions += readyActions.length;

            for (const action of readyActions) {
                this.executeRoadmapAction(corporation, action, gameTime);
            }

            // Evaluate goal transitions
            this.evaluateGoalTransitions(corporation, marketState);
        }

        // Process pending firm creations
        this.processPendingCreations(gameTime);

        // Check for supply gaps and respond (scale existing firms or queue new ones)
        this._checkSupplyGapExpansion(this.monthsElapsed);

        console.log(`   Actions executed: ${totalActions}`);
        console.log(`   Pending firm creations: ${this.pendingFirmCreations.length}`);

        return {
            monthsElapsed: this.monthsElapsed,
            economicPhase: this.economicPhase,
            totalActions,
            pendingCreations: this.pendingFirmCreations.length,
            newCorporations: newCorpsCreated,
            totalCorporations: this.corporations.size
        };
    }

    /**
     * Seed the roadmap for a newly-created corporation.
     */
    seedCorporationRoadmap(corp, marketState) {
        corp.roadmap.seed(corp, marketState, this.monthsElapsed);
        corp.currentGoal = GOAL_TYPES.ESTABLISH_OPERATIONS;
        corp.goalStartMonth = this.monthsElapsed;
    }

    /**
     * Execute a single roadmap action for a corporation.
     */
    executeRoadmapAction(corporation, action, gameTime) {
        try {
            switch (action.type) {
                case DECISION_TYPES.OPEN_FIRM:
                case DECISION_TYPES.ENTER_CITY: {
                    // Resolve location before queuing
                    const persona = action.persona;
                    if (!persona) {
                        corporation.roadmap.cancelAction(action.id);
                        return;
                    }
                    // Attach location if not already set
                    if (!action.city) {
                        if (action.tier === INDUSTRY_TIERS.RAW || action.tier === INDUSTRY_TIERS.SEMI_RAW) {
                            const selection = this.selectCityForPersona(persona);
                            if (selection) {
                                action.city = selection.city;
                                action.country = selection.country;
                                action.selectedResource = selection.selectedResource;
                            }
                        } else {
                            const cities = this.engine.cities;
                            if (cities.length > 0) {
                                action.city = cities[Math.floor(this.random() * cities.length)];
                                action.country = action.city.country;
                            }
                        }
                    }
                    this.queueFirmCreation(corporation, action, gameTime);
                    break;
                }

                case DECISION_TYPES.CLOSE_FIRM: {
                    if (action.targetFirmId) {
                        this._closeFirm(corporation, action.targetFirmId);
                    }
                    corporation.roadmap.completeAction(action.id);
                    break;
                }

                case DECISION_TYPES.DEFER:
                    // IMPROVE_PROFITABILITY sub-actions (RENEGOTIATE, REDUCE_HEADCOUNT)
                    if (action.goal === GOAL_TYPES.IMPROVE_PROFITABILITY) {
                        this._executeProfitabilitySubAction(corporation, action);
                    }
                    corporation.roadmap.completeAction(action.id);
                    break;

                default:
                    corporation.roadmap.completeAction(action.id);
            }
        } catch (err) {
            console.warn(`executeRoadmapAction error for ${corporation.abbreviation}:`, err.message);
            corporation.roadmap.cancelAction(action.id);
        }
    }

    /**
     * Evaluate goal state transitions for a corporation each month.
     */
    evaluateGoalTransitions(corp, marketState) {
        const firmCount = corp.firms.length;
        const targetFirms = corp.goals?.targetFirms || 3;

        // ESTABLISH_OPERATIONS → EXPAND_CAPACITY once first firm exists
        if (corp.currentGoal === GOAL_TYPES.ESTABLISH_OPERATIONS && firmCount >= 1) {
            corp.setGoal(GOAL_TYPES.EXPAND_CAPACITY, this.monthsElapsed);
            corp.goals.completedGoals = corp.goals.completedGoals || [];
            if (!corp.goals.completedGoals.includes(GOAL_TYPES.ESTABLISH_OPERATIONS)) {
                corp.goals.completedGoals.push(GOAL_TYPES.ESTABLISH_OPERATIONS);
            }
        }

        // EXPAND_CAPACITY → strategic goals once target reached
        if (corp.currentGoal === GOAL_TYPES.EXPAND_CAPACITY && firmCount >= targetFirms) {
            const tier = corp.primaryPersona?.tier;
            // Pick the most appropriate next strategic goal
            if (tier === INDUSTRY_TIERS.RETAIL) {
                corp.setGoal(GOAL_TYPES.ENTER_NEW_MARKET, this.monthsElapsed);
            } else {
                corp.setGoal(GOAL_TYPES.VERTICAL_INTEGRATION, this.monthsElapsed);
            }
        }

        // FULL_VERTICAL milestone
        if (!corp.isFullyVertical) {
            corp.updateIntegrationMap();
            if (corp.isFullyVertical) {
                console.log(`🏆 ${corp.abbreviation} achieved FULL VERTICAL integration!`);
                corp.setGoal(GOAL_TYPES.FULL_VERTICAL_MILESTONE, this.monthsElapsed);
            }
        }
    }

    /**
     * Close a firm owned by a corporation.
     */
    _closeFirm(corporation, firmId) {
        const firm = corporation.firms.find(f => f.id === firmId);
        if (!firm) return;
        corporation.removeFirm(firmId);
        this.engine.firms.delete(firmId);
        this.engine._rebuildFirmPartitions();
        this.engine.cityRetailDemandManager?.invalidateRetailerCache();
        console.log(`   🔒 ${corporation.abbreviation}: Closed firm ${firmId} (consecutive losses)`);
    }

    /**
     * Execute IMPROVE_PROFITABILITY sub-actions.
     */
    _executeProfitabilitySubAction(corporation, action) {
        const firm = corporation.firms.find(f => f.id === action.targetFirmId);
        if (!firm) return;

        switch (action.subAction) {
            case 'REDUCE_HEADCOUNT':
                // Reduce efficiency -5% and target -15% labor cost
                firm.efficiency = Math.max(0.5, (firm.efficiency || 1.0) - 0.05);
                firm.wageMultiplier = Math.max(0.6, (firm.wageMultiplier || 1.0) - 0.15);
                console.log(`   ✂️ ${corporation.abbreviation}: REDUCE_HEADCOUNT on ${firm.id}`);
                break;

            case 'RENEGOTIATE_CONTRACTS':
                // Mark contracts for renegotiation — ContractManager handles the rest
                if (firm.contractManager) {
                    const contracts = firm.contractManager.getActiveContracts?.() || [];
                    for (const contract of contracts) {
                        contract.pendingRenegotiation = true;
                    }
                }
                console.log(`   📝 ${corporation.abbreviation}: RENEGOTIATE_CONTRACTS for ${firm.id}`);
                break;
        }
    }

    /**
     * Calculate current market state
     */
    calculateMarketState() {
        const firmCounts = {
            [INDUSTRY_TIERS.RAW]: 0,
            [INDUSTRY_TIERS.SEMI_RAW]: 0,
            [INDUSTRY_TIERS.MANUFACTURED]: 0,
            [INDUSTRY_TIERS.RETAIL]: 0
        };

        const suppliers = [];
        const buyers = [];

        // Count firms by tier
        for (const firm of this.engine.firms.values()) {
            if (firm.type === 'MINING' || firm.type === 'LOGGING' || firm.type === 'FARM') {
                firmCounts[INDUSTRY_TIERS.RAW]++;
                suppliers.push({
                    id: firm.id,
                    products: [firm.resourceType || firm.timberType || firm.cropType || firm.livestockType],
                    operational: true,
                    capacity: firm.extractionRate || firm.harvestRate || firm.productionRate || 100,
                    committedVolume: 0
                });
            } else if (firm.type === 'MANUFACTURING') {
                if (firm.isSemiRawProducer) {
                    firmCounts[INDUSTRY_TIERS.SEMI_RAW]++;
                } else {
                    firmCounts[INDUSTRY_TIERS.MANUFACTURED]++;
                }
                if (firm.product) {
                    suppliers.push({
                        id: firm.id,
                        products: [firm.product.name],
                        operational: true,
                        capacity: (firm.productionLine?.outputPerHour || 10) * 24,
                        committedVolume: 0
                    });
                    if (firm.product.inputs) {
                        buyers.push({
                            id: firm.id,
                            wantedProducts: firm.product.inputs.map(i => i.material)
                        });
                    }
                }
            } else if (firm.type === 'RETAIL') {
                firmCounts[INDUSTRY_TIERS.RETAIL]++;
                // Retail buys manufactured products
                buyers.push({
                    id: firm.id,
                    wantedProducts: Array.from(firm.productInventory?.keys() || [])
                });
            }
        }

        // Build flat firm list for acquisition checks
        const firms = [];
        for (const firm of this.engine.firms.values()) {
            firms.push({
                id: firm.id,
                persona: firm.persona || null,
                availableForAcquisition: firm.availableForAcquisition || false,
                acquisitionValue: firm.acquisitionValue || 0
            });
        }

        return {
            firmCounts,
            suppliers,
            buyers,
            firms,
            economicPhase: this.economicPhase,
            monthsElapsed: this.monthsElapsed
        };
    }

    /**
     * Process a board decision
     */
    processDecision(corporation, decision, gameTime) {
        switch (decision.type) {
            case DECISION_TYPES.OPEN_FIRM:
                this.queueFirmCreation(corporation, decision, gameTime);
                break;

            case DECISION_TYPES.SIGN_SUPPLY_CONTRACT:
                this.createSupplyContract(corporation, decision);
                break;

            case DECISION_TYPES.SIGN_SALES_CONTRACT:
                this.createSalesContract(corporation, decision);
                break;

            case DECISION_TYPES.EXPAND_FIRM:
                // Expand existing firm capacity
                this.expandFirm(corporation, decision);
                break;

            case DECISION_TYPES.DEFER:
                // Nothing to do - decision recorded in meeting
                break;
        }
    }

    /**
     * Queue a firm creation project
     */
    queueFirmCreation(corporation, decision, gameTime) {
        const persona = decision.persona;
        const timeline = FIRM_CREATION_TIMELINE[persona.type] || 3;

        this.pendingFirmCreations.push({
            id: decision.id || `FIRM_PROJECT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            corporationId: corporation.id,
            persona: persona,
            tier: decision.tier,
            cost: decision.cost || 0,
            startMonth: this.monthsElapsed,
            completionMonth: this.monthsElapsed + timeline,
            status: 'IN_PROGRESS',
            // Copy location data from decision (set during BoardMeeting.generateRAWDecisions)
            city: decision.city || null,
            country: decision.country || null,
            selectedResource: decision.selectedResource || null,
            rationale: decision.rationale || null
        });

        console.log(`   📋 ${corporation.abbreviation}: Queued ${persona.type} firm in ${decision.city?.name || 'TBD'}, completion Month ${this.monthsElapsed + timeline}`);

        // Deduct capital
        corporation.spendCapital(decision.cost || 0, 'Firm creation');

        // Mark roadmap action as completed (the pending firm creation is the follow-through)
        if (decision.id && corporation.roadmap) {
            corporation.roadmap.completeAction(decision.id);
        }
    }

    /**
     * Process pending firm creations
     */
    processPendingCreations(gameTime) {
        const completed = [];

        for (const project of this.pendingFirmCreations) {
            if (this.monthsElapsed >= project.completionMonth) {
                // Create the firm
                const corporation = this.corporations.get(project.corporationId);
                if (corporation) {
                    project._deferred = false;  // reset deferral flag each pass
                    const firm = this.createFirmFromProject(corporation, project);
                    if (firm) {
                        corporation.addFirm(firm);
                        console.log(`   ✅ ${corporation.abbreviation} opened: ${firm.getDisplayName?.() || firm.type} in ${firm.city?.name || 'unknown location'}`);
                        completed.push(project.id);
                    } else if (project._deferred) {
                        // Manufacturing firm deferred — waiting for input suppliers
                        if ((project._deferralCount || 0) >= 12) {
                            console.warn(`   ❌ ${corporation.abbreviation}: Abandoned after 12 months — inputs never available for ${project.persona?.type}`);
                            completed.push(project.id);
                        }
                        // else: stays in pendingFirmCreations, retried next month
                    } else {
                        // Hard failure (missing city, resource, etc.)
                        console.warn(`   ❌ ${corporation.abbreviation}: Failed to create ${project.persona?.type} - no location available (city: ${project.city?.name || 'null'}, resource: ${project.selectedResource || 'null'})`);
                        completed.push(project.id);
                    }
                } else {
                    // Corporation no longer exists - clean up orphaned project
                    console.warn(`   ❌ Orphaned project ${project.id}: corporation ${project.corporationId} not found`);
                    completed.push(project.id);
                }
            }
        }

        // Remove completed/failed projects from pending list
        this.pendingFirmCreations = this.pendingFirmCreations.filter(p => !completed.includes(p.id));
    }

    /**
     * Get the products a persona wants to produce
     * @param {Object} persona - Corporation persona
     * @returns {Array<string>} List of product names
     */
    getPersonaProducts(persona) {
        // Check if products already set (from selected focus)
        if (persona.products && Array.isArray(persona.products)) {
            return persona.products;
        }

        // Check product focuses
        if (persona.selectedFocus && persona.productFocuses) {
            const focus = persona.productFocuses[persona.selectedFocus];
            if (focus?.products) {
                return focus.products;
            }
        }

        return [];
    }

    /**
     * Find cities in countries that have the required resources for a persona
     * @param {Object} persona - Corporation persona
     * @returns {Array} Array of {city, country, matchingResources} objects
     */
    findSuitableCitiesForPersona(persona) {
        const requiredProducts = this.getPersonaProducts(persona);
        if (requiredProducts.length === 0) {
            // No specific requirements - return all cities
            return this.engine.cities.map(city => ({
                city,
                country: city.country,
                matchingResources: []
            }));
        }

        const suitableCities = [];

        for (const city of this.engine.cities) {
            const country = city.country;
            if (!country || !country.resources) continue;

            // Check which required products this country has
            const matchingResources = requiredProducts.filter(product =>
                country.resources.includes(product)
            );

            if (matchingResources.length > 0) {
                suitableCities.push({
                    city,
                    country,
                    matchingResources
                });
            }
        }

        return suitableCities;
    }

    /**
     * Select a city for firm creation based on persona requirements
     * @param {Object} persona - Corporation persona
     * @returns {Object|null} {city, country, selectedResource} or null if none found
     */
    selectCityForPersona(persona) {
        const suitableCities = this.findSuitableCitiesForPersona(persona);

        if (suitableCities.length === 0) {
            console.log(`   ⚠️ No suitable city found for ${persona.type}`);
            return null;
        }

        // Pick a random suitable city
        const selected = suitableCities[Math.floor(this.random() * suitableCities.length)];

        // Pick a specific resource from matching ones
        const selectedResource = selected.matchingResources.length > 0
            ? selected.matchingResources[Math.floor(this.random() * selected.matchingResources.length)]
            : null;

        return {
            city: selected.city,
            country: selected.country,
            selectedResource
        };
    }

    /**
     * Try to scale an existing firm's production when a supply gap is detected.
     * Priority: manufacturing shifts → mining workers/equipment → farm/logging tech upgrades.
     * @param {object} firm - Producer firm to scale
     * @returns {{ scaled: boolean, method?: string, cost?: number }}
     */
    _tryScaleExistingFirm(firm) {
        const RESERVE_MULTIPLIER = 3;  // Keep 3x the upgrade cost in cash after paying

        if (firm.type === 'MANUFACTURING') {
            // Add a shift (1→2→3): biggest bang-for-buck per dollar
            const currentShifts = firm.shiftConfig?.shiftCount || 1;
            if (currentShifts < 3 && typeof firm.setShiftCount === 'function') {
                const shiftCost = 80000;
                if ((firm.cash || 0) >= shiftCost * RESERVE_MULTIPLIER) {
                    firm.cash -= shiftCost;
                    firm.setShiftCount(currentShifts + 1);
                    firm.expenses = (firm.expenses || 0) + shiftCost;
                    return { scaled: true, method: `shift_${currentShifts + 1}`, cost: shiftCost };
                }
            }
            // Production line addition already auto-triggers in ManufacturingPlant.updateMonthly()
        }

        else if (firm.type === 'MINING') {
            // Priority 1: Hire more workers (permanent extraction rate increase)
            if (typeof firm.hireWorkers === 'function') {
                const hireCost = 25000;
                if ((firm.cash || 0) >= hireCost * RESERVE_MULTIPLIER) {
                    firm.cash -= hireCost;
                    firm.hireWorkers('miners', 10);
                    firm.hireWorkers('heavyEquipmentOperators', 3);
                    firm.expenses = (firm.expenses || 0) + hireCost;
                    return { scaled: true, method: 'hire_workers', cost: hireCost };
                }
            }
            // Priority 2: Equipment upgrade
            if (typeof firm.upgradeEquipment === 'function' && (firm.equipmentLevel || 0) < 5) {
                const upgradeCost = (firm.equipmentCosts || 50000) * 4;
                if ((firm.cash || 0) >= upgradeCost * RESERVE_MULTIPLIER) {
                    firm.upgradeEquipment(upgradeCost);
                    return { scaled: true, method: 'equipment_upgrade', cost: upgradeCost };
                }
            }
        }

        else {
            // Farm, LoggingCompany: base class upgradeEquipment() increments technologyLevel
            if (typeof firm.upgradeEquipment === 'function' && (firm.technologyLevel || 0) < 10) {
                const upgradeCost = 100000;
                if ((firm.cash || 0) >= upgradeCost * RESERVE_MULTIPLIER) {
                    firm.upgradeEquipment(upgradeCost);
                    return { scaled: true, method: 'tech_upgrade', cost: upgradeCost };
                }
            }
        }

        return { scaled: false };
    }

    /**
     * Check for supply gaps (product price > 1.3x base) and respond with two-tier escalation:
     * Tier 1: scale existing producing firm; Tier 2: queue a new firm if none can scale.
     * Called monthly from conductMonthlyPlanning().
     * @param {number} monthsElapsed - Current month count
     */
    _checkSupplyGapExpansion(monthsElapsed) {
        const registry = this.engine.productRegistry;
        if (!registry) return;

        for (const product of registry.products.values()) {
            const priceRatio = (product.currentPrice || product.basePrice) / product.basePrice;
            if (priceRatio < 1.3) continue;  // Only respond to shortages ≥30% above base

            let responded = false;

            // --- TIER 1: Scale an existing firm ---
            for (const firm of this.engine.firms.values()) {
                const produces = firm.product?.name === product.name
                              || firm.resourceType    === product.name
                              || firm.timberType      === product.name
                              || firm.cropType        === product.name
                              || firm.livestockType   === product.name;
                if (!produces) continue;

                const result = this._tryScaleExistingFirm(firm);
                if (result.scaled) {
                    console.log(`   ⬆️ ${firm.getDisplayName?.() || firm.id}: Scaled via ${result.method} ($${result.cost?.toLocaleString()}) — ${product.name} at ${(priceRatio * 100).toFixed(0)}% of base`);
                    responded = true;
                    break;  // One scaling action per product per month
                }
            }

            // --- TIER 2: Queue a new firm if no existing firm could scale ---
            if (!responded) {
                for (const firm of this.engine.firms.values()) {
                    const produces = firm.product?.name === product.name
                                  || firm.resourceType   === product.name
                                  || firm.timberType     === product.name
                                  || firm.cropType       === product.name
                                  || firm.livestockType  === product.name;
                    if (!produces) continue;

                    const corp = this.corporations.get(firm.corporationId);
                    if (!corp) continue;
                    if (corp.roadmap._hasGoalQueued?.(GOAL_TYPES.EXPAND_CAPACITY)) continue;

                    const capital = corp.getAvailableCapital?.() || corp.capital || 0;
                    const persona = corp.primaryPersona;
                    if (!persona) continue;
                    const tier = persona.tier;
                    const cost = (CAPITAL_REQUIREMENTS[tier]?.[persona.type]) || 3000000;
                    if (capital < cost * 1.2) continue;

                    corp.roadmap.addAction({
                        type: DECISION_TYPES.OPEN_FIRM,
                        horizon: ROAD_HORIZON.SHORT,
                        scheduledMonth: monthsElapsed,
                        persona,
                        tier,
                        goal: GOAL_TYPES.EXPAND_CAPACITY,
                        rationale: `Supply gap: ${product.name} at ${(priceRatio * 100).toFixed(0)}% of base — all existing firms at capacity`
                    });
                    console.log(`   📈 ${corp.abbreviation}: New firm queued — ${product.name} price ${(priceRatio * 100).toFixed(0)}% of base`);
                    break;
                }
            }
        }
    }

    /**
     * Find a product in the given tier whose every input has a supplier with available inventory.
     * Returns a product ID, or null if no viable product exists yet.
     * @param {string} tierName - 'SEMI_RAW' or 'MANUFACTURED'
     * @param {object} city - City where the firm will open
     * @returns {string|null} Product ID or null
     */
    _selectViableProduct(tierName, city) {
        const supplierSelector = this.engine.purchaseManager?.supplierSelector;
        if (!supplierSelector) return null;
        const products = this.engine.productRegistry?.getProductsByTier(tierName) || [];
        const viable = [];
        for (const product of products) {
            const inputs = product.inputs || [];
            if (inputs.length === 0) {
                viable.push(product.id);
                continue;
            }
            const allAvailable = inputs.every(input => {
                const selection = supplierSelector.selectBest({
                    buyer: { city, id: 'VIABILITY_CHECK' },
                    productName: input.material || input.name,
                    quantity: 1,
                    requireInventory: true,
                    forSpotPurchase: false
                });
                return !!selection?.supplier;
            });
            if (allAvailable) viable.push(product.id);
        }
        if (!viable.length) return null;
        return viable[Math.floor(this.random() * viable.length)];
    }

    /**
     * Create a firm from a completed project
     */
    createFirmFromProject(corporation, project) {
        // Delegate to FirmGenerator
        const firmGenerator = this.engine.firmGenerator;
        if (!firmGenerator) {
            console.error('FirmGenerator not available');
            return null;
        }

        const persona = project.persona;
        const firmType = persona.firmType || persona.type;

        // Get city/country from project (RAW firms have this pre-selected in the decision)
        let city, country, selectedResource;

        if (project.tier === INDUSTRY_TIERS.RAW) {
            // RAW firms: use pre-selected location from the decision
            if (project.city && project.country) {
                city = project.city;
                country = project.country;
                selectedResource = project.selectedResource;
            } else {
                // Fallback for legacy projects without pre-selected location
                const selection = this.selectCityForPersona(persona);
                if (!selection) {
                    console.log(`   ❌ Cannot create ${firmType} - no country has required resources`);
                    return null;
                }
                city = selection.city;
                country = selection.country;
                selectedResource = selection.selectedResource;
            }
        } else {
            // Non-RAW firms can go anywhere (they buy inputs from suppliers)
            const cities = this.engine.cities;
            city = cities[Math.floor(this.random() * cities.length)];
            country = city.country;
        }

        const firmId = this.engine.generateDeterministicId('FIRM', this.engine.firmCreationIndex++);

        let firm = null;

        switch (firmType) {
            case 'MINING':
            case 'MINING_COMPANY':
                // Pass the specific resource to create
                firm = firmGenerator.createMiningFirmWithResource(city, country, firmId, selectedResource);
                break;

            case 'LOGGING':
            case 'LOGGING_COMPANY':
                // Pass the specific timber type to create
                firm = firmGenerator.createLoggingFirmWithResource(city, country, firmId, selectedResource);
                break;

            case 'FARM':
            case 'FARM_CROP':
            case 'FARM_LIVESTOCK':
                // Pass the specific crop/livestock to create
                firm = firmGenerator.createFarmFirmWithResource(city, country, firmId, selectedResource, persona.type);
                break;

            case 'MANUFACTURING': {
                const isSemiRaw = project.tier === INDUSTRY_TIERS.SEMI_RAW;
                const tierName  = isSemiRaw ? 'SEMI_RAW' : 'MANUFACTURED';
                const selectedProductId = this._selectViableProduct(tierName, city);
                if (!selectedProductId) {
                    project._deferred = true;
                    project._deferralCount = (project._deferralCount || 0) + 1;
                    console.log(`   ⏳ ${corporation.abbreviation}: Opening deferred (${project._deferralCount}/12) — no product with available inputs`);
                    return null;
                }
                firm = firmGenerator.createManufacturingFirm(city, country, firmId, isSemiRaw, selectedProductId);
                break;
            }

            case 'RETAIL':
                firm = firmGenerator.createRetailFirm(city, country, firmId);
                break;

            default:
                console.warn(`Unknown firm type: ${firmType}`);
        }

        if (firm) {
            firm.corporationId = corporation.id;
            firm.corporationAbbreviation = corporation.abbreviation;
            firmGenerator.registerFirm(firm, city, corporation);
        }

        return firm;
    }

    /**
     * Create supply contract
     */
    createSupplyContract(corporation, decision) {
        // Find a supplier
        const marketState = this.calculateMarketState();
        const suppliers = marketState.suppliers.filter(s =>
            s.products.includes(decision.product) && s.operational
        );

        if (suppliers.length > 0) {
            const supplier = suppliers[Math.floor(this.random() * suppliers.length)];
            const contract = {
                id: `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                type: 'SUPPLY',
                supplierId: supplier.id,
                buyerId: corporation.id,
                product: decision.product,
                status: 'ACTIVE',
                createdAt: Date.now()
            };

            corporation.supplyContracts.push(contract);
            console.log(`   📝 ${corporation.abbreviation} signed supply contract for ${decision.product}`);
        }
    }

    /**
     * Create sales contract
     */
    createSalesContract(corporation, decision) {
        // Placeholder - would need buyer discovery
        console.log(`   📝 ${corporation.abbreviation} seeking sales contract for ${decision.product}`);
    }

    /**
     * Expand an existing firm
     */
    expandFirm(corporation, decision) {
        const firms = corporation.firms.filter(f =>
            f.type === decision.persona?.firmType ||
            f.type === 'MANUFACTURING'
        );

        if (firms.length > 0) {
            const firm = firms[0];
            // Increase production capacity
            if (firm.productionLine) {
                firm.productionLine.outputPerHour *= 1.2;
            }
            console.log(`   📈 ${corporation.abbreviation} expanded ${firm.getDisplayName?.() || firm.type}`);
        }
    }

    /**
     * Get all corporations
     */
    getAllCorporations() {
        return Array.from(this.corporations.values());
    }

    /**
     * Get corporation by ID
     */
    getCorporation(id) {
        return this.corporations.get(id);
    }
}

export { RAW_PERSONAS, SEMI_RAW_PERSONAS, MANUFACTURED_PERSONAS, RETAIL_PERSONAS };
