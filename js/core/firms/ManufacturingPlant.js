// js/core/firms/ManufacturingPlant.js
import { Firm } from './Firm.js';

export class ManufacturingPlant extends Firm {
    constructor(location, country, productType, productRegistry) {
        super('MANUFACTURING', location, country);
        
        this.productType = productType;
        this.productRegistry = productRegistry;
        this.product = productRegistry.getProduct(productType);
        
        if (!this.product) {
            throw new Error(`Product ${productType} not found in registry`);
        }
        
        // Production line
        this.productionLine = this.setupProductionLine();
        this.technologyLevel = this.product.technologyRequired;
        this.qualityControl = 50;
        this.productionEfficiency = 1.0;
        
        // Raw material inventory
        this.rawMaterialInventory = new Map();
        this.initializeRawMaterialStorage();
        
        // Finished goods inventory
        this.finishedGoodsInventory = {
            quantity: 0,
            quality: 50,
            storageCapacity: 1000
        };
        
        // Labor structure
        this.laborStructure = {
            productionWorkers: { count: 100, wage: 3800 },
            assemblyWorkers: { count: 50, wage: 4000 },
            technicians: { count: 15, wage: 5500 },
            qualityInspectors: { count: 10, wage: 4500 },
            engineers: { count: 8, wage: 7500 },
            productionManagers: { count: 5, wage: 9000 },
            maintenanceStaff: { count: 12, wage: 4200 },
            supportStaff: { count: 12, wage: 3500 }
        };
        
        this.totalEmployees = this.calculateTotalEmployees();
        
        // Operating costs
        this.equipmentCosts = 100000;
        this.utilitiesCosts = 40000; // Electricity, water, gas
        this.maintenanceCosts = 25000;
        this.qualityControlCosts = 15000;
        this.operationalExpenses = 50000;
        this.rawMaterialCosts = 0; // Calculated dynamically
        
        // Production metrics
        this.defectRate = 0.05; // 5% defect rate initially
        this.downtimePercentage = 0.10; // 10% downtime
        
        this.initialize();
    }
    
    setupProductionLine() {
        // Get production requirements from product
        const baseOutput = 10; // Base units per hour
        const complexity = this.product.technologyRequired;
        
        return {
            inputs: this.product.inputs,
            outputPerHour: baseOutput / Math.sqrt(complexity),
            productionTime: this.product.productionTime || 1,
            requiredTech: this.product.technologyRequired
        };
    }
    
    initializeRawMaterialStorage() {
        this.product.inputs.forEach(input => {
            this.rawMaterialInventory.set(input.material, {
                quantity: 0,
                capacity: 10000,
                minRequired: input.quantity * 100 // Keep 100 hours of production
            });
        });
    }
    
    calculateTotalEmployees() {
        let total = 0;
        Object.values(this.laborStructure).forEach(role => {
            total += role.count;
        });
        return total;
    }
    
    initialize() {
        this.cash = 800000;
        this.totalAssets = 5000000;
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
        return (
            this.equipmentCosts +
            this.utilitiesCosts +
            this.maintenanceCosts +
            this.qualityControlCosts +
            this.operationalExpenses +
            this.rawMaterialCosts
        );
    }
    
    checkRawMaterials() {
        // Check if we have enough raw materials for one hour of production
        for (const input of this.product.inputs) {
            const inventory = this.rawMaterialInventory.get(input.material);
            if (!inventory || inventory.quantity < input.quantity) {
                return false;
            }
        }
        return true;
    }
    
    consumeRawMaterials(multiplier = 1) {
        // Consume raw materials for production
        this.product.inputs.forEach(input => {
            const inventory = this.rawMaterialInventory.get(input.material);
            if (inventory) {
                inventory.quantity -= input.quantity * multiplier;
            }
        });
    }
    
    purchaseRawMaterial(materialName, quantity, pricePerUnit) {
        const inventory = this.rawMaterialInventory.get(materialName);
        if (!inventory) return false;
        
        const totalCost = quantity * pricePerUnit;
        
        if (this.cash >= totalCost && inventory.quantity + quantity <= inventory.capacity) {
            this.cash -= totalCost;
            inventory.quantity += quantity;
            this.rawMaterialCosts += totalCost;
            this.expenses += totalCost;
            return true;
        }
        
        return false;
    }
    
