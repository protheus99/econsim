// js/core/TransactionLog.js
export class TransactionLog {
    constructor(maxEntries = 1000) {
        this.maxEntries = maxEntries;

        // All transactions
        this.transactions = [];

        // Categorized transactions
        this.b2bTransactions = [];      // Primary → SEMI_RAW, SEMI_RAW → MANUFACTURED
        this.retailTransactions = [];    // Manufacturers → Retail
        this.consumerSales = [];         // Retail → Consumers
        this.globalMarketOrders = [];    // Global market purchases
        this.globalMarketSales = [];     // Global market sales (excess inventory)

        // Statistics
        this.stats = {
            totalTransactions: 0,
            totalB2B: 0,
            totalRetail: 0,
            totalConsumerSales: 0,
            totalGlobalMarket: 0,
            totalGlobalMarketSales: 0,
            totalValue: 0,
            totalVolume: 0,
            hourlyStats: [],
            dailyStats: []
        };

        // Current hour tracking
        this.currentHourStats = {
            hour: 0,
            day: 0,
            transactions: 0,
            value: 0,
            volume: 0,
            b2b: 0,
            retail: 0,
            consumer: 0,
            globalMarket: 0,
            globalMarketSale: 0
        };
    }

    // Helper to get firm display name
    getFirmDisplayName(firm) {
        if (!firm) return 'Unknown';
        // Use firm's getDisplayName method if available, otherwise fallback
        if (typeof firm.getDisplayName === 'function') {
            return firm.getDisplayName();
        }
        // Fallback for objects without the method
        return firm.name || `${firm.type || 'Unknown'} #${(firm.id || '').toString().slice(-6)}`;
    }

    // Log a B2B transaction (primary producer to manufacturer or manufacturer to manufacturer)
    logB2BTransaction(seller, buyer, material, quantity, unitPrice, totalCost, tier) {
        const transaction = {
            id: this.generateId('B2B'),
            type: 'B2B',
            tier: tier, // 'RAW_TO_SEMI' or 'SEMI_TO_MANUFACTURED'
            timestamp: Date.now(),
            seller: {
                id: seller.id,
                name: this.getFirmDisplayName(seller),
                type: seller.type,
                city: seller.city?.name || 'Unknown',
                product: seller.resourceType || seller.timberType || seller.cropType ||
                         seller.livestockType || seller.product?.name || 'Unknown'
            },
            buyer: {
                id: buyer.id,
                name: this.getFirmDisplayName(buyer),
                type: buyer.type,
                city: buyer.city?.name || 'Unknown',
                product: buyer.product?.name || 'Unknown'
            },
            material: material,
            quantity: quantity,
            unitPrice: unitPrice,
            totalCost: totalCost,
            status: 'COMPLETED'
        };

        this.addTransaction(transaction, 'b2b');
        return transaction;
    }

    // Log a retail purchase (manufacturer to retail store)
    logRetailPurchase(manufacturer, retailer, product, quantity, unitPrice, totalCost) {
        const transaction = {
            id: this.generateId('RET'),
            type: 'RETAIL_PURCHASE',
            timestamp: Date.now(),
            seller: {
                id: manufacturer.id,
                name: this.getFirmDisplayName(manufacturer),
                type: manufacturer.type,
                city: manufacturer.city?.name || 'Unknown',
                product: manufacturer.product?.name || product
            },
            buyer: {
                id: retailer.id,
                name: this.getFirmDisplayName(retailer),
                type: retailer.type,
                city: retailer.city?.name || 'Unknown',
                storeType: retailer.storeType
            },
            product: product,
            quantity: quantity,
            unitPrice: unitPrice,
            totalCost: totalCost,
            status: 'COMPLETED'
        };

        this.addTransaction(transaction, 'retail');
        return transaction;
    }

    // Log a consumer sale (retail to consumers)
    logConsumerSale(retailer, product, quantity, unitPrice, totalRevenue, cityName) {
        const transaction = {
            id: this.generateId('CON'),
            type: 'CONSUMER_SALE',
            timestamp: Date.now(),
            seller: {
                id: retailer.id,
                name: this.getFirmDisplayName(retailer),
                type: retailer.type,
                city: retailer.city?.name || cityName || 'Unknown',
                storeType: retailer.storeType
            },
            buyer: {
                type: 'CONSUMERS',
                city: cityName || retailer.city?.name || 'Unknown',
                segment: 'General Public'
            },
            product: product,
            quantity: quantity,
            unitPrice: unitPrice,
            totalRevenue: totalRevenue,
            status: 'COMPLETED'
        };

        this.addTransaction(transaction, 'consumer');
        return transaction;
    }

