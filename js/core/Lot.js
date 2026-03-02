// js/core/Lot.js
// Lot-based inventory system for RAW and SEMI_RAW products

/**
 * Represents a bulk group of items (a Lot)
 * Lots are indivisible units that can be traded as whole units
 */
export class Lot {
    constructor(config) {
        this.id = config.id;                      // e.g., "LOT_IRON_1706123456_a1b2c3"
        this.productName = config.productName;
        this.productId = config.productId;
        this.producerId = config.producerId;
        this.quantity = config.quantity;          // Fixed quantity based on product type
        this.unit = config.unit;                  // ton, barrel, cord, etc.
        this.quality = config.quality;            // 0-100
        this.status = config.status || 'AVAILABLE';  // AVAILABLE, RESERVED, IN_TRANSIT, DELIVERED, EXPIRED
        this.createdAt = config.createdAt;        // Game hour when created
        this.createdDay = config.createdDay;      // Game day when created
        this.expiresDay = config.expiresDay;      // null if non-perishable
        this.reservedFor = config.reservedFor || null;  // Buyer firm ID if reserved
        this.deliveryId = config.deliveryId || null;    // Delivery tracking ID
    }

    /**
     * Check if lot is available for sale
     */
    isAvailable() {
        return this.status === 'AVAILABLE';
    }

    /**
     * Check if lot is expired
     * @param {number} currentDay - Current game day
     */
    isExpired(currentDay) {
        if (this.expiresDay === null) return false;
        return currentDay > this.expiresDay;
    }

    /**
     * Reserve this lot for a buyer
     * @param {string} buyerId - ID of the buying firm
     */
    reserve(buyerId) {
        if (this.status !== 'AVAILABLE') {
            return false;
        }
        this.status = 'RESERVED';
        this.reservedFor = buyerId;
        return true;
    }

    /**
     * Mark lot as in transit
     * @param {string} deliveryId - Delivery tracking ID
     */
    markInTransit(deliveryId) {
        this.status = 'IN_TRANSIT';
        this.deliveryId = deliveryId;
    }

    /**
     * Mark lot as delivered
     */
    markDelivered() {
        this.status = 'DELIVERED';
    }

    /**
     * Mark lot as expired (for perishable goods)
     */
    markExpired() {
        this.status = 'EXPIRED';
    }

    /**
     * Release reservation and make lot available again
     */
    releaseReservation() {
        this.status = 'AVAILABLE';
        this.reservedFor = null;
        this.deliveryId = null;
    }

    /**
     * Serialize lot for storage/transmission
     */
    toJSON() {
        return {
            id: this.id,
            productName: this.productName,
            productId: this.productId,
            producerId: this.producerId,
            quantity: this.quantity,
            unit: this.unit,
            quality: this.quality,
            status: this.status,
            createdAt: this.createdAt,
            createdDay: this.createdDay,
            expiresDay: this.expiresDay,
            reservedFor: this.reservedFor,
            deliveryId: this.deliveryId
        };
    }

    /**
     * Create a Lot from serialized data
     */
    static fromJSON(data) {
        return new Lot(data);
    }
}

/**
 * Manages lot inventory for a single firm
 */
export class LotInventory {
    constructor(ownerId, storageCapacity = 100) {
        this.ownerId = ownerId;
        this.lots = new Map();               // Map<lotId, Lot>
        this.storageCapacity = storageCapacity;  // Max number of lots
        this.saleStrategy = 'FIFO';          // FIFO, HIGHEST_QUALITY, LOWEST_QUALITY, EXPIRING_SOON
    }

    /**
     * Add a lot to inventory
     * @param {Lot} lot - The lot to add
     * @returns {boolean} Success status
     */
    addLot(lot) {
        if (this.lots.size >= this.storageCapacity) {
            return false;
        }
        this.lots.set(lot.id, lot);
        return true;
    }

    /**
     * Remove a lot from inventory
     * @param {string} lotId - ID of the lot to remove
     * @returns {Lot|null} The removed lot or null
     */
    removeLot(lotId) {
        const lot = this.lots.get(lotId);
        if (lot) {
            this.lots.delete(lotId);
            return lot;
        }
        return null;
    }

