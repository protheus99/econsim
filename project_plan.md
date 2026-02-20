# EconSim Project Plan (Consolidated)

This document defines implementation solutions with similar items merged for efficient development.

---

## Merged Item Groups

| Group | Merged Items | Rationale |
|-------|--------------|-----------|
| **A** | #1, #4, #5, #21 | Supply chain & purchasing - all modify SimulationEngine.js |
| **B** | #3, #20 | Transaction display - both modify TransactionLog.js |
| **C** | #7, #8, #9 | Production systems - efficiency, shifts, lines |
| **D** | #10, #11, #12, #17 | Corporation features - strategy, branding, relationships, AI |
| **E** | #14, #15 | Geography & transport - map, routes, distances |
| **F** | #18, #19 | System fixes - farms and banks |

**Standalone Items**: #2, #6, #13, #16

---

## Priority Tiers (Revised)

| Tier | Description | Groups/Items |
|------|-------------|--------------|
| **P0** | Bug fixes | Group F (#18, #19) |
| **P1** | Core functionality | #2, #16, Group B |
| **P2** | Supply chain overhaul | Group A |
| **P3** | Production systems | Group C, #6 |
| **P4** | Corporation intelligence | Group D |
| **P5** | Visual/Infrastructure | Group E, #13 |

---

## Group A: Supply Chain & Competitive Purchasing

**Merged Items**: #1 Retail Purchasing Priority, #4 Competitive Retail, #5 Price Competition, #21 Inventory Contracts

**Rationale**: All items modify how firms select suppliers and execute purchases in SimulationEngine.js. Building them together creates a cohesive purchasing system.

### Combined Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PURCHASING DECISION                       │
├─────────────────────────────────────────────────────────────┤
│  1. Check CONTRACTS first (fulfilled before spot market)    │
│  2. Evaluate FIRM SUPPLIERS by:                             │
│     - Location priority (local > domestic > international)  │
│     - Price + transport cost                                │
│     - Relationship tier                                     │
│     - Inventory availability                                │
│  3. COMPETITIVE RETAIL: Demand distributed by attractiveness│
│  4. GLOBAL MARKET fallback (1.5x premium)                   │
└─────────────────────────────────────────────────────────────┘
```

### Files to Create

| File | Purpose |
|------|---------|
| `js/core/purchasing/PurchaseManager.js` | Central purchasing coordinator |
| `js/core/purchasing/SupplierSelector.js` | Supplier evaluation & ranking |
| `js/core/purchasing/TransportCost.js` | Distance & shipping calculations |
| `js/core/purchasing/Contract.js` | Supply agreement model |
| `js/core/purchasing/ContractManager.js` | Contract lifecycle management |
| `js/core/retail/CityRetailDemandManager.js` | City-wide demand calculation |
| `js/core/retail/RetailerAttractiveness.js` | Retailer scoring for competition |

### Files to Modify

| File | Changes |
|------|---------|
| `js/core/SimulationEngine.js` | Replace `processSupplyChain()` with `PurchaseManager` |
| `js/core/firms/RetailStore.js` | Add `fulfillAllocatedDemand()` |
| `js/core/City.js` | Add `localPreference` attribute |
| `data/config.json` | Add retail/purchasing config |

### Implementation

```javascript
// PurchaseManager.js - Central coordinator
class PurchaseManager {
    constructor(simulationEngine) {
        this.engine = simulationEngine;
        this.supplierSelector = new SupplierSelector(simulationEngine);
        this.contractManager = new ContractManager(simulationEngine);
        this.retailDemandManager = new CityRetailDemandManager(simulationEngine);
    }

    // Main entry point for all purchasing
    processPurchasing(currentHour) {
        // 1. Process contract deliveries first
        this.contractManager.processScheduledDeliveries(currentHour);

        // 2. Process manufacturer supply chain
        this.processManufacturerPurchasing();

        // 3. Process competitive retail sales
        this.processCompetitiveRetail(currentHour);
    }

    processManufacturerPurchasing() {
        const manufacturers = this.engine.firmManager.getManufacturers();

        for (const manufacturer of manufacturers) {
            for (const input of manufacturer.inputMaterials || []) {
                const needed = this.calculateNeeded(manufacturer, input);
                if (needed <= 0) continue;

                // Check contracts first
                const contractFulfilled = this.contractManager.fulfillFromContracts(
                    manufacturer, input.material, needed
                );

                const remaining = needed - contractFulfilled;
                if (remaining <= 0) continue;

                // Find best supplier considering all factors
                const selection = this.supplierSelector.selectBest({
                    buyer: manufacturer,
                    product: input.material,
                    quantity: remaining,
                    considerPrice: true,
                    considerTransport: true,
                    considerRelationship: true
                });

                if (selection) {
                    this.executePurchase(manufacturer, selection);
                } else {
                    // Global market fallback
                    this.purchaseFromGlobalMarket(manufacturer, input.material, remaining);
                }
            }
        }
    }

    processCompetitiveRetail(currentHour) {
        const cities = this.engine.cityManager.getAll();

        for (const city of cities) {
            const retailers = this.engine.firmManager.getRetailersInCity(city.id);
            const products = this.getProductsSoldInCity(city.id);

            for (const product of products) {
                // Calculate city-wide demand
                const totalDemand = this.retailDemandManager.calculateProductDemand(
                    product, city, currentHour
                );

                // Distribute among competing retailers
                const allocations = this.retailDemandManager.distributeToRetailers(
                    product, totalDemand, retailers, city
                );

                // Each retailer fulfills their allocation
                for (const [retailerId, allocation] of allocations) {
                    const retailer = this.engine.firmManager.getFirm(retailerId);
                    retailer.fulfillAllocatedDemand(product, allocation);
                }
            }
        }
    }
}

// SupplierSelector.js - Unified supplier evaluation
class SupplierSelector {
    constructor(simulationEngine) {
        this.engine = simulationEngine;
    }

    selectBest(options) {
        const { buyer, product, quantity, considerPrice, considerTransport, considerRelationship } = options;

        // Find all potential suppliers
        const suppliers = this.engine.firmManager.getSuppliersOf(product);
        if (suppliers.length === 0) return null;

        // Score each supplier
        const scored = suppliers.map(supplier => {
            const score = this.calculateScore(supplier, buyer, product, quantity, options);
            return { supplier, ...score };
        });

        // Sort by total score (lower is better for cost-based)
        scored.sort((a, b) => a.totalCost - b.totalCost);

        // Filter out those with insufficient inventory
        const viable = scored.filter(s => s.availableQty >= quantity * 0.5);

        return viable[0] || scored[0]; // Return best viable, or best overall
    }

    calculateScore(supplier, buyer, product, quantity, options) {
        const buyerCity = buyer.city;
        const supplierCity = supplier.city;

        // Location tier
        const locationTier = this.getLocationTier(supplierCity, buyerCity);

        // Base price
        const unitPrice = supplier.getPrice?.(product) ||
                         this.engine.productRegistry.getProductByName(product)?.basePrice || 100;

        // Transport cost
        let transportCost = 0;
        if (options.considerTransport) {
            transportCost = TransportCost.calculate(supplierCity, buyerCity, quantity);
        }

        // Relationship modifier
        let relationshipMod = 1.0;
        if (options.considerRelationship && this.engine.relationshipManager) {
            relationshipMod = this.engine.relationshipManager.getPriceModifier(
                supplier.corporationId, buyer.corporationId
            );
        }

        // Available inventory
        const availableQty = supplier.getInventory?.(product) || 0;

        // Total effective cost
        const totalCost = (unitPrice * quantity * relationshipMod) + transportCost;

        return {
            locationTier,
            unitPrice,
            transportCost,
            relationshipMod,
            availableQty,
            totalCost
        };
    }

    getLocationTier(supplierCity, buyerCity) {
        if (supplierCity?.name === buyerCity?.name) return 1; // Local
        if (supplierCity?.country?.name === buyerCity?.country?.name) return 2; // Domestic
        return 3; // International
    }
}

// TransportCost.js
class TransportCost {
    static RATES = {
        truck: 0.10,  // $/kg/km for local/regional
        rail: 0.05,   // $/kg/km for domestic
        ship: 0.02,   // $/kg/km for international
        air: 0.50     // $/kg/km for urgent
    };

    static calculate(originCity, destCity, quantity, mode = 'auto') {
        const distance = this.getDistance(originCity, destCity);
        const weight = quantity; // Assume 1kg per unit, adjust per product

        if (mode === 'auto') {
            if (distance < 100) mode = 'truck';
            else if (distance < 1000) mode = 'rail';
            else mode = 'ship';
        }

        return distance * weight * this.RATES[mode];
    }

    static getDistance(city1, city2) {
        if (!city1 || !city2) return 1000;

        // Use coordinates if available
        if (city1.lat && city1.lon && city2.lat && city2.lon) {
            return this.haversine(city1.lat, city1.lon, city2.lat, city2.lon);
        }

        // Fallback estimates
        if (city1.name === city2.name) return 10;
        if (city1.country?.name === city2.country?.name) return 500;
        return 2000;
    }

    static haversine(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}

// Contract.js & ContractManager.js
class Contract {
    static TYPES = {
        FIXED_VOLUME: 'fixed_volume',
        MIN_MAX: 'min_max',
        EXCLUSIVE: 'exclusive'
    };

    constructor(config) {
        this.id = config.id || `CONTRACT_${Date.now()}`;
        this.type = config.type || Contract.TYPES.FIXED_VOLUME;
        this.supplierId = config.supplierId;
        this.buyerId = config.buyerId;
        this.product = config.product;
        this.volumePerPeriod = config.volumePerPeriod;
        this.periodType = config.periodType || 'weekly';
        this.pricePerUnit = config.pricePerUnit;
        this.priceType = config.priceType || 'fixed';
        this.startDate = config.startDate || Date.now();
        this.endDate = config.endDate;
        this.status = 'active';
        this.fulfillmentHistory = [];
    }

    recordDelivery(quantity, quality) {
        const expected = this.volumePerPeriod;
        this.fulfillmentHistory.push({
            date: Date.now(),
            expected,
            delivered: quantity,
            quality,
            rate: quantity / expected
        });
    }
}

class ContractManager {
    constructor(simulationEngine) {
        this.engine = simulationEngine;
        this.contracts = new Map();
    }

    fulfillFromContracts(buyer, product, needed) {
        let fulfilled = 0;

        const relevantContracts = Array.from(this.contracts.values())
            .filter(c => c.buyerId === buyer.id && c.product === product && c.status === 'active');

        for (const contract of relevantContracts) {
            if (fulfilled >= needed) break;

            const supplier = this.engine.firmManager.getFirm(contract.supplierId);
            if (!supplier) continue;

            const available = supplier.getInventory(product);
            const toDeliver = Math.min(available, contract.volumePerPeriod, needed - fulfilled);

            if (toDeliver > 0) {
                this.engine.executeB2BTrade(supplier, buyer, product, toDeliver, contract.pricePerUnit);
                contract.recordDelivery(toDeliver, 1.0);
                fulfilled += toDeliver;
            }
        }

        return fulfilled;
    }

    getContractsForFirm(firmId) {
        return Array.from(this.contracts.values())
            .filter(c => c.buyerId === firmId || c.supplierId === firmId);
    }
}

// CityRetailDemandManager.js
class CityRetailDemandManager {
    constructor(simulationEngine) {
        this.engine = simulationEngine;
    }

    calculateProductDemand(product, city, hourOfDay) {
        const baseDemand = (product.purchaseFrequency || 1) * (city.population / 1000);
        const hourMod = this.getHourlyModifier(hourOfDay);
        const econMod = this.getEconomicModifier(product, city);
        const variance = 0.9 + Math.random() * 0.2;

        return Math.floor(baseDemand * hourMod * econMod * variance);
    }

    getHourlyModifier(hour) {
        const mods = [0.1,0.05,0.02,0.02,0.05,0.1,0.2,0.3,0.5,0.6,0.8,0.9,
                      1.0,0.9,0.8,0.7,0.8,0.9,1.0,1.0,0.8,0.6,0.4,0.2];
        return mods[hour] || 0.5;
    }

    getEconomicModifier(product, city) {
        const health = city.economicHealth || 0.5;
        if ((product.publicNecessity || 0) > 0.8) return Math.max(0.7, 0.9 + health * 0.1);
        if ((product.publicLuxury || 0) > 0.6) return 0.5 + health * 0.8;
        return 0.7 + health * 0.6;
    }

    distributeToRetailers(product, totalDemand, retailers, city) {
        const localPref = city.localPreference || 0.5;
        const allocations = new Map();

        // Split by locality
        const local = retailers.filter(r => r.isLocalTo?.(city) || r.city?.name === city.name);
        const nonLocal = retailers.filter(r => !local.includes(r));

        // Allocate pools
        let localPool = local.length > 0 ? totalDemand * localPref : 0;
        let nonLocalPool = nonLocal.length > 0 ? totalDemand * (1 - localPref) : 0;

        // Redistribute empty pools
        if (local.length === 0) nonLocalPool = totalDemand;
        if (nonLocal.length === 0) localPool = totalDemand;

        this.distributeByScore(local, localPool, product, allocations);
        this.distributeByScore(nonLocal, nonLocalPool, product, allocations);

        return allocations;
    }

    distributeByScore(retailers, pool, product, allocations) {
        if (retailers.length === 0 || pool <= 0) return;

        const scores = retailers.map(r => ({
            retailer: r,
            score: RetailerAttractiveness.calculate(r, product)
        }));

        const totalScore = scores.reduce((sum, s) => sum + s.score, 0);

        for (const { retailer, score } of scores) {
            const share = totalScore > 0 ? (score / totalScore) * pool : pool / retailers.length;
            allocations.set(retailer.id, { demand: Math.floor(share), score });
        }
    }
}

// RetailerAttractiveness.js
class RetailerAttractiveness {
    static calculate(retailer, product) {
        const priceScore = this.getPriceScore(retailer, product);
        const qualityScore = retailer.storeQuality || 50;
        const reputationScore = retailer.brandRating || 50;
        const stockBonus = retailer.getInventory?.(product.name) > 0 ? 10 : 0;

        return (priceScore * (product.priceConcern || 0.4)) +
               (qualityScore * (product.qualityConcern || 0.3)) +
               (reputationScore * (product.reputationConcern || 0.2)) +
               stockBonus;
    }

    static getPriceScore(retailer, product) {
        const avgPrice = product.basePrice || 100;
        const retailerPrice = retailer.getPrice?.(product.name) || avgPrice;
        const diff = (avgPrice - retailerPrice) / avgPrice;
        return Math.max(0, Math.min(100, 50 + diff * 250));
    }
}
```

### Integration in SimulationEngine.js

```javascript
// Replace existing supply chain processing
class SimulationEngine {
    constructor() {
        // ... existing
        this.purchaseManager = null;
    }

    initialize() {
        // ... existing
        this.purchaseManager = new PurchaseManager(this);
    }

    processFirmOperations() {
        // Replace old supply chain logic
        this.purchaseManager.processPurchasing(this.currentHour);
    }
}
```

---

## Group B: Transaction Display & Logging

**Merged Items**: #3 Lot Display in Transactions, #20 B2B vs B2C Transaction Display

**Rationale**: Both modify TransactionLog.js and transaction UI. Building together ensures consistent transaction data model.

### Combined Solution

```javascript
// TransactionLog.js - Enhanced with lot info and categories
class TransactionLog {
    constructor() {
        this.transactions = [];
    }

    // Unified logging method
    log(transaction) {
        const enhanced = {
            ...transaction,
            id: `TX_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            timestamp: Date.now(),
            category: this.categorize(transaction),
            // Lot info (if applicable)
            lotId: transaction.lotId || null,
            lotQuality: transaction.lotQuality || null,
            lotExpiration: transaction.lotExpiration || null
        };

        this.transactions.push(enhanced);
        return enhanced;
    }

    categorize(tx) {
        if (tx.type === 'GLOBAL_MARKET') return 'GLOBAL_MARKET';
        if (tx.buyerType === 'Consumer') return 'B2C_RETAIL';

        const sellerType = tx.sellerType || tx.seller?.type;
        if (['Mine', 'Farm', 'LoggingCamp', 'OilWell'].includes(sellerType)) return 'B2B_RAW';
        if (['SteelMill', 'Refinery', 'TextileMill'].includes(sellerType)) return 'B2B_SEMI';
        if (sellerType === 'ManufacturingPlant') {
            return tx.buyerType === 'RetailStore' ? 'B2B_WHOLESALE' : 'B2B_MANUFACTURED';
        }
        return 'B2B_OTHER';
    }

    // Convenience methods for B2B with lot info
    logB2BSale(seller, buyer, product, quantity, price, lotInfo = null) {
        return this.log({
            type: 'B2B_SALE',
            seller: { id: seller.id, name: seller.name, type: seller.type },
            buyer: { id: buyer.id, name: buyer.name, type: buyer.type },
            sellerType: seller.type,
            buyerType: buyer.type,
            product,
            quantity,
            unitPrice: price,
            totalPrice: quantity * price,
            lotId: lotInfo?.id,
            lotQuality: lotInfo?.quality,
            lotExpiration: lotInfo?.expiration
        });
    }

    logRetailSale(retailer, product, quantity, price) {
        return this.log({
            type: 'RETAIL_SALE',
            seller: { id: retailer.id, name: retailer.name, type: 'RetailStore' },
            buyer: { type: 'Consumer' },
            sellerType: 'RetailStore',
            buyerType: 'Consumer',
            product,
            quantity,
            unitPrice: price,
            totalPrice: quantity * price
        });
    }

    logGlobalMarketPurchase(buyer, product, quantity, price) {
        return this.log({
            type: 'GLOBAL_MARKET',
            seller: { name: 'Global Market', type: 'GlobalMarket' },
            buyer: { id: buyer.id, name: buyer.name, type: buyer.type },
            buyerType: buyer.type,
            product,
            quantity,
            unitPrice: price,
            totalPrice: quantity * price
        });
    }

    // Query methods
    getByCategory(category, limit = 100) {
        return this.transactions.filter(tx => tx.category === category).slice(-limit);
    }

    getForFirm(firmId, hours = 24) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return this.transactions.filter(tx =>
            (tx.seller?.id === firmId || tx.buyer?.id === firmId) &&
            tx.timestamp >= cutoff
        );
    }

    getSummaryByCategory() {
        const summary = {};
        for (const tx of this.transactions) {
            const cat = tx.category;
            if (!summary[cat]) summary[cat] = { count: 0, volume: 0, value: 0 };
            summary[cat].count++;
            summary[cat].volume += tx.quantity || 0;
            summary[cat].value += tx.totalPrice || 0;
        }
        return summary;
    }
}
```

### Transaction Display UI

```javascript
// transactions.js
function renderTransactionList(transactions, filters = {}) {
    let filtered = transactions;

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter(tx => tx.category === filters.category);
    }

    return filtered.map(tx => renderTransaction(tx)).join('');
}

function renderTransaction(tx) {
    const categoryClass = `tx-${tx.category.toLowerCase().replace(/_/g, '-')}`;
    const categoryBadge = getCategoryBadge(tx.category);

    let html = `<div class="transaction ${categoryClass}">`;
    html += `<div class="tx-header">`;
    html += `<span class="tx-time">${formatTime(tx.timestamp)}</span>`;
    html += `<span class="tx-category-badge">${categoryBadge}</span>`;
    html += `</div>`;

    html += `<div class="tx-parties">`;
    html += `<span class="tx-seller">${tx.seller?.name || 'Unknown'}</span>`;
    html += `<span class="tx-arrow">→</span>`;
    html += `<span class="tx-buyer">${tx.buyer?.name || tx.buyer?.type || 'Unknown'}</span>`;
    html += `</div>`;

    html += `<div class="tx-details">`;
    html += `<span class="tx-product">${tx.product}</span>`;
    html += `<span class="tx-quantity">×${tx.quantity}</span>`;
    html += `<span class="tx-price">$${tx.totalPrice?.toFixed(2)}</span>`;
    html += `</div>`;

    // Lot info (if present)
    if (tx.lotId) {
        html += `<div class="tx-lot-info">`;
        html += `<span class="lot-id">Lot: ${tx.lotId.substring(0, 8)}...</span>`;
        if (tx.lotQuality) {
            const qualityClass = tx.lotQuality >= 0.8 ? 'high' : tx.lotQuality >= 0.5 ? 'med' : 'low';
            html += `<span class="lot-quality ${qualityClass}">Q: ${(tx.lotQuality * 100).toFixed(0)}%</span>`;
        }
        html += `</div>`;
    }

    html += `</div>`;
    return html;
}

function getCategoryBadge(category) {
    const badges = {
        'B2B_RAW': '🪨 Raw',
        'B2B_SEMI': '⚙️ Semi',
        'B2B_MANUFACTURED': '�icing Mfg',
        'B2B_WHOLESALE': '📦 Wholesale',
        'B2C_RETAIL': '🛒 Retail',
        'GLOBAL_MARKET': '🌐 Global'
    };
    return badges[category] || category;
}

function renderCategoryFilters() {
    const categories = ['all', 'B2B_RAW', 'B2B_SEMI', 'B2B_MANUFACTURED', 'B2B_WHOLESALE', 'B2C_RETAIL', 'GLOBAL_MARKET'];

    return `<div class="tx-filters">
        ${categories.map(cat => `
            <button class="filter-btn" data-category="${cat}">
                ${cat === 'all' ? 'All' : getCategoryBadge(cat)}
            </button>
        `).join('')}
    </div>`;
}
```

### CSS for Transaction Categories

```css
/* Transaction category colors */
.tx-b2b-raw { border-left: 4px solid #795548; background: rgba(121, 85, 72, 0.05); }
.tx-b2b-semi { border-left: 4px solid #ff9800; background: rgba(255, 152, 0, 0.05); }
.tx-b2b-manufactured { border-left: 4px solid #2196f3; background: rgba(33, 150, 243, 0.05); }
.tx-b2b-wholesale { border-left: 4px solid #9c27b0; background: rgba(156, 39, 176, 0.05); }
.tx-b2c-retail { border-left: 4px solid #4caf50; background: rgba(76, 175, 80, 0.05); }
.tx-global-market { border-left: 4px solid #607d8b; background: rgba(96, 125, 139, 0.05); }

.tx-category-badge {
    font-size: 0.75em;
    padding: 2px 8px;
    border-radius: 12px;
    background: var(--surface-color);
}

.tx-lot-info {
    font-size: 0.85em;
    color: var(--text-muted);
    margin-top: 4px;
}

.lot-quality.high { color: #4caf50; }
.lot-quality.med { color: #ff9800; }
.lot-quality.low { color: #f44336; }
```

---

## Group C: Production Systems

**Merged Items**: #7 Production Efficiency, #8 Working Hours & Shifts, #9 Manufacturing Lines

**Rationale**: All affect how production works. Efficiency, shifts, and lines are interdependent systems.

### Combined Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│  BaseFirm                                                   │
│  ├── technologyLevel (affects rate)                         │
│  ├── equipmentAge (degrades over time)                      │
│  ├── workerSkillAvg (affects quality)                       │
│  └── shiftManager (controls operating hours)                │
│                                                             │
│  ManufacturingPlant                                         │
│  └── productionLines[] (each has own capacity & shifts)     │
│                                                             │
│  RawMaterialFirm (Mine, Farm, LoggingCamp)                  │
│  └── shiftManager (1-3 shifts, seasonal for farms)          │
└─────────────────────────────────────────────────────────────┘
```

### Files to Create

| File | Purpose |
|------|---------|
| `js/core/production/ShiftManager.js` | Shift scheduling and operating hours |
| `js/core/production/ProductionLine.js` | Individual manufacturing line |
| `js/core/production/EfficiencyCalculator.js` | Tech, equipment, skill modifiers |

### Implementation

```javascript
// ShiftManager.js
class ShiftManager {
    static SHIFTS = {
        DAY: { name: 'Day', start: 6, end: 14, premium: 1.0 },
        EVENING: { name: 'Evening', start: 14, end: 22, premium: 1.1 },
        NIGHT: { name: 'Night', start: 22, end: 6, premium: 1.25 }
    };

    constructor(config = {}) {
        this.activeShifts = config.activeShifts || ['DAY'];
        this.workersPerShift = config.workersPerShift || {};
        this.seasonalOverride = config.seasonalOverride || null;
    }

    isOperating(currentHour, currentMonth = null) {
        // Check seasonal override (for farms)
        if (this.seasonalOverride && currentMonth !== null) {
            const season = this.getSeason(currentMonth);
            if (!this.seasonalOverride[season]) return false;
        }

        for (const shiftName of this.activeShifts) {
            const shift = ShiftManager.SHIFTS[shiftName];
            if (this.isHourInShift(currentHour, shift)) return true;
        }
        return false;
    }

    isHourInShift(hour, shift) {
        if (shift.start < shift.end) {
            return hour >= shift.start && hour < shift.end;
        }
        return hour >= shift.start || hour < shift.end;
    }

    getCurrentShift(hour) {
        for (const [name, shift] of Object.entries(ShiftManager.SHIFTS)) {
            if (this.activeShifts.includes(name) && this.isHourInShift(hour, shift)) {
                return { name, ...shift };
            }
        }
        return null;
    }

    getLaborCostMultiplier(hour) {
        const shift = this.getCurrentShift(hour);
        return shift ? shift.premium : 0;
    }

    getSeason(month) {
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
    }

    addShift(shiftName, workers = 0) {
        if (!this.activeShifts.includes(shiftName)) {
            this.activeShifts.push(shiftName);
        }
        this.workersPerShift[shiftName] = workers;
    }

    removeShift(shiftName) {
        this.activeShifts = this.activeShifts.filter(s => s !== shiftName);
        delete this.workersPerShift[shiftName];
    }

    getWeeklyOperatingHours() {
        return this.activeShifts.length * 8 * 7; // 8 hours per shift, 7 days
    }
}

// EfficiencyCalculator.js
class EfficiencyCalculator {
    static calculate(firm) {
        const tech = firm.technologyLevel || 1.0;
        const equipmentAge = firm.equipmentAge || 0;
        const maxAge = firm.equipmentMaxAge || 8760;
        const workerSkill = firm.workerSkillAvg || 0.5;

        // Technology: 1.0 = standard, up to 2.0 = double speed
        const techFactor = tech;

        // Equipment: starts at 1.0, degrades to 0.7
        const equipmentFactor = 1.0 - (0.3 * Math.min(1, equipmentAge / maxAge));

        // Workers: 0.8 to 1.2 based on skill
        const skillFactor = 0.8 + (workerSkill * 0.4);

        return {
            production: techFactor * equipmentFactor * skillFactor,
            quality: this.calculateQuality(firm)
        };
    }

    static calculateQuality(firm) {
        const workerSkill = firm.workerSkillAvg || 0.5;
        const equipmentAge = firm.equipmentAge || 0;
        const maxAge = firm.equipmentMaxAge || 8760;

        const skillFactor = 0.7 + (workerSkill * 0.6);
        const equipmentFactor = 0.9 + (0.2 * (1 - equipmentAge / maxAge));

        return Math.min(1.3, skillFactor * equipmentFactor);
    }
}

// ProductionLine.js
class ProductionLine {
    constructor(config) {
        this.id = config.id || `LINE_${Date.now()}`;
        this.name = config.name || 'Line 1';
        this.capacity = config.capacity || 100;
        this.product = config.product || null;
        this.shiftManager = new ShiftManager(config.shifts || { activeShifts: ['DAY', 'EVENING'] });

        // State
        this.condition = 1.0;
        this.workersAssigned = config.workers || 0;
        this.isChangingOver = false;
        this.changeoverEndTime = null;
        this.maintenanceScheduled = null;
    }

    canProduce(currentHour) {
        if (!this.shiftManager.isOperating(currentHour)) return false;
        if (this.isInMaintenance()) return false;
        if (this.isChangingOver && Date.now() < this.changeoverEndTime) return false;
        return this.workersAssigned > 0 && this.product;
    }

    produce(currentHour, efficiencyMod = 1.0) {
        if (!this.canProduce(currentHour)) return { output: 0, reason: 'Not operating' };

        const output = Math.floor(this.capacity * this.condition * efficiencyMod);
        this.degradeCondition();

        return { output, condition: this.condition };
    }

    degradeCondition(hours = 1) {
        this.condition = Math.max(0.5, this.condition - (0.001 * hours));
    }

    switchProduct(newProduct) {
        if (this.product === newProduct) return;

        this.product = newProduct;
        this.isChangingOver = true;
        this.changeoverEndTime = Date.now() + (2 * 60 * 60 * 1000); // 2 hours
    }

    performMaintenance() {
        this.condition = 1.0;
        this.maintenanceScheduled = null;
    }

    isInMaintenance() {
        return this.maintenanceScheduled && Date.now() < this.maintenanceScheduled.endTime;
    }
}
```

### Updated Firm Classes

```javascript
// BaseFirm.js additions
class BaseFirm {
    constructor(config) {
        // ... existing
        this.technologyLevel = config.technologyLevel || 1.0;
        this.equipmentAge = 0;
        this.equipmentMaxAge = 8760; // 1 year
        this.workerSkillAvg = config.workerSkillAvg || 0.5;
        this.shiftManager = new ShiftManager(config.shifts);
    }

    getEfficiency() {
        return EfficiencyCalculator.calculate(this);
    }

    ageEquipment(hours = 1) {
        this.equipmentAge += hours;
    }

    upgradeEquipment(cost) {
        if (this.cash < cost) return false;
        this.cash -= cost;
        this.equipmentAge = 0;
        this.technologyLevel = Math.min(2.0, this.technologyLevel + 0.1);
        return true;
    }
}

// ManufacturingPlant.js additions
class ManufacturingPlant extends BaseFirm {
    constructor(config) {
        super(config);
        this.productionLines = [];

        // Initialize default line
        this.addProductionLine({
            capacity: this.productionRate,
            product: this.outputProduct,
            shifts: config.shifts
        });
    }

    addProductionLine(config) {
        const line = new ProductionLine({
            ...config,
            id: `${this.id}_LINE_${this.productionLines.length + 1}`
        });
        this.productionLines.push(line);
        return line;
    }

    produceHourly(currentHour) {
        const efficiency = this.getEfficiency();
        let totalOutput = 0;

        for (const line of this.productionLines) {
            const result = line.produce(currentHour, efficiency.production);

            if (result.output > 0) {
                const quality = Math.min(1.0, 0.7 * efficiency.quality * line.condition);

                this.lotInventory.addLot(line.product, {
                    quantity: result.output,
                    quality
                });

                totalOutput += result.output;
            }
        }

        this.ageEquipment(1);
        return totalOutput;
    }

    getTotalCapacity() {
        return this.productionLines.reduce((sum, line) => sum + line.capacity, 0);
    }
}

// Mine.js, Farm.js, LoggingCamp.js - Similar pattern
class Mine extends BaseFirm {
    produceHourly(currentHour, currentDate) {
        if (!this.shiftManager.isOperating(currentHour)) {
            return { produced: 0, reason: 'Outside operating hours' };
        }

        const efficiency = this.getEfficiency();
        const laborMod = this.shiftManager.getLaborCostMultiplier(currentHour);
        const laborCost = this.baseWage * this.workers * laborMod;

        const output = Math.floor(this.productionRate * efficiency.production);

        this.cash -= laborCost;
        this.ageEquipment(1);

        this.lotInventory.addLot(this.outputProduct, {
            quantity: output,
            quality: 0.7 * efficiency.quality
        });

        return { produced: output, laborCost };
    }
}
```

---

## Group D: Corporation Intelligence

**Merged Items**: #10 Strategy, #11 Branding & Reputation, #12 Relationships, #17 AI

**Rationale**: All work together to make corporations behave intelligently. Strategy informs AI decisions, reputation affects pricing, relationships affect trade terms.

### Combined Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CORPORATION SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│  Corporation                                                │
│  ├── strategy (vertical/horizontal/conglomerate)            │
│  ├── reputation (0-100, affects all operations)             │
│  ├── brands[] (product brands with equity)                  │
│  └── ai (makes expansion/closure decisions)                 │
│                                                             │
│  RelationshipManager (global)                               │
│  └── tracks corp-to-corp relationships (-100 to +100)       │
└─────────────────────────────────────────────────────────────┘
```

### Files to Create

| File | Purpose |
|------|---------|
| `js/core/corporation/CorporationStrategy.js` | Industry focus and synergies |
| `js/core/corporation/Brand.js` | Product brand with equity |
| `js/core/corporation/Reputation.js` | Corporate reputation score |
| `js/core/corporation/RelationshipManager.js` | Inter-corp relationships |
| `js/core/corporation/CorporationAI.js` | Decision-making engine |
| `js/core/corporation/MarketAnalyzer.js` | Market opportunity analysis |

### Implementation

```javascript
// CorporationStrategy.js
class CorporationStrategy {
    static TYPES = {
        VERTICAL: 'vertical',
        HORIZONTAL: 'horizontal',
        CONGLOMERATE: 'conglomerate'
    };

    static VERTICAL_CHAINS = {
        STEEL: ['Iron Mine', 'Steel Mill', 'Auto Parts Factory', 'Car Factory'],
        FOOD: ['Farm', 'Food Processor', 'Packaged Food Plant', 'Supermarket'],
        ELECTRONICS: ['Copper Mine', 'Wire Factory', 'Electronics Plant', 'Electronics Store'],
        TEXTILES: ['Cotton Farm', 'Textile Mill', 'Clothing Factory', 'Fashion Retail']
    };

    static HORIZONTAL_GROUPS = {
        RAW_MATERIALS: ['Mine', 'Farm', 'LoggingCamp', 'OilWell'],
        PROCESSING: ['SteelMill', 'Refinery', 'TextileMill', 'FoodProcessor'],
        MANUFACTURING: ['ManufacturingPlant'],
        RETAIL: ['RetailStore', 'Supermarket'],
        FINANCIAL: ['Bank', 'InsuranceCompany']
    };

    constructor(corporation, type = 'vertical') {
        this.corporation = corporation;
        this.type = type;
    }

    evaluateFirmFit(firmType, product) {
        if (this.type === 'vertical') {
            return this.evaluateVerticalFit(firmType);
        } else if (this.type === 'horizontal') {
            return this.evaluateHorizontalFit(firmType);
        }
        return 50;
    }

    evaluateVerticalFit(firmType) {
        for (const [chain, types] of Object.entries(CorporationStrategy.VERTICAL_CHAINS)) {
            const ownedInChain = this.corporation.firms.some(f => types.includes(f.type));
            if (ownedInChain && types.includes(firmType)) return 90;
        }
        return 20;
    }

    evaluateHorizontalFit(firmType) {
        for (const [group, types] of Object.entries(CorporationStrategy.HORIZONTAL_GROUPS)) {
            const ownedInGroup = this.corporation.firms.some(f => types.includes(f.type));
            if (ownedInGroup && types.includes(firmType)) return 90;
        }
        return 20;
    }

    getSynergyBonus() {
        let synergy = 0;

        // Co-location bonus
        const cityCount = {};
        for (const firm of this.corporation.firms) {
            const city = firm.city?.name;
            cityCount[city] = (cityCount[city] || 0) + 1;
            if (cityCount[city] > 1) synergy += 0.02;
        }

        // Vertical chain bonus
        if (this.type === 'vertical') {
            synergy += this.getChainLength() * 0.05;
        }

        return Math.min(0.30, synergy);
    }

    getChainLength() {
        let maxLength = 0;
        for (const chain of Object.values(CorporationStrategy.VERTICAL_CHAINS)) {
            const owned = chain.filter(type =>
                this.corporation.firms.some(f => f.type === type)
            );
            maxLength = Math.max(maxLength, owned.length);
        }
        return maxLength;
    }
}

// Brand.js
class Brand {
    constructor(config) {
        this.id = config.id || `BRAND_${Date.now()}`;
        this.name = config.name;
        this.corporationId = config.corporationId;
        this.positioning = config.positioning || 'mid';
        this.awareness = config.awareness || 0;
        this.equity = config.equity || 0;
        this.products = config.products || [];
    }

    getPriceMultiplier() {
        const positionMod = { budget: 0.85, mid: 1.0, premium: 1.25 }[this.positioning];
        const equityMod = 1 + (this.equity / 200);
        return positionMod * equityMod;
    }

    getDemandMultiplier() {
        return 0.5 + (this.awareness / 100) * 0.5;
    }

    applyMarketing(budget, type = 'digital') {
        const rates = { tv: 0.5, digital: 0.3, print: 0.2, sponsorship: 0.4 };
        const gain = budget * (rates[type] || 0.3) * (1 - this.awareness / 100) * 0.01;
        this.awareness = Math.min(100, this.awareness + gain);
        return gain;
    }

    updateFromSales(volume, satisfaction) {
        this.awareness = Math.min(100, this.awareness + volume * 0.001);
        this.equity = Math.max(0, Math.min(100, this.equity + (satisfaction - 50) / 100));
    }
}

// Reputation.js
class Reputation {
    constructor(corporationId) {
        this.corporationId = corporationId;
        this.score = 50;
        this.factors = {
            productQuality: 50,
            customerSatisfaction: 50,
            employeeRelations: 50,
            environmentalRecord: 50
        };
    }

    update() {
        const weights = { productQuality: 0.35, customerSatisfaction: 0.30,
                        employeeRelations: 0.20, environmentalRecord: 0.15 };
        this.score = Object.entries(this.factors)
            .reduce((sum, [k, v]) => sum + v * weights[k], 0);
    }

    recordEvent(type, impact) {
        this.score = Math.max(0, Math.min(100, this.score + impact));
    }

    decay() {
        if (this.score > 50) this.score -= 0.01;
        else if (this.score < 50) this.score += 0.01;
    }
}

// RelationshipManager.js
class RelationshipManager {
    constructor() {
        this.relationships = new Map();
    }

    getKey(a, b) { return [a, b].sort().join('_'); }

    get(corpA, corpB) {
        return this.relationships.get(this.getKey(corpA, corpB)) || 0;
    }

    set(corpA, corpB, score) {
        this.relationships.set(this.getKey(corpA, corpB),
            Math.max(-100, Math.min(100, score)));
    }

    adjust(corpA, corpB, delta) {
        this.set(corpA, corpB, this.get(corpA, corpB) + delta);
    }

    getTier(corpA, corpB) {
        const score = this.get(corpA, corpB);
        if (score >= 75) return 'allied';
        if (score >= 25) return 'friendly';
        if (score >= -24) return 'neutral';
        if (score >= -74) return 'rival';
        return 'hostile';
    }

    getPriceModifier(seller, buyer) {
        const mods = { allied: 0.90, friendly: 0.95, neutral: 1.0, rival: 1.10, hostile: 1.25 };
        return mods[this.getTier(seller, buyer)];
    }

    static ACTIONS = {
        TRADE_COMPLETED: 1,
        CONTRACT_SIGNED: 5,
        PRICE_UNDERCUT: -2,
        CONTRACT_BROKEN: -15
    };

    recordAction(corpA, corpB, action) {
        this.adjust(corpA, corpB, RelationshipManager.ACTIONS[action] || 0);
    }
}

// CorporationAI.js
class CorporationAI {
    constructor(corporation, engine) {
        this.corp = corporation;
        this.engine = engine;
        this.analyzer = new MarketAnalyzer(engine);
    }

    runDecisionCycle() {
        const decisions = [];

        // Evaluate existing firms
        for (const firm of this.corp.firms) {
            const perf = this.evaluatePerformance(firm);
            if (perf.profitability < -1000) {
                decisions.push({ type: 'CLOSE_FIRM', firmId: firm.id, reason: 'Unprofitable' });
            }
        }

        // Find expansion opportunities
        const opps = this.analyzer.findOpportunities(this.corp);
        for (const opp of opps.slice(0, 3)) {
            if (this.corp.cash >= opp.cost * 1.5 && opp.score > 70) {
                decisions.push({ type: 'BUILD_FIRM', ...opp });
            }
        }

        // Find supply chain gaps
        const gaps = this.analyzer.findSupplyGaps(this.corp);
        for (const gap of gaps) {
            decisions.push({ type: 'VERTICAL_INTEGRATION', ...gap });
        }

        return decisions;
    }

    evaluatePerformance(firm) {
        const txs = this.engine.transactionLog.getForFirm(firm.id, 720);
        const revenue = txs.filter(t => t.seller?.id === firm.id)
            .reduce((s, t) => s + t.totalPrice, 0);
        const costs = txs.filter(t => t.buyer?.id === firm.id)
            .reduce((s, t) => s + t.totalPrice, 0);
        const labor = (firm.employees || 0) * (firm.wage || 15) * 720;

        return { profitability: revenue - costs - labor, revenue, costs };
    }
}

// MarketAnalyzer.js
class MarketAnalyzer {
    constructor(engine) { this.engine = engine; }

    findOpportunities(corp) {
        const opps = [];
        const products = this.engine.productRegistry.getAllProducts();

        for (const product of products) {
            const demand = this.estimateDemand(product);
            const supply = this.estimateSupply(product);
            if (supply / Math.max(1, demand) < 0.7) {
                const fit = corp.strategy.evaluateFirmFit(this.getProducerType(product), product.name);
                if (fit > 50) {
                    opps.push({
                        product: product.name,
                        firmType: this.getProducerType(product),
                        city: this.findBestCity(product),
                        score: fit * (1 - supply / demand),
                        cost: this.estimateCost(product)
                    });
                }
            }
        }

        return opps.sort((a, b) => b.score - a.score);
    }

    findSupplyGaps(corp) {
        const gaps = [];
        for (const firm of corp.firms) {
            for (const input of firm.inputMaterials || []) {
                const hasSupplier = corp.firms.some(f => f.outputProduct === input.material);
                if (!hasSupplier) {
                    gaps.push({ consumer: firm.id, product: input.material });
                }
            }
        }
        return gaps;
    }

    estimateDemand(product) {
        return this.engine.firmManager.getConsumersOf(product.name)
            .reduce((sum, f) => sum + (f.productionRate || 10), 0) * 24;
    }

    estimateSupply(product) {
        return this.engine.firmManager.getProducersOf(product.name)
            .reduce((sum, f) => sum + f.getInventory(product.name) + (f.productionRate || 0) * 24, 0);
    }

    getProducerType(product) {
        if (product.tier === 'RAW') return product.category === 'agricultural' ? 'Farm' : 'Mine';
        if (product.tier === 'SEMI_RAW') return 'Processor';
        return 'ManufacturingPlant';
    }

    findBestCity(product) {
        // Find city with most demand for this product
        return this.engine.cityManager.getAll()
            .sort((a, b) => b.population - a.population)[0];
    }

    estimateCost(product) {
        return product.tier === 'RAW' ? 100000 : product.tier === 'SEMI_RAW' ? 250000 : 500000;
    }
}
```

---

## Group E: Geography & Transportation

**Merged Items**: #14 World Map, #15 Transportation & Order Tracking

**Rationale**: Both need city coordinates, distance calculations, and route visualization. Build the data foundation once.

### Combined Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  GEOGRAPHY & TRANSPORT                       │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── City coordinates (lat/lon)                             │
│  ├── Country boundaries (GeoJSON)                           │
│  └── Distance calculations (haversine)                      │
│                                                             │
│  Shipment System                                            │
│  ├── Shipment (order → processing → transit → delivered)    │
│  └── ShipmentManager (track all active shipments)           │
│                                                             │
│  Visualization                                              │
│  ├── WorldMap (countries, cities, trade routes)             │
│  └── ShipmentTracker UI (list, map, progress)               │
└─────────────────────────────────────────────────────────────┘
```

### Files to Create

| File | Purpose |
|------|---------|
| `data/cities.json` | City coordinates and metadata |
| `data/countries.geojson` | Country boundary data |
| `js/core/transport/Shipment.js` | Single shipment model |
| `js/core/transport/ShipmentManager.js` | Shipment lifecycle |
| `js/ui/WorldMap.js` | Map visualization |
| `js/pages/shipments.js` | Shipment tracking UI |

### Implementation

```javascript
// Shipment.js
class Shipment {
    static STATUS = { ORDERED: 'ordered', PROCESSING: 'processing',
                      IN_TRANSIT: 'in_transit', DELIVERED: 'delivered' };

    constructor(config) {
        this.id = config.id || `SHIP_${Date.now()}`;
        this.seller = config.seller;
        this.buyer = config.buyer;
        this.product = config.product;
        this.quantity = config.quantity;
        this.lotIds = config.lotIds || [];
        this.status = Shipment.STATUS.ORDERED;
        this.mode = config.mode || 'auto';

        this.orderedAt = Date.now();
        this.processingHours = 2;
        this.transitHours = this.calculateTransit();
        this.eta = this.orderedAt + ((this.processingHours + this.transitHours) * 3600000);
        this.deliveredAt = null;

        this.productCost = config.productCost;
        this.transportCost = config.transportCost;
    }

    calculateTransit() {
        const distance = TransportCost.getDistance(this.seller.city, this.buyer.city);
        const speeds = { truck: 60, rail: 80, ship: 40, air: 800 };

        if (this.mode === 'auto') {
            this.mode = distance < 100 ? 'truck' : distance < 1000 ? 'rail' : 'ship';
        }

        let hours = distance / speeds[this.mode];
        hours += 4; // Loading/unloading

        // International customs
        if (this.seller.city?.country?.name !== this.buyer.city?.country?.name) {
            hours += 8;
        }

        return Math.ceil(hours);
    }

    getProgress() {
        if (this.status === 'delivered') return 100;
        const elapsed = Date.now() - this.orderedAt;
        const total = this.eta - this.orderedAt;
        return Math.min(99, Math.floor((elapsed / total) * 100));
    }

    update(currentTime) {
        const hours = (currentTime - this.orderedAt) / 3600000;

        if (this.status === 'ordered' && hours >= 1) {
            this.status = 'processing';
        }
        if (this.status === 'processing' && hours >= this.processingHours) {
            this.status = 'in_transit';
        }
        if (this.status === 'in_transit' && currentTime >= this.eta) {
            this.status = 'delivered';
            this.deliveredAt = currentTime;
            return true;
        }
        return false;
    }
}

// ShipmentManager.js
class ShipmentManager {
    constructor() {
        this.active = new Map();
        this.completed = [];
    }

    create(config) {
        const shipment = new Shipment(config);
        this.active.set(shipment.id, shipment);
        return shipment;
    }

    process(currentTime) {
        const delivered = [];
        for (const [id, ship] of this.active) {
            if (ship.update(currentTime)) {
                delivered.push(ship);
                this.active.delete(id);
                this.completed.push(ship);
            }
        }
        return delivered;
    }

    getForFirm(firmId) {
        const incoming = [], outgoing = [];
        for (const s of this.active.values()) {
            if (s.buyer.id === firmId) incoming.push(s);
            if (s.seller.id === firmId) outgoing.push(s);
        }
        return { incoming, outgoing };
    }

    getAll() { return Array.from(this.active.values()); }
}

// WorldMap.js (uses D3.js)
class WorldMap {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svg = null;
        this.projection = null;
    }

    async init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.svg = d3.select(this.container).append('svg')
            .attr('width', width).attr('height', height);

        this.projection = d3.geoRobinson()
            .scale(150).translate([width/2, height/2]);

        this.path = d3.geoPath().projection(this.projection);

        const world = await fetch('data/countries.geojson').then(r => r.json());
        this.renderCountries(world);

        this.svg.call(d3.zoom().scaleExtent([1, 8])
            .on('zoom', e => this.svg.selectAll('g').attr('transform', e.transform)));
    }

    renderCountries(geojson) {
        this.svg.append('g').attr('class', 'countries')
            .selectAll('path').data(geojson.features).enter()
            .append('path').attr('d', this.path)
            .attr('class', 'country')
            .attr('fill', d => this.getCountryColor(d.properties.name));
    }

    renderCities(cities) {
        const g = this.svg.append('g').attr('class', 'cities');
        g.selectAll('circle').data(cities).enter()
            .append('circle')
            .attr('cx', d => this.projection([d.lon, d.lat])[0])
            .attr('cy', d => this.projection([d.lon, d.lat])[1])
            .attr('r', d => Math.max(3, Math.log(d.population / 10000) * 2))
            .attr('class', 'city-marker')
            .on('click', (e, d) => this.onCityClick(d));
    }

    renderShipments(shipments) {
        const g = this.svg.selectAll('.shipments').data([0]).join('g').attr('class', 'shipments');

        const lines = g.selectAll('.route').data(shipments, d => d.id);

        lines.enter().append('line').attr('class', 'route')
            .merge(lines)
            .attr('x1', d => this.projection([d.seller.city.lon, d.seller.city.lat])[0])
            .attr('y1', d => this.projection([d.seller.city.lon, d.seller.city.lat])[1])
            .attr('x2', d => this.projection([d.buyer.city.lon, d.buyer.city.lat])[0])
            .attr('y2', d => this.projection([d.buyer.city.lon, d.buyer.city.lat])[1])
            .attr('stroke', d => d.status === 'in_transit' ? '#4caf50' : '#999')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', d => d.status === 'in_transit' ? '5,5' : 'none');

        lines.exit().remove();
    }

    getCountryColor(name) {
        // Color by continent or custom scheme
        return '#e0e0e0';
    }
}
```

---

## Group F: System Fixes

**Merged Items**: #18 Farm System, #19 Bank System

**Rationale**: Both are bug fixes requiring review of existing systems. Can be worked on in parallel.

### Farm System Fix

```javascript
// Farm.js - Fixed implementation
class Farm extends BaseFirm {
    constructor(config) {
        super(config);
        this.type = 'Farm';
        this.cropType = config.cropType;
        this.outputProduct = config.cropType;
        this.acreage = config.acreage || 100;
        this.yieldPerAcre = config.yieldPerAcre || 10;
        this.growthDays = config.growthDays || 90;

        // State
        this.stage = 'fallow'; // fallow, planted, growing, ready
        this.daysSincePlanting = 0;
        this.cropHealth = 1.0;

        // Seasonal config
        this.plantingSeason = config.plantingSeason || 'spring';
        this.harvestSeason = config.harvestSeason || 'fall';

        // Initialize lot inventory
        this.lotInventory = this.lotInventory || new LotInventory();

        // Shift manager with seasonal override
        this.shiftManager = new ShiftManager({
            activeShifts: config.shifts || ['DAY'],
            seasonalOverride: { spring: true, summer: true, fall: true, winter: false }
        });
    }

    produceHourly(currentHour, currentDate) {
        if (!this.shiftManager.isOperating(currentHour, currentDate.getMonth())) {
            return { produced: 0, reason: 'Not operating' };
        }

        const season = this.getSeason(currentDate.getMonth());

        // Plant in planting season
        if (season === this.plantingSeason && this.stage === 'fallow') {
            this.stage = 'planted';
            this.daysSincePlanting = 0;
            this.cropHealth = 1.0;
            return { produced: 0, stage: 'planting' };
        }

        // Transition planted -> growing
        if (this.stage === 'planted') {
            this.stage = 'growing';
        }

        // Growing
        if (this.stage === 'growing') {
            this.daysSincePlanting += 1/24;
            if (this.daysSincePlanting >= this.growthDays) {
                this.stage = 'ready';
            }
            return { produced: 0, stage: 'growing', progress: this.daysSincePlanting / this.growthDays };
        }

        // Harvest in harvest season
        if (this.stage === 'ready' && season === this.harvestSeason) {
            return this.harvest();
        }

        return { produced: 0, stage: this.stage };
    }

    harvest() {
        const efficiency = this.getEfficiency();
        const baseYield = this.acreage * this.yieldPerAcre;
        const actualYield = Math.floor(baseYield * this.cropHealth * efficiency.production);

        const lot = this.lotInventory.addLot(this.outputProduct, {
            quantity: actualYield,
            quality: this.cropHealth * efficiency.quality
        });

        // Reset
        this.stage = 'fallow';
        this.daysSincePlanting = 0;

        return { produced: actualYield, stage: 'harvested', lotId: lot.id };
    }

    getSeason(month) {
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
    }

    applyWeather(type) {
        const effects = { drought: -0.3, flood: -0.4, frost: -0.5, ideal: 0.1 };
        this.cropHealth = Math.max(0, Math.min(1, this.cropHealth + (effects[type] || 0)));
    }
}
```

### Bank System Fix

```javascript
// Loan.js
class Loan {
    constructor(config) {
        this.id = config.id || `LOAN_${Date.now()}`;
        this.bankId = config.bankId;
        this.borrowerId = config.borrowerId;
        this.principal = config.principal;
        this.rate = config.rate;
        this.termMonths = config.termMonths;
        this.monthlyPayment = this.calcPayment();
        this.balance = this.principal;
        this.status = 'active';
        this.missedPayments = 0;
        this.payments = [];
    }

    calcPayment() {
        const r = this.rate / 12;
        const n = this.termMonths;
        return this.principal * (r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
    }

    makePayment(amount) {
        const interest = this.balance * (this.rate / 12);
        const principal = amount - interest;
        this.balance = Math.max(0, this.balance - principal);
        this.payments.push({ date: Date.now(), amount, interest, principal });
        if (this.balance <= 0) this.status = 'paid';
        return { interest, principal, remaining: this.balance };
    }

    miss() {
        this.missedPayments++;
        if (this.missedPayments >= 3) this.status = 'defaulted';
    }
}

// Bank.js
class Bank extends BaseFirm {
    constructor(config) {
        super(config);
        this.type = 'Bank';
        this.deposits = new Map();
        this.loans = new Map();
        this.reserveRatio = 0.1;
        this.baseRate = 0.08;
        this.totalDeposits = 0;
    }

    deposit(entityId, amount) {
        const bal = (this.deposits.get(entityId) || 0) + amount;
        this.deposits.set(entityId, bal);
        this.totalDeposits += amount;
        this.cash += amount;
        return bal;
    }

    withdraw(entityId, amount) {
        const bal = this.deposits.get(entityId) || 0;
        if (amount > bal) return { ok: false, reason: 'Insufficient funds' };
        const avail = this.cash - this.totalDeposits * this.reserveRatio;
        if (amount > avail) return { ok: false, reason: 'Bank liquidity' };

        this.deposits.set(entityId, bal - amount);
        this.totalDeposits -= amount;
        this.cash -= amount;
        return { ok: true, balance: bal - amount };
    }

    evaluateLoan(borrower, amount, term) {
        const score = this.creditScore(borrower);
        const maxLoan = this.maxLoan(borrower);

        if (amount > maxLoan) return { approved: false, reason: 'Exceeds max', maxLoan };
        if (score < 500) return { approved: false, reason: 'Low credit', score };

        const avail = this.cash - this.totalDeposits * this.reserveRatio;
        if (amount > avail) return { approved: false, reason: 'Bank funds' };

        const rate = this.baseRate + (800 - score) / 1000;
        return { approved: true, score, rate };
    }

    issueLoan(borrower, amount, term, rate) {
        const loan = new Loan({ bankId: this.id, borrowerId: borrower.id, principal: amount, rate, termMonths: term });
        this.loans.set(loan.id, loan);
        this.cash -= amount;
        borrower.cash += amount;
        return loan;
    }

    creditScore(entity) {
        let score = 600;
        if (entity.cash > 100000) score += 50;
        else if (entity.cash < 10000) score -= 50;

        const activeLoans = [...this.loans.values()].filter(l => l.borrowerId === entity.id && l.status === 'active');
        score -= activeLoans.length * 30;
        score -= activeLoans.reduce((s, l) => s + l.missedPayments * 50, 0);

        return Math.max(300, Math.min(850, score));
    }

    maxLoan(entity) {
        const monthly = entity.cash / 6;
        const assets = entity.cash + (entity.getInventoryValue?.() || 0);
        return Math.min(monthly * 5, assets * 0.5);
    }

    processMonthly() {
        for (const loan of this.loans.values()) {
            if (loan.status !== 'active') continue;
            const borrower = this.engine?.firmManager?.getFirm(loan.borrowerId);
            if (!borrower) continue;

            if (borrower.cash >= loan.monthlyPayment) {
                borrower.cash -= loan.monthlyPayment;
                loan.makePayment(loan.monthlyPayment);
                this.cash += loan.monthlyPayment;
            } else {
                loan.miss();
            }
        }

        // Pay deposit interest
        const depRate = this.baseRate * 0.3 / 12;
        for (const [id, bal] of this.deposits) {
            const interest = bal * depRate;
            this.deposits.set(id, bal + interest);
            this.totalDeposits += interest;
        }
    }
}
```

---

## Standalone Items

### Item #2: Potential Clients Display

No merge - unique UI feature for firm detail page.

```javascript
// In firms.js
function findPotentialClients(firm) {
    const product = firm.outputProduct;
    const firmCity = firm.city?.name;
    const firmCountry = firm.city?.country?.name;
    const firmCorp = firm.corporationId;

    const clients = { corpLocal: [], corpDomestic: [], corpIntl: [], local: [], domestic: [], intl: [] };
    const allFirms = window.simulationEngine?.firmManager?.getAllFirms() || [];

    for (const f of allFirms) {
        if (f.id === firm.id) continue;
        const needs = f.inputMaterials?.some(m => m.material === product);
        if (!needs) continue;

        const sameCity = f.city?.name === firmCity;
        const sameCountry = f.city?.country?.name === firmCountry;
        const sameCorp = f.corporationId === firmCorp;

        if (sameCorp && sameCity) clients.corpLocal.push(f);
        else if (sameCorp && sameCountry) clients.corpDomestic.push(f);
        else if (sameCorp) clients.corpIntl.push(f);
        else if (sameCity) clients.local.push(f);
        else if (sameCountry) clients.domestic.push(f);
        else clients.intl.push(f);
    }

    return clients;
}
```

### Item #6: Quality Tracking

No merge - extends Lot class specifically.

```javascript
// Lot.js additions
class Lot {
    constructor(config) {
        // ... existing
        this.quality = config.quality || 1.0;
        this.degradationRate = config.degradationRate || 0;
    }

    updateQuality(hours = 1) {
        if (this.degradationRate > 0) {
            this.quality = Math.max(0, this.quality - this.degradationRate * hours);
        }
    }

    getPriceMultiplier() {
        if (this.quality >= 0.9) return 1.15;
        if (this.quality >= 0.7) return 1.0;
        if (this.quality >= 0.5) return 0.85;
        return 0.60;
    }
}

// SimulationEngine.js - hourly quality degradation
processQualityDegradation() {
    for (const firm of this.firmManager.getAllFirms()) {
        if (!firm.lotInventory) continue;
        for (const [product, lots] of firm.lotInventory.lots) {
            for (const lot of lots) {
                lot.updateQuality(1);
                if (lot.quality <= 0 || lot.isExpired?.()) {
                    firm.lotInventory.removeLot(product, lot.id);
                }
            }
        }
    }
}
```

### Item #13: Commodity Market

No merge - independent pricing system.

```javascript
// CommodityMarket.js
class CommodityMarket {
    constructor(engine) {
        this.engine = engine;
        this.prices = new Map();
        this.history = new Map();
    }

    init(products) {
        for (const p of products.filter(p => p.tier === 'RAW')) {
            this.prices.set(p.name, p.basePrice);
            this.history.set(p.name, [{ time: Date.now(), price: p.basePrice }]);
        }
    }

    update() {
        for (const [name, price] of this.prices) {
            const supply = this.getSupply(name);
            const demand = this.getDemand(name);
            const ratio = supply / Math.max(1, demand);

            let change = 0;
            if (ratio < 0.8) change = (0.8 - ratio) * 0.05 * price;
            else if (ratio > 1.2) change = -(ratio - 1.2) * 0.03 * price;

            const base = this.engine.productRegistry.getProductByName(name)?.basePrice || 100;
            const newPrice = Math.max(base * 0.1, Math.min(base * 3, price + change * 0.5));

            this.prices.set(name, newPrice);
            this.record(name, newPrice);
        }
    }

    getSupply(name) {
        return this.engine.firmManager.getProducersOf(name)
            .reduce((s, f) => s + f.getInventory(name) + (f.productionRate || 0) * 24, 0);
    }

    getDemand(name) {
        return this.engine.firmManager.getConsumersOf(name)
            .reduce((s, f) => s + ((f.inputMaterials?.find(m => m.material === name)?.quantity || 0) * (f.productionRate || 1) * 24), 0);
    }

    get(name) { return this.prices.get(name); }

    record(name, price) {
        const h = this.history.get(name) || [];
        h.push({ time: Date.now(), price });
        if (h.length > 720) h.shift();
        this.history.set(name, h);
    }
}
```

### Item #16: Save & Load

No merge - core infrastructure.

See original project_plan.md for full implementation (SaveManager + Serializer classes with IndexedDB storage).

---

## Implementation Sequence (Revised)

### Phase 1: Bug Fixes (Week 1)
- **Group F**: Farm + Bank fixes

### Phase 2: Core Features (Week 2-3)
- **#2**: Potential Clients Display
- **#16**: Save/Load System
- **Group B**: Transaction Display (lots + categories)

### Phase 3: Supply Chain Overhaul (Week 4-5)
- **Group A**: Purchasing, Contracts, Retail Competition, Price Competition

### Phase 4: Production Systems (Week 6-7)
- **Group C**: Efficiency, Shifts, Production Lines
- **#6**: Quality Tracking

### Phase 5: Corporation Intelligence (Week 8-9)
- **Group D**: Strategy, Branding, Relationships, AI
- **#13**: Commodity Market

### Phase 6: Visual/Transport (Week 10+)
- **Group E**: World Map + Shipment Tracking

---

## File Summary (Consolidated)

### New Files

| Path | Groups |
|------|--------|
| `js/core/purchasing/PurchaseManager.js` | A |
| `js/core/purchasing/SupplierSelector.js` | A |
| `js/core/purchasing/TransportCost.js` | A, E |
| `js/core/purchasing/Contract.js` | A |
| `js/core/purchasing/ContractManager.js` | A |
| `js/core/retail/CityRetailDemandManager.js` | A |
| `js/core/retail/RetailerAttractiveness.js` | A |
| `js/core/production/ShiftManager.js` | C |
| `js/core/production/ProductionLine.js` | C |
| `js/core/production/EfficiencyCalculator.js` | C |
| `js/core/corporation/CorporationStrategy.js` | D |
| `js/core/corporation/Brand.js` | D |
| `js/core/corporation/Reputation.js` | D |
| `js/core/corporation/RelationshipManager.js` | D |
| `js/core/corporation/CorporationAI.js` | D |
| `js/core/corporation/MarketAnalyzer.js` | D |
| `js/core/transport/Shipment.js` | E |
| `js/core/transport/ShipmentManager.js` | E |
| `js/core/CommodityMarket.js` | #13 |
| `js/core/SaveManager.js` | #16 |
| `js/core/Serializer.js` | #16 |
| `js/ui/WorldMap.js` | E |
| `js/pages/shipments.js` | E |
| `data/cities.json` | E |
| `data/countries.geojson` | E |

### Modified Files

| File | Groups/Items |
|------|--------------|
| `js/core/SimulationEngine.js` | A, B, C, #6, #13 |
| `js/core/TransactionLog.js` | B |
| `js/core/Lot.js` | #6 |
| `js/core/firms/BaseFirm.js` | C |
| `js/core/firms/ManufacturingPlant.js` | C |
| `js/core/firms/Mine.js` | C |
| `js/core/firms/Farm.js` | F |
| `js/core/firms/Bank.js` | F |
| `js/core/firms/RetailStore.js` | A |
| `js/core/Corporation.js` | D |
| `js/core/City.js` | A |
| `js/pages/firms.js` | #2, B |
| `js/pages/transactions.js` | B |
| `css/styles.css` | B |
