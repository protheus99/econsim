// js/core/firms/MiningCompany.js
import { Firm } from './Firm.js';

export class MiningCompany extends Firm {
    constructor(location, country, resourceType, customId = null) {
        super('MINING', location, country, customId);
        
        this.resourceType = resourceType; // 'Iron Ore', 'Coal', 'Gold Ore', etc.
        this.mineType = this.determineMineType(resourceType);
        
        // Reserve information
        this.reserveQuality = 50 + Math.random() * 50; // 50-100 quality
        this.totalReserves = this.calculateInitialReserves();
        this.remainingReserves = this.totalReserves;
        this.depletionRate = 0; // Percentage depleted
        
        // Production capacity
        this.baseExtractionRate = this.calculateBaseExtractionRate(); // units per hour
        this.actualExtractionRate = this.baseExtractionRate;
        this.currentProduction = 0;
        
        // Equipment and technology
        this.equipmentLevel = 1;
        this.equipmentEfficiency = 1.0;
        this.equipmentDegradation = 0; // 0-100, higher = worse
        
        // Labor structure
        this.laborStructure = {
            miners: { count: 50, wage: 4500 },
            engineers: { count: 5, wage: 8000 },
            supervisors: { count: 5, wage: 6000 },
            geologists: { count: 2, wage: 9000 },
            heavyEquipmentOperators: { count: 8, wage: 5500 },
            supportStaff: { count: 10, wage: 3500 }
        };
        
        this.totalEmployees = this.calculateTotalEmployees();
        
        // Operating costs
        this.equipmentCosts = 50000; // Monthly equipment lease/maintenance
        this.fuelCosts = 20000; // Monthly fuel for machinery
        this.explosivesCosts = this.mineType === 'OPEN_PIT' ? 15000 : 5000;
        this.utilitiesCosts = 12000; // Electricity, water
        this.safetyEquipmentCosts = 8000;
        this.operationalExpenses = 30000; // Other operational costs
        
        // Environmental and regulatory
        this.environmentalComplianceCost = 10000; // Monthly
        this.licensingFees = 5000; // Monthly
        
        // Output inventory
        this.inventory = {
            quantity: 0,
            quality: this.reserveQuality,
            storageCapacity: 10000
        };
        
        // Market
        this.brandRating = 20; // Mining companies don't focus much on branding
        
        this.initialize();
    }
    
    determineMineType(resourceType) {
        const surfaceMining = ['Coal', 'Iron Ore', 'Limestone', 'Copper Ore'];
        return surfaceMining.includes(resourceType) ? 'OPEN_PIT' : 'UNDERGROUND';
    }
    
    calculateInitialReserves() {
        const baseReserves = {
            'Iron Ore': 5000000,
            'Copper Ore': 3000000,
            'Gold Ore': 500000,
            'Silver Ore': 800000,
            'Coal': 8000000,
            'Limestone': 10000000,
            'Aluminum Ore': 4000000,
            'Salt': 6000000
        };
        
        const base = baseReserves[this.resourceType] || 2000000;
        return base * (0.5 + Math.random() * 1.5); // 50-150% variance
    }
    
    calculateBaseExtractionRate() {
        // Base extraction in tons per hour
        const rates = {
            'OPEN_PIT': 50, // Higher rate for surface mining
            'UNDERGROUND': 25 // Lower rate for underground
        };
        
        return rates[this.mineType];
    }
    
    calculateTotalEmployees() {
        let total = 0;
        Object.values(this.laborStructure).forEach(role => {
            total += role.count;
        });
        return total;
    }
    
    initialize() {
        this.cash = 10000000; // Mining requires more initial capital
        this.totalAssets = 2000000; // Equipment, land, etc.
    }
    
    calculateLaborCosts() {
        let totalWages = 0;
        
        Object.entries(this.laborStructure).forEach(([role, data]) => {
            const adjustedWage = data.wage * this.city.salaryLevel;
            totalWages += data.count * adjustedWage;
        });
        
        // Add payroll taxes and benefits (30% overhead)
        totalWages *= 1.30;
        
        return totalWages;
    }
    
