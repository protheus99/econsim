// js/core/corporations/Corporation.js
// Corporation class for the organic growth system
// Corporations have personas, goals, and roadmap — firms are created via the roadmap system

import { CorporateRoadmap } from './CorporateRoadmap.js';

/**
 * Corporation goal types
 */
export const GOAL_TYPES = {
    ESTABLISH_OPERATIONS: 'ESTABLISH_OPERATIONS',
    SECURE_SUPPLY: 'SECURE_SUPPLY',
    EXPAND_CAPACITY: 'EXPAND_CAPACITY',
    VERTICAL_INTEGRATION: 'VERTICAL_INTEGRATION',
    HORIZONTAL_EXPANSION: 'HORIZONTAL_EXPANSION',
    INCREASE_MARKET_SHARE: 'INCREASE_MARKET_SHARE',
    IMPROVE_PROFITABILITY: 'IMPROVE_PROFITABILITY',
    ENTER_NEW_MARKET: 'ENTER_NEW_MARKET',
    FULL_VERTICAL_MILESTONE: 'FULL_VERTICAL_MILESTONE'
};

/**
 * Corporation types
 */
export const CORPORATION_TYPES = {
    SPECIALIST: 'SPECIALIST',         // Single persona, focused
    HORIZONTAL: 'HORIZONTAL',         // Multiple personas, same tier
    VERTICAL: 'VERTICAL',             // Adjacent tier integration
    CONGLOMERATE: 'CONGLOMERATE',     // Industrial group (3+ tiers)
    FULL_VERTICAL: 'FULL_VERTICAL'    // RAW to RETAIL (rare)
};

/**
 * Industry tiers
 */
export const INDUSTRY_TIERS = {
    RAW: 'RAW',
    SEMI_RAW: 'SEMI_RAW',
    MANUFACTURED: 'MANUFACTURED',
    RETAIL: 'RETAIL',
    SERVICES: 'SERVICES'
};

/**
 * Corporation class
 * Represents a business entity that owns firms and makes strategic decisions
 */
export class Corporation {
    /**
     * @param {Object} config - Corporation configuration
     * @param {string} config.id - Unique identifier
     * @param {string} config.name - Corporation name
     * @param {string} config.abbreviation - 2-4 letter abbreviation
     * @param {string} config.type - Corporation type (SPECIALIST, VERTICAL, etc.)
     * @param {number} config.integrationLevel - Target integration level (0-4)
     * @param {Object} config.primaryPersona - Primary persona definition
     * @param {Array} config.secondaryPersonas - Secondary personas (optional)
     * @param {number} config.capital - Starting capital
     * @param {Object} config.attributes - Corporation attributes
     */
    constructor(config) {
        // Identity
        this.id = config.id;
        this.name = config.name;
        this.abbreviation = config.abbreviation;
        this.type = config.type || CORPORATION_TYPES.SPECIALIST;
        this.integrationLevel = config.integrationLevel || 0;
        this.color = config.color || this.generateColor(config.id);

        // Personas (what the corporation CAN do)
        this.primaryPersona = config.primaryPersona || null;
        this.secondaryPersonas = config.secondaryPersonas || [];

        // All personas for easy access
        this.personas = this.primaryPersona
            ? [this.primaryPersona, ...this.secondaryPersonas]
            : [];

        // Financial State
        this.capital = config.capital || 5000000;
        this.monthlyBudget = 0;
        this.debt = 0;
        this.creditRating = config.creditRating || 'A';

        // Operational State (starts empty - firms created organically)
        this.firms = [];
        this.firmIds = new Set(); // For quick lookup
        this.employees = 0;
        this.monthlyRevenue = 0;
        this.monthlyExpenses = 0;
        this.monthlyProfit = 0;
        this.monthlyHistory = [];
        this.cash = 0;
        this.revenue = 0;
        this.expenses = 0;
        this.profit = 0;

        // Contracts
        this.supplyContracts = [];
        this.salesContracts = [];

        // Goals (drives decisions)
        this.goals = {
            primary: GOAL_TYPES.ESTABLISH_OPERATIONS,
            targetFirms: config.targetFirms || this.calculateTargetFirms(),
            targetRevenue: config.targetRevenue || 10000000,
            targetMarketShare: config.targetMarketShare || 0.15,
            expansionPriority: this.type === CORPORATION_TYPES.VERTICAL ? 'VERTICAL' : 'HORIZONTAL',
            phase: 1,  // 1: Establishment, 2: Growth, 3: Maturity
            completedGoals: []
        };

        // Corporation Attributes (affect decision making)
        this.attributes = {
            riskTolerance: config.attributes?.riskTolerance ?? 0.5,
            qualityFocus: config.attributes?.qualityFocus ?? 0.5,
            efficiencyFocus: config.attributes?.efficiencyFocus ?? 0.5,
            growthOrientation: config.attributes?.growthOrientation ?? 0.6,
            integrationPreference: config.attributes?.integrationPreference ?? 0.5,
            contractPreference: config.attributes?.contractPreference ?? 0.6
        };

        // Roadmap — drives all strategic actions
        this.roadmap = new CorporateRoadmap();

        // Extended goal tracking
        this.currentGoal = GOAL_TYPES.ESTABLISH_OPERATIONS;
        this.goalStartMonth = 0;
        this.goalHistory = [];          // max 12 entries
        this.integrationMap = {         // firms owned per tier
            [INDUSTRY_TIERS.RAW]: [],
            [INDUSTRY_TIERS.SEMI_RAW]: [],
            [INDUSTRY_TIERS.MANUFACTURED]: [],
            [INDUSTRY_TIERS.RETAIL]: []
        };
        this.isFullyVertical = false;

        // Creation tracking
        this.createdAt = null;      // Game time when created
        this.firstFirmAt = null;    // Game time when first firm opened

        // Headquarters location (for taxation and other purposes)
        this.homeCountry = config.homeCountry || null;  // Country object or name
        this.homeCity = config.homeCity || null;        // City object or name
    }

