// js/core/firms/Farm.js
import { Firm } from './Firm.js';
import { LotInventory, Lot } from '../Lot.js';
import { getLotConfigForProduct, getRecommendedSaleStrategy, isPerishable, getShelfLife } from '../LotSizings.js';

export class Farm extends Firm {
    constructor(location, country, farmType, customId = null, productRegistry = null) {
        super('FARM', location, country, customId);

        this.farmType = farmType; // 'CROP' or 'LIVESTOCK'
        this.productRegistry = productRegistry;
        this.landSize = 100 + Math.random() * 400; // Hectares
        this.soilQuality = 50 + Math.random() * 50; // For crops
        this.climate = location.climate || 'TEMPERATE';

        // Crops or livestock
        this.products = []; // What this farm produces
        this.currentCycle = 0; // Growing/raising cycle

        if (farmType === 'CROP') {
            this.initializeCropFarm();
        } else {
            this.initializeLivestockFarm();
        }

        this.totalEmployees = this.calculateTotalEmployees();
        this.initialize();
    }
    
    initializeCropFarm() {
        // Crop selection based on climate and soil
        this.cropType = this.selectCrop();
        this.product = this.productRegistry?.getProductByName(this.cropType) || null;
        this.growingSeasonLength = this.getGrowingSeasonLength(this.cropType);
        this.currentGrowthStage = 0; // 0-100%
        this.yieldPerHectare = this.calculateYieldPerHectare();

        // Base production rate from product registry or fallback
        this.baseProductionRate = this.product?.baseProductionRate || 100;

        // Labor structure for crop farm
        this.laborStructure = {
            farmers: { count: 20, wage: 3500 },
            agronomists: { count: 2, wage: 6500 },
            tractor_operators: { count: 5, wage: 4000 },
            irrigation_specialists: { count: 3, wage: 4500 },
            harvesters: { count: 10, wage: 3200 },
            supportStaff: { count: 5, wage: 3000 }
        };

        // Operating costs for crop farm
        this.seedCosts = 10000;
        this.fertilizerCosts = 15000;
        this.pesticideCosts = 8000;
        this.irrigationCosts = 12000;
        this.equipmentCosts = 25000;
        this.operationalExpenses = 20000;

        // Inventory (legacy - kept for backward compatibility)
        this.inventory = {
            quantity: 0,
            quality: 60,
            storageCapacity: this.landSize * 100 // kg
        };

        // Lot-based inventory system
        this.lotInventory = new LotInventory(this.id, 100); // Max 100 lots
        this.accumulatedProduction = 0; // Buffer for production before lot formation
        this.lotConfig = getLotConfigForProduct(this.cropType, this.productRegistry);
        this.lotSize = this.lotConfig?.lotSize || 1000; // Default lot size

        // Set sale strategy based on product type
        const recommendedStrategy = getRecommendedSaleStrategy(this.cropType);
        this.lotInventory.setSaleStrategy(recommendedStrategy);

        // Reference to lot registry (set by SimulationEngine after firm creation)
        this.lotRegistry = null;

        // Production tracking
        this.actualProductionRate = 0;
    }

