// js/core/corporations/BoardMeeting.js
// Board Meeting decision engine for organic corporation growth

import { GOAL_TYPES, INDUSTRY_TIERS } from './Corporation.js';

/**
 * Decision types that can be made in board meetings
 */
export const DECISION_TYPES = {
    OPEN_FIRM: 'OPEN_FIRM',
    SIGN_SUPPLY_CONTRACT: 'SIGN_SUPPLY_CONTRACT',
    SIGN_SALES_CONTRACT: 'SIGN_SALES_CONTRACT',
    EXPAND_FIRM: 'EXPAND_FIRM',
    CLOSE_FIRM: 'CLOSE_FIRM',
    HIRE_WORKERS: 'HIRE_WORKERS',
    ENTER_CITY: 'ENTER_CITY',
    DEFER: 'DEFER',
    CONSIDER_VERTICAL_INTEGRATION: 'CONSIDER_VERTICAL_INTEGRATION'
};

/**
 * Decision priority levels
 */
export const PRIORITY = {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
};

/**
 * Firm creation timeline (months to open)
 */
export const FIRM_CREATION_TIMELINE = {
    MINING_COMPANY: 3,
    LOGGING_COMPANY: 2,
    FARM_CROP: 2,
    FARM_LIVESTOCK: 2,
    STEEL_PROCESSING: 6,
    METAL_PROCESSING: 4,
    PETROLEUM_REFINERY: 8,
    FOOD_PROCESSOR: 3,
    TEXTILE_MILL: 4,
    PACKAGED_FOOD: 3,
    CLOTHING: 2,
    ELECTRONICS: 4,
    RETAIL_STORE: 2
};

/**
 * Starting capital requirements by tier
 */
export const CAPITAL_REQUIREMENTS = {
    RAW: {
        MINING_COMPANY: 5000000,
        LOGGING_COMPANY: 2000000,
        FARM_CROP: 1500000,
        FARM_LIVESTOCK: 2000000
    },
    SEMI_RAW: {
        STEEL_PROCESSING: 15000000,
        METAL_PROCESSING: 8000000,
        PETROLEUM_REFINERY: 25000000,
        FOOD_INGREDIENT_PROCESSOR: 3000000,
        DAIRY_PROCESSOR: 4000000,
        MEAT_PROCESSOR: 5000000,
        TEXTILE_MILL: 4000000,
        RUBBER_PROCESSOR: 3000000,
        GLASS_MANUFACTURING: 5000000,
        CHEMICAL_PRODUCTION: 8000000,
        LUMBER_MILL: 3000000
    },
    MANUFACTURED: {
        PACKAGED_FOOD: 3000000,
        BEVERAGE: 4000000,
        CLOTHING: 2500000,
        ACCESSORIES: 2000000,
        BABY_PRODUCTS: 2500000,
        HEALTH_PRODUCTS: 4000000,
        BEAUTY_PRODUCTS: 3000000,
        HARDWARE: 2000000,
        AUTO_PARTS: 5000000,
        CLEANING_PRODUCTS: 2500000,
        APPLIANCE: 6000000,
        FURNITURE: 3000000,
        ELECTRONICS: 10000000,
        RECREATION: 2000000,
        VEHICLE: 50000000
    },
    RETAIL: {
        SUPERMARKET: 2000000,
        CONVENIENCE_STORE: 500000,
        DISCOUNT_GROCERY: 1500000,
        PHARMACY: 1000000,
        ELECTRONICS_RETAIL: 1500000,
        FASHION_RETAIL: 800000,
        HOME_GOODS_RETAIL: 1200000,
        AUTO_RETAIL: 2500000,
        HARDWARE_RETAIL: 1500000
    }
};

/**
 * Phase-based decision priorities
 */
