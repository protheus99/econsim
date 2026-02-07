// js/core/firms/RetailStore.js
import { Firm } from './Firm.js';

export class RetailStore extends Firm {
    constructor(location, country, storeType, customId = null) {
        super('RETAIL', location, country, customId);
        
        this.storeType = storeType; // SUPERMARKET, DEPARTMENT, ELECTRONICS, etc.
        this.storeSize = Math.floor(1000 + Math.random() * 4000); // Square meters
        this.locationQuality = 50 + Math.random() * 50; // Prime location = higher

        // Define which product categories each store type can sell
        this.allowedCategories = this.getAllowedCategories(storeType);
        
        // Inventory management
        this.productInventory = new Map(); // productId -> inventory data
        this.maxInventoryValue = 500000;
        this.currentInventoryValue = 0;
        
        // Labor structure
        this.laborStructure = {
            salesStaff: { count: 30, wage: 2800 },
            cashiers: { count: 15, wage: 2500 },
            stockers: { count: 10, wage: 2600 },
            departmentManagers: { count: 5, wage: 5000 },
            storeManager: { count: 1, wage: 8000 },
            securityStaff: { count: 5, wage: 3200 },
            cleaningStaff: { count: 4, wage: 2400 },
            supportStaff: { count: 7, wage: 3000 }
        };
        
        this.totalEmployees = this.calculateTotalEmployees();
        
        // Operating costs
        this.rentCosts = this.calculateRent();
        this.utilitiesCosts = 15000;
        this.maintenanceCosts = 8000;
        this.operationalExpenses = 25000;
        
        // Marketing and branding
        this.marketingBudget = 20000;
        this.storeBrandRating = 30;
        this.customerSatisfaction = 70;
        this.customerLoyaltyProgram = false;
        
        // Sales metrics
        this.dailyFootTraffic = Math.floor(this.storeSize * 2); // Customers per day
        this.conversionRate = 0.40; // 40% of visitors make purchase
        this.averageTransactionValue = 0;
        
        // Pricing strategy
        this.markupPercentage = 0.30; // 30% markup
        this.competitivePricing = true;
        
        this.initialize();
    }
    
    calculateTotalEmployees() {
        let total = 0;
        Object.values(this.laborStructure).forEach(role => {
            total += role.count;
        });
        return total;
    }

    getAllowedCategories(storeType) {
        // Categories must match ProductRegistry categories
        const categoryMap = {
            'SUPERMARKET': [
                // Food & Groceries (SEMI_RAW and MANUFACTURED food products)
                'FOOD_INGREDIENTS', 'DAIRY', 'MEAT', 'PACKAGED_FOOD'
            ],
            'DEPARTMENT': [
                // General merchandise - wide variety
                'CLOTHING', 'TEXTILES', 'FURNITURE', 'ELECTRONICS', 'PACKAGED_FOOD'
            ],
            'ELECTRONICS': [
                // Electronics only
                'ELECTRONICS'
            ],
            'FASHION': [
                // Clothing and textiles
                'CLOTHING', 'TEXTILES'
            ],
            'HARDWARE': [
                // Construction and building materials
                'CONSTRUCTION', 'LUMBER', 'REFINED_METALS'
            ],
            'FURNITURE': [
                // Furniture and home goods
                'FURNITURE', 'LUMBER', 'TEXTILES'
            ],
            'AUTO': [
                // Vehicles and automotive
                'VEHICLES', 'FUELS'
            ]
        };

        return categoryMap[storeType] || categoryMap['DEPARTMENT']; // Default to department store categories
    }

    canSellProduct(productCategory) {
        if (!productCategory) return false;
        return this.allowedCategories.includes(productCategory);
    }

    canSellProductById(productId, productRegistry) {
        if (!productRegistry) return false; // Deny if no registry to verify
        const product = productRegistry.getProduct(productId);
        if (!product) return false; // Deny unknown products
        return this.canSellProduct(product.category);
    }
    
    initialize() {
        this.cash = 8000000;
        this.totalAssets = 1500000;

        // Initialize with starter inventory based on store type
        this.initializeStarterInventory();
    }

