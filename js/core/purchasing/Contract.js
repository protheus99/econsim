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

        // Timing
        this.createdAt = config.createdAt || Date.now();
        this.startDate = config.startDate || Date.now();
        this.endDate = config.endDate || null;  // null = indefinite
        this.terminationNoticePeriods = config.terminationNoticePeriods || 2;  // Periods of notice required

        // Status
        this.status = config.status || Contract.STATUS.ACTIVE;
        this.terminationRequestedAt = null;
        this.terminationEffectiveAt = null;

        // Performance tracking
        this.fulfillmentHistory = config.fulfillmentHistory || [];
        this.currentPeriodFulfilled = 0;
        this.lastPeriodReset = this.startDate;

        // Penalties
        this.shortfallPenaltyRate = config.shortfallPenaltyRate || 0.1;  // % of value for under-delivery
        this.lateDeliveryPenaltyRate = config.lateDeliveryPenaltyRate || 0.05;

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
     */
    recordDelivery(quantity, quality = 1.0, priceUsed = null) {
        const actualPrice = priceUsed || this.calculateUnitPrice(quality);
        const totalValue = quantity * actualPrice;

        const delivery = {
            id: `DEL_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            date: Date.now(),
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
     * Check if new period should start and reset counters
     * @param {number} currentTime - Current simulation time
     */
    checkPeriodReset(currentTime) {
        const periodMs = this.getPeriodMilliseconds();
        const timeSinceReset = currentTime - this.lastPeriodReset;

        if (timeSinceReset >= periodMs) {
            // Record end-of-period stats before reset
            this.recordPeriodEnd();

            // Reset for new period
            this.currentPeriodFulfilled = 0;
            this.lastPeriodReset = currentTime;

            return true;
        }
        return false;
    }

    /**
     * Record end-of-period performance
     */
    recordPeriodEnd() {
        const expected = this.volumePerPeriod;
        const delivered = this.currentPeriodFulfilled;
        const rate = expected > 0 ? delivered / expected : 1;

        // Calculate penalty for shortfall
        if (rate < 1.0 && this.shortfallPenaltyRate > 0) {
            const shortfall = expected - delivered;
            const penalty = shortfall * this.pricePerUnit * this.shortfallPenaltyRate;
            this.totalPenalties += penalty;
        }
    }

    /**
     * Get period duration in milliseconds
     */
    getPeriodMilliseconds() {
        switch (this.periodType) {
            case Contract.PERIODS.DAILY:
                return 24 * 60 * 60 * 1000;
            case Contract.PERIODS.WEEKLY:
                return 7 * 24 * 60 * 60 * 1000;
            case Contract.PERIODS.MONTHLY:
                return 30 * 24 * 60 * 60 * 1000;
            default:
                return 7 * 24 * 60 * 60 * 1000;
        }
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
     */
    isActive() {
        if (this.status !== Contract.STATUS.ACTIVE) return false;

        const now = Date.now();
        if (now < this.startDate) return false;
        if (this.endDate && now > this.endDate) return false;

        return true;
    }

    /**
     * Check if contract has expired
     */
    isExpired() {
        return this.endDate && Date.now() > this.endDate;
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
            shortfallPenaltyRate: this.shortfallPenaltyRate,
            lateDeliveryPenaltyRate: this.lateDeliveryPenaltyRate,
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
