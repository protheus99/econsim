# Sprint Plan: P2 Economic Stabilization

## Sprint Info

| Field | Value |
|-------|-------|
| Sprint Name | P2 Economic Stabilization |
| Target Milestone | M3 |
| Priority Focus | P2 |

---

## Goals

1. Extend production throttling to extractors (Mining, Logging) so they back off when buyers can't absorb output.
2. Add `noSaleStreak` and `consecutiveThrottleCycles` counters to the Firm base class for diagnostics and CorporateRoadmap decisions.
3. Make hard storage cap failures visible — log a throttle event rather than silently blocking production.
4. Expose per-firm throttle state in the alpha client firm detail view.

---

## Current State

| Component | Throttling | Diagnostics |
|-----------|-----------|-------------|
| `Farm` (livestock) | ✅ Soft throttle via `shouldThrottleProduction` | ❌ No counters |
| `ManufacturingPlant` | ✅ Soft throttle per production line | ❌ No counters |
| `MiningCompany` | ❌ Hard cap only (silent block) | ❌ No counters |
| `LoggingCompany` | ❌ Hard cap only (silent block) | ❌ No counters |
| `Farm` (crops) | ❌ Hard cap only | ❌ No counters |
| `RetailStore` | N/A (consumer-facing) | ❌ No sale-streak counter |

`ContractManager.shouldThrottleProduction()` at line 737 is complete and reusable — it just isn't called in extractor firms.

---

## Work Items

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| P2.1 | Add `noSaleStreak` + `consecutiveThrottleCycles` to `Firm` base class | P2 | 🔴 Not Started |
| P2.2 | Add soft throttling to `MiningCompany` | P2 | 🔴 Not Started |
| P2.3 | Add soft throttling to `LoggingCompany` | P2 | 🔴 Not Started |
| P2.4 | Add soft throttling to `Farm` crop production | P2 | 🔴 Not Started |
| P2.5 | Emit throttle events on hard cap hits (replace silent return) | P2 | 🔴 Not Started |
| P2.6 | Expose throttle state in firm detail panel (`firm.html`) | P2 | 🔴 Not Started |
| P2.7 | Update `captureMonthlySnapshot()` to include throttle counters | P2 | 🔴 Not Started |

---

## Work Item Details

### P2.1 — Firm base class: diagnostic counters

**File:** `js/core/firms/Firm.js`

Add to constructor:
```javascript
this.noSaleStreak = 0;           // consecutive ticks/hours with zero sales
this.consecutiveThrottleCycles = 0; // consecutive production cycles where throttle > 0
this.lastThrottleReason = null;  // 'no_contracts' | 'excess_inventory' | 'storage_full'
```

Update `captureMonthlySnapshot()`:
- If monthly sales === 0, increment `noSaleStreak`; else reset to 0
- Expose `noSaleStreak`, `consecutiveThrottleCycles`, `lastThrottleReason` in `getSerializableState()`

**Why this matters:** `CorporateRoadmap._checkProfitabilityGoal()` currently uses `consecutiveLossMonths`. These counters let it also act on persistent overstock before losses hit.

---

### P2.2 — `MiningCompany` throttling

**File:** `js/core/firms/MiningCompany.js`

In the hourly production method (around line 225 where the hard cap is):
1. Call `this.contractManager?.shouldThrottleProduction(this, productName, currentLotCount, false, null)` before producing.
2. Apply the returned `throttlePercent` as a multiplier to `extractionRate`.
3. If throttling, increment `this.consecutiveThrottleCycles` and set `this.lastThrottleReason`.
4. Replace the silent `return null` on storage full with a throttle event.

Mining is non-perishable, so the `isPerishable = false` path in `shouldThrottleProduction` applies: 50% throttle when inventory > 1000 lots, contract-aware buffer above that.

---

### P2.3 — `LoggingCompany` throttling

**File:** `js/core/firms/LoggingCompany.js`

Same pattern as P2.2. Logging produces timber lots (non-perishable).
- Apply throttle multiplier to `harvestRate`.
- Track `consecutiveThrottleCycles`.

---

### P2.4 — `Farm` crop throttling

**File:** `js/core/firms/Farm.js`

Farm already throttles livestock (perishable path). Crops are harvested differently — check the crop production block (not the livestock block at line 357). Apply `shouldThrottleProduction` with `isPerishable` set based on `LotSizings.isPerishable(productName)`.

---

### P2.5 — Hard cap hits: emit throttle events instead of silent return

**Files:** `MiningCompany.js:225`, `LoggingCompany.js:197`, `Farm.js:450`, `ManufacturingPlant.js:1344`

All four have a pattern like:
```javascript
if (this.lotInventory.lots.size >= this.lotInventory.storageCapacity) return null;
```

Replace with:
```javascript
if (this.lotInventory.lots.size >= this.lotInventory.storageCapacity) {
    this.consecutiveThrottleCycles = (this.consecutiveThrottleCycles || 0) + 1;
    this.lastThrottleReason = 'storage_full';
    return null;
}
```

This makes the cap observable without changing behavior.

---

### P2.6 — Firm detail panel: throttle state

**File:** `alpha/client/firm.html`

In the firm stats section, add a "Production Health" row:
- Show `noSaleStreak` if > 0 (badge: "No sales: N months")
- Show `lastThrottleReason` if set (badge: "Throttled: reason")
- Show `consecutiveThrottleCycles` if > 2

Only show the section if any value is non-zero. This keeps the UI clean in healthy firms.

The `EngineAdapter._serializeFirmFull()` already serializes extractor fields — add the three new fields to it.

---

### P2.7 — Monthly snapshot persistence

**File:** `js/core/firms/Firm.js`

In `captureMonthlySnapshot()`:
```javascript
// After calculating profit for the month:
const monthlySales = this.monthlyRevenue || 0;
if (monthlySales === 0) {
    this.noSaleStreak++;
} else {
    this.noSaleStreak = 0;
}
```

Include in `getSerializableState()` and `restoreState()`.

---

## Acceptance Criteria

- [ ] `MiningCompany` reduces extraction rate when lot inventory is deep (> contract buffer)
- [ ] `LoggingCompany` same
- [ ] `Farm` crop production respects throttle on excess inventory
- [ ] Hard cap hits increment `consecutiveThrottleCycles` instead of silent return
- [ ] `noSaleStreak` increments correctly on zero-revenue months, resets on non-zero
- [ ] Firm detail panel shows throttle badge when `consecutiveThrottleCycles > 2`
- [ ] All T0 tests pass after changes

---

## Files to Touch

| File | Change |
|------|--------|
| `js/core/firms/Firm.js` | Add `noSaleStreak`, `consecutiveThrottleCycles`, `lastThrottleReason`; update snapshot |
| `js/core/firms/MiningCompany.js` | Add throttle call; replace silent cap with counter |
| `js/core/firms/LoggingCompany.js` | Same as Mining |
| `js/core/firms/Farm.js` | Add throttle to crop production; replace silent cap |
| `js/core/firms/ManufacturingPlant.js` | Replace silent cap with counter (throttle already exists) |
| `alpha/server/src/adapters/EngineAdapter.js` | Serialize new Firm fields |
| `alpha/client/firm.html` | Production health badges |

---

## Out of Scope (P3)

- Dashboard-level diagnostics (fill rates, stockout %, pending delivery age) — those are P3 Observability
- Soak test automation — also P3
- Tuning threshold values (the 1000-lot ceiling, 7-day buffer) — leave defaults, tune after observing real runs
