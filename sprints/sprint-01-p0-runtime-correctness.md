# Sprint Plan: P0 Runtime Correctness

## Sprint Info

| Field | Value |
|-------|-------|
| Sprint Name | P0 Runtime Correctness |
| Target Milestone | M1 |
| Start Date | 2026-02-25 |
| End Date | TBD |
| Priority Focus | P0 |

---

## Goals

1. Fix simulation time consistency across all subsystems
2. Harden delivery lifecycle so no deliveries get stuck
3. Ensure replenishment triggers reliably for stockout recovery
4. Create deterministic regression test for full supply chain

---

## Work Items

| ID | Description | Priority | Skill | Status |
|----|-------------|----------|-------|--------|
| P0.1 | Canonical simulation hour counter | P0 | runtime-debugger | 🟢 Complete |
| P0.2 | Deferred-delivery lifecycle hardening | P0 | runtime-debugger | 🟢 Complete |
| P0.3 | Replenishment reliability (mfg + retail) | P0 | runtime-debugger | 🟢 Complete |
| P0.4 | Deterministic regression scenario | P0 | - | 🟢 Complete |

---

## Work Item Details

### P0.1 — Canonical Simulation Hour Counter

**Problem:** Time may drift or be inconsistent across subsystems.

**Investigation:**
- Check `SimulationEngine.js` for `currentHour` tracking
- Verify hour passed to `processPurchasing(currentHour)` is consistent
- Look for skipped or double-processed hours

**Files:**
- `js/core/SimulationEngine.js`

**Acceptance:** Single source of truth for simulation time used everywhere.

---

### P0.2 — Deferred-Delivery Lifecycle Hardening

**Problem:** Deliveries may get stuck in RESERVED or IN_TRANSIT status.

**Investigation:**
- Trace: `executePurchase()` → `Lot.reserve()` → `markInTransit()` → `deliver()`
- Check transit time calculation in `TransportCost.js`
- Verify `deliver()` is called when transit time completes
- Check for missing inventory addition after delivery

**Files:**
- `js/core/purchasing/PurchaseManager.js`
- `js/core/Lot.js` (Lot, LotInventory, LotRegistry)
- `js/core/purchasing/TransportCost.js`

**Acceptance:** No lots stuck in RESERVED/IN_TRANSIT beyond expected time.

---

### P0.3 — Replenishment Reliability

**Problem:** Firms hitting stockouts don't recover in bounded time.

**Investigation:**
- Check reorder point logic (30% of target inventory)
- Verify `needsRestocking()` in firm classes
- Trace `processRetailPurchasing()` and `processFirmPurchasing()`
- Check if global market fallback triggers correctly

**Files:**
- `js/core/purchasing/PurchaseManager.js`
- `js/core/firms/*.js`

**Acceptance:** Stockout firms recover within bounded simulation hours.

---

### P0.4 — Deterministic Regression Scenario

**Problem:** No repeatable test for full supply chain correctness.

**Tasks:**
- Create test scenario with known seed data
- Cover: RAW → SEMI_RAW → MANUFACTURED → RETAIL
- Include delayed delivery + downstream recovery
- Make deterministic (same inputs = same outputs)

**Files:**
- New: `tests/scenarios/supply-chain-regression.js`

**Acceptance:** Test passes repeatedly with consistent results.

---

## Skill Invocations Planned

### runtime-debugger
- [x] Task: Diagnose time consistency issues (P0.1)
- [x] Task: Trace delivery lifecycle for stuck lots (P0.2)
- [x] Task: Investigate replenishment failures (P0.3)
- [x] Expected output: Diagnostic report with root causes and fix recommendations

### Additional Fixes Applied
- **SupplierSelector.js** - Fixed `getLots()` bug (same pattern as PurchaseManager)

---

## Acceptance Criteria

- [ ] No stuck pending local deliveries in baseline runs
- [ ] Stockout firms recover within bounded simulation time
- [ ] T0 tests all pass
- [ ] Deterministic regression scenario passes

---

## Testing Requirements

| Test Tier | Tests to Run | Pass Criteria |
|-----------|--------------|---------------|
| T0 | Deferred delivery completes at/after ETA | Pass |
| T0 | Buyer inventory increases on delivery | Pass |
| T0 | Manufacturer restock triggers correctly | Pass |
| T0 | Full chain survives (RAW→RETAIL) | Pass |

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Lot.js exists with status tracking | ✅ Ready | AVAILABLE/RESERVED/IN_TRANSIT/DELIVERED |
| PurchaseManager.js exists | ✅ Ready | New purchasing path |
| TransportCost.js exists | ✅ Ready | Transit time calculation |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Delivery stuck in legacy path | Medium | High | Check config.purchasing.useNewSystem=true |
| Time drift affects multiple subsystems | Medium | High | Single canonical hour source |
| Replenishment logic scattered across files | Medium | Medium | Map all trigger points |

---

## Execution Order

1. **Start with P0.2** (delivery lifecycle) - most visible symptom
2. **Then P0.1** (time consistency) - may be root cause of P0.2
3. **Then P0.3** (replenishment) - depends on delivery working
4. **Finally P0.4** (regression test) - validates all fixes

---

## Commands to Start

```
# Diagnose delivery issues
"Use runtime-debugger to trace delivery lifecycle and find stuck lots"

# Check time consistency
"Use runtime-debugger to check simulation hour counter consistency"

# Investigate replenishment
"Use runtime-debugger to trace replenishment triggers for stockout firms"
```

---

## Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Developer | | | ☐ |
| QA | | | ☐ |
