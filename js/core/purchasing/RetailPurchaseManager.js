// js/core/purchasing/RetailPurchaseManager.js
// Consolidates all retail-specific purchasing logic
// Key principle: Retail stores ONLY purchase through contracts (no spot purchases)
// All retail sales are spot sales to consumers (no contract sales)

import { getLotSizeForProduct } from '../LotSizings.js';

export class RetailPurchaseManager {
    constructor(simulationEngine) {
        this.engine = simulationEngine;

        // References to related managers (set after construction)
        this.contractManager = null;
        this.supplierSelector = null;

        // Caches for performance
        this.retailersByCity = new Map();        // cityId -> retailers[]
        this.supplierCommitments = new Map();    // supplierId -> committed volume

        // Configuration
        this.config = {
            reorderPoint: 0.30,              // Reorder at 30% of target
            targetInventoryDays: 3,          // 3 days of stock target
            contractCoverageTarget: 0.60,    // 60% needs via contracts
            minContractVolume: 50,           // Minimum contract size
            minContractLots: 1,              // Minimum lots per contract
            contractDiscountRate: 0.05,      // 5% retail discount
            hoursOpenPerDay: 12,
            minOrderQuantity: 10
        };

        // Statistics
        this.stats = {
            contractsCreated: 0,
            restockingRequests: 0,
            fulfilledRequests: 0,
            unfulfilledRequests: 0
        };
    }

    /**
     * Wire manager references after construction
     * @param {ContractManager} contractManager
     * @param {SupplierSelector} supplierSelector
     */
    setManagers(contractManager, supplierSelector) {
        this.contractManager = contractManager;
        this.supplierSelector = supplierSelector;
    }

    /**
     * Main entry point - process all retail purchasing for current hour
     * Retail stores ONLY purchase through contracts
     */
    processRetailPurchasing() {
        const retailers = this.getRetailers();

        for (const retailer of retailers) {
            this.processRetailerRestocking(retailer);
        }
    }

    /**
     * Process restocking for a single retail store
     * Retail stores ONLY purchase through contracts - no spot purchases
     * @param {Firm} retailer - The retail store
     */
    processRetailerRestocking(retailer) {
        const products = this.getRetailerProducts(retailer);

        for (const productName of products) {
            const needed = this.calculateRestockingNeeded(retailer, productName);

            if (needed < this.config.minOrderQuantity) continue;

            this.stats.restockingRequests++;

            // Retail stores ONLY use contracts for inventory purchases
            // No spot purchasing fallback - if no contract, retailer must wait
            if (this.contractManager) {
                const fulfilled = this.contractManager.fulfillFromContracts(
                    retailer,
                    productName,
                    needed
                );

                if (fulfilled > 0) {
                    this.stats.fulfilledRequests++;
                } else {
                    this.stats.unfulfilledRequests++;
                }
            }
            // No spot purchase fallback for retail stores
        }
    }

    /**
     * Calculate how much a retailer needs for restocking
     * Uses product-specific demand data (purchaseFrequency, publicDemand) and city population
     * @param {Firm} retailer - The retail store
     * @param {string} productName - Name of the product
     * @returns {number} Quantity needed
     */
    calculateRestockingNeeded(retailer, productName) {
        const current = this.getRetailerInventory(retailer, productName);
        const retailerName = retailer.getDisplayName?.() || retailer.id;

        // Get product-specific demand characteristics
        const product = this.engine.productRegistry?.getProductByName(productName);
        const purchaseFrequency = product?.purchaseFrequency || 1;  // purchases per hour per 1000 pop
        const publicDemand = product?.publicDemand || 0.5;          // demand modifier 0-1

        // Get city population (default to 100k if unknown)
        const cityPopulation = retailer.city?.population || 100000;
        const pop1000 = cityPopulation / 1000;

        // Calculate expected daily sales for this retailer
        // Formula: purchaseFrequency * pop1000 * publicDemand * hoursOpen * retailerMarketShare
        const numRetailersInCity = this.getRetailersInCity(retailer.city?.id)?.length || 10;
        const marketShare = 1 / Math.max(1, numRetailersInCity);  // Split demand among retailers

        const avgDailySales = Math.max(10, Math.floor(
            purchaseFrequency * pop1000 * publicDemand * this.config.hoursOpenPerDay * marketShare
        ));

        const target = avgDailySales * this.config.targetInventoryDays;
        const reorderThreshold = target * this.config.reorderPoint;

        if (current > reorderThreshold) {
            console.log(`📦 ${retailerName} doesn't need "${productName}": ${current} > ${reorderThreshold.toFixed(0)} (threshold) [dailySales=${avgDailySales}]`);
            return 0;
        }

        const needed = Math.floor(Math.max(0, target - current));
        console.log(`📦 ${retailerName} needs ${needed} "${productName}": current=${current}, target=${target.toFixed(0)}, dailySales=${avgDailySales} (freq=${purchaseFrequency}, demand=${publicDemand})`);
        return needed;
    }

