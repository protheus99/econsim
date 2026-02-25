---
name: runtime-debugger
description: Debug P0 runtime correctness issues in the economic simulation including delivery lifecycle, replenishment triggers, and time consistency. Use when investigating stuck deliveries, stockout recovery failures, or simulation timing problems.
---

# Runtime Debugger

Diagnose and fix P0 runtime correctness issues in the economic simulation.

## Scope

This skill addresses three critical P0 issues from the project plan:

1. **Time Consistency** - Canonical simulation hour counter
2. **Delivery Lifecycle** - Valid scheduling, deterministic completion, failure handling
3. **Replenishment Reliability** - Manufacturing and retail stockout recovery

## Diagnostic Workflow

### 1. Gather Environment State

First, collect the current simulation configuration:

```
Check js/core/SimulationEngine.js for:
- config.purchasing.useNewSystem (should be true)
- config.purchasing.enableContracts
- config.purchasing.enableSupplierScoring
- config.purchasing.globalMarketPremium
```

Verify which purchasing path is active (new PurchaseManager vs legacy).

### 2. Trace Delivery Lifecycle

For stuck or failed deliveries, trace through:

| Stage | File | Key Method |
|-------|------|------------|
| Purchase initiated | `PurchaseManager.js` | `executePurchase()` |
| Lot created | `Lot.js` | `new Lot()` with status AVAILABLE |
| Lot reserved | `Lot.js` | `reserve()` → status RESERVED |
| In transit | `Lot.js` | `markInTransit()` → status IN_TRANSIT |
| Delivered | `Lot.js` | `deliver()` → status DELIVERED |
| Added to buyer | `LotInventory` | `addLot()` |

Check for:
- Lots stuck in RESERVED or IN_TRANSIT status
- Missing `deliver()` calls
- Transit time calculation errors in `TransportCost.js`

### 3. Trace Replenishment Triggers

For stockout recovery failures:

| Trigger | File | Threshold |
|---------|------|-----------|
| Reorder point | `PurchaseManager.js` | 30% of target inventory |
| Target inventory | `PurchaseManager.js` | 3 days of supply |
| Critical threshold | Firm classes | configurable |
| Daily threshold | Firm classes | configurable |

Check:
- `getFirmInventory()` returning correct values
- `needsRestocking()` logic in firm classes
- `processRetailPurchasing()` and `processFirmPurchasing()` execution

### 4. Time Consistency Check

Verify simulation time handling:

```
SimulationEngine.js:
- currentHour tracking
- Hour increment logic
- Time passed to processPurchasing(currentHour)
```

Look for:
- Skipped hours
- Double-processed hours
- Time drift between subsystems

## Diagnostic Commands

When debugging, examine:

1. **Active lot statuses**
   ```javascript
   // Count lots by status
   LotRegistry.getAllLots().reduce((acc, lot) => {
     acc[lot.status] = (acc[lot.status] || 0) + 1;
     return acc;
   }, {});
   ```

2. **Pending deliveries age**
   ```javascript
   // Find old IN_TRANSIT lots
   LotRegistry.getAllLots().filter(lot =>
     lot.status === 'IN_TRANSIT' &&
     (currentHour - lot.transitStartHour) > lot.expectedTransitTime
   );
   ```

3. **Firms with stockouts**
   ```javascript
   // Find firms below reorder point
   Array.from(engine.firms.values()).filter(firm =>
     firm.lotInventory?.getAvailableQuantity(firm.product) <
     firm.targetInventory * 0.3
   );
   ```

## Output Format

Generate a diagnostic report with:

1. **Configuration Summary**
   - Purchasing system mode (new/legacy)
   - Key thresholds

2. **Issue Identification**
   - Stuck deliveries (lot IDs, ages, status)
   - Failed replenishments (firm IDs, inventory levels)
   - Time inconsistencies (hour gaps, duplicates)

3. **Root Cause Analysis**
   - Code path traced
   - Failure point identified

4. **Fix Recommendations**
   - Specific code changes needed
   - Files and line numbers
   - Test scenarios to verify fix

## Key Files Reference

| File | Purpose |
|------|---------|
| `js/core/SimulationEngine.js` | Main loop, config, legacy paths |
| `js/core/purchasing/PurchaseManager.js` | Purchase orchestration |
| `js/core/Lot.js` | Lot class, LotInventory, LotRegistry |
| `js/core/purchasing/TransportCost.js` | Transit time calculation |
| `js/core/purchasing/ContractManager.js` | Contract fulfillment |

## Related Documents

- `Updated_project_plan.md` - P0 requirements and acceptance criteria
- `TESTING_PLAN_GROUP_A_B.md` - Test cases for validation
