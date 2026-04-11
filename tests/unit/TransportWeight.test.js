// tests/unit/TransportWeight.test.js
// Verifies transport cost is correctly weighted by product type
// Target benchmarks (rail, 500 units, 500 km):
//   Iron Ore  (~$25,000 value) → transport ~$4,000  = 16%
//   Coal      (~$20,000 value) → transport ~$4,000  = 20%
//   Shirts    (~$12,500 value) → transport    ~$0.8  < 0.01%
//   Tires     (~$24,000 value) → transport   ~$16   < 0.1%

import { TransportCost } from '../../js/core/purchasing/TransportCost.js';

// Coordinates use x=lon, y=lat passed to haversine. 4.5° lat = ~500 km.
const CITY_A = { id: 'A', name: 'CityA', country: { name: 'Ruritania' }, hasRailway: true, hasSeaport: false, isCoastal: false, coordinates: { x: 0, y: 0 } };
const CITY_B = { id: 'B', name: 'CityB', country: { name: 'Ruritania' }, hasRailway: true, hasSeaport: false, isCoastal: false, coordinates: { x: 0, y: 4.5 } };
// International coastal pair for ship-mode tests
const CITY_A_COAST = { id: 'AC', name: 'PortA', country: { name: 'Ruritania' }, hasRailway: true, hasSeaport: true, isCoastal: true, coordinates: { x: 0, y: 0 } };
const CITY_C = { id: 'C', name: 'CityC', country: { name: 'Freedonia' }, hasRailway: true, hasSeaport: true, isCoastal: true, coordinates: { x: 20, y: 0 } };

function approxEqual(a, b, tolerancePct = 0.05) {
    return Math.abs(a - b) / b <= tolerancePct;
}

const results = [];
function test(name, fn) {
    try {
        fn();
        results.push({ name, passed: true });
        console.log(`✓ ${name}`);
    } catch (e) {
        results.push({ name, passed: false, error: e.message });
        console.log(`✗ ${name}: ${e.message}`);
    }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

// --- Rate sanity checks ---

test('T-W1: Iron Ore 500 units 500km rail transport = 10-25% of product value', () => {
    // Iron Ore: weight=1000 kg/unit, basePrice=$50
    const t = TransportCost.calculate(CITY_A, CITY_B, 500, 1000, 'rail');
    const productValue = 500 * 50;
    const pct = t.cost / productValue;
    assert(pct >= 0.10 && pct <= 0.25, `Expected 10-25%, got ${(pct*100).toFixed(1)}% (cost=$${t.cost.toFixed(0)})`);
});

test('T-W2: Coal 1000 units 500km rail transport = 10-25% of product value', () => {
    // Coal: weight=1000 kg/unit, basePrice=$40
    const t = TransportCost.calculate(CITY_A, CITY_B, 1000, 1000, 'rail');
    const productValue = 1000 * 40;
    const pct = t.cost / productValue;
    assert(pct >= 0.10 && pct <= 0.25, `Expected 10-25%, got ${(pct*100).toFixed(1)}%`);
});

test('T-W3: Shirts 500 units 500km rail transport < 0.1% of product value', () => {
    // Shirts: weight=0.2 kg/unit, basePrice=$25
    const t = TransportCost.calculate(CITY_A, CITY_B, 500, 0.2, 'rail');
    const productValue = 500 * 25;
    const pct = t.cost / productValue;
    assert(pct < 0.001, `Expected <0.1%, got ${(pct*100).toFixed(4)}%`);
});

test('T-W4: Tires 200 units 500km rail transport < 0.5% of product value', () => {
    // Tires: weight=10 kg/unit, basePrice=$120
    const t = TransportCost.calculate(CITY_A, CITY_B, 200, 10, 'rail');
    const productValue = 200 * 120;
    const pct = t.cost / productValue;
    assert(pct < 0.005, `Expected <0.5%, got ${(pct*100).toFixed(3)}%`);
});

test('T-W5: Gold Ore (0.031 kg/oz) has negligible transport cost', () => {
    // Gold Ore: weight=0.031 kg/oz, basePrice=$500
    const t = TransportCost.calculate(CITY_A, CITY_B, 250, 0.031, 'air');
    const productValue = 250 * 500;
    const pct = t.cost / productValue;
    assert(pct < 0.001, `Expected <0.1%, got ${(pct*100).toFixed(4)}%`);
});

test('T-W6: Cattle 20 head 300km truck has non-trivial cost', () => {
    // Cattle: weight=500 kg/head, basePrice=$1200
    const cityNear = { ...CITY_B, coordinates: { x: 300, y: 500 } };
    const t = TransportCost.calculate(CITY_A, cityNear, 20, 500, 'truck');
    const productValue = 20 * 1200;
    const pct = t.cost / productValue;
    // Should be between 0.3% and 5%
    assert(pct >= 0.003 && pct <= 0.05, `Expected 0.3-5%, got ${(pct*100).toFixed(2)}%`);
});

// --- Mode selection ---

test('T-W7: Same city returns distance ~10', () => {
    const d = TransportCost.getDistance(CITY_A, CITY_A);
    assert(d === 10, `Expected 10, got ${d}`);
});

test('T-W8: International coastal route selects ship', () => {
    const mode = TransportCost.selectBestMode(CITY_A_COAST, CITY_C, 2000);
    assert(mode === 'ship', `Expected ship, got ${mode}`);
});

test('T-W9: Short domestic route selects truck', () => {
    const mode = TransportCost.selectBestMode(CITY_A, CITY_B, 50);
    assert(mode === 'truck', `Expected truck, got ${mode}`);
});

// --- Cost ordering ---

test('T-W10: Ship cheaper per unit than rail for international bulk', () => {
    const ship = TransportCost.calculate(CITY_A_COAST, CITY_C, 1000, 1000, 'ship');
    const rail  = TransportCost.calculate(CITY_A_COAST, CITY_C, 1000, 1000, 'rail');
    assert(ship.cost < rail.cost, `Ship ($${ship.cost}) should be cheaper than rail ($${rail.cost})`);
});

test('T-W11: Air more expensive than truck for domestic', () => {
    const truck = TransportCost.calculate(CITY_A, CITY_B, 100, 10, 'truck');
    const air   = TransportCost.calculate(CITY_A, CITY_B, 100, 10, 'air');
    assert(air.cost > truck.cost, `Air ($${air.cost}) should exceed truck ($${truck.cost})`);
});

test('T-W12: Heavy products cost more than light products (same route)', () => {
    const heavy = TransportCost.calculate(CITY_A, CITY_B, 100, 1000, 'rail'); // bulk ore
    const light = TransportCost.calculate(CITY_A, CITY_B, 100, 0.2,  'rail'); // shirts
    assert(heavy.cost > light.cost * 100, `Ore transport should be 100x+ shirt transport`);
});

// --- Results summary ---
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
