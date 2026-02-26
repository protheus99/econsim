// js/core/TransactionLog.js
export class TransactionLog {
    // Transaction categories for B2B vs B2C display
    static CATEGORIES = {
        B2B_RAW: 'B2B_RAW',           // Primary producers (mines, farms, logging) → processors
        B2B_SEMI: 'B2B_SEMI',         // Processors → manufacturers
        B2B_MANUFACTURED: 'B2B_MANUFACTURED',  // Manufacturers → manufacturers
        B2B_WHOLESALE: 'B2B_WHOLESALE',        // Manufacturers → retailers
        B2C_RETAIL: 'B2C_RETAIL',     // Retailers → consumers
        CONTRACT: 'CONTRACT'           // Contract-based transactions
    };

    // Seller types that indicate raw material production
    static RAW_PRODUCER_TYPES = ['MINING', 'Mine', 'LOGGING', 'LoggingCamp', 'FARM', 'Farm', 'OilWell'];

    // Seller types that indicate semi-raw production
    static SEMI_PRODUCER_TYPES = ['SteelMill', 'Refinery', 'TextileMill', 'FoodProcessor', 'Processor'];

    // Seller types that indicate manufacturing
    static MANUFACTURER_TYPES = ['MANUFACTURING', 'ManufacturingPlant', 'Factory'];

    // Buyer types that indicate retail
    static RETAILER_TYPES = ['RETAIL', 'RetailStore', 'Supermarket', 'FashionRetail', 'ElectronicsStore'];

    constructor(maxEntries = 1000) {
        this.maxEntries = maxEntries;
        this.clock = null; // Reference to game clock for timestamps

        // All transactions
        this.transactions = [];

        // Categorized transactions
        this.b2bTransactions = [];      // Primary → SEMI_RAW, SEMI_RAW → MANUFACTURED
        this.retailTransactions = [];    // Manufacturers → Retail
        this.consumerSales = [];         // Retail → Consumers
        this.contractTransactions = [];  // Contract-based transactions

        // Statistics
        this.stats = {
            totalTransactions: 0,
            totalB2B: 0,
            totalRetail: 0,
            totalConsumerSales: 0,
            contractTransactions: 0,
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
            contract: 0
        };
    }

    // Set reference to game clock for timestamps
    setClock(clock) {
        this.clock = clock;
    }

