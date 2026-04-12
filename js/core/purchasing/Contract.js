// js/core/purchasing/Contract.js
// Supply agreement model between firms

export class Contract {
    // Contract types
    static TYPES = {
        FIXED_VOLUME: 'fixed_volume',      // Fixed quantity per period
        MIN_MAX: 'min_max',                 // Flexible range per period
        EXCLUSIVE: 'exclusive'              // Exclusive supplier agreement
    };

    // Period types for delivery schedules
    static PERIODS = {
        DAILY: 'daily',
        WEEKLY: 'weekly',
        MONTHLY: 'monthly'
    };

    // Pricing types
    static PRICE_TYPES = {
        FIXED: 'fixed',                     // Locked price for duration
        INDEXED: 'indexed',                 // Follows market price with discount
        COST_PLUS: 'cost_plus'              // Cost + margin
    };

    // Contract status
    static STATUS = {
        DRAFT: 'draft',
        PENDING: 'pending',
        ACTIVE: 'active',
        SUSPENDED: 'suspended',
        COMPLETED: 'completed',
        TERMINATED: 'terminated',
        DEFAULTED: 'defaulted'
    };

    /**
     * Create a new supply contract
     * @param {object} config - Contract configuration
     */
    constructor(config) {
        // Identity
        this.id = config.id || `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.type = config.type || Contract.TYPES.FIXED_VOLUME;

        // Parties
        this.supplierId = config.supplierId;
        this.supplierName = config.supplierName || null;
        this.buyerId = config.buyerId;
        this.buyerName = config.buyerName || null;

        // Product details
        this.product = config.product;
        this.productCategory = config.productCategory || null;

        // Volume terms
        this.volumePerPeriod = config.volumePerPeriod || 0;
        this.minVolume = config.minVolume || 0;          // For MIN_MAX type
        this.maxVolume = config.maxVolume || config.volumePerPeriod || 0;
        this.periodType = config.periodType || Contract.PERIODS.WEEKLY;

        // Pricing terms
        this.pricePerUnit = config.pricePerUnit || 0;
        this.priceType = config.priceType || Contract.PRICE_TYPES.FIXED;
        this.marketDiscount = config.marketDiscount || 0;  // For INDEXED type (e.g., 0.05 = 5% below market)
        this.costPlusMargin = config.costPlusMargin || 0.1; // For COST_PLUS type (e.g., 0.1 = 10% margin)

        // Quality requirements
        this.minQuality = config.minQuality || 0.5;
        this.qualityPremium = config.qualityPremium || 0;  // Extra $ per quality point above min

        // Duration
        this.durationMonths = config.durationMonths || 12;  // Contract lifetime in game-months

        // Timing (in game hours — set by ContractManager using clock.totalHours)
        this.createdAt = config.createdAt ?? 0;
        this.startDate = config.startDate ?? 0;
        // endDate auto-calculated from durationMonths if not explicitly provided
        this.endDate = config.endDate ?? (this.startDate > 0 ? this.startDate + this.durationMonths * 720 : null);
        this.terminationNoticePeriods = config.terminationNoticePeriods || 2;  // Periods of notice required

        // Status
        this.status = config.status || Contract.STATUS.ACTIVE;
        this.terminationRequestedAt = null;
        this.terminationEffectiveAt = null;

        // Performance tracking
        this.fulfillmentHistory = config.fulfillmentHistory || [];
        this.currentPeriodFulfilled = config.currentPeriodFulfilled || 0;
        this.lastPeriodReset = config.lastPeriodReset ?? this.startDate;

        // Negotiation record
        this.negotiatedDiscount = config.negotiatedDiscount || 0;  // Fraction off market price agreed at signing

        // Penalties
        this.shortfallPenaltyRate = config.shortfallPenaltyRate || 0.1;  // % of value for under-delivery
        this.lateDeliveryPenaltyRate = config.lateDeliveryPenaltyRate || 0.05;
        this.delayPenaltyPerHour = config.delayPenaltyPerHour || 0;    // Per game-hour of late delivery
        this.totalDelayPenalties = config.totalDelayPenalties || 0;

        // Statistics
        this.totalDelivered = 0;
        this.totalValue = 0;
        this.totalPenalties = 0;
        this.averageFulfillmentRate = 1.0;
    }

    /**
     * Get the current period's expected volume
     */
    getExpectedVolume() {
        if (this.type === Contract.TYPES.MIN_MAX) {
            // Return minimum for planning purposes
            return this.minVolume;
        }
        return this.volumePerPeriod;
    }

    /**
     * Get maximum orderable volume for current period
     */
    getMaxOrderableVolume() {
        if (this.type === Contract.TYPES.MIN_MAX) {
            return this.maxVolume - this.currentPeriodFulfilled;
        }
        return Math.max(0, this.volumePerPeriod - this.currentPeriodFulfilled);
    }

    /**
     * Get the current effective price per unit
     * @param {number} marketPrice - Current market price (for indexed pricing)
     * @param {number} productionCost - Production cost (for cost-plus pricing)
     */
    getEffectivePrice(marketPrice = null, productionCost = null) {
        switch (this.priceType) {
            case Contract.PRICE_TYPES.INDEXED:
                if (marketPrice) {
                    return marketPrice * (1 - this.marketDiscount);
                }
                return this.pricePerUnit;

            case Contract.PRICE_TYPES.COST_PLUS:
                if (productionCost) {
                    return productionCost * (1 + this.costPlusMargin);
                }
                return this.pricePerUnit;

            case Contract.PRICE_TYPES.FIXED:
            default:
                return this.pricePerUnit;
        }
    }

    /**
     * Calculate price including quality premium
     * @param {number} quality - Quality level (0-1)
     * @param {number} marketPrice - Optional market price for indexed contracts
     */
    calculateUnitPrice(quality = 1.0, marketPrice = null) {
        const basePrice = this.getEffectivePrice(marketPrice);

        // Quality premium for above-minimum quality
        const qualityBonus = quality > this.minQuality
            ? (quality - this.minQuality) * this.qualityPremium
            : 0;

        return basePrice + qualityBonus;
    }

    /**
     * Record a delivery against this contract
     * @param {number} quantity - Quantity delivered
     * @param {number} quality - Quality of delivered goods
     * @param {number} priceUsed - Actual price per unit used
     * @param {number} gameHour - Current game hour (totalHours from clock)
     */
    recordDelivery(quantity, quality = 1.0, priceUsed = null, gameHour = null) {
        const actualPrice = priceUsed || this.calculateUnitPrice(quality);
        const totalValue = quantity * actualPrice;

        const delivery = {
            id: `DEL_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            date: Date.now(),
            gameHour: gameHour,  // Store game time for proper display
            expectedQuantity: this.volumePerPeriod,
            deliveredQuantity: quantity,
            quality,
            pricePerUnit: actualPrice,
            totalValue,
            fulfillmentRate: this.volumePerPeriod > 0 ? quantity / this.volumePerPeriod : 1
        };

