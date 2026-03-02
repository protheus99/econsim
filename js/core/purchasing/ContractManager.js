// js/core/purchasing/ContractManager.js
// Manages contract lifecycle and fulfillment

import { Contract } from './Contract.js';
import { TransportCost } from './TransportCost.js';
import { getLotSizeForProduct } from '../LotSizings.js';

export class ContractManager {
    constructor(simulationEngine) {
        this.engine = simulationEngine;

        // All contracts indexed by ID
        this.contracts = new Map();

        // Indices for fast lookup
        this.bySupplier = new Map();  // supplierId -> Set of contractIds
        this.byBuyer = new Map();     // buyerId -> Set of contractIds
        this.byProduct = new Map();   // productName -> Set of contractIds

        // Configuration
        this.config = {
            maxContractsPerFirm: 20,
            defaultTerminationNotice: 2,  // periods
            minContractDuration: 7 * 24,  // hours (1 week)
            autoRenewDefault: false
        };

        // Statistics
        this.stats = {
            totalCreated: 0,
            activeCount: 0,
            totalValue: 0,
            defaultedCount: 0
        };
    }

    /**
     * Create a new supply contract
     * @param {object} config - Contract configuration
     * @returns {Contract|null} Created contract or null if invalid
     */
    createContract(config) {
        // Validate parties exist
        const supplier = this.engine.firms?.get(config.supplierId);
        const buyer = this.engine.firms?.get(config.buyerId);

        if (!supplier || !buyer) {
            console.warn(`ContractManager: Invalid supplier or buyer for contract`);
            return null;
        }

        // Check contract limits
        const supplierContracts = this.getContractsForFirm(config.supplierId);
        const buyerContracts = this.getContractsForFirm(config.buyerId);

        if (supplierContracts.length >= this.config.maxContractsPerFirm) {
            console.warn(`ContractManager: Supplier ${supplier.name} has max contracts`);
            return null;
        }

        if (buyerContracts.length >= this.config.maxContractsPerFirm) {
            console.warn(`ContractManager: Buyer ${buyer.name} has max contracts`);
            return null;
        }

        // Check for duplicate contracts (same product, same parties)
        const existing = this.findContract(config.supplierId, config.buyerId, config.product);
        if (existing && existing.isActive()) {
            console.warn(`ContractManager: Active contract already exists for this product/parties`);
            return null;
        }

        // Add party names for display
        config.supplierName = supplier.name;
        config.buyerName = buyer.name;

        // Create contract
        const contract = new Contract(config);
        this.contracts.set(contract.id, contract);

        // Update indices
        this.addToIndex(this.bySupplier, config.supplierId, contract.id);
        this.addToIndex(this.byBuyer, config.buyerId, contract.id);
        this.addToIndex(this.byProduct, config.product, contract.id);

        // Update stats
        this.stats.totalCreated++;
        this.stats.activeCount++;

        // Record relationship improvement
        if (this.engine.relationshipManager) {
            const sellerCorpId = supplier.corporationId || supplier.corporation?.id;
            const buyerCorpId = buyer.corporationId || buyer.corporation?.id;

            if (sellerCorpId && buyerCorpId && sellerCorpId !== buyerCorpId) {
                this.engine.relationshipManager.recordAction(
                    sellerCorpId,
                    buyerCorpId,
                    'CONTRACT_SIGNED'
                );
            }
        }

        console.log(`ContractManager: Created contract ${contract.id} - ${supplier.getDisplayName()} -> ${buyer.getDisplayName()} for ${config.product}`);
        return contract;
    }

