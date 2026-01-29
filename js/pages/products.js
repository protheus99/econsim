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
}

init();