    /**
     * Getter for backward compatibility with legacy code
     * Returns the firms array for code that expects 'facilities'
     */
    get facilities() {
        return this.firms;
    }

    /**
     * Generate a color based on corporation ID
     */
    generateColor(id) {
        const hue = (typeof id === 'number' ? id * 47 : id.charCodeAt(0) * 47) % 360;
        return `hsl(${hue}, 70%, 60%)`;
    }

    /**
     * Calculate target number of firms based on corporation type
     */
    calculateTargetFirms() {
        const baseFirms = {
            [CORPORATION_TYPES.SPECIALIST]: 3,
            [CORPORATION_TYPES.HORIZONTAL]: 5,
            [CORPORATION_TYPES.VERTICAL]: 6,
            [CORPORATION_TYPES.CONGLOMERATE]: 10,
            [CORPORATION_TYPES.FULL_VERTICAL]: 15
        };
        return baseFirms[this.type] || 3;
    }

    /**
     * Get the primary industry tier for this corporation
     */
    getPrimaryTier() {
        return this.primaryPersona?.tier || INDUSTRY_TIERS.RAW;
    }

    /**
     * Get all tiers this corporation operates in
     */
    getActiveTiers() {
        const tiers = new Set();
        for (const persona of this.personas) {
            if (persona.tier) {
                tiers.add(persona.tier);
            }
        }
        return Array.from(tiers);
    }

    /**
     * Get products this corporation focuses on
     */
    getFocusProducts() {
        const products = [];
        for (const persona of this.personas) {
            if (persona.products) {
                products.push(...persona.products);
            }
        }
        return [...new Set(products)];
    }

    /**
     * Check if corporation can produce a specific product
     */
    canProduce(productName) {
        return this.getFocusProducts().includes(productName);
    }

    /**
     * Add a firm to this corporation
     */
    addFirm(firm) {
        if (!this.firmIds.has(firm.id)) {
            this.firms.push(firm);
            this.firmIds.add(firm.id);
            firm.corporationId = this.id;
            firm.corporationAbbreviation = this.abbreviation;

            // Track first firm creation
            if (this.firms.length === 1) {
                this.firstFirmAt = Date.now();
            }

            this.updateStats();
            this.updateIntegrationMap();
        }
    }

    /**
     * Remove a firm from this corporation
     */
    removeFirm(firmId) {
        const index = this.firms.findIndex(f => f.id === firmId);
        if (index !== -1) {
            this.firms.splice(index, 1);
            this.firmIds.delete(firmId);
            this.updateStats();
        }
    }

    /**
     * Get firms by type
     */
    getFirmsByType(firmType) {
        return this.firms.filter(f => f.type === firmType);
    }

    /**
     * Get firms by tier
     */
    getFirmsByTier(tier) {
        return this.firms.filter(f => {
            if (tier === INDUSTRY_TIERS.RAW) {
                return f.type === 'MINING' || f.type === 'LOGGING' || f.type === 'FARM';
            }
            if (tier === INDUSTRY_TIERS.SEMI_RAW) {
                return f.type === 'MANUFACTURING' && f.isSemiRawProducer;
            }
            if (tier === INDUSTRY_TIERS.MANUFACTURED) {
                return f.type === 'MANUFACTURING' && !f.isSemiRawProducer;
            }
            if (tier === INDUSTRY_TIERS.RETAIL) {
                return f.type === 'RETAIL';
            }
            if (tier === INDUSTRY_TIERS.SERVICES) {
                return f.type === 'BANK';
            }
            return false;
        });
    }

