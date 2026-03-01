// js/pages/contracts.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber, formatCurrency } from './shared.js';

let simulation;
let statusFilter = 'all';
let productFilter = 'all';
let searchTerm = '';
let selectedContractId = null;
let selectedProduct = null;

async function init() {
    simulation = await getSimulation();
    setupClock(simulation);
    setupControls(simulation);

    // Debug logging
    console.log('Contracts page init');
    console.log('PurchaseManager:', simulation.purchaseManager);
    console.log('ContractManager:', simulation.purchaseManager?.contractManager);
    console.log('Contracts count:', simulation.purchaseManager?.contractManager?.contracts?.size);

    // Setup filters
    document.getElementById('contract-status-filter')?.addEventListener('change', (e) => {
        statusFilter = e.target.value;
        renderContracts();
    });

    document.getElementById('contract-product-filter')?.addEventListener('change', (e) => {
        productFilter = e.target.value;
        renderContracts();
    });

    document.getElementById('contract-search')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderContracts();
    });

    document.getElementById('close-detail')?.addEventListener('click', () => {
        document.getElementById('contract-detail-panel')?.classList.add('hidden');
        selectedContractId = null;
    });

    updateDisplay();
    onUpdate(() => updateDisplay());
    populateProductFilter();
}

function populateProductFilter() {
    const select = document.getElementById('contract-product-filter');
    if (!select || !simulation) return;

    const contractManager = simulation.purchaseManager?.contractManager;
    if (!contractManager) return;

    const products = new Set();
    contractManager.contracts.forEach(contract => {
        if (contract.product) products.add(contract.product);
    });

    Array.from(products).sort().forEach(product => {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        select.appendChild(option);
    });
}

function updateDisplay() {
    if (!simulation) return;

    updateContractStats();
    renderProductBreakdown();
    renderContracts();

    if (selectedProduct) {
        renderProductDetailView();
    }

    if (selectedContractId) {
        renderContractDetail(selectedContractId);
    }
}

function updateContractStats() {
    const contractManager = simulation.purchaseManager?.contractManager;
    if (!contractManager) {
        document.getElementById('total-contracts').textContent = '0';
        document.getElementById('active-contracts').textContent = '0';
        document.getElementById('total-contract-value').textContent = '$0';
        document.getElementById('avg-fulfillment').textContent = '0%';
        return;
    }

    const stats = contractManager.getStats();
    const contracts = Array.from(contractManager.contracts.values());

    // Count by type
    let fixedVolume = 0, minMax = 0, exclusive = 0, defaulted = 0;
    let totalFulfillment = 0;
    let activeCount = 0;

    contracts.forEach(c => {
        const type = c.type?.toLowerCase();
        if (type === 'fixed_volume') fixedVolume++;
        else if (type === 'min_max') minMax++;
        else if (type === 'exclusive') exclusive++;

        if (c.status === 'defaulted') defaulted++;
        if (c.isActive?.() || c.status === 'active') {
            activeCount++;
            totalFulfillment += c.averageFulfillmentRate || 0;
        }
    });

    const avgFulfillment = activeCount > 0 ? (totalFulfillment / activeCount) * 100 : 0;

    document.getElementById('total-contracts').textContent = formatNumber(contracts.length);
    document.getElementById('active-contracts').textContent = formatNumber(stats.activeCount || activeCount);
    document.getElementById('total-contract-value').textContent = formatCurrency(stats.totalValue || 0);
    document.getElementById('avg-fulfillment').textContent = `${avgFulfillment.toFixed(1)}%`;

    document.getElementById('fixed-volume-count').textContent = formatNumber(fixedVolume);
    document.getElementById('min-max-count').textContent = formatNumber(minMax);
    document.getElementById('exclusive-count').textContent = formatNumber(exclusive);
    document.getElementById('defaulted-count').textContent = formatNumber(stats.defaultedCount || defaulted);
}

function renderProductBreakdown() {
    const container = document.getElementById('product-breakdown');
    if (!container) return;

    const contractManager = simulation.purchaseManager?.contractManager;
    if (!contractManager) {
        container.innerHTML = '<div class="no-data">No contracts available</div>';
        return;
    }

    // Group contracts by product
    const byProduct = new Map();
    contractManager.contracts.forEach(contract => {
        const product = contract.product || 'Unknown';
        if (!byProduct.has(product)) {
            byProduct.set(product, { count: 0, value: 0, active: 0 });
        }
        const data = byProduct.get(product);
        data.count++;
        data.value += contract.totalValue || 0;
        if (contract.isActive?.() || contract.status === 'active') {
            data.active++;
        }
    });

    if (byProduct.size === 0) {
        container.innerHTML = '<div class="no-data">No contracts found</div>';
        return;
    }

    container.innerHTML = Array.from(byProduct.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .map(([product, data]) => `
            <div class="breakdown-item tx-contract product-breakdown-item${selectedProduct === product ? ' selected' : ''}" data-product="${product}">
                <span class="breakdown-type">${product}</span>
                <span class="breakdown-count">${data.active}/${data.count} active</span>
                <span class="breakdown-value">${formatCurrency(data.value)}</span>
            </div>
        `).join('');

    // Add click handlers for product items
    container.querySelectorAll('.product-breakdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const product = item.dataset.product;
            if (selectedProduct === product) {
                selectedProduct = null; // Toggle off
            } else {
                selectedProduct = product;
            }
            renderProductBreakdown();
            renderProductDetailView();
        });
    });
}

