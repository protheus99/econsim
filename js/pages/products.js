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
            <div class="product-price">${formatCurrency(p.basePrice)}/${p.unit || 'unit'}</div>
        </div>
    `).join('');

    container.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => showProductDetail(parseInt(card.dataset.productId)));
    });
}

function findSellersForProduct(product) {
    const sellers = [];

    simulation.firms.forEach(f => {
        // Only RETAIL firms sell to consumers
        if (f.type === 'RETAIL' && f.productInventory?.has(product.id)) {
            sellers.push(f);
        }
    });

    // Sort by stock quantity (highest first)
    sellers.sort((a, b) => {
        const stockA = a.productInventory?.get(product.id)?.quantity || 0;
        const stockB = b.productInventory?.get(product.id)?.quantity || 0;
        return stockB - stockA;
    });

    return sellers;
}

function findProducersForProduct(product) {
    const producers = [];

    simulation.firms.forEach(f => {
        // MANUFACTURING firms - check if they produce this product
        if (f.type === 'MANUFACTURING' && f.product?.id === product.id) {
            producers.push(f);
        }
        // MINING firms - match by resourceType
        else if (f.type === 'MINING' && product.tier === 'RAW') {
            if (f.resourceType === product.name) {
                producers.push(f);
            }
        }
        // LOGGING firms - match by timberType
        else if (f.type === 'LOGGING' && product.tier === 'RAW') {
            if (f.timberType === product.name) {
                producers.push(f);
            }
        }
        // FARM firms - match by cropType or livestockType
        else if (f.type === 'FARM' && product.tier === 'RAW') {
            if (f.cropType === product.name || f.livestockType === product.name) {
                producers.push(f);
            }
        }
        // Note: RETAIL firms only sell to consumers, they don't produce products
    });

    return producers;
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
            <div class="stat-item"><span class="stat-label">Unit</span><span class="stat-value">${product.unit || 'unit'}</span></div>
        </div>
    `;

    const minB2B = product.minB2BQuantity || 1;
    const minRetail = product.minRetailQuantity;
    const retailText = minRetail === 0 ? 'Not sold retail' : `${minRetail} ${product.unit || 'unit'}`;

    document.getElementById('product-pricing').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Base Price</span><span class="stat-value">${formatCurrency(product.basePrice)}/${product.unit || 'unit'}</span></div>
            <div class="stat-item"><span class="stat-label">Tech Required</span><span class="stat-value">${product.technologyRequired || 1}</span></div>
            <div class="stat-item"><span class="stat-label">Min B2B Order</span><span class="stat-value">${minB2B} ${product.unit || 'units'}</span></div>
            <div class="stat-item"><span class="stat-label">Min Retail</span><span class="stat-value">${retailText}</span></div>
        </div>
    `;

    // Inputs
    const inputsContainer = document.getElementById('product-inputs');
    if (product.inputs && product.inputs.length > 0) {
        inputsContainer.innerHTML = product.inputs.map(input => {
            const inputProduct = simulation.productRegistry.getAllProducts().find(p => p.name === input.material);
            const inputUnit = inputProduct?.unit || 'units';
            return `
                <div class="input-item">
                    <span class="input-material">${input.material}</span>
                    <span class="input-qty">${input.quantity} ${inputUnit}</span>
                </div>
            `;
        }).join('');
    } else {
        inputsContainer.innerHTML = '<p class="empty-state">No inputs (raw material)</p>';
    }

    // Find producers based on product tier and type
    const producers = findProducersForProduct(product);

    document.getElementById('product-producers-count').textContent = producers.length + ' Producers';
    const producersList = document.getElementById('product-producers-list');

    if (producers.length > 0) {
        producersList.innerHTML = producers.map(f => {
            const firmName = f.getDisplayName ? f.getDisplayName() : (f.name || f.id);
            return `
                <a href="firms.html?id=${f.id}" class="firm-item firm-link">
                    <span class="firm-name">${firmName}</span>
                    <span class="firm-location">${f.city?.name || 'Unknown'}</span>
                    <span class="firm-type">${f.type}</span>
                </a>
            `;
        }).join('');
    } else {
        producersList.innerHTML = '<p class="empty-state">No producers found</p>';
    }

    // Find sellers (retail stores that stock this product)
    const sellers = findSellersForProduct(product);

    document.getElementById('product-sellers-count').textContent = sellers.length + ' Sellers';
    const sellersList = document.getElementById('product-sellers-list');

    if (sellers.length > 0) {
        sellersList.innerHTML = sellers.map(f => {
            const firmName = f.getDisplayName ? f.getDisplayName() : (f.name || f.id);
            const inventory = f.productInventory?.get(product.id);
            const stockQty = inventory?.quantity || 0;
            const retailPrice = inventory?.retailPrice || product.basePrice;
            return `
                <a href="firms.html?id=${f.id}" class="firm-item firm-link">
                    <span class="firm-name">${firmName}</span>
                    <span class="firm-location">${f.city?.name || 'Unknown'}</span>
                    <span class="firm-stock">${stockQty} in stock</span>
                    <span class="firm-price">${formatCurrency(retailPrice)}</span>
                </a>
            `;
        }).join('');
    } else {
        sellersList.innerHTML = '<p class="empty-state">No retail sellers found</p>';
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
                ${breakdown.inputs.map(input => {
                    const inputProduct = simulation.productRegistry.getAllProducts().find(p => p.name === input.material);
                    const inputUnit = inputProduct?.unit || 'units';
                    return `
                        <div class="cost-input-item">
                            <span class="input-name">${input.material}</span>
                            <span class="input-detail">${input.quantity.toFixed(2)} ${inputUnit} × ${formatCurrency(input.unitCost)}</span>
                            <span class="input-total">${formatCurrency(input.totalCost)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="cost-summary-section">
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Material Cost</span>
                        <span class="stat-value">${formatCurrency(breakdown.totalMaterialCost)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Overhead (15%)</span>
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
                        <div class="margin-fill" style="width: ${Math.min(pct.overhead, 100)}%; background: #f39c12;"></div>
                    </div>
                    <div class="margin-legend">
                        <span><span class="legend-color" style="background:#3498db"></span> Materials ${pct.materials.toFixed(0)}%</span>
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
                const unit = a.product.unit || 'unit';
                return `
                    <div class="cost-analysis-row ${statusClass}" data-product-id="${a.product.id}">
                        <span class="col-product">${a.product.name}</span>
                        <span class="col-tier tier-${a.product.tier.toLowerCase()}">${a.product.tier}</span>
                        <span class="col-cost">${formatCurrency(a.calculatedCost)}/${unit}</span>
                        <span class="col-price">${formatCurrency(a.basePrice)}/${unit}</span>
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
