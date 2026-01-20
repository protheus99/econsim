// js/core/firms/RetailStore.js
import { Firm } from './Firm.js';

export class RetailStore extends Firm {
    constructor(location, country, storeType) {
        super('RETAIL', location, country);
        
        this.storeType = storeType; // SUPERMARKET, DEPARTMENT, ELECTRONICS, etc.
        this.storeSize = 1000 + Math.random() * 4000; // Square meters
        this.locationQuality = 50 + Math.random() * 50; // Prime location = higher
        
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
    
    initialize() {
        this.cash = 400000;
        this.totalAssets = 1500000;
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
    
    purchaseInventory(productId, quantity, wholesalePrice) {
        const totalCost = quantity * wholesalePrice;
        
        if (this.cash >= totalCost && this.currentInventoryValue + totalCost <= this.maxInventoryValue) {
            this.cash -= totalCost;
            
            if (!this.productInventory.has(productId)) {
                this.productInventory.set(productId, {
                    quantity: 0,
                    wholesalePrice: wholesalePrice,
                    retailPrice: wholesalePrice * (1 + this.markupPercentage),
                    turnoverRate: 0
                });
            }
            
            const inventory = this.productInventory.get(productId);
            inventory.quantity += quantity;
            inventory.wholesalePrice = wholesalePrice;
            inventory.retailPrice = wholesalePrice * (1 + this.markupPercentage);
            
            this.currentInventoryValue += totalCost;
            this.expenses += totalCost;
            
            return true;
        }
        
        return false;
    }
    
    sellHourly(hourOfDay, productDemand) {
        const demandModifier = this.getHourlyDemandModifier(hourOfDay);
        const hourlyFootTraffic = this.dailyFootTraffic / 24 * demandModifier;
        const hourlyCustomers = Math.floor(hourlyFootTraffic * this.conversionRate);
        
        let totalRevenue = 0;
        let totalCOGS = 0; // Cost of Goods Sold
        const transactions = [];
        
        // Each customer buys products
        for (let i = 0; i < hourlyCustomers; i++) {
            let transactionValue = 0;
            let transactionCost = 0;
            
            // Customer browses available products
            this.productInventory.forEach((inventory, productId) => {
                if (inventory.quantity > 0 && Math.random() < 0.3) { // 30% chance to buy each product
                    const quantityPurchased = Math.floor(1 + Math.random() * 3); // Buy 1-3 units
                    const actualQuantity = Math.min(quantityPurchased, inventory.quantity);
                    
                    if (actualQuantity > 0) {
                        const saleValue = actualQuantity * inventory.retailPrice;
                        const cost = actualQuantity * inventory.wholesalePrice;
                        
                        transactionValue += saleValue;
                        transactionCost += cost;
                        
                        inventory.quantity -= actualQuantity;
                        this.currentInventoryValue -= cost;
                    }
                }
            });
            
            if (transactionValue > 0) {
                totalRevenue += transactionValue;
                totalCOGS += transactionCost;
                transactions.push({
                    value: transactionValue,
                    cost: transactionCost,
                    margin: transactionValue - transactionCost
                });
            }
        }
        
        // Update financials
        this.cash += totalRevenue;
        this.revenue += totalRevenue;
        this.monthlyRevenue += totalRevenue;
        
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
        
        return {
            customers: hourlyCustomers,
            transactions: transactions.length,
            revenue: totalRevenue,
            grossProfit: totalRevenue - totalCOGS,
            avgTransactionValue: this.averageTransactionValue
        };
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
            this.storeSize += additionalSquareMeters;
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
}
