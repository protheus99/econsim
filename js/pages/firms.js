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

    let totalRevenue = 0, totalProfit = 0, totalEmployees = 0, totalMonthlySalary = 0;
    let miningCount = 0, farmCount = 0, mfgCount = 0, retailCount = 0, loggingCount = 0;

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
    // Count active contracts for this firm
    const contractManager = simulation.purchaseManager?.contractManager;
    if (!contractManager) return 0;

    const contracts = contractManager.getActiveContracts?.() || [];
    return contracts.filter(c => c.supplierId === firmId || c.buyerId === firmId).length;
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

    // Contracts
    renderContracts(firm);

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

    // Get production status info (throttle, contracts, expiration)
    const productionStatus = getProductionStatus(firm);

    // Helper to get lot info
    const getLotInfo = (f) => {
        if (!f.lotInventory) return null;
        const status = f.lotInventory.getStatus ? f.lotInventory.getStatus() : null;
        return {
            lotCount: status?.availableLots || f.lotInventory.lots?.size || 0,
            totalQty: status?.totalQuantity || 0,
            buffer: f.accumulatedProduction || 0,
            strategy: status?.saleStrategy || f.lotInventory.saleStrategy || 'FIFO',
            lotSize: f.lotSize || 0
        };
    };

    switch (firm.type) {
        case 'MINING':
            const miningLots = getLotInfo(firm);
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
            if (miningLots) {
                html += `
                    <div class="production-stat lot-stat">
                        <div class="production-stat-value">${miningLots.lotCount}</div>
                        <div class="production-stat-label">Lots Available</div>
                    </div>
                    <div class="production-stat lot-stat">
                        <div class="production-stat-value">${miningLots.buffer?.toFixed(1) || 0}</div>
                        <div class="production-stat-label">Buffer (next lot at ${miningLots.lotSize})</div>
                    </div>
                `;
            }
            break;
        case 'LOGGING':
            const loggingLots = getLotInfo(firm);
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
            if (loggingLots) {
                html += `
                    <div class="production-stat lot-stat">
                        <div class="production-stat-value">${loggingLots.lotCount}</div>
                        <div class="production-stat-label">Lots Available</div>
                    </div>
                    <div class="production-stat lot-stat">
                        <div class="production-stat-value">${loggingLots.buffer?.toFixed(1) || 0}</div>
                        <div class="production-stat-label">Buffer (next lot at ${loggingLots.lotSize})</div>
                    </div>
                `;
            }
            break;
        case 'FARM':
            const farmLots = getLotInfo(firm);
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
            if (farmLots) {
                html += `
                    <div class="production-stat lot-stat">
                        <div class="production-stat-value">${farmLots.lotCount}</div>
                        <div class="production-stat-label">Lots Available</div>
                    </div>
                    <div class="production-stat lot-stat">
                        <div class="production-stat-value">${farmLots.buffer?.toFixed(1) || 0}</div>
                        <div class="production-stat-label">Buffer (next lot at ${farmLots.lotSize})</div>
                    </div>
                `;
            }
            break;
        case 'MANUFACTURING':
            const mfgLots = getLotInfo(firm); // All manufacturers use lots now
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
            if (mfgLots) {
                html += `
                    <div class="production-stat lot-stat">
                        <div class="production-stat-value">${mfgLots.lotCount}</div>
                        <div class="production-stat-label">Lots Available</div>
                    </div>
                    <div class="production-stat lot-stat">
                        <div class="production-stat-value">${mfgLots.buffer?.toFixed(1) || 0}</div>
                        <div class="production-stat-label">Buffer (next lot at ${mfgLots.lotSize})</div>
                    </div>
                `;
            }
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

    // Add production status section for producers
    if (productionStatus && (firm.type === 'FARM' || firm.type === 'MANUFACTURING')) {
        html += renderProductionStatusSection(productionStatus);
    }

    container.innerHTML = html;
}

/**
 * Get next delivery ETA for a firm (incoming or outgoing)
 */
