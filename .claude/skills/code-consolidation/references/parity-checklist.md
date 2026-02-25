# Purchasing Consolidation Parity Checklist

Use this checklist to verify PurchaseManager has full parity with legacy methods before removal.

## Pre-Migration Testing

### Environment Setup
- [ ] Simulation config accessible
- [ ] Both paths can be toggled via `config.purchasing.useNewSystem`
- [ ] Baseline metrics captured for comparison

---

## Raw Material Purchasing

Legacy: `SimulationEngine.tryLocalPurchase()`
New: `PurchaseManager.processFirmPurchasing()` + `SupplierSelector`

| Test Case | Legacy | New | Match |
|-----------|--------|-----|-------|
| Mining → Manufacturing purchase | | | |
| Logging → Manufacturing purchase | | | |
| Farm → Manufacturing purchase | | | |
| Multiple suppliers aggregated | | | |
| 80% buffer respected | | | |
| Sort by stock descending | | | |

---

## Semi-Raw Purchasing

Legacy: `SimulationEngine.tryLocalPurchase()` (second half)
New: `PurchaseManager.processFirmPurchasing()` + `SupplierSelector`

| Test Case | Legacy | New | Match |
|-----------|--------|-----|-------|
| Semi-raw → Manufacturer works | | | |
| `isSemiRawProducer` flag checked | | | |
| `finishedGoodsInventory` used | | | |
| Product name matching | | | |

---

## Retail Purchasing

Legacy: `SimulationEngine.tryLocalRetailPurchase()`
New: `PurchaseManager.processRetailPurchasing()`

| Test Case | Legacy | New | Match |
|-----------|--------|-----|-------|
| Manufacturer → Retail works | | | |
| Product ID matching | | | |
| Product name matching | | | |
| 70% buffer respected | | | |
| Sort by stock descending | | | |

---

## Global Market Fallback

Legacy: `SimulationEngine.checkExcessInventory()`, `processFirmBidding()`
New: `PurchaseManager` with `GlobalMarket` integration

| Test Case | Legacy | New | Match |
|-----------|--------|-----|-------|
| Fallback when local exhausted | | | |
| 1.5x premium applied | | | |
| Excess disposal at 90% capacity | | | |
| Excess disposal at 50% + no demand | | | |
| Minimum order size respected | | | |

---

## Aggregate Metrics (100 hour run)

| Metric | Legacy Value | New Value | Variance | Acceptable (<10%) |
|--------|--------------|-----------|----------|-------------------|
| Total B2B transactions | | | | |
| Total B2C transactions | | | | |
| Global market purchases | | | | |
| Average firm inventory | | | | |
| Firms with stockouts | | | | |
| Firms with excess inventory | | | | |

---

## Sign-Off

- [ ] All test cases pass
- [ ] Aggregate metrics within tolerance
- [ ] No regression in firm economic health
- [ ] Ready for legacy removal

**Verified by:** _______________
**Date:** _______________
