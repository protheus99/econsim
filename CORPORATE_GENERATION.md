# Corporate Generation Algorithm

## Overview

This document defines the complete algorithm for generating corporations, their personas, product focuses, and firms.

```
Generation Flow:
1. Determine corporation count
2. For each corporation:
   a. Select corporation type (Specialist/Horizontal/Vertical/Conglomerate)
   b. Select primary industry tier
   c. Select primary persona
   d. Select product focus(es)
   e. Determine integration level
   f. Add secondary personas (if applicable)
   g. Generate firms for each persona
   h. Establish supply chain relationships
```

---

## STEP 1: Corporation Count

### Formula
```javascript
function calculateCorporationCount(config, cities) {
    const totalCities = cities.length;
    const avgFirmsPerCity = config.firms?.averagePerCity ?? 12;
    const expectedTotalFirms = totalCities * avgFirmsPerCity;
    const firmsPerCorp = config.corporations?.firmsPerCorp ?? 4;

    const corpCount = Math.round(expectedTotalFirms / firmsPerCorp);

    // Clamp to reasonable range
    const minCorps = Math.max(5, Math.floor(totalCities / 2));
    const maxCorps = totalCities * 3;

    return Math.min(Math.max(corpCount, minCorps), maxCorps);
}
```

### Example Calculations
| Cities | Avg Firms/City | Total Firms | Firms/Corp | Corporations |
|--------|----------------|-------------|------------|--------------|
| 8 | 12 | 96 | 4 | 24 |
| 15 | 12 | 180 | 4 | 45 |
| 25 | 12 | 300 | 4 | 75 |

---

## STEP 2: Corporation Type Selection

### Type Weights
```javascript
const CORPORATION_TYPE_WEIGHTS = {
    SPECIALIST: 0.60,      // 60% - Single persona, focused
    HORIZONTAL: 0.20,      // 20% - Multiple personas, same tier
    VERTICAL: 0.12,        // 12% - Adjacent tier integration
    CONGLOMERATE: 0.06,    // 6%  - Industrial group (3+ tiers)
    FULL_VERTICAL: 0.02    // 2%  - RAW to RETAIL (rare)
};
```

### Selection Algorithm
```javascript
function selectCorporationType(random) {
    const roll = random();
    let cumulative = 0;

    for (const [type, weight] of Object.entries(CORPORATION_TYPE_WEIGHTS)) {
        cumulative += weight;
        if (roll < cumulative) {
            return type;
        }
    }
    return 'SPECIALIST';
}
```

### Type Distribution (for 25 corps)
| Type | Weight | Expected | Actual Range |
|------|--------|----------|--------------|
| Specialist | 60% | 15 | 13-17 |
| Horizontal | 20% | 5 | 4-6 |
| Vertical | 12% | 3 | 2-4 |
| Conglomerate | 6% | 1-2 | 1-2 |
| Full Vertical | 2% | 0-1 | 0-1 |

---

## STEP 3: Industry Tier Selection

### Tier Weights by Corporation Type

**For Specialists:**
```javascript
const SPECIALIST_TIER_WEIGHTS = {
    RAW: 0.20,           // Mining, Logging, Farming
    SEMI_RAW: 0.25,      // Processing plants
    MANUFACTURED: 0.35,  // Consumer goods production
    RETAIL: 0.15,        // Stores
    SERVICES: 0.05       // Banks
};
```

**For Vertical Chains:**
```javascript
const VERTICAL_START_WEIGHTS = {
    RAW: 0.35,           // Start from extraction
    SEMI_RAW: 0.40,      // Start from processing
    MANUFACTURED: 0.25   // Start from manufacturing (forward to retail)
};
```

**For Conglomerates:**
```javascript
const CONGLOMERATE_ANCHOR_WEIGHTS = {
    RAW: 0.15,           // Resource-based conglomerate
    SEMI_RAW: 0.30,      // Processing-centered
    MANUFACTURED: 0.45,  // Consumer goods centered
    RETAIL: 0.10         // Retail-led (private label)
};
```

### Selection Algorithm
```javascript
function selectPrimaryTier(corporationType, random) {
    let weights;

    switch (corporationType) {
        case 'SPECIALIST':
        case 'HORIZONTAL':
            weights = SPECIALIST_TIER_WEIGHTS;
            break;
        case 'VERTICAL':
            weights = VERTICAL_START_WEIGHTS;
            break;
        case 'CONGLOMERATE':
        case 'FULL_VERTICAL':
            weights = CONGLOMERATE_ANCHOR_WEIGHTS;
            break;
    }

    return weightedSelect(weights, random);
}
```