    /**
     * Remove multiple lots from inventory
     * Supports two signatures:
     *   removeLots(lotIds) - Array of lot IDs to remove
     *   removeLots(productName, quantity) - Remove lots by product and quantity needed
     * @returns {Lot[]|{lots: Lot[], totalRemoved: number}} Array of removed lots or object with details
     */
    removeLots(productNameOrIds, quantity = null) {
        // Check which signature is being used
        if (Array.isArray(productNameOrIds)) {
            // Old signature: removeLots(lotIds)
            const removed = [];
            for (const lotId of productNameOrIds) {
                const lot = this.removeLot(lotId);
                if (lot) {
                    removed.push(lot);
                }
            }
            return removed;
        }

        // New signature: removeLots(productName, quantity)
        const productName = productNameOrIds;
        const availableLots = this.getAvailableLots(productName);

        // Sort by sale strategy (FIFO by default)
        availableLots.sort((a, b) => a.createdAt - b.createdAt);

        const removed = [];
        let totalRemoved = 0;

        for (const lot of availableLots) {
            if (totalRemoved >= quantity) break;

            this.lots.delete(lot.id);
            removed.push(lot);
            totalRemoved += lot.quantity;
        }

        return {
            lots: removed,
            totalRemoved: totalRemoved
        };
    }

    /**
     * Get a specific lot
     * @param {string} lotId - ID of the lot
     * @returns {Lot|null}
     */
    getLot(lotId) {
        return this.lots.get(lotId) || null;
    }

    /**
     * Get all available lots for a specific product
     * @param {string} productName - Name of the product
     * @returns {Lot[]}
     */
    getAvailableLots(productName = null) {
        const available = [];
        this.lots.forEach(lot => {
            if (lot.isAvailable()) {
                if (productName === null || lot.productName === productName) {
                    available.push(lot);
                }
            }
        });
        return available;
    }

    /**
     * Get total quantity of available inventory for a product
     * @param {string} productName - Name of the product (optional)
     * @returns {number}
     */
    getAvailableQuantity(productName = null) {
        let total = 0;
        this.lots.forEach(lot => {
            if (lot.isAvailable()) {
                if (productName === null || lot.productName === productName) {
                    total += lot.quantity;
                }
            }
        });
        return total;
    }

    /**
     * Get number of available lots
     * @param {string} productName - Name of the product (optional)
     * @returns {number}
     */
    getAvailableLotCount(productName = null) {
        return this.getAvailableLots(productName).length;
    }

    /**
     * Select lots for sale based on the firm's sale strategy
     * @param {string} productName - Name of the product
     * @param {number} quantityNeeded - Total quantity requested
     * @param {number} currentDay - Current game day (for expiration check)
     * @returns {{ lots: Lot[], totalQuantity: number, avgQuality: number }}
     */
    selectLotsForSale(productName, quantityNeeded, currentDay) {
        const availableLots = this.getAvailableLots(productName);

        // Sort lots based on sale strategy
        const sortedLots = this.sortLotsBySaleStrategy(availableLots, currentDay);

        const selectedLots = [];
        let totalQuantity = 0;
        let qualitySum = 0;

        for (const lot of sortedLots) {
            // Calculate how many lots we need
            const lotsNeeded = Math.round(quantityNeeded / lot.quantity);
            if (selectedLots.length >= lotsNeeded) break;

            selectedLots.push(lot);
            totalQuantity += lot.quantity;
            qualitySum += lot.quality;
        }

        const avgQuality = selectedLots.length > 0 ? qualitySum / selectedLots.length : 0;

        return {
            lots: selectedLots,
            totalQuantity,
            avgQuality
        };
    }

    /**
     * Sort lots based on the configured sale strategy
     * @param {Lot[]} lots - Lots to sort
     * @param {number} currentDay - Current game day
     * @returns {Lot[]}
     */
    sortLotsBySaleStrategy(lots, currentDay) {
        const sortedLots = [...lots];

        switch (this.saleStrategy) {
            case 'FIFO':
                // First-In-First-Out (oldest lots first)
                sortedLots.sort((a, b) => a.createdAt - b.createdAt);
                break;

            case 'HIGHEST_QUALITY':
                // Best quality lots first
                sortedLots.sort((a, b) => b.quality - a.quality);
                break;

            case 'LOWEST_QUALITY':
                // Cheapest (lowest quality) lots first
                sortedLots.sort((a, b) => a.quality - b.quality);
                break;

            case 'EXPIRING_SOON':
                // Lots closest to expiration first (perishables)
                sortedLots.sort((a, b) => {
                    // Non-expiring lots go to the end
                    if (a.expiresDay === null && b.expiresDay === null) {
                        return a.createdAt - b.createdAt; // FIFO for non-perishables
                    }
                    if (a.expiresDay === null) return 1;
                    if (b.expiresDay === null) return -1;
                    return a.expiresDay - b.expiresDay;
                });
                break;

            default:
                // Default to FIFO
                sortedLots.sort((a, b) => a.createdAt - b.createdAt);
        }

        return sortedLots;
    }