    produceHourly() {
        // Check if we can produce
        if (!this.checkRawMaterials()) {
            return {
                produced: false,
                reason: 'INSUFFICIENT_RAW_MATERIALS',
                needed: this.getRawMaterialNeeds()
            };
        }
        
        // Account for downtime
        if (Math.random() < this.downtimePercentage) {
            return {
                produced: false,
                reason: 'DOWNTIME'
            };
        }
        
        // Calculate production
        const techBonus = (this.technologyLevel - this.product.technologyRequired) * 0.1;
        const efficiencyFactor = this.productionEfficiency;
        const workerSkillBonus = this.laborStructure.productionWorkers.count / 100;
        
        const actualOutput = this.productionLine.outputPerHour * 
                            (1 + techBonus) * 
                            efficiencyFactor * 
                            (1 + workerSkillBonus);
        
        // Consume materials
        this.consumeRawMaterials(actualOutput / this.productionLine.outputPerHour);
        
        // Calculate quality
        const productQuality = this.calculateQuality();
        
        // Apply defect rate
        const goodUnits = actualOutput * (1 - this.defectRate);
        
        // Add to finished goods
        if (this.finishedGoodsInventory.quantity + goodUnits <= this.finishedGoodsInventory.storageCapacity) {
            this.finishedGoodsInventory.quantity += goodUnits;
            this.finishedGoodsInventory.quality = productQuality;
        } else {
            this.finishedGoodsInventory.quantity = this.finishedGoodsInventory.storageCapacity;
        }
        
        return {
            produced: true,
            product: this.productType,
            quantity: goodUnits,
            defects: actualOutput - goodUnits,
            quality: productQuality,
            costPerUnit: this.calculateProductionCost()
        };
    }
    
    calculateQuality() {
        // Quality based on multiple factors
        const techFactor = (this.technologyLevel / 10) * 100;
        const qcFactor = this.qualityControl;
        const rawMaterialQuality = this.getAverageInputQuality();
        const workerSkillFactor = Math.min(100, this.laborStructure.technicians.count * 5);
        
        const quality = (
            techFactor * 0.3 +
            qcFactor * 0.3 +
            rawMaterialQuality * 0.2 +
            workerSkillFactor * 0.2
        );
        
        return Math.min(100, quality);
    }
    
    getAverageInputQuality() {
        // Simplified - would normally track actual input quality
        return 60 + Math.random() * 20;
    }
    
    calculateProductionCost() {
        const monthlyLaborCost = this.calculateLaborCosts();
        const monthlyOperatingCost = this.calculateMonthlyOperatingCosts();
        
        // Calculate raw material cost per unit
        let rawMaterialCostPerUnit = 0;
        this.product.inputs.forEach(input => {
            // Estimated cost - would normally use actual purchase prices
            const estimatedPrice = 50; // Placeholder
            rawMaterialCostPerUnit += input.quantity * estimatedPrice;
        });
        
        const monthlyProduction = this.productionLine.outputPerHour * 24 * 30 * (1 - this.downtimePercentage);
        const overheadPerUnit = (monthlyLaborCost + monthlyOperatingCost) / monthlyProduction;
        
        return rawMaterialCostPerUnit + overheadPerUnit;
    }
    
    sellProduction(quantity, pricePerUnit) {
        if (quantity > this.finishedGoodsInventory.quantity) {
            quantity = this.finishedGoodsInventory.quantity;
        }
        
        if (quantity <= 0) return 0;
        
        const revenue = quantity * pricePerUnit;
        this.finishedGoodsInventory.quantity -= quantity;
        this.cash += revenue;
        this.revenue += revenue;
        this.monthlyRevenue += revenue;
        
        return revenue;
    }
    
    getRawMaterialNeeds() {
        const needs = [];
        this.product.inputs.forEach(input => {
            const inventory = this.rawMaterialInventory.get(input.material);
            if (inventory && inventory.quantity < inventory.minRequired) {
                needs.push({
                    material: input.material,
                    current: inventory.quantity,
                    needed: inventory.minRequired - inventory.quantity
                });
            }
        });
        return needs;
    }
    
    upgradeTechnology(investmentAmount) {
        const upgradeCost = this.technologyLevel * 100000;
        
        if (this.cash >= upgradeCost) {
            this.cash -= upgradeCost;
            this.technologyLevel += 1;
            this.productionEfficiency += 0.05;
            this.defectRate = Math.max(0.01, this.defectRate - 0.01);
            return true;
        }
        return false;
    }
    
    improveQualityControl(investmentAmount) {
        if (this.cash >= investmentAmount) {
            this.cash -= investmentAmount;
            this.qualityControl = Math.min(100, this.qualityControl + 10);
            this.defectRate = Math.max(0.01, this.defectRate - 0.02);
            return true;
        }
        return false;
    }
    
    getStatus() {
        return {
            firmId: this.id,
            type: this.type,
            product: this.productType,
            production: {
                outputPerHour: this.productionLine.outputPerHour.toFixed(2),
                finishedGoods: this.finishedGoodsInventory.quantity.toFixed(0),
                quality: this.finishedGoodsInventory.quality.toFixed(0),
                defectRate: (this.defectRate * 100).toFixed(2) + '%',
                downtime: (this.downtimePercentage * 100).toFixed(0) + '%'
            },
            rawMaterials: Array.from(this.rawMaterialInventory.entries()).map(([material, inv]) => ({
                material: material,
                quantity: inv.quantity.toFixed(0),
                capacity: inv.capacity
            })),
            employees: this.totalEmployees,
            technology: this.technologyLevel,
            financials: {
                cash: this.cash.toFixed(2),
                revenue: this.revenue.toFixed(2),
                profit: this.profit.toFixed(2),
                costPerUnit: this.calculateProductionCost().toFixed(2)
            }
        };
    }
}
