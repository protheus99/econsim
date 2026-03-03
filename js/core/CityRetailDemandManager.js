// js/core/CityRetailDemandManager.js
// Manages city-wide demand calculation and competitive distribution to retailers

import { RetailerAttractiveness } from './RetailerAttractiveness.js';

export class CityRetailDemandManager {
    constructor(simulationEngine) {
        this.engine = simulationEngine;
        this.productRegistry = simulationEngine.productRegistry;
        this.attractivenessCalculator = new RetailerAttractiveness();

        // Config from simulation engine
        this.config = simulationEngine.config?.retail?.demand || {
            recessionImpactOnLuxury: 0.5,
            boomImpactOnLuxury: 1.3,
            necessityFloor: 0.7
        };

        // Cache for city retailers by city
        this.retailersByCity = new Map();

        // Track demand fulfillment for statistics
        this.demandStats = {
            totalDemand: 0,
            fulfilledDemand: 0,
            unfulfilledDemand: 0,
            byProduct: new Map()
        };
    }

    /**
     * Process competitive retail sales for all cities
     * Called hourly from SimulationEngine
     */
    processCompetitiveRetailSales(currentHour) {
        // Reset hourly stats
        this.demandStats = {
            totalDemand: 0,
            fulfilledDemand: 0,
            unfulfilledDemand: 0,
            byProduct: new Map()
        };

        // Group retailers by city
        this.updateRetailersByCity();

        // Process each city
        for (const city of this.engine.cities) {
            this.processCityDemand(city, currentHour);
        }

        return this.demandStats;
    }

    /**
     * Update the cache of retailers by city
     */
    updateRetailersByCity() {
        this.retailersByCity.clear();

        this.engine.firms.forEach(firm => {
            if (firm.type === 'RETAIL') {
                const cityId = firm.city?.id;
                if (!cityId) return;

                if (!this.retailersByCity.has(cityId)) {
                    this.retailersByCity.set(cityId, []);
                }
                this.retailersByCity.get(cityId).push(firm);
            }
        });
    }

    /**
     * Process demand for a single city
     */
    processCityDemand(city, hourOfDay) {
        const retailers = this.retailersByCity.get(city.id) || [];
        if (retailers.length === 0) return;

        // Get all products that retailers in this city carry
        const productsInCity = this.getProductsInCity(retailers);

        // Process each product
        for (const productId of productsInCity) {
            const product = this.productRegistry.getProduct(productId);
            if (!product) continue;

            // Calculate total city demand for this product
            const totalDemand = this.calculateProductDemand(product, city, hourOfDay);
            if (totalDemand <= 0) continue;

            // Get retailers that stock this product
            const retailersWithProduct = retailers.filter(r => {
                const inv = r.productInventory.get(productId);
                return inv && inv.quantity > 0;
            });

            if (retailersWithProduct.length === 0) {
                // Track unfulfilled demand
                this.demandStats.totalDemand += totalDemand;
                this.demandStats.unfulfilledDemand += totalDemand;
                continue;
            }

            // Distribute demand among retailers
            const allocations = this.distributeToRetailers(product, totalDemand, retailersWithProduct, city);

            // Have each retailer fulfill their allocation
            this.fulfillAllocations(product, allocations, hourOfDay);
        }
    }

    /**
     * Get set of all product IDs stocked by retailers in city
     */
    getProductsInCity(retailers) {
        const products = new Set();

        retailers.forEach(retailer => {
            retailer.productInventory.forEach((inv, productId) => {
                if (inv.quantity > 0) {
                    products.add(productId);
                }
            });
        });

        return products;
    }

    /**
     * Calculate total city-wide demand for a product
     * Formula: purchaseFrequency_perHour_per1000Pop × (population / 1000) × publicDemand × hourlyModifier × economicModifier × variance
     */
    calculateProductDemand(product, city, hourOfDay) {
        const population = city.population || 1000000;
        const pop1000 = population / 1000;

        // Base demand from product attributes
        const purchaseFrequency = product.purchaseFrequency || 1;
        const publicDemand = product.publicDemand || 0.5;

        // Time of day modifier
        const hourlyModifier = this.getHourlyModifier(hourOfDay);

        // Economic conditions modifier
        const economicModifier = this.getEconomicModifier(product, city);

        // Random variance (±20%)
        const variance = 0.8 + Math.random() * 0.4;

        // Calculate total demand
        const demand = purchaseFrequency * pop1000 * publicDemand * hourlyModifier * economicModifier * variance;

        return Math.floor(Math.max(0, demand));
    }

    /**
     * Get hourly demand modifier based on time of day
     * Peak hours: 12pm lunch, 6-8pm evening shopping
     */
    getHourlyModifier(hour) {
        const modifiers = {
            0: 0.0, 1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0, 5: 0.0,
            6: 0.1, 7: 0.3, 8: 0.5, 9: 0.7, 10: 0.9, 11: 1.1,
            12: 1.4, 13: 1.2, 14: 1.0, 15: 0.9, 16: 0.9, 17: 1.1,
            18: 1.5, 19: 1.6, 20: 1.3, 21: 0.9, 22: 0.4, 23: 0.1
        };

        return modifiers[hour] || 1.0;
    }

