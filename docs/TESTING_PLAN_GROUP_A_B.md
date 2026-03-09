# Testing Plan: Group A & B

## Overview

This document outlines the testing strategy for:
- **Group A**: Supply Chain & Competitive Purchasing System
- **Group B**: Transaction Display & Logging Enhancements

---

## Group A: Supply Chain & Purchasing

### A1. TransportCost.js

#### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| A1.1 | `getDistance()` same city | Returns ~10 km |
| A1.2 | `getDistance()` with coordinates | Returns haversine distance |
| A1.3 | `getDistance()` same country, no coords | Returns 200-800 km estimate |
| A1.4 | `getDistance()` different countries | Returns 1000-3000 km estimate |
| A1.5 | `haversine()` known cities | Verify against known distances (e.g., NYC to LA ~3940 km) |
| A1.6 | `calculate()` local delivery | Mode = truck, cost proportional |
| A1.7 | `calculate()` domestic 500km | Mode = rail if available |
| A1.8 | `calculate()` international coastal | Mode = ship |
| A1.9 | `selectBestMode()` < 100km | Returns 'truck' |
| A1.10 | `selectBestMode()` international no port | Returns 'rail' |
| A1.11 | `calculateTransitTime()` with customs | Adds 8 hours for international |
| A1.12 | `compareOptions()` all modes | Returns sorted by cost with cheapest identified |

#### Test Data
```javascript
const testCities = {
    local: { id: 'city1', name: 'CityA', country: { name: 'USA' }, coordinates: { lat: 40.7, lon: -74.0 } },
    domestic: { id: 'city2', name: 'CityB', country: { name: 'USA' }, coordinates: { lat: 34.0, lon: -118.2 } },
    international: { id: 'city3', name: 'CityC', country: { name: 'Germany' }, coordinates: { lat: 52.5, lon: 13.4 } }
};
```

---

### A2. SupplierSelector.js

#### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| A2.1 | `firmProduces()` mining firm with resourceType | Returns true for matching product |
| A2.2 | `firmProduces()` manufacturer with product.name | Returns true for matching product |
| A2.3 | `getInventory()` lot-based inventory | Returns sum of lot quantities |
| A2.4 | `getInventory()` legacy inventory | Returns inventory.quantity |
| A2.5 | `getLocationTier()` same city | Returns 'local' |
| A2.6 | `getLocationTier()` same country | Returns 'domestic' |
| A2.7 | `getLocationTier()` different country | Returns 'international' |
| A2.8 | `calculatePriceScore()` 30% below base | Returns 100 |
| A2.9 | `calculatePriceScore()` at base price | Returns 70 |
| A2.10 | `calculatePriceScore()` 50% above base | Returns 0 |
| A2.11 | `calculateTransportScore()` 0% of value | Returns 100 |
| A2.12 | `calculateTransportScore()` 50% of value | Returns 0 |
| A2.13 | `normalizeRelationship()` -100 | Returns 0 |
| A2.14 | `normalizeRelationship()` +100 | Returns 100 |
| A2.15 | `selectBest()` single supplier | Returns that supplier with scores |
| A2.16 | `selectBest()` multiple suppliers | Returns highest scored supplier |
| A2.17 | `selectBest()` no suppliers | Returns null |
| A2.18 | `categorizeByLocation()` mixed suppliers | Correctly groups into local/domestic/international |

#### Integration Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| A2.19 | Full scoring with transport | Transport cost affects final score |
| A2.20 | Full scoring with relationships | Relationship modifier affects effective price |
| A2.21 | Minimum inventory threshold | Filters suppliers below 50% of needed |

---

### A3. Contract.js

#### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| A3.1 | Constructor with defaults | Creates contract with ACTIVE status |
| A3.2 | `getExpectedVolume()` FIXED_VOLUME | Returns volumePerPeriod |
| A3.3 | `getExpectedVolume()` MIN_MAX | Returns minVolume |
| A3.4 | `getMaxOrderableVolume()` fresh period | Returns full volume |
| A3.5 | `getMaxOrderableVolume()` partial fulfilled | Returns remaining volume |
| A3.6 | `getEffectivePrice()` FIXED | Returns pricePerUnit |
| A3.7 | `getEffectivePrice()` INDEXED | Returns marketPrice * (1 - discount) |
| A3.8 | `getEffectivePrice()` COST_PLUS | Returns cost * (1 + margin) |
| A3.9 | `calculateUnitPrice()` with quality premium | Adds premium for above-min quality |
| A3.10 | `recordDelivery()` | Updates fulfillmentHistory, totalDelivered, totalValue |
| A3.11 | `checkPeriodReset()` within period | Returns false, no reset |
| A3.12 | `checkPeriodReset()` new period | Returns true, resets counters |
| A3.13 | `isActive()` active status, valid dates | Returns true |
| A3.14 | `isActive()` expired | Returns false |
| A3.15 | `requestTermination()` | Sets pending status, calculates effective date |
| A3.16 | `terminateImmediately()` | Sets terminated status immediately |
| A3.17 | `getPerformanceSummary()` | Returns all stats correctly |
| A3.18 | `toJSON()` / `fromJSON()` | Round-trip preserves all data |

---

### A4. ContractManager.js

#### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| A4.1 | `createContract()` valid parties | Creates contract, updates indices |
| A4.2 | `createContract()` invalid supplier | Returns null |
| A4.3 | `createContract()` duplicate active | Returns null |
| A4.4 | `createContract()` max contracts reached | Returns null |
| A4.5 | `getContractsForFirm()` as supplier | Returns contracts with role='supplier' |
| A4.6 | `getContractsForFirm()` as buyer | Returns contracts with role='buyer' |
| A4.7 | `getActiveContractsForBuyer()` with product filter | Returns only matching active contracts |
| A4.8 | `findContract()` existing | Returns the contract |
| A4.9 | `findContract()` non-existing | Returns null |
| A4.10 | `terminateContract()` immediate | Status = TERMINATED |
| A4.11 | `terminateContract()` with notice | Status = PENDING |
| A4.12 | `markDefaulted()` | Status = DEFAULTED, stats updated |
| A4.13 | `removeContract()` | Removed from all indices |

#### Integration Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| A4.14 | `fulfillFromContracts()` single contract | Transfers goods, records delivery |
| A4.15 | `fulfillFromContracts()` multiple contracts | Fulfills in priority order (exclusive first) |
| A4.16 | `fulfillFromContracts()` insufficient inventory | Partial fulfillment |
| A4.17 | `fulfillFromContracts()` quality below minimum | Skips contract |
| A4.18 | `processScheduledDeliveries()` period reset | Resets period counters |
| A4.19 | `processScheduledDeliveries()` expiration | Status = COMPLETED |
| A4.20 | Relationship impact on contract events | RelationshipManager.adjust called |

---

### A5. PurchaseManager.js

#### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| A5.1 | Constructor | Initializes SupplierSelector, ContractManager |
| A5.2 | `setRetailDemandManager()` | Sets reference correctly |
| A5.3 | `calculateNeeded()` above reorder point | Returns 0 |
| A5.4 | `calculateNeeded()` below reorder point | Returns target - current |
| A5.5 | `getFirmInventory()` lot-based | Returns sum of lots |
| A5.6 | `getFirmInventory()` legacy | Returns correct quantity |
| A5.7 | `getManufacturers()` | Returns filtered list |
| A5.8 | `getRetailers()` | Returns filtered list |
| A5.9 | `getRetailersInCity()` | Returns city-filtered list |

#### Integration Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| A5.10 | `processPurchasing()` contracts first | Contract fulfillment before spot purchases |
| A5.11 | `processPurchasing()` supplier scoring | Selects best-scored supplier |
| A5.12 | `processPurchasing()` global market fallback | Uses global market when no suppliers |
| A5.13 | `executePurchase()` lot transfer | Lots transferred correctly |
| A5.14 | `executePurchase()` insufficient cash | Reduces quantity or skips |
| A5.15 | `purchaseFromGlobalMarket()` | Adds inventory, deducts cash |
| A5.16 | `processCompetitiveRetail()` | Calls retailDemandManager methods |
| A5.17 | Full cycle with config.useNewSystem=true | New system processes all purchasing |
| A5.18 | Full cycle with config.useNewSystem=false | Falls back to legacy processSupplyChain |

---

