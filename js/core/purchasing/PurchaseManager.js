// js/core/purchasing/PurchaseManager.js
// Central coordinator for all purchasing operations

import { SupplierSelector } from './SupplierSelector.js';
import { ContractManager } from './ContractManager.js';
import { TransportCost } from './TransportCost.js';

export class PurchaseManager {
    constructor(simulationEngine) {
        this.engine = simulationEngine;

        // Initialize sub-managers
        this.supplierSelector = new SupplierSelector(simulationEngine);
        this.contractManager = new ContractManager(simulationEngine);

        // Reference to existing managers (created elsewhere)
        this.retailDemandManager = null;  // Set by SimulationEngine

        // Configuration
        this.config = {
            // Minimum inventory threshold before triggering purchase
            reorderPoint: 0.3,  // Reorder when inventory drops to 30% of target

            // Target inventory levels (multiplier of daily production needs)
            targetInventoryDays: 3,

            // Batch purchasing thresholds
            minOrderQuantity: 10,
            maxOrdersPerHour: 5,

            // Enable/disable features
            enableContracts: true,
            enableCompetitiveRetail: true,
            enableSupplierScoring: true
        };

        // Statistics
        this.stats = {
            purchasesFromContracts: 0,
            purchasesFromSuppliers: 0,
            totalPurchaseValue: 0,
            retailSalesProcessed: 0
        };

        // Track pending purchases for batching
        this.pendingPurchases = new Map();
    }

    /**
     * Set reference to the retail demand manager
     */
    setRetailDemandManager(manager) {
        this.retailDemandManager = manager;
    }

    /**
     * Main entry point - process all purchasing for current hour
     * @param {number} currentHour - Current hour in simulation (0-23)
     */
    processPurchasing(currentHour) {
        const startTime = Date.now();

        // 1. Process contract deliveries first (highest priority)
        if (this.config.enableContracts) {
            this.contractManager.processScheduledDeliveries(Date.now());
        }

        // 2. Process manufacturer and processor supply chain
        this.processManufacturerPurchasing();

        // 3. Process retail store restocking
        this.processRetailPurchasing();

        // 4. Process competitive retail sales (consumer demand)
        if (this.config.enableCompetitiveRetail && this.retailDemandManager) {
            this.processCompetitiveRetail(currentHour);
        }

        // Log performance
        const elapsed = Date.now() - startTime;
        if (elapsed > 100) {
            console.log(`PurchaseManager: Processing took ${elapsed}ms`);
        }
    }

    /**
     * Process purchasing for manufacturers and processors
     * These firms need raw materials and semi-raw goods for production
     */
    processManufacturerPurchasing() {
        const manufacturers = this.getManufacturers();

        for (const manufacturer of manufacturers) {
            this.processFirmPurchasing(manufacturer);
        }
    }

    /**
     * Process purchasing for a single firm
     */
    processFirmPurchasing(firm) {
        // Check multiple possible locations for input materials
        const inputMaterials = firm.inputMaterials ||
                               firm.inputs ||
                               firm.product?.inputs ||
                               [];
        if (inputMaterials.length === 0) return;

        for (const input of inputMaterials) {
            const materialName = input.material || input.name;
            const needed = this.calculateNeeded(firm, materialName, input);

            if (needed <= 0) continue;

            // Track original need
            let remaining = needed;

            // Step 1: Try to fulfill from contracts
            if (this.config.enableContracts) {
                const contractFulfilled = this.contractManager.fulfillFromContracts(
                    firm,
                    materialName,
                    remaining
                );

                remaining -= contractFulfilled;
                if (contractFulfilled > 0) {
                    this.stats.purchasesFromContracts += contractFulfilled;
                }
            }

            if (remaining <= 0) continue;

            // Step 2: Find best supplier and purchase
            if (this.config.enableSupplierScoring) {
                const selection = this.supplierSelector.selectBest({
                    buyer: firm,
                    productName: materialName,
                    quantity: remaining,
                    considerPrice: true,
                    considerTransport: true,
                    considerRelationship: true
                });

                if (selection && selection.supplier) {
                    const purchased = this.executePurchase(
                        firm,
                        selection.supplier,
                        materialName,
                        Math.min(remaining, selection.availableQty),
                        selection.effectiveUnitPrice,
                        selection.transportCost
                    );

                    remaining -= purchased;
                    if (purchased > 0) {
                        this.stats.purchasesFromSuppliers += purchased;
                    }
                }
            }

            // No global market fallback - local suppliers only
        }
    }