    /**
     * Fulfill purchase from active contracts
     * @param {Firm} buyer - The buying firm
     * @param {string} productName - Product to purchase
     * @param {number} needed - Quantity needed
     * @returns {number} Quantity fulfilled from contracts
     */
    fulfillFromContracts(buyer, productName, needed) {
        // Validate buyer
        if (!buyer || !buyer.id) {
            return 0;
        }

        let fulfilled = 0;

        // Get all active contracts for this buyer and product
        const relevantContracts = this.getActiveContractsForBuyer(buyer.id, productName);

        if (relevantContracts.length === 0) {
            return 0;
        }

        // Sort by priority: exclusive first, then by fulfillment rate
        relevantContracts.sort((a, b) => {
            if (a.type === Contract.TYPES.EXCLUSIVE) return -1;
            if (b.type === Contract.TYPES.EXCLUSIVE) return 1;
            return b.averageFulfillmentRate - a.averageFulfillmentRate;
        });

        for (const contract of relevantContracts) {
            if (fulfilled >= needed) break;

            const supplier = this.engine.firms?.get(contract.supplierId);
            if (!supplier) continue;

            // Check how much can be ordered under this contract
            const maxOrderable = contract.getMaxOrderableVolume();
            if (maxOrderable <= 0) continue;

            // Check supplier inventory
            const available = this.getSupplierInventory(supplier, productName);
            if (available <= 0) continue;

            // Determine delivery quantity (aligned to lot sizes)
            let toDeliver = Math.floor(Math.min(
                available,
                maxOrderable,
                needed - fulfilled
            ));

            // Align to lot boundaries for efficiency
            const lotSize = getLotSizeForProduct(productName, this.engine.productRegistry);
            if (lotSize > 0 && toDeliver >= lotSize) {
                // Round down to whole lots
                const wholeLots = Math.floor(toDeliver / lotSize);
                toDeliver = wholeLots * lotSize;
            }

            if (toDeliver > 0) {
                // Get quality from lots if available
                const quality = this.getDeliveryQuality(supplier, productName, toDeliver);

                // Check quality meets minimum
                if (quality < contract.minQuality) {
                    console.log(`ContractManager: Supplier ${supplier.name} quality ${quality.toFixed(2)} below contract minimum ${contract.minQuality}`);
                    continue;
                }

                // Calculate price
                const marketPrice = this.engine.commodityMarket?.get(productName) ||
                                   this.engine.productRegistry?.getProductByName(productName)?.basePrice;
                const unitPrice = contract.calculateUnitPrice(quality, marketPrice);

                // Execute the trade
                const success = this.executeContractTrade(
                    supplier,
                    buyer,
                    productName,
                    toDeliver,
                    unitPrice,
                    quality,
                    contract
                );

                if (success) {
                    contract.recordDelivery(toDeliver, quality, unitPrice);
                    fulfilled += toDeliver;
                }
            }
        }

        return fulfilled;
    }

    /**
     * Execute a contract-based trade between supplier and buyer
     * Creates a pending delivery with proper transit time
     */
    executeContractTrade(supplier, buyer, product, quantity, unitPrice, quality, contract) {
        // Validate parties
        if (!supplier || !buyer) {
            console.warn('ContractManager: Invalid supplier or buyer for contract trade');
            return false;
        }

        // Calculate transport cost and time
        const transport = this.calculateTransport(supplier, buyer, quantity);
        const totalProductCost = quantity * unitPrice;
        const totalCost = totalProductCost + transport.cost;

        // Check buyer can afford (product + transport)
        const buyerCash = buyer.cash || 0;
        if (buyerCash < totalCost) {
            return false;
        }

        // Remove goods from supplier inventory immediately
        const removed = this.removeFromSupplierInventory(supplier, product, quantity);
        if (removed <= 0) {
            return false;
        }

        // Execute payment (immediate - payment on dispatch)
        buyer.cash -= totalCost;
        supplier.cash += totalProductCost; // Supplier gets product cost only

        // Calculate arrival time
        const currentHour = this.engine.clock?.totalHours || 0;
        const arrivalHour = currentHour + transport.hours;

        // Log delivery creation with transit time (useful for debugging)
        if (transport.hours > 4) {
            const supplierName = supplier.getDisplayName?.() || supplier.name || supplier.id || 'Unknown Supplier';
            const buyerName = buyer.getDisplayName?.() || buyer.name || buyer.id || 'Unknown Buyer';
            console.log(`📦 Contract delivery: ${Math.floor(removed)} ${product} from ${supplierName} to ${buyerName} - ${transport.hours}h transit (${transport.mode})`);
        }

        // Create pending delivery instead of instant transfer
        const purchaseManager = this.engine.purchaseManager;
        if (purchaseManager) {
            purchaseManager.createPendingDelivery({
                seller: supplier,
                buyer: buyer,
                productName: product,
                quantity: removed,
                quality: quality,
                unitPrice: unitPrice,
                transportCost: transport.cost,
                contractId: contract.id,
                arrivalHour: arrivalHour
            });
        } else {
            // Fallback: instant transfer if no purchase manager
            this.transferGoods(supplier, buyer, product, removed);
        }

        return true;
    }

