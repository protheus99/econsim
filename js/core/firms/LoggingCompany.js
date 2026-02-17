// js/core/firms/LoggingCompany.js
import { Firm } from './Firm.js';
import { LotInventory, Lot } from '../Lot.js';
import { getLotConfigForProduct, getRecommendedSaleStrategy, isPerishable, getShelfLife } from '../LotSizings.js';

export class LoggingCompany extends Firm {
    constructor(location, country, timberType, customId = null, productRegistry = null) {
        super('LOGGING', location, country, customId);

        this.timberType = timberType; // 'Softwood Logs', 'Hardwood Logs', 'Bamboo'
        this.productRegistry = productRegistry;
        this.product = productRegistry?.getProductByName(timberType) || null;
        this.forestType = this.determineForestType(timberType);

        // Forest information
        this.forestSize = 500 + Math.random() * 1500; // Hectares
        this.forestDensity = 60 + Math.random() * 40; // Trees per hectare
        this.averageTreeAge = 20 + Math.random() * 30; // Years
        this.forestHealth = 80 + Math.random() * 20; // 0-100

        // Sustainability
        this.sustainableYieldRate = 0.03; // 3% of forest per year
        this.reforestationRate = 0.035; // 3.5% replanted per year
        this.certifiedSustainable = false;

        // Production capacity - use product's baseProductionRate if available
        this.baseHarvestRate = this.product?.baseProductionRate || 25; // Cubic meters per hour
        this.actualHarvestRate = this.baseHarvestRate;
        this.currentProduction = 0;
        
        // Equipment and technology
        this.equipmentLevel = 1;
        this.equipmentEfficiency = 1.0;
        
        // Labor structure
        this.laborStructure = {
            lumberjacks: { count: 30, wage: 4000 },
            chainsaw_operators: { count: 15, wage: 4500 },
            heavy_equipment_operators: { count: 10, wage: 5000 },
            foresters: { count: 3, wage: 7000 },
            tree_planters: { count: 8, wage: 3500 },
            truck_drivers: { count: 6, wage: 4200 },
            supportStaff: { count: 7, wage: 3500 }
        };
        
        this.totalEmployees = this.calculateTotalEmployees();
        
        // Operating costs
        this.equipmentCosts = 40000; // Chainsaws, harvesters, trucks
        this.fuelCosts = 18000;
        this.maintenanceCosts = 12000;
        this.seedlingCosts = 8000; // For reforestation
        this.operationalExpenses = 25000;
        this.certificationCosts = this.certifiedSustainable ? 5000 : 0;
        
        // Output inventory (legacy - kept for backward compatibility)
        this.inventory = {
            quantity: 0,
            quality: 60 + Math.random() * 30,
            storageCapacity: 5000 // Cubic meters
        };

        // Lot-based inventory system
        this.lotInventory = new LotInventory(this.id, 100); // Max 100 lots
        this.accumulatedProduction = 0; // Buffer for production before lot formation
        this.lotConfig = getLotConfigForProduct(timberType, productRegistry);
        this.lotSize = this.lotConfig?.lotSize || 50; // Default lot size

        // Set sale strategy based on product type
        const recommendedStrategy = getRecommendedSaleStrategy(timberType);
        this.lotInventory.setSaleStrategy(recommendedStrategy);

        // Reference to lot registry (set by SimulationEngine after firm creation)
        this.lotRegistry = null;

        // Market
        this.brandRating = this.certifiedSustainable ? 50 : 30;

        this.initialize();
    }
    
    determineForestType(timberType) {
        const types = {
            'Softwood Logs': 'CONIFEROUS',
            'Hardwood Logs': 'DECIDUOUS',
            'Bamboo': 'BAMBOO'
        };
        return types[timberType] || 'MIXED';
    }
    
    calculateTotalEmployees() {
        let total = 0;
        Object.values(this.laborStructure).forEach(role => {
            total += role.count;
        });
        return total;
    }
    
    initialize() {
        this.cash = 6000000;
        this.totalAssets = 1500000; // Land, equipment, forest value
    }
    
    calculateLaborCosts() {
        let totalWages = 0;
        
        Object.entries(this.laborStructure).forEach(([role, data]) => {
            const adjustedWage = data.wage * this.city.salaryLevel;
            totalWages += data.count * adjustedWage;
        });
        
        totalWages *= 1.30; // Benefits and taxes
        return totalWages;
    }
    
    calculateMonthlyOperatingCosts() {
        return (
            this.equipmentCosts +
            this.fuelCosts +
            this.maintenanceCosts +
            this.seedlingCosts +
            this.operationalExpenses +
            this.certificationCosts
        );
    }
    
