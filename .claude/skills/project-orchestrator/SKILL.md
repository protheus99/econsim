---
name: project-orchestrator
description: Orchestrate all tasks from Updated_project_plan.md across P0-P4 priorities and T0-T3 testing tiers. Coordinates runtime-debugger, code-consolidation, and online-testing-agent skills. Use to plan sprints, track milestones, and manage project execution.
---

# Project Orchestrator

Central coordination agent for the EconSim project plan execution.

## Overview

This orchestrator manages:
- **5 Priority Tiers**: P0 (blockers) → P4 (expansion)
- **4 Testing Tiers**: T0 (correctness) → T3 (soak)
- **5 Milestones**: Sequential gates for release readiness
- **3 Specialized Skills**: Delegated execution

## Quick Status Check

When invoked, first assess current state:

1. **Read** `Updated_project_plan.md` for authoritative requirements
2. **Check** milestone progress against acceptance criteria
3. **Identify** current blocking items
4. **Report** status summary

## Priority Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ P0 — Runtime Correctness (BLOCKER)                      │
│ Must complete before any other work proceeds            │
│ Skills: /runtime-debugger                               │
├─────────────────────────────────────────────────────────┤
│ P1 — Purchasing Consolidation                           │
│ Single authoritative path, remove legacy code           │
│ Skills: /code-consolidation                             │
├─────────────────────────────────────────────────────────┤
│ P2 — Economic Stabilization                             │
│ Production throttling, disposal tuning                  │
├─────────────────────────────────────────────────────────┤
│ P3 — Observability + UX                                 │
│ Shipment tracking, diagnostics, transaction badges      │
│ Skills: /online-testing-agent (for validation)          │
├─────────────────────────────────────────────────────────┤
│ P4 — Feature Expansion                                  │
│ Corp AI, commodity market, save/load                    │
│ GATE: P0-P3 must be stable                              │
└─────────────────────────────────────────────────────────┘
```

## Milestone Sequence

| Milestone | Requirements | Testing Gate |
|-----------|--------------|--------------|
| **M1** | P0 complete | T0 green |
| **M2** | P1 complete | Group A parity green |
| **M3** | P2 tuning done | Soak baseline green |
| **M4** | P3 UX complete | Online QA pass |
| **M5** | P4 begins | All prior gates hold |

## Task Delegation

### When to invoke `/runtime-debugger`

Delegate to runtime-debugger when:
- Stuck deliveries detected (lots in IN_TRANSIT too long)
- Replenishment failures (firms hitting stockouts repeatedly)
- Time inconsistencies (skipped/duplicated hours)
- Investigating P0 acceptance criteria failures

### When to invoke `/code-consolidation`

Delegate to code-consolidation when:
- Ready to remove legacy purchasing paths
- Verifying PurchaseManager parity
- Planning P1 migration steps
- Creating parity test checklist

### When to invoke `/online-testing-agent`

Delegate to online-testing-agent when:
- Validating deployed build
- Running smoke/functional/resilience tests
- Generating QA reports for milestone sign-off
- Cross-browser verification needed

## Orchestration Workflow

### Phase 1: Assessment

```markdown
1. Load project plan
   - Read Updated_project_plan.md
   - Note any recent changes

2. Check current milestone
   - Which milestone are we targeting?
   - What are the blocking items?

3. Inventory work items
   - List incomplete P0 items
   - List incomplete P1 items (if P0 done)
   - Continue through priorities
```

### Phase 2: Sprint Planning

```markdown
1. Select work items for sprint
   - Respect priority order (never P2 before P0)
   - Group related items
   - Estimate scope

2. Identify skill dependencies
   - Which skills needed?
   - What order?

3. Define sprint acceptance
   - Specific test cases to pass
   - Metrics to achieve
```

### Phase 3: Execution Tracking

```markdown
1. Track item status
   - Not Started → In Progress → Complete
   - Note blockers

2. Coordinate skill invocations
   - Trigger appropriate skill
   - Collect outputs

3. Update progress
   - Mark completed items
   - Document findings
