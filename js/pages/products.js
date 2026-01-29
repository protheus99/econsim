// js/pages/products.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber, formatCurrency } from './shared.js';

let simulation;
let tierFilter = 'all';
let categoryFilter = 'all';
let searchTerm = '';

async function init() {
    simulation = await getSimulation();
    setupClock(simulation);
    setupControls(simulation);

    document.getElementById('products-tier-filter')?.addEventListener('change', (e) => {
        tierFilter = e.target.value;
        renderProducts();
    });

    document.getElementById('products-category-filter')?.addEventListener('change', (e) => {
        categoryFilter = e.target.value;
        renderProducts();
    });

    document.getElementById('products-search-input')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderProducts();
    });

    document.getElementById('btn-back-product')?.addEventListener('click', () => {
        document.getElementById('product-detail-view').classList.add('hidden');
        document.querySelector('.main-container').style.display = 'block';
    });

    populateCategoryFilter();
    updateDisplay();
    onUpdate(() => updateDisplay());
}

function populateCategoryFilter() {
    const select = document.getElementById('products-category-filter');
    if (!select || !simulation.productRegistry) return;

    const categories = new Set();
    simulation.productRegistry.getAllProducts().forEach(p => {
        if (p.category) categories.add(p.category);
    });

    Array.from(categories).sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function updateDisplay() {
    if (!simulation || !simulation.productRegistry) return;

    const products = simulation.productRegistry.getAllProducts();
    document.getElementById('product-count').textContent = products.length + ' Products';

    const raw = products.filter(p => p.tier === 'RAW').length;
    const semiRaw = products.filter(p => p.tier === 'SEMI_RAW').length;
    const manufactured = products.filter(p => p.tier === 'MANUFACTURED').length;

    document.getElementById('raw-count').textContent = raw;
    document.getElementById('semi-raw-count').textContent = semiRaw;
    document.getElementById('manufactured-count').textContent = manufactured;

    renderProducts();
    renderCostAnalysis();
}

function renderProducts() {
    const registry = simulation.productRegistry;
    if (!registry) return;

    let products = registry.getAllProducts();

    // Filters
    if (tierFilter !== 'all') {
        products = products.filter(p => p.tier === tierFilter);
    }
    if (categoryFilter !== 'all') {
        products = products.filter(p => p.category === categoryFilter);
    }
    if (searchTerm) {
        products = products.filter(p => p.name.toLowerCase().includes(searchTerm));
    }

    // Group by tier
    const raw = products.filter(p => p.tier === 'RAW');
    const semiRaw = products.filter(p => p.tier === 'SEMI_RAW');
    const manufactured = products.filter(p => p.tier === 'MANUFACTURED');

    renderProductGrid('raw-products-grid', raw, 'raw-badge');
    renderProductGrid('semi-raw-products-grid', semiRaw, 'semi-raw-badge');
    renderProductGrid('manufactured-products-grid', manufactured, 'manufactured-badge');
}

function renderProductGrid(containerId, products, badgeId) {
    const container = document.getElementById(containerId);
    const badge = document.getElementById(badgeId);
    if (!container) return;

    if (badge) badge.textContent = products.length + ' Products';

    if (products.length === 0) {
        container.innerHTML = '<p class="empty-state">No products match the filters</p>';
        return;
    }

    container.innerHTML = products.map(p => `
        <div class="product-card" data-product-id="${p.id}">
            <div class="product-name">${p.name}</div>
            <div class="product-category">${p.category || 'Uncategorized'}</div>
            <div class="product-price">${formatCurrency(p.basePrice)}</div>
        </div>
    `).join('');

    container.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => showProductDetail(parseInt(card.dataset.productId)));
    });
}

