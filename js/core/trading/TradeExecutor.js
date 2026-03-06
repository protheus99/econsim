// js/core/trading/TradeExecutor.js
// Extracted from SimulationEngine.js to reduce file size

/**
 * Executes trades between firms (B2B and B2C)
 */
export class TradeExecutor {
    /**
     * @param {Object} engine - Reference to SimulationEngine
     */
    constructor(engine) {
        this.engine = engine;
    }

    /**
     * Execute a trade between manufacturers (SEMI_RAW to MANUFACTURED)
     * @returns {number} Actual quantity traded (0 if trade failed)
     */
    executeManufacturerToManufacturerTrade(seller, buyer, materialName, requestedQuantity) {
        const productRegistry = this.engine.productRegistry;
        const clock = this.engine.clock;

        const product = seller.product || productRegistry.getProductByName(materialName);
        const price = product ? product.basePrice : 100;
        const minB2BQuantity = product ? product.minB2BQuantity : 1;

        const gameTime = clock.getGameTime();
        const currentDay = gameTime.day + (gameTime.month - 1) * 30 + (gameTime.year - 2025) * 365;

        // Select lots or quantity
        const { tradeQuantity, selectedLots, avgQuality } = this.selectTradeQuantity(
            seller, requestedQuantity, currentDay, minB2BQuantity, 'finishedGoodsInventory'
        );

        if (tradeQuantity === 0) return 0;

        const productCost = tradeQuantity * price;

        // Calculate transport
        const transport = this.calculateTransport(seller, buyer, tradeQuantity);
        const totalCost = productCost + transport.cost;

        if (buyer.cash < totalCost) return 0;

        // Execute transaction
        this.executeTransfer(seller, buyer, tradeQuantity, totalCost, selectedLots, 'finishedGoodsInventory');

        // Track demand
        seller.lastB2BSaleHour = clock.totalHours;
        seller.hasPendingDemand = true;

        // Track transaction
        this.engine.hourlyTransactions.count++;
        this.engine.hourlyTransactions.value += totalCost;

        // Handle delivery
        if (transport.transitHours > 0) {
            this.engine.deliveryManager.createPendingDelivery({
                type: 'SEMI_TO_MANUFACTURED',
                seller, buyer,
                materialName,
                quantity: tradeQuantity,
                productCost, transportCost: transport.cost,
                transitHours: transport.transitHours,
                deliveryHour: clock.totalHours + transport.transitHours,
                transportDetails: transport.details,
                lots: selectedLots.map(lot => lot.id),
                lotObjects: selectedLots,
                avgQuality
            });
        } else {
            this.immediateDelivery(buyer, materialName, tradeQuantity, selectedLots);
        }

        // Log transaction
        this.engine.transactionLog.logB2BTransaction(
            seller, buyer, materialName, tradeQuantity, price, totalCost, 'SEMI_TO_MANUFACTURED'
        );

        return tradeQuantity;
    }

    /**
     * Execute a trade from primary producer to manufacturer (RAW to SEMI_RAW)
     * @returns {number} Actual quantity traded (0 if trade failed)
     */
    executeTrade(seller, buyer, materialName, requestedQuantity) {
        const productRegistry = this.engine.productRegistry;
        const clock = this.engine.clock;

        const product = productRegistry.getProductByName(materialName);
        const price = product ? product.basePrice : 50;
        const minB2BQuantity = product ? product.minB2BQuantity : 1;

        const gameTime = clock.getGameTime();
        const currentDay = gameTime.day + (gameTime.month - 1) * 30 + (gameTime.year - 2025) * 365;

        // Select lots or quantity
        const { tradeQuantity, selectedLots, avgQuality } = this.selectTradeQuantity(
            seller, requestedQuantity, currentDay, minB2BQuantity, 'inventory'
        );

        if (tradeQuantity === 0) return 0;

        const productCost = tradeQuantity * price;

        // Calculate transport
        const transport = this.calculateTransport(seller, buyer, tradeQuantity);
        const totalCost = productCost + transport.cost;

        if (buyer.cash < totalCost) return 0;

        // Execute transaction
        this.executeTransfer(seller, buyer, tradeQuantity, totalCost, selectedLots, 'inventory');

        // Track demand
        seller.lastB2BSaleHour = clock.totalHours;
        seller.hasPendingDemand = true;

        // Track transaction
        this.engine.hourlyTransactions.count++;
        this.engine.hourlyTransactions.value += totalCost;

        // Handle delivery
        if (transport.transitHours > 0) {
            this.engine.deliveryManager.createPendingDelivery({
                type: 'RAW_TO_SEMI',
                seller, buyer,
                materialName,
                quantity: tradeQuantity,
                productCost, transportCost: transport.cost,
                transitHours: transport.transitHours,
                deliveryHour: clock.totalHours + transport.transitHours,
                transportDetails: transport.details,
                lots: selectedLots.map(lot => lot.id),
                lotObjects: selectedLots,
                avgQuality
            });
        } else {
            this.immediateDelivery(buyer, materialName, tradeQuantity, selectedLots);
        }

        // Log transaction
        this.engine.transactionLog.logB2BTransaction(
            seller, buyer, materialName, tradeQuantity, price, totalCost, 'RAW_TO_SEMI'
        );

        return tradeQuantity;
    }

