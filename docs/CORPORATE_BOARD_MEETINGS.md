# Corporate Board Meetings & Organic Growth

## Overview

Corporations are created at simulation start with personas, goals, and capital—but **no firms**. Firms are created organically through monthly board meetings based on market conditions, supply availability, and corporate strategy.

```
Simulation Start:
├── Create countries, cities
├── Create corporations (personas, goals, capital, NO FIRMS)
└── Begin simulation loop
    └── Monthly: Board meetings → Decisions → Firm creation (if conditions met)

Economic Phases:
Month 1-3:   RAW firms establish (no dependencies)
Month 3-6:   SEMI_RAW firms open (RAW supply available)
Month 6-12:  MANUFACTURED firms start (processed materials available)
Month 9-18:  RETAIL firms open (products + contracts secured)
Month 12+:   Economy stabilizes, normal operations
```

---

## CORPORATION INITIAL STATE

### At Simulation Start

```javascript
const corporation = {
    // Identity (from CORPORATE_IDENTITY.md)
    id: 'CORP_001',
    name: 'Pacific Steel Industries',
    abbreviation: 'PSI',
    type: 'VERTICAL',                    // Specialist, Horizontal, Vertical, Conglomerate
    integrationLevel: 2,                  // Target level (0-4)

    // Personas (what they CAN do)
    primaryPersona: {
        type: 'STEEL_PROCESSING',
        tier: 'SEMI_RAW',
        productFocus: 'STEEL_PRODUCTION',
        products: ['Steel']
    },
    secondaryPersonas: [
        {
            type: 'MINING_COMPANY',
            tier: 'RAW',
            productFocus: 'FERROUS_METALS',
            products: ['Iron Ore', 'Coal']
        }
    ],

    // Financial State
    capital: 50000000,                    // Starting capital
    monthlyBudget: 0,                     // Calculated from revenue
    debt: 0,
    creditRating: 'A',

    // Operational State (starts empty)
    firms: [],                            // NO FIRMS AT START
    employees: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,

    // Contracts (starts empty)
    supplyContracts: [],                  // Contracts to receive materials
    salesContracts: [],                   // Contracts to sell products

    // Goals (drives decisions)
    goals: {
        primary: 'ESTABLISH_OPERATIONS',   // Current phase goal
        targetFirms: 5,                    // Desired firm count
        targetRevenue: 10000000,           // Monthly revenue target
        targetMarketShare: 0.15,           // 15% market share
        expansionPriority: 'VERTICAL',     // Vertical vs horizontal growth
        riskTolerance: 0.6                 // 0-1 scale
    },

    // Board State
    boardMeeting: {
        lastMeeting: null,
        nextMeeting: null,
        pendingDecisions: [],
        activeProjects: []                 // Firm creation in progress
    }
};
```

---

## CORPORATE GOALS FRAMEWORK

### Goal Types

| Goal | Description | Triggers | Success Criteria |
|------|-------------|----------|------------------|
| ESTABLISH_OPERATIONS | Initial setup phase | Simulation start | First firm operational |
| SECURE_SUPPLY | Get input materials | No supply contracts | Contracts signed |
| EXPAND_CAPACITY | Add production | Demand > capacity | New firm operational |
| VERTICAL_INTEGRATION | Add adjacent tier | Integration goal | New tier firm operational |
| HORIZONTAL_EXPANSION | Add same-tier persona | Market opportunity | New persona firm operational |
| INCREASE_MARKET_SHARE | Grow sales | Below target share | Target share reached |
| IMPROVE_PROFITABILITY | Cut costs/raise prices | Low margins | Target margin reached |
| ENTER_NEW_MARKET | Expand to new city | Opportunity | New city presence |

### Goal Priority by Corporation Phase

**Phase 1: Establishment (Months 1-6)**
```javascript
const PHASE_1_PRIORITIES = [
    'ESTABLISH_OPERATIONS',  // Must open first firm
    'SECURE_SUPPLY',         // Get materials flowing
    'EXPAND_CAPACITY'        // Scale up if demand exists
];
```

