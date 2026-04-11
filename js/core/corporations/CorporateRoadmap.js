// js/core/corporations/CorporateRoadmap.js
// Goal-driven corporate roadmap system — replaces BoardMeeting
// Three planning horizons: SHORT (0-3mo), MEDIUM (3-12mo), LONG (12+mo)

import { DECISION_TYPES, FIRM_CREATION_TIMELINE, CAPITAL_REQUIREMENTS } from './BoardMeeting.js';

// Inlined to avoid circular dependency with Corporation.js
const INDUSTRY_TIERS = {
    RAW: 'RAW', SEMI_RAW: 'SEMI_RAW', MANUFACTURED: 'MANUFACTURED',
    RETAIL: 'RETAIL', SERVICES: 'SERVICES'
};
const GOAL_TYPES = {
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

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const ROAD_HORIZON = {
    SHORT:  'SHORT',   // 0-3 months: execute directly
    MEDIUM: 'MEDIUM',  // 3-12 months: queued until prerequisites met
    LONG:   'LONG'     // 12+ months: strategic intent, decomposes into MEDIUM
};

export const ACTION_STATUS = {
    PENDING:     'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED:   'COMPLETED',
    CANCELLED:   'CANCELLED'
};

// Persona-to-persona downstream supply chain mapping
// "If you operate persona X, what persona makes sense DOWN the chain?"
export const DOWNSTREAM_MAP = {
    MINING_COMPANY:            ['STEEL_PROCESSING', 'METAL_PROCESSING', 'PETROLEUM_REFINERY', 'GLASS_MANUFACTURING', 'CHEMICAL_PRODUCTION'],
    LOGGING_COMPANY:           ['LUMBER_MILL'],
    FARM_CROP:                 ['FOOD_INGREDIENT_PROCESSOR', 'TEXTILE_MILL'],
    FARM_LIVESTOCK:            ['MEAT_PROCESSOR', 'DAIRY_PROCESSOR'],
    STEEL_PROCESSING:          ['APPLIANCE', 'FURNITURE', 'AUTO_PARTS'],
    METAL_PROCESSING:          ['ELECTRONICS', 'APPLIANCE'],
    PETROLEUM_REFINERY:        ['CHEMICAL_PRODUCTION'],
    FOOD_INGREDIENT_PROCESSOR: ['PACKAGED_FOOD', 'BEVERAGE'],
    DAIRY_PROCESSOR:           ['PACKAGED_FOOD'],
    MEAT_PROCESSOR:            ['PACKAGED_FOOD'],
    TEXTILE_MILL:              ['CLOTHING'],
    LUMBER_MILL:               ['FURNITURE'],
    PACKAGED_FOOD:             ['SUPERMARKET', 'CONVENIENCE_STORE', 'DISCOUNT_GROCERY'],
    BEVERAGE:                  ['SUPERMARKET', 'CONVENIENCE_STORE'],
    CLOTHING:                  ['FASHION_RETAIL'],
    ELECTRONICS:               ['ELECTRONICS_RETAIL'],
    FURNITURE:                 ['HOME_GOODS_RETAIL'],
    APPLIANCE:                 ['HOME_GOODS_RETAIL', 'ELECTRONICS_RETAIL'],
};

// Build UPSTREAM_MAP as the reverse of DOWNSTREAM_MAP
export const UPSTREAM_MAP = (() => {
    const map = {};
    for (const [upstream, downstreams] of Object.entries(DOWNSTREAM_MAP)) {
        for (const ds of downstreams) {
            if (!map[ds]) map[ds] = [];
            if (!map[ds].includes(upstream)) map[ds].push(upstream);
        }
    }
    return map;
})();

// Tier order for integration path calculations
const TIER_ORDER = [INDUSTRY_TIERS.RAW, INDUSTRY_TIERS.SEMI_RAW, INDUSTRY_TIERS.MANUFACTURED, INDUSTRY_TIERS.RETAIL];

// Per-persona tier mapping
const PERSONA_TIER = {
    MINING_COMPANY: INDUSTRY_TIERS.RAW, LOGGING_COMPANY: INDUSTRY_TIERS.RAW,
    FARM_CROP: INDUSTRY_TIERS.RAW, FARM_LIVESTOCK: INDUSTRY_TIERS.RAW,
    STEEL_PROCESSING: INDUSTRY_TIERS.SEMI_RAW, METAL_PROCESSING: INDUSTRY_TIERS.SEMI_RAW,
    PETROLEUM_REFINERY: INDUSTRY_TIERS.SEMI_RAW, FOOD_INGREDIENT_PROCESSOR: INDUSTRY_TIERS.SEMI_RAW,
    DAIRY_PROCESSOR: INDUSTRY_TIERS.SEMI_RAW, MEAT_PROCESSOR: INDUSTRY_TIERS.SEMI_RAW,
    TEXTILE_MILL: INDUSTRY_TIERS.SEMI_RAW, LUMBER_MILL: INDUSTRY_TIERS.SEMI_RAW,
    GLASS_MANUFACTURING: INDUSTRY_TIERS.SEMI_RAW, CHEMICAL_PRODUCTION: INDUSTRY_TIERS.SEMI_RAW,
    RUBBER_PROCESSOR: INDUSTRY_TIERS.SEMI_RAW,
    PACKAGED_FOOD: INDUSTRY_TIERS.MANUFACTURED, BEVERAGE: INDUSTRY_TIERS.MANUFACTURED,
    CLOTHING: INDUSTRY_TIERS.MANUFACTURED, ELECTRONICS: INDUSTRY_TIERS.MANUFACTURED,
    APPLIANCE: INDUSTRY_TIERS.MANUFACTURED, FURNITURE: INDUSTRY_TIERS.MANUFACTURED,
    AUTO_PARTS: INDUSTRY_TIERS.MANUFACTURED, VEHICLE: INDUSTRY_TIERS.MANUFACTURED,
    HARDWARE: INDUSTRY_TIERS.MANUFACTURED, CLEANING_PRODUCTS: INDUSTRY_TIERS.MANUFACTURED,
    HEALTH_PRODUCTS: INDUSTRY_TIERS.MANUFACTURED, BEAUTY_PRODUCTS: INDUSTRY_TIERS.MANUFACTURED,
    BABY_PRODUCTS: INDUSTRY_TIERS.MANUFACTURED, ACCESSORIES: INDUSTRY_TIERS.MANUFACTURED,
    RECREATION: INDUSTRY_TIERS.MANUFACTURED,
    SUPERMARKET: INDUSTRY_TIERS.RETAIL, CONVENIENCE_STORE: INDUSTRY_TIERS.RETAIL,
    DISCOUNT_GROCERY: INDUSTRY_TIERS.RETAIL, PHARMACY: INDUSTRY_TIERS.RETAIL,
    ELECTRONICS_RETAIL: INDUSTRY_TIERS.RETAIL, FASHION_RETAIL: INDUSTRY_TIERS.RETAIL,
    HOME_GOODS_RETAIL: INDUSTRY_TIERS.RETAIL, AUTO_RETAIL: INDUSTRY_TIERS.RETAIL,
    HARDWARE_RETAIL: INDUSTRY_TIERS.RETAIL
};

// Capital multipliers for organic growth
const INTEGRATION_COST_MULTIPLIER = 1.25; // 25% premium to build a tier-adjacent firm

// ─────────────────────────────────────────────────────────────────────────────
// CorporateRoadmap
// ─────────────────────────────────────────────────────────────────────────────

export class CorporateRoadmap {
    constructor() {
        this.shortTerm  = [];   // execute this month
        this.mediumTerm = [];   // promote when prerequisites met
        this.longTerm   = [];   // strategic intent, decompose later
        this.completedActions = [];     // rolling 24-entry cap
        this._actionCounter = 0;
    }

    // ─── Seeding ─────────────────────────────────────────────────────────────

    /**
     * Seed a brand-new corporation's roadmap based on its primary tier.
     * Called once, immediately after corporation creation.
     */
    seed(corp, marketState, monthsElapsed) {
        const tier = corp.primaryPersona?.tier || INDUSTRY_TIERS.RAW;
        const persona = corp.primaryPersona;
        if (!persona) return;

        // Every corp: open first firm immediately (short-term)
        this.addAction({
            type: DECISION_TYPES.OPEN_FIRM,
            horizon: ROAD_HORIZON.SHORT,
            scheduledMonth: monthsElapsed,
            persona,
            tier,
            goal: GOAL_TYPES.ESTABLISH_OPERATIONS,
            rationale: 'Open first firm to establish operations'
        });

        // Tier-staggered second firm (medium-term)
        const secondFirmDelay = this._startupDelayForTier(tier);
        this.addAction({
            type: DECISION_TYPES.OPEN_FIRM,
            horizon: ROAD_HORIZON.MEDIUM,
            scheduledMonth: monthsElapsed + secondFirmDelay,
            persona,
            tier,
            goal: GOAL_TYPES.EXPAND_CAPACITY,
            rationale: 'Open second firm to build capacity'
        });
    }

    /** How many months to delay the second firm opening based on tier */
    _startupDelayForTier(tier) {
        switch (tier) {
            case INDUSTRY_TIERS.RAW:          return 3;
            case INDUSTRY_TIERS.SEMI_RAW:     return 4;
            case INDUSTRY_TIERS.MANUFACTURED: return 6;
            case INDUSTRY_TIERS.RETAIL:       return 9;
            default:                          return 6;
        }
    }

    // ─── Monthly Update ───────────────────────────────────────────────────────

    /**
     * Main monthly update — promotes actions, evaluates goal transitions.
     * Returns list of actions ready to execute this month.
     */
    update(corp, marketState, monthsElapsed) {
        // 1. Promote medium → short when prerequisites satisfied
        this._promoteActions(corp, marketState, monthsElapsed);

        // 2. Promote long → medium when viable
        this._decomposeLongTerm(corp, marketState, monthsElapsed);

        // 3. Evaluate strategic goals and add new actions if needed
        this._evaluateGoals(corp, marketState, monthsElapsed);

        // 4. Return SHORT actions that are ready
        return this.getReadyActions(monthsElapsed);
    }

    /**
     * Promote MEDIUM actions to SHORT when their prerequisites are met.
     */
    _promoteActions(corp, marketState, monthsElapsed) {
        const firmCounts = marketState.firmCounts || {};

        for (const action of [...this.mediumTerm]) {
            if (action.status !== ACTION_STATUS.PENDING) continue;

            const ready = this._isPrerequisiteMet(action, corp, firmCounts, monthsElapsed);
            if (ready) {
                this.mediumTerm.splice(this.mediumTerm.indexOf(action), 1);
                action.horizon = ROAD_HORIZON.SHORT;
                this.shortTerm.push(action);
            }
        }
    }

    /**
     * Check if an action's prerequisites are satisfied.
     */
    _isPrerequisiteMet(action, corp, firmCounts, monthsElapsed) {
        // Scheduled month elapsed
        if (monthsElapsed < action.scheduledMonth) return false;

        const tier = action.tier;

        // For ESTABLISH_OPERATIONS: always ready once scheduled
        if (action.goal === GOAL_TYPES.ESTABLISH_OPERATIONS) return true;

        // For tier-gated actions: require at least 1 firm in the prerequisite tier
        if (tier === INDUSTRY_TIERS.SEMI_RAW) {
            return (firmCounts[INDUSTRY_TIERS.RAW] || 0) > 0 || monthsElapsed >= 3;
        }
        if (tier === INDUSTRY_TIERS.MANUFACTURED) {
            return (firmCounts[INDUSTRY_TIERS.SEMI_RAW] || 0) > 0 || monthsElapsed >= 6;
        }
        if (tier === INDUSTRY_TIERS.RETAIL) {
            return (firmCounts[INDUSTRY_TIERS.MANUFACTURED] || 0) > 0 || monthsElapsed >= 9;
        }

        // VERTICAL_INTEGRATION actions: check if corp has firms in adjacent tier
        if (action.goal === GOAL_TYPES.VERTICAL_INTEGRATION) {
            const srcTier = action.sourceTier;
            if (srcTier) {
                return (corp.getFirmsByTier?.(srcTier)?.length || 0) > 0;
            }
        }

        // IMPROVE_PROFITABILITY actions: always execute immediately
        if (action.goal === GOAL_TYPES.IMPROVE_PROFITABILITY) return true;

        return true;
    }

    /**
     * Decompose LONG-term actions into MEDIUM-term when capital/timing is right.
     */
    _decomposeLongTerm(corp, marketState, monthsElapsed) {
        for (const action of [...this.longTerm]) {
            if (action.status !== ACTION_STATUS.PENDING) continue;
            if (monthsElapsed < action.scheduledMonth) continue;

            // Move long-term VERTICAL_INTEGRATION into medium
            if (action.type === DECISION_TYPES.OPEN_FIRM && action.goal === GOAL_TYPES.VERTICAL_INTEGRATION) {
                this.longTerm.splice(this.longTerm.indexOf(action), 1);
                action.horizon = ROAD_HORIZON.MEDIUM;
                action.scheduledMonth = monthsElapsed;
                this.mediumTerm.push(action);
            }
        }
    }

    // ─── Goal Evaluation ─────────────────────────────────────────────────────

    /**
     * Evaluate corporate goals and add new roadmap actions.
     * Called once per month per corporation.
     */
    _evaluateGoals(corp, marketState, monthsElapsed) {
        const firmCount = corp.firms.length;
        const targetFirms = corp.goals?.targetFirms || 3;

        // --- ESTABLISH_OPERATIONS done → push EXPAND_CAPACITY if not already queued ---
        if (firmCount >= 1 && !this._hasGoalQueued(GOAL_TYPES.EXPAND_CAPACITY)) {
            // If we're near target, skip — don't spam queues
        }

        // --- EXPAND_CAPACITY: reached target → evaluate strategic goals ---
        if (firmCount >= targetFirms) {
            this._evaluateStrategicGoals(corp, marketState, monthsElapsed);
        }

        // --- IMPROVE_PROFITABILITY: triggered by losses ---
        this._checkProfitabilityGoal(corp, marketState, monthsElapsed);
    }

    /**
     * Evaluate strategic goals once EXPAND_CAPACITY is met.
     */
    _evaluateStrategicGoals(corp, marketState, monthsElapsed) {
        // Only evaluate once every 3 months to avoid spamming
        if (monthsElapsed % 3 !== 0) return;

        // Check for vertical integration opportunity
        if (!this._hasGoalQueued(GOAL_TYPES.VERTICAL_INTEGRATION)) {
            this._considerVerticalIntegration(corp, marketState, monthsElapsed);
        }

        // Check for horizontal expansion
        if (!this._hasGoalQueued(GOAL_TYPES.HORIZONTAL_EXPANSION)) {
            this._considerHorizontalExpansion(corp, marketState, monthsElapsed);
        }

        // Retail: enter new market
        if (corp.primaryPersona?.tier === INDUSTRY_TIERS.RETAIL) {
            if (!this._hasGoalQueued(GOAL_TYPES.ENTER_NEW_MARKET)) {
                this._considerNewMarket(corp, marketState, monthsElapsed);
            }
        }
    }

    /**
     * Consider adding VERTICAL_INTEGRATION actions.
     */
    _considerVerticalIntegration(corp, marketState, monthsElapsed) {
        const primaryTier = corp.primaryPersona?.tier;
        if (!primaryTier) return;

        const availableCapital = corp.getAvailableCapital ? corp.getAvailableCapital() : corp.capital;
        const ownedPersonas = this._getOwnedPersonas(corp);

        // Try to go DOWNSTREAM first (toward retail)
        for (const ownedPersona of ownedPersonas) {
            const downstreamTargets = DOWNSTREAM_MAP[ownedPersona] || [];
            for (const targetPersonaType of downstreamTargets) {
                if (ownedPersonas.includes(targetPersonaType)) continue; // already have it

                const targetTier = PERSONA_TIER[targetPersonaType];
                const cost = this._estimateBuildCost(targetPersonaType, targetTier);

                if (availableCapital >= cost * 1.5) {
                    // Check if we should acquire instead
                    const acquisitionTarget = this._findAcquisitionTarget(marketState, targetPersonaType);

                    this.addAction({
                        type: DECISION_TYPES.OPEN_FIRM,
                        horizon: ROAD_HORIZON.MEDIUM,
                        scheduledMonth: monthsElapsed + 1,
                        persona: { type: targetPersonaType, tier: targetTier, firmType: this._getFirmType(targetTier) },
                        tier: targetTier,
                        sourceTier: primaryTier,
                        direction: 'DOWN',
                        goal: GOAL_TYPES.VERTICAL_INTEGRATION,
                        isAcquisition: !!acquisitionTarget,
                        targetFirmId: acquisitionTarget?.id || null,
                        cost,
                        rationale: `Integrate downstream into ${targetPersonaType}`
                    });
                    return; // one integration action at a time
                }
            }
        }

        // Try UPSTREAM (toward raw)
        for (const ownedPersona of ownedPersonas) {
            const upstreamTargets = UPSTREAM_MAP[ownedPersona] || [];
            for (const targetPersonaType of upstreamTargets) {
                if (ownedPersonas.includes(targetPersonaType)) continue;

                const targetTier = PERSONA_TIER[targetPersonaType];
                const cost = this._estimateBuildCost(targetPersonaType, targetTier);

                if (availableCapital >= cost * 1.5) {
                    const acquisitionTarget = this._findAcquisitionTarget(marketState, targetPersonaType);

                    this.addAction({
                        type: DECISION_TYPES.OPEN_FIRM,
                        horizon: ROAD_HORIZON.MEDIUM,
                        scheduledMonth: monthsElapsed + 1,
                        persona: { type: targetPersonaType, tier: targetTier, firmType: this._getFirmType(targetTier) },
                        tier: targetTier,
                        sourceTier: primaryTier,
                        direction: 'UP',
                        goal: GOAL_TYPES.VERTICAL_INTEGRATION,
                        isAcquisition: !!acquisitionTarget,
                        targetFirmId: acquisitionTarget?.id || null,
                        cost,
                        rationale: `Integrate upstream into ${targetPersonaType}`
                    });
                    return;
                }
            }
        }
    }

    /**
     * Consider adding HORIZONTAL_EXPANSION actions.
     */
    _considerHorizontalExpansion(corp, marketState, monthsElapsed) {
        const primaryPersona = corp.primaryPersona;
        if (!primaryPersona) return;

        const availableCapital = corp.getAvailableCapital ? corp.getAvailableCapital() : corp.capital;
        const cost = this._estimateBuildCost(primaryPersona.type, primaryPersona.tier);

        if (availableCapital >= cost * 2) {
            this.addAction({
                type: DECISION_TYPES.OPEN_FIRM,
                horizon: ROAD_HORIZON.MEDIUM,
                scheduledMonth: monthsElapsed + 2,
                persona: primaryPersona,
                tier: primaryPersona.tier,
                goal: GOAL_TYPES.HORIZONTAL_EXPANSION,
                cost,
                rationale: `Expand horizontal presence at ${primaryPersona.tier} tier`
            });
        }
    }

    /**
     * Consider entering a new market (primarily for retail corps).
     */
    _considerNewMarket(corp, marketState, monthsElapsed) {
        const primaryPersona = corp.primaryPersona;
        if (!primaryPersona) return;

        // Only enter new market if at least 1 existing firm is profitable
        const hasProfitableFirm = corp.firms.some(f => (f.monthlyRevenue || 0) > (f.monthlyExpenses || 0));
        if (!hasProfitableFirm) return;

        const cost = this._estimateBuildCost(primaryPersona.type, primaryPersona.tier);
        const availableCapital = corp.getAvailableCapital ? corp.getAvailableCapital() : corp.capital;

        if (availableCapital >= cost * 2) {
            this.addAction({
                type: DECISION_TYPES.ENTER_CITY,
                horizon: ROAD_HORIZON.MEDIUM,
                scheduledMonth: monthsElapsed + 3,
                persona: primaryPersona,
                tier: primaryPersona.tier,
                goal: GOAL_TYPES.ENTER_NEW_MARKET,
                cost,
                rationale: `Open in a new city to grow market presence`
            });
        }
    }

    /**
     * Check if profitability triggers IMPROVE_PROFITABILITY goal actions.
     */
    _checkProfitabilityGoal(corp, marketState, monthsElapsed) {
        // Check each firm for consecutive loss months
        for (const firm of corp.firms) {
            const lossMonths = firm.consecutiveLossMonths || 0;
            if (lossMonths < 2) continue;

            // Already have a profitability action for this firm? Skip.
            const alreadyQueued = this.shortTerm.some(a =>
                a.goal === GOAL_TYPES.IMPROVE_PROFITABILITY && a.targetFirmId === firm.id
            );
            if (alreadyQueued) continue;

            // Determine sub-action priority
            const rev = firm.monthlyRevenue || 0;
            const inputCost = (firm.monthlyExpenses || 0) * 0.6; // estimate input portion
            const laborCost = (firm.monthlyExpenses || 0) * 0.35;

            let subAction;
            if (rev > 0 && inputCost / rev > 0.40) {
                subAction = 'RENEGOTIATE_CONTRACTS';
            } else if (rev > 0 && laborCost / rev > 0.35) {
                subAction = 'REDUCE_HEADCOUNT';
            } else if (lossMonths >= 3) {
                // Only close if corp has at least 2 other firms of same type
                const sameTypeFirms = corp.firms.filter(f => f.type === firm.type && f.id !== firm.id);
                subAction = sameTypeFirms.length >= 2 ? 'CLOSE_FIRM' : 'REDUCE_HEADCOUNT';
            } else {
                subAction = 'RENEGOTIATE_CONTRACTS';
            }

            this.addAction({
                type: subAction === 'CLOSE_FIRM' ? DECISION_TYPES.CLOSE_FIRM : DECISION_TYPES.DEFER,
                horizon: ROAD_HORIZON.SHORT,
                scheduledMonth: monthsElapsed,
                goal: GOAL_TYPES.IMPROVE_PROFITABILITY,
                subAction,
                targetFirmId: firm.id,
                rationale: `${lossMonths} consecutive loss months — trigger ${subAction}`
            });
        }
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    /**
     * Return SHORT-term actions that are ready to execute this month.
     * Marks returned actions as IN_PROGRESS.
     */
    getReadyActions(monthsElapsed) {
        const ready = this.shortTerm.filter(a =>
            a.status === ACTION_STATUS.PENDING && monthsElapsed >= a.scheduledMonth
        );
        for (const a of ready) a.status = ACTION_STATUS.IN_PROGRESS;
        return ready;
    }

    /**
     * Mark an action as completed.
     */
    completeAction(id) {
        for (const list of [this.shortTerm, this.mediumTerm, this.longTerm]) {
            const idx = list.findIndex(a => a.id === id);
            if (idx !== -1) {
                const action = list[idx];
                action.status = ACTION_STATUS.COMPLETED;
                list.splice(idx, 1);
                this.completedActions.push(action);
                if (this.completedActions.length > 24) this.completedActions.shift();
                return action;
            }
        }
        return null;
    }

    /**
     * Cancel an action by id.
     */
    cancelAction(id) {
        for (const list of [this.shortTerm, this.mediumTerm, this.longTerm]) {
            const idx = list.findIndex(a => a.id === id);
            if (idx !== -1) {
                const action = list[idx];
                action.status = ACTION_STATUS.CANCELLED;
                list.splice(idx, 1);
                this.completedActions.push(action);
                if (this.completedActions.length > 24) this.completedActions.shift();
                return action;
            }
        }
        return null;
    }

    /**
     * Add an action to the appropriate horizon list.
     */
    addAction(actionDef) {
        const action = {
            id: `ROAD_${++this._actionCounter}_${Date.now()}`,
            status: ACTION_STATUS.PENDING,
            ...actionDef
        };
        switch (action.horizon) {
            case ROAD_HORIZON.SHORT:  this.shortTerm.push(action);  break;
            case ROAD_HORIZON.MEDIUM: this.mediumTerm.push(action); break;
            case ROAD_HORIZON.LONG:   this.longTerm.push(action);   break;
            default:                  this.mediumTerm.push(action);
        }
        return action;
    }

    /**
     * True if any pending action targets the given goal.
     */
    _hasGoalQueued(goalType) {
        const all = [...this.shortTerm, ...this.mediumTerm, ...this.longTerm];
        return all.some(a => a.goal === goalType && a.status === ACTION_STATUS.PENDING);
    }

    /**
     * True if there are any PENDING actions (any horizon).
     */
    hasPendingAction() {
        return [...this.shortTerm, ...this.mediumTerm, ...this.longTerm]
            .some(a => a.status === ACTION_STATUS.PENDING);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    _getOwnedPersonas(corp) {
        const set = new Set();
        if (corp.primaryPersona?.type) set.add(corp.primaryPersona.type);
        for (const p of corp.secondaryPersonas || []) {
            if (p?.type) set.add(p.type);
        }
        for (const firm of corp.firms || []) {
            // Infer persona from firm type + product
            if (firm.persona) set.add(firm.persona);
        }
        return Array.from(set);
    }

    _estimateBuildCost(personaType, tier) {
        const tierCosts = CAPITAL_REQUIREMENTS[tier] || {};
        return (tierCosts[personaType] || 3000000) * INTEGRATION_COST_MULTIPLIER;
    }

    _getFirmType(tier) {
        switch (tier) {
            case INDUSTRY_TIERS.RAW:          return 'MINING';
            case INDUSTRY_TIERS.SEMI_RAW:
            case INDUSTRY_TIERS.MANUFACTURED: return 'MANUFACTURING';
            case INDUSTRY_TIERS.RETAIL:       return 'RETAIL';
            default:                          return 'MANUFACTURING';
        }
    }

    _findAcquisitionTarget(marketState, personaType) {
        const candidates = (marketState.firms || []).filter(f =>
            f.persona === personaType && f.availableForAcquisition
        );
        return candidates.length > 0 ? candidates[0] : null;
    }

    // ─── Serialization ────────────────────────────────────────────────────────

    getSerializableState() {
        return {
            shortTerm:        this.shortTerm.map(a => this._serializeAction(a)),
            mediumTerm:       this.mediumTerm.map(a => this._serializeAction(a)),
            longTerm:         this.longTerm.map(a => this._serializeAction(a)),
            completedActions: this.completedActions.map(a => this._serializeAction(a)),
            _actionCounter:   this._actionCounter
        };
    }

    _serializeAction(a) {
        // Strip circular city/country object refs before JSON
        return {
            ...a,
            cityId:      a.city?.id      || a.cityId      || null,
            cityName:    a.city?.name    || a.cityName    || null,
            countryName: a.country?.name || a.countryName || null,
            city:        undefined,
            country:     undefined
        };
    }

    restoreFromJSON(data) {
        if (!data) return;
        this.shortTerm        = (data.shortTerm        || []).map(a => ({ ...a }));
        this.mediumTerm       = (data.mediumTerm       || []).map(a => ({ ...a }));
        this.longTerm         = (data.longTerm         || []).map(a => ({ ...a }));
        this.completedActions = (data.completedActions || []).map(a => ({ ...a }));
        this._actionCounter   = data._actionCounter    || 0;
    }

    static fromJSON(data) {
        const r = new CorporateRoadmap();
        r.restoreFromJSON(data);
        return r;
    }
}
