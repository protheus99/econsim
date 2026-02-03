// js/pages/corporations.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber, formatCurrency, getFirmTypeName } from './shared.js';

let simulation;
let currentSort = 'cash-desc';
let currentFilter = 'all';
let searchTerm = '';

async function init() {
    try {
        simulation = await getSimulation();
        if (!simulation) {
            console.error('Failed to get simulation');
            return;
        }

        // Debug: Check corporation facilities right after simulation is loaded
        console.log('=== DEBUG: Corporations after simulation load ===');
        console.log('Total firms in simulation:', simulation.firms.size);
        console.log('Total corporations:', simulation.corporations.length);
        simulation.corporations.forEach(corp => {
            console.log(`Corp ${corp.id} (${corp.name}): ${corp.facilities?.length || 0} facilities`);
        });

        // Check if firms have corporationId set
        const firmsWithCorpId = Array.from(simulation.firms.values()).filter(f => f.corporationId);
        console.log('Firms with corporationId set:', firmsWithCorpId.length);

        setupClock(simulation);
        setupControls(simulation);

    // Check for corp ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const corpIdParam = urlParams.get('id');

    // Setup event listeners
    document.getElementById('corps-sort-select')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderCorporations();
    });

    document.getElementById('corps-filter-select')?.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderCorporations();
    });

    document.getElementById('corps-search-input')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderCorporations();
    });

    document.getElementById('btn-back')?.addEventListener('click', () => {
        document.getElementById('corp-detail-view').classList.add('hidden');
        document.querySelector('.main-container').style.display = 'block';
        window.history.pushState({}, '', 'corporations.html');
    });

    // Initial render
    updateDisplay();
    onUpdate(() => updateDisplay());

    // Show corp detail if ID in URL
    if (corpIdParam) {
        showCorpDetail(corpIdParam);
    }
    } catch (error) {
        console.error('Error initializing corporations page:', error);
    }
}

function updateDisplay() {
    if (!simulation) return;

    document.getElementById('all-corps-count').textContent = simulation.corporations.length + ' Corporations';
    renderSummary();
    renderCorporations();
}