**Phase 2: Growth (Months 6-18)**
```javascript
const PHASE_2_PRIORITIES = [
    'EXPAND_CAPACITY',
    'VERTICAL_INTEGRATION',
    'ENTER_NEW_MARKET',
    'INCREASE_MARKET_SHARE'
];
```

**Phase 3: Maturity (Months 18+)**
```javascript
const PHASE_3_PRIORITIES = [
    'IMPROVE_PROFITABILITY',
    'HORIZONTAL_EXPANSION',
    'INCREASE_MARKET_SHARE',
    'VERTICAL_INTEGRATION'
];
```

### Goal State Machine

```
ESTABLISH_OPERATIONS
        │
        ▼ (first firm opened)
SECURE_SUPPLY ◄────────────────────┐
        │                          │
        ▼ (contracts secured)      │
EXPAND_CAPACITY                    │
        │                          │
        ├──► VERTICAL_INTEGRATION ─┤ (needs new supply)
        │                          │
        ├──► HORIZONTAL_EXPANSION ─┤
        │                          │
        ├──► ENTER_NEW_MARKET ─────┘
        │
        ▼ (capacity sufficient)
IMPROVE_PROFITABILITY
        │
        ▼
INCREASE_MARKET_SHARE
```

---

## BOARD MEETING MECHANICS

### Meeting Schedule

```javascript
// Board meetings occur on the 1st of each month
function scheduleBoardMeeting(corporation, gameTime) {
    const nextMonth = getFirstOfNextMonth(gameTime);
    corporation.boardMeeting.nextMeeting = nextMonth;
}
```

### Meeting Agenda

Each board meeting follows this agenda:

```javascript
const BOARD_MEETING_AGENDA = [
    'REVIEW_FINANCIALS',           // Check cash, revenue, expenses
    'REVIEW_OPERATIONS',           // Check firm performance
    'REVIEW_MARKET_CONDITIONS',    // Check supply/demand
    'EVALUATE_CURRENT_GOALS',      // Are we meeting goals?
    'IDENTIFY_OPPORTUNITIES',      // What can we do?
    'MAKE_DECISIONS',              // Approve actions
    'ALLOCATE_RESOURCES'           // Assign capital
];
```

### Board Meeting Algorithm

```javascript
function conductBoardMeeting(corporation, marketState, gameTime) {
    const meeting = {
        date: gameTime,
        decisions: [],
        approvedProjects: [],
        deferredProjects: []
    };

    // 1. Financial Review
    const financials = reviewFinancials(corporation);
    const availableCapital = calculateAvailableCapital(corporation);

    // 2. Operations Review
    const operations = reviewOperations(corporation);
    const firmPerformance = evaluateFirmPerformance(corporation);

    // 3. Market Analysis
    const marketAnalysis = analyzeMarket(corporation, marketState);
    const supplyAvailability = checkSupplyAvailability(corporation, marketState);
    const demandOpportunities = identifyDemandOpportunities(corporation, marketState);

    // 4. Goal Evaluation
    const goalProgress = evaluateGoalProgress(corporation);
    const currentGoal = determineCurrentGoal(corporation, goalProgress);

    // 5. Generate Decision Options
    const options = generateDecisionOptions(
        corporation,
        currentGoal,
        supplyAvailability,
        demandOpportunities,
        availableCapital
    );

    // 6. Prioritize and Approve
    const prioritizedOptions = prioritizeOptions(options, corporation.goals);

    for (const option of prioritizedOptions) {
        if (canAfford(option, availableCapital) && meetsPrerequisites(option)) {
            meeting.approvedProjects.push(option);
            availableCapital -= option.cost;
        } else {
            meeting.deferredProjects.push(option);
        }
    }

    // 7. Record Meeting
    corporation.boardMeeting.lastMeeting = meeting;
    corporation.boardMeeting.activeProjects.push(...meeting.approvedProjects);

    return meeting;
}
```

---

## DECISION OPTIONS

### Decision Types