    produceHourly() {
        // Check sustainable limits
        const annualSustainableYield = this.forestSize * this.forestDensity * this.sustainableYieldRate;
        const hourlySustainableYield = annualSustainableYield / (365 * 24);

        // Calculate actual production
        const efficiencyFactor = this.equipmentEfficiency;
        const technologyBonus = this.technologyLevel * 0.08;
        const healthFactor = this.forestHealth / 100;

        let harvestAmount = Math.min(
            this.baseHarvestRate * efficiencyFactor * (1 + technologyBonus),
            hourlySustainableYield * 1.2
        );

        harvestAmount *= healthFactor;
        this.actualHarvestRate = harvestAmount;

        // Update forest health based on sustainability
        if (harvestAmount > hourlySustainableYield) {
            this.forestHealth = Math.max(10, this.forestHealth - 0.01);
        } else {
            this.forestHealth = Math.min(100, this.forestHealth + 0.005);
        }

        // Accumulate production for lot formation
        this.accumulatedProduction += harvestAmount;

        // Track lots created this hour
        const lotsCreated = [];

        // Create lots when threshold is reached
        while (this.accumulatedProduction >= this.lotSize) {
            const lot = this.createLot();
            if (lot) {
                lotsCreated.push(lot);
                this.accumulatedProduction -= this.lotSize;
            } else {
                // Can't create more lots (storage full), keep in buffer
                break;
            }
        }

        // Update legacy inventory for backward compatibility
        this.inventory.quantity = this.getAvailableQuantity();

        this.currentProduction = harvestAmount;

        return {
            produced: true,
            resource: this.timberType,
            quantity: harvestAmount,
            quality: this.inventory.quality,
            sustainable: harvestAmount <= hourlySustainableYield,
            inventoryLevel: this.inventory.quantity,
            lotsCreated: lotsCreated.length,
            accumulatedBuffer: this.accumulatedProduction
        };
    }

