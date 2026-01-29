// js/core/firms/LoggingCompany.js
import { Firm } from './Firm.js';

export class LoggingCompany extends Firm {
    constructor(location, country, timberType, customId = null) {
        super('LOGGING', location, country, customId);
        
        this.timberType = timberType; // 'Softwood Logs', 'Hardwood Logs', 'Bamboo'
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
        
        // Production capacity
        this.baseHarvestRate = 25; // Cubic meters per hour
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
        
        // Output inventory
        this.inventory = {
            quantity: 0,
            quality: 60 + Math.random() * 30,
            storageCapacity: 5000 // Cubic meters
        };
        
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

        // Add to inventory - direct assignment
        const newQuantity = this.inventory.quantity + harvestAmount;
        this.inventory.quantity = Math.min(newQuantity, this.inventory.storageCapacity);

        this.currentProduction = harvestAmount;

        return {
            produced: true,
            resource: this.timberType,
            quantity: harvestAmount,
            quality: this.inventory.quality,
            sustainable: harvestAmount <= hourlySustainableYield,
            inventoryLevel: this.inventory.quantity
        };
    }
    
    calculateProductionCost() {
        const monthlyLaborCost = this.calculateLaborCosts();
        const monthlyOperatingCost = this.calculateMonthlyOperatingCosts();
        const totalMonthlyCost = monthlyLaborCost + monthlyOperatingCost;
        
        const monthlyProduction = this.actualHarvestRate * 24 * 30;
        
        if (monthlyProduction === 0) return 0;
        
        return totalMonthlyCost / monthlyProduction;
    }
    
    sellProduction(quantity, pricePerUnit) {
        if (quantity > this.inventory.quantity) {
            quantity = this.inventory.quantity;
        }
        
        if (quantity <= 0) return 0;
        
        // Sustainable certification can command premium
        const sustainabilityPremium = this.certifiedSustainable ? 1.15 : 1.0;
        const finalPrice = pricePerUnit * sustainabilityPremium;
        
        const revenue = quantity * finalPrice;
        this.inventory.quantity -= quantity;
        this.cash += revenue;
        this.revenue += revenue;
        this.monthlyRevenue += revenue;
        
        return revenue;
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
                quality: this.inventory.quality.toFixed(0)
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
        return `${this.timberType} Logging #${this.getShortId()}`;
    }
}