| Decision | Description | Prerequisites | Cost Factor |
|----------|-------------|---------------|-------------|
| OPEN_FIRM | Create new facility | Supply available (or RAW tier) | High |
| SIGN_SUPPLY_CONTRACT | Secure input materials | Supplier exists | Low |
| SIGN_SALES_CONTRACT | Secure customer | Customer exists, product available | Low |
| EXPAND_FIRM | Add production lines | Firm exists, demand > capacity | Medium |
| CLOSE_FIRM | Shut down facility | Firm unprofitable | Negative |
| HIRE_WORKERS | Increase workforce | Firm exists | Low |
| ENTER_CITY | Establish presence | City identified | Medium |

### Decision Generation by Tier

**RAW Tier Corporations:**
```javascript
function generateRAWDecisions(corporation, marketState) {
    const decisions = [];

    // RAW firms can always open (no supply dependencies)
    if (corporation.firms.length === 0) {
        decisions.push({
            type: 'OPEN_FIRM',
            priority: 'CRITICAL',
            persona: corporation.primaryPersona,
            rationale: 'Establish initial operations'
        });
    }

    // Look for sales opportunities
    const potentialCustomers = findPotentialCustomers(
        corporation.primaryPersona.products,
        marketState
    );

    for (const customer of potentialCustomers) {
        decisions.push({
            type: 'SIGN_SALES_CONTRACT',
            priority: 'HIGH',
            customer: customer,
            products: corporation.primaryPersona.products,
            rationale: 'Secure revenue stream'
        });
    }

    // Expand if demand exceeds capacity
    if (hasExcessDemand(corporation)) {
        decisions.push({
            type: 'OPEN_FIRM',
            priority: 'HIGH',
            persona: corporation.primaryPersona,
            rationale: 'Meet excess demand'
        });
    }

    return decisions;
}
```

**SEMI_RAW Tier Corporations:**
```javascript
function generateSEMI_RAWDecisions(corporation, marketState) {
    const decisions = [];
    const requiredInputs = getRequiredInputs(corporation.primaryPersona);

    // Check if supply is available
    const supplyStatus = checkSupplyAvailability(requiredInputs, marketState);

    if (!supplyStatus.available) {
        // Can't open firm without supply
        // Look for suppliers to contract with
        for (const input of supplyStatus.missing) {
            const suppliers = findSuppliers(input, marketState);
            for (const supplier of suppliers) {
                decisions.push({
                    type: 'SIGN_SUPPLY_CONTRACT',
                    priority: 'CRITICAL',
                    supplier: supplier,
                    product: input,
                    rationale: `Secure ${input} supply before opening firm`
                });
            }
        }
        return decisions; // Can't do anything else until supply secured
    }

    // Supply available - can open firm
    if (corporation.firms.length === 0) {
        decisions.push({
            type: 'OPEN_FIRM',
            priority: 'CRITICAL',
            persona: corporation.primaryPersona,
            prerequisites: supplyStatus.contracts,
            rationale: 'Supply secured, establish operations'
        });
    }

    // Look for sales opportunities
    const potentialCustomers = findPotentialCustomers(
        corporation.primaryPersona.products,
        marketState
    );

    for (const customer of potentialCustomers) {
        decisions.push({
            type: 'SIGN_SALES_CONTRACT',
            priority: 'MEDIUM',
            customer: customer,
            rationale: 'Expand customer base'
        });
    }

    return decisions;
}
```

