# 2.23.26 Consolidated Project Plan

## Source Merge
This plan consolidates and reconciles the following documents into one actionable roadmap:
- `fix_production.md`
- `DEV_NOTES.md`
- `project_plan.md`
- `TESTING_PLAN_GROUP_A_B.md` (and duplicate under `tests/`)

---

## Executive Direction

### Primary Goal (Immediate)
Restore core economic simulation correctness:
1. Inventory replenishment must reliably trigger.
2. Purchases must convert into delivered inventory.
3. Producers must sell through viable channels before runaway stock growth.
4. Purchasing logic must have one authoritative orchestration path.

### Secondary Goal (Near-Term)
Improve observability and UX so issues are visible:
- shipment/order tracking
- transaction category clarity
- supply-chain health diagnostics

### Expansion Goal (Mid/Late)
After stability:
- corp strategy AI
- commodity market
- save/load and larger simulation features

---

## Current State Reality Check (as of now)

### Already Implemented (keep + harden)
- Purchasing modules exist:
  - `PurchaseManager`, `SupplierSelector`, `TransportCost`, `Contract`, `ContractManager`
- Competitive retail demand modules exist:
  - `CityRetailDemandManager`, `RetailerAttractiveness`
- TransactionLog category enhancements exist with tests.

### Active Risks / Architecture Debt
- Legacy and new purchasing paths still coexist (duplication risk).
- Delivery lifecycle and inventory arrival reliability need correctness hardening.
- Planning docs reference stale abstractions/paths in places.

### Documentation Drift To Correct
- Update references from planned abstractions to current engine patterns.
- Convert “Files to Create” to “Status: Exists / Partial / Not Started”.

---

## Unified Priority Stack

## P0 — Runtime Correctness (Blocker)
### Objective
Fix simulation correctness before adding features.

### Work Items
1. Canonical simulation hour counter and time consistency.
2. Local deferred-delivery lifecycle hardening:
   - valid scheduling
   - deterministic completion
   - safe failure handling
3. Replenishment reliability for manufacturing and retail stockouts.
4. Deterministic regression scenario for delayed delivery + downstream recovery.

### Acceptance
- No stuck pending local deliveries in baseline runs.
- Stockout firms recover within bounded simulation time.

---

## P1 — Purchasing Orchestration Consolidation
### Objective
One authoritative path for purchasing and supply-chain execution.

### Work Items
1. Make `PurchaseManager` the single orchestration owner.
2. Remove/disable overlapping legacy purchase triggers after parity.
3. Align config gating with explicit, documented defaults.
4. Preserve global market fallback as safety valve.

### Acceptance
- Exactly one purchasing pipeline runs per tick.
- Legacy flow removed or explicitly disabled by default.

---

## P2 — Economic Stabilization
### Objective
Prevent runaway production and improve sell-through behavior.

### Work Items
1. Demand-aware production throttling at high unsold inventory.
2. Tune global market disposal thresholds so fallback does not mask local failures.
3. Add no-sale streak and excess inventory diagnostics.

### Acceptance
- Reduced sustained producer overstock in normal runs.
- RAW/SEMI producers show recurring non-zero sales.

---

## P3 — Observability + UX
### Objective
Make system health and flows inspectable.

### Work Items
1. Shipment/order tracking screen:
   - status timeline (ordered → processing → in transit → delivered)
   - ETA and route details
2. Dashboard diagnostics:
   - pending delivery count/age
   - fill rates
   - stockout rates
3. Transaction UI separation (B2B/B2C/Global/Contract) with clear badges.

### Acceptance
- Users can trace any major order end-to-end.
- B2B vs B2C activity is visually and analytically distinct.

---

## P4 — Feature Expansion (after stability)
### Objective
Layer advanced systems without destabilizing core loop.

### Candidate Work
- Corporation intelligence and strategy AI
- Commodity market systems
- Save/load robustness and migration handling
- map and transport visualization overhauls

### Gate
P0–P3 metrics remain within healthy thresholds for sustained runs.

---

## De-duplication / Removal Plan

### Remove Immediately (safe cleanup)
- Unused helper methods and dead code paths identified by references-only scan.

### Remove After P1 Parity
- Legacy supply-chain flow that duplicates PurchaseManager orchestration.
- Redundant restocking routines that conflict with manager-owned logic.

### Rule
No removal without parity checks and regression green.

---

## Integrated Testing Strategy (from Group A/B + runtime fixes)

## T0 — Core Correctness Tests (new highest priority)
1. Deferred local delivery completes exactly at/after ETA.
2. Buyer inventory increases on delivery, not only on purchase.
3. Manufacturer restock triggers under critical and daily thresholds.
4. Full multi-hop chain survives (RAW → SEMI_RAW → MANUFACTURED → RETAIL).

## T1 — Group A Purchasing Tests (existing plan)
- A1 TransportCost
- A2 SupplierSelector
- A3 Contract
- A4 ContractManager
- A5 PurchaseManager
- A6 SimulationEngine integration

## T2 — Group B Transaction/UX Tests (existing plan)
- B1 TransactionLog category and lot metadata behavior
- B2 market-activity filtering and category rendering
- B3 UI/CSS visual verification for transaction categories

## T3 — Soak / Stability
- 30, 90, and 180 game-day soak runs with health metric thresholds.
- alert if pending delivery age, stockout %, or no-sale streaks exceed limits.

---

## Deliverables
1. Runtime correctness patch set (time, delivery, replenishment).
2. Consolidated purchasing orchestration patch set.
3. Stabilization/tuning patch set (throttling + disposal policy).
4. Shipment + diagnostics UX patch set.
5. Updated planning docs with status table per item.
6. Automated regression test suite covering T0/T1/T2 plus soak checks.

---

## Milestone Sequence
- **Milestone 1**: P0 + T0 green
- **Milestone 2**: P1 + Group A parity green
- **Milestone 3**: P2 tuning + soak baseline green
- **Milestone 4**: P3 UX visibility complete
- **Milestone 5**: P4 feature expansion begins

---

## Governance / Change Control
- Every feature PR must specify:
  1. which priority tier it belongs to,
  2. which tests were run,
  3. whether it adds or removes any legacy path.
- No P4 work may merge if P0/P1 regressions are unresolved.

