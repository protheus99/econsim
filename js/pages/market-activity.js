// js/pages/market-activity.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber, formatCurrency } from './shared.js';

let simulation;
let typeFilter = 'all';
let cityFilter = 'all';
let searchTerm = '';
let orderTierFilter = 'all';
let orderTypeFilter = 'all';

// Helper to get a nicely formatted firm name
function getFirmDisplayName(firmId) {
    if (!simulation || !firmId) return 'Unknown';

    const firm = simulation.firms.get(firmId);
    if (!firm) return 'Unknown Firm';

    // Get corporation name
    const corp = simulation.corporations.find(c => c.id === firm.corporationId);
    const corpName = corp?.name || 'Independent';

    // Get firm type display name
    let typeName = firm.type;
    switch (firm.type) {
        case 'MINING': typeName = `${firm.resourceType || 'Mining'} Mine`; break;
        case 'LOGGING': typeName = `${firm.timberType || 'Timber'} Logging`; break;
        case 'FARM': typeName = `${firm.cropType || firm.livestockType || 'Farm'}`; break;
        case 'MANUFACTURING': typeName = `${firm.product?.name || 'Manufacturing'} Plant`; break;
        case 'RETAIL': typeName = `${firm.storeType || 'Retail'} Store`; break;
        default: typeName = firm.type;
    }

    const cityName = firm.city?.name || 'Unknown City';

    // Check for duplicates and add number if needed
    const sameTypeSameCity = Array.from(simulation.firms.values()).filter(f =>
        f.type === firm.type &&
        f.city?.name === cityName &&
        f.corporationId === firm.corporationId
    );

    let suffix = '';
    if (sameTypeSameCity.length > 1) {
        const index = sameTypeSameCity.findIndex(f => f.id === firmId) + 1;
        suffix = ` #${index}`;
    }

    return `${corpName} ${typeName}${suffix} in ${cityName}`;
}

// Helper to get short firm name for tables
function getShortFirmName(firmId) {
    if (!simulation || !firmId) return 'Unknown';

    const firm = simulation.firms.get(firmId);
    if (!firm) return 'Unknown';

    const corp = simulation.corporations.find(c => c.id === firm.corporationId);
    const corpName = corp?.name || 'Ind.';

    let typeName = '';
    switch (firm.type) {
        case 'MINING': typeName = firm.resourceType || 'Mine'; break;
        case 'LOGGING': typeName = firm.timberType || 'Logging'; break;
        case 'FARM': typeName = firm.cropType || firm.livestockType || 'Farm'; break;
        case 'MANUFACTURING': typeName = firm.product?.name || 'Mfg'; break;
        case 'RETAIL': typeName = firm.storeType || 'Retail'; break;
        default: typeName = firm.type;
    }

    return `${corpName} - ${typeName}`;
}

async function init() {
    simulation = await getSimulation();
    setupClock(simulation);
    setupControls(simulation);

    // Transaction filters
    document.getElementById('transaction-type-filter')?.addEventListener('change', (e) => {
        typeFilter = e.target.value;
        renderTransactions();
    });

    document.getElementById('transaction-city-filter')?.addEventListener('change', (e) => {
        cityFilter = e.target.value;
        renderTransactions();
    });

    document.getElementById('transaction-search')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderTransactions();
    });

    // Order filters
    document.getElementById('order-tier-filter')?.addEventListener('change', (e) => {
        orderTierFilter = e.target.value;
        renderAvailableOrders();
    });

    document.getElementById('order-type-filter')?.addEventListener('change', (e) => {
        orderTypeFilter = e.target.value;
        renderAvailableOrders();
    });

    updateDisplay();
    onUpdate(() => updateDisplay());
    populateCityFilter();
}

function populateCityFilter() {
    const select = document.getElementById('transaction-city-filter');
    if (!select || !simulation) return;

    const countries = Array.from(simulation.countries.values());
    const cities = [];
    countries.forEach(c => {
        c.cities.forEach(city => cities.push(city.name));
    });

    cities.sort().forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        select.appendChild(option);
    });
}

