# CLAUDE.md - Economic Simulation Project Guide

## Project Overview

**econsim** is a web-based economic simulation with firms, cities, supply chains, and lot-based inventory. Pure ES6 JavaScript with no build system or npm dependencies.

## Quick Commands

```bash
# Start local server (required for ES6 modules)
python -m http.server 8000

# Run T0 correctness tests
node tests/run-t0-tests.js

# Browser tests
# Open http://localhost:8000/tests/runTests.html
```

## Project Structure

```
econsim/
├── js/
│   ├── core/                    # Core simulation logic
│   │   ├── SimulationEngine.js  # Main coordinator (entry point)
│   │   ├── GameClock.js         # Time management (totalHours property critical)
│   │   ├── firms/               # Firm types (Mining, Logging, Farm, Manufacturing, Retail, Bank)
│   │   ├── purchasing/          # PurchaseManager, SupplierSelector, ContractManager
│   │   ├── Lot.js               # Lot + LotInventory + LotRegistry
│   │   ├── LotSizings.js        # Per-product lot configuration
│   │   ├── City.js              # City demographics and economy
│   │   └── Product.js           # ProductRegistry
│   ├── pages/                   # Page-specific JS (firms.js, cities.js, etc.)
│   └── ui/                      # Dashboard.js, MapRenderer.js
├── css/styles.css               # Single stylesheet
├── data/config.json             # All configuration
├── tests/                       # Test suite
├── sprints/                     # Sprint planning
└── *.html                       # Page files
```

## Core Architecture

### Simulation Loop (Hourly)

```
SimulationEngine.updateHourly()
├─ processFirmOperations()      # All firms produce
├─ processPurchasing()          # PurchaseManager coordinates buying
├─ processLocalDeliveries()     # Complete pending deliveries
├─ GlobalMarket.processHourly() # External orders
├─ processLotExpiration()       # Remove expired perishables
└─ emit('update')               # UI updates
```

### Class Hierarchy

**Firms** (all extend `Firm` base class):
- `MiningCompany` - Extracts RAW materials (iron ore, copper, coal)
- `LoggingCompany` - Harvests timber
- `Farm` - Crops or livestock
- `ManufacturingPlant` - Processes inputs → outputs
- `RetailStore` - Sells to consumers (B2C)
- `Bank` - Financial services

**Purchasing System**:
- `PurchaseManager` - Main coordinator, owns `ContractManager`
- `SupplierSelector` - Finds and scores suppliers
- `ContractManager` - Supply agreements, also has `shouldThrottleProduction()`
- `TransportCost` - Calculates shipping costs and transit time

**Lot System** (for RAW/SEMI_RAW products):
- `Lot` - Individual bulk unit with id, quantity, quality, status, expiration
- `LotInventory` - Per-firm lot storage with sale strategies
- `LotRegistry` - Global lot tracking

### Supply Chain Flow

```
RAW (Mining/Logging/Farm)
  ↓ [lots]
SEMI_RAW (Processing plants)
  ↓ [lots]
MANUFACTURED (Assembly)
  ↓ [units]
RETAIL (Stores)
  ↓
CONSUMERS (B2C)
```

## Critical Patterns

### 1. Time System

**IMPORTANT**: Use `clock.totalHours` for scheduling, NOT `clock.hour`

```javascript
// Correct - cumulative hours since simulation start
const deliveryHour = this.clock.totalHours + transitTime;

// Wrong - only gives 0-23 hour of day
const bad = this.clock.hour + transitTime;
```

### 2. Lot Inventory Access

**IMPORTANT**: Use `getAvailableQuantity()`, NOT `getLots()`

```javascript
// Correct
const qty = firm.lotInventory.getAvailableQuantity(productName);

// Wrong - getLots() doesn't exist
const lots = firm.lotInventory.getLots(productName); // ERROR!
```

### 3. Adding Lots to Inventory

**IMPORTANT**: Must pass `Lot` instance, not plain object

```javascript
// Correct
const lot = new Lot({ id: '...', productName, quantity, quality, ... });
buyer.lotInventory.addLot(lot);

// Wrong - plain object won't have isExpired() method
buyer.lotInventory.addLot(productName, { quantity, quality }); // ERROR!
```