const PHASE_PRIORITIES = {
    FOUNDATION: {
        RAW: {
            [DECISION_TYPES.OPEN_FIRM]: 1.0,
            [DECISION_TYPES.EXPAND_FIRM]: 0.5,
            [DECISION_TYPES.SIGN_SALES_CONTRACT]: 0.7
        },
        SEMI_RAW: {
            [DECISION_TYPES.SIGN_SUPPLY_CONTRACT]: 1.0,
            [DECISION_TYPES.OPEN_FIRM]: 0.3,
            [DECISION_TYPES.DEFER]: 0.6
        },
        MANUFACTURED: {
            [DECISION_TYPES.DEFER]: 0.9,
            [DECISION_TYPES.SIGN_SUPPLY_CONTRACT]: 0.4
        },
        RETAIL: {
            [DECISION_TYPES.DEFER]: 1.0
        }
    },
    PROCESSING: {
        RAW: {
            [DECISION_TYPES.EXPAND_FIRM]: 0.8,
            [DECISION_TYPES.SIGN_SALES_CONTRACT]: 0.9,
            [DECISION_TYPES.OPEN_FIRM]: 0.5
        },
        SEMI_RAW: {
            [DECISION_TYPES.OPEN_FIRM]: 1.0,
            [DECISION_TYPES.SIGN_SUPPLY_CONTRACT]: 0.9,
            [DECISION_TYPES.SIGN_SALES_CONTRACT]: 0.7
        },
        MANUFACTURED: {
            [DECISION_TYPES.SIGN_SUPPLY_CONTRACT]: 0.8,
            [DECISION_TYPES.OPEN_FIRM]: 0.4,
            [DECISION_TYPES.DEFER]: 0.5
        },
        RETAIL: {
            [DECISION_TYPES.DEFER]: 0.8
        }
    },
    MANUFACTURING: {
        RAW: {
            [DECISION_TYPES.EXPAND_FIRM]: 0.7,
            [DECISION_TYPES.OPEN_FIRM]: 0.4,
            [DECISION_TYPES.SIGN_SALES_CONTRACT]: 0.8
        },
        SEMI_RAW: {
            [DECISION_TYPES.EXPAND_FIRM]: 0.8,
            [DECISION_TYPES.SIGN_SALES_CONTRACT]: 0.9,
            [DECISION_TYPES.OPEN_FIRM]: 0.5
        },
        MANUFACTURED: {
            [DECISION_TYPES.OPEN_FIRM]: 1.0,
            [DECISION_TYPES.SIGN_SUPPLY_CONTRACT]: 0.9,
            [DECISION_TYPES.SIGN_SALES_CONTRACT]: 0.8
        },
        RETAIL: {
            [DECISION_TYPES.SIGN_SUPPLY_CONTRACT]: 0.7,
            [DECISION_TYPES.OPEN_FIRM]: 0.4
        }
    },
    RETAIL: {
        RAW: {
            [DECISION_TYPES.EXPAND_FIRM]: 0.6
        },
        SEMI_RAW: {
            [DECISION_TYPES.EXPAND_FIRM]: 0.6
        },
        MANUFACTURED: {
            [DECISION_TYPES.EXPAND_FIRM]: 0.7,
            [DECISION_TYPES.SIGN_SALES_CONTRACT]: 0.9,
            [DECISION_TYPES.ENTER_CITY]: 0.5
        },
        RETAIL: {
            [DECISION_TYPES.OPEN_FIRM]: 1.0,
            [DECISION_TYPES.SIGN_SUPPLY_CONTRACT]: 0.9,
            [DECISION_TYPES.ENTER_CITY]: 0.6
        }
    }
};

/**
 * BoardMeeting class
 * Conducts monthly board meetings and generates decisions for corporations
 */
export class BoardMeeting {
    /**
     * @param {Object} engine - Reference to SimulationEngine
     */
    constructor(engine) {
        this.engine = engine;
    }