    /**
     * Transfer goods between firms
     */
    transferGoods(supplier, buyer, product, quantity) {
        // Use lot inventory if available
        if (supplier.lotInventory && buyer.lotInventory) {
            const lots = supplier.lotInventory.removeLots(product, quantity);
            if (lots && lots.totalRemoved > 0) {
                // Transfer lots directly to buyer (they're already Lot instances)
                for (const lot of lots.lots) {
                    lot.status = 'AVAILABLE';  // Reset status for new owner
                    buyer.lotInventory.addLot(lot);
                }
                return lots.totalRemoved;
            }
        }

        // Fallback to simple inventory transfer
        const available = this.getSupplierInventory(supplier, product);
        const toTransfer = Math.min(available, quantity);

        if (toTransfer <= 0) return 0;

        // Decrease supplier inventory
        if (supplier.inventory && supplier.inventory.quantity !== undefined) {
            supplier.inventory.quantity -= toTransfer;
        } else if (supplier.finishedGoodsInventory) {
            supplier.finishedGoodsInventory.quantity -= toTransfer;
        }

        // Increase buyer inventory
        if (buyer.rawMaterialInventory) {
            const current = buyer.rawMaterialInventory.get(product)?.quantity || 0;
            buyer.rawMaterialInventory.set(product, { quantity: current + toTransfer });
        } else if (buyer.inventory) {
            buyer.inventory.quantity = (buyer.inventory.quantity || 0) + toTransfer;
        }

        return toTransfer;
    }

    /**
     * Calculate transport cost and time between supplier and buyer
     * @param {Firm} supplier - The supplier firm
     * @param {Firm} buyer - The buyer firm
     * @param {number} quantity - Quantity being shipped
     * @returns {object} { cost, hours, distance, mode }
     */
    calculateTransport(supplier, buyer, quantity) {
        const supplierCity = supplier.city;
        const buyerCity = buyer.city;

        if (!supplierCity || !buyerCity) {
            // Default values if cities unavailable
            return { cost: 0, hours: 1, distance: 0, mode: 'truck' };
        }

        // Use TransportCost class to calculate
        const transport = TransportCost.calculate(supplierCity, buyerCity, quantity);

        return {
            cost: transport.cost,
            hours: transport.hours,
            distance: transport.distance,
            mode: transport.mode
        };
    }

    /**
     * Remove goods from supplier inventory for shipping
     * Goods are removed immediately when shipped, before transit
     * @param {Firm} supplier - The supplier firm
     * @param {string} product - Product name
     * @param {number} quantity - Quantity to remove
     * @returns {number} Quantity actually removed
     */
    removeFromSupplierInventory(supplier, product, quantity) {
        // Try lot-based inventory first
        if (supplier.lotInventory) {
            const result = supplier.lotInventory.removeLots(product, quantity);
            if (result && result.totalRemoved > 0) {
                // Store removed lots temporarily for delivery completion
                // (They'll be transferred to buyer when delivery arrives)
                return result.totalRemoved;
            }
        }

        // Fallback to simple inventory
        if (supplier.inventory && typeof supplier.inventory.quantity === 'number') {
            const available = supplier.inventory.quantity;
            const removed = Math.min(available, quantity);
            supplier.inventory.quantity -= removed;
            return removed;
        }

        if (supplier.finishedGoodsInventory && typeof supplier.finishedGoodsInventory.quantity === 'number') {
            const available = supplier.finishedGoodsInventory.quantity;
            const removed = Math.min(available, quantity);
            supplier.finishedGoodsInventory.quantity -= removed;
            return removed;
        }

        return 0;
    }

    /**
     * Get supplier's available inventory for a product
     */
    getSupplierInventory(supplier, productName) {
        // Lot-based inventory (use getAvailableQuantity)
        if (supplier.lotInventory) {
            const quantity = supplier.lotInventory.getAvailableQuantity(productName);
            if (quantity > 0) {
                return quantity;
            }
        }

        // Legacy inventory
        if (supplier.inventory?.quantity) return supplier.inventory.quantity;
        if (supplier.finishedGoodsInventory?.quantity) return supplier.finishedGoodsInventory.quantity;

        return 0;
    }