    initializeStarterInventory() {
        // Starter products based on store type - must match ProductRegistry categories
        const starterProducts = {
            'SUPERMARKET': [
                // PACKAGED_FOOD, DAIRY, MEAT categories
                { id: 209, name: 'Bread', price: 8, qty: 500, category: 'PACKAGED_FOOD' },
                { id: 111, name: 'Pasteurized Milk', price: 8, qty: 400, category: 'DAIRY' },
                { id: 112, name: 'Beef', price: 25, qty: 150, category: 'MEAT' },
                { id: 113, name: 'Pork', price: 18, qty: 200, category: 'MEAT' },
                { id: 114, name: 'Chicken', price: 12, qty: 300, category: 'MEAT' },
                { id: 210, name: 'Canned Goods', price: 5, qty: 600, category: 'PACKAGED_FOOD' }
            ],
            'DEPARTMENT': [
                // CLOTHING, FURNITURE, ELECTRONICS categories
                { id: 207, name: 'Shirts', price: 40, qty: 200, category: 'CLOTHING' },
                { id: 208, name: 'Jeans', price: 60, qty: 150, category: 'CLOTHING' },
                { id: 205, name: 'Tables', price: 200, qty: 50, category: 'FURNITURE' },
                { id: 206, name: 'Beds', price: 500, qty: 30, category: 'FURNITURE' },
                { id: 201, name: 'Smartphones', price: 800, qty: 50, category: 'ELECTRONICS' }
            ],
            'ELECTRONICS': [
                // ELECTRONICS category only
                { id: 201, name: 'Smartphones', price: 800, qty: 100, category: 'ELECTRONICS' },
                { id: 202, name: 'Laptops', price: 1200, qty: 60, category: 'ELECTRONICS' }
            ],
            'FASHION': [
                // CLOTHING, TEXTILES categories
                { id: 207, name: 'Shirts', price: 40, qty: 300, category: 'CLOTHING' },
                { id: 208, name: 'Jeans', price: 60, qty: 250, category: 'CLOTHING' },
                { id: 110, name: 'Cotton Fabric', price: 45, qty: 100, category: 'TEXTILES' }
            ],
            'HARDWARE': [
                // CONSTRUCTION, LUMBER, REFINED_METALS categories
                { id: 211, name: 'Cement', price: 15, qty: 500, category: 'CONSTRUCTION' },
                { id: 106, name: 'Plywood', price: 80, qty: 300, category: 'LUMBER' },
                { id: 101, name: 'Steel', price: 200, qty: 200, category: 'REFINED_METALS' }
            ],
            'FURNITURE': [
                // FURNITURE category
                { id: 205, name: 'Tables', price: 200, qty: 80, category: 'FURNITURE' },
                { id: 206, name: 'Beds', price: 500, qty: 40, category: 'FURNITURE' }
            ],
            'AUTO': [
                // VEHICLES, FUELS categories
                { id: 203, name: 'Cars', price: 25000, qty: 10, category: 'VEHICLES' },
                { id: 204, name: 'Motorcycles', price: 8000, qty: 20, category: 'VEHICLES' },
                { id: 104, name: 'Gasoline', price: 4, qty: 1000, category: 'FUELS' }
            ]
        };

        const products = starterProducts[this.storeType] || starterProducts['DEPARTMENT'];

        products.forEach(product => {
            // Validate that starter products match allowed categories
            if (!this.canSellProduct(product.category)) {
                console.warn(`Starter product ${product.name} category ${product.category} not allowed for ${this.storeType}`);
                return;
            }
            const wholesalePrice = product.price * 0.7; // 70% of retail = wholesale cost
            this.productInventory.set(product.id, {
                productName: product.name,
                productCategory: product.category,
                quantity: product.qty,
                wholesalePrice: wholesalePrice,
                retailPrice: product.price,
                turnoverRate: 0
            });
            this.currentInventoryValue += product.qty * wholesalePrice;
        });
    }
    
    calculateLaborCosts() {
        let totalWages = 0;
        
        Object.entries(this.laborStructure).forEach(([role, data]) => {
            const adjustedWage = data.wage * this.city.salaryLevel;
            totalWages += data.count * adjustedWage;
        });
        
        totalWages *= 1.30;
        return totalWages;
    }
    
    calculateRent() {
        const baseRent = 10000;
        const locationMultiplier = this.locationQuality / 50;
        const sizeMultiplier = this.storeSize / 1000;
        const cityMultiplier = this.city.costOfLiving;
        
        return baseRent * locationMultiplier * sizeMultiplier * cityMultiplier;
    }
    
