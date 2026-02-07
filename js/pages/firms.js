// js/pages/firms.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber, formatCurrency, formatCurrencyFull, moneyClass, getFirmDisplayName } from './shared.js';

let simulation;
let currentSort = 'profit-desc';
let typeFilter = 'all';
let corpFilter = 'all';
let searchTerm = '';
let currentFirmId = null;

async function init() {
    simulation = await getSimulation();
    setupClock(simulation);
    setupControls(simulation);

    // Check for firm ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const firmIdParam = urlParams.get('id');
    if (firmIdParam) {
        currentFirmId = firmIdParam;
        showFirmDetail(firmIdParam);
    }

    // Setup event listeners
    document.getElementById('firms-sort-select')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderFirms();
    });

    document.getElementById('firms-type-filter')?.addEventListener('change', (e) => {
        typeFilter = e.target.value;
        renderFirms();
    });

    document.getElementById('firms-corp-filter')?.addEventListener('change', (e) => {
        corpFilter = e.target.value;
        renderFirms();
    });

    document.getElementById('firms-search-input')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderFirms();
    });

    document.getElementById('btn-back')?.addEventListener('click', () => {
        document.getElementById('firm-detail-view').classList.add('hidden');
        document.getElementById('firms-list-view').style.display = 'block';
        currentFirmId = null;
        // Update URL
        window.history.pushState({}, '', 'firms.html');
    });

    // Populate corporation filter
    populateCorpFilter();

    // Initial render
    updateDisplay();
    onUpdate(() => updateDisplay());
}

function populateCorpFilter() {
    const select = document.getElementById('firms-corp-filter');
    if (!select || !simulation) return;

    simulation.corporations.forEach(corp => {
        const option = document.createElement('option');
        option.value = corp.id;
        option.textContent = `[${corp.abbreviation || '???'}] ${corp.name}`;
        select.appendChild(option);
    });
}

function updateDisplay() {
    if (!simulation) return;

    const firms = Array.from(simulation.firms.values());
    document.getElementById('all-firms-count').textContent = firms.length + ' Firms';

    renderSummary();
    renderFirms();

    // Update detail view if showing one
    if (currentFirmId) {
        showFirmDetail(currentFirmId);
    }
}