function updateDisplay() {
    if (!simulation) return;

    updateBiddingStatus();
    updateOrderStats();
    updateTransactionStats();
    renderBiddingOrders();
    renderAvailableOrders();
    renderAwardedOrders();
    renderCompletedOrders();
    renderTransactions();
}

function updateBiddingStatus() {
    const gm = simulation.globalMarket;
    if (!gm) return;

    const gameTime = simulation.clock?.getGameTime();
    const currentHour = gameTime?.hour || 0;

    const banner = document.getElementById('bidding-status-banner');
    const icon = document.getElementById('bidding-status-icon');
    const text = document.getElementById('bidding-status-text');

    // Update bidding status based on current hour
    if (currentHour >= 9 && currentHour < 12) {
        banner.className = 'bidding-status-banner bidding-active';
        icon.textContent = '🔴';
        text.textContent = `BIDDING OPEN - Closes at 12:00 PM (${12 - currentHour} hours left)`;
    } else if (currentHour >= 12) {
        banner.className = 'bidding-status-banner bidding-closed';
        icon.textContent = '⏰';
        text.textContent = `Bidding closed for today - Opens tomorrow at 9:00 AM`;
    } else {
        banner.className = 'bidding-status-banner bidding-waiting';
        icon.textContent = '🔔';
        text.textContent = `Bidding opens at 9:00 AM (${9 - currentHour} hours)`;
    }

    // Update counts
    document.getElementById('available-orders-count').textContent = gm.availableOrders?.length || 0;
    document.getElementById('bidding-orders-count').textContent = gm.biddingOrders?.length || 0;
    document.getElementById('awarded-orders-count').textContent = gm.pendingOrders?.length || 0;
}

function updateOrderStats() {
    const gm = simulation.globalMarket;
    if (!gm) return;

    const stats = gm.getStats();

    document.getElementById('total-orders').textContent = formatNumber(stats.totalOrdersPlaced || 0);
    document.getElementById('orders-awarded').textContent = formatNumber(stats.totalOrdersAwarded || 0);
    document.getElementById('orders-delivered').textContent = formatNumber(stats.totalOrdersDelivered || 0);
    document.getElementById('total-bids').textContent = formatNumber(stats.totalBidsReceived || 0);

    // Pricing info
    document.getElementById('gm-status').textContent = gm.config.enabled ? 'Enabled' : 'Disabled';
    document.getElementById('gm-multiplier').textContent = gm.config.priceMultiplier + 'x';
    document.getElementById('gm-market-price').textContent = (gm.config.priceMultiplier * gm.config.marketDiscountRate).toFixed(2) + 'x';
    document.getElementById('gm-total-spent').textContent = formatCurrency(stats.totalSpent || 0);
}

function updateTransactionStats() {
    const log = simulation.transactionLog;
    if (!log) return;

    const stats = log.stats;

    document.getElementById('total-transactions').textContent = formatNumber(stats.totalTransactions || 0);
    document.getElementById('total-value').textContent = formatCurrency(stats.totalValue || 0);
    document.getElementById('avg-per-hour').textContent = formatNumber(stats.totalTransactions / Math.max(1, simulation.clock?.totalHours || 1));
    document.getElementById('pending-orders').textContent = simulation.globalMarket?.pendingOrders?.length || 0;

    // Category breakdown using new getSummaryByCategory
    const categorySummary = log.getSummaryByCategory ? log.getSummaryByCategory() : {};

    // Update each category
    const categoryElements = [
        { key: 'B2B_RAW', countId: 'cat-b2b-raw-count', valueId: 'cat-b2b-raw-value' },
        { key: 'B2B_SEMI', countId: 'cat-b2b-semi-count', valueId: 'cat-b2b-semi-value' },
        { key: 'B2B_MANUFACTURED', countId: 'cat-b2b-manufactured-count', valueId: 'cat-b2b-manufactured-value' },
        { key: 'B2B_WHOLESALE', countId: 'cat-b2b-wholesale-count', valueId: 'cat-b2b-wholesale-value' },
        { key: 'B2C_RETAIL', countId: 'cat-b2c-retail-count', valueId: 'cat-b2c-retail-value' },
        { key: 'GLOBAL_MARKET', countId: 'cat-global-market-count', valueId: 'cat-global-market-value' },
        { key: 'CONTRACT', countId: 'cat-contract-count', valueId: 'cat-contract-value' }
    ];

    categoryElements.forEach(cat => {
        const data = categorySummary[cat.key] || { count: 0, value: 0 };
        const countEl = document.getElementById(cat.countId);
        const valueEl = document.getElementById(cat.valueId);
        if (countEl) countEl.textContent = formatNumber(data.count);
        if (valueEl) valueEl.textContent = formatCurrency(data.value);
    });
}