function showProductDetail(productId) {
    const product = simulation.productRegistry.getProduct(productId);
    if (!product) return;

    document.querySelector('.main-container').style.display = 'none';
    document.getElementById('product-detail-view').classList.remove('hidden');

    document.getElementById('product-detail-name').textContent = product.name;
    document.getElementById('product-tier-badge').textContent = product.tier;
    document.getElementById('product-tier-badge').className = `product-tier-badge tier-${product.tier?.toLowerCase()}`;

    document.getElementById('product-info').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">ID</span><span class="stat-value">${product.id}</span></div>
            <div class="stat-item"><span class="stat-label">Category</span><span class="stat-value">${product.category || '-'}</span></div>
            <div class="stat-item"><span class="stat-label">Tier</span><span class="stat-value">${product.tier}</span></div>
        </div>
    `;

    document.getElementById('product-pricing').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Base Price</span><span class="stat-value">${formatCurrency(product.basePrice)}</span></div>
            <div class="stat-item"><span class="stat-label">Tech Required</span><span class="stat-value">${product.technologyRequired || 1}</span></div>
        </div>
    `;

    // Inputs
    const inputsContainer = document.getElementById('product-inputs');
    if (product.inputs && product.inputs.length > 0) {
        inputsContainer.innerHTML = product.inputs.map(input => `
            <div class="input-item">
                <span class="input-material">${input.material}</span>
                <span class="input-qty">${input.quantity} units</span>
            </div>
        `).join('');
    } else {
        inputsContainer.innerHTML = '<p class="empty-state">No inputs (raw material)</p>';
    }

    // Find producers
    const producers = [];
    simulation.firms.forEach(f => {
        if (f.type === 'MANUFACTURING' && f.product?.id === productId) {
            producers.push(f);
        }
    });

    document.getElementById('product-producers-count').textContent = producers.length + ' Producers';
    const producersList = document.getElementById('product-producers-list');

    if (producers.length > 0) {
        producersList.innerHTML = producers.map(f => `
            <div class="firm-item">
                <span class="firm-name">${f.name || f.id}</span>
                <span class="firm-location">${f.city?.name || 'Unknown'}</span>
            </div>
        `).join('');
    } else {
        producersList.innerHTML = '<p class="empty-state">No producers found</p>';
    }

    // Cost breakdown
    renderProductCostBreakdown(product);
}