**MANUFACTURED Tier Corporations:**
```javascript
function generateMANUFACTUREDDecisions(corporation, marketState) {
    const decisions = [];
    const requiredInputs = getRequiredInputs(corporation.primaryPersona);

    // Check supply chain
    const supplyStatus = checkSupplyAvailability(requiredInputs, marketState);

    if (!supplyStatus.available) {
        // Need to secure supply first
        for (const input of supplyStatus.missing) {
            const suppliers = findSuppliers(input, marketState);

            if (suppliers.length === 0) {
                // No suppliers exist - wait or consider vertical integration
                if (corporation.integrationLevel >= 2) {
                    decisions.push({
                        type: 'CONSIDER_VERTICAL_INTEGRATION',
                        priority: 'MEDIUM',
                        direction: 'BACKWARD',
                        targetTier: 'SEMI_RAW',
                        product: input,
                        rationale: `No ${input} suppliers, consider self-supply`
                    });
                }
                continue;
            }

            for (const supplier of suppliers) {
                decisions.push({
                    type: 'SIGN_SUPPLY_CONTRACT',
                    priority: 'CRITICAL',
                    supplier: supplier,
                    product: input,
                    rationale: `Secure ${input} before manufacturing`
                });
            }
        }

        if (supplyStatus.missing.length > 0) {
            return decisions; // Can't manufacture without inputs
        }
    }

    // Supply available - can open firm
    if (corporation.firms.length === 0) {
        decisions.push({
            type: 'OPEN_FIRM',
            priority: 'CRITICAL',
            persona: corporation.primaryPersona,
            prerequisites: supplyStatus.contracts,
            rationale: 'Supply chain ready, begin manufacturing'
        });
    }

    // Check for retail opportunities (forward integration)
    if (corporation.type === 'VERTICAL' || corporation.type === 'CONGLOMERATE') {
        const retailOpportunities = findRetailOpportunities(
            corporation.primaryPersona.products,
            marketState
        );
        // ...
    }

    return decisions;
}
```

**RETAIL Tier Corporations:**
```javascript
function generateRETAILDecisions(corporation, marketState) {
    const decisions = [];
    const productsToSell = getProductsForRetailPersona(corporation.primaryPersona);

    // Check product availability
    const productAvailability = checkProductAvailability(productsToSell, marketState);

    if (!productAvailability.available) {
        // Can't open store without products to sell
        for (const product of productAvailability.missing) {
            const suppliers = findManufacturers(product, marketState);

            if (suppliers.length === 0) {
                // No manufacturers exist - must wait
                decisions.push({
                    type: 'DEFER',
                    priority: 'LOW',
                    reason: `Waiting for ${product} manufacturers`,
                    checkAgainIn: 3 // months
                });
                continue;
            }

            for (const supplier of suppliers) {
                decisions.push({
                    type: 'SIGN_SUPPLY_CONTRACT',
                    priority: 'CRITICAL',
                    supplier: supplier,
                    product: product,
                    rationale: `Secure ${product} inventory for retail`
                });
            }
        }

        // Need minimum product assortment
        if (productAvailability.percentAvailable < 0.5) {
            return decisions; // Wait for more products
        }
    }

    // Products available - can open store
    if (corporation.firms.length === 0 && productAvailability.percentAvailable >= 0.5) {
        decisions.push({
            type: 'OPEN_FIRM',
            priority: 'HIGH',
            persona: corporation.primaryPersona,
            prerequisites: productAvailability.contracts,
            city: selectCityForRetail(corporation, marketState),
            rationale: 'Product supply secured, open retail location'
        });
    }

    return decisions;
}
```

---

## FIRM CREATION PREREQUISITES

### Prerequisite Matrix

| Tier | Prerequisites | Can Open Without Market? |
|------|---------------|-------------------------|
| RAW | Capital only | YES - Commodities always needed |
| SEMI_RAW | Supply contracts for inputs | YES - Will find customers |
| MANUFACTURED | Supply contracts for materials | MAYBE - Need reasonable demand outlook |
| RETAIL | Supply contracts for products | NO - Must have inventory source |

### Detailed Prerequisites

**RAW Tier:**
```javascript
const RAW_PREREQUISITES = {
    MINING_COMPANY: {
        capital: 5000000,
        contracts: [],                    // No supply needed
        geography: ['MINING_REGION'],     // Optional
        permits: true
    },
    LOGGING_COMPANY: {
        capital: 2000000,
        contracts: [],
        geography: ['FOREST_REGION'],
        permits: true
    },
    FARM_CROP: {
        capital: 1500000,
        contracts: [],
        geography: ['AGRICULTURAL_REGION'],
        climate: ['TEMPERATE', 'TROPICAL']
    },
    FARM_LIVESTOCK: {
        capital: 2000000,
        contracts: [],
        geography: ['AGRICULTURAL_REGION'],
        climate: ['TEMPERATE']
    }
};
```