### A6. SimulationEngine Integration

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| A6.1 | Import PurchaseManager | No errors |
| A6.2 | Constructor sets purchaseManager = null | Property exists |
| A6.3 | initialize() creates PurchaseManager | purchaseManager is instance |
| A6.4 | initialize() connects retailDemandManager | purchaseManager has reference |
| A6.5 | config.purchasing.useNewSystem = true | processFirmOperations uses purchaseManager |
| A6.6 | config.purchasing.useNewSystem = false | processFirmOperations uses legacy methods |

---

## Group B: Transaction Display & Logging

### B1. TransactionLog.js Enhancements

#### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| B1.1 | `CATEGORIES` constants | All 7 categories defined |
| B1.2 | `RAW_PRODUCER_TYPES` includes 'MINING' | True |
| B1.3 | `categorize()` GLOBAL_MARKET type | Returns GLOBAL_MARKET |
| B1.4 | `categorize()` with contractId | Returns CONTRACT |
| B1.5 | `categorize()` CONSUMER_SALE | Returns B2C_RETAIL |
| B1.6 | `categorize()` MINING seller | Returns B2B_RAW |
| B1.7 | `categorize()` SteelMill seller | Returns B2B_SEMI |
| B1.8 | `categorize()` MANUFACTURING to RETAIL | Returns B2B_WHOLESALE |
| B1.9 | `categorize()` MANUFACTURING to MANUFACTURING | Returns B2B_MANUFACTURED |
| B1.10 | `logB2BSale()` with lot info | Transaction includes lotId, lotQuality |
| B1.11 | `logB2BSale()` with contractId | Transaction includes contractId |
| B1.12 | `logB2BSale()` sets category | Category is computed correctly |
| B1.13 | `logRetailSale()` basic | Creates B2C_RETAIL transaction |
| B1.14 | `logRetailSale()` with lot info | Includes lotId, lotQuality |
| B1.15 | `logGlobalMarketPurchase()` | Creates GLOBAL_MARKET transaction |
| B1.16 | `getByCategory()` B2B_RAW | Returns only RAW category transactions |
| B1.17 | `getByCategory()` limit | Respects limit parameter |
| B1.18 | `getForFirm()` as seller | Returns transactions where firm is seller |
| B1.19 | `getForFirm()` as buyer | Returns transactions where firm is buyer |
| B1.20 | `getForFirm()` hours filter | Only returns within time window |
| B1.21 | `getSummaryByCategory()` | Returns count, volume, value per category |
| B1.22 | `getCategoryDisplay()` B2B_RAW | Returns { label, icon, colorClass } |
| B1.23 | `getCategoryDisplay()` unknown | Returns default display |

---

### B2. market-activity.js Updates

#### Unit Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| B2.1 | `getCategoryDisplay()` all categories | Returns correct display objects |
| B2.2 | `categorizeTransaction()` with category field | Returns existing category |
| B2.3 | `categorizeTransaction()` without category | Computes category correctly |
| B2.4 | `categorizeTransaction()` RETAIL_PURCHASE | Returns B2B_WHOLESALE |

#### Integration Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| B2.5 | Filter by B2B_RAW | Only shows raw material transactions |
| B2.6 | Filter by B2C_RETAIL | Only shows retail sales |
| B2.7 | Filter by CONTRACT | Only shows contract transactions |
| B2.8 | Category breakdown updates | All 7 categories show counts/values |
| B2.9 | Transaction row displays category badge | Badge with icon and color |
| B2.10 | Transaction with lot info | Shows LOT badge |
| B2.11 | Transaction with contract | Shows contract badge |
| B2.12 | Transaction with quality | Shows quality indicator |

---

### B3. UI/CSS Verification

#### Visual Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| B3.1 | Category breakdown section | 7 items with icons, counts, values |
| B3.2 | Filter dropdown | Shows grouped options (B2B, Consumer, Other) |
| B3.3 | Category badge colors | Each category has distinct color |
| B3.4 | Row highlighting | Left border matches category color |
| B3.5 | LOT badge styling | Yellow/gold background |
| B3.6 | Quality high indicator | Green |
| B3.7 | Quality medium indicator | Orange |
| B3.8 | Quality low indicator | Red |
| B3.9 | Responsive breakdown grid | Adapts to screen size |

---

## Manual Testing Procedures

### Scenario 1: Contract-Based Supply Chain