    /**
     * Execute a retail purchase from manufacturer to retailer
     * @returns {number} Actual quantity traded (0 if trade failed)
     */
    executeRetailPurchase(manufacturer, retailer, productIdParam, productNameParam, quantity) {
        const productRegistry = this.engine.productRegistry;
        const clock = this.engine.clock;

        // Handle legacy calls
        let actualQuantity = quantity;
        let actualProductId = productIdParam;
        let actualProductName = productNameParam;

        if (typeof productIdParam === 'number' && productNameParam === undefined && quantity === undefined) {
            actualQuantity = productIdParam;
            actualProductId = null;
            actualProductName = null;
        }

        const product = manufacturer.product;
        const productId = actualProductId || product?.id || manufacturer.productType || 'generic';
        const productName = actualProductName || product?.name || manufacturer.productType || 'Unknown Product';
        const minB2BQuantity = product?.minB2BQuantity || 1;

        // Check if retailer can sell this product
        if (productId && !retailer.canSellProductById(productId, productRegistry)) {
            return 0;
        }

        const gameTime = clock.getGameTime();
        const currentDay = gameTime.day + (gameTime.month - 1) * 30 + (gameTime.year - 2025) * 365;

        // Select lots or quantity
        const { tradeQuantity, selectedLots, avgQuality } = this.selectTradeQuantity(
            manufacturer, actualQuantity, currentDay, minB2BQuantity, 'finishedGoodsInventory'
        );

        if (tradeQuantity === 0) return 0;

        // Calculate price
        const costPerUnit = manufacturer.calculateProductionCost ? manufacturer.calculateProductionCost() : 100;
        const qualityMultiplier = avgQuality / 50;
        const wholesalePrice = costPerUnit * 1.2 * Math.sqrt(qualityMultiplier);
        const productCost = tradeQuantity * wholesalePrice;

        // Calculate transport
        const transport = this.calculateTransport(manufacturer, retailer, tradeQuantity);
        const totalCost = productCost + transport.cost;

        if (retailer.cash < totalCost) return 0;

        // Transfer lots from manufacturer
        if (selectedLots.length > 0) {
            manufacturer.transferLots(selectedLots, transport.transitHours > 0 ? `DEL_${Date.now()}` : null);
            manufacturer.cash += totalCost;
            manufacturer.revenue += totalCost;
            manufacturer.monthlyRevenue += totalCost;
        } else {
            manufacturer.finishedGoodsInventory.quantity -= tradeQuantity;
            manufacturer.cash += totalCost;
            manufacturer.revenue += totalCost;
            manufacturer.monthlyRevenue += totalCost;
        }

        // Handle delivery
        if (transport.transitHours <= 0) {
            if (selectedLots.length > 0 && retailer.receiveLots) {
                selectedLots.forEach(lot => lot.markDelivered?.());
                retailer.receiveLots(productId, productName, selectedLots, wholesalePrice);
            } else {
                const purchaseSuccess = retailer.purchaseInventory(productId, tradeQuantity, wholesalePrice, productName);
                if (!purchaseSuccess) return 0;
            }
            retailer.cash -= totalCost;
            retailer.expenses += totalCost;
        } else {
            retailer.cash -= totalCost;
            retailer.expenses += totalCost;

            this.engine.deliveryManager.createPendingDelivery({
                type: 'RETAIL_PURCHASE',
                seller: manufacturer,
                buyer: retailer,
                productId, productName,
                quantity: tradeQuantity,
                wholesalePrice,
                productCost, transportCost: transport.cost,
                transitHours: transport.transitHours,
                deliveryHour: clock.totalHours + transport.transitHours,
                transportDetails: transport.details,
                lots: selectedLots.map(lot => lot.id),
                lotObjects: selectedLots,
                avgQuality
            });
        }

        // Track demand
        manufacturer.lastB2BSaleHour = clock.totalHours;
        manufacturer.hasPendingDemand = true;

        // Track transaction
        this.engine.hourlyTransactions.count++;
        this.engine.hourlyTransactions.value += totalCost;

        // Log transaction
        this.engine.transactionLog.logRetailPurchase(
            manufacturer, retailer, productName, tradeQuantity, wholesalePrice, totalCost
        );

        return tradeQuantity;
    }