**SEMI_RAW Tier:**
```javascript
const SEMI_RAW_PREREQUISITES = {
    STEEL_PROCESSING: {
        capital: 15000000,
        contracts: [
            { product: 'Iron Ore', minQuantity: 10000 },
            { product: 'Coal', minQuantity: 2000 }
        ],
        infrastructure: ['INDUSTRIAL_ZONE', 'RAIL_ACCESS']
    },
    FOOD_INGREDIENT_PROCESSOR: {
        capital: 3000000,
        contracts: [
            // One of: Wheat, Corn, Sugarcane, etc.
            { category: 'GRAIN_OR_CROP', minQuantity: 5000 }
        ]
    },
    MEAT_PROCESSOR: {
        capital: 5000000,
        contracts: [
            { category: 'LIVESTOCK', minQuantity: 1000 }
        ],
        infrastructure: ['COLD_STORAGE']
    },
    TEXTILE_MILL: {
        capital: 4000000,
        contracts: [
            { product: 'Cotton', minQuantity: 3000 }
        ]
    }
};
```

**MANUFACTURED Tier:**
```javascript
const MANUFACTURED_PREREQUISITES = {
    PACKAGED_FOOD: {
        capital: 3000000,
        contracts: [
            // Depends on focus
            { category: 'FOOD_INGREDIENT', minQuantity: 'VARIES' }
        ],
        // Example for Bakery focus:
        BAKERY: {
            contracts: [
                { product: 'Flour', minQuantity: 1000 },
                { product: 'Sugar', minQuantity: 200 }
            ]
        }
    },
    CLOTHING: {
        capital: 2500000,
        contracts: [
            { product: 'Cotton Fabric', minQuantity: 5000 }
        ]
    },
    ELECTRONICS: {
        capital: 10000000,
        contracts: [
            { product: 'Copper Wire', minQuantity: 500 },
            { product: 'Aluminum Sheets', minQuantity: 1000 },
            { product: 'Plastic Pellets', minQuantity: 500 }
        ],
        workforce: { skilled: true, minWorkers: 200 }
    }
};
```

**RETAIL Tier:**
```javascript
const RETAIL_PREREQUISITES = {
    SUPERMARKET: {
        capital: 2000000,
        contracts: [
            // Need variety of products
            { category: 'PACKAGED_FOOD', minSKUs: 50 },
            { category: 'BEVERAGES', minSKUs: 20 }
        ],
        location: { minPopulation: 50000 }
    },
    ELECTRONICS_RETAIL: {
        capital: 1500000,
        contracts: [
            { category: 'ELECTRONICS', minSKUs: 30 }
        ],
        location: { minPopulation: 100000 }
    },
    FASHION_RETAIL: {
        capital: 800000,
        contracts: [
            { category: 'CLOTHING', minSKUs: 40 }
        ],
        location: { minPopulation: 75000 }
    }
};
```

---

## SUPPLY CHAIN VALIDATION

### Checking Supply Availability

```javascript
function checkSupplyAvailability(requiredInputs, marketState) {
    const result = {
        available: true,
        missing: [],
        contracts: [],
        suppliers: {}
    };

    for (const input of requiredInputs) {
        // Find corporations that produce this
        const suppliers = marketState.corporations.filter(corp =>
            corp.firms.some(firm =>
                firm.products.includes(input.product) &&
                firm.status === 'OPERATIONAL'
            )
        );

        if (suppliers.length === 0) {
            result.available = false;
            result.missing.push(input.product);
        } else {
            result.suppliers[input.product] = suppliers;

            // Check for available capacity
            const totalCapacity = suppliers.reduce((sum, corp) =>
                sum + getProductionCapacity(corp, input.product), 0
            );

            const totalDemand = marketState.getExistingDemand(input.product);
            const availableCapacity = totalCapacity - totalDemand;

            if (availableCapacity < input.minQuantity) {
                result.available = false;
                result.missing.push(input.product);
            }
        }
    }

    return result;
}
```