    calculateMonthlyOperatingCosts() {
        return (
            this.equipmentCosts +
            this.fuelCosts +
            this.explosivesCosts +
            this.utilitiesCosts +
            this.safetyEquipmentCosts +
            this.operationalExpenses +
            this.environmentalComplianceCost +
            this.licensingFees
        );
    }
    
    produceHourly() {
        if (this.remainingReserves <= 0) {
            this.currentProduction = 0;
            return { produced: false, reason: 'NO_RESERVES' };
        }

        // Calculate actual production
        const efficiencyFactor = Math.max(0.1, this.equipmentEfficiency * (1 - this.equipmentDegradation / 100));
        const technologyBonus = this.technologyLevel * 0.1;
        const qualityFactor = this.reserveQuality / 100;

        const extractionAmount = this.baseExtractionRate * efficiencyFactor * (1 + technologyBonus) * qualityFactor;
        this.actualExtractionRate = extractionAmount;

        // Deduct from reserves
        this.remainingReserves = Math.max(0, this.remainingReserves - extractionAmount);
        this.depletionRate = ((this.totalReserves - this.remainingReserves) / this.totalReserves) * 100;

        // Add to inventory - direct assignment to ensure it works
        const newQuantity = this.inventory.quantity + extractionAmount;
        this.inventory.quantity = Math.min(newQuantity, this.inventory.storageCapacity);

        this.currentProduction = extractionAmount;

        // Equipment degradation (slower rate)
        this.equipmentDegradation = Math.min(90, this.equipmentDegradation + 0.005);

        return {
            produced: true,
            resource: this.resourceType,
            quantity: extractionAmount,
            quality: this.inventory.quality,
            inventoryLevel: this.inventory.quantity
        };
    }
    
    calculateProductionCost() {
        // Cost per unit of production
        const monthlyLaborCost = this.calculateLaborCosts();
        const monthlyOperatingCost = this.calculateMonthlyOperatingCosts();
        const totalMonthlyCost = monthlyLaborCost + monthlyOperatingCost;
        
        // Expected monthly production (24 hours * 30 days)
        const monthlyProduction = this.actualExtractionRate * 24 * 30;
        
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
    
    upgradeEquipment(investmentAmount) {
        if (this.cash >= investmentAmount) {
            this.cash -= investmentAmount;
            this.equipmentLevel += 1;
            this.equipmentEfficiency = Math.min(1.5, this.equipmentEfficiency + 0.1);
            this.equipmentDegradation = Math.max(0, this.equipmentDegradation - 20);
            return true;
        }
        return false;
    }
    
    performMaintenance(cost) {
        if (this.cash >= cost) {
            this.cash -= cost;
            this.equipmentDegradation = Math.max(0, this.equipmentDegradation - 10);
            this.expenses += cost;
            return true;
        }
        return false;
    }
    
    hireWorkers(role, count) {
        if (this.laborStructure[role]) {
            this.laborStructure[role].count += count;
            this.totalEmployees = this.calculateTotalEmployees();
            
            // Hiring increases extraction rate
            if (role === 'miners' || role === 'heavyEquipmentOperators') {
                this.baseExtractionRate += count * 0.5;
            }
            
            return true;
        }
        return false;
    }
    
    getStatus() {
        return {
            firmId: this.id,
            type: this.type,
            resourceType: this.resourceType,
            mineType: this.mineType,
            reserves: {
                total: this.totalReserves,
                remaining: this.remainingReserves,
                depleted: this.depletionRate.toFixed(2) + '%'
            },
            production: {
                hourlyRate: this.actualExtractionRate.toFixed(2),
                inventory: this.inventory.quantity.toFixed(2),
                quality: this.inventory.quality.toFixed(0)
            },
            employees: this.totalEmployees,
            financials: {
                cash: this.cash.toFixed(2),
                revenue: this.revenue.toFixed(2),
                profit: this.profit.toFixed(2),
                costPerUnit: this.calculateProductionCost().toFixed(2)
            },
            equipment: {
                level: this.equipmentLevel,
                efficiency: (this.equipmentEfficiency * 100).toFixed(0) + '%',
                degradation: this.equipmentDegradation.toFixed(0) + '%'
            }
        };
    }

    // Override: Get display name for this mining company
    getDisplayName() {
        const abbr = this.corporationAbbreviation || '???';
        return `${abbr} ${this.resourceType} Mine`;
    }
}