    /**
     * Calculate how much material a firm needs to purchase
     */
    calculateNeeded(firm, materialName, inputConfig) {
        // Get current inventory
        const current = this.getFirmInventory(firm, materialName);

        // Calculate target based on production rate
        const productionRate = firm.productionRate || firm.baseProductionRate || 10;
        const quantityPerUnit = inputConfig.quantity || inputConfig.amount || 1;
        const dailyNeed = productionRate * quantityPerUnit * 24;
        const target = dailyNeed * this.config.targetInventoryDays;

        // Calculate reorder point
        const reorderPoint = target * this.config.reorderPoint;

        // Only order if below reorder point
        if (current > reorderPoint) {
            return 0;
        }

        // Order enough to reach target
        return Math.max(0, target - current);
    }

    /**
     * Get a firm's inventory of a specific material/product
     */
    getFirmInventory(firm, materialName) {
        // Lot-based inventory (check getAvailableQuantity first for efficiency)
        if (firm.lotInventory) {
            const quantity = firm.lotInventory.getAvailableQuantity(materialName);
            if (quantity > 0) {
                return quantity;
            }
        }

        // Raw material inventory map (for manufacturers)
        if (firm.rawMaterialInventory) {
            const inv = firm.rawMaterialInventory.get(materialName);
            if (inv) return inv.quantity || inv;
        }

        // Product inventory map (for retailers)
        if (firm.productInventory instanceof Map) {
            // Try by product name - iterate to find matching product
            for (const [productId, invData] of firm.productInventory) {
                const productName = invData.productName || invData.name;
                if (productName === materialName) {
                    return invData.quantity || 0;
                }
            }
            // Also try direct lookup by productId if materialName is an id
            const invData = firm.productInventory.get(materialName);
            if (invData) return invData.quantity || 0;
        }

        // Legacy inventory
        if (firm.inventory && firm.inputProduct === materialName) {
            return firm.inventory.quantity || 0;
        }

        return 0;
    }

    /**
     * Execute a purchase from a specific supplier
     */
    executePurchase(buyer, supplier, productName, quantity, unitPrice, transportCost = 0) {
        if (quantity <= 0) return 0;

        const totalCost = (quantity * unitPrice) + transportCost;

        // Check buyer can afford
        if (buyer.cash < totalCost) {
            const affordable = Math.floor((buyer.cash - transportCost) / unitPrice);
            if (affordable < this.config.minOrderQuantity) {
                return 0;
            }
            quantity = affordable;
        }

        // Check supplier has inventory
        const available = this.supplierSelector.getInventory(supplier, productName);
        if (available < quantity) {
            quantity = available;
        }

        if (quantity <= 0) return 0;

        // Transfer goods
        const transferred = this.transferGoods(supplier, buyer, productName, quantity);

        if (transferred > 0) {
            // Execute payment
            const actualCost = (transferred * unitPrice) + transportCost;
            buyer.cash -= actualCost;
            supplier.cash += (transferred * unitPrice);  // Transport goes elsewhere

            this.stats.totalPurchaseValue += actualCost;

            // Log transaction
            if (this.engine.transactionLog) {
                this.engine.transactionLog.logB2BSale?.(
                    supplier,
                    buyer,
                    productName,
                    transferred,
                    unitPrice
                );
            }

            // Update relationship
            if (this.engine.relationshipManager) {
                const sellerCorpId = supplier.corporationId || supplier.corporation?.id;
                const buyerCorpId = buyer.corporationId || buyer.corporation?.id;

                if (sellerCorpId && buyerCorpId && sellerCorpId !== buyerCorpId) {
                    this.engine.relationshipManager.recordAction(
                        sellerCorpId,
                        buyerCorpId,
                        'TRADE_COMPLETED'
                    );
                }
            }
        }

        return transferred;
    }

    // Global Market REMOVED - local suppliers only