    /**
     * Get average quality for a delivery quantity
     */
    getDeliveryQuality(supplier, productName, quantity) {
        if (supplier.lotInventory) {
            // Use getAvailableLots if available, otherwise estimate from quality property
            const availableQty = supplier.lotInventory.getAvailableQuantity(productName);
            if (availableQty > 0) {
                // Get quality from lot inventory's average or default
                const avgQuality = supplier.lotInventory.getAverageQuality?.(productName) ||
                                   supplier.inventory?.quality ||
                                   1.0;
                return avgQuality;
            }
        }

        // Default quality
        return supplier.inventory?.quality || 1.0;
    }

    /**
     * Process scheduled deliveries (called each simulation tick)
     * @param {number} currentTime - Current simulation time
     */
    processScheduledDeliveries(currentTime) {
        for (const contract of this.contracts.values()) {
            if (!contract.isActive()) continue;

            // Check for period reset
            contract.checkPeriodReset(currentTime);

            // Check for expiration
            if (contract.isExpired()) {
                contract.status = Contract.STATUS.COMPLETED;
                this.stats.activeCount--;
            }

            // Check for pending termination
            if (contract.status === Contract.STATUS.PENDING &&
                contract.terminationEffectiveAt &&
                currentTime >= contract.terminationEffectiveAt) {
                contract.status = Contract.STATUS.TERMINATED;
                this.stats.activeCount--;
            }
        }
    }

    /**
     * Find existing contract between parties for a product
     */
    findContract(supplierId, buyerId, product) {
        for (const contract of this.contracts.values()) {
            if (contract.supplierId === supplierId &&
                contract.buyerId === buyerId &&
                contract.product === product) {
                return contract;
            }
        }
        return null;
    }

    /**
     * Get all contracts for a firm (as supplier or buyer)
     */
    getContractsForFirm(firmId) {
        const contracts = [];
        const asSupplier = this.bySupplier.get(firmId) || new Set();
        const asBuyer = this.byBuyer.get(firmId) || new Set();

        for (const id of asSupplier) {
            const contract = this.contracts.get(id);
            if (contract) contracts.push({ role: 'supplier', contract });
        }

        for (const id of asBuyer) {
            const contract = this.contracts.get(id);
            if (contract) contracts.push({ role: 'buyer', contract });
        }

        return contracts;
    }

    /**
     * Get active contracts where firm is buyer for a specific product
     */
    getActiveContractsForBuyer(buyerId, productName = null) {
        const buyerContracts = this.byBuyer.get(buyerId) || new Set();
        const results = [];

        for (const contractId of buyerContracts) {
            const contract = this.contracts.get(contractId);
            if (!contract || !contract.isActive()) continue;
            if (productName && contract.product !== productName) continue;
            results.push(contract);
        }

        return results;
    }

    /**
     * Calculate reserved inventory for a supplier (committed to contracts)
     * Spot buyers should only access inventory beyond this reserved amount
     */
    getReservedInventory(supplierId, productName) {
        const supplierContracts = this.getActiveContractsForSupplier(supplierId, productName);
        let reserved = 0;

        for (const contract of supplierContracts) {
            // Reserve the remaining unfulfilled volume for this period
            const remaining = contract.volumePerPeriod - (contract.currentPeriodFulfilled || 0);
            if (remaining > 0) {
                reserved += remaining;
            }
        }

        return reserved;
    }

    /**
     * Get available inventory for spot sales (total - reserved for contracts)
     */
    getSpotAvailableInventory(supplier, productName) {
        const totalInventory = this.getSupplierInventory(supplier, productName);
        const reserved = this.getReservedInventory(supplier.id, productName);
        return Math.max(0, totalInventory - reserved);
    }

    /**
     * Get active contracts where firm is supplier for a specific product
     */
    getActiveContractsForSupplier(supplierId, productName = null) {
        const supplierContracts = this.bySupplier.get(supplierId) || new Set();
        const results = [];

        for (const contractId of supplierContracts) {
            const contract = this.contracts.get(contractId);
            if (!contract || !contract.isActive()) continue;
            if (productName && contract.product !== productName) continue;
            results.push(contract);
        }

        return results;
    }