function renderProductDetailView() {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    if (!selectedProduct) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }

    const contractManager = simulation.purchaseManager?.contractManager;
    if (!contractManager) {
        container.innerHTML = '<div class="no-data">No contract data</div>';
        return;
    }

    // Get all contracts for this product
    const contracts = Array.from(contractManager.contracts.values())
        .filter(c => c.product === selectedProduct)
        .sort((a, b) => {
            // Active first, then by total value
            const aActive = a.status === 'active' ? 1 : 0;
            const bActive = b.status === 'active' ? 1 : 0;
            if (aActive !== bActive) return bActive - aActive;
            return (b.totalValue || 0) - (a.totalValue || 0);
        });

    if (contracts.length === 0) {
        container.innerHTML = `<div class="no-data">No contracts found for ${selectedProduct}</div>`;
        container.classList.remove('hidden');
        return;
    }

    // Calculate summary stats
    const activeCount = contracts.filter(c => c.status === 'active').length;
    const totalVolume = contracts.reduce((sum, c) => sum + (c.volumePerPeriod || 0), 0);
    const totalValue = contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);
    const avgPrice = contracts.reduce((sum, c) => sum + (c.pricePerUnit || 0), 0) / contracts.length;

    container.innerHTML = `
        <div class="card full-width">
            <div class="card-header">
                <div class="card-title">Contracts for: ${selectedProduct}</div>
                <button class="btn btn-secondary" id="close-product-detail">Close</button>
            </div>
            <div class="product-detail-summary">
                <div class="summary-stat">
                    <span class="summary-label">Total Contracts</span>
                    <span class="summary-value">${contracts.length}</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-label">Active</span>
                    <span class="summary-value">${activeCount}</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-label">Total Volume/Week</span>
                    <span class="summary-value">${formatNumber(totalVolume)}</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-label">Total Value</span>
                    <span class="summary-value">${formatCurrency(totalValue)}</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-label">Avg Price</span>
                    <span class="summary-value">${formatCurrency(avgPrice)}</span>
                </div>
            </div>
            <div class="transactions-table-container">
                <table class="transactions-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Supplier</th>
                            <th>Supplier Location</th>
                            <th>Buyer</th>
                            <th>Buyer Location</th>
                            <th>Volume/Period</th>
                            <th>Price/Unit</th>
                            <th>Period Fulfilled</th>
                            <th>Total Delivered</th>
                            <th>Total Value</th>
                            <th>Fulfillment %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${contracts.map(c => {
                            const supplierFirm = simulation.firms.get(c.supplierId);
                            const buyerFirm = simulation.firms.get(c.buyerId);
                            const supplierName = c.supplierName || getShortFirmName(c.supplierId);
                            const buyerName = c.buyerName || getShortFirmName(c.buyerId);
                            const supplierCity = supplierFirm?.city?.name || 'Unknown';
                            const buyerCity = buyerFirm?.city?.name || 'Unknown';
                            const fulfillmentRate = ((c.averageFulfillmentRate || 0) * 100).toFixed(1);
                            const fulfillmentClass = c.averageFulfillmentRate >= 0.9 ? 'high' :
                                                      c.averageFulfillmentRate >= 0.7 ? 'medium' : 'low';
                            const periodLabel = c.periodType === 'daily' ? '/day' :
                                               c.periodType === 'weekly' ? '/week' : '/month';

                            return `
                                <tr class="contract-row" data-contract-id="${c.id}">
                                    <td><span class="status-badge ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
                                    <td><a href="firms.html?id=${c.supplierId}" class="firm-link">${supplierName}</a></td>
                                    <td>${supplierCity}</td>
                                    <td><a href="firms.html?id=${c.buyerId}" class="firm-link">${buyerName}</a></td>
                                    <td>${buyerCity}</td>
                                    <td>${formatNumber(c.volumePerPeriod || 0)}${periodLabel}</td>
                                    <td>${formatCurrency(c.pricePerUnit || 0)}</td>
                                    <td>${formatNumber(c.currentPeriodFulfilled || 0)} / ${formatNumber(c.volumePerPeriod || 0)}</td>
                                    <td>${formatNumber(c.totalDelivered || 0)}</td>
                                    <td>${formatCurrency(c.totalValue || 0)}</td>
                                    <td><span class="quality-indicator quality-${fulfillmentClass}">${fulfillmentRate}%</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.classList.remove('hidden');

    // Add close button handler
    document.getElementById('close-product-detail')?.addEventListener('click', () => {
        selectedProduct = null;
        renderProductBreakdown();
        renderProductDetailView();
    });

    // Add click handlers for contract rows
    container.querySelectorAll('.contract-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            const contractId = row.dataset.contractId;
            if (contractId) {
                selectedContractId = contractId;
                renderContractDetail(contractId);
            }
        });
    });
}