    /**
     * Transfer goods from supplier to buyer
     */
    transferGoods(supplier, buyer, productName, quantity) {
        // Prefer lot-based transfer
        if (supplier.lotInventory && buyer.lotInventory) {
            const result = supplier.lotInventory.removeLots(productName, quantity);
            if (result && result.totalRemoved > 0) {
                for (const lot of result.lots) {
                    // Transfer the lot directly (it's already a Lot instance)
                    lot.status = 'AVAILABLE';  // Reset status for new owner
                    buyer.lotInventory.addLot(lot);
                }
                return result.totalRemoved;
            }
        }

        // Fallback to simple inventory
        let removed = 0;

        // Remove from supplier
        if (supplier.inventory && typeof supplier.inventory.quantity === 'number') {
            const available = supplier.inventory.quantity;
            removed = Math.min(available, quantity);
            supplier.inventory.quantity -= removed;
        } else if (supplier.finishedGoodsInventory) {
            const available = supplier.finishedGoodsInventory.quantity || 0;
            removed = Math.min(available, quantity);
            supplier.finishedGoodsInventory.quantity -= removed;
        }

        // Add to buyer
        if (removed > 0) {
            if (buyer.rawMaterialInventory) {
                const current = buyer.rawMaterialInventory.get(productName)?.quantity || 0;
                buyer.rawMaterialInventory.set(productName, { quantity: current + removed });
            } else if (buyer.inventory) {
                buyer.inventory.quantity = (buyer.inventory.quantity || 0) + removed;
            }
        }

        return removed;
    }

    /**
     * Process retail store restocking from manufacturers/wholesalers
     */
    processRetailPurchasing() {
        const retailers = this.getRetailers();

        for (const retailer of retailers) {
            this.processRetailRestocking(retailer);
        }
    }

    /**
     * Process restocking for a single retail store
     */
    processRetailRestocking(retailer) {
        // Get products this retailer sells
        let products = [];

        // Check various ways products might be stored
        if (retailer.productInventory instanceof Map) {
            // RetailStore uses productInventory Map - get product names from inventory data
            retailer.productInventory.forEach((invData, productId) => {
                const productName = invData.productName || invData.name ||
                    this.engine.productRegistry?.getProduct(productId)?.name;
                if (productName) products.push(productName);
            });
        } else if (retailer.products) {
            products = retailer.products;
        } else if (retailer.productsSold) {
            products = retailer.productsSold;
        }

        for (const productName of products) {
            const needed = this.calculateRetailNeeded(retailer, productName);

            if (needed < this.config.minOrderQuantity) continue;

            let remaining = needed;

            // Try contracts first
            if (this.config.enableContracts) {
                const contractFulfilled = this.contractManager.fulfillFromContracts(
                    retailer,
                    productName,
                    remaining
                );
                remaining -= contractFulfilled;
            }

            if (remaining <= 0) continue;

            // Find manufacturer supplier
            const selection = this.supplierSelector.selectBest({
                buyer: retailer,
                productName: productName,
                quantity: remaining,
                considerPrice: true,
                considerTransport: true,
                considerRelationship: true
            });

            if (selection && selection.supplier) {
                this.executePurchase(
                    retailer,
                    selection.supplier,
                    productName,
                    Math.min(remaining, selection.availableQty),
                    selection.effectiveUnitPrice,
                    selection.transportCost
                );
            }
        }
    }

    /**
     * Calculate how much a retailer needs for restocking
     */
    calculateRetailNeeded(retailer, productName) {
        const current = this.getFirmInventory(retailer, productName);
        const avgDailySales = retailer.getDailySales?.(productName) || 50;
        const target = avgDailySales * this.config.targetInventoryDays;

        if (current > target * this.config.reorderPoint) {
            return 0;
        }

        return Math.max(0, target - current);
    }