    /**
     * Get all contracts for a product
     */
    getContractsForProduct(productName) {
        const productContracts = this.byProduct.get(productName) || new Set();
        return Array.from(productContracts)
            .map(id => this.contracts.get(id))
            .filter(c => c && c.isActive());
    }

    /**
     * Terminate a contract
     */
    terminateContract(contractId, requestedBy = 'buyer', immediate = false) {
        const contract = this.contracts.get(contractId);
        if (!contract) return null;

        if (immediate) {
            const result = contract.terminateImmediately(`Terminated by ${requestedBy}`);

            // Record relationship damage for breach
            this.recordRelationshipImpact(contract, -15);

            this.stats.activeCount--;
            return result;
        } else {
            const result = contract.requestTermination(requestedBy);
            return result;
        }
    }

    /**
     * Mark contract as defaulted (repeated failures)
     */
    markDefaulted(contractId) {
        const contract = this.contracts.get(contractId);
        if (!contract) return;

        contract.markDefaulted();
        this.stats.defaultedCount++;
        this.stats.activeCount--;

        // Significant relationship damage
        this.recordRelationshipImpact(contract, -25);
    }

    /**
     * Record relationship impact from contract events
     */
    recordRelationshipImpact(contract, impact) {
        if (!this.engine.relationshipManager) return;

        const supplier = this.engine.firms?.get(contract.supplierId);
        const buyer = this.engine.firms?.get(contract.buyerId);

        if (!supplier || !buyer) return;

        const sellerCorpId = supplier.corporationId || supplier.corporation?.id;
        const buyerCorpId = buyer.corporationId || buyer.corporation?.id;

        if (sellerCorpId && buyerCorpId && sellerCorpId !== buyerCorpId) {
            this.engine.relationshipManager.adjust(sellerCorpId, buyerCorpId, impact);
        }
    }

    /**
     * Add contract ID to an index
     */
    addToIndex(indexMap, key, contractId) {
        if (!indexMap.has(key)) {
            indexMap.set(key, new Set());
        }
        indexMap.get(key).add(contractId);
    }

    /**
     * Remove contract ID from an index
     */
    removeFromIndex(indexMap, key, contractId) {
        const set = indexMap.get(key);
        if (set) {
            set.delete(contractId);
        }
    }

    /**
     * Get total contracted demand for a supplier's product
     * Returns the sum of volume obligations across all active contracts
     * @param {string} supplierId - The supplier's ID
     * @param {string} productName - The product name
     * @returns {object} { dailyDemand, weeklyDemand, hasContracts }
     */
    getContractedDemandForSupplier(supplierId, productName) {
        const contracts = this.getActiveContractsForSupplier(supplierId, productName);

        let dailyDemand = 0;
        let weeklyDemand = 0;

        for (const contract of contracts) {
            const volume = contract.volumePerPeriod || contract.maxVolume || 0;

            switch (contract.periodType) {
                case Contract.PERIODS.DAILY:
                    dailyDemand += volume;
                    weeklyDemand += volume * 7;
                    break;
                case Contract.PERIODS.WEEKLY:
                    dailyDemand += volume / 7;
                    weeklyDemand += volume;
                    break;
                case Contract.PERIODS.MONTHLY:
                    dailyDemand += volume / 30;
                    weeklyDemand += volume / 4;
                    break;
            }
        }

        return {
            dailyDemand,
            weeklyDemand,
            hasContracts: contracts.length > 0,
            contractCount: contracts.length
        };
    }

