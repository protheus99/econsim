// tests/unit/TransportCost.test.js
// Unit tests for TransportCost class

import { TransportCost } from '../../js/core/purchasing/TransportCost.js';

// Test cities
const cityA = {
    id: 'cityA',
    name: 'New York',
    country: { name: 'USA' },
    coordinates: { lat: 40.7128, lon: -74.0060 },
    hasRailway: true,
    hasSeaport: true
};

const cityB = {
    id: 'cityB',
    name: 'Los Angeles',
    country: { name: 'USA' },
    coordinates: { lat: 34.0522, lon: -118.2437 },
    hasRailway: true,
    hasSeaport: true
};

const cityC = {
    id: 'cityC',
    name: 'Berlin',
    country: { name: 'Germany' },
    coordinates: { lat: 52.5200, lon: 13.4050 },
    hasRailway: true,
    hasSeaport: false
};

// Test runner
function runTests() {
    const results = [];

    // A1.1: Same city distance
    results.push(test('A1.1 Same city distance', () => {
        const dist = TransportCost.getDistance(cityA, cityA);
        return dist === 10;
    }));

    // A1.2: Distance with coordinates (NYC to LA ~3940 km)
    results.push(test('A1.2 Haversine distance NYC-LA', () => {
        const dist = TransportCost.getDistance(cityA, cityB);
        return dist > 3900 && dist < 4000;
    }));

    // A1.5: Haversine calculation
    results.push(test('A1.5 Haversine formula', () => {
        const dist = TransportCost.haversine(40.7128, -74.0060, 34.0522, -118.2437);
        return dist > 3900 && dist < 4000;
    }));

    // A1.6: Local delivery mode
    results.push(test('A1.6 Local delivery uses truck', () => {
        const result = TransportCost.calculate(cityA, cityA, 100);
        return result.mode === 'truck';
    }));

    // A1.9: Mode selection < 100km
    results.push(test('A1.9 Short distance selects truck', () => {
        const mode = TransportCost.selectBestMode(cityA, cityA, 50);
        return mode === 'truck';
    }));

    // A1.7: Domestic distance uses rail
    results.push(test('A1.7 Domestic 500km uses rail', () => {
        const mode = TransportCost.selectBestMode(cityA, cityB, 500);
        return mode === 'rail';
    }));

    // A1.11: International adds customs time
    results.push(test('A1.11 International adds customs delay', () => {
        const dist = 2000;
        const domesticTime = TransportCost.calculateTransitTime(dist, 'rail', cityA, cityB);
        const intlTime = TransportCost.calculateTransitTime(dist, 'rail', cityA, cityC);
        return intlTime > domesticTime; // Should be 8 hours more
    }));

    // A1.12: Compare options
    results.push(test('A1.12 compareOptions returns all modes', () => {
        const comparison = TransportCost.compareOptions(cityA, cityB, 100);
        return comparison.options.truck &&
               comparison.options.rail &&
               comparison.options.ship &&
               comparison.options.air &&
               comparison.cheapest;
    }));

    // Cost calculation test
    results.push(test('Cost calculation is proportional', () => {
        const result1 = TransportCost.calculate(cityA, cityB, 100);
        const result2 = TransportCost.calculate(cityA, cityB, 200);
        return result2.cost > result1.cost;
    }));

    // Print results
    console.log('\n=== TransportCost Tests ===\n');
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