### 4. Removing Lots

`removeLots()` supports two signatures:
```javascript
// By IDs (returns Lot[])
const lots = inventory.removeLots(['LOT_1', 'LOT_2']);

// By product and quantity (returns { lots: Lot[], totalRemoved: number })
const result = inventory.removeLots('Iron Ore', 1000);
```

### 5. Production Throttling

Producers check contracts before producing to prevent expiration losses:
```javascript
if (this.contractManager) {
    const throttle = this.contractManager.shouldThrottleProduction(
        this, productName, currentInventory, isPerishable, shelfLifeDays
    );
    if (throttle.shouldThrottle) {
        // Reduce or halt production
    }
}
```

## Configuration

All settings in `data/config.json`. Key sections:
- `simulation.timeScale.realSecond` - ms per game hour (default 1000)
- `globalMarket.enabled` - Enable external market
- `globalMarket.priceMultiplier` - Markup for global purchases (1.5 = 50%)
- `inventory.reorderThresholdWeeks` - When to restock
- `firms.distribution` - Firm type ratios

## Testing

### Test Tiers

| Tier | Purpose | Files |
|------|---------|-------|
| T0 | Core correctness | `tests/run-t0-tests.js` |
| T1 | Unit tests | `tests/unit/*.test.js` |
| T2 | Integration | `tests/scenarios/` |

### Running Tests

```bash
# Node.js (T0 quick check)
node tests/run-t0-tests.js

# Browser (full suite)
# Start server, then open tests/runTests.html
```

## Common Tasks

### Adding a New Firm Type

1. Create class in `js/core/firms/NewFirm.js` extending `Firm`
2. Add to firm generation in `SimulationEngine.generateFirms()`
3. Add config in `data/config.json` under `firms`
4. Update UI pages if needed

### Adding a New Product

1. Add to product data in `Product.js` or product config
2. Configure lot sizing in `LotSizings.js` if RAW/SEMI_RAW
3. Set perishability if applicable

### Debugging

```javascript
// In browser console
debug.getState()           // Full simulation state
debug.getFirms()           // All firms
debug.pause() / debug.resume()
debug.setSpeed(4)          // 4x speed
debug.getLotReport()       // Lot system status
```

## File Quick Reference

| Purpose | Primary Files |
|---------|---------------|
| Simulation core | `SimulationEngine.js`, `GameClock.js` |
| Firm production | `firms/*.js`, `Lot.js` |
| Purchasing | `PurchaseManager.js`, `SupplierSelector.js`, `ContractManager.js` |
| Inventory | `Lot.js`, `LotSizings.js` |
| Transportation | `TransportCost.js`, `TransportationNetwork.js` |
| UI updates | `js/pages/shared.js`, page modules |
| Config | `data/config.json` |

## Naming Conventions

- **Classes**: PascalCase (`SimulationEngine`, `ManufacturingPlant`)
- **Files**: PascalCase for classes, camelCase for utilities
- **Variables**: camelCase (`totalHours`, `productName`, `lotInventory`)
- **IDs**: Descriptive prefixes (`LOT_`, `FIRM_`, `CONTRACT_`)
- **Transaction types**: `B2B_RAW`, `B2B_SEMI`, `B2B_MANUFACTURED`, `B2C_RETAIL`, `GLOBAL_MARKET`

## Known Gotchas

1. **Never use `Math.random()`** - Use seeded RNG via `this.random()` for determinism
2. **Lot status must be reset** when transferring between inventories
3. **Perishable products** auto-expire - check `LotSizings.isPerishable()`
4. **Global market** has 1.5x price and 24h delivery delay
5. **Clock.totalHours** is cumulative since year start, not reset daily

## Sprint Planning

Active sprint docs in `sprints/` folder. Current priorities:
- **P0**: Runtime correctness (delivery lifecycle, replenishment)
- **P1**: Purchasing consolidation (single path via PurchaseManager)
- **P2**: Economic stabilization (production throttling, diagnostics)

## Skills Available

Custom Claude Code skills in `.claude/skills/`:
- `runtime-debugger` - Debug P0 runtime issues
- `code-consolidation` - P1 legacy code removal
- `project-orchestrator` - Coordinate tasks from project plan