function renderBiddingOrders() {
    const container = document.getElementById('bidding-orders-grid');
    const badge = document.getElementById('bidding-count-badge');
    if (!container) return;

    const gm = simulation.globalMarket;
    const orders = gm?.biddingOrders?.filter(o => o.status === 'BIDDING') || [];

    badge.textContent = orders.length + ' Orders';

    if (orders.length === 0) {
        container.innerHTML = '<p class="empty-state">No orders currently in bidding</p>';
        return;
    }

    container.innerHTML = orders.slice(0, 20).map(order => {
        const lotInfo = order.usesLots
            ? `<div class="order-stat lot-stat"><span class="label">Lots</span><span class="value">${order.lotsRequired} × ${order.lotSize} ${order.lotUnit}</span></div>`
            : '';

        return `
        <div class="order-card ${order.isCompanyOrder ? 'company-order' : 'market-order'}">
            <div class="order-card-header">
                <span class="order-product">${order.productName}</span>
                <span class="order-type-badge ${order.isCompanyOrder ? 'company' : 'market'}">
                    ${order.isCompanyOrder ? 'Company' : 'Market'}
                </span>
                ${order.usesLots ? '<span class="lot-badge">LOT</span>' : ''}
            </div>
            <div class="order-card-body">
                <div class="order-stat">
                    <span class="label">Quantity</span>
                    <span class="value">${order.quantity}</span>
                </div>
                <div class="order-stat">
                    <span class="label">Price/Unit</span>
                    <span class="value">${formatCurrency(order.offerPrice)}</span>
                </div>
                <div class="order-stat">
                    <span class="label">Total</span>
                    <span class="value">${formatCurrency(order.totalValue)}</span>
                </div>
                <div class="order-stat">
                    <span class="label">Bids</span>
                    <span class="value">${order.bids?.length || 0}</span>
                </div>
                ${lotInfo}
            </div>
            <div class="order-card-footer">
                <span class="order-location">${order.deliveryLocation}</span>
                <span class="order-deadline">Due: Day ${order.deliveryDeadlineDay}</span>
            </div>
        </div>
    `}).join('');
}