    /**
     * Estimate weekly sales for a retailer product
     * @param {Firm} retailer - The retail store
     * @param {string} productName - Name of the product
     * @returns {number} Estimated weekly sales
     */
    estimateWeeklySales(retailer, productName) {
        // Method 1: Use store metrics
        const dailyCustomers = (retailer.dailyFootTraffic || 500) * (retailer.conversionRate || 0.4);
        const avgItemsPerProduct = 2; // Average units per product per purchasing customer
        const productShareFactor = 1 / Math.max(1, retailer.productInventory?.size || 5);
        const weeklyFromMetrics = dailyCustomers * avgItemsPerProduct * productShareFactor * 7;

        // Method 2: Use product demand characteristics
        const product = this.engine.productRegistry?.getProductByName(productName);
        const purchaseFrequency = product?.purchaseFrequency || 1;
        const publicDemand = product?.publicDemand || 0.5;
        const cityPopulation = retailer.city?.population || 100000;
        const pop1000 = cityPopulation / 1000;
        const numRetailersInCity = this.getRetailersInCity(retailer.city?.id)?.length || 10;
        const marketShare = 1 / Math.max(1, numRetailersInCity);

        const weeklyFromDemand = purchaseFrequency * pop1000 * publicDemand * this.config.hoursOpenPerDay * marketShare * 7;

        // Use average of both methods
        return Math.floor((weeklyFromMetrics + weeklyFromDemand) / 2);
    }

    /**
     * Initialize contracts for a newly created retailer
     * Creates supply contracts for each product the retailer sells
     * @param {Firm} retailer - The retail store
     * @returns {number} Number of contracts created
     */
    initializeRetailerContracts(retailer) {
        if (!retailer.productInventory || retailer.productInventory.size === 0) {
            return 0;
        }

        let contractsCreated = 0;

        for (const [productId, invData] of retailer.productInventory) {
            const productName = invData.productName;
            if (!productName) continue;

            const contract = this.createContractForProduct(retailer, productName, invData, productId);
            if (contract) {
                contractsCreated++;
            }
        }

        return contractsCreated;
    }