    calculateMonthlyOperatingCosts() {
        return (
            this.rentCosts +
            this.utilitiesCosts +
            this.maintenanceCosts +
            this.marketingBudget +
            this.operationalExpenses
        );
    }
    
    purchaseInventory(productId, quantity, wholesalePrice, productName = null, productCategory = null) {
        // Validate product category if provided
        if (productCategory && !this.canSellProduct(productCategory)) {
            return false; // Store cannot sell this category
        }

        const totalCost = quantity * wholesalePrice;

        if (this.cash >= totalCost && this.currentInventoryValue + totalCost <= this.maxInventoryValue) {
            this.cash -= totalCost;

            if (!this.productInventory.has(productId)) {
                this.productInventory.set(productId, {
                    productName: productName || productId,
                    productCategory: productCategory,
                    quantity: 0,
                    wholesalePrice: wholesalePrice,
                    retailPrice: wholesalePrice * (1 + this.markupPercentage),
                    turnoverRate: 0
                });
            }

            const inventory = this.productInventory.get(productId);
            // Use weighted average costing to prevent inventory value mismatch
            const oldValue = inventory.quantity * inventory.wholesalePrice;
            const newValue = quantity * wholesalePrice;
            const newTotalQty = inventory.quantity + quantity;
            inventory.wholesalePrice = newTotalQty > 0 ? (oldValue + newValue) / newTotalQty : wholesalePrice;
            inventory.quantity = newTotalQty;
            inventory.retailPrice = inventory.wholesalePrice * (1 + this.markupPercentage);
            // Update product name if provided and not already set properly
            if (productName && (!inventory.productName || inventory.productName === productId)) {
                inventory.productName = productName;
            }

            this.currentInventoryValue += totalCost;
            this.expenses += totalCost;

            return true;
        }

        return false;
    }

    // Receive delivery from GlobalMarket - cash was already paid when order was placed
    receiveDelivery(productId, quantity, unitPrice, productName = null, productCategory = null) {
        // Validate product category if provided
        if (productCategory && !this.canSellProduct(productCategory)) {
            return false; // Store cannot sell this category
        }

        const totalValue = quantity * unitPrice;

        if (!this.productInventory.has(productId)) {
            this.productInventory.set(productId, {
                productName: productName || productId,
                productCategory: productCategory,
                quantity: 0,
                wholesalePrice: unitPrice,
                retailPrice: unitPrice * (1 + this.markupPercentage),
                turnoverRate: 0
            });
        }

        const inventory = this.productInventory.get(productId);
        // Use weighted average costing
        const oldValue = inventory.quantity * inventory.wholesalePrice;
        const newValue = quantity * unitPrice;
        const newTotalQty = inventory.quantity + quantity;
        inventory.wholesalePrice = newTotalQty > 0 ? (oldValue + newValue) / newTotalQty : unitPrice;
        inventory.quantity = newTotalQty;
        inventory.retailPrice = inventory.wholesalePrice * (1 + this.markupPercentage);

        if (productName && (!inventory.productName || inventory.productName === productId)) {
            inventory.productName = productName;
        }

        this.currentInventoryValue += totalValue;
        return true;
    }

    produceHourly() {
        // RetailStore uses sellHourly - get current hour from simulation context
        const currentHour = new Date().getHours(); // Fallback to real time if no context
        return this.sellHourly(currentHour);
    }