---

## STEP 4: Persona Selection

### Persona Weights by Tier

**RAW Tier Personas:**
```javascript
const RAW_PERSONA_WEIGHTS = {
    MINING_COMPANY: 0.30,
    LOGGING_COMPANY: 0.10,
    FARM_CROP: 0.35,
    FARM_LIVESTOCK: 0.25
};
```

**SEMI_RAW Tier Personas:**
```javascript
const SEMI_RAW_PERSONA_WEIGHTS = {
    STEEL_PROCESSING: 0.12,
    METAL_PROCESSING: 0.12,
    PETROLEUM_REFINERY: 0.10,
    LUMBER_MILL: 0.08,
    PULP_MILL: 0.06,
    FOOD_INGREDIENT_PROCESSOR: 0.15,
    DAIRY_PROCESSOR: 0.06,
    MEAT_PROCESSOR: 0.10,
    SEAFOOD_PROCESSOR: 0.04,
    TEXTILE_MILL: 0.08,
    RUBBER_PROCESSOR: 0.03,
    GLASS_MANUFACTURING: 0.03,
    CHEMICAL_PRODUCTION: 0.03
};
```

**MANUFACTURED Tier Personas:**
```javascript
const MANUFACTURED_PERSONA_WEIGHTS = {
    PACKAGED_FOOD: 0.18,
    BEVERAGE: 0.08,
    CLOTHING: 0.12,
    ACCESSORIES: 0.05,
    BABY_PRODUCTS: 0.04,
    HEALTH_PRODUCTS: 0.06,
    BEAUTY_PRODUCTS: 0.08,
    HARDWARE: 0.04,
    AUTO_PARTS: 0.06,
    CLEANING_PRODUCTS: 0.05,
    APPLIANCE: 0.06,
    FURNITURE: 0.05,
    ELECTRONICS: 0.08,
    RECREATION: 0.03,
    VEHICLE: 0.02
};
```

**RETAIL Tier Personas:**
```javascript
const RETAIL_PERSONA_WEIGHTS = {
    SUPERMARKET: 0.20,
    CONVENIENCE_STORE: 0.15,
    DISCOUNT_GROCERY: 0.08,
    PHARMACY: 0.08,
    ELECTRONICS_RETAIL: 0.08,
    FASHION_RETAIL: 0.12,
    FOOTWEAR_RETAIL: 0.04,
    HOME_GOODS_RETAIL: 0.06,
    BABY_RETAIL: 0.02,
    SPORTING_GOODS: 0.04,
    TOY_RETAIL: 0.02,
    AUTO_RETAIL: 0.06,
    HARDWARE_RETAIL: 0.05
};
```

### Selection Algorithm
```javascript
function selectPersona(tier, random) {
    const weights = getPersonaWeightsForTier(tier);
    return weightedSelect(weights, random);
}
```

---

## STEP 5: Product Focus Selection

### Focus Options by Persona

**Mining Company Focuses:**
```javascript
const MINING_FOCUS_OPTIONS = {
    FERROUS_METALS: {
        products: ['Iron Ore', 'Coal'],
        weight: 0.30,
        downstreamAffinity: ['STEEL_PROCESSING']
    },
    NON_FERROUS_METALS: {
        products: ['Copper Ore', 'Aluminum Ore'],
        weight: 0.25,
        downstreamAffinity: ['METAL_PROCESSING']
    },
    PRECIOUS_METALS: {
        products: ['Gold Ore', 'Silver Ore'],
        weight: 0.15,
        downstreamAffinity: ['ACCESSORIES']
    },
    ENERGY_RESOURCES: {
        products: ['Crude Oil', 'Natural Gas'],
        weight: 0.20,
        downstreamAffinity: ['PETROLEUM_REFINERY']
    },
    INDUSTRIAL_MINERALS: {
        products: ['Limestone', 'Salt', 'Silica Sand'],
        weight: 0.10,
        downstreamAffinity: ['GLASS_MANUFACTURING', 'CHEMICAL_PRODUCTION']
    }
};
```