function getNextDeliveryETA(firmId) {
    const pendingDeliveries = simulation.purchaseManager?.pendingDeliveries || [];
    const currentHour = simulation.clock?.totalHours || 0;

    // Find deliveries where this firm is buyer (incoming) or seller (outgoing)
    const firmDeliveries = pendingDeliveries.filter(
        d => d.buyer?.id === firmId || d.seller?.id === firmId
    );

    if (firmDeliveries.length === 0) {
        return { hasDelivery: false };
    }

    // Sort by arrival time and get the soonest
    firmDeliveries.sort((a, b) => a.arrivalHour - b.arrivalHour);
    const next = firmDeliveries[0];

    const hoursRemaining = Math.max(0, next.arrivalHour - currentHour);
    const isIncoming = next.buyer?.id === firmId;

    // Format ETA text
    let etaText;
    let etaClass;
    if (hoursRemaining < 1) {
        etaText = 'Arriving soon';
        etaClass = 'eta-arriving';
    } else if (hoursRemaining < 24) {
        etaText = `${Math.ceil(hoursRemaining)}h`;
        etaClass = 'eta-hours';
    } else {
        const days = Math.floor(hoursRemaining / 24);
        const hours = Math.ceil(hoursRemaining % 24);
        etaText = `${days}d ${hours}h`;
        etaClass = 'eta-days';
    }

    return {
        hasDelivery: true,
        productName: next.productName,
        quantity: Math.floor(next.quantity),
        etaText,
        etaClass,
        hoursRemaining,
        isIncoming,
        direction: isIncoming ? 'Incoming' : 'Outgoing',
        totalDeliveries: firmDeliveries.length
    };
}

/**
 * Get production status including throttle, contracts, and expiration info
 */
function getProductionStatus(firm) {
    if (firm.type !== 'FARM' && firm.type !== 'MANUFACTURING') {
        return null;
    }

    const contractManager = simulation.purchaseManager?.contractManager;
    const productName = firm.product?.name || firm.livestockType || firm.cropType || firm.resourceType;

    // Get current inventory
    let currentInventory = 0;
    if (firm.lotInventory) {
        currentInventory = firm.lotInventory.getAvailableQuantity?.(productName) || 0;
    }
    if (currentInventory === 0) {
        currentInventory = firm.finishedGoodsInventory?.quantity || firm.inventory?.quantity || 0;
    }

    // Check perishability
    let isPerishable = false;
    let shelfLifeDays = 30;

    // Try to detect from lot config or product
    if (firm.lotConfig?.perishable) {
        isPerishable = true;
        shelfLifeDays = firm.lotConfig.shelfLifeDays || 7;
    } else if (firm.lotInventory?.saleStrategy === 'EXPIRING_SOON') {
        isPerishable = true;
        shelfLifeDays = 7; // default for perishables
    }

    // Get contract info
    let contractInfo = { hasContracts: false, dailyDemand: 0, weeklyDemand: 0, contractCount: 0 };
    let throttleInfo = { shouldThrottle: false, reason: 'UNKNOWN', throttlePercent: 0 };

    if (contractManager) {
        contractInfo = contractManager.getContractedDemandForSupplier?.(firm.id, productName) || contractInfo;
        throttleInfo = contractManager.shouldThrottleProduction?.(
            firm, productName, currentInventory, isPerishable, shelfLifeDays
        ) || throttleInfo;
    }

    // Calculate days of inventory
    const daysOfInventory = contractInfo.dailyDemand > 0
        ? currentInventory / contractInfo.dailyDemand
        : (currentInventory > 0 ? 999 : 0);

    // Expiration risk for perishables
    let expirationRisk = 'none';
    if (isPerishable) {
        if (daysOfInventory > shelfLifeDays * 0.7) {
            expirationRisk = 'high';
        } else if (daysOfInventory > shelfLifeDays * 0.5) {
            expirationRisk = 'medium';
        } else if (daysOfInventory > shelfLifeDays * 0.3) {
            expirationRisk = 'low';
        }
    }

    return {
        productName,
        currentInventory,
        isPerishable,
        shelfLifeDays,
        contractInfo,
        throttleInfo,
        daysOfInventory,
        expirationRisk
    };
}

/**
 * Render the production status section HTML
 */