### Contract Negotiation

```javascript
function negotiateSupplyContract(buyer, supplier, product, quantity) {
    // Check if supplier has capacity
    const supplierCapacity = getAvailableCapacity(supplier, product);
    if (supplierCapacity < quantity) {
        return { success: false, reason: 'Insufficient capacity' };
    }

    // Determine price
    const marketPrice = getMarketPrice(product);
    const negotiatedPrice = marketPrice * (0.95 + Math.random() * 0.10); // 95-105%

    // Create contract
    const contract = {
        id: generateContractId(),
        supplier: supplier.id,
        buyer: buyer.id,
        product: product,
        quantity: quantity,
        pricePerUnit: negotiatedPrice,
        duration: 12, // months
        startDate: getCurrentDate(),
        status: 'ACTIVE'
    };

    // Register contract
    buyer.supplyContracts.push(contract);
    supplier.salesContracts.push(contract);

    return { success: true, contract };
}
```

---

## ECONOMIC PHASES

### Phase Timeline

```
MONTH 1-3: FOUNDATION PHASE
├── RAW corporations open first firms (no dependencies)
├── Mining, Logging, Farming begin operations
├── Commodities start flowing into market
└── SEMI_RAW corps begin contract negotiations

MONTH 3-6: PROCESSING PHASE
├── SEMI_RAW firms secure contracts from RAW firms
├── Steel mills, flour mills, textile mills open
├── Processed materials enter market
├── MANUFACTURED corps begin evaluating supply
└── Some MANUFACTURED corps start contracts

MONTH 6-12: MANUFACTURING PHASE
├── MANUFACTURED firms open (supply chains ready)
├── Consumer goods production begins
├── RETAIL corps start contract negotiations
├── First retail stores may open (limited selection)
└── Economy begins generating consumer sales

MONTH 12-18: RETAIL PHASE
├── More RETAIL firms open (product variety increases)
├── Consumer spending stabilizes
├── Corporations begin expansion decisions
├── Vertical integration opportunities emerge
└── Economy approaches equilibrium

MONTH 18+: MATURE PHASE
├── Normal economic cycles
├── Capacity adjustments based on demand
├── New market entry decisions
├── Competitive dynamics stabilize
└── Occasional disruptions and adjustments
```

### Phase Detection

```javascript
function determineEconomicPhase(marketState) {
    const rawFirms = countFirmsByTier(marketState, 'RAW');
    const semiRawFirms = countFirmsByTier(marketState, 'SEMI_RAW');
    const manufacturedFirms = countFirmsByTier(marketState, 'MANUFACTURED');
    const retailFirms = countFirmsByTier(marketState, 'RETAIL');

    const totalFirms = rawFirms + semiRawFirms + manufacturedFirms + retailFirms;

    // Foundation: Mostly RAW
    if (semiRawFirms < rawFirms * 0.3) {
        return 'FOUNDATION';
    }

    // Processing: SEMI_RAW catching up
    if (manufacturedFirms < semiRawFirms * 0.3) {
        return 'PROCESSING';
    }

    // Manufacturing: Consumer goods starting
    if (retailFirms < manufacturedFirms * 0.3) {
        return 'MANUFACTURING';
    }

    // Retail: Full chain exists
    if (retailFirms < getExpectedRetailCount(marketState)) {
        return 'RETAIL';
    }

    // Mature: Economy stabilized
    return 'MATURE';
}
```

---

## BOARD DECISION PRIORITIES BY PHASE

### Foundation Phase (RAW Focus)