        this.fulfillmentHistory.push(delivery);
        this.currentPeriodFulfilled += quantity;
        this.totalDelivered += quantity;
        this.totalValue += totalValue;

        // Update rolling average
        this.updateAverageFulfillment();

        return delivery;
    }

    /**
     * Check if new period should start and reset counters.
     * Penalties are applied externally by ContractManager after this returns true.
     * @param {number} currentTime - Current simulation time
     */
    checkPeriodReset(currentTime) {
        const periodHours = this.getPeriodHours();
        const timeSinceReset = currentTime - this.lastPeriodReset;

        if (timeSinceReset >= periodHours) {
            // Reset for new period (penalties applied externally by ContractManager)
            this.currentPeriodFulfilled = 0;
            this.lastPeriodReset = currentTime;

            return true;
        }
        return false;
    }

    /**
     * Apply shortfall penalties at period end — transfers cash from supplier to buyer.
     * Called by ContractManager after checkPeriodReset() returns true.
     * @param {object} supplierFirm - Firm object for supplier
     * @param {object} buyerFirm - Firm object for buyer
     * @returns {number} Penalty amount applied
     */
    applyPeriodPenalties(supplierFirm, buyerFirm) {
        const expected = this.volumePerPeriod;
        const delivered = this.currentPeriodFulfilled;
        if (expected <= 0) return 0;

        const rate = delivered / expected;
        const shortfall = Math.max(0, expected - delivered);
        let penalty = 0;

        if (rate < 1.0 && this.shortfallPenaltyRate > 0) {
            penalty = shortfall * this.pricePerUnit * this.shortfallPenaltyRate;
        }

        if (penalty > 0 && supplierFirm && buyerFirm) {
            // Clamp to what supplier can actually pay (don't bankrupt instantly)
            const actualPenalty = Math.min(penalty, supplierFirm.cash * 0.1);
            supplierFirm.cash -= actualPenalty;
            buyerFirm.cash   += actualPenalty;
            this.totalPenalties += actualPenalty;

            this.fulfillmentHistory.push({
                type: 'penalty',
                gameHour: null,  // filled by ContractManager
                shortfall,
                penaltyAmount: actualPenalty,
                fulfillmentRate: rate
            });

            return actualPenalty;
        }
        return 0;
    }

    /**
     * Apply delay penalty when a delivery arrives late — transfers cash from supplier to buyer.
     * @param {number} deliveryHour - Actual game hour of delivery
     * @param {number} expectedHour - Expected game hour stored on delivery object
     * @param {object} supplierFirm - Firm object for supplier
     * @param {object} buyerFirm - Firm object for buyer
     * @param {number} quantity - Quantity delivered
     * @returns {number} Penalty amount applied
     */
    applyDelayPenalty(deliveryHour, expectedHour, supplierFirm, buyerFirm, quantity) {
        if (!this.delayPenaltyPerHour || deliveryHour <= expectedHour) return 0;
        const hoursLate = deliveryHour - expectedHour;
        const penalty = Math.min(
            hoursLate * this.delayPenaltyPerHour * quantity,
            supplierFirm.cash * 0.05  // Cap at 5% of supplier cash
        );
        if (penalty > 0 && supplierFirm && buyerFirm) {
            supplierFirm.cash -= penalty;
            buyerFirm.cash   += penalty;
            this.totalDelayPenalties += penalty;
        }
        return penalty;
    }

    /**
     * Get period duration in game hours
     */
    getPeriodHours() {
        switch (this.periodType) {
            case Contract.PERIODS.DAILY:
                return 24;
            case Contract.PERIODS.WEEKLY:
                return 168;
            case Contract.PERIODS.MONTHLY:
                return 720;
            default:
                return 168;
        }
    }

    /**
     * Get period duration in milliseconds (wall-clock — kept for termination logic only)
     * @deprecated Use getPeriodHours() for simulation scheduling
     */
    getPeriodMilliseconds() {
        return this.getPeriodHours() * 60 * 60 * 1000;
    }

    /**
     * Update rolling average fulfillment rate
     */
    updateAverageFulfillment() {
        if (this.fulfillmentHistory.length === 0) {
            this.averageFulfillmentRate = 1.0;
            return;
        }

        // Use last 10 deliveries for rolling average
        const recent = this.fulfillmentHistory.slice(-10);
        const totalRate = recent.reduce((sum, d) => sum + d.fulfillmentRate, 0);
        this.averageFulfillmentRate = totalRate / recent.length;
    }

    /**
     * Check if contract is currently active
     * @param {number} [currentHour] - Current game hour (clock.totalHours). If omitted, skips time bounds check.
     */
    isActive(currentHour) {
        if (this.status !== Contract.STATUS.ACTIVE) return false;

        if (currentHour !== undefined) {
            if (currentHour < this.startDate) return false;
            if (this.endDate && currentHour > this.endDate) return false;
        }

        return true;
    }

    /**
     * Check if contract has expired
     * @param {number} [currentHour] - Current game hour (clock.totalHours). If omitted, always returns false.
     */
    isExpired(currentHour) {
        if (currentHour === undefined) return false;
        return this.endDate && currentHour > this.endDate;
    }

    /**
     * Request contract termination
     * @param {string} requestedBy - 'supplier' or 'buyer'
     */
    requestTermination(requestedBy) {
        if (!this.isActive()) return false;

        this.terminationRequestedAt = Date.now();
        this.terminationEffectiveAt = this.terminationRequestedAt +
            (this.terminationNoticePeriods * this.getPeriodMilliseconds());
        this.status = Contract.STATUS.PENDING;

        return {
            effectiveAt: this.terminationEffectiveAt,
            noticePeriods: this.terminationNoticePeriods,
            requestedBy
        };
    }

    /**
     * Immediately terminate contract (breach)
     * @param {string} reason - Reason for termination
     */
    terminateImmediately(reason) {
        this.status = Contract.STATUS.TERMINATED;
        this.terminationRequestedAt = Date.now();
        this.terminationEffectiveAt = Date.now();

        return {
            terminatedAt: Date.now(),
            reason,
            wasBreach: true
        };
    }

    /**
     * Mark contract as defaulted
     */
    markDefaulted() {
        this.status = Contract.STATUS.DEFAULTED;
    }

    /**
     * Get contract performance summary
     */
    getPerformanceSummary() {
        const recentDeliveries = this.fulfillmentHistory.slice(-10);

        return {
            contractId: this.id,
            status: this.status,
            product: this.product,
            totalDelivered: this.totalDelivered,
            totalValue: this.totalValue,
            totalPenalties: this.totalPenalties,
            deliveryCount: this.fulfillmentHistory.length,
            averageFulfillmentRate: this.averageFulfillmentRate,
            currentPeriodFulfilled: this.currentPeriodFulfilled,
            currentPeriodExpected: this.volumePerPeriod,
            recentAverageQuality: recentDeliveries.length > 0
                ? recentDeliveries.reduce((sum, d) => sum + d.quality, 0) / recentDeliveries.length
                : 0
        };
    }

    /**
     * Serialize contract for storage
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            supplierId: this.supplierId,
            supplierName: this.supplierName,
            buyerId: this.buyerId,
            buyerName: this.buyerName,
            product: this.product,
            productCategory: this.productCategory,
            volumePerPeriod: this.volumePerPeriod,
            minVolume: this.minVolume,
            maxVolume: this.maxVolume,
            periodType: this.periodType,
            pricePerUnit: this.pricePerUnit,
            priceType: this.priceType,
            marketDiscount: this.marketDiscount,
            costPlusMargin: this.costPlusMargin,
            minQuality: this.minQuality,
            qualityPremium: this.qualityPremium,
            createdAt: this.createdAt,
            startDate: this.startDate,
            endDate: this.endDate,
            terminationNoticePeriods: this.terminationNoticePeriods,
            status: this.status,
            terminationRequestedAt: this.terminationRequestedAt,
            terminationEffectiveAt: this.terminationEffectiveAt,
            fulfillmentHistory: this.fulfillmentHistory,
            currentPeriodFulfilled: this.currentPeriodFulfilled,
            lastPeriodReset: this.lastPeriodReset,
            durationMonths: this.durationMonths,
            negotiatedDiscount: this.negotiatedDiscount,
            shortfallPenaltyRate: this.shortfallPenaltyRate,
            lateDeliveryPenaltyRate: this.lateDeliveryPenaltyRate,
            delayPenaltyPerHour: this.delayPenaltyPerHour,
            totalDelayPenalties: this.totalDelayPenalties,
            totalDelivered: this.totalDelivered,
            totalValue: this.totalValue,
            totalPenalties: this.totalPenalties,
            averageFulfillmentRate: this.averageFulfillmentRate
        };
    }

    /**
     * Create contract from serialized data
     */
    static fromJSON(data) {
        return new Contract(data);
    }
}