    initializeLivestockFarm() {
        // Livestock selection
        this.livestockType = this.selectLivestock();
        this.product = this.productRegistry?.getProductByName(this.livestockType) || null;
        this.herdSize = Math.floor(this.landSize * 2); // 2 animals per hectare
        this.breedingCycle = this.getBreedingCycle(this.livestockType);
        this.currentMaturity = 0; // 0-100%

        // Determine what product this farm outputs for supply chain
        this.outputProduct = this.getOutputProduct(this.livestockType);

        // Base production rate from product registry or fallback
        this.baseProductionRate = this.product?.baseProductionRate || 10;

        // Labor structure for livestock farm
        this.laborStructure = {
            farmhands: { count: 25, wage: 3500 },
            veterinarians: { count: 2, wage: 7500 },
            animal_handlers: { count: 8, wage: 3800 },
            milkers: { count: 6, wage: 3300 }, // If dairy
            butchers: { count: 3, wage: 4200 },
            supportStaff: { count: 5, wage: 3000 }
        };

        // Operating costs for livestock farm
        this.feedCosts = 20000;
        this.veterinaryCosts = 10000;
        this.shelterMaintenanceCosts = 8000;
        this.equipmentCosts = 20000;
        this.operationalExpenses = 18000;

        // Inventory (legacy - kept for backward compatibility)
        this.inventory = {
            quantity: 0,
            quality: 65,
            storageCapacity: this.herdSize * 50 // kg
        };

        // Lot-based inventory system
        this.lotInventory = new LotInventory(this.id, 100); // Max 100 lots
        this.accumulatedProduction = 0; // Buffer for production before lot formation
        this.lotConfig = getLotConfigForProduct(this.livestockType, this.productRegistry);
        this.lotSize = this.lotConfig?.lotSize || 20; // Default lot size

        // Set sale strategy based on product type (perishables use EXPIRING_SOON)
        const recommendedStrategy = getRecommendedSaleStrategy(this.livestockType);
        this.lotInventory.setSaleStrategy(recommendedStrategy);

        // Reference to lot registry (set by SimulationEngine after firm creation)
        this.lotRegistry = null;

        // Production tracking
        this.actualProductionRate = 0;
    }

    getOutputProduct(livestockType) {
        // Map livestock type to primary output product for supply chain
        const outputs = {
            'Cattle': 'Cattle',      // Cattle farms supply cattle for beef
            'Pigs': 'Pigs',          // Pig farms supply pigs for pork
            'Chickens': 'Chickens',  // Chicken farms supply chickens
            'Sheep': 'Sheep'
        };
        return outputs[livestockType] || livestockType;
    }
    
    selectCrop() {
        const crops = ['Wheat', 'Rice', 'Corn', 'Cotton', 'Sugarcane', 'Coffee Beans'];
        return crops[Math.floor(Math.random() * crops.length)];
    }
    
    selectLivestock() {
        const livestock = ['Cattle', 'Pigs', 'Chickens', 'Sheep'];
        return livestock[Math.floor(Math.random() * livestock.length)];
    }
    
    getGrowingSeasonLength(crop) {
        const seasons = {
            'Wheat': 120,      // days
            'Rice': 150,
            'Corn': 90,
            'Cotton': 180,
            'Sugarcane': 365,
            'Coffee Beans': 365
        };
        return seasons[crop] || 120;
    }
    
    getBreedingCycle(livestock) {
        const cycles = {
            'Cattle': 365,     // days to maturity
            'Pigs': 180,
            'Chickens': 60,
            'Sheep': 365
        };
        return cycles[livestock] || 180;
    }
    
    calculateYieldPerHectare() {
        const baseYields = {
            'Wheat': 3000,     // kg per hectare
            'Rice': 4000,
            'Corn': 5000,
            'Cotton': 800,
            'Sugarcane': 70000,
            'Coffee Beans': 1200
        };
        
        const baseYield = baseYields[this.cropType] || 3000;
        const soilFactor = this.soilQuality / 100;
        
        return baseYield * soilFactor;
    }
    
    calculateTotalEmployees() {
        let total = 0;
        Object.values(this.laborStructure).forEach(role => {
            total += role.count;
        });
        return total;
    }
    