    /**
     * Create a supply contract for a specific product
     * @param {Firm} retailer - The retail store
     * @param {string} productName - Name of the product
     * @param {object} invData - Inventory data for the product
     * @param {string} productId - Product ID
     * @returns {Contract|null} Created contract or null
     */
    createContractForProduct(retailer, productName, invData, productId) {
        if (!this.contractManager || !this.supplierSelector) {
            console.warn('RetailPurchaseManager: Managers not set, cannot create contract');
            return null;
        }

        // Get lot size for this product to ensure contract volume is compatible
        const lotSize = getLotSizeForProduct(productName, this.engine.productRegistry);

        // Estimate monthly sales need (weekly * 4)
        const weeklyEstimatedSales = this.estimateWeeklySales(retailer, productName);
        const monthlyEstimatedSales = weeklyEstimatedSales * 4;

        // Request coverage percentage via contracts
        let requestedVolume = Math.floor(monthlyEstimatedSales * this.config.contractCoverageTarget);

        // Ensure minimum contract volume meets lot size requirements
        const minVolume = lotSize > 0
            ? Math.max(lotSize * this.config.minContractLots, this.config.minContractVolume)
            : this.config.minContractVolume;

        if (requestedVolume < minVolume) {
            requestedVolume = minVolume;
        }

        // Find best supplier (manufacturer that produces this product)
        const selection = this.supplierSelector.selectBest({
            buyer: retailer,
            productName: productName,
            quantity: requestedVolume,
            considerPrice: true,
            considerTransport: true,
            considerRelationship: true,
            requireInventory: false,
            forSpotPurchase: false
        });

        if (!selection?.supplier) {
            return null; // No supplier found for this product
        }

        const supplier = selection.supplier;
        const supplierId = supplier.id;

        // Check supplier's available capacity (monthly = weekly * 4)
        const maxMonthlyCapacity = this.getSupplierWeeklyCapacity(supplier) * 4;
        const currentCommitment = this.supplierCommitments.get(supplierId) || 0;
        const availableCapacity = maxMonthlyCapacity - currentCommitment;

        if (availableCapacity <= 0) {
            return null; // Supplier fully committed
        }

        // Limit contract volume to available capacity
        let contractVolume = Math.min(requestedVolume, Math.floor(availableCapacity));

        // Align to lot boundaries and ensure minimum viable contract
        if (lotSize > 0) {
            const wholeLots = Math.floor(contractVolume / lotSize);
            if (wholeLots < this.config.minContractLots) {
                return null; // Less than minimum lots per week - not viable for contract
            }
            contractVolume = wholeLots * lotSize;
        } else if (contractVolume < this.config.minContractVolume) {
            return null; // Too small to be worth a contract
        }

        // Get base price - use wholesale price from inventory or product registry
        const product = this.engine.productRegistry?.getProduct(productId) ||
                       this.engine.productRegistry?.getProductByName(productName);
        const basePrice = invData.wholesalePrice || product?.basePrice || 50;
        const contractPrice = basePrice * (1 - this.config.contractDiscountRate);

        // Create the contract
        const contract = this.contractManager.createContract({
            supplierId: supplierId,
            buyerId: retailer.id,
            product: productName,
            type: 'fixed_volume',
            volumePerPeriod: contractVolume,
            periodType: 'monthly',
            pricePerUnit: contractPrice,
            priceType: 'fixed',
            minQuality: 0.5,
            durationMonths: 12,
            shortfallPenaltyRate: 0.10
        });

        if (contract) {
            this.stats.contractsCreated++;
            // Track the commitment
            this.supplierCommitments.set(supplierId, currentCommitment + contractVolume);
        }

        return contract;
    }

    /**
     * Calculate a supplier's maximum weekly production capacity
     * @param {Firm} supplier - The supplier firm
     * @returns {number} Weekly capacity (with 10% buffer)
     */
    getSupplierWeeklyCapacity(supplier) {
        let dailyCapacity = 0;

        // Manufacturing plants
        if (supplier.productionLine?.outputPerHour) {
            dailyCapacity = supplier.productionLine.outputPerHour * 24;
        }
        // Mining companies
        else if (supplier.extractionRate) {
            dailyCapacity = supplier.extractionRate * 24;
        }
        // Logging companies
        else if (supplier.harvestRate) {
            dailyCapacity = supplier.harvestRate * 24;
        }
        // Farms
        else if (supplier.productionRate) {
            dailyCapacity = supplier.productionRate * 24;
        }
        // Default fallback
        else {
            dailyCapacity = 100; // Conservative default
        }

        // Weekly capacity with 10% buffer (only commit 90% of capacity)
        return dailyCapacity * 7 * 0.9;
    }