**Farm Crop Focuses:**
```javascript
const FARM_CROP_FOCUS_OPTIONS = {
    GRAIN_FARMING: {
        products: ['Wheat', 'Corn', 'Rice', 'Soybeans'],
        weight: 0.50,
        downstreamAffinity: ['FOOD_INGREDIENT_PROCESSOR']
    },
    INDUSTRIAL_CROPS: {
        products: ['Cotton', 'Sugarcane', 'Rubber Latex'],
        weight: 0.30,
        downstreamAffinity: ['TEXTILE_MILL', 'FOOD_INGREDIENT_PROCESSOR', 'RUBBER_PROCESSOR']
    },
    PRODUCE_FARMING: {
        products: ['Fresh Fruits', 'Vegetables'],
        weight: 0.20,
        downstreamAffinity: ['FOOD_INGREDIENT_PROCESSOR', 'PACKAGED_FOOD']
    }
};
```

**Farm Livestock Focuses:**
```javascript
const FARM_LIVESTOCK_FOCUS_OPTIONS = {
    CATTLE_RANCHING: {
        products: ['Cattle', 'Raw Hides'],
        weight: 0.30,
        downstreamAffinity: ['MEAT_PROCESSOR', 'TEXTILE_MILL']
    },
    PIG_FARMING: {
        products: ['Pigs'],
        weight: 0.20,
        downstreamAffinity: ['MEAT_PROCESSOR']
    },
    POULTRY_FARMING: {
        products: ['Chickens', 'Eggs'],
        weight: 0.25,
        downstreamAffinity: ['MEAT_PROCESSOR', 'PACKAGED_FOOD']
    },
    DAIRY_FARMING: {
        products: ['Raw Milk'],
        weight: 0.15,
        downstreamAffinity: ['DAIRY_PROCESSOR']
    },
    COMMERCIAL_FISHING: {
        products: ['Fish'],
        weight: 0.10,
        downstreamAffinity: ['SEAFOOD_PROCESSOR']
    }
};
```

**Packaged Food Focuses:**
```javascript
const PACKAGED_FOOD_FOCUS_OPTIONS = {
    BAKERY: {
        products: ['Bread', 'Cake'],
        weight: 0.25,
        upstreamSource: ['Flour', 'Sugar', 'Eggs']
    },
    CONFECTIONERY: {
        products: ['Candy', 'Ice Cream'],
        weight: 0.15,
        upstreamSource: ['Sugar', 'Pasteurized Milk']
    },
    BREAKFAST_FOODS: {
        products: ['Breakfast Cereal'],
        weight: 0.15,
        upstreamSource: ['Corn', 'Wheat', 'Sugar']
    },
    CANNED_GOODS: {
        products: ['Canned Goods'],
        weight: 0.10,
        upstreamSource: ['Steel', 'Vegetables']
    },
    PACKAGED_PROTEINS: {
        products: ['Packaged Meat', 'Packaged Seafood'],
        weight: 0.20,
        upstreamSource: ['Beef', 'Pork', 'Chicken', 'Processed Fish']
    },
    PACKAGED_PRODUCE: {
        products: ['Packaged Fruits'],
        weight: 0.05,
        upstreamSource: ['Fruit Concentrate']
    },
    COOKING_PRODUCTS: {
        products: ['Cooking Oil'],
        weight: 0.05,
        upstreamSource: ['Vegetable Oil']
    },
    DIVERSIFIED_FOOD: {
        products: ['Bread', 'Packaged Meat', 'Breakfast Cereal', 'Canned Goods'],
        weight: 0.05,
        upstreamSource: ['Multiple']
    }
};
```

**Clothing Focuses:**
```javascript
const CLOTHING_FOCUS_OPTIONS = {
    CASUAL_WEAR: {
        products: ['Shirts', 'Jeans', 'Sweaters', 'Socks'],
        weight: 0.40,
        upstreamSource: ['Cotton Fabric']
    },
    OUTERWEAR: {
        products: ['Jackets'],
        weight: 0.15,
        upstreamSource: ['Cotton Fabric', 'Steel']
    },
    FOOTWEAR: {
        products: ['Shoes'],
        weight: 0.25,
        upstreamSource: ['Leather', 'Rubber', 'Cotton Fabric']
    },
    FULL_APPAREL: {
        products: ['Shirts', 'Jeans', 'Jackets', 'Sweaters', 'Shoes', 'Socks'],
        weight: 0.20,
        upstreamSource: ['Cotton Fabric', 'Leather', 'Rubber']
    }
};
```