    /**
     * Update aggregated statistics from firms
     */
    updateStats() {
        this.employees = 0;
        this.cash = 0;
        this.monthlyRevenue = 0;
        this.monthlyExpenses = 0;

        for (const firm of this.firms) {
            this.employees += firm.totalEmployees || 0;
            this.cash += firm.cash || 0;
            this.monthlyRevenue += firm.monthlyRevenue || 0;
            this.monthlyExpenses += firm.monthlyExpenses || 0;
        }

        this.monthlyProfit = this.monthlyRevenue - this.monthlyExpenses;
    }

    captureMonthlySnapshot(month, year) {
        this.monthlyHistory.push({
            month, year,
            revenue:   this.monthlyRevenue || 0,
            expenses:  this.monthlyExpenses || 0,
            profit:    this.monthlyProfit !== undefined ? this.monthlyProfit : (this.monthlyRevenue - this.monthlyExpenses),
            cash:      this.cash || 0,
            capital:   this.capital || 0,
            firmCount: this.firms.length,
            employees: this.employees || 0
        });
        if (this.monthlyHistory.length > 24) this.monthlyHistory.shift();
    }

    /**
     * Get available capital for investment
     */
    getAvailableCapital() {
        // Capital minus roadmap actions already in-progress
        const committedCapital = [
            ...this.roadmap.shortTerm,
            ...this.roadmap.mediumTerm
        ].reduce((sum, action) => sum + (action.cost || 0), 0);

        // 10% buffer based on risk tolerance
        const buffer = this.capital * (1 - this.attributes.riskTolerance) * 0.1;

        return Math.max(0, this.capital - committedCapital - buffer);
    }

    /**
     * Spend capital on an investment
     */
    spendCapital(amount, reason = '') {
        if (amount <= this.capital) {
            this.capital -= amount;
            return true;
        }
        return false;
    }

    /**
     * Add revenue to capital
     */
    addRevenue(amount) {
        this.capital += amount;
        this.revenue += amount;
    }

    /**
     * Check if corporation has met its primary goal
     */
    hasMetGoal(goalType) {
        return this.goals.completedGoals.includes(goalType);
    }

    /**
     * Mark a goal as completed
     */
    completeGoal(goalType) {
        if (!this.goals.completedGoals.includes(goalType)) {
            this.goals.completedGoals.push(goalType);
        }
    }

    /**
     * Advance to next phase if conditions are met
     */
    checkPhaseAdvancement() {
        const firmCount = this.firms.length;

        // Phase 1 -> 2: First firm operational
        if (this.goals.phase === 1 && firmCount >= 1) {
            this.goals.phase = 2;
            this.completeGoal(GOAL_TYPES.ESTABLISH_OPERATIONS);
            return true;
        }

        // Phase 2 -> 3: Target firms reached or 18 months
        if (this.goals.phase === 2 && firmCount >= this.goals.targetFirms) {
            this.goals.phase = 3;
            return true;
        }

        return false;
    }

    /**
     * Get current phase priorities
     */
    getPhasePriorities() {
        if (this.goals.phase === 1) {
            return [
                GOAL_TYPES.ESTABLISH_OPERATIONS,
                GOAL_TYPES.SECURE_SUPPLY,
                GOAL_TYPES.EXPAND_CAPACITY
            ];
        }
        if (this.goals.phase === 2) {
            return [
                GOAL_TYPES.EXPAND_CAPACITY,
                GOAL_TYPES.VERTICAL_INTEGRATION,
                GOAL_TYPES.ENTER_NEW_MARKET,
                GOAL_TYPES.INCREASE_MARKET_SHARE
            ];
        }
        // Phase 3: Maturity
        return [
            GOAL_TYPES.IMPROVE_PROFITABILITY,
            GOAL_TYPES.HORIZONTAL_EXPANSION,
            GOAL_TYPES.INCREASE_MARKET_SHARE,
            GOAL_TYPES.VERTICAL_INTEGRATION
        ];
    }

    /**
     * Set the current strategic goal.
     * @param {string} goalType - GOAL_TYPES value
     * @param {number} monthsElapsed
     */
    setGoal(goalType, monthsElapsed) {
        if (this.currentGoal !== goalType) {
            // Record previous goal in history
            this.goalHistory.push({
                goal: this.currentGoal,
                startMonth: this.goalStartMonth,
                endMonth: monthsElapsed,
                outcome: 'COMPLETED'
            });
            if (this.goalHistory.length > 12) this.goalHistory.shift();
            this.currentGoal = goalType;
            this.goalStartMonth = monthsElapsed;
        }
    }