    /**
     * Get all retail stores
     * @returns {Firm[]} Array of retail stores
     */
    getRetailers() {
        // Check cache first - but don't cache permanently as firms can change
        if (this.engine.firmManager?.getRetailers) {
            return this.engine.firmManager.getRetailers();
        }

        // Fallback: filter from all firms
        const allFirms = this.engine.firms
            ? Array.from(this.engine.firms.values())
            : [];

        return allFirms.filter(f =>
            f.type === 'RetailStore' ||
            f.type === 'RETAIL' ||
            f.type === 'Supermarket' ||
            f.type === 'FashionRetail' ||
            f.type === 'ElectronicsStore'
        );
    }

    /**
     * Get retailers in a specific city
     * @param {string} cityId - City identifier
     * @returns {Firm[]} Array of retailers in the city
     */
    getRetailersInCity(cityId) {
        if (!cityId) return [];

        // Check cache
        if (this.retailersByCity.has(cityId)) {
            return this.retailersByCity.get(cityId);
        }

        // Use firmManager if available
        if (this.engine.firmManager?.getRetailersInCity) {
            const retailers = this.engine.firmManager.getRetailersInCity(cityId);
            this.retailersByCity.set(cityId, retailers);
            return retailers;
        }

        // Fallback: filter manually
        const retailers = this.getRetailers().filter(r =>
            r.city?.id === cityId ||
            r.city?.name === cityId ||
            r.cityId === cityId
        );

        this.retailersByCity.set(cityId, retailers);
        return retailers;
    }

    /**
     * Get products a retailer sells
     * @param {Firm} retailer - The retail store
     * @returns {string[]} Array of product names
     */
    getRetailerProducts(retailer) {
        const products = [];

        if (retailer.productInventory instanceof Map) {
            retailer.productInventory.forEach((invData, productId) => {
                const productName = invData.productName || invData.name ||
                    this.engine.productRegistry?.getProduct(productId)?.name;
                if (productName) products.push(productName);
            });
        } else if (retailer.products) {
            return retailer.products;
        } else if (retailer.productsSold) {
            return retailer.productsSold;
        }

        return products;
    }

    /**
     * Get a retailer's current inventory of a product
     * @param {Firm} retailer - The retail store
     * @param {string} productName - Name of the product
     * @returns {number} Current inventory quantity
     */
    getRetailerInventory(retailer, productName) {
        // Lot-based inventory
        if (retailer.lotInventory) {
            const quantity = retailer.lotInventory.getAvailableQuantity(productName);
            if (quantity > 0) return quantity;
        }

        // Product inventory map (for retailers)
        if (retailer.productInventory instanceof Map) {
            for (const [productId, invData] of retailer.productInventory) {
                const name = invData.productName || invData.name;
                if (name === productName) {
                    return invData.quantity || 0;
                }
            }
            // Also try direct lookup by productId if productName is an id
            const invData = retailer.productInventory.get(productName);
            if (invData) return invData.quantity || 0;
        }

        return 0;
    }

    /**
     * Serialize state for saving
     * @returns {object} Serializable state
     */
    toJSON() {
        return {
            config: { ...this.config },
            stats: { ...this.stats },
            supplierCommitments: Array.from(this.supplierCommitments.entries())
        };
    }

    /**
     * Restore state from saved data
     * @param {object} data - Saved state
     */
    fromJSON(data) {
        if (data.config) {
            this.config = { ...this.config, ...data.config };
        }
        if (data.stats) {
            this.stats = { ...this.stats, ...data.stats };
        }
        if (data.supplierCommitments && Array.isArray(data.supplierCommitments)) {
            this.supplierCommitments = new Map(data.supplierCommitments);
        }
    }

    /**
     * Get current statistics
     * @returns {object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            retailerCount: this.getRetailers().length,
            cachedCities: this.retailersByCity.size,
            trackedSuppliers: this.supplierCommitments.size
        };
    }

    /**
     * Reset statistics (typically at period boundaries)
     */
    resetStats() {
        this.stats = {
            contractsCreated: 0,
            restockingRequests: 0,
            fulfilledRequests: 0,
            unfulfilledRequests: 0
        };
    }

    /**
     * Clear cached data (call when firms change)
     */
    clearCaches() {
        this.retailersByCity.clear();
        // Don't clear supplierCommitments as they track actual contract commitments
    }
}
