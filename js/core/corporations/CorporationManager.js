// js/core/corporations/CorporationManager.js
// Manages corporations, board meetings, and organic firm creation

import { Corporation, CORPORATION_TYPES, INDUSTRY_TIERS, GOAL_TYPES } from './Corporation.js';
import { BoardMeeting, DECISION_TYPES, determineEconomicPhase, FIRM_CREATION_TIMELINE } from './BoardMeeting.js';

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
            CATTLE_RANCHING: { products: ['Cattle', 'Raw Hides'], weight: 0.30, downstreamAffinity: ['MEAT_PROCESSOR', 'TEXTILE_MILL'] },
            PIG_FARMING: { products: ['Pigs'], weight: 0.20, downstreamAffinity: ['MEAT_PROCESSOR'] },
            POULTRY_FARMING: { products: ['Chickens', 'Eggs'], weight: 0.25, downstreamAffinity: ['MEAT_PROCESSOR', 'PACKAGED_FOOD'] },
            DAIRY_FARMING: { products: ['Raw Milk'], weight: 0.15, downstreamAffinity: ['DAIRY_PROCESSOR'] },
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
        this.boardMeeting = new BoardMeeting(engine);

        // Track firm creation projects
        this.pendingFirmCreations = [];

        // Economic phase tracking
        this.economicPhase = 'FOUNDATION';
        this.monthsElapsed = 0;
    }

    /**
     * Get seeded random from engine
     */
    random() {
        return this.engine.random();
    }

    /**
     * Generate corporations based on config
     * @returns {Array<Corporation>} Generated corporations
     */
    generateCorporations() {
        const config = this.engine.config;
        const firmsPerCityConfig = config.firms?.perCity ?? { min: 5, max: 10 };
        const avgFirmsPerCity = (firmsPerCityConfig.min + firmsPerCityConfig.max) / 2;
        const totalCities = config.cities?.initial ?? 8;
        const expectedTotalFirms = totalCities * avgFirmsPerCity;
        const firmsPerCorp = config.corporations?.firmsPerCorp ?? 4;

        const corpCount = Math.max(5, Math.round(expectedTotalFirms / firmsPerCorp));

        console.log(`📊 Generating ${corpCount} corporations (organic growth system)`);

        const corporations = [];

        for (let i = 0; i < corpCount; i++) {
            const corporation = this.generateCorporation(i);
            corporations.push(corporation);
            this.corporations.set(corporation.id, corporation);
            this.corporationsById.set(corporation.id, corporation);
        }

        // Log distribution
        const typeCounts = {};
        const tierCounts = {};
        for (const corp of corporations) {
            typeCounts[corp.type] = (typeCounts[corp.type] || 0) + 1;
            const tier = corp.getPrimaryTier();
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        }

        console.log(`   Types: ${JSON.stringify(typeCounts)}`);
        console.log(`   Tiers: ${JSON.stringify(tierCounts)}`);

        return corporations;
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
            targetFirms: this.calculateTargetFirms(corpType, integrationLevel)
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

    /**
     * Conduct monthly board meetings for all corporations
     */
    conductBoardMeetings(gameTime) {
        this.monthsElapsed++;

        // Calculate current market state
        const marketState = this.calculateMarketState();

        // Update economic phase
        this.economicPhase = determineEconomicPhase(marketState);

        console.log(`📋 Month ${this.monthsElapsed}: Board meetings (Phase: ${this.economicPhase})`);

        let totalApproved = 0;
        let totalDeferred = 0;

        for (const corporation of this.corporations.values()) {
            const meeting = this.boardMeeting.conductMeeting(corporation, marketState, gameTime);

            totalApproved += meeting.approvedProjects.length;
            totalDeferred += meeting.deferredProjects.length;

            // Process approved decisions
            for (const project of meeting.approvedProjects) {
                this.processDecision(corporation, project, gameTime);
            }
        }

        // Process pending firm creations
        this.processPendingCreations(gameTime);

        console.log(`   Decisions: ${totalApproved} approved, ${totalDeferred} deferred`);
        console.log(`   Pending firm creations: ${this.pendingFirmCreations.length}`);

        return {
            monthsElapsed: this.monthsElapsed,
            economicPhase: this.economicPhase,
            totalApproved,
            totalDeferred,
            pendingCreations: this.pendingFirmCreations.length
        };
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

        return {
            firmCounts,
            suppliers,
            buyers,
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
            status: 'IN_PROGRESS'
        });

        // Deduct capital
        corporation.spendCapital(decision.cost || 0, 'Firm creation');
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
                    const firm = this.createFirmFromProject(corporation, project);
                    if (firm) {
                        corporation.addFirm(firm);
                        console.log(`   ✅ ${corporation.abbreviation} opened: ${firm.getDisplayName?.() || firm.type}`);
                    }
                }
                completed.push(project.id);
            }
        }

        // Remove completed projects
        this.pendingFirmCreations = this.pendingFirmCreations.filter(p => !completed.includes(p.id));
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
        const cities = this.engine.cities;
        const city = cities[Math.floor(this.random() * cities.length)];
        const country = city.country;

        const firmId = this.engine.generateDeterministicId('FIRM', this.engine.firmCreationIndex++);

        let firm = null;

        switch (persona.firmType || persona.type) {
            case 'MINING':
            case 'MINING_COMPANY':
                firm = firmGenerator.createMiningFirm(city, country, firmId);
                break;

            case 'LOGGING':
            case 'LOGGING_COMPANY':
                firm = firmGenerator.createLoggingFirm(city, country, firmId);
                break;

            case 'FARM':
            case 'FARM_CROP':
            case 'FARM_LIVESTOCK':
                firm = firmGenerator.createFarmFirm(city, country, firmId);
                break;

            case 'MANUFACTURING':
                const isSemiRaw = project.tier === INDUSTRY_TIERS.SEMI_RAW;
                firm = firmGenerator.createManufacturingFirm(city, country, firmId, isSemiRaw);
                break;

            case 'RETAIL':
                firm = firmGenerator.createRetailFirm(city, country, firmId);
                break;

            default:
                console.warn(`Unknown firm type: ${persona.firmType || persona.type}`);
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
