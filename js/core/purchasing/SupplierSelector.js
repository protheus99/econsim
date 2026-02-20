// js/core/purchasing/SupplierSelector.js
// Evaluates and selects the best supplier based on multiple criteria

import { TransportCost } from './TransportCost.js';

export class SupplierSelector {
    constructor(simulationEngine) {
        this.engine = simulationEngine;

        // Configuration for scoring weights
        this.config = {
            // Weight factors for scoring (should sum to ~1.0)
            locationWeight: 0.25,
            priceWeight: 0.35,
            transportWeight: 0.20,
            relationshipWeight: 0.10,
            inventoryWeight: 0.10,

            // Location tier bonuses (higher = better)
            locationScores: {
                local: 100,
                domestic: 70,
                international: 40
            },

            // Minimum inventory threshold (as fraction of needed)
            minInventoryThreshold: 0.5
        };
    }

    /**
     * Find and rank all potential suppliers for a product
     * @param {object} options - Selection options
     * @param {Firm} options.buyer - The buying firm
     * @param {string} options.productName - Name of product needed
     * @param {number} options.quantity - Quantity needed
     * @param {boolean} options.considerPrice - Include price in scoring
     * @param {boolean} options.considerTransport - Include transport cost
     * @param {boolean} options.considerRelationship - Include corp relationships
     * @returns {object|null} Best selection or null if none available
     */
    selectBest(options) {
        const {
            buyer,
            productName,
            quantity,
            considerPrice = true,
            considerTransport = true,
            considerRelationship = true
        } = options;

        // Find all potential suppliers
        const suppliers = this.findSuppliers(productName);

        if (suppliers.length === 0) {
            return null;
        }

        // Get buyer location info
        const buyerCity = buyer.city;
        const buyerCountry = buyer.city?.country?.name || buyer.country?.name;

        // Score each supplier
        const scored = suppliers.map(supplier => {
            const score = this.calculateScore(
                supplier,
                buyer,
                productName,
                quantity,
                { considerPrice, considerTransport, considerRelationship }
            );
            return { supplier, ...score };
        });

        // Sort by total score (higher is better)
        scored.sort((a, b) => b.totalScore - a.totalScore);

        // Filter out suppliers with insufficient inventory
        const viable = scored.filter(s =>
            s.availableQty >= quantity * this.config.minInventoryThreshold
        );

        if (viable.length > 0) {
            return viable[0];
        }

        // If no viable suppliers, return best option anyway (partial fulfillment)
        return scored[0] || null;
    }

    /**
     * Find all suppliers that produce a specific product
     */
    findSuppliers(productName) {
        const suppliers = [];

        this.engine.firms.forEach(firm => {
            // Check if firm produces this product
            const produces = this.firmProduces(firm, productName);
            if (!produces) return;

            // Check if firm has inventory
            const inventory = this.getInventory(firm, productName);
            if (inventory <= 0) return;

            suppliers.push(firm);
        });

        return suppliers;
    }

    /**
     * Check if a firm produces a specific product
     */
    firmProduces(firm, productName) {
        // Primary producers (Mining, Logging, Farm)
        if (firm.resourceType === productName) return true;
        if (firm.timberType === productName) return true;
        if (firm.cropType === productName) return true;
        if (firm.livestockType === productName) return true;

        // Manufacturing
        if (firm.product?.name === productName) return true;
        if (firm.outputProduct === productName) return true;

        return false;
    }

    /**
     * Get available inventory for a product from a firm
     */
    getInventory(firm, productName) {
        // Lot-based inventory
        if (firm.lotInventory) {
            const lots = firm.lotInventory.getLots(productName);
            if (lots && lots.length > 0) {
                return lots.reduce((sum, lot) => sum + lot.quantity, 0);
            }
        }

        // Legacy inventory systems
        if (firm.inventory?.quantity) return firm.inventory.quantity;
        if (firm.finishedGoodsInventory?.quantity) return firm.finishedGoodsInventory.quantity;

        // Raw material inventory
        if (firm.rawMaterialInventory) {
            const inv = firm.rawMaterialInventory.get(productName);
            if (inv) return inv.quantity;
        }

        return 0;
    }