    // Get formatted game time string
    getGameTimeString() {
        if (this.clock) {
            return this.clock.getFormatted();
        }
        return new Date().toISOString();
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

    /**
     * Categorize a transaction based on seller/buyer types
     * @param {object} tx - Transaction with sellerType and buyerType
     * @returns {string} Category from CATEGORIES
     */
    categorize(tx) {
        // Contract-based transactions
        if (tx.contractId) {
            return TransactionLog.CATEGORIES.CONTRACT;
        }

        // Consumer sales (B2C)
        if (tx.buyerType === 'CONSUMERS' || tx.buyerType === 'Consumer' || tx.type === 'CONSUMER_SALE') {
            return TransactionLog.CATEGORIES.B2C_RETAIL;
        }

        const sellerType = tx.sellerType || tx.seller?.type;
        const buyerType = tx.buyerType || tx.buyer?.type;

        // Raw material producers selling
        if (TransactionLog.RAW_PRODUCER_TYPES.includes(sellerType)) {
            return TransactionLog.CATEGORIES.B2B_RAW;
        }

        // Semi-raw producers selling
        if (TransactionLog.SEMI_PRODUCER_TYPES.includes(sellerType)) {
            return TransactionLog.CATEGORIES.B2B_SEMI;
        }

        // Manufacturers selling to retailers
        if (TransactionLog.MANUFACTURER_TYPES.includes(sellerType) &&
            TransactionLog.RETAILER_TYPES.includes(buyerType)) {
            return TransactionLog.CATEGORIES.B2B_WHOLESALE;
        }

        // Manufacturers selling to other manufacturers
        if (TransactionLog.MANUFACTURER_TYPES.includes(sellerType)) {
            return TransactionLog.CATEGORIES.B2B_MANUFACTURED;
        }

        // Default to B2B if we can't determine
        return TransactionLog.CATEGORIES.B2B_RAW;
    }

    /**
     * Log a B2B sale with full details including lot and contract info
     * @param {Firm} seller - Selling firm
     * @param {Firm} buyer - Buying firm
     * @param {string} product - Product name
     * @param {number} quantity - Quantity sold
     * @param {number} unitPrice - Price per unit
     * @param {object} options - Optional: { lotInfo, contractId, quality }
     * @returns {object} Transaction record
     */
    logB2BSale(seller, buyer, product, quantity, unitPrice, options = {}) {
        const totalCost = quantity * unitPrice;

        const transaction = {
            id: this.generateId('B2B'),
            type: 'B2B_SALE',
            timestamp: Date.now(),
            gameTime: this.getGameTimeString(),
            seller: {
                id: seller.id,
                name: this.getFirmDisplayName(seller),
                type: seller.type,
                city: seller.city?.name || 'Unknown',
                corporationId: seller.corporationId
            },
            buyer: {
                id: buyer.id,
                name: this.getFirmDisplayName(buyer),
                type: buyer.type,
                city: buyer.city?.name || 'Unknown',
                corporationId: buyer.corporationId
            },
            sellerType: seller.type,
            buyerType: buyer.type,
            material: product,
            product: product,
            quantity: quantity,
            unitPrice: unitPrice,
            totalCost: totalCost,
            status: 'COMPLETED',
            // Lot information
            lotId: options.lotInfo?.id || options.lotId || null,
            lotQuality: options.lotInfo?.quality || options.quality || null,
            lotExpiration: options.lotInfo?.expiration || null,
            // Contract information
            contractId: options.contractId || null
        };

        // Set category
        transaction.category = this.categorize(transaction);

        // Determine tier for backward compatibility
        if (transaction.category === TransactionLog.CATEGORIES.B2B_RAW) {
            transaction.tier = 'RAW_TO_SEMI';
        } else if (transaction.category === TransactionLog.CATEGORIES.B2B_SEMI) {
            transaction.tier = 'SEMI_TO_MANUFACTURED';
        }

        this.addTransaction(transaction, 'b2b');
        return transaction;
    }

    /**
     * Log a retail sale (to consumers) with lot info
     * @param {Firm} retailer - Retail store
     * @param {string} product - Product name
     * @param {number} quantity - Quantity sold
     * @param {number} unitPrice - Price per unit
     * @param {object} options - Optional: { cityName, lotInfo, quality }
     * @returns {object} Transaction record
     */
    logRetailSale(retailer, product, quantity, unitPrice, options = {}) {
        const totalRevenue = quantity * unitPrice;
        const cityName = options.cityName || retailer.city?.name || 'Unknown';

        const transaction = {
            id: this.generateId('RET'),
            type: 'RETAIL_SALE',
            timestamp: Date.now(),
            gameTime: this.getGameTimeString(),
            seller: {
                id: retailer.id,
                name: this.getFirmDisplayName(retailer),
                type: retailer.type,
                city: cityName,
                storeType: retailer.storeType
            },
            buyer: {
                type: 'CONSUMERS',
                city: cityName,
                segment: 'General Public'
            },
            sellerType: retailer.type,
            buyerType: 'Consumer',
            material: product,
            product: product,
            quantity: quantity,
            unitPrice: unitPrice,
            totalRevenue: totalRevenue,
            totalCost: totalRevenue,
            status: 'COMPLETED',
            category: TransactionLog.CATEGORIES.B2C_RETAIL,
            // Lot information
            lotId: options.lotInfo?.id || null,
            lotQuality: options.lotInfo?.quality || options.quality || null
        };

        this.addTransaction(transaction, 'consumer');
        return transaction;
    }

    // Log a B2B transaction (primary producer to manufacturer or manufacturer to manufacturer)
    logB2BTransaction(seller, buyer, material, quantity, unitPrice, totalCost, tier) {
        const transaction = {
            id: this.generateId('B2B'),
            type: 'B2B',
            tier: tier, // 'RAW_TO_SEMI' or 'SEMI_TO_MANUFACTURED'
            timestamp: Date.now(),
            gameTime: this.getGameTimeString(),
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
            gameTime: this.getGameTimeString(),
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
            gameTime: this.getGameTimeString(),
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
            case 'contract':
                this.contractTransactions.push(transaction);
                this.stats.contractTransactions++;
                this.currentHourStats.contract++;
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
        if (this.contractTransactions.length > this.maxEntries / 4) {
            this.contractTransactions = this.contractTransactions.slice(-this.maxEntries / 4);
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
            contract: 0
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
            contract: last24Hours.reduce((sum, h) => sum + h.contract, 0),
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
            case 'CONTRACT':
                return this.contractTransactions.slice(-count).reverse();
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
            totalB2B: this.stats.totalB2B,
            totalRetail: this.stats.totalRetail,
            totalConsumerSales: this.stats.totalConsumerSales,
            contractTransactions: this.stats.contractTransactions,
            breakdown: {
                b2b: this.stats.totalB2B,
                retail: this.stats.totalRetail,
                consumer: this.stats.totalConsumerSales,
                contract: this.stats.contractTransactions
            },
            averages: {
                transactionsPerHour: avgHourlyTransactions.toFixed(1),
                valuePerHour: avgHourlyValue.toFixed(2)
            },
            hourlyStats: this.stats.hourlyStats
        };
    }

    /**
     * Get transactions by category
     * @param {string} category - Category from CATEGORIES
     * @param {number} limit - Maximum number to return
     * @returns {Array} Transactions matching the category
     */
    getByCategory(category, limit = 100) {
        return this.transactions
            .filter(tx => {
                // If transaction has category set, use it
                if (tx.category) {
                    return tx.category === category;
                }
                // Otherwise, compute the category
                return this.categorize(tx) === category;
            })
            .slice(-limit)
            .reverse();
    }

    /**
     * Get transactions for a firm within a time window
     * @param {string} firmId - Firm ID
     * @param {number} hours - Hours to look back (default 24)
     * @returns {Array} Transactions involving the firm
     */
    getForFirm(firmId, hours = 24) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return this.transactions.filter(tx =>
            (tx.seller?.id === firmId || tx.buyer?.id === firmId) &&
            tx.timestamp >= cutoff
        );
    }

    /**
     * Get summary statistics broken down by category
     * @returns {object} Summary with counts and values per category
     */
    getSummaryByCategory() {
        const summary = {};

        // Initialize all categories
        for (const cat of Object.values(TransactionLog.CATEGORIES)) {
            summary[cat] = { count: 0, volume: 0, value: 0 };
        }

        // Aggregate transactions
        for (const tx of this.transactions) {
            const cat = tx.category || this.categorize(tx);
            if (!summary[cat]) {
                summary[cat] = { count: 0, volume: 0, value: 0 };
            }
            summary[cat].count++;
            summary[cat].volume += tx.quantity || 0;
            summary[cat].value += tx.totalCost || tx.totalRevenue || 0;
        }

        return summary;
    }

    /**
     * Get category display info (label, icon, color class)
     * @param {string} category - Category from CATEGORIES
     * @returns {object} Display info
     */
    static getCategoryDisplay(category) {
        const displays = {
            [TransactionLog.CATEGORIES.B2B_RAW]: {
                label: 'Raw Materials',
                shortLabel: 'Raw',
                icon: '⛏️',
                colorClass: 'tx-b2b-raw'
            },
            [TransactionLog.CATEGORIES.B2B_SEMI]: {
                label: 'Semi-Processed',
                shortLabel: 'Semi',
                icon: '⚙️',
                colorClass: 'tx-b2b-semi'
            },
            [TransactionLog.CATEGORIES.B2B_MANUFACTURED]: {
                label: 'Manufactured',
                shortLabel: 'Mfg',
                icon: '�icing',
                colorClass: 'tx-b2b-manufactured'
            },
            [TransactionLog.CATEGORIES.B2B_WHOLESALE]: {
                label: 'Wholesale',
                shortLabel: 'Wholesale',
                icon: '📦',
                colorClass: 'tx-b2b-wholesale'
            },
            [TransactionLog.CATEGORIES.B2C_RETAIL]: {
                label: 'Retail Sales',
                shortLabel: 'Retail',
                icon: '🛒',
                colorClass: 'tx-b2c-retail'
            },
            [TransactionLog.CATEGORIES.CONTRACT]: {
                label: 'Contract',
                shortLabel: 'Contract',
                icon: '📝',
                colorClass: 'tx-contract'
            }
        };

        return displays[category] || {
            label: category,
            shortLabel: category,
            icon: '💰',
            colorClass: 'tx-other'
        };
    }
}
