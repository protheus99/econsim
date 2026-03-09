# Plan of Action: Fix Core Production, Inventory, and Sales Flow Issues

## Problem Summary
The simulation currently exhibits core economic flow failures:

- Firms fail to replenish inventory when inputs are low.
- Downstream firms have nothing to sell because inbound supply does not reliably arrive.
- Upstream producers continue generating inventory with weak demand coupling.
- Multiple sales channels exist (global market, contracts, direct B2B, retail), but orchestration and delivery completion are inconsistent.

---

## Root Causes Identified

### 1) Delivery-time accounting bug blocks deferred local deliveries
A significant portion of B2B transfer logic uses deferred local deliveries. Delivery scheduling and completion rely on a `totalHours` clock value that is not consistently defined in the clock implementation, causing deliveries to stall and never be completed.

**Impact:** buyers may pay but not receive inventory; downstream production starves.

### 2) Purchasing orchestration is split across overlapping systems
There are parallel and partially overlapping mechanisms:

- hourly critical checks,
- daily restock checks,
- legacy supply-chain logic,
- optional `PurchaseManager` flow,
- global market direct purchase and order placement.

This creates conflicting behavior and hard-to-debug state mismatches.

### 3) Production is not sufficiently demand-coupled
Non-retail production runs first each hour regardless of unsold stock conditions and weak recent demand signals. This enables continued output accumulation even while downstream channels fail.

### 4) Configuration and runtime mode ambiguity
Use of the new purchasing system depends on config gating. If mode defaults and config files are not explicit/aligned, behavior can silently fall back to legacy paths.

---

## Objectives

1. Ensure that every successful purchase order results in deterministic delivery or explicit failure.
2. Ensure low-input firms reliably trigger replenishment in bounded time.
3. Ensure production slows when demand/sales channels are not consuming output.
4. Consolidate purchasing/supply logic under one authoritative flow.
5. Add observability so regressions are visible quickly.

---

## Implementation Plan

## Phase 1 — Stabilize delivery and inventory arrival (highest priority)

### 1.1 Add canonical hour counter in clock
- Add and maintain a monotonic `totalHours` field in `GameClock`.
- Increment each tick and include in game-time debug/state surfaces.

### 1.2 Normalize local-delivery lifecycle
- Validate `deliveryHour` creation (must be finite and >= current hour).
- Use canonical `totalHours` in all pending-delivery comparisons.
- Add defensive logging/metrics for invalid scheduling and late deliveries.

### 1.3 Add deterministic regression for deferred delivery
Create a small deterministic scenario (seeded world) and assert:
- trade executes,
- pending delivery appears,
- delivery completes after transit,
- buyer inventory increases,
- downstream production resumes.

**Exit criteria:** no stuck local deliveries in baseline runs.

---

## Phase 2 — Unify purchasing orchestration

### 2.1 Select a single authoritative purchasing pipeline
Adopt `PurchaseManager` as the primary orchestrator for:
- contract fulfillment,
- supplier selection,
- retail restocking,
- global-market fallback.

### 2.2 Decommission duplicate legacy restock paths
- Remove or strictly disable overlapping daily/hourly purchase paths once parity is verified.
- Keep only one owner for order quantity calculation and supplier fallback.

### 2.3 Make purchasing mode explicit in config
- Add a top-level `purchasing` config block with explicit defaults.
- Ensure engine defaults and `data/config.json` are aligned.

**Exit criteria:** one code path controls purchasing decisions per tick.

---

## Phase 3 — Demand-aware production controls

### 3.1 Add soft production throttling
When producer finished inventory is above threshold and no recent demand/sales:
- reduce effective output multiplier,
- avoid full-stop unless inventory is saturated,
- recover automatically when orders/sales return.

### 3.2 Improve excess-inventory liquidation behavior
- Keep global-market disposal as fallback, not primary sink.
- Prevent disposal from masking broken local B2B channels.

**Exit criteria:** lower runaway stockpiles and more stable producer cash flow.

---

## Phase 4 — Observability and safeguards

### 4.1 Add health metrics
Track and expose:
- pending local deliveries count and average age,
- % firms below critical input threshold,
- local order fill rate,
- producer no-sale streak duration,
- global-market fallback ratio.

### 4.2 Add alert conditions
- “Stalled supply chain” alert when delivery age exceeds threshold.
- “Chronic stockout” alert for firms below critical inventory for N hours.