    /**
     * Calculate comprehensive score for a supplier
     */
    calculateScore(supplier, buyer, productName, quantity, options) {
        const buyerCity = buyer.city;
        const supplierCity = supplier.city;

        // 1. Location score
        const locationTier = this.getLocationTier(supplierCity, buyerCity);
        const locationScore = this.config.locationScores[locationTier] || 50;

        // 2. Price score (0-100, lower price = higher score)
        let priceScore = 50;
        let unitPrice = 0;
        if (options.considerPrice) {
            unitPrice = this.getUnitPrice(supplier, productName);
            const basePrice = this.engine.productRegistry?.getProductByName(productName)?.basePrice || unitPrice;
            priceScore = this.calculatePriceScore(unitPrice, basePrice);
        }

        // 3. Transport score (0-100, lower cost = higher score)
        let transportScore = 50;
        let transportCost = 0;
        if (options.considerTransport) {
            const transport = TransportCost.calculate(supplierCity, buyerCity, quantity);
            transportCost = transport.cost;
            transportScore = this.calculateTransportScore(transportCost, quantity, unitPrice);
        }

        // 4. Relationship score (0-100)
        let relationshipScore = 50;
        let relationshipMod = 1.0;
        if (options.considerRelationship && this.engine.relationshipManager) {
            const sellerCorpId = supplier.corporationId || supplier.corporation?.id;
            const buyerCorpId = buyer.corporationId || buyer.corporation?.id;

            if (sellerCorpId && buyerCorpId) {
                const relationship = this.engine.relationshipManager.get(sellerCorpId, buyerCorpId);
                relationshipScore = this.normalizeRelationship(relationship);
                relationshipMod = this.engine.relationshipManager.getPriceModifier(sellerCorpId, buyerCorpId);
            }
        }

        // 5. Inventory score (0-100, more inventory = higher score)
        const availableQty = this.getInventory(supplier, productName);
        const inventoryScore = Math.min(100, (availableQty / quantity) * 100);

        // Calculate weighted total
        const totalScore =
            (locationScore * this.config.locationWeight) +
            (priceScore * this.config.priceWeight) +
            (transportScore * this.config.transportWeight) +
            (relationshipScore * this.config.relationshipWeight) +
            (inventoryScore * this.config.inventoryWeight);

        // Calculate effective total cost
        const effectiveUnitPrice = unitPrice * relationshipMod;
        const totalCost = (effectiveUnitPrice * quantity) + transportCost;

        return {
            locationTier,
            locationScore,
            priceScore,
            unitPrice,
            transportScore,
            transportCost,
            relationshipScore,
            relationshipMod,
            inventoryScore,
            availableQty,
            totalScore,
            totalCost,
            effectiveUnitPrice
        };
    }

    /**
     * Get location tier (local, domestic, international)
     */
    getLocationTier(supplierCity, buyerCity) {
        if (!supplierCity || !buyerCity) return 'international';

        // Same city
        if (supplierCity.id === buyerCity.id ||
            supplierCity.name === buyerCity.name) {
            return 'local';
        }

        // Same country
        const supplierCountry = supplierCity.country?.name || supplierCity.country;
        const buyerCountry = buyerCity.country?.name || buyerCity.country;

        if (supplierCountry === buyerCountry) {
            return 'domestic';
        }

        return 'international';
    }

    /**
     * Get unit price for a product from a supplier
     */
    getUnitPrice(supplier, productName) {
        // Try to get from product
        if (supplier.product?.basePrice) return supplier.product.basePrice;

        // Try product registry
        const product = this.engine.productRegistry?.getProductByName(productName);
        if (product?.basePrice) return product.basePrice;

        // Default
        return 100;
    }

    /**
     * Calculate price score (0-100)
     * Lower prices get higher scores
     */
    calculatePriceScore(actualPrice, basePrice) {
        if (basePrice <= 0) return 50;

        const priceDiff = (actualPrice - basePrice) / basePrice;

        // -30% or lower = 100, 0% = 70, +50% or higher = 0
        if (priceDiff <= -0.3) return 100;
        if (priceDiff >= 0.5) return 0;

        // Linear interpolation
        if (priceDiff <= 0) {
            // -30% to 0% maps to 100 to 70
            return 100 - ((priceDiff + 0.3) / 0.3) * 30;
        } else {
            // 0% to 50% maps to 70 to 0
            return 70 - (priceDiff / 0.5) * 70;
        }
    }

    /**
     * Calculate transport score (0-100)
     * Lower transport cost = higher score
     */
    calculateTransportScore(transportCost, quantity, unitPrice) {
        if (quantity <= 0 || unitPrice <= 0) return 50;

        // Calculate transport as percentage of product value
        const productValue = quantity * unitPrice;
        const transportPercent = transportCost / productValue;

        // 0% transport = 100, 50% transport = 0
        if (transportPercent <= 0) return 100;
        if (transportPercent >= 0.5) return 0;

        return 100 - (transportPercent / 0.5) * 100;
    }

    /**
     * Normalize relationship score (-100 to +100) to (0 to 100)
     */
    normalizeRelationship(relationship) {
        // -100 to +100 becomes 0 to 100
        return (relationship + 100) / 2;
    }

    /**
     * Categorize suppliers by location tier
     */
    categorizeByLocation(suppliers, buyerCity) {
        const local = [];
        const domestic = [];
        const international = [];

        suppliers.forEach(supplier => {
            const tier = this.getLocationTier(supplier.city, buyerCity);
            if (tier === 'local') local.push(supplier);
            else if (tier === 'domestic') domestic.push(supplier);
            else international.push(supplier);
        });

        return { local, domestic, international };
    }

    /**
     * Get ranked list of all suppliers with scores
     */
    getRankedSuppliers(options) {
        const { buyer, productName, quantity } = options;

        const suppliers = this.findSuppliers(productName);
        if (suppliers.length === 0) return [];

        const scored = suppliers.map(supplier => {
            const score = this.calculateScore(supplier, buyer, productName, quantity, {
                considerPrice: true,
                considerTransport: true,
                considerRelationship: true
            });
            return { supplier, ...score };
        });

        scored.sort((a, b) => b.totalScore - a.totalScore);
        return scored;
    }
}