function renderAvailableOrders() {
    const tbody = document.getElementById('available-orders-tbody');
    const badge = document.getElementById('available-count-badge');
    if (!tbody) return;

    const gm = simulation.globalMarket;
    let orders = gm?.availableOrders?.filter(o => o.status === 'AVAILABLE') || [];

    // Apply filters
    if (orderTierFilter !== 'all') {
        orders = orders.filter(o => o.productTier === orderTierFilter);
    }
    if (orderTypeFilter !== 'all') {
        if (orderTypeFilter === 'company') {
            orders = orders.filter(o => o.isCompanyOrder);
        } else {
            orders = orders.filter(o => !o.isCompanyOrder);
        }
    }

    badge.textContent = orders.length + ' Orders';

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No available orders</td></tr>';
        return;
    }

    tbody.innerHTML = orders.slice(0, 50).map(order => {
        const lotDisplay = order.usesLots
            ? `<span class="lot-info">${order.lotsRequired} lots</span>`
            : '-';

        return `
        <tr class="${order.isCompanyOrder ? 'company-order-row' : ''}">
            <td>${order.productName} ${order.usesLots ? '<span class="lot-badge-sm">LOT</span>' : ''}</td>
            <td><span class="tier-badge tier-${order.productTier?.toLowerCase()}">${order.productTier}</span></td>
            <td>${order.quantity}${order.usesLots ? ` (${lotDisplay})` : ''}</td>
            <td>${formatCurrency(order.offerPrice)}</td>
            <td>${formatCurrency(order.totalValue)}</td>
            <td>${formatCurrency(order.deliveryFee)}</td>
            <td>Day ${order.deliveryDeadlineDay}</td>
            <td><span class="order-type-badge ${order.isCompanyOrder ? 'company' : 'market'}">${order.isCompanyOrder ? 'Company' : 'Market'}</span></td>
            <td>${order.deliveryLocation}</td>
        </tr>
    `}).join('');
}

function renderAwardedOrders() {
    const tbody = document.getElementById('awarded-orders-tbody');
    const badge = document.getElementById('pending-delivery-count');
    if (!tbody) return;

    const gm = simulation.globalMarket;
    const orders = gm?.pendingOrders?.filter(o => o.status === 'AWARDED') || [];

    badge.textContent = orders.length + ' Orders';

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No pending deliveries</td></tr>';
        return;
    }

    tbody.innerHTML = orders.slice(0, 30).map(order => {
        const firmId = order.winningBid?.firmId;
        const firmName = getFirmDisplayName(firmId);
        const firm = firmId ? simulation.firms.get(firmId) : null;
        const corp = firm ? simulation.corporations.find(c => c.id === firm.corporationId) : null;

        // Lot info for awarded orders
        const lotInfo = order.usesLots
            ? `<span class="lot-info-awarded">${order.winningBid?.lotsOffered || order.lotsRequired} lots${order.winningBid?.avgQuality ? ` (Q: ${order.winningBid.avgQuality.toFixed(0)})` : ''}</span>`
            : '';

        return `
            <tr>
                <td>${order.productName} ${order.usesLots ? '<span class="lot-badge-sm">LOT</span>' : ''}</td>
                <td><span class="tier-badge tier-${order.productTier?.toLowerCase()}">${order.productTier || '-'}</span></td>
                <td>${order.quantity}${lotInfo ? `<br>${lotInfo}` : ''}</td>
                <td>
                    <div class="firm-link-cell">
                        <a href="#" class="firm-link" data-firm-id="${firmId || ''}">${getShortFirmName(firmId)}</a>
                        <span class="firm-city">${firm?.city?.name || ''}</span>
                    </div>
                </td>
                <td><span class="corp-name-badge">${corp?.name || '-'}</span></td>
                <td>${formatCurrency(order.winningBid?.totalBidValue || 0)}</td>
                <td>${order.deliveryHoursRemaining || 0}h</td>
                <td><span class="status-badge status-awarded">Pending</span></td>
            </tr>
        `;
    }).join('');

    // Add click handlers for firm links
    tbody.querySelectorAll('.firm-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const firmId = link.dataset.firmId;
            if (firmId) {
                // Navigate to dashboard with firm detail
                window.location.href = `firms.html?id=${firmId}`;
            }
        });
    });
}