    /**
     * Process competitive retail sales
     * Consumer demand is distributed among competing retailers
     */
    processCompetitiveRetail(currentHour) {
        if (!this.retailDemandManager) {
            console.warn('PurchaseManager: No retailDemandManager set');
            return;
        }

        const cities = this.getCities();

        for (const city of cities) {
            const retailers = this.getRetailersInCity(city.id || city.name);
            if (retailers.length === 0) continue;

            // Get products sold in this city
            const products = this.getProductsSoldInCity(retailers);

            for (const productName of products) {
                // Calculate city-wide demand for this product
                const product = this.engine.productRegistry?.getProductByName(productName);
                if (!product) continue;

                const totalDemand = this.retailDemandManager.calculateProductDemand(
                    product,
                    city,
                    currentHour
                );

                if (totalDemand <= 0) continue;

                // Distribute demand among retailers
                const allocations = this.retailDemandManager.distributeToRetailers(
                    product,
                    totalDemand,
                    retailers,
                    city
                );

                // Each retailer fulfills their allocation
                for (const [retailerId, allocation] of allocations) {
                    const retailer = this.engine.firmManager?.getFirm(retailerId) ||
                                    retailers.find(r => r.id === retailerId);

                    if (retailer && retailer.fulfillAllocatedDemand) {
                        retailer.fulfillAllocatedDemand(product, allocation);
                        this.stats.retailSalesProcessed += allocation.demand || 0;
                    }
                }
            }
        }
    }

    /**
     * Get all manufacturers and processors
     */
    getManufacturers() {
        if (this.engine.firmManager?.getManufacturers) {
            return this.engine.firmManager.getManufacturers();
        }

        // Fallback: filter from all firms (firms is a Map)
        const allFirms = this.engine.firms
            ? Array.from(this.engine.firms.values())
            : [];
        return allFirms.filter(f =>
            f.type === 'ManufacturingPlant' ||
            f.type === 'MANUFACTURING' ||
            f.type === 'SteelMill' ||
            f.type === 'Refinery' ||
            f.type === 'TextileMill' ||
            f.type === 'FoodProcessor' ||
            (f.inputMaterials && f.inputMaterials.length > 0)
        );
    }

    /**
     * Get all retail stores
     */
    getRetailers() {
        if (this.engine.firmManager?.getRetailers) {
            return this.engine.firmManager.getRetailers();
        }

        // Fallback: filter from all firms (firms is a Map)
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
     */
    getRetailersInCity(cityId) {
        if (this.engine.firmManager?.getRetailersInCity) {
            return this.engine.firmManager.getRetailersInCity(cityId);
        }

        return this.getRetailers().filter(r =>
            r.city?.id === cityId ||
            r.city?.name === cityId ||
            r.cityId === cityId
        );
    }

    /**
     * Get all cities
     */
    getCities() {
        if (this.engine.cityManager?.getAll) {
            return this.engine.cityManager.getAll();
        }
        if (this.engine.cities) {
            return Array.isArray(this.engine.cities)
                ? this.engine.cities
                : Array.from(this.engine.cities.values());
        }
        return [];
    }

    /**
     * Get unique products sold by retailers
     */
    getProductsSoldInCity(retailers) {
        const products = new Set();

        for (const retailer of retailers) {
            const retProducts = retailer.products || retailer.productsSold || [];
            for (const p of retProducts) {
                products.add(typeof p === 'string' ? p : p.name);
            }
        }

        return Array.from(products);
    }

    /**
     * Get contract manager for external access
     */
    getContractManager() {
        return this.contractManager;
    }

    /**
     * Get supplier selector for external access
     */
    getSupplierSelector() {
        return this.supplierSelector;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            contractStats: this.contractManager.getStats(),
            activeContracts: this.contractManager.getAllActive().length
        };
    }

    /**
     * Reset statistics (typically at period boundaries)
     */
    resetStats() {
        this.stats = {
            purchasesFromContracts: 0,
            purchasesFromSuppliers: 0,
            totalPurchaseValue: 0,
            retailSalesProcessed: 0
        };
    }

    /**
     * Serialize for saving
     */
    toJSON() {
        return {
            config: this.config,
            stats: this.stats,
            contractManager: this.contractManager.toJSON()
        };
    }

    /**
     * Load from saved data
     */
    fromJSON(data) {
        if (data.config) {
            this.config = { ...this.config, ...data.config };
        }
        if (data.stats) {
            this.stats = { ...this.stats, ...data.stats };
        }
        if (data.contractManager) {
            this.contractManager.fromJSON(data.contractManager);
        }
    }
}