```

### Phase 4: Milestone Verification

```markdown
1. Run milestone tests
   - T0 for M1
   - Group A for M2
   - Soak for M3
   - Online QA for M4

2. Check acceptance criteria
   - All items in priority tier complete?
   - All tests passing?

3. Sign off or identify gaps
   - Document remaining work
   - Plan next sprint
```

## Work Item Tracking

### P0 — Runtime Correctness

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| P0.1 | Canonical simulation hour counter | | Time consistent across subsystems |
| P0.2 | Deferred-delivery lifecycle hardening | | No stuck pending deliveries |
| P0.3 | Replenishment reliability | | Stockout firms recover in bounded time |
| P0.4 | Deterministic regression scenario | | Test passes repeatedly |

### P1 — Purchasing Consolidation

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| P1.1 | PurchaseManager as single owner | | One pipeline per tick |
| P1.2 | Remove legacy purchase triggers | | Legacy disabled by default |
| P1.3 | Align config with documented defaults | | Config matches docs |
| P1.4 | Preserve global market fallback | | Safety valve works |

### P2 — Economic Stabilization

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| P2.1 | Demand-aware production throttling | | Reduced sustained overstock |
| P2.2 | Tune global market disposal | | Fallback doesn't mask failures |
| P2.3 | No-sale streak diagnostics | | Metrics visible |

### P3 — Observability + UX

| ID | Item | Status | Acceptance |
|----|------|--------|------------|
| P3.1 | Shipment/order tracking screen | | End-to-end order tracing |
| P3.2 | Dashboard diagnostics | | Health metrics visible |
| P3.3 | Transaction UI separation | | B2B/B2C/etc visually distinct |

## Testing Coordination

### T0 — Core Correctness (for M1)

```
Run after P0 work:
- Deferred delivery completes at/after ETA
- Buyer inventory increases on delivery
- Manufacturer restock triggers correctly
- Full supply chain survives (RAW → RETAIL)
```

### T1 — Group A Purchasing (for M2)

```
Run after P1 work:
- A1: TransportCost tests
- A2: SupplierSelector tests
- A3: Contract tests
- A4: ContractManager tests
- A5: PurchaseManager tests
- A6: SimulationEngine integration
```

### T2 — Group B Transaction/UX (for M3/M4)

```
Run for UX validation:
- B1: TransactionLog categories
- B2: market-activity filtering
- B3: UI/CSS verification
```

### T3 — Soak/Stability (for M3)

```
Run for stability:
- 30-day soak run
- 90-day soak run
- 180-day soak run
- Monitor: delivery age, stockout %, no-sale streaks
```

## Governance Rules

From project plan — enforce on all PRs:

1. **Tier Specification**: Every PR must specify P0-P4 tier
2. **Test Evidence**: PR must list tests run
3. **Legacy Path Disclosure**: Note if legacy path added/removed
4. **Regression Block**: No P4 merge if P0/P1 regressions exist

## Output Formats

### Status Report

```markdown
# Project Status Report
**Date:** [date]
**Current Milestone:** M[n]
**Blocking Priority:** P[n]

## Completed This Sprint
- [item list]

## In Progress
- [item list with owners]

## Blocked
- [item with blocker reason]

## Next Steps
1. [action]
2. [action]
```

### Sprint Plan

```markdown
# Sprint Plan: [Sprint Name]
**Target Milestone:** M[n]
**Duration:** [dates]

## Goals
- [goal 1]
- [goal 2]

## Work Items
| ID | Description | Skill | Owner |
|----|-------------|-------|-------|
| | | | |

## Acceptance Criteria
- [ ] [criterion]
- [ ] [criterion]

## Risks
- [risk and mitigation]
```

## Key Files

| File | Purpose |
|------|---------|
| `Updated_project_plan.md` | Authoritative requirements |
| `TESTING_PLAN_GROUP_A_B.md` | Unit test specifications |
| `TESTING_PLAN_ONLINE.md` | Browser QA plan |
| `DEV_NOTES.md` | Implementation notes |

## Related Skills

- `/runtime-debugger` — P0 issue diagnosis
- `/code-consolidation` — P1 legacy removal
- `/online-testing-agent` — Browser QA execution