function renderSummary() {
    const container = document.getElementById('firms-summary-stats');
    if (!container) return;

    const firms = Array.from(simulation.firms.values());
    const gm = simulation.globalMarket;

    let totalRevenue = 0, totalProfit = 0, totalEmployees = 0, totalMonthlySalary = 0;
    let miningCount = 0, farmCount = 0, mfgCount = 0, retailCount = 0, loggingCount = 0;
    let totalOrdersWon = 0;

    firms.forEach(f => {
        totalRevenue += f.revenue || 0;
        totalProfit += getFirmProfit(f);
        totalEmployees += f.totalEmployees || 0;
        totalMonthlySalary += getFirmMonthlySalary(f);

        switch (f.type) {
            case 'MINING': miningCount++; break;
            case 'LOGGING': loggingCount++; break;
            case 'FARM': farmCount++; break;
            case 'MANUFACTURING': mfgCount++; break;
            case 'RETAIL': retailCount++; break;
        }

        // Count orders won
        if (gm) {
            const pendingOrders = (gm.pendingOrders || []).filter(o => o.winningBid?.firmId === f.id);
            const completedOrders = (gm.completedOrders || []).filter(o => o.winningBid?.firmId === f.id);
            totalOrdersWon += pendingOrders.length + completedOrders.length;
        }
    });

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-label">Total Revenue</span>
                <span class="stat-value ${moneyClass(totalRevenue)}">${formatCurrencyFull(totalRevenue)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Profit</span>
                <span class="stat-value ${moneyClass(totalProfit)}">${formatCurrencyFull(totalProfit)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Employees</span>
                <span class="stat-value">${formatNumber(totalEmployees)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Monthly Payroll</span>
                <span class="stat-value">${formatCurrency(totalMonthlySalary)}</span>
            </div>
        </div>
        <div class="firm-type-breakdown">
            <span class="type-count mining">Mining: ${miningCount}</span>
            <span class="type-count logging">Logging: ${loggingCount}</span>
            <span class="type-count farm">Farms: ${farmCount}</span>
            <span class="type-count manufacturing">Manufacturing: ${mfgCount}</span>
            <span class="type-count retail">Retail: ${retailCount}</span>
        </div>
    `;
}

// Get firm display name with corporation prefix for this page
function getCorpFirmDisplayName(firm) {
    const corp = simulation.corporations.find(c => c.id === firm.corporationId);
    const corpName = corp?.name || 'Independent';
    const firmName = getFirmDisplayName(firm);
    return `${corpName} - ${firmName}`;
}

function getFirmOrdersCount(firmId) {
    const gm = simulation.globalMarket;
    if (!gm) return 0;

    const pending = (gm.pendingOrders || []).filter(o => o.winningBid?.firmId === firmId).length;
    const completed = (gm.completedOrders || []).filter(o => o.winningBid?.firmId === firmId).length;
    return pending + completed;
}

// Get real-time profit (uses getCurrentProfit if available)
function getFirmProfit(firm) {
    if (typeof firm.getCurrentProfit === 'function') {
        return firm.getCurrentProfit();
    }
    return firm.profit || 0;
}

// Get monthly salary for a firm
function getFirmMonthlySalary(firm) {
    if (typeof firm.calculateLaborCosts === 'function') {
        return firm.calculateLaborCosts();
    }
    return firm.totalLaborCost || 0;
}

function renderFirms() {
    const container = document.getElementById('all-firms-grid');
    if (!container) return;

    let firms = Array.from(simulation.firms.values());

    // Filter by type
    if (typeFilter !== 'all') {
        firms = firms.filter(f => f.type === typeFilter);
    }

    // Filter by corporation
    if (corpFilter !== 'all') {
        firms = firms.filter(f => f.corporationId === parseInt(corpFilter));
    }

    // Search
    if (searchTerm) {
        firms = firms.filter(f => {
            const name = getFirmDisplayName(f).toLowerCase();
            const city = (f.city?.name || '').toLowerCase();
            return name.includes(searchTerm) || city.includes(searchTerm);
        });
    }

    // Sort
    const [field, dir] = currentSort.split('-');
    firms.sort((a, b) => {
        let aVal, bVal;
        switch (field) {
            case 'profit': aVal = getFirmProfit(a); bVal = getFirmProfit(b); break;
            case 'revenue': aVal = a.revenue || 0; bVal = b.revenue || 0; break;
            case 'employees': aVal = a.totalEmployees || 0; bVal = b.totalEmployees || 0; break;
            case 'orders': aVal = getFirmOrdersCount(a.id); bVal = getFirmOrdersCount(b.id); break;
            case 'name': aVal = getFirmDisplayName(a); bVal = getFirmDisplayName(b); break;
            default: aVal = 0; bVal = 0;
        }
        if (dir === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });

    if (firms.length === 0) {
        container.innerHTML = '<p class="empty-state">No firms match the selected filters</p>';
        return;
    }

    container.innerHTML = firms.map(firm => {
        const ordersCount = getFirmOrdersCount(firm.id);
        const corp = simulation.corporations.find(c => c.id === firm.corporationId);

        return `
            <div class="firm-card" data-firm-id="${firm.id}">
                <div class="firm-card-header">
                    <span class="firm-name">${getFirmDisplayName(firm)}</span>
                    <span class="firm-type-badge ${firm.type.toLowerCase()}">${firm.type}</span>
                </div>
                <div class="firm-card-location">
                    <span class="firm-city">${firm.city?.name || 'Unknown'}</span>
                    <span class="firm-corp"><span class="corp-abbr">${corp?.abbreviation || '---'}</span> ${corp?.name || 'Independent'}</span>
                </div>
                <div class="firm-card-stats">
                    <div class="stat-item">
                        <span class="stat-label">Revenue</span>
                        <span class="stat-value ${moneyClass(firm.revenue || 0)}">${formatCurrencyFull(firm.revenue || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Profit</span>
                        <span class="stat-value ${moneyClass(getFirmProfit(firm))}">${formatCurrencyFull(getFirmProfit(firm))}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Employees</span>
                        <span class="stat-value">${formatNumber(firm.totalEmployees || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Monthly Salary</span>
                        <span class="stat-value">${formatCurrency(getFirmMonthlySalary(firm))}</span>
                    </div>
                </div>
                ${ordersCount > 0 ? `
                    <div class="firm-orders-badge">
                        <span class="orders-won-badge">${ordersCount} Orders Won</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.firm-card').forEach(card => {
        card.addEventListener('click', () => {
            const firmId = card.dataset.firmId;
            window.history.pushState({}, '', `firms.html?id=${firmId}`);
            showFirmDetail(firmId);
        });
    });
}

function showFirmDetail(firmId) {
    // Try to get firm by string ID first, then by parsed int
    let firm = simulation.firms.get(firmId);
    if (!firm) {
        firm = simulation.firms.get(parseInt(firmId));
    }

    // If firm not found, show error and return to list
    if (!firm) {
        // Show error message in the detail view
        document.getElementById('firms-list-view').style.display = 'none';
        document.getElementById('firm-detail-view').classList.remove('hidden');
        document.getElementById('firm-detail-name').textContent = 'Firm Not Found';
        document.getElementById('firm-type-badge').textContent = '';
        document.getElementById('firm-type-badge').className = 'firm-type-badge';

        // Clear all detail sections and show error
        const errorMsg = `
            <div class="firm-not-found-error">
                <p>The firm with ID "${firmId}" was not found.</p>
                <p>This can happen if:</p>
                <ul>
                    <li>The simulation was restarted (firm IDs change on each page load)</li>
                    <li>The firm ID in the URL is invalid</li>
                </ul>
                <p><a href="firms.html" class="btn btn-primary">← Back to Firms List</a></p>
            </div>
        `;
        document.getElementById('firm-overview-stats').innerHTML = errorMsg;
        document.getElementById('firm-financial-stats').innerHTML = '';
        document.getElementById('firm-production-stats').innerHTML = '';
        document.getElementById('firm-specific-details').innerHTML = '';
        document.getElementById('firm-products-info').innerHTML = '';
        document.getElementById('firm-labor-stats').innerHTML = '';
        document.getElementById('firm-bids-summary').innerHTML = '';
        document.getElementById('firm-orders-won-list').innerHTML = '';
        document.getElementById('firm-active-bids-list').innerHTML = '';
        document.getElementById('firm-completed-orders-list').innerHTML = '';
        document.getElementById('firm-sales-tbody').innerHTML = '';
        document.getElementById('firm-purchases-tbody').innerHTML = '';
        return;
    }

    currentFirmId = firmId;

    document.getElementById('firms-list-view').style.display = 'none';
    document.getElementById('firm-detail-view').classList.remove('hidden');

    const corp = simulation.corporations.find(c => c.id === firm.corporationId);

    // Header
    document.getElementById('firm-detail-name').textContent = getFirmDisplayName(firm);
    document.getElementById('firm-type-badge').textContent = firm.type;
    document.getElementById('firm-type-badge').className = `firm-type-badge large ${firm.type.toLowerCase()}`;

    // Overview
    document.getElementById('firm-overview-stats').innerHTML = `
        <div class="firm-overview-grid">
            <div class="firm-overview-item">
                <div class="firm-overview-label">Corporation</div>
                <div class="firm-overview-value">
                    <span class="corp-abbr">${corp?.abbreviation || '---'}</span>
                    <a href="corporations.html?id=${firm.corporationId}">${corp?.name || 'Independent'}</a>
                </div>
            </div>
            <div class="firm-overview-item">
                <div class="firm-overview-label">Location</div>
                <div class="firm-overview-value">
                    <a href="cities.html?id=${firm.city?.id}">${firm.city?.name || 'Unknown'}</a>
                </div>
            </div>
            <div class="firm-overview-item">
                <div class="firm-overview-label">Country</div>
                <div class="firm-overview-value">${firm.city?.country?.name || 'Unknown'}</div>
            </div>
            <div class="firm-overview-item">
                <div class="firm-overview-label">Technology Level</div>
                <div class="firm-overview-value">Level ${firm.technologyLevel || 1}</div>
            </div>
        </div>
    `;

    // Financials
    document.getElementById('firm-financial-stats').innerHTML = `
        <div class="financial-detail-grid">
            <div class="financial-detail-item">
                <div class="financial-detail-value ${moneyClass(firm.cash || 0)}">${formatCurrencyFull(firm.cash || 0)}</div>
                <div class="financial-detail-label">Cash</div>
            </div>
            <div class="financial-detail-item">
                <div class="financial-detail-value ${moneyClass(firm.revenue || 0)}">${formatCurrencyFull(firm.revenue || 0)}</div>
                <div class="financial-detail-label">Revenue</div>
            </div>
            <div class="financial-detail-item">
                <div class="financial-detail-value ${moneyClass(getFirmProfit(firm))}">${formatCurrencyFull(getFirmProfit(firm))}</div>
                <div class="financial-detail-label">Profit</div>
            </div>
        </div>
    `;

    // Production
    renderProductionStats(firm);

    // Type-specific details
    renderSpecificDetails(firm);

    // Products info
    renderProductsInfo(firm);

    // Labor
    document.getElementById('firm-employees-count').textContent = `${firm.totalEmployees || 0} Employees`;
    renderLaborStats(firm);

    // Orders & Bids
    renderBidsAndOrders(firm);

    // Transactions
    renderSales(firm);
    renderPurchases(firm);
}

function renderProductionStats(firm) {
    const container = document.getElementById('firm-production-stats');
    if (!container) return;
    let html = '<div class="production-stats-grid">';

    switch (firm.type) {
        case 'MINING':
            html += `
                <div class="production-stat">
                    <div class="production-stat-value">${firm.actualExtractionRate?.toFixed(2) || 0}</div>
                    <div class="production-stat-label">Extraction/Hour</div>
                </div>
                <div class="production-stat">
                    <div class="production-stat-value">${firm.inventory?.quantity?.toFixed(0) || 0}</div>
                    <div class="production-stat-label">Inventory</div>
                </div>
            `;
            break;
        case 'LOGGING':
            html += `
                <div class="production-stat">
                    <div class="production-stat-value">${firm.actualHarvestRate?.toFixed(2) || 0}</div>
                    <div class="production-stat-label">Harvest/Hour (m³)</div>
                </div>
                <div class="production-stat">
                    <div class="production-stat-value">${firm.inventory?.quantity?.toFixed(0) || 0}</div>
                    <div class="production-stat-label">Inventory</div>
                </div>
            `;
            break;
        case 'FARM':
            html += `
                <div class="production-stat">
                    <div class="production-stat-value">${firm.actualProductionRate?.toFixed(2) || 0}</div>
                    <div class="production-stat-label">Output/Hour</div>
                </div>
                <div class="production-stat">
                    <div class="production-stat-value">${firm.inventory?.quantity?.toFixed(0) || 0}</div>
                    <div class="production-stat-label">Inventory</div>
                </div>
            `;
            break;
        case 'MANUFACTURING':
            html += `
                <div class="production-stat">
                    <div class="production-stat-value">${firm.actualProductionRate?.toFixed(2) || 0}</div>
                    <div class="production-stat-label">Production/Hour</div>
                </div>
                <div class="production-stat">
                    <div class="production-stat-value">${firm.finishedGoodsInventory?.quantity?.toFixed(0) || 0}</div>
                    <div class="production-stat-label">Finished Goods</div>
                </div>
            `;
            break;
        case 'RETAIL':
            const totalInventory = firm.productInventory ?
                Array.from(firm.productInventory.values()).reduce((sum, inv) => sum + (inv.quantity || 0), 0) : 0;
            html += `
                <div class="production-stat">
                    <div class="production-stat-value">${totalInventory.toFixed(0)}</div>
                    <div class="production-stat-label">Total Inventory</div>
                </div>
                <div class="production-stat">
                    <div class="production-stat-value">${firm.productInventory?.size || 0}</div>
                    <div class="production-stat-label">Product Types</div>
                </div>
            `;
            break;
        default:
            html += `
                <div class="production-stat">
                    <div class="production-stat-value">${firm.inventory?.quantity?.toFixed(0) || 0}</div>
                    <div class="production-stat-label">Inventory</div>
                </div>
            `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderSpecificDetails(firm) {
    const titleEl = document.getElementById('firm-specific-title');
    const container = document.getElementById('firm-specific-details');

    switch (firm.type) {
        case 'MINING':
            titleEl.textContent = 'Mining Operations';
            container.innerHTML = `
                <div class="specific-details-grid">
                    <div class="detail-item"><span class="label">Resource:</span><span class="value">${firm.resourceType}</span></div>
                    <div class="detail-item"><span class="label">Mine Type:</span><span class="value">${firm.mineType}</span></div>
                    <div class="detail-item"><span class="label">Reserves:</span><span class="value">${((firm.remainingReserves / firm.totalReserves) * 100).toFixed(1)}%</span></div>
                    <div class="detail-item"><span class="label">Equipment Level:</span><span class="value">${firm.equipmentLevel}</span></div>
                </div>
            `;
            break;
        case 'MANUFACTURING':
            titleEl.textContent = 'Manufacturing Details';
            container.innerHTML = `
                <div class="specific-details-grid">
                    <div class="detail-item"><span class="label">Product:</span><span class="value">${firm.product?.name || 'Unknown'}</span></div>
                    <div class="detail-item"><span class="label">Tier:</span><span class="value">${firm.product?.tier || 'Unknown'}</span></div>
                    <div class="detail-item"><span class="label">Defect Rate:</span><span class="value">${(firm.defectRate * 100)?.toFixed(1)}%</span></div>
                    <div class="detail-item"><span class="label">Capacity:</span><span class="value">${firm.productionCapacity?.toFixed(2) || 0}/hr</span></div>
                </div>
            `;
            break;
        default:
            titleEl.textContent = 'Details';
            container.innerHTML = '<p class="no-data">No additional details</p>';
    }
}

function renderProductsInfo(firm) {
    const container = document.getElementById('firm-products-info');

    if (firm.type === 'RETAIL' && firm.productInventory) {
        let html = '<div class="retail-inventory-grid">';
        firm.productInventory.forEach((inv, productId) => {
            const product = simulation.productRegistry?.getProduct(parseInt(productId));
            html += `
                <div class="inventory-item">
                    <span class="inv-name">${product?.name || inv.productName || productId}</span>
                    <span class="inv-qty">${inv.quantity} units</span>
                    <span class="inv-price">${formatCurrency(inv.retailPrice)}</span>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } else if (firm.type === 'MANUFACTURING') {
        let inputInventoryHtml = '';
        if (firm.rawMaterialInventory && firm.rawMaterialInventory.size > 0) {
            inputInventoryHtml = '<div class="input-inventory"><div class="input-inventory-header">Input Materials</div>';
            firm.rawMaterialInventory.forEach((inv, materialName) => {
                const pct = inv.capacity > 0 ? ((inv.quantity / inv.capacity) * 100).toFixed(2) : 0;
                const lowStock = inv.quantity < inv.minRequired;
                inputInventoryHtml += `
                    <div class="inventory-item ${lowStock ? 'low-stock' : ''}">
                        <span class="inv-name">${materialName}</span>
                        <span class="inv-qty">${inv.quantity?.toFixed(2) || 0} / ${inv.capacity?.toFixed(2) || 0}</span>
                        <span class="inv-pct">${pct}%</span>
                    </div>
                `;
            });
            inputInventoryHtml += '</div>';
        }

        const finishedQty = firm.finishedGoodsInventory?.quantity?.toFixed(2) || 0;
        const finishedCap = firm.finishedGoodsInventory?.storageCapacity?.toFixed(2) || 0;
        const finishedPct = finishedCap > 0 ? ((firm.finishedGoodsInventory?.quantity / firm.finishedGoodsInventory?.storageCapacity) * 100).toFixed(2) : 0;

        container.innerHTML = `
            <div class="product-info">
                <div class="product-header">${firm.product?.name || 'Unknown Product'}</div>
                <div class="product-details">
                    <span>Base Price: ${formatCurrency(firm.product?.basePrice || 0)}</span>
                    <span>Production Rate: ${firm.productionLine?.outputPerHour?.toFixed(2) || 0}/hr</span>
                </div>
                <div class="finished-inventory">
                    <div class="finished-inventory-header">Finished Goods</div>
                    <div class="inventory-item">
                        <span class="inv-name">${firm.product?.name || 'Product'}</span>
                        <span class="inv-qty">${finishedQty} / ${finishedCap}</span>
                        <span class="inv-pct">${finishedPct}%</span>
                    </div>
                </div>
                ${inputInventoryHtml}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="product-info">
                <span>Inventory: ${firm.inventory?.quantity?.toFixed(0) || 0} units</span>
                <span>Quality: ${firm.inventory?.quality?.toFixed(0) || 0}%</span>
            </div>
        `;
    }
}

function renderLaborStats(firm) {
    const container = document.getElementById('firm-labor-stats');
    const monthlySalary = getFirmMonthlySalary(firm);

    container.innerHTML = `
        <div class="labor-stats-grid">
            <div class="labor-stat">
                <span class="label">Total Employees</span>
                <span class="value">${firm.totalEmployees || 0}</span>
            </div>
            <div class="labor-stat">
                <span class="label">Monthly Salary</span>
                <span class="value">${formatCurrency(monthlySalary)}</span>
            </div>
            <div class="labor-stat">
                <span class="label">Avg per Employee</span>
                <span class="value">${formatCurrency(firm.totalEmployees > 0 ? monthlySalary / firm.totalEmployees : 0)}</span>
            </div>
        </div>
    `;
}

function renderBidsAndOrders(firm) {
    const gm = simulation.globalMarket;
    if (!gm) return;

    const firmId = firm.id;

    // Find orders won
    const ordersWon = (gm.pendingOrders || []).filter(o =>
        o.status === 'AWARDED' && o.winningBid?.firmId === firmId
    );

    const completedOrders = (gm.completedOrders || []).filter(o =>
        o.winningBid?.firmId === firmId
    );

    // Find active bids
    const activeBids = [];
    (gm.biddingOrders || []).forEach(order => {
        if (order.status === 'BIDDING' && order.bids) {
            const firmBid = order.bids.find(b => b.firmId === firmId);
            if (firmBid) activeBids.push({ order, bid: firmBid });
        }
    });

    const totalOrders = ordersWon.length + completedOrders.length;
    const totalRevenue = [...ordersWon, ...completedOrders].reduce((sum, o) => sum + (o.winningBid?.totalBidValue || 0), 0);

    document.getElementById('firm-orders-count').textContent = `${totalOrders} Orders`;

    document.getElementById('firm-bids-summary').innerHTML = `
        <div class="bids-summary-grid">
            <div class="bids-summary-stat">
                <span class="bids-stat-value">${totalOrders}</span>
                <span class="bids-stat-label">Total Won</span>
            </div>
            <div class="bids-summary-stat">
                <span class="bids-stat-value">${ordersWon.length}</span>
                <span class="bids-stat-label">Pending</span>
            </div>
            <div class="bids-summary-stat">
                <span class="bids-stat-value">${completedOrders.length}</span>
                <span class="bids-stat-label">Delivered</span>
            </div>
            <div class="bids-summary-stat">
                <span class="bids-stat-value">${activeBids.length}</span>
                <span class="bids-stat-label">Active Bids</span>
            </div>
            <div class="bids-summary-stat">
                <span class="bids-stat-value ${moneyClass(totalRevenue)}">${formatCurrencyFull(totalRevenue)}</span>
                <span class="bids-stat-label">Revenue</span>
            </div>
        </div>
    `;

    // Orders won list
    const wonList = document.getElementById('firm-orders-won-list');
    wonList.innerHTML = ordersWon.length === 0 ? '<p class="no-data">No pending orders</p>' :
        ordersWon.map(o => `
            <div class="firm-bid-item order-won">
                <div class="bid-item-left">
                    <span class="bid-product">${o.productName}</span>
                    <span class="bid-details">${o.quantity} units</span>
                </div>
                <div class="bid-item-right">
                    <span class="bid-value">${formatCurrency(o.winningBid?.totalBidValue || 0)}</span>
                    <span class="bid-status status-awarded">Pending</span>
                </div>
            </div>
        `).join('');

    // Active bids list
    const bidsList = document.getElementById('firm-active-bids-list');
    bidsList.innerHTML = activeBids.length === 0 ? '<p class="no-data">No active bids</p>' :
        activeBids.map(({ order, bid }) => `
            <div class="firm-bid-item active-bid">
                <div class="bid-item-left">
                    <span class="bid-product">${order.productName}</span>
                    <span class="bid-details">${order.quantity} units • ${order.bids?.length || 0} bids</span>
                </div>
                <div class="bid-item-right">
                    <span class="bid-value">${formatCurrency(bid.totalBidValue || 0)}</span>
                    <span class="bid-status status-bidding">Bidding</span>
                </div>
            </div>
        `).join('');

    // Completed list
    const completedList = document.getElementById('firm-completed-orders-list');
    completedList.innerHTML = completedOrders.length === 0 ? '<p class="no-data">No completed orders</p>' :
        completedOrders.slice(-10).reverse().map(o => `
            <div class="firm-bid-item order-completed">
                <div class="bid-item-left">
                    <span class="bid-product">${o.productName}</span>
                    <span class="bid-details">${o.quantity} units</span>
                </div>
                <div class="bid-item-right">
                    <span class="bid-value">${formatCurrency(o.winningBid?.totalBidValue || 0)}</span>
                    <span class="bid-status status-delivered">Delivered</span>
                </div>
            </div>
        `).join('');
}

function renderSales(firm) {
    const tbody = document.getElementById('firm-sales-tbody');
    const transactions = simulation.transactionLog?.transactions || [];
    const sales = transactions.filter(t => t.seller?.id === firm.id).slice(-20).reverse();

    document.getElementById('firm-sales-count').textContent = `${sales.length} Sales`;

    tbody.innerHTML = sales.length === 0 ? '<tr><td colspan="6" class="no-data">No sales</td></tr>' :
        sales.map(t => {
            const productName = getProductName(t.productName || t.product || t.material);
            return `
            <tr>
                <td>${new Date(t.timestamp).toLocaleTimeString()}</td>
                <td>${t.buyer?.name || 'Unknown'}</td>
                <td>${productName}</td>
                <td>${t.quantity || '-'}</td>
                <td>${formatCurrency(t.unitPrice || 0)}</td>
                <td class="${moneyClass(t.totalRevenue || t.totalCost || 0)}">${formatCurrencyFull(t.totalRevenue || t.totalCost || 0)}</td>
            </tr>
        `}).join('');
}

// Helper to resolve product ID to name
function getProductName(productIdOrName) {
    if (!productIdOrName) return '-';
    // If it's already a string name, return it
    if (typeof productIdOrName === 'string' && isNaN(productIdOrName)) {
        return productIdOrName;
    }
    // Try to look up from product registry
    const product = simulation.productRegistry?.getProduct(productIdOrName);
    if (product) {
        return product.name;
    }
    // Fallback to the value itself
    return productIdOrName;
}

function renderPurchases(firm) {
    const tbody = document.getElementById('firm-purchases-tbody');
    const transactionLog = simulation.transactionLog;

    // Get all purchase transactions for this firm
    // Check both main transactions array and globalMarketOrders for completeness
    const allTransactions = transactionLog?.transactions || [];
    const globalOrders = transactionLog?.globalMarketOrders || [];

    // Filter by buyer ID - convert to string for safe comparison
    const firmIdStr = String(firm.id);
    const purchases = allTransactions
        .filter(t => String(t.buyer?.id) === firmIdStr)
        .slice(-20)
        .reverse();

    // Also check for any global market orders not in main list
    const gmPurchases = globalOrders
        .filter(o => String(o.buyer?.id) === firmIdStr && !purchases.some(p => p.id === o.id))
        .slice(-10);

    const allPurchases = [...purchases, ...gmPurchases]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20);

    document.getElementById('firm-purchases-count').textContent = `${allPurchases.length} Purchases`;

    tbody.innerHTML = allPurchases.length === 0 ? '<tr><td colspan="6" class="no-data">No purchases</td></tr>' :
        allPurchases.map(t => {
            const productName = getProductName(t.productName || t.product || t.material);
            const sellerName = t.seller?.name || (t.type === 'GLOBAL_MARKET' ? 'Global Market' : 'Unknown');
            const statusBadge = t.status && t.status !== 'COMPLETED' && t.status !== 'DELIVERED'
                ? `<span class="status-badge status-${t.status.toLowerCase().replace(/_/g, '-')}">${t.status.replace(/_/g, ' ')}</span>`
                : '';
            return `
            <tr>
                <td>${new Date(t.timestamp).toLocaleTimeString()}</td>
                <td>${sellerName} ${statusBadge}</td>
                <td>${productName}</td>
                <td>${t.quantity || '-'}</td>
                <td>${formatCurrency(t.unitPrice || 0)}</td>
                <td class="${moneyClass(t.totalCost || 0)}">${formatCurrency(t.totalCost || 0)}</td>
            </tr>
        `}).join('');
}

init();