    /**
     * Update integrationMap when a firm is added.
     * Checks all four tiers; sets isFullyVertical if all four are represented.
     */
    updateIntegrationMap() {
        this.integrationMap = {
            [INDUSTRY_TIERS.RAW]: [],
            [INDUSTRY_TIERS.SEMI_RAW]: [],
            [INDUSTRY_TIERS.MANUFACTURED]: [],
            [INDUSTRY_TIERS.RETAIL]: []
        };
        for (const firm of this.firms) {
            const tier = this._firmTier(firm);
            if (tier && this.integrationMap[tier]) {
                this.integrationMap[tier].push(firm.id);
            }
        }
        this.isFullyVertical = Object.values(this.integrationMap).every(arr => arr.length > 0);
    }

    _firmTier(firm) {
        if (firm.type === 'MINING' || firm.type === 'LOGGING' || firm.type === 'FARM') return INDUSTRY_TIERS.RAW;
        if (firm.type === 'MANUFACTURING' && firm.isSemiRawProducer) return INDUSTRY_TIERS.SEMI_RAW;
        if (firm.type === 'MANUFACTURING' && !firm.isSemiRawProducer) return INDUSTRY_TIERS.MANUFACTURED;
        if (firm.type === 'RETAIL') return INDUSTRY_TIERS.RETAIL;
        return null;
    }

    /**
     * Get serializable state for persistence
     */
    getSerializableState() {
        return {
            id: this.id,
            name: this.name,
            abbreviation: this.abbreviation,
            type: this.type,
            integrationLevel: this.integrationLevel,
            color: this.color,
            primaryPersona: this.primaryPersona,
            secondaryPersonas: this.secondaryPersonas,
            capital: this.capital,
            monthlyBudget: this.monthlyBudget,
            debt: this.debt,
            creditRating: this.creditRating,
            firmIds: Array.from(this.firmIds),
            employees: this.employees,
            monthlyRevenue: this.monthlyRevenue,
            monthlyExpenses: this.monthlyExpenses,
            monthlyProfit: this.monthlyProfit,
            monthlyHistory: this.monthlyHistory,
            cash: this.cash,
            revenue: this.revenue,
            expenses: this.expenses,
            profit: this.profit,
            supplyContracts: this.supplyContracts,
            salesContracts: this.salesContracts,
            goals: this.goals,
            attributes: this.attributes,
            roadmap: this.roadmap.getSerializableState(),
            currentGoal: this.currentGoal,
            goalStartMonth: this.goalStartMonth,
            goalHistory: this.goalHistory,
            integrationMap: this.integrationMap,
            isFullyVertical: this.isFullyVertical,
            createdAt: this.createdAt,
            firstFirmAt: this.firstFirmAt,
            homeCountry: this.homeCountry?.name || this.homeCountry,
            homeCity: this.homeCity?.name || this.homeCity
        };
    }

    /**
     * Restore state from persisted data
     */
    restoreState(state) {
        if (!state) return;

        this.capital = state.capital ?? this.capital;
        this.monthlyBudget = state.monthlyBudget ?? this.monthlyBudget;
        this.debt = state.debt ?? this.debt;
        this.creditRating = state.creditRating ?? this.creditRating;
        this.employees = state.employees ?? this.employees;
        this.monthlyRevenue = state.monthlyRevenue ?? this.monthlyRevenue;
        this.monthlyExpenses = state.monthlyExpenses ?? this.monthlyExpenses;
        this.monthlyProfit = state.monthlyProfit ?? this.monthlyProfit;
        if (state.monthlyHistory) this.monthlyHistory = state.monthlyHistory;
        this.cash = state.cash ?? this.cash;
        this.revenue = state.revenue ?? this.revenue;
        this.expenses = state.expenses ?? this.expenses;
        this.profit = state.profit ?? this.profit;

        if (state.supplyContracts) this.supplyContracts = state.supplyContracts;
        if (state.salesContracts) this.salesContracts = state.salesContracts;
        if (state.goals) this.goals = { ...this.goals, ...state.goals };
        if (state.attributes) this.attributes = { ...this.attributes, ...state.attributes };
        if (state.roadmap) this.roadmap.restoreFromJSON(state.roadmap);
        if (state.currentGoal) this.currentGoal = state.currentGoal;
        if (state.goalStartMonth !== undefined) this.goalStartMonth = state.goalStartMonth;
        if (state.goalHistory) this.goalHistory = state.goalHistory;
        if (state.integrationMap) this.integrationMap = state.integrationMap;
        if (state.isFullyVertical !== undefined) this.isFullyVertical = state.isFullyVertical;
        if (state.createdAt) this.createdAt = state.createdAt;
        if (state.firstFirmAt) this.firstFirmAt = state.firstFirmAt;
        if (state.homeCountry) this.homeCountry = state.homeCountry;
        if (state.homeCity) this.homeCity = state.homeCity;
    }
}
