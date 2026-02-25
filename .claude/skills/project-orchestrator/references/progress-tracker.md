# EconSim Project Progress Tracker

**Last Updated:** [DATE]
**Current Milestone Target:** M1

---

## Milestone Status

| Milestone | Status | Gate | Notes |
|-----------|--------|------|-------|
| M1: P0 + T0 | 🔴 Not Started | T0 green | |
| M2: P1 + Group A | 🔴 Not Started | Group A parity | Blocked by M1 |
| M3: P2 + Soak | 🔴 Not Started | Soak baseline | Blocked by M2 |
| M4: P3 UX | 🔴 Not Started | Online QA | Blocked by M3 |
| M5: P4 Begin | 🔴 Not Started | All gates hold | Blocked by M4 |

**Legend:** 🔴 Not Started | 🟡 In Progress | 🟢 Complete

---

## P0 — Runtime Correctness

| ID | Work Item | Status | Owner | Notes |
|----|-----------|--------|-------|-------|
| P0.1 | Canonical simulation hour counter | 🔴 | | |
| P0.2 | Deferred-delivery lifecycle hardening | 🔴 | | |
| P0.3 | Replenishment reliability | 🔴 | | |
| P0.4 | Deterministic regression scenario | 🔴 | | |

**Acceptance Criteria:**
- [ ] No stuck pending local deliveries in baseline runs
- [ ] Stockout firms recover within bounded simulation time

---

## P1 — Purchasing Consolidation

| ID | Work Item | Status | Owner | Notes |
|----|-----------|--------|-------|-------|
| P1.1 | PurchaseManager as single owner | 🔴 | | |
| P1.2 | Remove legacy purchase triggers | 🔴 | | |
| P1.3 | Align config with documented defaults | 🔴 | | |
| P1.4 | Preserve global market fallback | 🔴 | | |

**Acceptance Criteria:**
- [ ] Exactly one purchasing pipeline runs per tick
- [ ] Legacy flow removed or explicitly disabled by default

---

## P2 — Economic Stabilization

| ID | Work Item | Status | Owner | Notes |
|----|-----------|--------|-------|-------|
| P2.1 | Demand-aware production throttling | 🔴 | | |
| P2.2 | Tune global market disposal | 🔴 | | |
| P2.3 | No-sale streak diagnostics | 🔴 | | |

**Acceptance Criteria:**
- [ ] Reduced sustained producer overstock in normal runs
- [ ] RAW/SEMI producers show recurring non-zero sales

---

## P3 — Observability + UX

| ID | Work Item | Status | Owner | Notes |
|----|-----------|--------|-------|-------|
| P3.1 | Shipment/order tracking screen | 🔴 | | |
| P3.2 | Dashboard diagnostics | 🔴 | | |
| P3.3 | Transaction UI separation (badges) | 🔴 | | |

**Acceptance Criteria:**
- [ ] Users can trace any major order end-to-end
- [ ] B2B vs B2C activity is visually and analytically distinct

---

## P4 — Feature Expansion

| ID | Work Item | Status | Owner | Notes |
|----|-----------|--------|-------|-------|
| P4.1 | Corporation strategy AI | 🔴 | | |
| P4.2 | Commodity market systems | 🔴 | | |
| P4.3 | Save/load improvements | 🔴 | | |
| P4.4 | Map/transport visualization | 🔴 | | |

**Gate:** P0-P3 metrics must remain healthy for sustained runs

---

## Testing Status

### T0 — Core Correctness Tests

| Test | Status | Last Run | Notes |
|------|--------|----------|-------|
| Deferred delivery completes at ETA | 🔴 | | |
| Buyer inventory increases on delivery | 🔴 | | |
| Manufacturer restock triggers | 🔴 | | |
| Full chain survives (RAW→RETAIL) | 🔴 | | |

### T1 — Group A Tests

| Suite | Tests | Passing | Status |
|-------|-------|---------|--------|
| A1: TransportCost | 12 | ? | |
| A2: SupplierSelector | 18 | ? | |
| A3: Contract | 18 | 0 | Not implemented |
| A4: ContractManager | 13 | 0 | Not implemented |
| A5: PurchaseManager | 9 | 0 | Not implemented |
| A6: SimulationEngine | 6 | 0 | Not implemented |

### T2 — Group B Tests

| Suite | Tests | Passing | Status |
|-------|-------|---------|--------|
| B1: TransactionLog | 23 | ? | |
| B2: market-activity | 12 | N/A | Manual/UI |
| B3: UI/CSS | 9 | N/A | Visual |

### T3 — Soak Tests

| Duration | Status | Last Run | Health Metrics |
|----------|--------|----------|----------------|
| 30-day | 🔴 | | |
| 90-day | 🔴 | | |
| 180-day | 🔴 | | |

---

## Blockers & Risks

| ID | Description | Impact | Mitigation | Status |
|----|-------------|--------|------------|--------|
| | | | | |

---

## Sprint History

### Sprint 1: [Date Range]
**Goal:** [Description]
**Outcome:** [Result]
**Items Completed:**
- [item]

---

## Notes & Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| | | |