function renderCompletedOrders() {
    const tbody = document.getElementById('completed-orders-tbody');
    const badge = document.getElementById('completed-orders-count');
    if (!tbody) return;

    const gm = simulation.globalMarket;
    const orders = (gm?.completedOrders || []).slice(-30).reverse();

    if (badge) badge.textContent = orders.length + ' Orders';

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No completed deliveries yet</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const firmId = order.winningBid?.firmId;
        const firm = firmId ? simulation.firms.get(firmId) : null;
        const corp = firm ? simulation.corporations.find(c => c.id === firm.corporationId) : null;

        // Delivered lots info
        const deliveredLotsInfo = order.deliveredLots && order.deliveredLots.length > 0
            ? `<span class="lots-delivered">${order.deliveredLots.length} lots delivered</span>`
            : (order.usesLots ? `<span class="lots-delivered">${order.lotsRequired} lots</span>` : '');

        return `
            <tr>
                <td>${order.productName} ${order.usesLots ? '<span class="lot-badge-sm">LOT</span>' : ''}</td>
                <td><span class="tier-badge tier-${order.productTier?.toLowerCase()}">${order.productTier || '-'}</span></td>
                <td>${order.quantity}${deliveredLotsInfo ? `<br>${deliveredLotsInfo}` : ''}</td>
                <td>
                    <div class="firm-link-cell">
                        <a href="#" class="firm-link" data-firm-id="${firmId || ''}">${getShortFirmName(firmId)}</a>
                        <span class="firm-city">${firm?.city?.name || ''}</span>
                    </div>
                </td>
                <td><span class="corp-name-badge">${corp?.name || '-'}</span></td>
                <td>${formatCurrency(order.winningBid?.totalBidValue || 0)}</td>
                <td>${order.deliveryLocation || '-'}</td>
                <td><span class="status-badge status-delivered">Delivered</span></td>
            </tr>
        `;
    }).join('');

    // Add click handlers for firm links
    tbody.querySelectorAll('.firm-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const firmId = link.dataset.firmId;
            if (firmId) {
                window.location.href = `firms.html?id=${firmId}`;
            }
        });
    });
}

// Helper to get category display info
function getCategoryDisplay(category) {
    const displays = {
        'B2B_RAW': { label: 'Raw', icon: '⛏️', colorClass: 'tx-b2b-raw' },
        'B2B_SEMI': { label: 'Semi', icon: '⚙️', colorClass: 'tx-b2b-semi' },
        'B2B_MANUFACTURED': { label: 'Mfg', icon: '🏭', colorClass: 'tx-b2b-manufactured' },
        'B2B_WHOLESALE': { label: 'Wholesale', icon: '📦', colorClass: 'tx-b2b-wholesale' },
        'B2C_RETAIL': { label: 'Retail', icon: '🛒', colorClass: 'tx-b2c-retail' },
        'GLOBAL_MARKET': { label: 'Global', icon: '🌐', colorClass: 'tx-global-market' },
        'CONTRACT': { label: 'Contract', icon: '📝', colorClass: 'tx-contract' }
    };
    return displays[category] || { label: category || 'Unknown', icon: '💰', colorClass: 'tx-other' };
}

// Categorize a transaction for filtering
function categorizeTransaction(t) {
    if (t.category) return t.category;

    // Use TransactionLog categorize if available
    if (simulation.transactionLog?.categorize) {
        return simulation.transactionLog.categorize(t);
    }

    // Fallback categorization
    if (t.type === 'GLOBAL_MARKET' || t.type === 'GLOBAL_MARKET_SALE') return 'GLOBAL_MARKET';
    if (t.contractId) return 'CONTRACT';
    if (t.type === 'CONSUMER_SALE' || t.type === 'RETAIL_SALE') return 'B2C_RETAIL';
    if (t.type === 'RETAIL_PURCHASE') return 'B2B_WHOLESALE';
    if (t.tier === 'RAW_TO_SEMI') return 'B2B_RAW';
    if (t.tier === 'SEMI_TO_MANUFACTURED') return 'B2B_SEMI';
    return 'B2B_RAW';
}

