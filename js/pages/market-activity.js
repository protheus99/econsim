// js/pages/market-activity.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber, formatCurrency } from './shared.js';

let simulation;
let typeFilter = 'all';
let cityFilter = 'all';
let searchTerm = '';

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

    updateTransactionStats();
    renderTransactions();
}

function updateTransactionStats() {
    const log = simulation.transactionLog;
    if (!log) return;

    const stats = log.stats;

    document.getElementById('total-transactions').textContent = formatNumber(stats.totalTransactions || 0);
    document.getElementById('total-value').textContent = formatCurrency(stats.totalValue || 0);
    document.getElementById('avg-per-hour').textContent = formatNumber(stats.totalTransactions / Math.max(1, simulation.clock?.totalHours || 1));

    // Count pending local deliveries from purchase manager
    const pendingDeliveries = simulation.purchaseManager?.pendingDeliveries?.length || 0;
    document.getElementById('pending-orders').textContent = pendingDeliveries;

    // B2B vs retail breakdown
    const b2bCount = stats.b2bTransactions || 0;
    const retailCount = stats.retailTransactions || 0;
    const contractCount = stats.contractTransactions || 0;
    const activeSuppliers = simulation.purchaseManager?.contractManager?.getActiveContracts?.()?.length || 0;

    document.getElementById('b2b-transactions').textContent = formatNumber(b2bCount);
    document.getElementById('retail-transactions').textContent = formatNumber(retailCount);
    document.getElementById('contract-transactions').textContent = formatNumber(contractCount);
    document.getElementById('active-suppliers').textContent = formatNumber(activeSuppliers);

    // Category breakdown using new getSummaryByCategory
    const categorySummary = log.getSummaryByCategory ? log.getSummaryByCategory() : {};

    // Update each category
    const categoryElements = [
        { key: 'B2B_RAW', countId: 'cat-b2b-raw-count', valueId: 'cat-b2b-raw-value' },
        { key: 'B2B_SEMI', countId: 'cat-b2b-semi-count', valueId: 'cat-b2b-semi-value' },
        { key: 'B2B_MANUFACTURED', countId: 'cat-b2b-manufactured-count', valueId: 'cat-b2b-manufactured-value' },
        { key: 'B2B_WHOLESALE', countId: 'cat-b2b-wholesale-count', valueId: 'cat-b2b-wholesale-value' },
        { key: 'B2C_RETAIL', countId: 'cat-b2c-retail-count', valueId: 'cat-b2c-retail-value' },
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

// Helper to get category display info
function getCategoryDisplay(category) {
    const displays = {
        'B2B_RAW': { label: 'Raw', icon: '⛏️', colorClass: 'tx-b2b-raw' },
        'B2B_SEMI': { label: 'Semi', icon: '⚙️', colorClass: 'tx-b2b-semi' },
        'B2B_MANUFACTURED': { label: 'Mfg', icon: '🏭', colorClass: 'tx-b2b-manufactured' },
        'B2B_WHOLESALE': { label: 'Wholesale', icon: '📦', colorClass: 'tx-b2b-wholesale' },
        'B2C_RETAIL': { label: 'Retail', icon: '🛒', colorClass: 'tx-b2c-retail' },
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
        const sellerDisplay = sellerFirm ? getShortFirmName(sellerId) : (t.seller?.name || 'Unknown');

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
                    ${sellerFirm ? `<a href="firms.html?id=${sellerId}" class="firm-link">${sellerDisplay}</a>` : sellerDisplay}
                </td>
                <td>
                    ${buyerFirm ? `<a href="firms.html?id=${buyerId}" class="firm-link">${buyerDisplay}</a>` : buyerDisplay}
                </td>
                <td>${t.material || t.product || '-'} ${lotInfo}${contractInfo}${orderInfo}</td>
                <td>${t.quantity || '-'}${qualityDisplay}</td>
                <td>${formatCurrency(t.unitPrice || 0)}</td>
                <td>${formatCurrency(t.totalCost || t.totalRevenue || 0)}</td>
                <td><span class="status-badge ${t.status?.toLowerCase()}">${t.status || 'Completed'}</span></td>
            </tr>
        `;
    }).join('');
}

init();
