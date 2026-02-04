// js/core/firms/Farm.js
import { Firm } from './Firm.js';

export class Farm extends Firm {
    constructor(location, country, farmType, customId = null) {
        super('FARM', location, country, customId);
        
        this.farmType = farmType; // 'CROP' or 'LIVESTOCK'
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
        this.growingSeasonLength = this.getGrowingSeasonLength(this.cropType);
        this.currentGrowthStage = 0; // 0-100%
        this.yieldPerHectare = this.calculateYieldPerHectare();
        
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
        
        // Inventory
        this.inventory = {
            quantity: 0,
            quality: 60,
            storageCapacity: this.landSize * 100 // kg
        };

        // Production tracking
        this.actualProductionRate = 0;
    }

    initializeLivestockFarm() {
        // Livestock selection
        this.livestockType = this.selectLivestock();
        this.herdSize = Math.floor(this.landSize * 2); // 2 animals per hectare
        this.breedingCycle = this.getBreedingCycle(this.livestockType);
        this.currentMaturity = 0; // 0-100%

        // Determine what product this farm outputs for supply chain
        this.outputProduct = this.getOutputProduct(this.livestockType);

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

        // Inventory - stores the primary output product
        this.inventory = {
            quantity: 0,
            quality: 65,
            storageCapacity: this.herdSize * 50 // kg
        };

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
            const totalYield = this.landSize * this.yieldPerHectare;
            const technologyBonus = this.technologyLevel * 0.05;
            const actualYield = totalYield * (1 + technologyBonus);

            // Track production rate (average over growing season)
            this.actualProductionRate = actualYield / seasonHours;

            // Add harvest to existing inventory
            const newQuantity = this.inventory.quantity + actualYield;
            this.inventory.quantity = Math.min(newQuantity, this.inventory.storageCapacity);
            this.currentGrowthStage = 0; // Reset for next season

            return {
                produced: true,
                resource: this.cropType,
                quantity: actualYield,
                quality: this.inventory.quality,
                inventoryLevel: this.inventory.quantity,
                harvest: true
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

        // Continuous production: add livestock units to inventory hourly
        // This represents animals ready for market
        const baseProductionRate = this.herdSize * 0.001; // 0.1% of herd per hour available
        const technologyBonus = this.technologyLevel * 0.05;
        const hourlyOutput = baseProductionRate * (1 + technologyBonus);

        // Track actual production rate
        this.actualProductionRate = hourlyOutput;

        if (hourlyOutput > 0) {
            const newQuantity = this.inventory.quantity + hourlyOutput;
            this.inventory.quantity = Math.min(newQuantity, this.inventory.storageCapacity);
        }

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
            herdSize: this.herdSize
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
    
    sellProduction(quantity, pricePerUnit) {
        if (quantity > this.inventory.quantity) {
            quantity = this.inventory.quantity;
        }
        
        if (quantity <= 0) return 0;
        
        const revenue = quantity * pricePerUnit;
        this.inventory.quantity -= quantity;
        this.cash += revenue;
        this.revenue += revenue;
        this.monthlyRevenue += revenue;
        
        return revenue;
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
        const status = {
            firmId: this.id,
            type: this.type,
            farmType: this.farmType,
            landSize: this.landSize.toFixed(1) + ' hectares',
            employees: this.totalEmployees,
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