function renderTransactions() {
    const tbody = document.getElementById('transactions-tbody');
    if (!tbody) return;

    let transactions = simulation.transactionLog?.transactions || [];

    // Filter by category (updated from type)
    if (typeFilter !== 'all') {
        transactions = transactions.filter(t => categorizeTransaction(t) === typeFilter);
    }

    if (cityFilter !== 'all') {
        transactions = transactions.filter(t =>
            t.seller?.city === cityFilter || t.buyer?.city === cityFilter
        );
    }

    if (searchTerm) {
        transactions = transactions.filter(t =>
            t.material?.toLowerCase().includes(searchTerm) ||
            t.product?.toLowerCase().includes(searchTerm) ||
            t.seller?.name?.toLowerCase().includes(searchTerm) ||
            t.buyer?.name?.toLowerCase().includes(searchTerm) ||
            String(t.orderId || '').toLowerCase().includes(searchTerm) ||
            String(t.contractId || '').toLowerCase().includes(searchTerm)
        );
    }

    const recent = transactions.slice(-50).reverse();
    document.getElementById('showing-transactions').textContent = `Showing ${recent.length}`;

    tbody.innerHTML = recent.map(t => {
        // Get seller firm info
        const sellerId = t.seller?.id;
        const sellerFirm = sellerId ? simulation.firms.get(sellerId) : null;
        const sellerDisplay = sellerFirm ? getShortFirmName(sellerId) : (t.seller?.name || 'Global Market');

        // Get buyer firm info
        const buyerId = t.buyer?.id;
        const buyerFirm = buyerId ? simulation.firms.get(buyerId) : null;
        const buyerDisplay = buyerFirm ? getShortFirmName(buyerId) : (t.buyer?.name || 'Consumer');

        // Get category info
        const category = categorizeTransaction(t);
        const catDisplay = getCategoryDisplay(category);

        // Lot info badge
        const lotInfo = t.lotId || t.lotQuality
            ? `<span class="lot-badge-sm" title="Lot: ${t.lotId || 'N/A'}, Quality: ${t.lotQuality ? (t.lotQuality * 100).toFixed(0) + '%' : 'N/A'}">LOT</span>`
            : '';

        // Contract info badge
        const contractInfo = t.contractId
            ? `<span class="contract-badge-sm" title="Contract: ${t.contractId}">📝</span>`
            : '';

        // Order info if available
        const orderInfo = t.orderId ? `<span class="order-id-badge" title="Order ID: ${t.orderId}">📦</span>` : '';

        // Quality display
        const qualityDisplay = t.lotQuality
            ? `<span class="quality-indicator quality-${t.lotQuality >= 0.8 ? 'high' : t.lotQuality >= 0.5 ? 'medium' : 'low'}">${(t.lotQuality * 100).toFixed(0)}%</span>`
            : '';

        return `
            <tr class="${catDisplay.colorClass}-row">
                <td>${t.gameTime || new Date(t.timestamp).toLocaleTimeString()}</td>
                <td><span class="category-badge ${catDisplay.colorClass}">${catDisplay.icon} ${catDisplay.label}</span></td>
                <td>
                    ${sellerFirm ? `<a href="#" class="firm-link" data-firm-id="${sellerId}">${sellerDisplay}</a>` : sellerDisplay}
                </td>
                <td>
                    ${buyerFirm ? `<a href="#" class="firm-link" data-firm-id="${buyerId}">${buyerDisplay}</a>` : buyerDisplay}
                </td>
                <td>${t.material || t.product || '-'} ${lotInfo}${contractInfo}${orderInfo}</td>
                <td>${t.quantity || '-'}${qualityDisplay}</td>
                <td>${formatCurrency(t.unitPrice || 0)}</td>
                <td>${formatCurrency(t.totalCost || t.totalRevenue || 0)}</td>
                <td><span class="status-badge ${t.status?.toLowerCase()}">${t.status || 'Completed'}</span></td>
            </tr>
        `;
    }).join('');

    // Add click handlers for firm links in transactions
    tbody.querySelectorAll('.firm-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const firmId = link.dataset.firmId;
            if (firmId) {
                window.location.href = `firms.html?id=${firmId}`;
            }
        });
    });
}

init();