    sellHourly(hourOfDay, cityEconomics = null) {
        // Get retail config (set by SimulationEngine, or use defaults)
        const maxQty = this.retailConfig?.maxRetailQuantity ?? 3;
        const basePurchaseChance = this.retailConfig?.purchaseChance ?? 0.3;

        // Base hourly demand modifier (time of day pattern)
        const hourlyModifier = this.getHourlyDemandModifier(hourOfDay);

        // City economic factors (use city reference or passed data)
        const city = cityEconomics || this.city;
        const salaryLevel = city?.salaryLevel ?? 0.5;
        const consumerConfidence = city?.consumerConfidence ?? 0.7;
        const purchasingPowerPerCapita = city?.marketSize?.perCapita ?? 10000;

        // Normalize purchasing power (baseline $15,000 per capita = 1.0)
        const purchasingPowerFactor = Math.min(2.0, Math.max(0.3, purchasingPowerPerCapita / 15000));

        // Salary level affects willingness to spend (0.1-1.0 → 0.5-1.5 multiplier)
        const salaryFactor = 0.5 + salaryLevel;

        // Random daily fluctuation (±20%) - seeded by day if available
        const dayOfMonth = city?.dayOfMonth ?? Math.floor(Date.now() / 86400000) % 30;
        const dailyVariance = 0.8 + (((dayOfMonth * 7) % 13) / 13) * 0.4;

        // Random hourly fluctuation (±15%)
        const hourlyVariance = 0.85 + Math.random() * 0.3;

        // Combined foot traffic calculation
        const baseFootTraffic = this.dailyFootTraffic / 24;
        const adjustedFootTraffic = baseFootTraffic
            * hourlyModifier
            * purchasingPowerFactor
            * salaryFactor
            * consumerConfidence
            * dailyVariance
            * hourlyVariance;

        const hourlyCustomers = Math.floor(adjustedFootTraffic * this.conversionRate);

        let totalRevenue = 0;
        let totalCOGS = 0; // Cost of Goods Sold
        const transactions = [];
        const productSales = []; // Track individual product sales for logging

        // Build sorted product list by necessityIndex (essentials first)
        const sortedProducts = [];
        this.productInventory.forEach((inventory, productId) => {
            if (inventory.quantity > 0) {
                // Look up necessityIndex from product registry
                const product = this.productRegistry?.getProduct(productId);
                const necessityIndex = product?.necessityIndex ?? 0.5;
                sortedProducts.push({
                    productId,
                    inventory,
                    necessityIndex,
                    product
                });
            }
        });
        // Sort by necessityIndex descending (essentials first: bread before laptops)
        sortedProducts.sort((a, b) => b.necessityIndex - a.necessityIndex);

        // Each customer buys products
        for (let i = 0; i < hourlyCustomers; i++) {
            let transactionValue = 0;
            let transactionCost = 0;
            const itemsBought = [];
            let budgetRemaining = this.calculateCustomerBudget(salaryLevel, consumerConfidence);

            // Customer browses products in priority order (necessities first)
            for (const { productId, inventory, necessityIndex, product } of sortedProducts) {
                if (inventory.quantity <= 0) continue;

                // Calculate purchase probability based on necessityIndex
                // Necessities (0.8-1.0): high base chance, less affected by economy
                // Luxuries (0.0-0.3): lower base chance, heavily affected by economy
                const necessityBonus = necessityIndex * 0.4; // Up to +40% for essentials
                const economicImpact = this.calculateEconomicImpact(necessityIndex, consumerConfidence, salaryLevel);
                const adjustedPurchaseChance = Math.min(0.9, (basePurchaseChance + necessityBonus) * economicImpact);

                if (Math.random() < adjustedPurchaseChance) {
                    // Quantity based on necessity - buy more essentials
                    const baseQty = necessityIndex > 0.7 ? 2 : 1;
                    const quantityPurchased = Math.floor(baseQty + Math.random() * maxQty);
                    const actualQuantity = Math.min(quantityPurchased, inventory.quantity);

                    if (actualQuantity > 0) {
                        const saleValue = actualQuantity * inventory.retailPrice;

                        // Budget check - necessities get priority, luxuries require budget
                        if (necessityIndex < 0.5 && saleValue > budgetRemaining) {
                            continue; // Skip luxury if over budget
                        }

                        const cost = actualQuantity * inventory.wholesalePrice;

                        transactionValue += saleValue;
                        transactionCost += cost;
                        budgetRemaining -= saleValue;

                        inventory.quantity -= actualQuantity;
                        this.currentInventoryValue -= cost;
                        // Ensure inventory value never goes negative
                        if (this.currentInventoryValue < 0) {
                            this.currentInventoryValue = 0;
                        }

                        itemsBought.push({
                            productId: productId,
                            productName: inventory.productName || productId,
                            quantity: actualQuantity,
                            unitPrice: inventory.retailPrice,
                            total: saleValue,
                            necessityIndex: necessityIndex
                        });
                    }
                }
            }

            if (transactionValue > 0) {
                totalRevenue += transactionValue;
                totalCOGS += transactionCost;
                transactions.push({
                    value: transactionValue,
                    cost: transactionCost,
                    margin: transactionValue - transactionCost,
                    items: itemsBought
                });

                // Aggregate product sales for transaction logging
                itemsBought.forEach(item => {
                    productSales.push(item);
                });
            }
        }

        // Update financials
        this.cash += totalRevenue;
        this.revenue += totalRevenue;
        this.monthlyRevenue += totalRevenue;

        // Update daily customer count
        this.dailyCustomers = (this.dailyCustomers || 0) + hourlyCustomers;
        this.dailyTransactions = (this.dailyTransactions || 0) + transactions.length;
        this.dailyRevenue = (this.dailyRevenue || 0) + totalRevenue;

        // Calculate average transaction value
        if (transactions.length > 0) {
            this.averageTransactionValue = transactions.reduce((sum, t) => sum + t.value, 0) / transactions.length;
        }

        // Customer satisfaction affects future traffic
        if (this.productInventory.size > 0) {
            const stockAvailability = this.calculateStockAvailability();
            if (stockAvailability < 0.5) {
                this.customerSatisfaction -= 0.1;
            } else {
                this.customerSatisfaction = Math.min(100, this.customerSatisfaction + 0.05);
            }
        }

        // Store pending sales for transaction logging (to be picked up by SimulationEngine)
        this.pendingConsumerSales = productSales;

        return {
            customers: hourlyCustomers,
            transactions: transactions.length,
            revenue: totalRevenue,
            grossProfit: totalRevenue - totalCOGS,
            avgTransactionValue: this.averageTransactionValue,
            productSales: productSales // Return for logging
        };
    }
    