function getShortFirmName(firmId) {
    if (!simulation || !firmId) return 'Unknown';

    const firm = simulation.firms.get(firmId);
    if (!firm) return firmId.substring(0, 12) + '...';

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

function getStatusBadgeClass(status) {
    const statusMap = {
        'active': 'status-active',
        'pending': 'status-pending',
        'completed': 'status-completed',
        'terminated': 'status-terminated',
        'defaulted': 'status-defaulted',
        'draft': 'status-draft',
        'suspended': 'status-suspended'
    };
    return statusMap[status?.toLowerCase()] || 'status-unknown';
}

function renderContracts() {
    const tbody = document.getElementById('contracts-tbody');
    if (!tbody) return;

    const contractManager = simulation.purchaseManager?.contractManager;
    if (!contractManager) {
        tbody.innerHTML = '<tr><td colspan="10" class="no-data">Contract system not initialized</td></tr>';
        document.getElementById('showing-contracts').textContent = 'Showing 0';
        return;
    }

    let contracts = Array.from(contractManager.contracts.values());

    // Apply filters
    if (statusFilter !== 'all') {
        contracts = contracts.filter(c => c.status?.toLowerCase() === statusFilter);
    }

    if (productFilter !== 'all') {
        contracts = contracts.filter(c => c.product === productFilter);
    }

    if (searchTerm) {
        contracts = contracts.filter(c =>
            c.supplierName?.toLowerCase().includes(searchTerm) ||
            c.buyerName?.toLowerCase().includes(searchTerm) ||
            c.product?.toLowerCase().includes(searchTerm) ||
            c.id?.toLowerCase().includes(searchTerm) ||
            getShortFirmName(c.supplierId).toLowerCase().includes(searchTerm) ||
            getShortFirmName(c.buyerId).toLowerCase().includes(searchTerm)
        );
    }

    // Sort by status (active first) then by total value
    contracts.sort((a, b) => {
        const aActive = a.status === 'active' ? 1 : 0;
        const bActive = b.status === 'active' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return (b.totalValue || 0) - (a.totalValue || 0);
    });

    document.getElementById('showing-contracts').textContent = `Showing ${contracts.length}`;

    if (contracts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="no-data">No contracts match the filters</td></tr>';
        return;
    }

    tbody.innerHTML = contracts.map(c => {
        const supplierName = c.supplierName || getShortFirmName(c.supplierId);
        const buyerName = c.buyerName || getShortFirmName(c.buyerId);
        const fulfillmentRate = ((c.averageFulfillmentRate || 0) * 100).toFixed(1);
        const fulfillmentClass = c.averageFulfillmentRate >= 0.9 ? 'high' :
                                  c.averageFulfillmentRate >= 0.7 ? 'medium' : 'low';

        const periodLabel = c.periodType === 'daily' ? '/day' :
                           c.periodType === 'weekly' ? '/week' : '/month';

        return `
            <tr class="contract-row" data-contract-id="${c.id}">
                <td><code class="contract-id">${c.id.substring(0, 16)}...</code></td>
                <td><span class="status-badge ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
                <td>
                    <a href="firms.html?id=${c.supplierId}" class="firm-link">${supplierName}</a>
                </td>
                <td>
                    <a href="firms.html?id=${c.buyerId}" class="firm-link">${buyerName}</a>
                </td>
                <td>${c.product || '-'}</td>
                <td>${formatNumber(c.volumePerPeriod || 0)}${periodLabel}</td>
                <td>${formatCurrency(c.pricePerUnit || 0)}</td>
                <td>${formatNumber(c.currentPeriodFulfilled || 0)} / ${formatNumber(c.volumePerPeriod || 0)}</td>
                <td>${formatCurrency(c.totalValue || 0)}</td>
                <td>
                    <span class="quality-indicator quality-${fulfillmentClass}">${fulfillmentRate}%</span>
                </td>
            </tr>
        `;
    }).join('');

    // Add click handlers for rows
    tbody.querySelectorAll('.contract-row').forEach(row => {
        row.addEventListener('click', (e) => {
            // Don't trigger if clicking a link
            if (e.target.tagName === 'A') return;

            const contractId = row.dataset.contractId;
            if (contractId) {
                selectedContractId = contractId;
                renderContractDetail(contractId);
            }
        });
    });
}

function renderContractDetail(contractId) {
    const panel = document.getElementById('contract-detail-panel');
    const content = document.getElementById('contract-detail-content');
    if (!panel || !content) return;

    const contractManager = simulation.purchaseManager?.contractManager;
    const contract = contractManager?.contracts.get(contractId);

    if (!contract) {
        content.innerHTML = '<div class="no-data">Contract not found</div>';
        panel.classList.remove('hidden');
        return;
    }

    const supplierFirm = simulation.firms.get(contract.supplierId);
    const buyerFirm = simulation.firms.get(contract.buyerId);
    const performance = contract.getPerformanceSummary?.() || {};

    const createdDate = new Date(contract.createdAt).toLocaleString();
    const startDate = new Date(contract.startDate).toLocaleString();
    const endDate = contract.endDate ? new Date(contract.endDate).toLocaleString() : 'Indefinite';

    // Recent deliveries
    const recentDeliveries = (contract.fulfillmentHistory || []).slice(-10).reverse();

    content.innerHTML = `
        <div class="contract-detail-grid">
            <div class="detail-section">
                <h3>Contract Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Contract ID:</span>
                    <span class="detail-value"><code>${contract.id}</code></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value">${contract.type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value"><span class="status-badge ${getStatusBadgeClass(contract.status)}">${contract.status}</span></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Created:</span>
                    <span class="detail-value">${createdDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Start Date:</span>
                    <span class="detail-value">${startDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">End Date:</span>
                    <span class="detail-value">${endDate}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Parties</h3>
                <div class="detail-row">
                    <span class="detail-label">Supplier:</span>
                    <span class="detail-value">
                        <a href="firms.html?id=${contract.supplierId}">${contract.supplierName || getShortFirmName(contract.supplierId)}</a>
                        ${supplierFirm?.city?.name ? `<br><small>${supplierFirm.city.name}</small>` : ''}
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Buyer:</span>
                    <span class="detail-value">
                        <a href="firms.html?id=${contract.buyerId}">${contract.buyerName || getShortFirmName(contract.buyerId)}</a>
                        ${buyerFirm?.city?.name ? `<br><small>${buyerFirm.city.name}</small>` : ''}
                    </span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Terms</h3>
                <div class="detail-row">
                    <span class="detail-label">Product:</span>
                    <span class="detail-value">${contract.product}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Volume/Period:</span>
                    <span class="detail-value">${formatNumber(contract.volumePerPeriod)} per ${contract.periodType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Price/Unit:</span>
                    <span class="detail-value">${formatCurrency(contract.pricePerUnit)} (${contract.priceType})</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Min Quality:</span>
                    <span class="detail-value">${(contract.minQuality * 100).toFixed(0)}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Shortfall Penalty:</span>
                    <span class="detail-value">${(contract.shortfallPenaltyRate * 100).toFixed(0)}%</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Performance</h3>
                <div class="detail-row">
                    <span class="detail-label">Total Delivered:</span>
                    <span class="detail-value">${formatNumber(contract.totalDelivered || 0)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Value:</span>
                    <span class="detail-value">${formatCurrency(contract.totalValue || 0)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Penalties:</span>
                    <span class="detail-value">${formatCurrency(contract.totalPenalties || 0)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Avg Fulfillment:</span>
                    <span class="detail-value">${((contract.averageFulfillmentRate || 0) * 100).toFixed(1)}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Current Period:</span>
                    <span class="detail-value">${formatNumber(contract.currentPeriodFulfilled || 0)} / ${formatNumber(contract.volumePerPeriod || 0)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Delivery Count:</span>
                    <span class="detail-value">${contract.fulfillmentHistory?.length || 0}</span>
                </div>
            </div>
        </div>

        ${recentDeliveries.length > 0 ? `
        <div class="detail-section full-width">
            <h3>Recent Deliveries</h3>
            <table class="transactions-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Quantity</th>
                        <th>Quality</th>
                        <th>Price/Unit</th>
                        <th>Total</th>
                        <th>Fulfillment</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentDeliveries.map(d => `
                        <tr>
                            <td>${new Date(d.date).toLocaleString()}</td>
                            <td>${formatNumber(d.deliveredQuantity)}</td>
                            <td>${((d.quality || 0) * 100).toFixed(0)}%</td>
                            <td>${formatCurrency(d.pricePerUnit || 0)}</td>
                            <td>${formatCurrency(d.totalValue || 0)}</td>
                            <td>${((d.fulfillmentRate || 0) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : '<div class="no-data">No deliveries recorded yet</div>'}
    `;

    panel.classList.remove('hidden');
}

init();
