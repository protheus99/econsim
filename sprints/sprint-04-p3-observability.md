# Sprint Plan: P3 Observability + UX

## Sprint Info

| Field | Value |
|-------|-------|
| Sprint Name | P3 Observability + UX |
| Target Milestone | M4 |
| Priority Focus | P3 |

---

## Current State

| Component | Status |
|-----------|--------|
| `TransactionLog.js` — records all B2B/B2C/CONTRACT events with full metadata | ✅ Complete |
| `PurchaseManager.pendingDeliveries` — in-transit delivery objects with arrivalHour | ✅ Complete |
| `EngineAdapter._serializePendingDeliveries()` — included in `getFullState()` | ✅ Complete |
| `TransactionLog.CATEGORIES` + `getCategoryDisplay()` — icons/colors/labels | ✅ Complete |
| `TransactionLog` serialized to client state | ❌ Missing |
| `transactions.html` page | ❌ Missing |
| `deliveries.html` page | ❌ Missing |
| Dashboard diagnostics (pending count, fill rates) | ❌ Missing |
| Per-firm transaction history on `firm.html` | ❌ Missing |

---

## Work Items

| ID | Description | Status |
|----|-------------|--------|
| P3.1 | EngineAdapter — serialize recent transactions into state + daily delta | 🔴 Not Started |
| P3.2 | New page: `deliveries.html` — in-transit deliveries with ETA | 🔴 Not Started |
| P3.3 | New page: `transactions.html` — recent transactions with category badges + filters | 🔴 Not Started |
| P3.4 | Dashboard (`index.html`) — pending deliveries count + category transaction breakdown | 🔴 Not Started |
| P3.5 | Firm detail (`firm.html`) — transaction history section | 🔴 Not Started |

---

## Work Item Details

### P3.1 — Serialize transactions into state

**Files:** `alpha/server/src/adapters/EngineAdapter.js`

In `getFullState()`: add `state.recentTransactions = this._serializeRecentTransactions()`.

New method `_serializeRecentTransactions(limit = 200)`:
```javascript
const log = this.engine?.transactionLog;
if (!log) return [];
return log.getRecentTransactions(limit).map(tx => ({
    id: tx.id,
    category: tx.category,
    hour: tx.hour,
    sellerId: tx.sellerId,
    sellerName: tx.sellerName,
    buyerId: tx.buyerId,
    buyerName: tx.buyerName,
    productName: tx.productName,
    quantity: tx.quantity,
    unitPrice: tx.unitPrice,
    totalValue: tx.totalValue,
    cityName: tx.cityName,
    contractId: tx.contractId || null
}));
```

In `getFirmFinancialSnapshot()` (daily delta): also include `transactions` key:
```javascript
transactions: this._serializeRecentTransactions(200)
```

**StateManager** (`alpha/client/js/StateManager.js`): add `recentTransactions: []` to initial state; the daily delta merge already handles `transactions` via `data.firms` — add `if (data.transactions) updates.recentTransactions = data.transactions`.

---

### P3.2 — `deliveries.html`

Shows all pending/recently-completed deliveries.

Columns per delivery card:
- Product name + quantity
- Seller → Buyer (names)
- Status badge: `in_transit` (amber) / `delivered` (green)
- ETA: compute from `arrivalHour - currentTotalHours` → format as "Xh Yd" remaining or "Delivered"
- Transport cost

Data source: `state.pendingDeliveries` (already in initial state).
Subscribe to `clock` changes to update ETA countdown.

Nav link added to all pages.

---

### P3.3 — `transactions.html`

Shows `state.recentTransactions` (last 200) with:
- Category badge (B2B_RAW, B2B_SEMI, B2B_MANUFACTURED, B2B_WHOLESALE, B2C_RETAIL, CONTRACT) — colored per `getCategoryDisplay()` colors
- Product, Quantity, Unit Price, Total Value, Seller → Buyer, City
- Filter toolbar: All / B2B / B2C / Contract
- Sort: newest first (default)

Nav link added to all pages.

---

### P3.4 — Dashboard diagnostics

**File:** `alpha/client/index.html`

Add two new stat cards below the existing four:
- **Pending Deliveries** — `state.pendingDeliveries.filter(d => d.status === 'in_transit').length`
- **Transactions Today** (already exists as count) → expand to show B2B / B2C breakdown in sub-labels

Add a **Supply Health** row:
- Pending delivery count with link to deliveries.html
- No-sale firms count: firms where `noSaleStreak > 0`
- Throttled firms count: firms where `consecutiveThrottleCycles > 2`

---

### P3.5 — `firm.html` transaction history

Below the existing sections, add a "Recent Transactions" section that shows the last 20 transactions from `state.recentTransactions` filtered to `tx.sellerId === firmId || tx.buyerId === firmId`.

Columns: Direction (SOLD/BOUGHT badge), Product, Quantity, Value, Counterparty, Category badge.

No new API needed — all client-side filter from state.

---

## Files to Touch

| File | Change |
|------|--------|
| `alpha/server/src/adapters/EngineAdapter.js` | `_serializeRecentTransactions()`, add to `getFullState()` and daily delta |
| `alpha/client/js/StateManager.js` | `recentTransactions: []` initial state; delta merge for `transactions` |
| `alpha/client/deliveries.html` | **NEW** |
| `alpha/client/transactions.html` | **NEW** |
| `alpha/client/index.html` | Pending deliveries count + supply health row |
| `alpha/client/firm.html` | Recent transactions section |
| All nav bars | Add Deliveries + Transactions links |

---

## Acceptance Criteria

- [ ] `state.recentTransactions` populated on join and updated daily
- [ ] `deliveries.html` shows all in-transit deliveries with ETA
- [ ] `transactions.html` shows last 200 transactions with category badges; filter buttons work
- [ ] Dashboard shows pending delivery count + no-sale/throttled firm counts
- [ ] `firm.html` shows last 20 transactions for that firm (sold + bought)
- [ ] All pages have nav links to Deliveries and Transactions