```javascript
const FOUNDATION_PHASE_PRIORITIES = {
    RAW: {
        'OPEN_FIRM': 1.0,              // Top priority - establish operations
        'EXPAND_FIRM': 0.5,
        'SIGN_SALES_CONTRACT': 0.7
    },
    SEMI_RAW: {
        'SIGN_SUPPLY_CONTRACT': 1.0,   // Must secure supply first
        'OPEN_FIRM': 0.3,              // Wait for supply
        'DEFER': 0.6                   // Often need to wait
    },
    MANUFACTURED: {
        'DEFER': 0.9,                  // Too early
        'SIGN_SUPPLY_CONTRACT': 0.4   // Start looking
    },
    RETAIL: {
        'DEFER': 1.0                   // Way too early
    }
};
```

### Processing Phase

```javascript
const PROCESSING_PHASE_PRIORITIES = {
    RAW: {
        'EXPAND_FIRM': 0.8,            // Scale up for demand
        'SIGN_SALES_CONTRACT': 0.9,    // Lock in customers
        'OPEN_FIRM': 0.5
    },
    SEMI_RAW: {
        'OPEN_FIRM': 1.0,              // Green light to open
        'SIGN_SUPPLY_CONTRACT': 0.9,
        'SIGN_SALES_CONTRACT': 0.7
    },
    MANUFACTURED: {
        'SIGN_SUPPLY_CONTRACT': 0.8,   // Start locking in supply
        'OPEN_FIRM': 0.4,              // If supply secured
        'DEFER': 0.5
    },
    RETAIL: {
        'DEFER': 0.8                   // Still early
    }
};
```

### Manufacturing Phase

```javascript
const MANUFACTURING_PHASE_PRIORITIES = {
    RAW: {
        'EXPAND_FIRM': 0.7,
        'OPEN_FIRM': 0.4,
        'SIGN_SALES_CONTRACT': 0.8
    },
    SEMI_RAW: {
        'EXPAND_FIRM': 0.8,
        'SIGN_SALES_CONTRACT': 0.9,
        'OPEN_FIRM': 0.5
    },
    MANUFACTURED: {
        'OPEN_FIRM': 1.0,              // Go time
        'SIGN_SUPPLY_CONTRACT': 0.9,
        'SIGN_SALES_CONTRACT': 0.8
    },
    RETAIL: {
        'SIGN_SUPPLY_CONTRACT': 0.7,   // Start securing inventory
        'OPEN_FIRM': 0.4               // If products available
    }
};
```

### Retail Phase

```javascript
const RETAIL_PHASE_PRIORITIES = {
    RAW: {
        'EXPAND_FIRM': 0.6,
        'IMPROVE_EFFICIENCY': 0.7
    },
    SEMI_RAW: {
        'EXPAND_FIRM': 0.6,
        'IMPROVE_EFFICIENCY': 0.7
    },
    MANUFACTURED: {
        'EXPAND_FIRM': 0.7,
        'SIGN_SALES_CONTRACT': 0.9,    // Lock in retail customers
        'ENTER_NEW_MARKET': 0.5
    },
    RETAIL: {
        'OPEN_FIRM': 1.0,              // Open stores
        'SIGN_SUPPLY_CONTRACT': 0.9,
        'ENTER_NEW_MARKET': 0.6
    }
};
```

---

## CORPORATION ATTRIBUTES

### Attribute Definitions

```javascript
const CORPORATION_ATTRIBUTES = {
    // Risk tolerance affects decision making
    riskTolerance: {
        min: 0.0,
        max: 1.0,
        default: 0.5,
        effect: 'Higher = more aggressive expansion, lower capital reserves'
    },

    // Quality focus affects product pricing and costs
    qualityFocus: {
        min: 0.0,
        max: 1.0,
        default: 0.5,
        effect: 'Higher = premium products, higher costs, higher prices'
    },

    // Efficiency focus affects operations
    efficiencyFocus: {
        min: 0.0,
        max: 1.0,
        default: 0.5,
        effect: 'Higher = leaner operations, faster decisions'
    },

    // Growth vs stability preference
    growthOrientation: {
        min: 0.0,
        max: 1.0,
        default: 0.6,
        effect: 'Higher = prioritize expansion over profitability'
    },

    // Vertical vs horizontal preference
    integrationPreference: {
        min: 0.0,  // Pure horizontal
        max: 1.0,  // Pure vertical
        default: 0.5,
        effect: 'Higher = prefer vertical integration'
    },

    // Contract vs spot market preference
    contractPreference: {
        min: 0.0,  // Spot market
        max: 1.0,  // Long-term contracts
        default: 0.6,
        effect: 'Higher = prefer stable contracts'
    }
};
```