**Electronics Focuses:**
```javascript
const ELECTRONICS_FOCUS_OPTIONS = {
    COMPUTING: {
        products: ['Laptops', 'Personal Computer', 'Tablets', 'Monitors'],
        weight: 0.30,
        upstreamSource: ['Aluminum Sheets', 'Copper Wire', 'Gold Ore', 'Plastic Pellets']
    },
    MOBILE: {
        products: ['Cellphone'],
        weight: 0.20,
        upstreamSource: ['Aluminum Sheets', 'Copper Wire', 'Gold Ore']
    },
    ENTERTAINMENT: {
        products: ['TV', 'Console', 'Headphones'],
        weight: 0.20,
        upstreamSource: ['Aluminum Sheets', 'Copper Wire', 'Steel']
    },
    IMAGING: {
        products: ['Cameras', 'Printers'],
        weight: 0.10,
        upstreamSource: ['Steel', 'Copper Wire', 'Aluminum Sheets']
    },
    POWER: {
        products: ['Batteries'],
        weight: 0.05,
        upstreamSource: ['Steel', 'Copper Wire']
    },
    RECREATIONAL_TECH: {
        products: ['Drones'],
        weight: 0.05,
        upstreamSource: ['Aluminum Sheets', 'Copper Wire']
    },
    FULL_ELECTRONICS: {
        products: ['Laptops', 'Cellphone', 'TV', 'Tablets'],
        weight: 0.10,
        upstreamSource: ['Multiple metals']
    }
};
```

**Retail Persona Focuses:**
```javascript
const SUPERMARKET_FOCUS_OPTIONS = {
    GROCERY_FOCUS: {
        productsSold: ['Food', 'Beverages'],
        weight: 0.50,
        format: 'Supermarket'
    },
    HOUSEHOLD_FOCUS: {
        productsSold: ['Cleaning', 'Health', 'Beauty', 'Baby'],
        weight: 0.20,
        format: 'Supermarket'
    },
    FULL_SUPERMARKET: {
        productsSold: ['Food', 'Beverages', 'Cleaning', 'Health', 'Beauty', 'Baby'],
        weight: 0.30,
        format: 'Hypermarket'
    }
};

const FASHION_RETAIL_FOCUS_OPTIONS = {
    CASUAL_WEAR: {
        productsSold: ['Shirts', 'Jeans', 'Sweaters', 'Socks'],
        weight: 0.35,
        segment: 'MID_MARKET'
    },
    FOOTWEAR: {
        productsSold: ['Shoes'],
        weight: 0.20,
        segment: 'MID_MARKET'
    },
    ACCESSORIES: {
        productsSold: ['Watches', 'Jewelry', 'Belts', 'Bags'],
        weight: 0.15,
        segment: 'PREMIUM'
    },
    FULL_FASHION: {
        productsSold: ['Shirts', 'Jeans', 'Jackets', 'Shoes', 'Accessories'],
        weight: 0.30,
        segment: 'MID_MARKET'
    }
};
```

### Focus Selection Algorithm
```javascript
function selectProductFocus(persona, random) {
    const focusOptions = getFocusOptionsForPersona(persona);
    return weightedSelect(focusOptions, random);
}
```

---

## STEP 6: Integration Level Determination

### Level Assignment by Corporation Type
```javascript
function determineIntegrationLevel(corporationType, random) {
    switch (corporationType) {
        case 'SPECIALIST':
        case 'HORIZONTAL':
            return 0;

        case 'VERTICAL':
            // 70% Level 1, 30% Level 2
            return random() < 0.70 ? 1 : 2;

        case 'CONGLOMERATE':
            // 60% Level 2, 40% Level 3
            return random() < 0.60 ? 2 : 3;

        case 'FULL_VERTICAL':
            // 70% Level 3, 30% Level 4
            return random() < 0.70 ? 3 : 4;

        default:
            return 0;
    }
}
```

---

## STEP 7: Secondary Persona Selection

### Affinity Tables

