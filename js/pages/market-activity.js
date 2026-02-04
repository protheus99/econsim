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

    // Breakdown
    const b2bRaw = log.b2bTransactions?.filter(t => t.tier === 'RAW_TO_SEMI').length || 0;
    const b2bSemi = log.b2bTransactions?.filter(t => t.tier === 'SEMI_TO_MANUFACTURED').length || 0;
    document.getElementById('b2b-raw-count').textContent = b2bRaw;
    document.getElementById('b2b-semi-count').textContent = b2bSemi;
    document.getElementById('retail-purchase-count').textContent = stats.totalRetail || 0;
    document.getElementById('consumer-sale-count').textContent = stats.totalConsumerSales || 0;
    document.getElementById('global-market-count').textContent = stats.totalGlobalMarket || 0;
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

    container.innerHTML = orders.slice(0, 20).map(order => `
        <div class="order-card ${order.isCompanyOrder ? 'company-order' : 'market-order'}">
            <div class="order-card-header">
                <span class="order-product">${order.productName}</span>
                <span class="order-type-badge ${order.isCompanyOrder ? 'company' : 'market'}">
                    ${order.isCompanyOrder ? 'Company' : 'Market'}
                </span>
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
            </div>
            <div class="order-card-footer">
                <span class="order-location">${order.deliveryLocation}</span>
                <span class="order-deadline">Due: Day ${order.deliveryDeadlineDay}</span>
            </div>
        </div>
    `).join('');
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

    tbody.innerHTML = orders.slice(0, 50).map(order => `
        <tr class="${order.isCompanyOrder ? 'company-order-row' : ''}">
            <td>${order.productName}</td>
            <td><span class="tier-badge tier-${order.productTier?.toLowerCase()}">${order.productTier}</span></td>
            <td>${order.quantity}</td>
            <td>${formatCurrency(order.offerPrice)}</td>
            <td>${formatCurrency(order.totalValue)}</td>
            <td>${formatCurrency(order.deliveryFee)}</td>
            <td>Day ${order.deliveryDeadlineDay}</td>
            <td><span class="order-type-badge ${order.isCompanyOrder ? 'company' : 'market'}">${order.isCompanyOrder ? 'Company' : 'Market'}</span></td>
            <td>${order.deliveryLocation}</td>
        </tr>
    `).join('');
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

        return `
            <tr>
                <td>${order.productName}</td>
                <td><span class="tier-badge tier-${order.productTier?.toLowerCase()}">${order.productTier || '-'}</span></td>
                <td>${order.quantity}</td>
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

        return `
            <tr>
                <td>${order.productName}</td>
                <td><span class="tier-badge tier-${order.productTier?.toLowerCase()}">${order.productTier || '-'}</span></td>
                <td>${order.quantity}</td>
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

function renderTransactions() {
    const tbody = document.getElementById('transactions-tbody');
    if (!tbody) return;

    let transactions = simulation.transactionLog?.transactions || [];

    if (typeFilter !== 'all') {
        transactions = transactions.filter(t => t.type === typeFilter);
    }

    if (cityFilter !== 'all') {
        transactions = transactions.filter(t =>
            t.seller?.city === cityFilter || t.buyer?.city === cityFilter
        );
    }

    if (searchTerm) {
        transactions = transactions.filter(t =>
            t.material?.toLowerCase().includes(searchTerm) ||
            t.seller?.name?.toLowerCase().includes(searchTerm) ||
            t.buyer?.name?.toLowerCase().includes(searchTerm) ||
            String(t.orderId || '').toLowerCase().includes(searchTerm)
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

        // Order info if available
        const orderInfo = t.orderId ? `<span class="order-id-badge" title="Order ID: ${t.orderId}">📦</span>` : '';

        return `
            <tr class="${t.type === 'GLOBAL_MARKET' ? 'global-market-row' : ''}">
                <td>${t.gameTime || new Date(t.timestamp).toLocaleTimeString()}</td>
                <td><span class="type-badge ${t.type?.toLowerCase()}">${t.type}</span></td>
                <td>
                    ${sellerFirm ? `<a href="#" class="firm-link" data-firm-id="${sellerId}">${sellerDisplay}</a>` : sellerDisplay}
                </td>
                <td>
                    ${buyerFirm ? `<a href="#" class="firm-link" data-firm-id="${buyerId}">${buyerDisplay}</a>` : buyerDisplay}
                </td>
                <td>${t.material || t.productName || '-'} ${orderInfo}</td>
                <td>${t.quantity || '-'}</td>
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