    /**
     * Calculate customer's shopping budget based on economic conditions
     * Higher salary and confidence = larger budget for discretionary spending
     */
    calculateCustomerBudget(salaryLevel, consumerConfidence) {
        // Base budget scales with salary level ($50-$500 per shopping trip)
        const baseBudget = 50 + (salaryLevel * 450);

        // Consumer confidence affects willingness to spend
        // Low confidence (0.3) = spend only 50% of budget
        // High confidence (1.0) = spend up to 150% of budget
        const confidenceMultiplier = 0.5 + (consumerConfidence * 1.0);

        // Add some randomness (±30%)
        const randomFactor = 0.7 + (Math.random() * 0.6);

        return baseBudget * confidenceMultiplier * randomFactor;
    }

    /**
     * Calculate how economic conditions affect purchase probability
     * Necessities are less affected by economic downturns
     * Luxuries are heavily impacted by consumer confidence
     */
    calculateEconomicImpact(necessityIndex, consumerConfidence, salaryLevel) {
        // Necessities (high index): stable demand regardless of economy
        // Luxuries (low index): demand drops significantly in bad economy

        // Economic stress factor (0 = great economy, 1 = recession)
        const economicStress = 1 - ((consumerConfidence + salaryLevel) / 2);

        // Elasticity: how much demand changes with economic conditions
        // High necessity (0.9) → elasticity 0.1 (10% impact)
        // Low necessity (0.1) → elasticity 0.9 (90% impact)
        const elasticity = 1 - necessityIndex;

        // Impact ranges from 0.3 (severe recession on luxury) to 1.2 (boom on any product)
        // In good times: boost all sales slightly
        // In bad times: necessities stable, luxuries drop
        const impact = 1.0 - (economicStress * elasticity * 0.7);

        // Clamp between 0.3 and 1.2
        return Math.max(0.3, Math.min(1.2, impact));
    }

    getHourlyDemandModifier(hour) {
        // Shopping patterns throughout the day
        const modifiers = {
            0: 0.0, 1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0, 5: 0.0,
            6: 0.1, 7: 0.3, 8: 0.6, 9: 1.0, 10: 1.2, 11: 1.3,
            12: 1.5, 13: 1.4, 14: 1.2, 15: 1.1, 16: 1.0, 17: 1.3,
            18: 1.6, 19: 1.7, 20: 1.4, 21: 1.0, 22: 0.5, 23: 0.1
        };

        return modifiers[hour] || 1.0;
    }
    
    calculateStockAvailability() {
        if (this.productInventory.size === 0) return 0;
        
        let inStock = 0;
        this.productInventory.forEach((inventory) => {
            if (inventory.quantity > 0) inStock++;
        });
        
        return inStock / this.productInventory.size;
    }
    