**Natural Affinities (70% chance to combine):**
```javascript
const NATURAL_AFFINITIES = {
    // RAW → SEMI_RAW
    'MINING_FERROUS': ['STEEL_PROCESSING'],
    'MINING_NON_FERROUS': ['METAL_PROCESSING'],
    'MINING_ENERGY': ['PETROLEUM_REFINERY'],
    'LOGGING': ['LUMBER_MILL', 'PULP_MILL'],
    'FARM_GRAIN': ['FOOD_INGREDIENT_PROCESSOR'],
    'FARM_LIVESTOCK': ['MEAT_PROCESSOR'],
    'FARM_DAIRY': ['DAIRY_PROCESSOR'],
    'FARM_COTTON': ['TEXTILE_MILL'],

    // SEMI_RAW → MANUFACTURED
    'STEEL_PROCESSING': ['VEHICLE', 'AUTO_PARTS', 'APPLIANCE'],
    'METAL_PROCESSING': ['ELECTRONICS', 'APPLIANCE'],
    'PETROLEUM_REFINERY': ['CHEMICAL_PRODUCTION'],
    'FOOD_INGREDIENT_PROCESSOR': ['PACKAGED_FOOD'],
    'MEAT_PROCESSOR': ['PACKAGED_FOOD'],
    'DAIRY_PROCESSOR': ['PACKAGED_FOOD'],
    'TEXTILE_MILL': ['CLOTHING'],
    'CHEMICAL_PRODUCTION': ['HEALTH_PRODUCTS', 'BEAUTY_PRODUCTS', 'CLEANING_PRODUCTS'],

    // MANUFACTURED → RETAIL
    'PACKAGED_FOOD': ['SUPERMARKET', 'CONVENIENCE_STORE'],
    'BEVERAGE': ['SUPERMARKET', 'CONVENIENCE_STORE'],
    'CLOTHING': ['FASHION_RETAIL'],
    'ELECTRONICS': ['ELECTRONICS_RETAIL'],
    'APPLIANCE': ['ELECTRONICS_RETAIL', 'HOME_GOODS_RETAIL'],
    'FURNITURE': ['HOME_GOODS_RETAIL'],
    'HEALTH_PRODUCTS': ['PHARMACY'],
    'BEAUTY_PRODUCTS': ['BEAUTY_RETAIL', 'PHARMACY'],
    'AUTO_PARTS': ['AUTO_RETAIL'],
    'VEHICLE': ['AUTO_RETAIL'],

    // Horizontal (same tier)
    'PACKAGED_FOOD': ['BEVERAGE'],
    'HEALTH_PRODUCTS': ['BEAUTY_PRODUCTS', 'CLEANING_PRODUCTS'],
    'BEAUTY_PRODUCTS': ['CLEANING_PRODUCTS'],
    'ELECTRONICS': ['APPLIANCE'],
    'CLOTHING': ['ACCESSORIES'],
    'SUPERMARKET': ['CONVENIENCE_STORE', 'DISCOUNT_GROCERY'],
    'PHARMACY': ['BEAUTY_RETAIL']
};
```

**Compatible Affinities (40% chance to combine):**
```javascript
const COMPATIBLE_AFFINITIES = {
    'STEEL_PROCESSING': ['FURNITURE', 'HARDWARE'],
    'LUMBER_MILL': ['FURNITURE'],
    'FOOD_INGREDIENT_PROCESSOR': ['BEVERAGE'],
    'TEXTILE_MILL': ['ACCESSORIES'],
    'CLOTHING': ['BABY_PRODUCTS'],
    'PETROLEUM_REFINERY': ['CONVENIENCE_STORE'],
    'ELECTRONICS_RETAIL': ['HOME_GOODS_RETAIL'],
    'FASHION_RETAIL': ['BEAUTY_RETAIL']
};
```

### Secondary Persona Selection Algorithm
```javascript
function selectSecondaryPersonas(primaryPersona, corporationType, integrationLevel, random) {
    const secondaryPersonas = [];

    // Determine how many secondary personas to add
    const maxSecondary = getMaxSecondaryPersonas(corporationType, integrationLevel);

    if (maxSecondary === 0) return secondaryPersonas;

    // Get valid candidates
    const candidates = getAffinityCandidates(primaryPersona, corporationType);

    for (const candidate of candidates) {
        if (secondaryPersonas.length >= maxSecondary) break;

        const affinity = getAffinityLevel(primaryPersona, candidate);
        const chance = affinity === 'NATURAL' ? 0.70 :
                       affinity === 'COMPATIBLE' ? 0.40 : 0;

        if (random() < chance) {
            secondaryPersonas.push(candidate);
        }
    }

    return secondaryPersonas;
}

function getMaxSecondaryPersonas(corporationType, integrationLevel) {
    switch (corporationType) {
        case 'SPECIALIST': return 0;
        case 'HORIZONTAL': return 2;
        case 'VERTICAL': return integrationLevel; // 1-2
        case 'CONGLOMERATE': return 4;
        case 'FULL_VERTICAL': return 5;
        default: return 0;
    }
}
```

---

## STEP 8: Firm Generation