    /**
     * Check if a supplier should throttle production based on contract coverage
     * @param {Firm} supplier - The supplying firm
     * @param {string} productName - The product being produced
     * @param {number} currentInventory - Current available inventory
     * @param {boolean} isPerishable - Whether the product is perishable
     * @param {number} shelfLifeDays - Shelf life in days (if perishable)
     * @returns {object} { shouldThrottle, reason, throttlePercent }
     */
    shouldThrottleProduction(supplier, productName, currentInventory, isPerishable = false, shelfLifeDays = 30) {
        const demand = this.getContractedDemandForSupplier(supplier.id, productName);

        // If no contracts exist
        if (!demand.hasContracts) {
            // For perishables without contracts, throttle heavily
            if (isPerishable) {
                // Allow minimal production (1 day buffer) for spot market
                const spotBuffer = demand.dailyDemand || (currentInventory * 0.1);
                if (currentInventory > spotBuffer) {
                    return {
                        shouldThrottle: true,
                        reason: 'NO_CONTRACTS_PERISHABLE',
                        throttlePercent: 90,  // Reduce production by 90%
                        message: `No contracts for perishable ${productName}, inventory ${currentInventory} exceeds spot buffer ${spotBuffer.toFixed(0)}`
                    };
                }
            }
            // Non-perishables: still warn but allow limited production
            if (currentInventory > 1000) {
                return {
                    shouldThrottle: true,
                    reason: 'NO_CONTRACTS_HIGH_INVENTORY',
                    throttlePercent: 50,
                    message: `No contracts for ${productName}, high inventory ${currentInventory}`
                };
            }
            return { shouldThrottle: false, reason: 'SPOT_MARKET_OK', throttlePercent: 0 };
        }

        // With contracts: calculate coverage
        const daysOfInventory = demand.dailyDemand > 0 ? currentInventory / demand.dailyDemand : 999;

        // For perishables, don't produce more than can be sold before expiration
        if (isPerishable) {
            const maxBufferDays = Math.min(shelfLifeDays * 0.7, 5);  // 70% of shelf life or 5 days max
            if (daysOfInventory > maxBufferDays) {
                const excessPercent = Math.min(90, ((daysOfInventory - maxBufferDays) / maxBufferDays) * 100);
                return {
                    shouldThrottle: true,
                    reason: 'PERISHABLE_EXCESS',
                    throttlePercent: excessPercent,
                    message: `${daysOfInventory.toFixed(1)} days of ${productName} exceeds safe buffer of ${maxBufferDays} days`
                };
            }
        }

        // For non-perishables, use 7-day buffer
        if (daysOfInventory > 7) {
            const excessPercent = Math.min(75, ((daysOfInventory - 7) / 7) * 50);
            return {
                shouldThrottle: true,
                reason: 'HIGH_INVENTORY',
                throttlePercent: excessPercent,
                message: `${daysOfInventory.toFixed(1)} days of inventory exceeds 7-day target`
            };
        }

        return { shouldThrottle: false, reason: 'INVENTORY_OK', throttlePercent: 0 };
    }

    /**
     * Remove a contract entirely
     */
    removeContract(contractId) {
        const contract = this.contracts.get(contractId);
        if (!contract) return false;

        // Remove from indices
        this.removeFromIndex(this.bySupplier, contract.supplierId, contractId);
        this.removeFromIndex(this.byBuyer, contract.buyerId, contractId);
        this.removeFromIndex(this.byProduct, contract.product, contractId);

        // Remove from main map
        this.contracts.delete(contractId);

        if (contract.isActive()) {
            this.stats.activeCount--;
        }

        return true;
    }

    /**
     * Get contract by ID
     */
    getContract(contractId) {
        return this.contracts.get(contractId);
    }

    /**
     * Get all active contracts
     */
    getAllActive() {
        return Array.from(this.contracts.values()).filter(c => c.isActive());
    }

    /**
     * Get statistics
     */
    getStats() {
        // Calculate current total value
        let activeValue = 0;
        for (const contract of this.contracts.values()) {
            if (contract.isActive()) {
                activeValue += contract.totalValue;
            }
        }
        this.stats.totalValue = activeValue;

        return { ...this.stats };
    }

    /**
     * Serialize all contracts for saving
     */
    toJSON() {
        const contractsArray = [];
        for (const contract of this.contracts.values()) {
            contractsArray.push(contract.toJSON());
        }

        return {
            contracts: contractsArray,
            config: this.config,
            stats: this.stats
        };
    }

    /**
     * Load contracts from saved data
     */
    fromJSON(data) {
        this.config = { ...this.config, ...data.config };
        this.stats = { ...this.stats, ...data.stats };

        // Clear existing
        this.contracts.clear();
        this.bySupplier.clear();
        this.byBuyer.clear();
        this.byProduct.clear();

        // Load contracts
        for (const contractData of data.contracts || []) {
            const contract = Contract.fromJSON(contractData);
            this.contracts.set(contract.id, contract);

            // Rebuild indices
            this.addToIndex(this.bySupplier, contract.supplierId, contract.id);
            this.addToIndex(this.byBuyer, contract.buyerId, contract.id);
            this.addToIndex(this.byProduct, contract.product, contract.id);
        }
    }
}