    /**
     * Process expiration for all lots
     * @param {number} currentDay - Current game day
     * @returns {Lot[]} Array of expired lots
     */
    processExpiration(currentDay) {
        const expired = [];

        this.lots.forEach((lot, lotId) => {
            if (lot.isExpired(currentDay)) {
                lot.markExpired();
                expired.push(lot);
                this.lots.delete(lotId);
            }
        });

        return expired;
    }

    /**
     * Set the sale strategy for this inventory
     * @param {string} strategy - FIFO, HIGHEST_QUALITY, LOWEST_QUALITY, EXPIRING_SOON
     */
    setSaleStrategy(strategy) {
        const validStrategies = ['FIFO', 'HIGHEST_QUALITY', 'LOWEST_QUALITY', 'EXPIRING_SOON'];
        if (validStrategies.includes(strategy)) {
            this.saleStrategy = strategy;
        }
    }

    /**
     * Get inventory status summary
     */
    getStatus() {
        const byProduct = {};
        let totalLots = 0;
        let availableLots = 0;
        let totalQuantity = 0;

        this.lots.forEach(lot => {
            totalLots++;
            if (lot.isAvailable()) {
                availableLots++;
            }

            if (!byProduct[lot.productName]) {
                byProduct[lot.productName] = {
                    lotCount: 0,
                    totalQuantity: 0,
                    avgQuality: 0,
                    qualities: []
                };
            }

            byProduct[lot.productName].lotCount++;
            byProduct[lot.productName].totalQuantity += lot.quantity;
            byProduct[lot.productName].qualities.push(lot.quality);
            totalQuantity += lot.quantity;
        });

        // Calculate average qualities
        Object.keys(byProduct).forEach(productName => {
            const product = byProduct[productName];
            product.avgQuality = product.qualities.reduce((a, b) => a + b, 0) / product.qualities.length;
            delete product.qualities;
        });

        return {
            ownerId: this.ownerId,
            totalLots,
            availableLots,
            totalQuantity,
            capacity: this.storageCapacity,
            saleStrategy: this.saleStrategy,
            byProduct
        };
    }

    /**
     * Serialize inventory for storage
     */
    toJSON() {
        const lotsArray = [];
        for (const lot of this.lots.values()) {
            lotsArray.push(lot.toJSON());
        }
        return {
            ownerId: this.ownerId,
            storageCapacity: this.storageCapacity,
            saleStrategy: this.saleStrategy,
            lots: lotsArray
        };
    }

    /**
     * Restore inventory from serialized data
     * @param {Object} data - Serialized inventory data
     * @param {LotRegistry} lotRegistry - Optional lot registry to register lots with
     */
    restoreFromJSON(data, lotRegistry = null) {
        if (!data) return;

        this.saleStrategy = data.saleStrategy || this.saleStrategy;
        this.lots.clear();

        for (const lotData of data.lots || []) {
            const lot = Lot.fromJSON(lotData);
            this.lots.set(lot.id, lot);

            // Register with global registry if provided
            if (lotRegistry) {
                lotRegistry.allLots.set(lot.id, lot);
            }
        }
    }

    /**
     * Create LotInventory from serialized data
     * @param {Object} data - Serialized data
     * @param {LotRegistry} lotRegistry - Optional lot registry
     * @returns {LotInventory}
     */
    static fromJSON(data, lotRegistry = null) {
        const inventory = new LotInventory(data.ownerId, data.storageCapacity);
        inventory.restoreFromJSON(data, lotRegistry);
        return inventory;
    }
}

/**
 * Global registry for all lots in the simulation
 */
export class LotRegistry {
    constructor() {
        this.allLots = new Map();      // Map<lotId, Lot>
        this.lotCounter = 0;           // Counter for unique ID generation
        this.lotsByProducer = new Map();  // Map<producerId, Set<lotId>>
        this.lotsByProduct = new Map();   // Map<productName, Set<lotId>>
    }