### Firms Per Persona
```javascript
const FIRMS_PER_PERSONA = {
    // RAW tier (resource extraction)
    MINING_COMPANY: { min: 2, max: 5 },
    LOGGING_COMPANY: { min: 1, max: 3 },
    FARM_CROP: { min: 2, max: 4 },
    FARM_LIVESTOCK: { min: 2, max: 4 },

    // SEMI_RAW tier (processing)
    STEEL_PROCESSING: { min: 1, max: 3 },
    METAL_PROCESSING: { min: 1, max: 3 },
    PETROLEUM_REFINERY: { min: 1, max: 2 },
    LUMBER_MILL: { min: 1, max: 2 },
    PULP_MILL: { min: 1, max: 2 },
    FOOD_INGREDIENT_PROCESSOR: { min: 1, max: 3 },
    DAIRY_PROCESSOR: { min: 1, max: 2 },
    MEAT_PROCESSOR: { min: 1, max: 3 },
    TEXTILE_MILL: { min: 1, max: 2 },
    CHEMICAL_PRODUCTION: { min: 1, max: 2 },

    // MANUFACTURED tier
    PACKAGED_FOOD: { min: 2, max: 4 },
    BEVERAGE: { min: 1, max: 3 },
    CLOTHING: { min: 2, max: 4 },
    ACCESSORIES: { min: 1, max: 2 },
    BABY_PRODUCTS: { min: 1, max: 2 },
    HEALTH_PRODUCTS: { min: 1, max: 2 },
    BEAUTY_PRODUCTS: { min: 1, max: 3 },
    HARDWARE: { min: 1, max: 2 },
    AUTO_PARTS: { min: 1, max: 3 },
    CLEANING_PRODUCTS: { min: 1, max: 2 },
    APPLIANCE: { min: 1, max: 3 },
    FURNITURE: { min: 1, max: 3 },
    ELECTRONICS: { min: 1, max: 3 },
    RECREATION: { min: 1, max: 2 },
    VEHICLE: { min: 1, max: 2 },

    // RETAIL tier
    SUPERMARKET: { min: 5, max: 15 },
    CONVENIENCE_STORE: { min: 10, max: 30 },
    DISCOUNT_GROCERY: { min: 5, max: 12 },
    PHARMACY: { min: 5, max: 15 },
    ELECTRONICS_RETAIL: { min: 3, max: 10 },
    FASHION_RETAIL: { min: 4, max: 12 },
    HOME_GOODS_RETAIL: { min: 2, max: 8 },
    AUTO_RETAIL: { min: 3, max: 10 },
    HARDWARE_RETAIL: { min: 3, max: 8 }
};
```

### Firm Generation Algorithm
```javascript
function generateFirms(corporation, cities, random) {
    const firms = [];

    for (const persona of corporation.personas) {
        const firmConfig = FIRMS_PER_PERSONA[persona.type];
        const firmCount = randomInt(firmConfig.min, firmConfig.max, random);

        for (let i = 0; i < firmCount; i++) {
            const city = selectCityForFirm(persona, cities, random);
            const firm = createFirm(corporation, persona, city, i, random);
            firms.push(firm);
        }
    }

    return firms;
}

function createFirm(corporation, persona, city, index, random) {
    return {
        id: generateFirmId(),
        name: generateFirmName(corporation, persona, index),
        type: getFirmType(persona),
        corporationId: corporation.id,
        corporationAbbreviation: corporation.abbreviation,
        city: city,
        product: selectProductFromFocus(persona.productFocus, random),
        productionLines: getInitialProductionLines(persona),
        employees: calculateEmployees(persona, random)
    };
}
```

### City Selection for Firms
```javascript
function selectCityForFirm(persona, cities, random) {
    // Filter cities based on persona requirements
    const validCities = cities.filter(city => {
        // RAW firms need specific geography
        if (persona.tier === 'RAW') {
            if (persona.type === 'MINING_COMPANY') {
                return city.hasMiningSites || random() < 0.3;
            }
            if (persona.type === 'LOGGING_COMPANY') {
                return city.climate !== 'DESERT';
            }
            if (persona.type === 'FARM_CROP' || persona.type === 'FARM_LIVESTOCK') {
                return city.isRural || random() < 0.4;
            }
        }

        // SEMI_RAW prefers industrial cities
        if (persona.tier === 'SEMI_RAW') {
            return city.population > 250000 || random() < 0.3;
        }

        // MANUFACTURED needs workforce
        if (persona.tier === 'MANUFACTURED') {
            return city.population > 100000;
        }

        // RETAIL needs population
        if (persona.tier === 'RETAIL') {
            return city.population > 50000;
        }

        return true;
    });

    // Weight by population for most firm types
    return weightedSelectByPopulation(validCities, random);
}
```