    /**
     * Select trade quantity from lots or legacy inventory
     */
    selectTradeQuantity(seller, requestedQuantity, currentDay, minB2BQuantity, inventoryType) {
        let tradeQuantity = 0;
        let selectedLots = [];
        let avgQuality = 50;

        if (seller.lotInventory && seller.selectLotsForSale) {
            const selection = seller.selectLotsForSale(requestedQuantity, currentDay);
            if (selection.lots.length === 0) return { tradeQuantity: 0, selectedLots: [], avgQuality: 50 };

            selectedLots = selection.lots;
            tradeQuantity = selection.totalQuantity;
            avgQuality = selection.avgQuality;

            if (tradeQuantity < minB2BQuantity) return { tradeQuantity: 0, selectedLots: [], avgQuality: 50 };
        } else {
            // Legacy quantity-based
            const inventory = inventoryType === 'finishedGoodsInventory'
                ? seller.finishedGoodsInventory
                : seller.inventory;

            if (!inventory || inventory.quantity <= 0) return { tradeQuantity: 0, selectedLots: [], avgQuality: 50 };

            const availableQuantity = inventory.quantity;
            if (availableQuantity < minB2BQuantity) return { tradeQuantity: 0, selectedLots: [], avgQuality: 50 };

            tradeQuantity = Math.floor(Math.min(
                Math.max(requestedQuantity, minB2BQuantity),
                availableQuantity
            ));

            if (tradeQuantity < minB2BQuantity) return { tradeQuantity: 0, selectedLots: [], avgQuality: 50 };
        }

        return { tradeQuantity, selectedLots, avgQuality };
    }

    /**
     * Calculate transport cost and time between two firms
     */
    calculateTransport(seller, buyer, quantity) {
        let cost = 0;
        let transitHours = 0;
        let details = null;

        if (seller.city && buyer.city && this.engine.cityManager?.transportation) {
            const route = this.engine.cityManager.transportation.findOptimalRoute(
                seller.city, buyer.city, quantity, 'balanced'
            );

            if (route.optimalRoute) {
                cost = route.optimalRoute.baseCost || 0;
                transitHours = Math.ceil(route.optimalRoute.transitTime?.hours || 0);
                details = {
                    distance: route.distance,
                    mode: route.optimalRoute.type,
                    modeName: route.optimalRoute.typeName,
                    originCity: seller.city.name,
                    destinationCity: buyer.city.name
                };
            }
        }

        return { cost, transitHours, details };
    }

    /**
     * Execute financial transfer between seller and buyer
     */
    executeTransfer(seller, buyer, quantity, totalCost, selectedLots, inventoryType) {
        if (selectedLots.length > 0) {
            seller.transferLots(selectedLots, null);
            seller.cash += totalCost;
            seller.revenue += totalCost;
            seller.monthlyRevenue += totalCost;
        } else {
            const inventory = inventoryType === 'finishedGoodsInventory'
                ? seller.finishedGoodsInventory
                : seller.inventory;
            inventory.quantity -= quantity;
            seller.cash += totalCost;
            seller.revenue += totalCost;
            seller.monthlyRevenue += totalCost;
        }

        buyer.cash -= totalCost;
        buyer.expenses += totalCost;
    }

    /**
     * Handle immediate delivery (no transit time)
     */
    immediateDelivery(buyer, materialName, quantity, selectedLots) {
        if (selectedLots.length > 0 && buyer.receiveLots) {
            selectedLots.forEach(lot => lot.markDelivered?.());
            buyer.receiveLots(materialName, selectedLots);
        } else if (buyer.rawMaterialInventory && buyer.rawMaterialInventory.has(materialName)) {
            const buyerInv = buyer.rawMaterialInventory.get(materialName);
            buyerInv.quantity += quantity;
        }
    }
}