1. Create a contract between a mining firm and a steel mill
2. Run simulation for several hours
3. Verify:
   - Contract appears in both firms' contract sections
   - Deliveries are recorded in contract history
   - Transactions logged with CONTRACT category
   - Transaction UI shows contract badge

### Scenario 2: Competitive Supplier Selection

1. Set up multiple suppliers for the same product in different cities
2. Create a manufacturer that needs that product
3. Run simulation
4. Verify:
   - Local suppliers are prioritized
   - Transport costs affect supplier selection
   - Price differences affect selection
   - Transactions reflect selected supplier

### Scenario 3: Transaction Category Display

1. Run simulation to generate various transaction types
2. Open Market Activity page
3. Verify:
   - Category breakdown shows accurate counts
   - Filter dropdown works for each category
   - Category badges display correctly
   - Lot info appears where applicable

### Scenario 4: Global Market Fallback

1. Create a manufacturer with no local suppliers
2. Run simulation
3. Verify:
   - PurchaseManager falls back to global market
   - Transaction logged as GLOBAL_MARKET
   - Premium pricing applied (1.5x)

---

## Test Data Requirements

### Firms Required

```javascript
const testFirms = [
    // Primary Producers
    { type: 'MINING', resourceType: 'Iron Ore', city: 'CityA' },
    { type: 'MINING', resourceType: 'Iron Ore', city: 'CityB' },
    { type: 'LOGGING', timberType: 'Softwood Logs', city: 'CityA' },

    // Processors
    { type: 'SteelMill', inputs: ['Iron Ore'], output: 'Steel', city: 'CityA' },
    { type: 'SteelMill', inputs: ['Iron Ore'], output: 'Steel', city: 'CityC' },

    // Manufacturers
    { type: 'MANUFACTURING', product: 'Tools', inputs: ['Steel'], city: 'CityA' },
    { type: 'MANUFACTURING', product: 'Tools', inputs: ['Steel'], city: 'CityB' },

    // Retailers
    { type: 'RETAIL', storeType: 'Hardware', city: 'CityA' },
    { type: 'RETAIL', storeType: 'Hardware', city: 'CityB' }
];
```

### Cities Required

```javascript
const testCities = [
    { id: 'cityA', name: 'CityA', country: { name: 'USA' }, localPreference: 0.6 },
    { id: 'cityB', name: 'CityB', country: { name: 'USA' }, localPreference: 0.5 },
    { id: 'cityC', name: 'CityC', country: { name: 'Germany' }, localPreference: 0.7 }
];
```

### Contracts Required

```javascript
const testContracts = [
    {
        type: 'FIXED_VOLUME',
        supplierId: 'mining1',
        buyerId: 'steelmill1',
        product: 'Iron Ore',
        volumePerPeriod: 100,
        pricePerUnit: 50,
        periodType: 'weekly'
    }
];
```

---

## Automated Test Implementation

### Recommended Framework

- **Jest** for unit tests
- **Puppeteer** or **Playwright** for UI tests

### File Structure

```
tests/
├── unit/
│   ├── TransportCost.test.js
│   ├── SupplierSelector.test.js
│   ├── Contract.test.js
│   ├── ContractManager.test.js
│   ├── PurchaseManager.test.js
│   └── TransactionLog.test.js
├── integration/
│   ├── PurchasingFlow.test.js
│   ├── ContractFulfillment.test.js
│   └── TransactionDisplay.test.js
├── e2e/
│   └── MarketActivity.test.js
└── fixtures/
    ├── testFirms.js
    ├── testCities.js
    └── testContracts.js
```

---

## Success Criteria

### Group A
- [ ] All unit tests pass (A1-A6)
- [ ] Integration tests demonstrate correct purchasing flow
- [ ] Config toggle works for legacy/new system
- [ ] No regression in existing supply chain functionality

### Group B
- [ ] All unit tests pass (B1-B3)
- [ ] UI correctly displays all 7 categories
- [ ] Filtering works for all categories
- [ ] Lot and contract info displayed when present
- [ ] CSS renders correctly across browsers

---

## Notes

- Run tests with fresh simulation state
- Clear localStorage before UI tests
- Test with varying numbers of firms (1, 10, 100)
- Test edge cases: no inventory, no suppliers, expired contracts
