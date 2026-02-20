// js/core/purchasing/ContractManager.js
// Manages contract lifecycle and fulfillment

import { Contract } from './Contract.js';

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
        const supplier = this.engine.firmManager?.getFirm(config.supplierId);
        const buyer = this.engine.firmManager?.getFirm(config.buyerId);

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

        console.log(`ContractManager: Created contract ${contract.id} - ${supplier.name} -> ${buyer.name} for ${config.product}`);
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

            const supplier = this.engine.firmManager?.getFirm(contract.supplierId);
            if (!supplier) continue;

            // Check how much can be ordered under this contract
            const maxOrderable = contract.getMaxOrderableVolume();
            if (maxOrderable <= 0) continue;

            // Check supplier inventory
            const available = this.getSupplierInventory(supplier, productName);
            if (available <= 0) continue;

            // Determine delivery quantity
            const toDeliver = Math.min(
                available,
                maxOrderable,
                needed - fulfilled
            );

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
     */
    executeContractTrade(supplier, buyer, product, quantity, unitPrice, quality, contract) {
        const totalCost = quantity * unitPrice;

        // Check buyer can afford
        if (buyer.cash < totalCost) {
            console.warn(`ContractManager: Buyer ${buyer.name} cannot afford contract delivery`);
            return false;
        }

        // Transfer goods from supplier to buyer
        const transferred = this.transferGoods(supplier, buyer, product, quantity);
        if (transferred <= 0) {
            return false;
        }

        // Execute payment
        buyer.cash -= totalCost;
        supplier.cash += totalCost;

        // Log transaction if transaction log exists
        if (this.engine.transactionLog) {
            this.engine.transactionLog.logB2BSale?.(
                supplier,
                buyer,
                product,
                transferred,
                unitPrice,
                { contractId: contract.id, quality }
            );
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
                // Add lots to buyer
                for (const lot of lots.lots) {
                    buyer.lotInventory.addLot(product, {
                        quantity: lot.quantity,
                        quality: lot.quality,
                        producerId: supplier.id,
                        productionDate: lot.productionDate
                    });
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
     * Get supplier's available inventory for a product
     */
    getSupplierInventory(supplier, productName) {
        // Lot-based inventory
        if (supplier.lotInventory) {
            const lots = supplier.lotInventory.getLots(productName);
            if (lots && lots.length > 0) {
                return lots.reduce((sum, lot) => sum + lot.quantity, 0);
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
            const lots = supplier.lotInventory.getLots(productName);
            if (lots && lots.length > 0) {
                // Calculate weighted average quality
                let totalQuality = 0;
                let totalQty = 0;
                let remaining = quantity;

                for (const lot of lots) {
                    const qty = Math.min(lot.quantity, remaining);
                    totalQuality += lot.quality * qty;
                    totalQty += qty;
                    remaining -= qty;
                    if (remaining <= 0) break;
                }

                return totalQty > 0 ? totalQuality / totalQty : 1.0;
            }
        }

        // Default quality
        return 1.0;
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

        const supplier = this.engine.firmManager?.getFirm(contract.supplierId);
        const buyer = this.engine.firmManager?.getFirm(contract.buyerId);

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
