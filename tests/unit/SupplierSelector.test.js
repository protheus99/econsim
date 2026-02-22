// tests/unit/SupplierSelector.test.js
// Unit tests for SupplierSelector class

import { SupplierSelector } from '../../js/core/purchasing/SupplierSelector.js';

// Mock simulation engine
const mockEngine = {
    firms: new Map(),
    productRegistry: {
        getProductByName: (name) => ({ basePrice: 100 })
    },
    relationshipManager: null
};

// Test firms
const miningFirm = {
    id: 'mine1',
    type: 'MINING',
    resourceType: 'Iron Ore',
    city: { id: 'cityA', name: 'CityA', country: { name: 'USA' } },
    lotInventory: {
        getLots: () => [
            { quantity: 50, quality: 0.9 },
            { quantity: 30, quality: 0.8 }
        ]
    }
};

const steelMill = {
    id: 'steel1',
    type: 'SteelMill',
    product: { name: 'Steel' },
    city: { id: 'cityA', name: 'CityA', country: { name: 'USA' } }
};

const foreignMine = {
    id: 'mine2',
    type: 'MINING',
    resourceType: 'Iron Ore',
    city: { id: 'cityB', name: 'CityB', country: { name: 'Germany' } },
    lotInventory: {
        getLots: () => [{ quantity: 100, quality: 0.85 }]
    }
};

// Add firms to mock engine
mockEngine.firms.set('mine1', miningFirm);
mockEngine.firms.set('mine2', foreignMine);
mockEngine.firms.set('steel1', steelMill);

// Test runner
function runTests() {
    const results = [];
    const selector = new SupplierSelector(mockEngine);

    // A2.1: firmProduces for mining
    results.push(test('A2.1 firmProduces mining with resourceType', () => {
        return selector.firmProduces(miningFirm, 'Iron Ore') === true;
    }));

    // A2.2: firmProduces for manufacturer
    results.push(test('A2.2 firmProduces manufacturer with product.name', () => {
        return selector.firmProduces(steelMill, 'Steel') === true;
    }));

    // A2.3: getInventory lot-based
    results.push(test('A2.3 getInventory lot-based returns sum', () => {
        const qty = selector.getInventory(miningFirm, 'Iron Ore');
        return qty === 80; // 50 + 30
    }));

    // A2.5: getLocationTier same city
    results.push(test('A2.5 getLocationTier same city = local', () => {
        const tier = selector.getLocationTier(miningFirm.city, steelMill.city);
        return tier === 'local';
    }));

    // A2.7: getLocationTier different country
    results.push(test('A2.7 getLocationTier different country = international', () => {
        const tier = selector.getLocationTier(foreignMine.city, steelMill.city);
        return tier === 'international';
    }));

    // A2.8: calculatePriceScore 30% below base
    results.push(test('A2.8 priceScore 30% below base = 100', () => {
        const score = selector.calculatePriceScore(70, 100);
        return score === 100;
    }));

    // A2.9: calculatePriceScore at base
    results.push(test('A2.9 priceScore at base = 70', () => {
        const score = selector.calculatePriceScore(100, 100);
        return score === 70;
    }));

    // A2.10: calculatePriceScore 50% above base
    results.push(test('A2.10 priceScore 50% above base = 0', () => {
        const score = selector.calculatePriceScore(150, 100);
        return score === 0;
    }));

    // A2.11: calculateTransportScore 0%
    results.push(test('A2.11 transportScore 0% = 100', () => {
        const score = selector.calculateTransportScore(0, 100, 10);
        return score === 100;
    }));

    // A2.13: normalizeRelationship -100
    results.push(test('A2.13 normalizeRelationship -100 = 0', () => {
        const norm = selector.normalizeRelationship(-100);
        return norm === 0;
    }));

    // A2.14: normalizeRelationship +100
    results.push(test('A2.14 normalizeRelationship +100 = 100', () => {
        const norm = selector.normalizeRelationship(100);
        return norm === 100;
    }));

    // A2.17: selectBest no suppliers
    results.push(test('A2.17 selectBest no suppliers = null', () => {
        const result = selector.selectBest({
            buyer: steelMill,
            productName: 'NonExistentProduct',
            quantity: 10
        });
        return result === null;
    }));

    // A2.18: categorizeByLocation
    results.push(test('A2.18 categorizeByLocation groups correctly', () => {
        const suppliers = [miningFirm, foreignMine];
        const groups = selector.categorizeByLocation(suppliers, steelMill.city);
        return groups.local.length === 1 &&
               groups.international.length === 1 &&
               groups.domestic.length === 0;
    }));

    // Print results
    console.log('\n=== SupplierSelector Tests ===\n');
    let passed = 0;
    let failed = 0;
    results.forEach(r => {
        if (r.passed) {
            console.log(`✓ ${r.name}`);
            passed++;
        } else {
            console.log(`✗ ${r.name}`);
            failed++;
        }
    });
    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

    return { passed, failed };
}

function test(name, fn) {
    try {
        const passed = fn();
        return { name, passed };
    } catch (e) {
        console.error(`Error in ${name}:`, e);
        return { name, passed: false, error: e };
    }
}

// Run if executed directly
if (typeof window === 'undefined') {
    runTests();
}

export { runTests };