### 4.3 Build smoke/regression checks
Automated checks for:
- manufacturing restock behavior,
- multi-hop chain fulfillment (RAW → SEMI_RAW → MANUFACTURED → RETAIL),
- delivery completion within expected transit windows.

**Exit criteria:** failures become measurable and actionable.

---

## Prioritized Execution Order

1. Clock + local-delivery fixes (Phase 1)
2. Deterministic delivery/restock regression test (Phase 1)
3. Purchasing unification + config clarity (Phase 2)
4. Production throttling and liquidation tuning (Phase 3)
5. Metrics/alerts/regression suite hardening (Phase 4)

---

## Acceptance Criteria

- Manufacturers below reorder thresholds place/execute replenishment within bounded simulation time.
- Deferred local deliveries reliably complete and update buyer inventories.
- RAW/SEMI producers achieve non-zero rolling sales in normal baseline runs.
- Inventory starvation events and stalled-delivery counts materially decrease.
- No duplicate purchasing paths are active simultaneously in production mode.

---

## Risks and Mitigations

- **Risk:** Refactor destabilizes current balancing.
  - **Mitigation:** Phase gates + deterministic tests before/after each step.
- **Risk:** Removing legacy flow breaks edge-case products.
  - **Mitigation:** Keep temporary feature flag during migration with side-by-side metrics.
- **Risk:** Throttling overcorrects and suppresses growth.
  - **Mitigation:** Use soft multipliers and tune with telemetry.

---

## Deliverables

1. Code fixes for timekeeping and local-delivery completion.
2. Consolidated purchasing orchestration and cleaned config.
3. Demand-aware production throttling behavior.
4. New metrics and supply-chain health diagnostics.
5. Regression test scenarios and pass criteria documentation.


---

## Review of `project_plan.md` and `DEV_NOTES.md` Against Current App State

### Verdict
Both planning documents are directionally strong, but they are **partially outdated** versus the current codebase and should be treated as a **living roadmap**, not an implementation checklist as-is.

### What Is Already Implemented (and should be marked as done/partial)
- Purchasing foundation is already present:
  - `PurchaseManager`, `SupplierSelector`, `TransportCost`, `Contract`, `ContractManager`
- Competitive retail demand components already exist:
  - `CityRetailDemandManager`, `RetailerAttractiveness`

**Action**: Update plan status from “Files to Create” to “Exists / Needs hardening” for these modules.

### Where `project_plan.md` is stale or mismatched
- Paths are outdated for retail modules:
  - Plan references `js/core/retail/...`, while code is in `js/core/...`.
- Pseudocode references non-existent abstractions (`engine.firmManager`) while current engine uses `firms` Maps and direct filtering.
- “Replace processSupplyChain with PurchaseManager” is only partially true in current behavior due to mode gating and legacy fallbacks.

**Action**: Rewrite Group A implementation notes to match current architecture and identify migration steps from legacy flow to unified orchestration.

### Where `DEV_NOTES.md` remains valuable
- It correctly identifies unresolved bug-fix areas (farm/bank), shipment visibility, and contract-system evolution.
- It captures good future design targets (save/load, map overhaul, corporation AI, commodity market).

**Action**: Keep `DEV_NOTES.md` as ideation/spec notes, but add a “Current Reality” status line per item:
- `NOT_STARTED`
- `PARTIALLY_IMPLEMENTED`
- `IMPLEMENTED_NEEDS_FIX`
- `DONE`

### Priority correction for current app state
Given current runtime failures, priorities should be adjusted to:
1. **P0 Runtime correctness**: delivery timing, inventory arrival, and restock reliability.
2. **P1 Orchestration consolidation**: remove duplicate purchasing paths and config ambiguity.
3. **P2 Economic stabilization**: demand-aware production throttling and global-market fallback tuning.
4. **P3 UX/visibility**: shipment/order tracking UI and transaction diagnostics.
5. **P4+ Expansion**: commodity market, advanced corporation AI, save/load polish.

### Recommended immediate documentation cleanup
1. In `project_plan.md`, convert “Files to Create” tables into “Status” tables with actual state.
2. Replace `firmManager` references with current `SimulationEngine` firm access patterns.
3. Explicitly document which legacy purchasing paths remain active and when.
4. Add acceptance tests per phase (delivery completion, replenishment latency, producer sell-through).

### Conclusion
The plans are **good in intent**, but **not good enough in current form** for direct execution. They need a reality-alignment pass first, then can effectively guide implementation.
