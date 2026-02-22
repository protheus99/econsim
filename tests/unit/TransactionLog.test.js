// tests/unit/TransactionLog.test.js
// Unit tests for TransactionLog enhancements (Group B)

import { TransactionLog } from '../../js/core/TransactionLog.js';

// Mock firms
const miningFirm = {
    id: 'mine1',
    type: 'MINING',
    resourceType: 'Iron Ore',
    city: { name: 'CityA' },
    corporationId: 'corp1'
};

const steelMill = {
    id: 'steel1',
    type: 'SteelMill',
    product: { name: 'Steel' },
    city: { name: 'CityA' },
    corporationId: 'corp1'
};

const manufacturer = {
    id: 'mfg1',
    type: 'MANUFACTURING',
    product: { name: 'Tools' },
    city: { name: 'CityA' },
    corporationId: 'corp2'
};

const retailer = {
    id: 'retail1',
    type: 'RETAIL',
    storeType: 'Hardware',
    city: { name: 'CityA' },
    corporationId: 'corp3'
};

function runTests() {
    const results = [];

    // B1.1: CATEGORIES constants
    results.push(test('B1.1 CATEGORIES has all 7 types', () => {
        const cats = TransactionLog.CATEGORIES;
        return cats.B2B_RAW && cats.B2B_SEMI && cats.B2B_MANUFACTURED &&
               cats.B2B_WHOLESALE && cats.B2C_RETAIL && cats.GLOBAL_MARKET && cats.CONTRACT;
    }));

    // B1.2: RAW_PRODUCER_TYPES includes MINING
    results.push(test('B1.2 RAW_PRODUCER_TYPES includes MINING', () => {
        return TransactionLog.RAW_PRODUCER_TYPES.includes('MINING');
    }));

    // Create fresh log for each set of tests
    const log = new TransactionLog();

    // B1.3: categorize GLOBAL_MARKET
    results.push(test('B1.3 categorize GLOBAL_MARKET type', () => {
        const tx = { type: 'GLOBAL_MARKET' };
        return log.categorize(tx) === 'GLOBAL_MARKET';
    }));

    // B1.4: categorize with contractId
    results.push(test('B1.4 categorize with contractId = CONTRACT', () => {
        const tx = { type: 'B2B', contractId: 'contract123' };
        return log.categorize(tx) === 'CONTRACT';
    }));

    // B1.5: categorize CONSUMER_SALE
    results.push(test('B1.5 categorize CONSUMER_SALE = B2C_RETAIL', () => {
        const tx = { type: 'CONSUMER_SALE' };
        return log.categorize(tx) === 'B2C_RETAIL';
    }));

    // B1.6: categorize MINING seller
    results.push(test('B1.6 categorize MINING seller = B2B_RAW', () => {
        const tx = { sellerType: 'MINING', buyerType: 'SteelMill' };
        return log.categorize(tx) === 'B2B_RAW';
    }));

    // B1.7: categorize SteelMill seller
    results.push(test('B1.7 categorize SteelMill seller = B2B_SEMI', () => {
        const tx = { sellerType: 'SteelMill', buyerType: 'MANUFACTURING' };
        return log.categorize(tx) === 'B2B_SEMI';
    }));

    // B1.8: categorize MANUFACTURING to RETAIL
    results.push(test('B1.8 categorize MANUFACTURING to RETAIL = B2B_WHOLESALE', () => {
        const tx = { sellerType: 'MANUFACTURING', buyerType: 'RETAIL' };
        return log.categorize(tx) === 'B2B_WHOLESALE';
    }));

    // B1.9: categorize MANUFACTURING to MANUFACTURING
    results.push(test('B1.9 categorize MANUFACTURING to MANUFACTURING = B2B_MANUFACTURED', () => {
        const tx = { sellerType: 'MANUFACTURING', buyerType: 'MANUFACTURING' };
        return log.categorize(tx) === 'B2B_MANUFACTURED';
    }));

    // B1.10: logB2BSale with lot info
    results.push(test('B1.10 logB2BSale includes lot info', () => {
        const tx = log.logB2BSale(miningFirm, steelMill, 'Iron Ore', 100, 50, {
            lotInfo: { id: 'lot123', quality: 0.9 }
        });
        return tx.lotId === 'lot123' && tx.lotQuality === 0.9;
    }));

    // B1.11: logB2BSale with contractId
    results.push(test('B1.11 logB2BSale includes contractId', () => {
        const tx = log.logB2BSale(miningFirm, steelMill, 'Iron Ore', 100, 50, {
            contractId: 'contract456'
        });
        return tx.contractId === 'contract456';
    }));

    // B1.12: logB2BSale sets category
    results.push(test('B1.12 logB2BSale sets category', () => {
        const tx = log.logB2BSale(miningFirm, steelMill, 'Iron Ore', 100, 50);
        return tx.category === 'B2B_RAW';
    }));

    // B1.13: logRetailSale basic
    results.push(test('B1.13 logRetailSale creates B2C_RETAIL', () => {
        const tx = log.logRetailSale(retailer, 'Tools', 5, 25);
        return tx.category === 'B2C_RETAIL' && tx.type === 'RETAIL_SALE';
    }));

    // B1.14: logRetailSale with lot info
    results.push(test('B1.14 logRetailSale includes lot info', () => {
        const tx = log.logRetailSale(retailer, 'Tools', 5, 25, {
            lotInfo: { id: 'retaillot', quality: 0.85 }
        });
        return tx.lotId === 'retaillot' && tx.lotQuality === 0.85;
    }));

    // B1.15: logGlobalMarketPurchase
    results.push(test('B1.15 logGlobalMarketPurchase creates GLOBAL_MARKET', () => {
        const tx = log.logGlobalMarketPurchase(steelMill, 'Iron Ore', 200, 60);
        return tx.category === 'GLOBAL_MARKET' && tx.type === 'GLOBAL_MARKET';
    }));

    // B1.16: getByCategory
    results.push(test('B1.16 getByCategory returns filtered list', () => {
        const rawTxs = log.getByCategory('B2B_RAW');
        return rawTxs.length > 0 && rawTxs.every(tx =>
            tx.category === 'B2B_RAW' || log.categorize(tx) === 'B2B_RAW'
        );
    }));

    // B1.17: getByCategory respects limit
    results.push(test('B1.17 getByCategory respects limit', () => {
        // Add many transactions
        for (let i = 0; i < 20; i++) {
            log.logB2BSale(miningFirm, steelMill, 'Iron Ore', 10, 50);
        }
        const limited = log.getByCategory('B2B_RAW', 5);
        return limited.length <= 5;
    }));

    // B1.21: getSummaryByCategory
    results.push(test('B1.21 getSummaryByCategory returns stats', () => {
        const summary = log.getSummaryByCategory();
        return summary.B2B_RAW &&
               typeof summary.B2B_RAW.count === 'number' &&
               typeof summary.B2B_RAW.value === 'number' &&
               typeof summary.B2B_RAW.volume === 'number';
    }));

    // B1.22: getCategoryDisplay
    results.push(test('B1.22 getCategoryDisplay B2B_RAW', () => {
        const display = TransactionLog.getCategoryDisplay('B2B_RAW');
        return display.label && display.icon && display.colorClass;
    }));

    // B1.23: getCategoryDisplay unknown
    results.push(test('B1.23 getCategoryDisplay unknown returns default', () => {
        const display = TransactionLog.getCategoryDisplay('UNKNOWN_CATEGORY');
        return display.label === 'UNKNOWN_CATEGORY' && display.colorClass === 'tx-other';
    }));

    // B1.18: getForFirm as seller
    results.push(test('B1.18 getForFirm returns seller transactions', () => {
        const txs = log.getForFirm('mine1', 24);
        return txs.some(tx => tx.seller?.id === 'mine1');
    }));

    // B1.19: getForFirm as buyer
    results.push(test('B1.19 getForFirm returns buyer transactions', () => {
        const txs = log.getForFirm('steel1', 24);
        return txs.some(tx => tx.buyer?.id === 'steel1');
    }));

    // Print results
    console.log('\n=== TransactionLog Tests ===\n');
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