---

## STEP 9: Naming Conventions

### Corporation Names
```javascript
const CORPORATION_NAME_PATTERNS = {
    SPECIALIST: [
        '{Product} {Suffix}',           // "Iron Mining Corp"
        '{Region} {Industry}',          // "Pacific Steel"
        '{Adjective} {Product}',        // "Premier Foods"
        '{Founder} {Industry}'          // "Johnson Textiles"
    ],
    HORIZONTAL: [
        '{Industry} Group',             // "Consumer Products Group"
        '{Region} {Industry} Holdings', // "Midwest Food Holdings"
        'United {Industry}'             // "United Processors"
    ],
    VERTICAL: [
        '{Product} Industries',         // "Grain Industries"
        '{Region} {Product} Co',        // "Southern Textile Co"
        '{Product} Chain Corp'          // "Bakery Chain Corp"
    ],
    CONGLOMERATE: [
        '{Founder} Industries',         // "National Industries"
        '{Region} Corporation',         // "Continental Corporation"
        '{Name} Holdings'               // "Allied Holdings"
    ],
    FULL_VERTICAL: [
        '{Name} Enterprises',           // "Global Enterprises"
        '{Industry} International',     // "Energy International"
        '{Founder} Conglomerate'        // "Pacific Conglomerate"
    ]
};

const NAME_COMPONENTS = {
    regions: ['Pacific', 'Atlantic', 'Continental', 'National', 'American', 'Global',
              'Midwest', 'Southern', 'Northern', 'Western', 'Eastern', 'Central'],
    adjectives: ['Premier', 'United', 'Allied', 'Modern', 'Advanced', 'Quality',
                 'Superior', 'Prime', 'First', 'Excel', 'Apex', 'Summit'],
    suffixes: ['Corp', 'Inc', 'Co', 'Industries', 'Holdings', 'Group',
               'Enterprises', 'International', 'Corporation', 'Company'],
    founders: ['Anderson', 'Baker', 'Carter', 'Davis', 'Evans', 'Foster',
               'Graham', 'Harris', 'Irving', 'Johnson', 'Kennedy', 'Lewis']
};
```

### Firm Names
```javascript
function generateFirmName(corporation, persona, index) {
    const abbr = corporation.abbreviation;
    const suffix = getFirmSuffix(persona);

    if (index === 0) {
        return `${abbr} ${suffix}`;
    } else {
        return `${abbr} ${suffix} #${index + 1}`;
    }
}

