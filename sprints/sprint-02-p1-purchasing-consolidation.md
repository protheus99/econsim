# Sprint Plan: P1 Purchasing Consolidation

## Sprint Info

| Field | Value |
|-------|-------|
| Sprint Name | P1 Purchasing Consolidation |
| Target Milestone | M2 |
| Priority Focus | P1 |

---

## Goals

1. Remove the dormant legacy purchasing path from SimulationEngine.
2. Ensure no silent fallback paths exist outside PurchaseManager.
3. Validate config flag removal leaves no dead branches.

---

## Current State

Purchasing is **already consolidated**. The audit confirms:

- `PurchaseManager.processPurchasing()` is the single entry point, called once per tick at `SimulationEngine.js:941`
- `config.purchasing.useNewSystem = true` guards all calls; the new system runs exclusively
- Global market fallback was intentionally removed (`PurchaseManager.js:307`)
- No firm file calls purchasing methods directly
- Legacy path (`SimulationEngine.processSupplyChain()`) is fully dormant — never called under current config

**All P1 functional goals are met.** This sprint is cleanup only.

---

## Work Items

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| P1.1 | Remove dormant `processSupplyChain()` from SimulationEngine | P1 | 🔴 Not Started |
| P1.2 | Remove `config.purchasing.useNewSystem` flag and its conditional branch | P1 | 🔴 Not Started |
| P1.3 | Delete orphaned legacy retail competitive-sales code if no longer reachable | P1 | 🔴 Not Started |
| P1.4 | Run T0 regression suite to confirm no breakage | P1 | 🔴 Not Started |

---

## Work Item Details

### P1.1 — Remove `processSupplyChain()`

**What to remove:** `SimulationEngine.js:1092–1206` — the old supply chain method that used to handle purchasing before `PurchaseManager` existed. Never called when `useNewSystem = true`.

**Steps:**
1. Confirm `processSupplyChain` has zero callers (grep).
2. Delete the method body.
3. Remove any helper methods called exclusively by it (scan for single-caller utilities).

**Risk:** Low — method is already never called.

---

### P1.2 — Remove `useNewSystem` config flag

**What to remove:**
- `data/config.json` — remove the `useNewSystem` key from the `purchasing` block
- `SimulationEngine.js` — remove the `if (config.purchasing.useNewSystem)` conditional; make the new path unconditional
- `docs/` references if any

**Steps:**
1. Find all reads of `useNewSystem` (grep).
2. Replace the conditional with direct call to `purchaseManager.processPurchasing()`.
3. Remove the key from config.json.

**Risk:** Low — flag is always `true`; removing the conditional changes nothing functionally.

---

### P1.3 — Delete orphaned `processCompetitiveRetailSales` (if unreachable)

**Investigation:** Confirm whether `processCompetitiveRetailSales` inside `SimulationEngine` is:
- Called from anywhere other than the legacy block (grep).
- A duplicate of `PurchaseManager`'s retail phase, or complementary.

If reachable only from the legacy path being removed, delete it. If it has an independent caller, leave it and document why.

---

### P1.4 — Regression

Run `node tests/run-t0-tests.js` after changes. All T0 tests must pass. Check:
- Deliveries still complete
- Manufacturers still restock
- Retail still purchases

---

## Acceptance Criteria

- [ ] `processSupplyChain` method deleted from SimulationEngine
- [ ] `useNewSystem` flag removed from config and code
- [ ] No orphaned purchasing helpers remain
- [ ] T0 tests pass after changes
- [ ] `grep -r "useNewSystem\|processSupplyChain\|processCompetitiveRetailSales"` returns zero results (or only comments)

---

## Files to Touch

| File | Change |
|------|--------|
| `js/core/SimulationEngine.js` | Remove `processSupplyChain()`, remove `useNewSystem` conditional |
| `data/config.json` | Remove `purchasing.useNewSystem` key |
| Any helpers called only by deleted methods | Delete |