function renderProductCostBreakdown(product) {
    const costBreakdown = document.getElementById('product-cost-breakdown');
    const costStatus = document.getElementById('product-cost-status');

    if (!simulation.costCalculator) {
        costBreakdown.innerHTML = '<p class="empty-state">Cost calculator not available</p>';
        return;
    }

    const breakdown = simulation.costCalculator.calculateCost(product);
    if (!breakdown) {
        costBreakdown.innerHTML = '<p class="empty-state">Unable to calculate cost</p>';
        return;
    }

    const margin = product.basePrice - breakdown.totalCost;
    const marginPct = (margin / breakdown.totalCost) * 100;

    // Set status badge
    if (margin < 0) {
        costStatus.textContent = 'Underpriced';
        costStatus.className = 'card-badge cost-warning';
    } else if (marginPct > 100) {
        costStatus.textContent = 'High Margin';
        costStatus.className = 'card-badge cost-note';
    } else {
        costStatus.textContent = 'Balanced';
        costStatus.className = 'card-badge cost-ok';
    }

    if (breakdown.isRawMaterial) {
        costBreakdown.innerHTML = `
            <div class="cost-breakdown-raw">
                <p>This is a RAW material with no production inputs.</p>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Base Cost</span>
                        <span class="stat-value">${formatCurrency(breakdown.totalCost)}</span>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const pct = breakdown.getCostPercentages();

    costBreakdown.innerHTML = `
        <div class="cost-breakdown-detail">
            <div class="cost-inputs-section">
                <h4>Input Costs</h4>
                ${breakdown.inputs.map(input => `
                    <div class="cost-input-item">
                        <span class="input-name">${input.material}</span>
                        <span class="input-detail">${input.quantity.toFixed(2)} × ${formatCurrency(input.unitCost)}</span>
                        <span class="input-total">${formatCurrency(input.totalCost)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="cost-summary-section">
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Material Cost</span>
                        <span class="stat-value">${formatCurrency(breakdown.totalMaterialCost)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Labor Cost</span>
                        <span class="stat-value">${formatCurrency(breakdown.laborCost)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Overhead</span>
                        <span class="stat-value">${formatCurrency(breakdown.overheadCost)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Cost</span>
                        <span class="stat-value cost-total">${formatCurrency(breakdown.totalCost)}</span>
                    </div>
                </div>
                <div class="cost-margin-section">
                    <div class="margin-bar">
                        <div class="margin-fill" style="width: ${Math.min(pct.materials, 100)}%; background: #3498db;"></div>
                        <div class="margin-fill" style="width: ${Math.min(pct.labor, 100)}%; background: #e74c3c;"></div>
                        <div class="margin-fill" style="width: ${Math.min(pct.overhead, 100)}%; background: #f39c12;"></div>
                    </div>
                    <div class="margin-legend">
                        <span><span class="legend-color" style="background:#3498db"></span> Materials ${pct.materials.toFixed(0)}%</span>
                        <span><span class="legend-color" style="background:#e74c3c"></span> Labor ${pct.labor.toFixed(0)}%</span>
                        <span><span class="legend-color" style="background:#f39c12"></span> Overhead ${pct.overhead.toFixed(0)}%</span>
                    </div>
                </div>
                <div class="profit-margin-display ${margin < 0 ? 'negative' : ''}">
                    <span class="margin-label">Profit Margin:</span>
                    <span class="margin-value">${formatCurrency(margin)} (${marginPct.toFixed(1)}%)</span>
                </div>
                ${margin < 0 ? '<div class="cost-warning-msg">Base price is below production cost!</div>' : ''}
            </div>
        </div>
    `;
}

function renderCostAnalysis() {
    const container = document.getElementById('cost-analysis-table');
    const statusBadge = document.getElementById('balance-status');

    if (!simulation.costCalculator) {
        container.innerHTML = '<p class="empty-state">Cost calculator not initialized</p>';
        return;
    }

    const analysis = simulation.costCalculator.analyzeAllProducts();

    // Count by status
    const underpriced = analysis.filter(a => a.isUnderpriced);
    const overpriced = analysis.filter(a => a.isOverpriced);
    const balanced = analysis.filter(a => !a.isUnderpriced && !a.isOverpriced);

    document.getElementById('underpriced-count').textContent = underpriced.length;
    document.getElementById('balanced-count').textContent = balanced.length;
    document.getElementById('overpriced-count').textContent = overpriced.length;

    // Set status badge
    if (underpriced.length > 0) {
        statusBadge.textContent = `${underpriced.length} Issues`;
        statusBadge.className = 'card-badge cost-warning';
    } else {
        statusBadge.textContent = 'Balanced';
        statusBadge.className = 'card-badge cost-ok';
    }

    // Only show non-raw products (those with production costs)
    const producedProducts = analysis.filter(a => !a.breakdown.isRawMaterial);

    container.innerHTML = `
        <div class="cost-analysis-header">
            <span class="col-product">Product</span>
            <span class="col-tier">Tier</span>
            <span class="col-cost">Calc Cost</span>
            <span class="col-price">Base Price</span>
            <span class="col-margin">Margin</span>
            <span class="col-status">Status</span>
        </div>
        <div class="cost-analysis-rows">
            ${producedProducts.map(a => {
                const statusClass = a.isUnderpriced ? 'underpriced' : (a.isOverpriced ? 'overpriced' : 'balanced');
                const statusText = a.isUnderpriced ? 'Underpriced' : (a.isOverpriced ? 'High Margin' : 'OK');
                const marginStr = a.marginPercent >= 0 ? `+${a.marginPercent.toFixed(0)}%` : `${a.marginPercent.toFixed(0)}%`;
                return `
                    <div class="cost-analysis-row ${statusClass}" data-product-id="${a.product.id}">
                        <span class="col-product">${a.product.name}</span>
                        <span class="col-tier tier-${a.product.tier.toLowerCase()}">${a.product.tier}</span>
                        <span class="col-cost">${formatCurrency(a.calculatedCost)}</span>
                        <span class="col-price">${formatCurrency(a.basePrice)}</span>
                        <span class="col-margin ${a.marginPercent < 0 ? 'negative' : ''}">${marginStr}</span>
                        <span class="col-status status-${statusClass}">${statusText}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Add click handlers
    container.querySelectorAll('.cost-analysis-row').forEach(row => {
        row.addEventListener('click', () => {
            showProductDetail(parseInt(row.dataset.productId));
        });
    });
}

init();
