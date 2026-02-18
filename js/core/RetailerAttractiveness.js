// js/core/RetailerAttractiveness.js
// Calculates retailer attractiveness scores for competitive demand distribution

export class RetailerAttractiveness {
    constructor(config = {}) {
        // Default weights (can be overridden by config)
        this.config = {
            priceWeightBase: config.priceWeightBase || 0.4,
            qualityWeightBase: config.qualityWeightBase || 0.3,
            reputationWeightBase: config.reputationWeightBase || 0.2,
            availabilityBonus: config.availabilityBonus || 10,
            ...config
        };
    }

    /**
     * Calculate overall attractiveness score for a retailer selling a specific product
     *
     * Score = (priceScore × product.priceConcern) +
     *         (qualityScore × product.qualityConcern) +
     *         (reputationScore × product.reputationConcern) +
     *         availabilityBonus
     *
     * @param {RetailStore} retailer - The retail store
     * @param {Product} product - The product being evaluated
     * @param {number} retailerPrice - Retailer's price for this product
     * @param {number} avgPrice - Average price across all retailers
     * @returns {number} Attractiveness score (0-100+)
     */
    calculateScore(retailer, product, retailerPrice, avgPrice) {
        // Get product concern weights
        const priceConcern = product.priceConcern || 0.5;
        const qualityConcern = product.qualityConcern || 0.5;
        const reputationConcern = product.reputationConcern || 0.5;

        // Calculate component scores
        const priceScore = this.calculatePriceScore(retailerPrice, avgPrice);
        const qualityScore = this.calculateQualityScore(retailer, product);
        const reputationScore = this.calculateReputationScore(retailer);

        // Availability bonus if well-stocked
        const availabilityBonus = this.calculateAvailabilityBonus(retailer);

        // Weighted sum
        const score = (priceScore * priceConcern) +
                      (qualityScore * qualityConcern) +
                      (reputationScore * reputationConcern) +
                      availabilityBonus;

        // Ensure non-negative score
        return Math.max(0, score);
    }

    /**
     * Calculate price score (0-100)
     * - 100 if 20% below average
     * - 50 at average
     * - 0 if 40% above average
     */
    calculatePriceScore(retailerPrice, avgPrice) {
        if (avgPrice <= 0) return 50;

        const priceDiff = (retailerPrice - avgPrice) / avgPrice;

        // Linear scale: -20% = 100, 0% = 50, +40% = 0
        // Formula: 50 - (priceDiff * 125)
        // At -0.2 (20% below): 50 - (-0.2 * 125) = 50 + 25 = 75... need to adjust

        // Better formula:
        // -20% diff -> score 100
        // 0% diff -> score 50
        // +40% diff -> score 0
        // Linear interpolation between these points

        if (priceDiff <= -0.2) {
            return 100;
        } else if (priceDiff >= 0.4) {
            return 0;
        } else if (priceDiff <= 0) {
            // Between -20% and 0%: interpolate 100 to 50
            // priceDiff from -0.2 to 0 maps to score 100 to 50
            const t = (priceDiff + 0.2) / 0.2; // 0 to 1
            return 100 - (t * 50);
        } else {
            // Between 0% and +40%: interpolate 50 to 0
            // priceDiff from 0 to 0.4 maps to score 50 to 0
            const t = priceDiff / 0.4; // 0 to 1
            return 50 - (t * 50);
        }
    }

    /**
     * Calculate quality score (0-100)
     * Based on store quality and product quality average
     */
    calculateQualityScore(retailer, product) {
        // Store quality factors
        const locationQuality = retailer.locationQuality || 50;
        const storeSize = retailer.storeSize || 2500;

        // Normalize store size (1000-5000 sqm -> 0-100)
        const sizeScore = Math.min(100, Math.max(0, (storeSize - 1000) / 40));

        // Store quality is combination of location and size
        const storeQuality = (locationQuality + sizeScore) / 2;

        // Product quality (from product registry or inventory)
        const productQuality = product.quality || 50;

        // Average of store and product quality
        return (storeQuality + productQuality) / 2;
    }

    /**
     * Calculate reputation score (0-100)
     * Based on brand rating and customer satisfaction
     */
    calculateReputationScore(retailer) {
        const brandRating = retailer.storeBrandRating || 30;
        const customerSatisfaction = retailer.customerSatisfaction || 70;

        // Average of brand and satisfaction
        return (brandRating + customerSatisfaction) / 2;
    }

    /**
     * Calculate availability bonus
     * Bonus points for having good stock levels
     */
    calculateAvailabilityBonus(retailer) {
        const stockAvailability = retailer.calculateStockAvailability?.() || 0.5;

        // Full bonus if 80%+ availability, scaled down below that
        if (stockAvailability >= 0.8) {
            return this.config.availabilityBonus;
        } else if (stockAvailability >= 0.5) {
            // Scale from 50% to 100% of bonus
            const t = (stockAvailability - 0.5) / 0.3;
            return this.config.availabilityBonus * (0.5 + t * 0.5);
        } else {
            // Scale from 0% to 50% of bonus
            const t = stockAvailability / 0.5;
            return this.config.availabilityBonus * t * 0.5;
        }
    }

    /**
     * Compare multiple retailers and rank them
     * Returns sorted array of {retailer, score}
     */
    rankRetailers(retailers, product, avgPrice) {
        const ranked = retailers.map(retailer => {
            const inv = retailer.productInventory?.get(product.id);
            const price = inv?.retailPrice || product.basePrice;

            return {
                retailer,
                score: this.calculateScore(retailer, product, price, avgPrice)
            };
        });

        // Sort by score descending
        ranked.sort((a, b) => b.score - a.score);

        return ranked;
    }

    /**
     * Get detailed score breakdown for debugging
     */
    getScoreBreakdown(retailer, product, retailerPrice, avgPrice) {
        const priceConcern = product.priceConcern || 0.5;
        const qualityConcern = product.qualityConcern || 0.5;
        const reputationConcern = product.reputationConcern || 0.5;

        const priceScore = this.calculatePriceScore(retailerPrice, avgPrice);
        const qualityScore = this.calculateQualityScore(retailer, product);
        const reputationScore = this.calculateReputationScore(retailer);
        const availabilityBonus = this.calculateAvailabilityBonus(retailer);

        return {
            priceScore,
            priceContribution: priceScore * priceConcern,
            qualityScore,
            qualityContribution: qualityScore * qualityConcern,
            reputationScore,
            reputationContribution: reputationScore * reputationConcern,
            availabilityBonus,
            totalScore: (priceScore * priceConcern) +
                        (qualityScore * qualityConcern) +
                        (reputationScore * reputationConcern) +
                        availabilityBonus,
            concerns: { priceConcern, qualityConcern, reputationConcern }
        };
    }
}