    /**
     * Generate a unique lot ID
     * @param {string} productName - Name of the product
     * @returns {string}
     */
    generateLotId(productName) {
        this.lotCounter++;
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 6);
        const shortName = productName.replace(/\s+/g, '').substring(0, 6).toUpperCase();
        return `LOT_${shortName}_${timestamp}_${random}_${this.lotCounter}`;
    }

    /**
     * Create and register a new lot
     * @param {Object} config - Lot configuration
     * @returns {Lot}
     */
    createLot(config) {
        const lotId = this.generateLotId(config.productName);
        const lot = new Lot({
            ...config,
            id: lotId
        });

        this.allLots.set(lotId, lot);

        // Track by producer
        if (!this.lotsByProducer.has(config.producerId)) {
            this.lotsByProducer.set(config.producerId, new Set());
        }
        this.lotsByProducer.get(config.producerId).add(lotId);

        // Track by product
        if (!this.lotsByProduct.has(config.productName)) {
            this.lotsByProduct.set(config.productName, new Set());
        }
        this.lotsByProduct.get(config.productName).add(lotId);

        return lot;
    }

    /**
     * Get a lot by ID
     * @param {string} lotId
     * @returns {Lot|null}
     */
    getLot(lotId) {
        return this.allLots.get(lotId) || null;
    }

    /**
     * Get all lots for a specific producer
     * @param {string} producerId
     * @returns {Lot[]}
     */
    getLotsByProducer(producerId) {
        const lotIds = this.lotsByProducer.get(producerId);
        if (!lotIds) return [];

        const lots = [];
        lotIds.forEach(lotId => {
            const lot = this.allLots.get(lotId);
            if (lot) lots.push(lot);
        });
        return lots;
    }

    /**
     * Get all lots for a specific product
     * @param {string} productName
     * @returns {Lot[]}
     */
    getLotsByProduct(productName) {
        const lotIds = this.lotsByProduct.get(productName);
        if (!lotIds) return [];

        const lots = [];
        lotIds.forEach(lotId => {
            const lot = this.allLots.get(lotId);
            if (lot) lots.push(lot);
        });
        return lots;
    }

    /**
     * Transfer lot ownership (update producer tracking)
     * @param {string} lotId
     * @param {string} oldOwnerId
     * @param {string} newOwnerId
     */
    transferLot(lotId, oldOwnerId, newOwnerId) {
        const lot = this.allLots.get(lotId);
        if (!lot) return false;

        // Remove from old owner's tracking
        const oldOwnerLots = this.lotsByProducer.get(oldOwnerId);
        if (oldOwnerLots) {
            oldOwnerLots.delete(lotId);
        }

        // Add to new owner's tracking
        if (!this.lotsByProducer.has(newOwnerId)) {
            this.lotsByProducer.set(newOwnerId, new Set());
        }
        this.lotsByProducer.get(newOwnerId).add(lotId);

        // Update lot's producer ID
        lot.producerId = newOwnerId;

        return true;
    }

    /**
     * Remove a lot from the registry (when consumed or expired)
     * @param {string} lotId
     * @returns {Lot|null}
     */
    removeLot(lotId) {
        const lot = this.allLots.get(lotId);
        if (!lot) return null;

        // Remove from producer tracking
        const producerLots = this.lotsByProducer.get(lot.producerId);
        if (producerLots) {
            producerLots.delete(lotId);
        }

        // Remove from product tracking
        const productLots = this.lotsByProduct.get(lot.productName);
        if (productLots) {
            productLots.delete(lotId);
        }

        this.allLots.delete(lotId);
        return lot;
    }

    /**
     * Process all lot expirations
     * @param {number} currentDay - Current game day
     * @returns {Lot[]} Array of expired lots
     */
    processAllExpirations(currentDay) {
        const expired = [];

        this.allLots.forEach((lot, lotId) => {
            if (lot.isExpired(currentDay)) {
                lot.markExpired();
                expired.push(lot);
                this.removeLot(lotId);
            }
        });

        return expired;
    }

    /**
     * Get registry statistics
     */
    getStats() {
        const byProduct = {};
        let totalLots = 0;
        let availableLots = 0;
        let totalQuantity = 0;

        this.allLots.forEach(lot => {
            totalLots++;
            if (lot.isAvailable()) {
                availableLots++;
            }

            if (!byProduct[lot.productName]) {
                byProduct[lot.productName] = { lots: 0, quantity: 0 };
            }
            byProduct[lot.productName].lots++;
            byProduct[lot.productName].quantity += lot.quantity;
            totalQuantity += lot.quantity;
        });

        return {
            totalLots,
            availableLots,
            totalQuantity,
            byProduct,
            producerCount: this.lotsByProducer.size,
            productCount: this.lotsByProduct.size
        };
    }
}
