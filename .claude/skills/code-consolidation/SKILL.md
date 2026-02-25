---
name: code-consolidation
description: Consolidate purchasing paths by making PurchaseManager the single authoritative orchestrator and removing legacy purchasing code from SimulationEngine. Use for P1 legacy code removal and migration verification.
---

# Code Consolidation

Assist with P1 purchasing orchestration consolidation - making PurchaseManager the single authoritative path and safely removing legacy code.

## Objective

From `Updated_project_plan.md` P1 requirements:
- Make `PurchaseManager` the single orchestration owner
- Remove/disable overlapping legacy purchase triggers after parity
- Align config gating with explicit, documented defaults
- Preserve global market fallback as safety valve

## Legacy Methods to Remove

### SimulationEngine.js Legacy Purchasing Paths

| Method | Lines | Purpose | Replacement in PurchaseManager |
|--------|-------|---------|-------------------------------|
| `tryLocalPurchase()` | 1137-1196 | Buy raw/semi-raw materials from local producers | `processFirmPurchasing()` + `SupplierSelector` |
| `tryLocalRetailPurchase()` | 1206-1234 | Buy finished goods for retail | `processRetailPurchasing()` |
| `checkExcessInventory()` | 1236-1305 | Sell excess to global market | Handled in PurchaseManager flow |
| `processFirmBidding()` | 1308+ | Bid on global market orders | Contract-based fulfillment |

### Configuration Switch

Current toggle in `SimulationEngine.js:126-135`:
```javascript
purchasing: {
  useNewSystem: true,        // Enable PurchaseManager
  enableContracts: true,
  enableSupplierScoring: true,
  globalMarketPremium: 1.5
}
```

When `useNewSystem: false`, legacy paths are active.

## Consolidation Workflow

### Phase 1: Verify Parity

Before removing any legacy code, verify PurchaseManager covers all cases:

| Legacy Capability | PurchaseManager Method | Status |
|-------------------|----------------------|--------|
| Raw material purchase from Mining/Logging/Farm | `processFirmPurchasing()` → `SupplierSelector.findSuppliers()` | Verify |
| Semi-raw purchase from manufacturers | `processFirmPurchasing()` → `SupplierSelector` | Verify |
| Retail restocking from manufacturers | `processRetailPurchasing()` | Verify |
| 80% inventory buffer (leave 20% for others) | Check supplier selection logic | Verify |
| 70% retail buffer (leave 30% for others) | Check retail purchasing logic | Verify |
| Excess inventory disposal | Global market fallback | Verify |
| Global market bidding | Contract fulfillment priority | Verify |

### Phase 2: Create Migration Tests

Before removal, create tests that:
1. Run simulation with `useNewSystem: false` (legacy)
2. Run same scenario with `useNewSystem: true` (new)
3. Compare: inventory levels, transaction counts, firm health metrics
4. Ensure new system meets or exceeds legacy behavior

### Phase 3: Remove Legacy Code

After parity verification:

1. **Remove method bodies** (keep signatures if needed for migration period):
   ```javascript
   tryLocalPurchase(buyer, materialName, quantity) {
     console.warn('DEPRECATED: Use PurchaseManager.processFirmPurchasing()');
     return 0;
   }
   ```

2. **Update callers** - find all references to legacy methods and redirect

3. **Remove config option** - after migration period, remove `useNewSystem` toggle

4. **Clean up dead code** - remove deprecated method stubs

### Phase 4: Documentation Update

Update these files:
- `Updated_project_plan.md` - mark P1 items as complete
- `DEV_NOTES.md` - document migration
- Code comments - remove legacy TODOs

## Parity Checklist

Use this checklist when verifying migration:

```markdown
## Purchasing Consolidation Parity Check

### Raw Material Purchasing
- [ ] Mining → Manufacturing purchase works
- [ ] Logging → Manufacturing purchase works
- [ ] Farm → Manufacturing purchase works
- [ ] Multiple suppliers aggregated correctly
- [ ] 80% buffer respected (20% left for others)

### Semi-Raw Purchasing
- [ ] Semi-raw manufacturer → Manufacturer works
- [ ] Product name matching correct
- [ ] Inventory deduction correct

### Retail Purchasing
- [ ] Manufacturer → Retail purchase works
- [ ] Product ID + name matching works
- [ ] 70% buffer respected

### Global Market
- [ ] Fallback to global market when local exhausted
- [ ] Premium pricing applied (1.5x)
- [ ] Excess inventory disposal triggers correctly

### Metrics Comparison (run 100 simulation hours)
- [ ] Total transactions within 10% of legacy
- [ ] Firm inventory levels stable
- [ ] No bankrupt firms due to supply starvation
- [ ] No runaway inventory accumulation
```

## Key Files

| File | Role |
|------|------|
| `js/core/SimulationEngine.js` | Contains legacy methods to remove |
| `js/core/purchasing/PurchaseManager.js` | Authoritative replacement |
| `js/core/purchasing/SupplierSelector.js` | Supplier scoring for purchases |
| `js/core/purchasing/ContractManager.js` | Contract-based fulfillment |
| `js/core/GlobalMarket.js` | Fallback purchasing |

## Output

When consolidation is complete, produce:

1. **Migration Report**
   - Legacy methods removed/deprecated
   - Callers updated
   - Config changes made

2. **Parity Test Results**
   - Side-by-side comparison metrics
   - Any behavioral differences noted

3. **Updated Documentation**
   - Changed files listed
   - New default behavior documented

## Related Documents

- `Updated_project_plan.md` - P1 acceptance criteria
- `TESTING_PLAN_GROUP_A_B.md` - Group A tests for purchasing modules