    /**
     * Create a new lot from accumulated production
     * @returns {Lot|null} The created lot or null if failed
     */
    createLot() {
        // Check if lot inventory has capacity
        if (this.lotInventory.lots.size >= this.lotInventory.storageCapacity) {
            return null;
        }

        // Get current game time (will be set by SimulationEngine)
        const gameTime = this.getGameTime?.() || { hour: 0, day: 1, month: 1, year: 2025 };
        const currentHour = gameTime.hour + (gameTime.day - 1) * 24 + (gameTime.month - 1) * 30 * 24;
        const currentDay = gameTime.day + (gameTime.month - 1) * 30 + (gameTime.year - 2025) * 365;

        // Calculate expiration for perishable goods
        let expiresDay = null;
        if (isPerishable(this.timberType)) {
            const shelfLife = getShelfLife(this.timberType);
            expiresDay = currentDay + shelfLife;
        }

        // Create lot configuration
        const lotConfig = {
            productName: this.timberType,
            productId: this.product?.id || null,
            producerId: this.id,
            quantity: this.lotSize,
            unit: this.lotConfig?.unit || 'cord',
            quality: this.inventory.quality,
            createdAt: currentHour,
            createdDay: currentDay,
            expiresDay: expiresDay
        };

        // Use lot registry if available, otherwise create locally
        let lot;
        if (this.lotRegistry) {
            lot = this.lotRegistry.createLot(lotConfig);
        } else {
            // Create lot with temporary ID
            const tempId = `LOT_${this.timberType.replace(/\s+/g, '')}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            lot = new Lot({ ...lotConfig, id: tempId });
        }

        // Add to firm's lot inventory
        this.lotInventory.addLot(lot);

        return lot;
    }

    /**
     * Get total available quantity from lot inventory
     * @returns {number}
     */
    getAvailableQuantity() {
        return this.lotInventory.getAvailableQuantity() + this.accumulatedProduction;
    }

    /**
     * Get number of available lots
     * @returns {number}
     */
    getAvailableLotCount() {
        return this.lotInventory.getAvailableLotCount();
    }
    
    calculateProductionCost() {
        const monthlyLaborCost = this.calculateLaborCosts();
        const monthlyOperatingCost = this.calculateMonthlyOperatingCosts();
        const totalMonthlyCost = monthlyLaborCost + monthlyOperatingCost;
        
        const monthlyProduction = this.actualHarvestRate * 24 * 30;
        
        if (monthlyProduction === 0) return 0;
        
        return totalMonthlyCost / monthlyProduction;
    }
    
    /**
     * Sell production using lot-based system
     * @param {number} requestedQuantity - Requested quantity to sell
     * @param {number} pricePerUnit - Price per unit
     * @param {number} currentDay - Current game day (for lot selection)
     * @returns {{ revenue: number, lots: Lot[], totalQuantity: number, avgQuality: number }}
     */
    sellProduction(requestedQuantity, pricePerUnit, currentDay = 0) {
        // Use lot-based sales
        const selection = this.lotInventory.selectLotsForSale(
            this.timberType,
            requestedQuantity,
            currentDay
        );

        if (selection.lots.length === 0) {
            return { revenue: 0, lots: [], totalQuantity: 0, avgQuality: 0 };
        }

        // Calculate revenue based on average quality and sustainability
        const qualityMultiplier = selection.avgQuality / 50; // Base quality is 50
        const sustainabilityPremium = this.certifiedSustainable ? 1.15 : 1.0;
        const adjustedPrice = pricePerUnit * Math.sqrt(qualityMultiplier) * sustainabilityPremium;
        const revenue = selection.totalQuantity * adjustedPrice;

        // Remove sold lots from inventory
        const soldLotIds = selection.lots.map(lot => lot.id);
        const soldLots = this.lotInventory.removeLots(soldLotIds);

        // Update financials
        this.cash += revenue;
        this.revenue += revenue;
        this.monthlyRevenue += revenue;

        // Update legacy inventory for backward compatibility
        this.inventory.quantity = this.getAvailableQuantity();

        return {
            revenue,
            lots: soldLots,
            totalQuantity: selection.totalQuantity,
            avgQuality: selection.avgQuality
        };
    }

    /**
     * Select lots for a potential sale (without actually selling)
     * @param {number} requestedQuantity - Quantity requested
     * @param {number} currentDay - Current game day
     * @returns {{ lots: Lot[], totalQuantity: number, avgQuality: number }}
     */
    selectLotsForSale(requestedQuantity, currentDay = 0) {
        return this.lotInventory.selectLotsForSale(
            this.timberType,
            requestedQuantity,
            currentDay
        );
    }

    /**
     * Commit selected lots for a trade (mark as reserved)
     * @param {Lot[]} lots - Lots to commit
     * @param {string} buyerId - ID of the buyer
     * @returns {boolean} Success status
     */
    commitLotsForTrade(lots, buyerId) {
        for (const lot of lots) {
            if (!lot.reserve(buyerId)) {
                lots.forEach(l => l.releaseReservation());
                return false;
            }
        }
        return true;
    }

    /**
     * Release lots from a cancelled trade
     * @param {Lot[]} lots - Lots to release
     */
    releaseLotsFromTrade(lots) {
        lots.forEach(lot => lot.releaseReservation());
    }

    /**
     * Transfer lots to a buyer (after successful trade)
     * @param {Lot[]} lots - Lots to transfer
     * @param {string} deliveryId - Delivery tracking ID
     */
    transferLots(lots, deliveryId = null) {
        const transferredLots = [];
        for (const lot of lots) {
            if (deliveryId) {
                lot.markInTransit(deliveryId);
            }
            const removed = this.lotInventory.removeLot(lot.id);
            if (removed) {
                transferredLots.push(removed);
            }
        }

        // Update legacy inventory
        this.inventory.quantity = this.getAvailableQuantity();

        return transferredLots;
    }
    
    obtainSustainabilityCertification(cost = 50000) {
        if (this.cash >= cost && this.forestHealth >= 70) {
            this.cash -= cost;
            this.certifiedSustainable = true;
            this.certificationCosts = 5000;
            this.brandRating = 50;
            return true;
        }
        return false;
    }
    
    expandForest(hectares, costPerHectare = 10000) {
        const totalCost = hectares * costPerHectare;
        if (this.cash >= totalCost) {
            this.cash -= totalCost;
            this.forestSize += hectares;
            this.totalAssets += totalCost;
            return true;
        }
        return false;
    }
    
    getStatus() {
        const lotStatus = this.lotInventory.getStatus();

        return {
            firmId: this.id,
            type: this.type,
            timberType: this.timberType,
            forest: {
                size: this.forestSize.toFixed(1) + ' hectares',
                health: this.forestHealth.toFixed(0) + '%',
                density: this.forestDensity.toFixed(0) + ' trees/hectare',
                sustainable: this.certifiedSustainable
            },
            production: {
                hourlyRate: this.actualHarvestRate.toFixed(2) + ' m³',
                inventory: this.inventory.quantity.toFixed(2) + ' m³',
                quality: this.inventory.quality.toFixed(0),
                accumulatedBuffer: this.accumulatedProduction.toFixed(2),
                lotSize: this.lotSize
            },
            lots: {
                total: lotStatus.totalLots,
                available: lotStatus.availableLots,
                totalQuantity: lotStatus.totalQuantity,
                saleStrategy: lotStatus.saleStrategy
            },
            employees: this.totalEmployees,
            financials: {
                cash: this.cash.toFixed(2),
                revenue: this.revenue.toFixed(2),
                profit: this.profit.toFixed(2),
                costPerUnit: this.calculateProductionCost().toFixed(2)
            }
        };
    }

    // Override: Get display name for this logging company
    getDisplayName() {
        const abbr = this.corporationAbbreviation || '???';
        return `${abbr} ${this.timberType} Logging`;
    }
}