    // Log a global market order
    logGlobalMarketOrder(buyer, material, quantity, unitPrice, totalCost, status, deliveryHours, globalMarketOrderId = null) {
        // Ensure deliveryHours is a valid number, default to 24 hours
        const validDeliveryHours = (typeof deliveryHours === 'number' && !isNaN(deliveryHours)) ? deliveryHours : 24;

        // Calculate estimated delivery safely
        let estimatedDelivery;
        try {
            estimatedDelivery = new Date(Date.now() + validDeliveryHours * 3600000).toISOString();
        } catch (e) {
            estimatedDelivery = new Date(Date.now() + 24 * 3600000).toISOString(); // Fallback to 24 hours
        }

        const transaction = {
            id: this.generateId('GMO'),
            globalMarketOrderId: globalMarketOrderId, // Store the GlobalMarket order ID for matching
            type: 'GLOBAL_MARKET',
            timestamp: Date.now(),
            seller: {
                type: 'GLOBAL_MARKET',
                name: 'Global Market',
                region: 'International'
            },
            buyer: {
                id: buyer?.id || 'unknown',
                name: this.getFirmDisplayName(buyer),
                type: buyer?.type || 'Unknown',
                city: buyer?.city?.name || 'Unknown',
                product: buyer?.product?.name || 'Unknown'
            },
            material: material || 'Unknown',
            quantity: quantity || 0,
            unitPrice: unitPrice || 0,
            totalCost: totalCost || 0,
            status: status || 'PENDING', // 'PENDING', 'IN_TRANSIT', 'DELIVERED'
            deliveryHours: validDeliveryHours,
            estimatedDelivery: estimatedDelivery
        };

        this.addTransaction(transaction, 'globalMarket');
        return transaction;
    }

    // Update global market order status by GlobalMarket order ID
    updateGlobalMarketOrderByGMId(globalMarketOrderId, newStatus) {
        const order = this.globalMarketOrders.find(t => t.globalMarketOrderId === globalMarketOrderId);
        if (order) {
            order.status = newStatus;
            if (newStatus === 'DELIVERED') {
                order.deliveredAt = Date.now();
            }
        }
        return order;
    }

    // Update global market order status
    updateGlobalMarketOrder(orderId, newStatus) {
        const order = this.globalMarketOrders.find(t => t.id === orderId);
        if (order) {
            order.status = newStatus;
            if (newStatus === 'DELIVERED') {
                order.deliveredAt = Date.now();
            }
        }
        return order;
    }

    // Log a sale to the global market (excess inventory disposal)
    logGlobalMarketSale(seller, material, quantity, unitPrice, totalRevenue) {
        const transaction = {
            id: this.generateId('GMS'),
            type: 'GLOBAL_MARKET_SALE',
            timestamp: Date.now(),
            seller: {
                id: seller.id,
                name: this.getFirmDisplayName(seller),
                type: seller.type,
                city: seller.city?.name || 'Unknown',
                product: seller.product?.name || material
            },
            buyer: {
                type: 'GLOBAL_MARKET',
                name: 'Global Market',
                region: 'International'
            },
            material: material,
            quantity: quantity,
            unitPrice: unitPrice,
            totalRevenue: totalRevenue,
            status: 'COMPLETED'
        };

        this.addTransaction(transaction, 'globalMarketSale');
        return transaction;
    }

    addTransaction(transaction, category) {
        // Add to main list
        this.transactions.push(transaction);

        // Add to category list
        switch (category) {
            case 'b2b':
                this.b2bTransactions.push(transaction);
                this.stats.totalB2B++;
                this.currentHourStats.b2b++;
                break;
            case 'retail':
                this.retailTransactions.push(transaction);
                this.stats.totalRetail++;
                this.currentHourStats.retail++;
                break;
            case 'consumer':
                this.consumerSales.push(transaction);
                this.stats.totalConsumerSales++;
                this.currentHourStats.consumer++;
                break;
            case 'globalMarket':
                this.globalMarketOrders.push(transaction);
                this.stats.totalGlobalMarket++;
                this.currentHourStats.globalMarket++;
                break;
            case 'globalMarketSale':
                this.globalMarketSales.push(transaction);
                this.stats.totalGlobalMarketSales++;
                this.currentHourStats.globalMarketSale++;
                break;
        }

        // Update stats
        this.stats.totalTransactions++;
        this.stats.totalValue += transaction.totalCost || transaction.totalRevenue || 0;
        this.stats.totalVolume += transaction.quantity || 0;

        this.currentHourStats.transactions++;
        this.currentHourStats.value += transaction.totalCost || transaction.totalRevenue || 0;
        this.currentHourStats.volume += transaction.quantity || 0;

        // Trim if exceeds max
        this.trimLogs();
    }

    trimLogs() {
        if (this.transactions.length > this.maxEntries) {
            this.transactions = this.transactions.slice(-this.maxEntries);
        }
        if (this.b2bTransactions.length > this.maxEntries / 4) {
            this.b2bTransactions = this.b2bTransactions.slice(-this.maxEntries / 4);
        }
        if (this.retailTransactions.length > this.maxEntries / 4) {
            this.retailTransactions = this.retailTransactions.slice(-this.maxEntries / 4);
        }
        if (this.consumerSales.length > this.maxEntries / 4) {
            this.consumerSales = this.consumerSales.slice(-this.maxEntries / 4);
        }
        if (this.globalMarketOrders.length > this.maxEntries / 4) {
            this.globalMarketOrders = this.globalMarketOrders.slice(-this.maxEntries / 4);
        }
        if (this.globalMarketSales.length > this.maxEntries / 4) {
            this.globalMarketSales = this.globalMarketSales.slice(-this.maxEntries / 4);
        }
    }