    /**
     * Conduct a board meeting for a corporation
     * @param {Corporation} corporation - The corporation holding the meeting
     * @param {Object} marketState - Current market conditions
     * @param {Object} gameTime - Current game time
     * @returns {Object} Meeting results
     */
    conductMeeting(corporation, marketState, gameTime) {
        const meeting = {
            date: { ...gameTime },
            corporationId: corporation.id,
            decisions: [],
            approvedProjects: [],
            deferredProjects: [],
            summary: {}
        };

        // 1. Financial Review
        const financials = this.reviewFinancials(corporation);
        let availableCapital = this.calculateAvailableCapital(corporation);

        // 2. Operations Review
        const operations = this.reviewOperations(corporation);

        // 3. Market Analysis
        const marketAnalysis = this.analyzeMarket(corporation, marketState);

        // 4. Goal Evaluation
        const goalProgress = this.evaluateGoalProgress(corporation);
        const currentGoal = this.determineCurrentGoal(corporation, goalProgress);

        // 5. Generate Decision Options
        const options = this.generateDecisionOptions(
            corporation,
            currentGoal,
            marketAnalysis,
            availableCapital,
            gameTime
        );

        // 6. Prioritize and Approve
        const prioritizedOptions = this.prioritizeOptions(options, corporation);

        for (const option of prioritizedOptions) {
            if (this.canAfford(option, availableCapital) && this.meetsPrerequisites(option, corporation, marketState)) {
                meeting.approvedProjects.push(option);
                availableCapital -= (option.cost || 0);

                // Add to corporation's active projects
                corporation.addProject({
                    id: `PROJECT_${corporation.id}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    ...option,
                    approvedAt: gameTime
                });
            } else {
                meeting.deferredProjects.push(option);
            }
        }

        // 7. Update Meeting Record
        meeting.summary = {
            financials,
            operations,
            goalProgress,
            currentGoal,
            optionsGenerated: options.length,
            approved: meeting.approvedProjects.length,
            deferred: meeting.deferredProjects.length
        };

        // Store meeting in corporation
        corporation.boardMeeting.lastMeeting = meeting;
        corporation.boardMeeting.meetingHistory.push(meeting);

        // Keep only last 12 meetings
        if (corporation.boardMeeting.meetingHistory.length > 12) {
            corporation.boardMeeting.meetingHistory.shift();
        }

        // Check for phase advancement
        corporation.checkPhaseAdvancement();

        return meeting;
    }

    /**
     * Review corporation's financial state
     */
    reviewFinancials(corporation) {
        return {
            capital: corporation.capital,
            cash: corporation.cash,
            monthlyRevenue: corporation.monthlyRevenue,
            monthlyExpenses: corporation.monthlyExpenses,
            monthlyProfit: corporation.monthlyProfit,
            debt: corporation.debt,
            creditRating: corporation.creditRating,
            availableCapital: corporation.getAvailableCapital()
        };
    }

    /**
     * Calculate available capital for investment
     */
    calculateAvailableCapital(corporation) {
        return corporation.getAvailableCapital();
    }

    /**
     * Review operational status
     */
    reviewOperations(corporation) {
        const firmsByTier = {
            [INDUSTRY_TIERS.RAW]: corporation.getFirmsByTier(INDUSTRY_TIERS.RAW),
            [INDUSTRY_TIERS.SEMI_RAW]: corporation.getFirmsByTier(INDUSTRY_TIERS.SEMI_RAW),
            [INDUSTRY_TIERS.MANUFACTURED]: corporation.getFirmsByTier(INDUSTRY_TIERS.MANUFACTURED),
            [INDUSTRY_TIERS.RETAIL]: corporation.getFirmsByTier(INDUSTRY_TIERS.RETAIL)
        };

        return {
            totalFirms: corporation.firms.length,
            totalEmployees: corporation.employees,
            firmsByTier,
            activeProjects: corporation.boardMeeting.activeProjects.length
        };
    }

    /**
     * Analyze market conditions
     */
    analyzeMarket(corporation, marketState) {
        const analysis = {
            economicPhase: marketState.economicPhase || 'FOUNDATION',
            supplyAvailability: {},
            demandOpportunities: [],
            competitorCount: 0
        };

        // Check supply availability for each input the corporation needs
        const neededInputs = this.getRequiredInputs(corporation);
        for (const input of neededInputs) {
            analysis.supplyAvailability[input] = this.checkSupplyAvailability(input, marketState);
        }

        // Identify demand opportunities
        const products = corporation.getFocusProducts();
        for (const product of products) {
            const demand = this.checkDemandOpportunity(product, marketState);
            if (demand.hasOpportunity) {
                analysis.demandOpportunities.push(demand);
            }
        }

        return analysis;
    }

    /**
     * Get required inputs for a corporation's production
     */
    getRequiredInputs(corporation) {
        const inputs = new Set();

        for (const persona of corporation.personas) {
            if (persona.upstreamSource) {
                for (const source of persona.upstreamSource) {
                    inputs.add(source);
                }
            }
        }

        return Array.from(inputs);
    }

    /**
     * Check if supply is available for a material
     */
    checkSupplyAvailability(materialName, marketState) {
        // Find suppliers that produce this material
        const suppliers = (marketState.suppliers || []).filter(s =>
            s.products?.includes(materialName) && s.operational
        );

        const totalCapacity = suppliers.reduce((sum, s) => sum + (s.capacity || 0), 0);
        const existingDemand = suppliers.reduce((sum, s) => sum + (s.committedVolume || 0), 0);
        const availableCapacity = totalCapacity - existingDemand;

        return {
            available: suppliers.length > 0 && availableCapacity > 0,
            suppliers: suppliers.length,
            availableCapacity,
            materialName
        };
    }

    /**
     * Check demand opportunity for a product
     */
    checkDemandOpportunity(productName, marketState) {
        const buyers = (marketState.buyers || []).filter(b =>
            b.wantedProducts?.includes(productName)
        );

        return {
            product: productName,
            hasOpportunity: buyers.length > 0,
            potentialBuyers: buyers.length
        };
    }

    /**
     * Evaluate progress toward goals
     */
    evaluateGoalProgress(corporation) {
        const progress = {
            currentGoal: corporation.goals.primary,
            phase: corporation.goals.phase,
            firmCount: corporation.firms.length,
            targetFirms: corporation.goals.targetFirms,
            hasFirstFirm: corporation.firms.length > 0,
            hasSupplyContracts: corporation.supplyContracts.length > 0,
            hasSalesContracts: corporation.salesContracts.length > 0
        };

        // Calculate completion percentage
        if (progress.currentGoal === GOAL_TYPES.ESTABLISH_OPERATIONS) {
            progress.completion = progress.hasFirstFirm ? 1.0 : 0.0;
        } else if (progress.currentGoal === GOAL_TYPES.EXPAND_CAPACITY) {
            progress.completion = progress.firmCount / progress.targetFirms;
        } else {
            progress.completion = 0.5; // Default
        }

        return progress;
    }

    /**
     * Determine current goal based on progress
     */
    determineCurrentGoal(corporation, goalProgress) {
        // If no firms, goal is to establish operations
        if (corporation.firms.length === 0) {
            return GOAL_TYPES.ESTABLISH_OPERATIONS;
        }

        // Check if we need supply contracts
        const tier = corporation.getPrimaryTier();
        if (tier !== INDUSTRY_TIERS.RAW && corporation.supplyContracts.length === 0) {
            return GOAL_TYPES.SECURE_SUPPLY;
        }

        // If below target firms, expand capacity
        if (corporation.firms.length < corporation.goals.targetFirms) {
            return GOAL_TYPES.EXPAND_CAPACITY;
        }

        // Check for vertical integration opportunities
        if (corporation.attributes.integrationPreference > 0.6 &&
            corporation.integrationLevel > 0) {
            return GOAL_TYPES.VERTICAL_INTEGRATION;
        }

        // Default to improving profitability
        return GOAL_TYPES.IMPROVE_PROFITABILITY;
    }

    /**
     * Generate decision options based on current state
     */
    generateDecisionOptions(corporation, currentGoal, marketAnalysis, availableCapital, gameTime) {
        const options = [];
        const tier = corporation.getPrimaryTier();

        // Generate options based on tier
        switch (tier) {
            case INDUSTRY_TIERS.RAW:
                options.push(...this.generateRAWDecisions(corporation, marketAnalysis, availableCapital));
                break;
            case INDUSTRY_TIERS.SEMI_RAW:
                options.push(...this.generateSEMI_RAWDecisions(corporation, marketAnalysis, availableCapital));
                break;
            case INDUSTRY_TIERS.MANUFACTURED:
                options.push(...this.generateMANUFACTUREDDecisions(corporation, marketAnalysis, availableCapital));
                break;
            case INDUSTRY_TIERS.RETAIL:
                options.push(...this.generateRETAILDecisions(corporation, marketAnalysis, availableCapital));
                break;
        }

        // Add options for secondary personas
        for (const persona of corporation.secondaryPersonas) {
            const secondaryOptions = this.generatePersonaDecisions(persona, corporation, marketAnalysis, availableCapital);
            options.push(...secondaryOptions);
        }

        return options;
    }

    /**
     * Generate decisions for RAW tier corporations
     */
    generateRAWDecisions(corporation, marketAnalysis, availableCapital) {
        const decisions = [];
        const persona = corporation.primaryPersona;

        // RAW firms can always open (no supply dependencies)
        if (corporation.firms.length === 0) {
            decisions.push({
                type: DECISION_TYPES.OPEN_FIRM,
                priority: PRIORITY.CRITICAL,
                persona: persona,
                tier: INDUSTRY_TIERS.RAW,
                cost: this.getOpeningCost(persona, INDUSTRY_TIERS.RAW),
                rationale: 'Establish initial operations'
            });
        }

        // Expand if demand exists
        if (marketAnalysis.demandOpportunities.length > 0 && corporation.firms.length > 0) {
            decisions.push({
                type: DECISION_TYPES.EXPAND_FIRM,
                priority: PRIORITY.HIGH,
                persona: persona,
                tier: INDUSTRY_TIERS.RAW,
                cost: this.getOpeningCost(persona, INDUSTRY_TIERS.RAW) * 0.5,
                rationale: 'Meet excess demand'
            });
        }

        // Additional firm if capital allows
        if (corporation.firms.length > 0 && corporation.firms.length < corporation.goals.targetFirms) {
            decisions.push({
                type: DECISION_TYPES.OPEN_FIRM,
                priority: PRIORITY.MEDIUM,
                persona: persona,
                tier: INDUSTRY_TIERS.RAW,
                cost: this.getOpeningCost(persona, INDUSTRY_TIERS.RAW),
                rationale: 'Expand capacity toward target'
            });
        }

        return decisions;
    }

    /**
     * Generate decisions for SEMI_RAW tier corporations
     */
    generateSEMI_RAWDecisions(corporation, marketAnalysis, availableCapital) {
        const decisions = [];
        const persona = corporation.primaryPersona;
        const requiredInputs = this.getRequiredInputs(corporation);

        // Check if supply is available
        let allSupplyAvailable = true;
        const missingSupply = [];

        for (const input of requiredInputs) {
            const supply = marketAnalysis.supplyAvailability[input];
            if (!supply || !supply.available) {
                allSupplyAvailable = false;
                missingSupply.push(input);
            }
        }

        if (!allSupplyAvailable) {
            // Need to secure supply first
            for (const input of missingSupply) {
                decisions.push({
                    type: DECISION_TYPES.SIGN_SUPPLY_CONTRACT,
                    priority: PRIORITY.CRITICAL,
                    product: input,
                    rationale: `Secure ${input} supply before opening firm`
                });
            }

            // Defer firm opening
            decisions.push({
                type: DECISION_TYPES.DEFER,
                priority: PRIORITY.MEDIUM,
                reason: 'Waiting for supply availability',
                checkAgainIn: 1
            });
        } else {
            // Supply available - can open firm
            if (corporation.firms.length === 0) {
                decisions.push({
                    type: DECISION_TYPES.OPEN_FIRM,
                    priority: PRIORITY.CRITICAL,
                    persona: persona,
                    tier: INDUSTRY_TIERS.SEMI_RAW,
                    cost: this.getOpeningCost(persona, INDUSTRY_TIERS.SEMI_RAW),
                    rationale: 'Supply secured, establish operations'
                });
            } else if (corporation.firms.length < corporation.goals.targetFirms) {
                decisions.push({
                    type: DECISION_TYPES.OPEN_FIRM,
                    priority: PRIORITY.MEDIUM,
                    persona: persona,
                    tier: INDUSTRY_TIERS.SEMI_RAW,
                    cost: this.getOpeningCost(persona, INDUSTRY_TIERS.SEMI_RAW),
                    rationale: 'Expand capacity'
                });
            }
        }

        return decisions;
    }

    /**
     * Generate decisions for MANUFACTURED tier corporations
     */
    generateMANUFACTUREDDecisions(corporation, marketAnalysis, availableCapital) {
        const decisions = [];
        const persona = corporation.primaryPersona;
        const requiredInputs = this.getRequiredInputs(corporation);

        // Check supply chain
        let allSupplyAvailable = true;
        const missingSupply = [];

        for (const input of requiredInputs) {
            const supply = marketAnalysis.supplyAvailability[input];
            if (!supply || !supply.available) {
                allSupplyAvailable = false;
                missingSupply.push(input);
            }
        }

        if (!allSupplyAvailable) {
            // Need to secure supply first
            for (const input of missingSupply) {
                const supply = marketAnalysis.supplyAvailability[input];

                if (!supply || supply.suppliers === 0) {
                    // No suppliers exist - consider vertical integration
                    if (corporation.integrationLevel >= 2) {
                        decisions.push({
                            type: DECISION_TYPES.CONSIDER_VERTICAL_INTEGRATION,
                            priority: PRIORITY.MEDIUM,
                            direction: 'BACKWARD',
                            targetTier: INDUSTRY_TIERS.SEMI_RAW,
                            product: input,
                            rationale: `No ${input} suppliers, consider self-supply`
                        });
                    } else {
                        decisions.push({
                            type: DECISION_TYPES.DEFER,
                            priority: PRIORITY.LOW,
                            reason: `Waiting for ${input} manufacturers`,
                            checkAgainIn: 3
                        });
                    }
                } else {
                    decisions.push({
                        type: DECISION_TYPES.SIGN_SUPPLY_CONTRACT,
                        priority: PRIORITY.CRITICAL,
                        product: input,
                        rationale: `Secure ${input} before manufacturing`
                    });
                }
            }

            if (missingSupply.length > 0) {
                return decisions; // Can't manufacture without inputs
            }
        }

        // Supply available - can open firm
        if (corporation.firms.length === 0) {
            decisions.push({
                type: DECISION_TYPES.OPEN_FIRM,
                priority: PRIORITY.CRITICAL,
                persona: persona,
                tier: INDUSTRY_TIERS.MANUFACTURED,
                cost: this.getOpeningCost(persona, INDUSTRY_TIERS.MANUFACTURED),
                rationale: 'Supply chain ready, begin manufacturing'
            });
        } else if (corporation.firms.length < corporation.goals.targetFirms) {
            decisions.push({
                type: DECISION_TYPES.OPEN_FIRM,
                priority: PRIORITY.MEDIUM,
                persona: persona,
                tier: INDUSTRY_TIERS.MANUFACTURED,
                cost: this.getOpeningCost(persona, INDUSTRY_TIERS.MANUFACTURED),
                rationale: 'Expand manufacturing capacity'
            });
        }

        return decisions;
    }

    /**
     * Generate decisions for RETAIL tier corporations
     */
    generateRETAILDecisions(corporation, marketAnalysis, availableCapital) {
        const decisions = [];
        const persona = corporation.primaryPersona;

        // Retail needs products to sell
        const productsToSell = persona.productsSold || persona.products || [];
        let productsAvailable = 0;
        const missingProducts = [];

        for (const product of productsToSell) {
            const supply = marketAnalysis.supplyAvailability[product];
            if (supply && supply.available) {
                productsAvailable++;
            } else {
                missingProducts.push(product);
            }
        }

        const percentAvailable = productsToSell.length > 0
            ? productsAvailable / productsToSell.length
            : 0;

        if (percentAvailable < 0.5) {
            // Not enough products available
            for (const product of missingProducts) {
                const supply = marketAnalysis.supplyAvailability[product];

                if (!supply || supply.suppliers === 0) {
                    decisions.push({
                        type: DECISION_TYPES.DEFER,
                        priority: PRIORITY.LOW,
                        reason: `Waiting for ${product} manufacturers`,
                        checkAgainIn: 3
                    });
                } else {
                    decisions.push({
                        type: DECISION_TYPES.SIGN_SUPPLY_CONTRACT,
                        priority: PRIORITY.CRITICAL,
                        product: product,
                        rationale: `Secure ${product} inventory for retail`
                    });
                }
            }

            return decisions; // Wait for more products
        }

        // Products available - can open store
        if (corporation.firms.length === 0 && percentAvailable >= 0.5) {
            decisions.push({
                type: DECISION_TYPES.OPEN_FIRM,
                priority: PRIORITY.HIGH,
                persona: persona,
                tier: INDUSTRY_TIERS.RETAIL,
                cost: this.getOpeningCost(persona, INDUSTRY_TIERS.RETAIL),
                rationale: 'Product supply secured, open retail location'
            });
        } else if (corporation.firms.length < corporation.goals.targetFirms) {
            decisions.push({
                type: DECISION_TYPES.OPEN_FIRM,
                priority: PRIORITY.MEDIUM,
                persona: persona,
                tier: INDUSTRY_TIERS.RETAIL,
                cost: this.getOpeningCost(persona, INDUSTRY_TIERS.RETAIL),
                rationale: 'Expand retail presence'
            });
        }

        return decisions;
    }

    /**
     * Generate decisions for a specific persona
     */
    generatePersonaDecisions(persona, corporation, marketAnalysis, availableCapital) {
        // Similar to tier-based generation but for secondary personas
        const decisions = [];

        if (persona.tier === INDUSTRY_TIERS.RAW) {
            // RAW personas can always add firms
            if (availableCapital > this.getOpeningCost(persona, INDUSTRY_TIERS.RAW)) {
                decisions.push({
                    type: DECISION_TYPES.OPEN_FIRM,
                    priority: PRIORITY.LOW,
                    persona: persona,
                    tier: INDUSTRY_TIERS.RAW,
                    cost: this.getOpeningCost(persona, INDUSTRY_TIERS.RAW),
                    rationale: 'Expand secondary persona operations'
                });
            }
        }

        // Add similar logic for other tiers as needed

        return decisions;
    }

    /**
     * Get the cost to open a firm
     */
    getOpeningCost(persona, tier) {
        const tierCosts = CAPITAL_REQUIREMENTS[tier];
        if (tierCosts && persona.type && tierCosts[persona.type]) {
            return tierCosts[persona.type];
        }

        // Default costs by tier
        const defaults = {
            [INDUSTRY_TIERS.RAW]: 2000000,
            [INDUSTRY_TIERS.SEMI_RAW]: 5000000,
            [INDUSTRY_TIERS.MANUFACTURED]: 3000000,
            [INDUSTRY_TIERS.RETAIL]: 1000000
        };

        return defaults[tier] || 2000000;
    }

    /**
     * Prioritize decision options
     */
    prioritizeOptions(options, corporation) {
        // Sort by priority, then by alignment with corporation attributes
        const priorityOrder = {
            [PRIORITY.CRITICAL]: 0,
            [PRIORITY.HIGH]: 1,
            [PRIORITY.MEDIUM]: 2,
            [PRIORITY.LOW]: 3
        };

        return options.sort((a, b) => {
            // First by priority
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Then by cost (lower cost first when capital is tight)
            return (a.cost || 0) - (b.cost || 0);
        });
    }

    /**
     * Check if corporation can afford the decision
     */
    canAfford(option, availableCapital) {
        const cost = option.cost || 0;
        return cost <= availableCapital;
    }

    /**
     * Check if prerequisites are met
     */
    meetsPrerequisites(option, corporation, marketState) {
        // DEFER decisions always meet prerequisites
        if (option.type === DECISION_TYPES.DEFER) {
            return true;
        }

        // Contract decisions need valid counterparties
        if (option.type === DECISION_TYPES.SIGN_SUPPLY_CONTRACT) {
            const supply = marketState.suppliers?.some(s =>
                s.products?.includes(option.product) && s.operational
            );
            return supply;
        }

        // OPEN_FIRM decisions - check tier prerequisites
        if (option.type === DECISION_TYPES.OPEN_FIRM) {
            // RAW can always open
            if (option.tier === INDUSTRY_TIERS.RAW) {
                return true;
            }

            // Other tiers need supply contracts or available supply
            // This is a simplified check - more detailed in generateDecisions
            return true;
        }

        return true;
    }
}

/**
 * Determine the current economic phase based on firm distribution
 */
export function determineEconomicPhase(marketState) {
    const rawFirms = marketState.firmCounts?.[INDUSTRY_TIERS.RAW] || 0;
    const semiRawFirms = marketState.firmCounts?.[INDUSTRY_TIERS.SEMI_RAW] || 0;
    const manufacturedFirms = marketState.firmCounts?.[INDUSTRY_TIERS.MANUFACTURED] || 0;
    const retailFirms = marketState.firmCounts?.[INDUSTRY_TIERS.RETAIL] || 0;

    // Foundation: Mostly RAW
    if (semiRawFirms < rawFirms * 0.3) {
        return 'FOUNDATION';
    }

    // Processing: SEMI_RAW catching up
    if (manufacturedFirms < semiRawFirms * 0.3) {
        return 'PROCESSING';
    }

    // Manufacturing: Consumer goods starting
    if (retailFirms < manufacturedFirms * 0.3) {
        return 'MANUFACTURING';
    }

    // Retail: Full chain exists
    const expectedRetail = Math.floor((rawFirms + semiRawFirms + manufacturedFirms) * 0.2);
    if (retailFirms < expectedRetail) {
        return 'RETAIL';
    }

    // Mature: Economy stabilized
    return 'MATURE';
}
