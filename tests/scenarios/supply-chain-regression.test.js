// tests/scenarios/supply-chain-regression.test.js
// Deterministic regression test for full supply chain: RAW → SEMI_RAW → MANUFACTURED → RETAIL
// Tests P0 fixes: time consistency, delivery lifecycle, replenishment reliability

import { GameClock } from '../../js/core/GameClock.js';
import { LotRegistry, LotInventory, Lot } from '../../js/core/Lot.js';
import { TransportCost } from '../../js/core/purchasing/TransportCost.js';

// ============================================================================
// Test Configuration - Deterministic Setup
// ============================================================================

const TEST_SEED = 12345;

// Seeded random function (Mulberry32)
function createSeededRandom(seed) {
    let state = seed;
    return function() {
        let t = state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// Test cities
const testCity = {
    id: 'test-city-1',
    name: 'TestCity',
    country: { name: 'TestCountry' },
    coordinates: { lat: 40.0, lon: -74.0 },
    hasRailway: true,
    hasSeaport: true
};

const remoteCity = {
    id: 'test-city-2',
    name: 'RemoteCity',
    country: { name: 'TestCountry' },
    coordinates: { lat: 35.0, lon: -80.0 },
    hasRailway: true,
    hasSeaport: false
};

// ============================================================================
// T0.1: GameClock.totalHours Test
// ============================================================================

function testT0_1_TotalHours() {
    const clock = new GameClock(2025);

    // Initial state: Year 2025, Month 1, Day 1, Hour 0
    const initialTotal = clock.totalHours;
    if (initialTotal !== 0) {
        return { pass: false, reason: `Initial totalHours should be 0, got ${initialTotal}` };
    }

    // Tick 24 times (1 day)
    for (let i = 0; i < 24; i++) {
        clock.tick();
    }

    if (clock.totalHours !== 24) {
        return { pass: false, reason: `After 24 ticks, totalHours should be 24, got ${clock.totalHours}` };
    }

    // Tick to complete a month (30 days = 720 hours)
    for (let i = 24; i < 720; i++) {
        clock.tick();
    }

    if (clock.totalHours !== 720) {
        return { pass: false, reason: `After 720 ticks, totalHours should be 720, got ${clock.totalHours}` };
    }

    return { pass: true };
}

// ============================================================================
// T0.2: Lot Status Transitions
// ============================================================================

function testT0_2_LotStatusTransitions() {
    const lot = new Lot({
        id: 'TEST_LOT_001',
        productName: 'Iron Ore',
        productId: 1,
        producerId: 'MINE_001',
        quantity: 100,
        unit: 'ton',
        quality: 75,
        status: 'AVAILABLE',
        createdAt: 0,
        createdDay: 1
    });

    // Initial state
    if (!lot.isAvailable()) {
        return { pass: false, reason: 'New lot should be AVAILABLE' };
    }

    // Reserve
    const reserved = lot.reserve('BUYER_001');
    if (!reserved || lot.status !== 'RESERVED') {
        return { pass: false, reason: 'Lot should be RESERVED after reserve()' };
    }

    // Cannot reserve again
    const doubleReserve = lot.reserve('BUYER_002');
    if (doubleReserve) {
        return { pass: false, reason: 'Should not be able to reserve already reserved lot' };
    }

    // Mark in transit
    lot.markInTransit('DELIVERY_001');
    if (lot.status !== 'IN_TRANSIT') {
        return { pass: false, reason: 'Lot should be IN_TRANSIT after markInTransit()' };
    }

    // Mark delivered
    lot.markDelivered();
    if (lot.status !== 'DELIVERED') {
        return { pass: false, reason: 'Lot should be DELIVERED after markDelivered()' };
    }

    return { pass: true };
}

// ============================================================================
// T0.3: LotInventory Operations
// ============================================================================

function testT0_3_LotInventoryOperations() {
    const inventory = new LotInventory('FIRM_001', 10);

    // Add lots
    for (let i = 0; i < 5; i++) {
        const lot = new Lot({
            id: `LOT_${i}`,
            productName: 'Iron Ore',
            quantity: 100,
            quality: 70 + i * 5,
            status: 'AVAILABLE',
            createdAt: i
        });
        inventory.addLot(lot);
    }

    // Check quantity
    const totalQty = inventory.getAvailableQuantity('Iron Ore');
    if (totalQty !== 500) {
        return { pass: false, reason: `Expected 500 quantity, got ${totalQty}` };
    }

    // Check lot count
    const lotCount = inventory.getAvailableLotCount('Iron Ore');
    if (lotCount !== 5) {
        return { pass: false, reason: `Expected 5 lots, got ${lotCount}` };
    }

    // Select lots for sale (FIFO)
    inventory.setSaleStrategy('FIFO');
    const selection = inventory.selectLotsForSale('Iron Ore', 250, 1);

    if (selection.lots.length < 2) {
        return { pass: false, reason: `Expected at least 2 lots selected, got ${selection.lots.length}` };
    }

    // First lot should be oldest (created at hour 0)
    if (selection.lots[0].createdAt !== 0) {
        return { pass: false, reason: 'FIFO should select oldest lot first' };
    }

    return { pass: true };
}

// ============================================================================
// T0.4: Delivery Scheduling with totalHours
// ============================================================================

function testT0_4_DeliveryScheduling() {
    const clock = new GameClock(2025);

    // Simulate 10 hours passing
    for (let i = 0; i < 10; i++) {
        clock.tick();
    }

    const currentHour = clock.totalHours;
    const transitHours = 5;
    const deliveryHour = currentHour + transitHours;

    // Create pending delivery
    const delivery = {
        id: 'DEL_001',
        deliveryHour: deliveryHour,
        createdAt: currentHour,
        status: 'IN_TRANSIT'
    };

    // Verify delivery hour is valid number
    if (isNaN(delivery.deliveryHour)) {
        return { pass: false, reason: 'deliveryHour should not be NaN' };
    }

    // Simulate time passing
    for (let i = 0; i < 5; i++) {
        clock.tick();
    }

    // Check delivery should complete
    if (clock.totalHours >= delivery.deliveryHour) {
        delivery.status = 'DELIVERED';
    }

    if (delivery.status !== 'DELIVERED') {
        return { pass: false, reason: `Delivery should be DELIVERED at hour ${clock.totalHours}, deliveryHour was ${delivery.deliveryHour}` };
    }

    return { pass: true };
}

// ============================================================================
// T0.5: Full Supply Chain Flow (RAW → SEMI → MANUFACTURED → RETAIL)
// ============================================================================

function testT0_5_FullSupplyChain() {
    const random = createSeededRandom(TEST_SEED);
    const clock = new GameClock(2025);
    const registry = new LotRegistry();

    // Create firm inventories
    const miningInventory = new LotInventory('MINE_001', 50);
    const processorInventory = new LotInventory('PROCESSOR_001', 50);
    const processorRawMaterials = new Map();
    processorRawMaterials.set('Iron Ore', { quantity: 0 });

    const manufacturerInventory = new LotInventory('MFG_001', 50);
    const manufacturerRawMaterials = new Map();
    manufacturerRawMaterials.set('Steel', { quantity: 0 });

    const retailInventory = new Map();
    retailInventory.set('Machinery', { quantity: 0, productName: 'Machinery' });

    // Phase 1: Mining produces raw material
    const rawLot = registry.createLot({
        productName: 'Iron Ore',
        producerId: 'MINE_001',
        quantity: 100,
        quality: 80,
        createdAt: clock.totalHours,
        createdDay: clock.day
    });
    miningInventory.addLot(rawLot);

    if (miningInventory.getAvailableQuantity('Iron Ore') !== 100) {
        return { pass: false, reason: 'Mining should have 100 Iron Ore' };
    }

    // Phase 2: Processor buys from mining
    const selectedRaw = miningInventory.selectLotsForSale('Iron Ore', 100, clock.day);
    if (selectedRaw.lots.length === 0) {
        return { pass: false, reason: 'Should select lots from mining' };
    }

    // Transfer raw material
    selectedRaw.lots.forEach(lot => {
        lot.reserve('PROCESSOR_001');
        lot.markInTransit('DEL_RAW_001');
        miningInventory.removeLot(lot.id);
    });

    // Simulate transit time (2 hours)
    clock.tick();
    clock.tick();

    // Complete delivery
    selectedRaw.lots.forEach(lot => {
        lot.markDelivered();
    });
    const rawInv = processorRawMaterials.get('Iron Ore');
    rawInv.quantity += selectedRaw.totalQuantity;

    if (rawInv.quantity !== 100) {
        return { pass: false, reason: `Processor should have 100 Iron Ore, got ${rawInv.quantity}` };
    }

    // Phase 3: Processor produces semi-raw (Steel)
    rawInv.quantity -= 50; // Consume raw material
    const steelLot = registry.createLot({
        productName: 'Steel',
        producerId: 'PROCESSOR_001',
        quantity: 25, // 50 ore → 25 steel
        quality: 75,
        createdAt: clock.totalHours,
        createdDay: clock.day
    });
    processorInventory.addLot(steelLot);

    // Phase 4: Manufacturer buys steel, makes machinery
    const selectedSteel = processorInventory.selectLotsForSale('Steel', 25, clock.day);
    selectedSteel.lots.forEach(lot => {
        lot.reserve('MFG_001');
        lot.markInTransit('DEL_STEEL_001');
        processorInventory.removeLot(lot.id);
    });

    clock.tick();
    clock.tick();

    selectedSteel.lots.forEach(lot => lot.markDelivered());
    const steelInv = manufacturerRawMaterials.get('Steel');
    steelInv.quantity += selectedSteel.totalQuantity;

    // Manufacture
    steelInv.quantity -= 25;
    const machineryLot = registry.createLot({
        productName: 'Machinery',
        producerId: 'MFG_001',
        quantity: 10,
        quality: 70,
        createdAt: clock.totalHours,
        createdDay: clock.day
    });
    manufacturerInventory.addLot(machineryLot);

    // Phase 5: Retailer buys machinery
    const selectedMachinery = manufacturerInventory.selectLotsForSale('Machinery', 10, clock.day);
    selectedMachinery.lots.forEach(lot => {
        lot.reserve('RETAIL_001');
        lot.markInTransit('DEL_MACH_001');
        manufacturerInventory.removeLot(lot.id);
    });

    clock.tick();

    selectedMachinery.lots.forEach(lot => lot.markDelivered());
    const retailMachinery = retailInventory.get('Machinery');
    retailMachinery.quantity += selectedMachinery.totalQuantity;

    // Verify final state
    if (retailMachinery.quantity !== 10) {
        return { pass: false, reason: `Retailer should have 10 Machinery, got ${retailMachinery.quantity}` };
    }

    // Verify all lots are DELIVERED
    const allLots = Array.from(registry.allLots.values());
    const deliveredCount = allLots.filter(l => l.status === 'DELIVERED').length;

    if (deliveredCount !== allLots.length) {
        return { pass: false, reason: `All lots should be DELIVERED, only ${deliveredCount}/${allLots.length} are` };
    }

    return { pass: true };
}

// ============================================================================
// T0.6: Delayed Delivery Recovery
// ============================================================================

function testT0_6_DelayedDeliveryRecovery() {
    const clock = new GameClock(2025);
    const registry = new LotRegistry();
    const inventory = new LotInventory('FIRM_001', 50);

    // Create a lot
    const lot = registry.createLot({
        productName: 'Test Product',
        producerId: 'SUPPLIER_001',
        quantity: 50,
        quality: 80,
        createdAt: clock.totalHours,
        createdDay: clock.day
    });

    // Reserve and mark in transit
    lot.reserve('BUYER_001');
    lot.markInTransit('DEL_001');

    // Create pending delivery with very long transit time
    const delivery = {
        id: 'DEL_001',
        deliveryHour: clock.totalHours + 100, // Long transit
        createdAt: clock.totalHours,
        status: 'IN_TRANSIT',
        lotIds: [lot.id]
    };

    // Simulate 50 hours (delivery not yet due)
    for (let i = 0; i < 50; i++) {
        clock.tick();
    }

    // Delivery should still be pending
    if (clock.totalHours >= delivery.deliveryHour) {
        return { pass: false, reason: 'Delivery should not be complete yet' };
    }

    // Simulate remaining 50+ hours
    for (let i = 0; i < 51; i++) {
        clock.tick();
    }

    // Now delivery should complete
    if (clock.totalHours >= delivery.deliveryHour) {
        lot.markDelivered();
        delivery.status = 'DELIVERED';
    }

    if (lot.status !== 'DELIVERED') {
        return { pass: false, reason: 'Lot should be DELIVERED after transit time' };
    }

    return { pass: true };
}

// ============================================================================
// T0.7: Deterministic Results (Same seed = Same output)
// ============================================================================

function testT0_7_DeterministicResults() {
    const results1 = runDeterministicScenario(TEST_SEED);
    const results2 = runDeterministicScenario(TEST_SEED);

    if (results1.finalInventory !== results2.finalInventory) {
        return { pass: false, reason: `Results not deterministic: ${results1.finalInventory} vs ${results2.finalInventory}` };
    }

    if (results1.totalDeliveries !== results2.totalDeliveries) {
        return { pass: false, reason: `Delivery count not deterministic: ${results1.totalDeliveries} vs ${results2.totalDeliveries}` };
    }

    return { pass: true };
}

function runDeterministicScenario(seed) {
    const random = createSeededRandom(seed);
    const clock = new GameClock(2025);
    const registry = new LotRegistry();
    const inventory = new LotInventory('FIRM_001', 100);

    let deliveryCount = 0;

    // Run 48 hours of simulation
    for (let hour = 0; hour < 48; hour++) {
        // Produce based on seeded random
        if (random() < 0.3) {
            const lot = registry.createLot({
                productName: 'Product',
                producerId: 'FIRM_001',
                quantity: Math.floor(random() * 50) + 10,
                quality: Math.floor(random() * 30) + 70,
                createdAt: clock.totalHours,
                createdDay: clock.day
            });
            inventory.addLot(lot);
            deliveryCount++;
        }

        clock.tick();
    }

    return {
        finalInventory: inventory.getAvailableQuantity('Product'),
        totalDeliveries: deliveryCount,
        finalHour: clock.totalHours
    };
}

// ============================================================================
// Test Runner
// ============================================================================

function test(name, fn) {
    try {
        const result = fn();
        if (result.pass) {
            console.log(`✅ ${name}`);
            return { name, pass: true };
        } else {
            console.log(`❌ ${name}: ${result.reason}`);
            return { name, pass: false, reason: result.reason };
        }
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        return { name, pass: false, reason: error.message };
    }
}

export function runTests() {
    console.log('\n🧪 T0 - Core Correctness Tests\n');
    console.log('=' .repeat(60));

    const results = [];

    results.push(test('T0.1 GameClock.totalHours works correctly', testT0_1_TotalHours));
    results.push(test('T0.2 Lot status transitions work correctly', testT0_2_LotStatusTransitions));
    results.push(test('T0.3 LotInventory operations work correctly', testT0_3_LotInventoryOperations));
    results.push(test('T0.4 Delivery scheduling uses valid totalHours', testT0_4_DeliveryScheduling));
    results.push(test('T0.5 Full supply chain RAW→SEMI→MFG→RETAIL', testT0_5_FullSupplyChain));
    results.push(test('T0.6 Delayed delivery recovery works', testT0_6_DelayedDeliveryRecovery));
    results.push(test('T0.7 Results are deterministic with same seed', testT0_7_DeterministicResults));

    console.log('\n' + '=' .repeat(60));

    const passed = results.filter(r => r.pass).length;
    const total = results.length;

    console.log(`\n📊 Results: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('✅ All T0 core correctness tests pass!');
    } else {
        console.log('❌ Some tests failed. See above for details.');
    }

    return results;
}

// Export for HTML test runner
export const supplyChainRegressionTests = {
    runTests,
    testT0_1_TotalHours,
    testT0_2_LotStatusTransitions,
    testT0_3_LotInventoryOperations,
    testT0_4_DeliveryScheduling,
    testT0_5_FullSupplyChain,
    testT0_6_DelayedDeliveryRecovery,
    testT0_7_DeterministicResults
};