    // Called at end of each hour
    finalizeHour(gameTime) {
        const hourStats = {
            ...this.currentHourStats,
            hour: gameTime.hour,
            day: gameTime.day,
            month: gameTime.month,
            year: gameTime.year,
            timestamp: Date.now()
        };

        this.stats.hourlyStats.push(hourStats);

        // Keep only last 168 hours (1 week)
        if (this.stats.hourlyStats.length > 168) {
            this.stats.hourlyStats.shift();
        }

        // Reset current hour
        this.currentHourStats = {
            hour: gameTime.hour,
            day: gameTime.day,
            transactions: 0,
            value: 0,
            volume: 0,
            b2b: 0,
            retail: 0,
            consumer: 0,
            globalMarket: 0
        };

        return hourStats;
    }

    // Called at end of each day
    finalizeDay(gameTime) {
        // Aggregate hourly stats for the day
        const last24Hours = this.stats.hourlyStats.slice(-24);
        const dayStats = {
            day: gameTime.day,
            month: gameTime.month,
            year: gameTime.year,
            transactions: last24Hours.reduce((sum, h) => sum + h.transactions, 0),
            value: last24Hours.reduce((sum, h) => sum + h.value, 0),
            volume: last24Hours.reduce((sum, h) => sum + h.volume, 0),
            b2b: last24Hours.reduce((sum, h) => sum + h.b2b, 0),
            retail: last24Hours.reduce((sum, h) => sum + h.retail, 0),
            consumer: last24Hours.reduce((sum, h) => sum + h.consumer, 0),
            globalMarket: last24Hours.reduce((sum, h) => sum + h.globalMarket, 0),
            timestamp: Date.now()
        };

        this.stats.dailyStats.push(dayStats);

        // Keep only last 30 days
        if (this.stats.dailyStats.length > 30) {
            this.stats.dailyStats.shift();
        }

        return dayStats;
    }

    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    // Query methods
    getRecentTransactions(count = 50) {
        return this.transactions.slice(-count).reverse();
    }

    getTransactionsByType(type, count = 50) {
        switch (type) {
            case 'B2B':
                return this.b2bTransactions.slice(-count).reverse();
            case 'RETAIL_PURCHASE':
                return this.retailTransactions.slice(-count).reverse();
            case 'CONSUMER_SALE':
                return this.consumerSales.slice(-count).reverse();
            case 'GLOBAL_MARKET':
                return this.globalMarketOrders.slice(-count).reverse();
            default:
                return this.getRecentTransactions(count);
        }
    }

    getTransactionsByFirm(firmId, count = 50) {
        return this.transactions
            .filter(t => t.seller?.id === firmId || t.buyer?.id === firmId)
            .slice(-count)
            .reverse();
    }

    getTransactionsByCity(cityName, count = 50) {
        return this.transactions
            .filter(t => t.seller?.city === cityName || t.buyer?.city === cityName)
            .slice(-count)
            .reverse();
    }

    getTransactionsByMaterial(material, count = 50) {
        return this.transactions
            .filter(t => t.material === material || t.product === material)
            .slice(-count)
            .reverse();
    }

    getPendingGlobalOrders() {
        return this.globalMarketOrders.filter(t => t.status === 'PENDING' || t.status === 'IN_TRANSIT');
    }

    getHourlyStats(hours = 24) {
        return this.stats.hourlyStats.slice(-hours);
    }

    getDailyStats(days = 7) {
        return this.stats.dailyStats.slice(-days);
    }

    getStats() {
        return {
            ...this.stats,
            currentHour: this.currentHourStats,
            pendingGlobalOrders: this.getPendingGlobalOrders().length
        };
    }

    // Get summary for display
    getSummary() {
        const last24Hours = this.stats.hourlyStats.slice(-24);
        const avgHourlyTransactions = last24Hours.length > 0
            ? last24Hours.reduce((sum, h) => sum + h.transactions, 0) / last24Hours.length
            : 0;
        const avgHourlyValue = last24Hours.length > 0
            ? last24Hours.reduce((sum, h) => sum + h.value, 0) / last24Hours.length
            : 0;

        return {
            totalTransactions: this.stats.totalTransactions,
            totalValue: this.stats.totalValue,
            totalVolume: this.stats.totalVolume,
            breakdown: {
                b2b: this.stats.totalB2B,
                retail: this.stats.totalRetail,
                consumer: this.stats.totalConsumerSales,
                globalMarket: this.stats.totalGlobalMarket
            },
            averages: {
                transactionsPerHour: avgHourlyTransactions.toFixed(1),
                valuePerHour: avgHourlyValue.toFixed(2)
            },
            pendingGlobalOrders: this.getPendingGlobalOrders().length
        };
    }
}
