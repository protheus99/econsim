// tests/unit/organic-growth.test.js
// Tests for the organic corporation growth system

import { Corporation, CORPORATION_TYPES, INDUSTRY_TIERS, GOAL_TYPES } from '../../js/core/corporations/Corporation.js';
import { BoardMeeting, DECISION_TYPES, determineEconomicPhase } from '../../js/core/corporations/BoardMeeting.js';
import { CorporationManager, RAW_PERSONAS, SEMI_RAW_PERSONAS, MANUFACTURED_PERSONAS } from '../../js/core/corporations/CorporationManager.js';

// Test utilities
let testResults = [];

function test(name, fn) {
    try {
        fn();
        testResults.push({ name, passed: true });
        console.log(`✅ ${name}`);
    } catch (error) {
        testResults.push({ name, passed: false, error: error.message });
        console.log(`❌ ${name}: ${error.message}`);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

// Test Corporation class
function testCorporationCreation() {
    test('Corporation: can create with basic config', () => {
        const corp = new Corporation({
            id: 'TEST_CORP_1',
            name: 'Test Mining Corp',
            abbreviation: 'TMC',
            type: CORPORATION_TYPES.SPECIALIST,
            integrationLevel: 0,
            primaryPersona: {
                type: 'MINING_COMPANY',
                tier: INDUSTRY_TIERS.RAW,
                firmType: 'MINING',
                products: ['Iron Ore']
            },
            capital: 5000000
        });

        assertEqual(corp.id, 'TEST_CORP_1');
        assertEqual(corp.name, 'Test Mining Corp');
        assertEqual(corp.type, CORPORATION_TYPES.SPECIALIST);
        assertEqual(corp.capital, 5000000);
        assert(corp.firms.length === 0, 'Should start with no firms');
    });

    test('Corporation: can add and remove firms', () => {
        const corp = new Corporation({
            id: 'TEST_CORP_2',
            name: 'Test Corp',
            abbreviation: 'TC'
        });

        const mockFirm = {
            id: 'FIRM_1',
            totalEmployees: 100,
            cash: 50000,
            monthlyRevenue: 10000,
            monthlyExpenses: 8000
        };

        corp.addFirm(mockFirm);
        assertEqual(corp.firms.length, 1);
        assert(corp.firmIds.has('FIRM_1'));

        corp.removeFirm('FIRM_1');
        assertEqual(corp.firms.length, 0);
        assert(!corp.firmIds.has('FIRM_1'));
    });

    test('Corporation: calculates target firms based on type', () => {
        const specialist = new Corporation({
            id: 'SPEC_1',
            name: 'Specialist',
            abbreviation: 'SP',
            type: CORPORATION_TYPES.SPECIALIST
        });

        const conglomerate = new Corporation({
            id: 'CONG_1',
            name: 'Conglomerate',
            abbreviation: 'CG',
            type: CORPORATION_TYPES.CONGLOMERATE
        });

        assert(specialist.calculateTargetFirms() < conglomerate.calculateTargetFirms(),
            'Conglomerates should have more target firms than specialists');
    });

    test('Corporation: tracks phase progression', () => {
        const corp = new Corporation({
            id: 'PHASE_TEST',
            name: 'Phase Test Corp',
            abbreviation: 'PTC',
            type: CORPORATION_TYPES.SPECIALIST
        });

        assertEqual(corp.goals.phase, 1, 'Should start in phase 1');

        // Add a firm
        corp.addFirm({ id: 'FIRM_1', totalEmployees: 10 });
        corp.checkPhaseAdvancement();

        assertEqual(corp.goals.phase, 2, 'Should advance to phase 2 after first firm');
        assert(corp.hasMetGoal(GOAL_TYPES.ESTABLISH_OPERATIONS), 'Should complete establishment goal');
    });
}

// Test BoardMeeting class
function testBoardMeeting() {
    const mockEngine = {
        firms: new Map(),
        random: () => Math.random()
    };

    test('BoardMeeting: RAW corporations can always open firms', () => {
        const boardMeeting = new BoardMeeting(mockEngine);

        const rawCorp = new Corporation({
            id: 'RAW_CORP',
            name: 'Raw Corp',
            abbreviation: 'RC',
            type: CORPORATION_TYPES.SPECIALIST,
            primaryPersona: {
                type: 'MINING_COMPANY',
                tier: INDUSTRY_TIERS.RAW,
                firmType: 'MINING'
            },
            capital: 10000000
        });

        const marketState = {
            economicPhase: 'FOUNDATION',
            suppliers: [],
            buyers: [],
            firmCounts: { RAW: 0, SEMI_RAW: 0, MANUFACTURED: 0, RETAIL: 0 }
        };

        const meeting = boardMeeting.conductMeeting(rawCorp, marketState, { year: 2025, month: 1, day: 1 });

        // RAW corps should have OPEN_FIRM in approved projects
        const hasOpenFirm = meeting.approvedProjects.some(p => p.type === DECISION_TYPES.OPEN_FIRM);
        assert(hasOpenFirm, 'RAW corps should be able to open firms without supply dependencies');
    });

    test('BoardMeeting: RETAIL corps need supply before opening', () => {
        const boardMeeting = new BoardMeeting(mockEngine);

        const retailCorp = new Corporation({
            id: 'RETAIL_CORP',
            name: 'Retail Corp',
            abbreviation: 'RTC',
            type: CORPORATION_TYPES.SPECIALIST,
            primaryPersona: {
                type: 'SUPERMARKET',
                tier: INDUSTRY_TIERS.RETAIL,
                firmType: 'RETAIL',
                productsSold: ['Bread', 'Milk']
            },
            capital: 5000000
        });

        const marketState = {
            economicPhase: 'FOUNDATION',
            suppliers: [], // No suppliers
            buyers: [],
            firmCounts: { RAW: 0, SEMI_RAW: 0, MANUFACTURED: 0, RETAIL: 0 }
        };

        const meeting = boardMeeting.conductMeeting(retailCorp, marketState, { year: 2025, month: 1, day: 1 });

        // RETAIL corps should defer or sign supply contracts, not open immediately
        const hasDefer = meeting.approvedProjects.some(p =>
            p.type === DECISION_TYPES.DEFER || p.type === DECISION_TYPES.SIGN_SUPPLY_CONTRACT
        );
        assert(hasDefer, 'RETAIL corps should defer or sign contracts when no supply available');
    });
}

// Test economic phase determination
function testEconomicPhases() {
    test('Economic phase: FOUNDATION when only RAW firms', () => {
        const phase = determineEconomicPhase({
            firmCounts: { RAW: 10, SEMI_RAW: 0, MANUFACTURED: 0, RETAIL: 0 }
        });
        assertEqual(phase, 'FOUNDATION');
    });

    test('Economic phase: PROCESSING when SEMI_RAW emerging', () => {
        const phase = determineEconomicPhase({
            firmCounts: { RAW: 10, SEMI_RAW: 5, MANUFACTURED: 0, RETAIL: 0 }
        });
        assertEqual(phase, 'PROCESSING');
    });

    test('Economic phase: MANUFACTURING when consumer goods starting', () => {
        const phase = determineEconomicPhase({
            firmCounts: { RAW: 10, SEMI_RAW: 10, MANUFACTURED: 5, RETAIL: 0 }
        });
        assertEqual(phase, 'MANUFACTURING');
    });

    test('Economic phase: RETAIL when distribution starting', () => {
        const phase = determineEconomicPhase({
            firmCounts: { RAW: 10, SEMI_RAW: 10, MANUFACTURED: 10, RETAIL: 2 }
        });
        assertEqual(phase, 'RETAIL');
    });
}

// Test CorporationManager
function testCorporationManager() {
    const mockEngine = {
        config: {
            corporations: { firmsPerCorp: 4 },
            cities: { initial: 5 },
            firms: { perCity: { min: 5, max: 10 } }
        },
        random: () => Math.random(),
        firms: new Map(),
        cities: [{ id: 'CITY_1', name: 'Test City', country: {} }],
        firmGenerator: null,
        generateDeterministicId: (prefix, index) => `${prefix}_${index}`,
        firmCreationIndex: 0
    };

    test('CorporationManager: generates corporations with personas', () => {
        const manager = new CorporationManager(mockEngine);
        const corporations = manager.generateCorporations();

        assert(corporations.length > 0, 'Should generate at least one corporation');

        for (const corp of corporations) {
            assert(corp.primaryPersona, 'Each corporation should have a primary persona');
            assert(corp.type, 'Each corporation should have a type');
            assert(corp.capital > 0, 'Each corporation should have capital');
        }
    });

    test('CorporationManager: personas have correct tier distribution', () => {
        const manager = new CorporationManager(mockEngine);
        const corporations = manager.generateCorporations();

        const tierCounts = {};
        for (const corp of corporations) {
            const tier = corp.getPrimaryTier();
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        }

        // Should have some diversity in tiers
        const tiers = Object.keys(tierCounts);
        assert(tiers.length >= 2, 'Should have corporations in at least 2 tiers');
    });

    test('CorporationManager: calculates market state', () => {
        const manager = new CorporationManager(mockEngine);
        const marketState = manager.calculateMarketState();

        assert(marketState.firmCounts, 'Market state should have firm counts');
        assert(marketState.suppliers, 'Market state should have suppliers array');
        assert(marketState.buyers, 'Market state should have buyers array');
        assert(marketState.economicPhase, 'Market state should have economic phase');
    });
}

// Run all tests
function runTests() {
    console.log('\n=== Organic Growth System Tests ===\n');

    testCorporationCreation();
    testBoardMeeting();
    testEconomicPhases();
    testCorporationManager();

    console.log('\n=== Results ===');
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    console.log(`Passed: ${passed}/${testResults.length}`);
    console.log(`Failed: ${failed}/${testResults.length}`);

    if (failed > 0) {
        console.log('\nFailed tests:');
        testResults.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    return { passed, failed, total: testResults.length };
}

// Export for Node.js or run directly in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests };
} else if (typeof window !== 'undefined') {
    window.runOrganicGrowthTests = runTests;
}

export { runTests };