### Attribute Influence on Decisions

```javascript
function applyAttributesToDecision(corporation, decision) {
    const attrs = corporation.attributes;

    // Risk tolerance affects capital allocation
    if (decision.type === 'OPEN_FIRM') {
        decision.capitalBuffer = decision.cost * (1.5 - attrs.riskTolerance);
    }

    // Growth orientation affects expansion timing
    if (decision.type === 'EXPAND_FIRM') {
        decision.demandThreshold = 0.6 + (1 - attrs.growthOrientation) * 0.3;
    }

    // Contract preference affects supplier selection
    if (decision.type === 'SIGN_SUPPLY_CONTRACT') {
        decision.preferLongTerm = attrs.contractPreference > 0.5;
        decision.contractLength = Math.round(6 + attrs.contractPreference * 18);
    }

    // Integration preference affects vertical decisions
    if (decision.type === 'CONSIDER_VERTICAL_INTEGRATION') {
        decision.priority *= attrs.integrationPreference * 1.5;
    }

    return decision;
}
```

---

## IMPLEMENTATION SUMMARY

### What Changes from Current System

| Current | New |
|---------|-----|
| All firms created at start | No firms at start |
| Random firm distribution | Logical supply chain order |
| No supply validation | Must have contracts before opening |
| Instant economy | 12-18 month stabilization |
| No corporate decision making | Monthly board meetings |
| Static firm count | Organic growth based on conditions |

### New Components Required

1. **CorporationManager** - Tracks all corporations
2. **BoardMeeting** - Monthly decision engine
3. **ContractManager** - Supply/sales contracts
4. **MarketAnalyzer** - Supply/demand visibility
5. **FirmCreationQueue** - Pending firm projects
6. **EconomicPhaseTracker** - Tracks simulation phase

### Integration Points

```javascript
// SimulationEngine monthly update
function updateMonthly(gameTime) {
    // Existing updates...

    // NEW: Conduct board meetings
    if (isFirstOfMonth(gameTime)) {
        for (const corporation of this.corporations) {
            const marketState = this.getMarketState();
            const meeting = conductBoardMeeting(corporation, marketState, gameTime);
            this.processBoardDecisions(meeting);
        }
    }

    // NEW: Progress firm creation projects
    this.progressFirmCreation();
}
```

### Firm Creation Timeline

```javascript
const FIRM_CREATION_TIMELINE = {
    MINING_COMPANY: 3,      // 3 months to open
    LOGGING_COMPANY: 2,
    FARM_CROP: 2,
    FARM_LIVESTOCK: 2,
    STEEL_PROCESSING: 6,    // Major facility
    METAL_PROCESSING: 4,
    PETROLEUM_REFINERY: 8,
    FOOD_PROCESSOR: 3,
    TEXTILE_MILL: 4,
    PACKAGED_FOOD: 3,
    CLOTHING: 2,
    ELECTRONICS: 4,
    RETAIL_STORE: 2
};
```

---

## CONFIG OPTIONS

```json
{
    "corporations": {
        "boardMeetings": {
            "enabled": true,
            "frequency": "monthly",
            "dayOfMonth": 1
        },
        "firmCreation": {
            "organic": true,
            "validateSupplyChain": true,
            "minContractCoverage": 0.5
        },
        "economicPhases": {
            "foundationMonths": 3,
            "processingMonths": 6,
            "manufacturingMonths": 12,
            "retailMonths": 18
        },
        "startingCapital": {
            "RAW": 5000000,
            "SEMI_RAW": 10000000,
            "MANUFACTURED": 8000000,
            "RETAIL": 3000000
        }
    }
}
```