function renderSummary() {
    const container = document.getElementById('corps-summary-stats');
    if (!container) return;

    let totalRevenue = 0, totalProfit = 0, totalEmployees = 0, totalFacilities = 0;
    let totalOrdersWon = 0, totalOrderValue = 0;

    simulation.corporations.forEach(c => {
        totalRevenue += c.revenue || 0;
        totalProfit += c.profit || 0;
        totalEmployees += c.employees || 0;
        totalFacilities += c.facilities?.length || 0;

        // Count orders won by this corp's firms
        const corpOrders = getCorpOrders(c);
        totalOrdersWon += corpOrders.length;
        totalOrderValue += corpOrders.reduce((sum, o) => sum + (o.winningBid?.totalBidValue || 0), 0);
    });

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-label">Total Revenue</span>
                <span class="stat-value">${formatCurrency(totalRevenue)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Profit</span>
                <span class="stat-value">${formatCurrency(totalProfit)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Employees</span>
                <span class="stat-value">${formatNumber(totalEmployees)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Facilities</span>
                <span class="stat-value">${totalFacilities}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Orders Won</span>
                <span class="stat-value">${totalOrdersWon}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Order Value</span>
                <span class="stat-value">${formatCurrency(totalOrderValue)}</span>
            </div>
        </div>
    `;
}

function getCorpOrders(corp) {
    const gm = simulation.globalMarket;
    if (!gm) return [];

    // Get firm IDs for this corporation
    const firmIds = (corp.facilities || []).map(f => f.id);

    // Find orders won by these firms
    const pendingOrders = (gm.pendingOrders || []).filter(o =>
        o.winningBid && firmIds.includes(o.winningBid.firmId)
    );

    const completedOrders = (gm.completedOrders || []).filter(o =>
        o.winningBid && firmIds.includes(o.winningBid.firmId)
    );

    return [...pendingOrders, ...completedOrders];
}

function renderCorporations() {
    const container = document.getElementById('all-corps-grid');
    if (!container) return;

    let corps = [...simulation.corporations];

    // Filter
    if (currentFilter !== 'all') {
        corps = corps.filter(c => c.character === currentFilter);
    }

    // Search
    if (searchTerm) {
        corps = corps.filter(c => c.name.toLowerCase().includes(searchTerm));
    }

    // Sort
    const [field, dir] = currentSort.split('-');
    corps.sort((a, b) => {
        let aVal, bVal;
        switch (field) {
            case 'cash': aVal = a.cash || 0; bVal = b.cash || 0; break;
            case 'profit': aVal = a.profit || 0; bVal = b.profit || 0; break;
            case 'revenue': aVal = a.revenue || 0; bVal = b.revenue || 0; break;
            case 'employees': aVal = a.employees || 0; bVal = b.employees || 0; break;
            case 'facilities': aVal = a.facilities?.length || 0; bVal = b.facilities?.length || 0; break;
            case 'name': aVal = a.name; bVal = b.name; break;
            default: aVal = 0; bVal = 0;
        }
        if (dir === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });

    container.innerHTML = corps.map(corp => {
        const corpOrders = getCorpOrders(corp);
        return `
        <div class="corp-card" data-corp-id="${corp.id}">
            <div class="corp-card-header">
                <span class="corp-abbr">${corp.abbreviation || '???'}</span>
                <span class="corp-name">${corp.name}</span>
                <span class="corp-badge ${corp.character?.toLowerCase()}">${corp.character || 'Unknown'}</span>
            </div>
            <div class="corp-card-stats">
                <div class="stat-item">
                    <span class="stat-label">Cash</span>
                    <span class="stat-value">${formatCurrency(corp.cash || 0)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Revenue</span>
                    <span class="stat-value">${formatCurrency(corp.revenue || 0)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Profit</span>
                    <span class="stat-value ${(corp.profit || 0) < 0 ? 'negative' : ''}">${formatCurrency(corp.profit || 0)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Facilities</span>
                    <span class="stat-value">${corp.facilities?.length || 0}</span>
                </div>
            </div>
            ${corpOrders.length > 0 ? `
            <div class="corp-orders-badge">
                <span class="orders-won-badge">${corpOrders.length} Orders Won</span>
            </div>
            ` : ''}
        </div>
    `}).join('');

    // Add click handlers
    container.querySelectorAll('.corp-card').forEach(card => {
        card.addEventListener('click', () => {
            const corpId = card.dataset.corpId;
            window.history.pushState({}, '', `corporations.html?id=${corpId}`);
            showCorpDetail(corpId);
        });
    });
}

function showCorpDetail(corpId) {
    const corp = simulation.corporations.find(c => c.id === corpId || c.id === parseInt(corpId));

    // If corporation not found, show error
    if (!corp) {
        document.querySelector('.main-container').style.display = 'none';
        document.getElementById('corp-detail-view').classList.remove('hidden');
        document.getElementById('corp-detail-name').textContent = 'Corporation Not Found';
        document.getElementById('corp-character-badge').textContent = '';
        document.getElementById('corp-character-badge').className = 'corp-character-badge';

        const errorMsg = `
            <div class="corp-not-found-error">
                <p>The corporation with ID "${corpId}" was not found.</p>
                <p><a href="corporations.html" class="btn btn-primary">← Back to Corporations List</a></p>
            </div>
        `;
        document.getElementById('corp-financial-stats').innerHTML = errorMsg;
        document.getElementById('corp-performance-stats').innerHTML = '';
        document.getElementById('corp-industry-breakdown').innerHTML = '';
        document.getElementById('corp-cities-list').innerHTML = '';
        document.getElementById('corp-firms-list').innerHTML = '';
        document.getElementById('corp-orders-stats').innerHTML = '';
        document.getElementById('corp-orders-list').innerHTML = '';
        return;
    }

    document.querySelector('.main-container').style.display = 'none';
    document.getElementById('corp-detail-view').classList.remove('hidden');

    document.getElementById('corp-detail-name').textContent = `[${corp.abbreviation || '???'}] ${corp.name}`;
    document.getElementById('corp-character-badge').textContent = corp.character || 'Unknown';
    document.getElementById('corp-character-badge').className = `corp-character-badge ${corp.character?.toLowerCase()}`;

    // Financial stats
    document.getElementById('corp-financial-stats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Cash</span><span class="stat-value">${formatCurrency(corp.cash || 0)}</span></div>
            <div class="stat-item"><span class="stat-label">Revenue</span><span class="stat-value">${formatCurrency(corp.revenue || 0)}</span></div>
            <div class="stat-item"><span class="stat-label">Expenses</span><span class="stat-value">${formatCurrency(corp.expenses || 0)}</span></div>
            <div class="stat-item"><span class="stat-label">Profit</span><span class="stat-value ${(corp.profit || 0) < 0 ? 'negative' : ''}">${formatCurrency(corp.profit || 0)}</span></div>
        </div>
    `;

    // Performance stats
    document.getElementById('corp-performance-stats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Employees</span><span class="stat-value">${formatNumber(corp.employees || 0)}</span></div>
            <div class="stat-item"><span class="stat-label">Facilities</span><span class="stat-value">${corp.facilities?.length || 0}</span></div>
        </div>
    `;

    // Facilities list
    const facilitiesList = document.getElementById('corp-firms-list');
    document.getElementById('facilities-count').textContent = (corp.facilities?.length || 0) + ' Facilities';

    // Debug: Log corporation and facilities info
    console.log(`Corporation ${corp.id} - ${corp.name}:`);
    console.log(`  - facilities array:`, corp.facilities);
    console.log(`  - facilities count:`, corp.facilities?.length || 0);

    // Also check firms by corporationId
    const firmsByCorporationId = Array.from(simulation.firms.values()).filter(f => f.corporationId === corp.id);
    console.log(`  - firms with corporationId=${corp.id}:`, firmsByCorporationId.length);
    if (firmsByCorporationId.length > 0) {
        console.log(`  - sample firm:`, firmsByCorporationId[0]);
    }

    if (corp.facilities && corp.facilities.length > 0) {
        facilitiesList.innerHTML = corp.facilities.map(f => {
            const typeName = getFirmTypeName(f);
            const cityName = f.city?.name || 'Unknown';
            const firmType = f.type?.toLowerCase() || 'unknown';
            return `
                <div class="firm-item clickable" data-firm-id="${f.id}">
                    <span class="firm-type">${typeName}</span>
                    <span class="firm-type-badge ${firmType}">${f.type || 'Unknown'}</span>
                    <span class="firm-location">${cityName}</span>
                    <span class="firm-stats-mini">${formatCurrency(f.revenue || 0)} rev</span>
                </div>
            `;
        }).join('');

        // Add click handlers for firm navigation
        facilitiesList.querySelectorAll('.firm-item').forEach(item => {
            item.addEventListener('click', () => {
                const firmId = item.dataset.firmId;
                window.location.href = `firms.html?id=${firmId}`;
            });
        });
    } else {
        facilitiesList.innerHTML = '<p class="empty-state">No facilities</p>';
    }

    // Orders section
    renderCorpOrders(corp);
}

function renderCorpOrders(corp) {
    const statsContainer = document.getElementById('corp-orders-stats');
    const listContainer = document.getElementById('corp-orders-list');
    const countBadge = document.getElementById('corp-orders-count');

    const orders = getCorpOrders(corp);
    const pendingOrders = orders.filter(o => o.status === 'AWARDED');
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
    const totalValue = orders.reduce((sum, o) => sum + (o.winningBid?.totalBidValue || 0), 0);

    countBadge.textContent = orders.length + ' Orders';

    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-label">Pending</span>
                <span class="stat-value">${pendingOrders.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Delivered</span>
                <span class="stat-value">${deliveredOrders.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Value</span>
                <span class="stat-value">${formatCurrency(totalValue)}</span>
            </div>
        </div>
    `;

    if (orders.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">No orders won yet</p>';
        return;
    }

    listContainer.innerHTML = `
        <div class="firm-orders-list">
            ${orders.slice(0, 20).map(order => `
                <div class="firm-order-item">
                    <span class="firm-order-product">${order.productName}</span>
                    <span class="firm-order-qty">${order.quantity} units</span>
                    <span class="firm-order-value">${formatCurrency(order.winningBid?.totalBidValue || 0)}</span>
                    <span class="firm-order-status ${order.status === 'AWARDED' ? 'pending' : 'won'}">
                        ${order.status === 'AWARDED' ? 'Pending' : 'Delivered'}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

init();