    initialize() {
        this.cash = 4000000;
        this.totalAssets = 1000000;
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
    
    calculateMonthlyOperatingCosts() {
        if (this.farmType === 'CROP') {
            return (
                this.seedCosts +
                this.fertilizerCosts +
                this.pesticideCosts +
                this.irrigationCosts +
                this.equipmentCosts +
                this.operationalExpenses
            );
        } else {
            return (
                this.feedCosts +
                this.veterinaryCosts +
                this.shelterMaintenanceCosts +
                this.equipmentCosts +
                this.operationalExpenses
            );
        }
    }
    
    produceHourly() {
        if (this.farmType === 'CROP') {
            return this.produceCrops();
        } else {
            return this.produceLivestock();
        }
    }
    
    produceCrops() {
        // Growing cycle in hours
        const seasonHours = this.growingSeasonLength * 24;
        const growthPerHour = 100 / seasonHours;

        this.currentGrowthStage += growthPerHour;

        // Harvest when fully grown
        if (this.currentGrowthStage >= 100) {
            // Use product's baseProductionRate * growing hours for total yield
            const technologyBonus = this.technologyLevel * 0.05;
            const efficiencyFactor = this.efficiency || 1.0;
            const totalYield = this.baseProductionRate * seasonHours * (1 + technologyBonus) * efficiencyFactor;

            // Track production rate (average over growing season)
            this.actualProductionRate = totalYield / seasonHours;

            // Accumulate production for lot formation
            this.accumulatedProduction += totalYield;

            // Create lots from harvest
            const lotsCreated = [];
            while (this.accumulatedProduction >= this.lotSize) {
                const lot = this.createLot(this.cropType);
                if (lot) {
                    lotsCreated.push(lot);
                    this.accumulatedProduction -= this.lotSize;
                } else {
                    break;
                }
            }

            // Update legacy inventory for backward compatibility
            this.inventory.quantity = this.getAvailableQuantity();

            this.currentGrowthStage = 0; // Reset for next season

            return {
                produced: true,
                resource: this.cropType,
                quantity: totalYield,
                quality: this.inventory.quality,
                inventoryLevel: this.inventory.quantity,
                harvest: true,
                lotsCreated: lotsCreated.length,
                accumulatedBuffer: this.accumulatedProduction
            };
        }

        return {
            produced: false,
            resource: this.cropType,
            quantity: 0,
            growthStage: this.currentGrowthStage.toFixed(1) + '%',
            harvest: false
        };
    }

    produceLivestock() {
        // Maturity cycle in hours
        const cycleHours = this.breedingCycle * 24;
        const maturityPerHour = 100 / cycleHours;

        this.currentMaturity += maturityPerHour;

        // Continuous production: use product's baseProductionRate from registry
        // Modified by technology level and efficiency
        const technologyBonus = this.technologyLevel * 0.05;
        const efficiencyFactor = this.efficiency || 1.0;
        const hourlyOutput = this.baseProductionRate * (1 + technologyBonus) * efficiencyFactor;

        // Track actual production rate
        this.actualProductionRate = hourlyOutput;

        // Accumulate production for lot formation
        if (hourlyOutput > 0) {
            this.accumulatedProduction += hourlyOutput;
        }

        // Track lots created this hour
        const lotsCreated = [];

        // Create lots when threshold is reached
        while (this.accumulatedProduction >= this.lotSize) {
            const lot = this.createLot(this.livestockType);
            if (lot) {
                lotsCreated.push(lot);
                this.accumulatedProduction -= this.lotSize;
            } else {
                break;
            }
        }

        // Update legacy inventory for backward compatibility
        this.inventory.quantity = this.getAvailableQuantity();

        // When mature, grow the herd
        const readyForMarket = this.currentMaturity >= 100;

        if (readyForMarket) {
            this.currentMaturity = 0;
            // Add new generation
            this.herdSize = Math.floor(this.herdSize * 1.05);
            this.inventory.storageCapacity = this.herdSize * 50;
        }

        return {
            produced: hourlyOutput > 0,
            resource: this.livestockType,
            quantity: hourlyOutput,
            quality: this.inventory.quality,
            inventoryLevel: this.inventory.quantity,
            readyForMarket: readyForMarket,
            herdSize: this.herdSize,
            lotsCreated: lotsCreated.length,
            accumulatedBuffer: this.accumulatedProduction
        };
    }
    
    getHourlyLivestockOutput() {
        // Different products based on livestock type
        const outputs = {
            'Cattle': 0.5,      // kg of milk per hour per animal (dairy)
            'Pigs': 0,          // Only at slaughter
            'Chickens': 0.8,    // eggs per hour per chicken
            'Sheep': 0.1        // wool per hour per sheep
        };

        return (outputs[this.livestockType] || 0) * this.herdSize / 24;
    }

    /**
     * Create a new lot from accumulated production
     * @param {string} productName - Name of the product
     * @returns {Lot|null} The created lot or null if failed
     */
    createLot(productName) {
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
        if (isPerishable(productName)) {
            const shelfLife = getShelfLife(productName);
            expiresDay = currentDay + shelfLife;
        }

        // Create lot configuration
        const lotConfig = {
            productName: productName,
            productId: this.product?.id || null,
            producerId: this.id,
            quantity: this.lotSize,
            unit: this.lotConfig?.unit || 'unit',
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
            const tempId = `LOT_${productName.replace(/\s+/g, '')}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
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

    /**
     * Get the product name for this farm
     * @returns {string}
     */
    getProductName() {
        return this.farmType === 'CROP' ? this.cropType : this.livestockType;
    }
    
    calculateProductionCost() {
        const monthlyLaborCost = this.calculateLaborCosts();
        const monthlyOperatingCost = this.calculateMonthlyOperatingCosts();
        const totalMonthlyCost = monthlyLaborCost + monthlyOperatingCost;
        
        let monthlyProduction;
        if (this.farmType === 'CROP') {
            // Annual harvest divided by 12
            monthlyProduction = (this.landSize * this.yieldPerHectare * 12) / this.growingSeasonLength;
        } else {
            monthlyProduction = this.getHourlyLivestockOutput() * 24 * 30;
        }
        
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
        const productName = this.getProductName();

        // Use lot-based sales
        const selection = this.lotInventory.selectLotsForSale(
            productName,
            requestedQuantity,
            currentDay
        );

        if (selection.lots.length === 0) {
            return { revenue: 0, lots: [], totalQuantity: 0, avgQuality: 0 };
        }

        // Calculate revenue based on average quality
        const qualityMultiplier = selection.avgQuality / 50; // Base quality is 50
        const adjustedPrice = pricePerUnit * Math.sqrt(qualityMultiplier);
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
        const productName = this.getProductName();
        return this.lotInventory.selectLotsForSale(
            productName,
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
    
    improveSoilQuality(investmentAmount) {
        if (this.cash >= investmentAmount && this.farmType === 'CROP') {
            this.cash -= investmentAmount;
            this.soilQuality = Math.min(100, this.soilQuality + 5);
            this.yieldPerHectare = this.calculateYieldPerHectare();
            return true;
        }
        return false;
    }
    
    expandLand(hectares, costPerHectare = 15000) {
        const totalCost = hectares * costPerHectare;
        if (this.cash >= totalCost) {
            this.cash -= totalCost;
            this.landSize += hectares;
            this.totalAssets += totalCost;
            
            if (this.farmType === 'LIVESTOCK') {
                this.herdSize += Math.floor(hectares * 2);
            }
            
            return true;
        }
        return false;
    }
    
    getStatus() {
        const lotStatus = this.lotInventory.getStatus();

        const status = {
            firmId: this.id,
            type: this.type,
            farmType: this.farmType,
            landSize: this.landSize.toFixed(1) + ' hectares',
            employees: this.totalEmployees,
            lots: {
                total: lotStatus.totalLots,
                available: lotStatus.availableLots,
                totalQuantity: lotStatus.totalQuantity,
                saleStrategy: lotStatus.saleStrategy,
                accumulatedBuffer: this.accumulatedProduction.toFixed(2),
                lotSize: this.lotSize
            },
            financials: {
                cash: this.cash.toFixed(2),
                revenue: this.revenue.toFixed(2),
                profit: this.profit.toFixed(2),
                costPerUnit: this.calculateProductionCost().toFixed(2)
            }
        };

        if (this.farmType === 'CROP') {
            status.crop = {
                type: this.cropType,
                growthStage: this.currentGrowthStage.toFixed(1) + '%',
                soilQuality: this.soilQuality.toFixed(0) + '%',
                yieldPerHectare: this.yieldPerHectare.toFixed(0) + ' kg',
                inventory: this.inventory.quantity.toFixed(0) + ' kg'
            };
        } else {
            status.livestock = {
                type: this.livestockType,
                herdSize: this.herdSize,
                maturity: this.currentMaturity.toFixed(1) + '%',
                inventory: this.inventory.quantity.toFixed(0) + ' kg'
            };
        }

        return status;
    }

    // Override: Get display name for this farm
    getDisplayName() {
        const abbr = this.corporationAbbreviation || '???';
        if (this.farmType === 'CROP') {
            return `${abbr} ${this.cropType} Farm`;
        } else {
            return `${abbr} ${this.livestockType} Ranch`;
        }
    }
}