    /**
     * Get economic modifier based on product type and city economic health
     * - Necessities (publicNecessity > 0.8): stable demand
     * - Luxuries (publicLuxury > 0.6): elastic demand
     * - Standard: moderate impact
     */
    getEconomicModifier(product, city) {
        // Economic health indicator (0-1, based on consumer confidence and salary level)
        const economicHealth = (city.consumerConfidence + city.salaryLevel) / 2;

        const publicNecessity = product.publicNecessity || 0.5;
        const publicLuxury = product.publicLuxury || 0.5;

        // Necessities have stable demand
        if (publicNecessity > 0.8) {
            // Range: 0.7 to 1.0 (floor of 0.7, max boost of 0.1)
            return Math.max(this.config.necessityFloor, 0.9 + economicHealth * 0.1);
        }

        // Luxuries are highly elastic
        if (publicLuxury > 0.6) {
            // Range: 0.5 (recession) to 1.3 (boom)
            const recessionImpact = this.config.recessionImpactOnLuxury;
            const boomImpact = this.config.boomImpactOnLuxury;
            return recessionImpact + economicHealth * (boomImpact - recessionImpact);
        }

        // Standard products: moderate elasticity
        // Range: 0.7 to 1.3
        return 0.7 + economicHealth * 0.6;
    }

    /**
     * Distribute demand among retailers based on attractiveness scores
     * Uses local preference to split demand between local and non-local retailers
     */
    distributeToRetailers(product, totalDemand, retailers, city) {
        const allocations = new Map();

        if (retailers.length === 0) return allocations;

        // Get local preference for this city (default 0.5 = 50% local)
        const localPreference = city.localPreference ?? 0.5;

        // Split retailers into local and non-local
        const localRetailers = retailers.filter(r => this.isLocalRetailer(r, city));
        const nonLocalRetailers = retailers.filter(r => !this.isLocalRetailer(r, city));

        // Calculate demand pools
        let localDemandPool = totalDemand * localPreference;
        let nonLocalDemandPool = totalDemand * (1 - localPreference);

        // If one pool has no retailers, give demand to the other
        if (localRetailers.length === 0) {
            nonLocalDemandPool += localDemandPool;
            localDemandPool = 0;
        }
        if (nonLocalRetailers.length === 0) {
            localDemandPool += nonLocalDemandPool;
            nonLocalDemandPool = 0;
        }

        // Calculate attractiveness scores
        const avgPrice = this.calculateAveragePrice(product, retailers);

        // Distribute local demand pool
        if (localDemandPool > 0 && localRetailers.length > 0) {
            this.distributeWithinPool(product, localDemandPool, localRetailers, avgPrice, allocations);
        }

        // Distribute non-local demand pool
        if (nonLocalDemandPool > 0 && nonLocalRetailers.length > 0) {
            this.distributeWithinPool(product, nonLocalDemandPool, nonLocalRetailers, avgPrice, allocations);
        }

        return allocations;
    }

    /**
     * Check if retailer is "local" to the city
     * Local = retailer's city matches consumer's city
     */
    isLocalRetailer(retailer, city) {
        // For now, all retailers operating in a city are considered local
        // In future, could check corporation HQ location
        return retailer.city?.id === city.id;
    }

    /**
     * Calculate average price for a product across retailers
     */
    calculateAveragePrice(product, retailers) {
        let totalPrice = 0;
        let count = 0;

        retailers.forEach(retailer => {
            const inv = retailer.productInventory.get(product.id);
            if (inv) {
                totalPrice += inv.retailPrice;
                count++;
            }
        });

        return count > 0 ? totalPrice / count : product.basePrice;
    }

    /**
     * Distribute demand within a pool (local or non-local) proportionally by score
     */
    distributeWithinPool(product, demandPool, retailers, avgPrice, allocations) {
        // Calculate scores for each retailer
        const scores = new Map();
        let totalScore = 0;

        retailers.forEach(retailer => {
            const inv = retailer.productInventory.get(product.id);
            if (!inv || inv.quantity <= 0) return;

            const score = this.attractivenessCalculator.calculateScore(
                retailer, product, inv.retailPrice, avgPrice
            );

            scores.set(retailer.id, { retailer, score, inventory: inv.quantity });
            totalScore += score;
        });

        if (totalScore === 0) return;

        // Distribute demand proportionally by score
        scores.forEach((data, retailerId) => {
            const proportion = data.score / totalScore;
            const allocatedDemand = Math.floor(demandPool * proportion);

            // Cap at available inventory (floor to ensure whole numbers)
            const actualAllocation = Math.floor(Math.min(allocatedDemand, data.inventory));

            if (actualAllocation > 0) {
                allocations.set(retailerId, {
                    retailer: data.retailer,
                    demand: actualAllocation,
                    score: data.score
                });
            }
        });
    }

    /**
     * Have retailers fulfill their allocated demand
     */
    fulfillAllocations(product, allocations, hourOfDay) {
        let fulfilled = 0;
        let unfulfilled = 0;

        allocations.forEach((allocation, retailerId) => {
            const result = allocation.retailer.fulfillAllocatedDemand(
                product.id,
                allocation.demand,
                hourOfDay
            );

            fulfilled += result.sold;
            unfulfilled += result.unfulfilled;
        });

        // Update stats
        const totalDemand = fulfilled + unfulfilled;
        this.demandStats.totalDemand += totalDemand;
        this.demandStats.fulfilledDemand += fulfilled;
        this.demandStats.unfulfilledDemand += unfulfilled;

        // Track by product
        if (!this.demandStats.byProduct.has(product.id)) {
            this.demandStats.byProduct.set(product.id, { demand: 0, fulfilled: 0 });
        }
        const productStats = this.demandStats.byProduct.get(product.id);
        productStats.demand += totalDemand;
        productStats.fulfilled += fulfilled;
    }

    /**
     * Get demand statistics for debugging/logging
     */
    getDemandStats() {
        return this.demandStats;
    }
}