function renderProductionStatusSection(status) {
    const { productName, currentInventory, isPerishable, shelfLifeDays, contractInfo, throttleInfo, daysOfInventory, expirationRisk } = status;

    // Throttle status
    const throttleClass = throttleInfo.shouldThrottle
        ? (throttleInfo.throttlePercent >= 75 ? 'throttle-severe' : 'throttle-active')
        : 'throttle-none';
    const throttleLabel = throttleInfo.shouldThrottle
        ? `Throttled ${throttleInfo.throttlePercent}%`
        : 'Normal';
    const throttleReason = throttleInfo.reason?.replace(/_/g, ' ') || '';

    // Contract coverage
    const coverageClass = contractInfo.hasContracts ? 'coverage-good' : 'coverage-none';
    const coverageLabel = contractInfo.hasContracts
        ? `${contractInfo.contractCount} contract${contractInfo.contractCount > 1 ? 's' : ''}`
        : 'No contracts';

    // Expiration risk
    const expirationClass = `expiration-${expirationRisk}`;
    const expirationLabel = isPerishable
        ? (expirationRisk === 'high' ? 'High Risk' :
           expirationRisk === 'medium' ? 'Medium Risk' :
           expirationRisk === 'low' ? 'Low Risk' : 'Safe')
        : 'Non-perishable';

    let html = `
        <div class="production-status-section">
            <div class="production-status-header">Production Status</div>
            <div class="production-status-grid">
                <div class="status-item">
                    <div class="status-label">Throttle Status</div>
                    <div class="status-value ${throttleClass}">${throttleLabel}</div>
                    ${throttleInfo.shouldThrottle ? `<div class="status-reason">${throttleReason}</div>` : ''}
                </div>
                <div class="status-item">
                    <div class="status-label">Contract Coverage</div>
                    <div class="status-value ${coverageClass}">${coverageLabel}</div>
                    ${contractInfo.hasContracts ? `
                        <div class="status-detail">
                            <span>${contractInfo.dailyDemand.toFixed(0)}/day</span>
                            <span>${contractInfo.weeklyDemand.toFixed(0)}/week</span>
                        </div>
                    ` : '<div class="status-detail">Selling to spot market only</div>'}
                </div>
                <div class="status-item">
                    <div class="status-label">Inventory Coverage</div>
                    <div class="status-value">${daysOfInventory < 999 ? daysOfInventory.toFixed(1) + ' days' : 'N/A'}</div>
                    <div class="status-detail">${currentInventory.toFixed(0)} units on hand</div>
                </div>
                <div class="status-item">
                    <div class="status-label">Expiration Risk</div>
                    <div class="status-value ${expirationClass}">${expirationLabel}</div>
                    ${isPerishable ? `<div class="status-detail">Shelf life: ${shelfLifeDays} days</div>` : ''}
                </div>
            </div>
        </div>
    `;

    return html;
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
            const necessity = product?.necessityIndex ?? 0.5;
            const necessityLabel = getNecessityLabel(necessity);
            html += `
                <div class="inventory-item">
                    <span class="inv-name">${product?.name || inv.productName || productId}</span>
                    <span class="inv-qty">${inv.quantity} units</span>
                    <span class="inv-price">${formatCurrency(inv.retailPrice)}</span>
                    <span class="inv-necessity ${necessityLabel.class}">${necessityLabel.text}</span>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } else if (firm.type === 'MANUFACTURING') {
        // Helper to find suppliers for a material, categorized by location
        const findSuppliers = (materialName, buyerCity, buyerCountry) => {
            const local = [];      // Same city
            const domestic = [];   // Same country, different city
            const international = []; // Different country

            simulation.firms.forEach(f => {
                let isSupplier = false;

                // Check primary producers
                if (f.type === 'MINING' && f.resourceType === materialName) {
                    isSupplier = true;
                } else if (f.type === 'LOGGING' && f.timberType === materialName) {
                    isSupplier = true;
                } else if (f.type === 'FARM' && (f.cropType === materialName || f.livestockType === materialName)) {
                    isSupplier = true;
                } else if (f.type === 'MANUFACTURING' && f.product?.name === materialName) {
                    isSupplier = true;
                }

                if (isSupplier) {
                    const supplierCity = f.city?.name;
                    const supplierCountry = f.city?.country?.name || f.country?.name;

                    if (supplierCity === buyerCity) {
                        local.push(f);
                    } else if (supplierCountry === buyerCountry) {
                        domestic.push(f);
                    } else {
                        international.push(f);
                    }
                }
            });

            return { local, domestic, international };
        };

        // Helper to render supplier links
        const renderSupplierLinks = (suppliers, maxShow = 3) => {
            if (suppliers.length === 0) return '';

            const links = suppliers.slice(0, maxShow).map(s => {
                const sName = getFirmDisplayName(s);
                const sCity = s.city?.name || 'Unknown';
                const sCountry = s.city?.country?.name || s.country?.name || '';
                const hasStock = s.type === 'MANUFACTURING'
                    ? (s.finishedGoodsInventory?.quantity || 0) > 0
                    : (s.inventory?.quantity || 0) > 0;
                const stockClass = hasStock ? 'has-stock' : 'no-stock';
                return `<a href="firms.html?id=${s.id}" class="supplier-link ${stockClass}" title="${sCity}, ${sCountry}">${sName}</a>`;
            }).join(', ');

            const moreCount = suppliers.length > maxShow ? ` <span class="more-suppliers">+${suppliers.length - maxShow}</span>` : '';
            return links + moreCount;
        };

        const buyerCity = firm.city?.name;
        const buyerCountry = firm.city?.country?.name || firm.country?.name;

        let inputInventoryHtml = '';
        if (firm.rawMaterialInventory && firm.rawMaterialInventory.size > 0) {
            inputInventoryHtml = '<div class="input-inventory"><div class="input-inventory-header">Input Materials & Suppliers</div>';
            firm.rawMaterialInventory.forEach((inv, materialName) => {
                const pct = inv.capacity > 0 ? ((inv.quantity / inv.capacity) * 100).toFixed(2) : 0;
                const lowStock = inv.quantity < inv.minRequired;
                const inputProduct = simulation.productRegistry?.getProductByName(materialName);
                const inputNecessity = inputProduct?.necessityIndex ?? 0.5;
                const inputNecessityLabel = getNecessityLabel(inputNecessity);

                // Find suppliers for this material categorized by location
                const suppliers = findSuppliers(materialName, buyerCity, buyerCountry);
                const totalSuppliers = suppliers.local.length + suppliers.domestic.length + suppliers.international.length;

                let suppliersHtml = '';
                if (totalSuppliers > 0) {
                    let supplierSections = [];

                    if (suppliers.local.length > 0) {
                        supplierSections.push(`<span class="supplier-group"><span class="supplier-label local">Local:</span> ${renderSupplierLinks(suppliers.local, 3)}</span>`);
                    }
                    if (suppliers.domestic.length > 0) {
                        supplierSections.push(`<span class="supplier-group"><span class="supplier-label domestic">Domestic:</span> ${renderSupplierLinks(suppliers.domestic, 3)}</span>`);
                    }
                    if (suppliers.international.length > 0) {
                        supplierSections.push(`<span class="supplier-group"><span class="supplier-label international">International:</span> ${renderSupplierLinks(suppliers.international, 3)}</span>`);
                    }

                    suppliersHtml = `<div class="inv-suppliers">${supplierSections.join(' ')}</div>`;
                } else {
                    suppliersHtml = `<div class="inv-suppliers no-suppliers">No suppliers found (Global Market only)</div>`;
                }

                inputInventoryHtml += `
                    <div class="inventory-item-expanded ${lowStock ? 'low-stock' : ''}">
                        <div class="inventory-item-main">
                            <span class="inv-name">${materialName}</span>
                            <span class="inv-qty">${inv.quantity?.toFixed(2) || 0} / ${inv.capacity?.toFixed(2) || 0}</span>
                            <span class="inv-pct">${pct}%</span>
                            <span class="inv-necessity ${inputNecessityLabel.class}">${inputNecessityLabel.text}</span>
                        </div>
                        ${suppliersHtml}
                    </div>
                `;
            });
            inputInventoryHtml += '</div>';
        }

        const finishedQty = firm.finishedGoodsInventory?.quantity?.toFixed(2) || 0;
        const finishedCap = firm.finishedGoodsInventory?.storageCapacity?.toFixed(2) || 0;
        const finishedPct = finishedCap > 0 ? ((firm.finishedGoodsInventory?.quantity / firm.finishedGoodsInventory?.storageCapacity) * 100).toFixed(2) : 0;
        const productNecessity = firm.product?.necessityIndex ?? 0.5;
        const productNecessityLabel = getNecessityLabel(productNecessity);

        // Get lot info for all manufacturers (both SEMI_RAW and MANUFACTURED use lots now)
        let lotInfoHtml = '';
        if (firm.lotInventory) {
            const lotStatus = firm.lotInventory.getStatus ? firm.lotInventory.getStatus() : null;
            const lotCount = lotStatus?.availableLots || firm.lotInventory.lots?.size || 0;
            const totalQty = lotStatus?.totalQuantity || 0;
            const strategy = lotStatus?.saleStrategy || firm.lotInventory.saleStrategy || 'FIFO';
            const buffer = firm.accumulatedProduction || 0;
            const lotSize = firm.lotSize || 0;
            const tierLabel = firm.isSemiRawProducer ? 'Semi-Raw' : 'Manufactured';

            const strategyLabels = {
                'FIFO': 'First In, First Out',
                'HIGHEST_QUALITY': 'Highest Quality First',
                'LOWEST_QUALITY': 'Lowest Quality First',
                'EXPIRING_SOON': 'Expiring Soon First'
            };

            lotInfoHtml = `
                <div class="lot-inventory-section">
                    <div class="lot-inventory-header">Lot Inventory (${tierLabel})</div>
                    <div class="lot-inventory-grid">
                        <div class="lot-info-item">
                            <span class="lot-label">Available Lots:</span>
                            <span class="lot-value">${lotCount}</span>
                        </div>
                        <div class="lot-info-item">
                            <span class="lot-label">Total in Lots:</span>
                            <span class="lot-value">${totalQty?.toFixed(0) || 0} ${firm.lotConfig?.unit || 'units'}</span>
                        </div>
                        <div class="lot-info-item">
                            <span class="lot-label">Lot Size:</span>
                            <span class="lot-value">${lotSize} ${firm.lotConfig?.unit || 'units'}</span>
                        </div>
                        <div class="lot-info-item">
                            <span class="lot-label">Buffer:</span>
                            <span class="lot-value">${buffer?.toFixed(1) || 0} ${firm.lotConfig?.unit || 'units'}</span>
                        </div>
                        <div class="lot-info-item">
                            <span class="lot-label">Sale Strategy:</span>
                            <span class="lot-value lot-strategy">${strategyLabels[strategy] || strategy}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="product-info">
                <div class="product-header">${firm.product?.name || 'Unknown Product'}</div>
                <div class="product-details">
                    <span>Base Price: ${formatCurrency(firm.product?.basePrice || 0)}</span>
                    <span>Production Rate: ${firm.productionLine?.outputPerHour?.toFixed(2) || 0}/hr</span>
                    <span class="product-necessity">Necessity: <span class="${productNecessityLabel.class}">${productNecessityLabel.text}</span></span>
                </div>
                <div class="finished-inventory">
                    <div class="finished-inventory-header">Finished Goods</div>
                    <div class="inventory-item">
                        <span class="inv-name">${firm.product?.name || 'Product'}</span>
                        <span class="inv-qty">${finishedQty} / ${finishedCap}</span>
                        <span class="inv-pct">${finishedPct}%</span>
                    </div>
                </div>
                ${lotInfoHtml}
                ${inputInventoryHtml}
            </div>
        `;
    } else {
        // Primary producers (MINING, LOGGING, FARM)
        const resourceName = firm.resourceType || firm.timberType || firm.cropType || firm.livestockType || 'Unknown';
        const product = simulation.productRegistry?.getProductByName(resourceName);
        const necessity = product?.necessityIndex ?? 0.5;
        const necessityLabel = getNecessityLabel(necessity);

        // Get lot information if available
        let lotInfoHtml = '';
        if (firm.lotInventory) {
            const lotStatus = firm.lotInventory.getStatus ? firm.lotInventory.getStatus() : null;
            const lotCount = lotStatus?.availableLots || firm.lotInventory.lots?.size || 0;
            const totalQty = lotStatus?.totalQuantity || 0;
            const strategy = lotStatus?.saleStrategy || firm.lotInventory.saleStrategy || 'FIFO';
            const buffer = firm.accumulatedProduction || 0;
            const lotSize = firm.lotSize || 0;

            // Get strategy label
            const strategyLabels = {
                'FIFO': 'First In, First Out',
                'HIGHEST_QUALITY': 'Highest Quality First',
                'LOWEST_QUALITY': 'Lowest Quality First',
                'EXPIRING_SOON': 'Expiring Soon First'
            };

            lotInfoHtml = `
                <div class="lot-inventory-section">
                    <div class="lot-inventory-header">Lot Inventory</div>
                    <div class="lot-inventory-grid">
                        <div class="lot-info-item">
                            <span class="lot-label">Available Lots:</span>
                            <span class="lot-value">${lotCount}</span>
                        </div>
                        <div class="lot-info-item">
                            <span class="lot-label">Total in Lots:</span>
                            <span class="lot-value">${totalQty?.toFixed(0) || 0} ${firm.lotConfig?.unit || 'units'}</span>
                        </div>
                        <div class="lot-info-item">
                            <span class="lot-label">Lot Size:</span>
                            <span class="lot-value">${lotSize} ${firm.lotConfig?.unit || 'units'}</span>
                        </div>
                        <div class="lot-info-item">
                            <span class="lot-label">Buffer:</span>
                            <span class="lot-value">${buffer?.toFixed(1) || 0} ${firm.lotConfig?.unit || 'units'}</span>
                        </div>
                        <div class="lot-info-item">
                            <span class="lot-label">Sale Strategy:</span>
                            <span class="lot-value lot-strategy">${strategyLabels[strategy] || strategy}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="product-info">
                <div class="product-header">${resourceName}</div>
                <div class="product-details">
                    <span>Inventory: ${firm.inventory?.quantity?.toFixed(0) || 0} units</span>
                    <span>Quality: ${firm.inventory?.quality?.toFixed(0) || 0}%</span>
                    <span class="product-necessity">Necessity: <span class="${necessityLabel.class}">${necessityLabel.text}</span></span>
                </div>
                ${lotInfoHtml}
            </div>
        `;
    }
}

// Helper to convert necessityIndex to human-readable label
function getNecessityLabel(necessityIndex) {
    if (necessityIndex >= 0.85) return { text: 'Essential', class: 'necessity-essential' };
    if (necessityIndex >= 0.7) return { text: 'High', class: 'necessity-high' };
    if (necessityIndex >= 0.5) return { text: 'Medium', class: 'necessity-medium' };
    if (necessityIndex >= 0.3) return { text: 'Low', class: 'necessity-low' };
    return { text: 'Luxury', class: 'necessity-luxury' };
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

function renderContracts(firm) {
    const contractManager = simulation.purchaseManager?.contractManager;
    const summaryEl = document.getElementById('firm-contracts-summary');
    const supplierListEl = document.getElementById('firm-contracts-supplier-list');
    const buyerListEl = document.getElementById('firm-contracts-buyer-list');
    const countEl = document.getElementById('firm-contracts-count');

    // Check if contract system is available
    if (!contractManager) {
        countEl.textContent = '0 Contracts';
        summaryEl.innerHTML = '<p class="no-data">Contract system not enabled</p>';
        supplierListEl.innerHTML = '';
        buyerListEl.innerHTML = '';
        return;
    }

    // Get contracts for this firm
    const contracts = contractManager.getContractsForFirm(firm.id);
    const asSupplier = contracts.filter(c => c.role === 'supplier');
    const asBuyer = contracts.filter(c => c.role === 'buyer');
    const totalContracts = contracts.length;

    // Calculate totals
    let totalSupplierValue = 0;
    let totalBuyerValue = 0;
    asSupplier.forEach(c => { totalSupplierValue += c.contract.totalValue || 0; });
    asBuyer.forEach(c => { totalBuyerValue += c.contract.totalValue || 0; });

    // Get next delivery ETA for this firm
    const nextDeliveryInfo = getNextDeliveryETA(firm.id);

    countEl.textContent = `${totalContracts} Contracts`;

    // Render summary
    summaryEl.innerHTML = `
        <div class="contracts-summary-grid">
            <div class="contracts-summary-stat">
                <span class="contracts-stat-value">${totalContracts}</span>
                <span class="contracts-stat-label">Total Contracts</span>
            </div>
            <div class="contracts-summary-stat">
                <span class="contracts-stat-value">${asSupplier.length}</span>
                <span class="contracts-stat-label">As Supplier</span>
            </div>
            <div class="contracts-summary-stat">
                <span class="contracts-stat-value">${asBuyer.length}</span>
                <span class="contracts-stat-label">As Buyer</span>
            </div>
            <div class="contracts-summary-stat">
                <span class="contracts-stat-value ${moneyClass(totalSupplierValue)}">${formatCurrencyFull(totalSupplierValue)}</span>
                <span class="contracts-stat-label">Sales Value</span>
            </div>
            <div class="contracts-summary-stat">
                <span class="contracts-stat-value ${moneyClass(-totalBuyerValue)}">${formatCurrencyFull(totalBuyerValue)}</span>
                <span class="contracts-stat-label">Purchase Value</span>
            </div>
        </div>
        ${nextDeliveryInfo.hasDelivery ? `
        <div class="next-delivery-section">
            <div class="next-delivery-eta">
                <span class="eta-label">Next Delivery:</span>
                <span class="eta-value">${nextDeliveryInfo.productName}</span>
                <span class="eta-label">ETA:</span>
                <span class="eta-value ${nextDeliveryInfo.etaClass}">${nextDeliveryInfo.etaText}</span>
                <span class="eta-label">Qty:</span>
                <span class="eta-value">${nextDeliveryInfo.quantity}</span>
            </div>
        </div>
        ` : ''}
    `;

    // Helper to render a contract item
    const renderContractItem = (contractInfo, role) => {
        const contract = contractInfo.contract;
        const otherPartyId = role === 'supplier' ? contract.buyerId : contract.supplierId;
        const otherPartyName = role === 'supplier' ? contract.buyerName : contract.supplierName;
        const otherFirm = simulation.firms.get(otherPartyId);
        const displayName = otherPartyName || (otherFirm ? getFirmDisplayName(otherFirm) : 'Unknown');

        const statusClass = contract.status === 'active' ? 'status-active' :
                           contract.status === 'pending' ? 'status-pending' :
                           contract.status === 'terminated' ? 'status-terminated' : 'status-other';

        const typeLabel = contract.type === 'fixed_volume' ? 'Fixed' :
                         contract.type === 'min_max' ? 'Flexible' :
                         contract.type === 'exclusive' ? 'Exclusive' : contract.type;

        const periodLabel = contract.periodType === 'daily' ? '/day' :
                           contract.periodType === 'weekly' ? '/week' :
                           contract.periodType === 'monthly' ? '/month' : '';

        const fulfillmentRate = (contract.averageFulfillmentRate * 100).toFixed(0);
        const fulfillmentClass = fulfillmentRate >= 90 ? 'fulfillment-good' :
                                fulfillmentRate >= 70 ? 'fulfillment-ok' : 'fulfillment-poor';

        return `
            <div class="contract-item ${statusClass}">
                <div class="contract-item-header">
                    <span class="contract-product">${contract.product}</span>
                    <span class="contract-type-badge">${typeLabel}</span>
                    <span class="contract-status-badge ${statusClass}">${contract.status}</span>
                </div>
                <div class="contract-item-parties">
                    <span class="contract-party-label">${role === 'supplier' ? 'Buyer:' : 'Supplier:'}</span>
                    <a href="firms.html?id=${otherPartyId}" class="contract-party-link">${displayName}</a>
                </div>
                <div class="contract-item-details">
                    <div class="contract-detail">
                        <span class="contract-detail-label">Volume:</span>
                        <span class="contract-detail-value">${contract.volumePerPeriod}${periodLabel}</span>
                    </div>
                    <div class="contract-detail">
                        <span class="contract-detail-label">Price:</span>
                        <span class="contract-detail-value">${formatCurrency(contract.pricePerUnit)}/unit</span>
                    </div>
                    <div class="contract-detail">
                        <span class="contract-detail-label">Fulfillment:</span>
                        <span class="contract-detail-value ${fulfillmentClass}">${fulfillmentRate}%</span>
                    </div>
                    <div class="contract-detail">
                        <span class="contract-detail-label">Total Value:</span>
                        <span class="contract-detail-value">${formatCurrencyFull(contract.totalValue || 0)}</span>
                    </div>
                </div>
            </div>
        `;
    };

    // Render supplier contracts
    if (asSupplier.length === 0) {
        supplierListEl.innerHTML = '<p class="no-data">No contracts as supplier</p>';
    } else {
        supplierListEl.innerHTML = asSupplier.map(c => renderContractItem(c, 'supplier')).join('');
    }

    // Render buyer contracts
    if (asBuyer.length === 0) {
        buyerListEl.innerHTML = '<p class="no-data">No contracts as buyer</p>';
    } else {
        buyerListEl.innerHTML = asBuyer.map(c => renderContractItem(c, 'buyer')).join('');
    }
}

function renderBidsAndOrders(firm) {
    const contractManager = simulation.purchaseManager?.contractManager;
    const firmId = firm.id;

    // Get contracts where this firm is supplier or buyer
    const contracts = contractManager?.getActiveContracts?.() || [];
    const asSupplier = contracts.filter(c => c.supplierId === firmId);
    const asBuyer = contracts.filter(c => c.buyerId === firmId);

    // Get pending deliveries for this firm
    const pendingDeliveries = simulation.purchaseManager?.pendingDeliveries?.filter(
        d => d.seller?.id === firmId || d.buyer?.id === firmId
    ) || [];

    const totalContracts = asSupplier.length + asBuyer.length;
    const totalContractValue = [...asSupplier, ...asBuyer].reduce((sum, c) => sum + (c.totalValue || 0), 0);

    document.getElementById('firm-orders-count').textContent = `${totalContracts} Contracts`;

    document.getElementById('firm-bids-summary').innerHTML = `
        <div class="bids-summary-grid">
            <div class="bids-summary-stat">
                <span class="bids-stat-value">${totalContracts}</span>
                <span class="bids-stat-label">Contracts</span>
            </div>
            <div class="bids-summary-stat">
                <span class="bids-stat-value">${asSupplier.length}</span>
                <span class="bids-stat-label">As Supplier</span>
            </div>
            <div class="bids-summary-stat">
                <span class="bids-stat-value">${asBuyer.length}</span>
                <span class="bids-stat-label">As Buyer</span>
            </div>
            <div class="bids-summary-stat">
                <span class="bids-stat-value">${pendingDeliveries.length}</span>
                <span class="bids-stat-label">Pending Deliveries</span>
            </div>
            <div class="bids-summary-stat">
                <span class="bids-stat-value ${moneyClass(totalContractValue)}">${formatCurrencyFull(totalContractValue)}</span>
                <span class="bids-stat-label">Contract Value</span>
            </div>
        </div>
    `;

    // Supplier contracts list
    const wonList = document.getElementById('firm-orders-won-list');
    wonList.innerHTML = asSupplier.length === 0 ? '<p class="no-data">No supply contracts</p>' :
        asSupplier.map(c => `
            <div class="firm-bid-item order-won">
                <div class="bid-item-left">
                    <span class="bid-product">${c.productName}</span>
                    <span class="bid-details">${c.quantity} units/delivery</span>
                </div>
                <div class="bid-item-right">
                    <span class="bid-value">${formatCurrency(c.unitPrice || 0)}/unit</span>
                    <span class="bid-status status-awarded">Active</span>
                </div>
            </div>
        `).join('');

    // Pending deliveries list
    const bidsList = document.getElementById('firm-active-bids-list');
    bidsList.innerHTML = pendingDeliveries.length === 0 ? '<p class="no-data">No pending deliveries</p>' :
        pendingDeliveries.slice(0, 10).map(d => `
            <div class="firm-bid-item active-bid">
                <div class="bid-item-left">
                    <span class="bid-product">${d.productName || d.material}</span>
                    <span class="bid-details">${d.quantity} units</span>
                </div>
                <div class="bid-item-right">
                    <span class="bid-value">${formatCurrency(d.totalCost || 0)}</span>
                    <span class="bid-status status-bidding">In Transit</span>
                </div>
            </div>
        `).join('');

    // Buyer contracts list
    const completedList = document.getElementById('firm-completed-orders-list');
    completedList.innerHTML = asBuyer.length === 0 ? '<p class="no-data">No purchase contracts</p>' :
        asBuyer.slice(-10).reverse().map(c => `
            <div class="firm-bid-item order-completed">
                <div class="bid-item-left">
                    <span class="bid-product">${c.productName}</span>
                    <span class="bid-details">${c.quantity} units/delivery</span>
                </div>
                <div class="bid-item-right">
                    <span class="bid-value">${formatCurrency(c.unitPrice || 0)}/unit</span>
                    <span class="bid-status status-delivered">Active</span>
                </div>
            </div>
        `).join('');
}

function renderSales(firm) {
    const tbody = document.getElementById('firm-sales-tbody');
    const transactions = simulation.transactionLog?.transactions || [];
    const sales = transactions.filter(t => t.seller?.id === firm.id).slice(-20).reverse();

    // Count contract vs spot sales
    const contractSales = sales.filter(t => t.contractId).length;
    const spotSales = sales.length - contractSales;
    document.getElementById('firm-sales-count').textContent = `${sales.length} Sales (${contractSales} contract, ${spotSales} spot)`;

    tbody.innerHTML = sales.length === 0 ? '<tr><td colspan="7" class="no-data">No sales</td></tr>' :
        sales.map(t => {
            const productName = getProductName(t.productName || t.product || t.material);
            const saleType = t.contractId
                ? '<span class="sale-type-badge contract">Contract</span>'
                : '<span class="sale-type-badge spot">Spot</span>';
            return `
            <tr>
                <td>${new Date(t.timestamp).toLocaleTimeString()}</td>
                <td>${saleType}</td>
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
    const allTransactions = transactionLog?.transactions || [];

    // Filter by buyer ID - convert to string for safe comparison
    const firmIdStr = String(firm.id);
    const purchases = allTransactions
        .filter(t => String(t.buyer?.id) === firmIdStr)
        .slice(-20)
        .reverse();

    document.getElementById('firm-purchases-count').textContent = `${purchases.length} Purchases`;

    tbody.innerHTML = purchases.length === 0 ? '<tr><td colspan="6" class="no-data">No purchases</td></tr>' :
        purchases.map(t => {
            const productName = getProductName(t.productName || t.product || t.material);
            const sellerName = t.seller?.name || 'Unknown';
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