const FIRM_SUFFIXES = {
    MINING_COMPANY: ['Mine', 'Mining Operation', 'Extraction Site'],
    LOGGING_COMPANY: ['Lumber Yard', 'Forestry', 'Timber Operation'],
    FARM_CROP: ['Farm', 'Fields', 'Plantation'],
    FARM_LIVESTOCK: ['Ranch', 'Farm', 'Feedlot'],
    STEEL_PROCESSING: ['Steel Mill', 'Steel Works', 'Foundry'],
    METAL_PROCESSING: ['Metal Works', 'Processing Plant', 'Smelter'],
    PETROLEUM_REFINERY: ['Refinery', 'Processing Facility'],
    PACKAGED_FOOD: ['Food Plant', 'Production Facility', 'Factory'],
    CLOTHING: ['Apparel Factory', 'Manufacturing', 'Garment Plant'],
    ELECTRONICS: ['Assembly Plant', 'Manufacturing', 'Tech Center'],
    SUPERMARKET: ['Supermarket', 'Market', 'Grocery'],
    CONVENIENCE_STORE: ['Express', 'QuickStop', 'Mini Mart'],
    FASHION_RETAIL: ['Store', 'Boutique', 'Shop']
};
```

---

## STEP 10: Supply Chain Establishment

### Internal Supply Chain
```javascript
function establishInternalSupplyChain(corporation) {
    const supplyLinks = [];
    const personasByTier = groupPersonasByTier(corporation.personas);

    // Connect RAW → SEMI_RAW
    for (const rawPersona of personasByTier.RAW || []) {
        for (const semiPersona of personasByTier.SEMI_RAW || []) {
            if (hasSupplyRelationship(rawPersona, semiPersona)) {
                supplyLinks.push({
                    supplier: rawPersona,
                    customer: semiPersona,
                    products: getSharedProducts(rawPersona, semiPersona),
                    type: 'INTERNAL'
                });
            }
        }
    }

    // Connect SEMI_RAW → MANUFACTURED
    for (const semiPersona of personasByTier.SEMI_RAW || []) {
        for (const mfgPersona of personasByTier.MANUFACTURED || []) {
            if (hasSupplyRelationship(semiPersona, mfgPersona)) {
                supplyLinks.push({
                    supplier: semiPersona,
                    customer: mfgPersona,
                    products: getSharedProducts(semiPersona, mfgPersona),
                    type: 'INTERNAL'
                });
            }
        }
    }

    // Connect MANUFACTURED → RETAIL
    for (const mfgPersona of personasByTier.MANUFACTURED || []) {
        for (const retailPersona of personasByTier.RETAIL || []) {
            if (hasSupplyRelationship(mfgPersona, retailPersona)) {
                supplyLinks.push({
                    supplier: mfgPersona,
                    customer: retailPersona,
                    products: getSharedProducts(mfgPersona, retailPersona),
                    type: 'INTERNAL'
                });
            }
        }
    }

    return supplyLinks;
}
```

### External Supply Chain Matching
```javascript
function establishExternalSupplyChains(corporations) {
    const externalLinks = [];

    for (const customer of corporations) {
        const needs = getExternalInputNeeds(customer);

        for (const need of needs) {
            // Find potential suppliers
            const suppliers = corporations.filter(c =>
                c.id !== customer.id &&
                canSupply(c, need.product)
            );

            if (suppliers.length > 0) {
                // Select best supplier (closest, best affinity)
                const supplier = selectBestSupplier(suppliers, customer, need);

                externalLinks.push({
                    supplier: supplier,
                    customer: customer,
                    product: need.product,
                    type: 'EXTERNAL'
                });
            }
        }
    }

    return externalLinks;
}
```

---

## COMPLETE GENERATION ALGORITHM

```javascript
function generateCorporations(config, cities, random) {
    const corporations = [];
    const corpCount = calculateCorporationCount(config, cities);

    for (let i = 0; i < corpCount; i++) {
        // Step 2: Select corporation type
        const corpType = selectCorporationType(random);

        // Step 3: Select primary industry tier
        const primaryTier = selectPrimaryTier(corpType, random);

        // Step 4: Select primary persona
        const primaryPersona = selectPersona(primaryTier, random);

        // Step 5: Select product focus
        const productFocus = selectProductFocus(primaryPersona, random);

        // Step 6: Determine integration level
        const integrationLevel = determineIntegrationLevel(corpType, random);

        // Step 7: Select secondary personas
        const secondaryPersonas = selectSecondaryPersonas(
            primaryPersona, corpType, integrationLevel, random
        );

        // Create corporation object
        const corporation = {
            id: generateCorpId(),
            name: generateCorpName(corpType, primaryPersona, random),
            abbreviation: generateAbbreviation(name),
            type: corpType,
            integrationLevel: integrationLevel,
            primaryPersona: {
                type: primaryPersona,
                tier: primaryTier,
                productFocus: productFocus
            },
            secondaryPersonas: secondaryPersonas.map(p => ({
                type: p.type,
                tier: p.tier,
                productFocus: selectProductFocus(p.type, random)
            })),
            personas: [primaryPersona, ...secondaryPersonas],
            firms: [],
            employees: 0,
            revenue: 0
        };

        // Step 8: Generate firms
        corporation.firms = generateFirms(corporation, cities, random);

        // Calculate totals
        corporation.employees = corporation.firms.reduce((sum, f) => sum + f.employees, 0);

        corporations.push(corporation);
    }

    // Step 10: Establish supply chains
    for (const corp of corporations) {
        corp.internalSupplyChain = establishInternalSupplyChain(corp);
    }

    const externalSupplyChains = establishExternalSupplyChains(corporations);

    return { corporations, externalSupplyChains };
}
```

---

## CONFIG OPTIONS

```json
{
    "corporations": {
        "firmsPerCorp": 4,
        "typeWeights": {
            "specialist": 0.60,
            "horizontal": 0.20,
            "vertical": 0.12,
            "conglomerate": 0.06,
            "fullVertical": 0.02
        },
        "tierWeights": {
            "raw": 0.20,
            "semiRaw": 0.25,
            "manufactured": 0.35,
            "retail": 0.15,
            "services": 0.05
        },
        "integrationChances": {
            "naturalAffinity": 0.70,
            "compatibleAffinity": 0.40
        },
        "naming": {
            "useFounderNames": true,
            "useRegionNames": true,
            "abbreviationLength": 3
        }
    }
}
```
