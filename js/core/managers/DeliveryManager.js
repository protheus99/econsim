// js/core/managers/DeliveryManager.js
// Extracted from SimulationEngine.js to reduce file size

/**
 * Manages pending local deliveries and transport time simulation
 */
export class DeliveryManager {
    /**
     * @param {Object} engine - Reference to SimulationEngine
     */
    constructor(engine) {
        this.engine = engine;
        this.pendingDeliveries = [];
    }

    /**
     * Create a pending local delivery
     * @param {Object} deliveryData - Delivery information
     * @returns {Object} Created delivery object
     */
    createPendingDelivery(deliveryData) {
        const delivery = {
            id: `LOCAL_DEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...deliveryData,
            status: 'IN_TRANSIT',
            createdAt: this.engine.clock.totalHours
        };
        this.pendingDeliveries.push(delivery);
        return delivery;
    }

    /**
     * Process pending local deliveries - called each hour
     * Completes deliveries when their transit time has elapsed
     * @returns {Object} { delivered, failed } arrays
     */
    processDeliveries() {
        const currentHour = this.engine.clock.totalHours;
        const delivered = [];
        const failed = [];

        this.pendingDeliveries = this.pendingDeliveries.filter(delivery => {
            // Check for stuck deliveries (NaN or invalid deliveryHour)
            if (isNaN(delivery.deliveryHour) || delivery.deliveryHour === undefined) {
                console.error(`Stuck delivery detected: invalid deliveryHour`, delivery.id);
                delivery.status = 'FAILED';
                delivery.failureReason = 'INVALID_DELIVERY_HOUR';
                failed.push(delivery);
                return false;
            }

            // Check for excessively old deliveries (stuck for > 720 hours / 30 days)
            const age = currentHour - (delivery.createdAt || 0);
            if (age > 720 && currentHour < delivery.deliveryHour) {
                console.warn(`Delivery stuck for ${age} hours, forcing completion`, delivery.id);
                delivery.deliveryHour = currentHour; // Force completion
            }

            if (currentHour >= delivery.deliveryHour) {
                try {
                    this.completeDelivery(delivery);
                    delivered.push(delivery);
                } catch (error) {
                    console.error(`Error completing delivery ${delivery.id}:`, error);
                    delivery.status = 'FAILED';
                    delivery.failureReason = error.message;
                    failed.push(delivery);
                }
                return false;
            }
            return true;
        });

        return { delivered, failed };
    }

    /**
     * Complete a local delivery - transfer inventory to buyer
     * @param {Object} delivery - Delivery object to complete
     */
    completeDelivery(delivery) {
        const { buyer, materialName, quantity, type, productId, productName, wholesalePrice, lots, lotObjects, avgQuality } = delivery;

        // Validate buyer still exists
        if (!buyer || !this.engine.firms.has(buyer.id)) {
            console.warn(`Delivery failed: buyer ${buyer?.id || 'unknown'} no longer exists`);
            delivery.status = 'FAILED';
            delivery.failureReason = 'BUYER_NOT_FOUND';
            // Release lots back to available if possible
            this.releaseLots(lots);
            return;
        }

        if (type === 'RAW_TO_SEMI' || type === 'SEMI_TO_MANUFACTURED') {
            this.completeB2BDelivery(delivery, buyer, materialName, quantity, lots, lotObjects, avgQuality);
        } else if (type === 'RETAIL_PURCHASE') {
            this.completeRetailDelivery(delivery, buyer, productId, productName, quantity, wholesalePrice, lots, lotObjects);
        }

        delivery.status = 'DELIVERED';
        delivery.deliveredAt = this.engine.clock.totalHours;
    }

    /**
     * Complete a B2B delivery between manufacturers
     */
    completeB2BDelivery(delivery, buyer, materialName, quantity, lots, lotObjects, avgQuality) {
        // Mark lots as delivered
        this.markLotsDelivered(lots);

        // Transfer using lot-based system if buyer supports it
        if (lotObjects && lotObjects.length > 0 && buyer.receiveLots) {
            buyer.receiveLots(materialName, lotObjects);
        } else if (buyer.rawMaterialInventory && buyer.rawMaterialInventory.has(materialName)) {
            // Fallback to quantity-based transfer
            const buyerInv = buyer.rawMaterialInventory.get(materialName);
            buyerInv.quantity += quantity;
            if (avgQuality && buyer.receiveQuantity) {
                buyer.receiveQuantity(materialName, quantity, avgQuality);
            }
        }
    }

    /**
     * Complete a retail purchase delivery
     */
    completeRetailDelivery(delivery, buyer, productId, productName, quantity, wholesalePrice, lots, lotObjects) {
        // Mark lots as delivered
        this.markLotsDelivered(lots);

        // Transfer using lot-based system if buyer supports it
        if (lotObjects && lotObjects.length > 0 && buyer.receiveLots) {
            buyer.receiveLots(productId, productName, lotObjects, wholesalePrice);
        } else if (buyer.productInventory) {
            buyer.receiveDelivery(productId, quantity, wholesalePrice, productName);
        } else if (buyer.inventory) {
            // Legacy fallback
            const existingItem = buyer.inventory.find(item => item.productId === productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                buyer.inventory.push({
                    productId: productId,
                    productName: productName,
                    quantity: quantity,
                    purchasePrice: wholesalePrice
                });
            }
        }
    }

    /**
     * Mark lots as delivered in the registry
     */
    markLotsDelivered(lots) {
        if (lots && lots.length > 0) {
            lots.forEach(lotId => {
                const lot = this.engine.lotRegistry.getLot(lotId);
                if (lot) {
                    lot.markDelivered();
                }
            });
        }
    }

    /**
     * Release lots back to available status
     */
    releaseLots(lots) {
        if (lots && lots.length > 0) {
            lots.forEach(lotId => {
                const lot = this.engine.lotRegistry.getLot(lotId);
                if (lot) {
                    lot.releaseReservation();
                }
            });
        }
    }

    /**
     * Get pending deliveries count
     */
    getPendingCount() {
        return this.pendingDeliveries.length;
    }

    /**
     * Get all pending deliveries
     */
    getPendingDeliveries() {
        return this.pendingDeliveries;
    }

    /**
     * Clear all pending deliveries
     */
    clear() {
        this.pendingDeliveries = [];
    }
}