    investInMarketing(amount) {
        if (this.cash >= amount) {
            this.cash -= amount;
            this.marketingBudget = amount;
            this.expenses += amount;
            
            // Marketing improves brand and foot traffic
            this.storeBrandRating = Math.min(100, this.storeBrandRating + amount / 5000);
            this.dailyFootTraffic = Math.floor(this.dailyFootTraffic * 1.05);
            
            return true;
        }
        return false;
    }
    
    implementLoyaltyProgram(setupCost = 25000) {
        if (this.cash >= setupCost && !this.customerLoyaltyProgram) {
            this.cash -= setupCost;
            this.customerLoyaltyProgram = true;
            this.expenses += setupCost;
            
            // Loyalty program increases conversion rate
            this.conversionRate = Math.min(0.60, this.conversionRate + 0.10);
            this.customerSatisfaction = Math.min(100, this.customerSatisfaction + 10);
            
            return true;
        }
        return false;
    }
    
    adjustPricing(newMarkupPercentage) {
        this.markupPercentage = newMarkupPercentage;
        
        // Update all retail prices
        this.productInventory.forEach((inventory) => {
            inventory.retailPrice = inventory.wholesalePrice * (1 + newMarkupPercentage);
        });
        
        // Higher markup = lower conversion, lower markup = higher conversion
        if (newMarkupPercentage > 0.40) {
            this.conversionRate = Math.max(0.20, this.conversionRate - 0.05);
        } else if (newMarkupPercentage < 0.20) {
            this.conversionRate = Math.min(0.60, this.conversionRate + 0.05);
        }
    }
    
    expandStore(additionalSquareMeters, costPerSqM = 2000) {
        const totalCost = additionalSquareMeters * costPerSqM;
        
        if (this.cash >= totalCost) {
            this.cash -= totalCost;
            this.storeSize = Math.floor(this.storeSize + additionalSquareMeters);
            this.totalAssets += totalCost;
            this.dailyFootTraffic = Math.floor(this.storeSize * 2);
            this.maxInventoryValue += additionalSquareMeters * 100;
            
            // Rent increases
            this.rentCosts = this.calculateRent();
            
            return true;
        }
        return false;
    }
    
    getStatus() {
        const inventoryList = [];
        this.productInventory.forEach((inv, productId) => {
            inventoryList.push({
                productId: productId,
                quantity: inv.quantity,
                retailPrice: inv.retailPrice.toFixed(2),
                value: (inv.quantity * inv.wholesalePrice).toFixed(2)
            });
        });
        
        return {
            firmId: this.id,
            type: this.type,
            storeType: this.storeType,
            store: {
                size: this.storeSize + ' m²',
                location: this.locationQuality.toFixed(0) + '/100',
                brandRating: this.storeBrandRating.toFixed(0),
                customerSatisfaction: this.customerSatisfaction.toFixed(0) + '%'
            },
            sales: {
                dailyFootTraffic: this.dailyFootTraffic,
                conversionRate: (this.conversionRate * 100).toFixed(0) + '%',
                avgTransaction: this.averageTransactionValue.toFixed(2),
                loyaltyProgram: this.customerLoyaltyProgram
            },
            inventory: {
                products: this.productInventory.size,
                value: this.currentInventoryValue.toFixed(2),
                availability: (this.calculateStockAvailability() * 100).toFixed(0) + '%',
                items: inventoryList.slice(0, 10) // First 10 items
            },
            employees: this.totalEmployees,
            financials: {
                cash: this.cash.toFixed(2),
                revenue: this.revenue.toFixed(2),
                profit: this.profit.toFixed(2),
                rent: this.rentCosts.toFixed(2)
            }
        };
    }

    // Override: Get display name for this retail store
    getDisplayName() {
        const abbr = this.corporationAbbreviation || '???';
        const storeTypeNames = {
            'SUPERMARKET': 'Supermarket',
            'DEPARTMENT': 'Department Store',
            'ELECTRONICS': 'Electronics Store',
            'FURNITURE': 'Furniture Store',
            'FASHION': 'Fashion Boutique',
            'HARDWARE': 'Hardware Store',
            'AUTO': 'Auto Dealership'
        };
        const typeName = storeTypeNames[this.storeType] || this.storeType;
        return `${abbr} ${typeName}`;
    }
}
