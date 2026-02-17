// js/core/firms/ManufacturingPlant.js
import { Firm } from './Firm.js';
import { LotInventory, Lot } from '../Lot.js';
import { getLotConfigForProduct, getRecommendedSaleStrategy, isPerishable, getShelfLife, usesLotSystem } from '../LotSizings.js';

export class ManufacturingPlant extends Firm {
    constructor(location, country, productType, productRegistry, customId = null) {
        super('MANUFACTURING', location, country, customId);
        
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
        
        // Finished goods inventory (for MANUFACTURED tier products)
        this.finishedGoodsInventory = {
            quantity: 0,
            quality: 50,
            storageCapacity: 10000
        };

        // Lot-based inventory system (for SEMI_RAW tier products only)
        // Will be initialized properly when isSemiRawProducer is set
        this.lotInventory = null;
        this.accumulatedProduction = 0;
        this.lotConfig = null;
        this.lotSize = 0;
        this.lotRegistry = null;

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
        this.actualProductionRate = 0; // Updated each hour during production
        this.productionCapacity = this.productionLine.outputPerHour; // Max theoretical output

        this.initialize();
    }
    
    setupProductionLine() {
        // Get production requirements from product
        // Use product's baseProductionRate from registry, fallback to 10 if not set
        const baseOutput = this.product.baseProductionRate || 10;
        const complexity = this.product.technologyRequired;

        return {
            inputs: this.product.inputs,
            baseProductionRate: baseOutput, // Store the base rate for reference
            outputPerHour: baseOutput / Math.sqrt(complexity), // Adjusted by complexity
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
        this.cash = 16000000;
        this.totalAssets = 5000000;
    }

    /**
     * Initialize lot-based inventory system for SEMI_RAW producers
     * Should be called after isSemiRawProducer flag is set
     */
    initializeLotSystem() {
        if (!this.isSemiRawProducer) return;

        const productName = this.product?.name || this.productType;

        // Initialize lot inventory
        this.lotInventory = new LotInventory(this.id, 100); // Max 100 lots
        this.lotConfig = getLotConfigForProduct(productName, this.productRegistry);
        this.lotSize = this.lotConfig?.lotSize || 50; // Default for SEMI_RAW

        // Set sale strategy based on product type
        const recommendedStrategy = getRecommendedSaleStrategy(productName);
        this.lotInventory.setSaleStrategy(recommendedStrategy);
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
            this.actualProductionRate = 0;
            return {
                produced: false,
                reason: 'INSUFFICIENT_RAW_MATERIALS',
                needed: this.getRawMaterialNeeds()
            };
        }

        // Account for downtime
        if (Math.random() < this.downtimePercentage) {
            this.actualProductionRate = 0;
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

        // Track actual production rate (good units produced per hour)
        this.actualProductionRate = goodUnits;

        // SEMI_RAW producers use lot-based inventory
        if (this.isSemiRawProducer && this.lotInventory) {
            // Accumulate production for lot formation
            this.accumulatedProduction += goodUnits;

            // Track lots created this hour
            const lotsCreated = [];

            // Create lots when threshold is reached
            while (this.accumulatedProduction >= this.lotSize) {
                const lot = this.createLot(productQuality);
                if (lot) {
                    lotsCreated.push(lot);
                    this.accumulatedProduction -= this.lotSize;
                } else {
                    break;
                }
            }

            // Update legacy inventory for backward compatibility
            this.finishedGoodsInventory.quantity = this.getAvailableQuantity();
            this.finishedGoodsInventory.quality = productQuality;

            return {
                produced: true,
                product: this.productType,
                quantity: goodUnits,
                defects: actualOutput - goodUnits,
                quality: productQuality,
                costPerUnit: this.calculateProductionCost(),
                lotsCreated: lotsCreated.length,
                accumulatedBuffer: this.accumulatedProduction
            };
        }

        // MANUFACTURED tier products use standard inventory
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

    /**
     * Create a new lot from accumulated production (SEMI_RAW producers only)
     * @param {number} quality - Quality rating for the lot
     * @returns {Lot|null} The created lot or null if failed
     */
    createLot(quality) {
        if (!this.lotInventory) return null;

        // Check if lot inventory has capacity
        if (this.lotInventory.lots.size >= this.lotInventory.storageCapacity) {
            return null;
        }

        const productName = this.product?.name || this.productType;

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
            quality: quality,
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
     * Get total available quantity (from lots or standard inventory)
     * @returns {number}
     */
    getAvailableQuantity() {
        if (this.isSemiRawProducer && this.lotInventory) {
            return this.lotInventory.getAvailableQuantity() + this.accumulatedProduction;
        }
        return this.finishedGoodsInventory.quantity;
    }

    /**
     * Get number of available lots (SEMI_RAW producers only)
     * @returns {number}
     */
    getAvailableLotCount() {
        if (this.lotInventory) {
            return this.lotInventory.getAvailableLotCount();
        }
        return 0;
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
    
    /**
     * Sell production - lot-based for SEMI_RAW, standard for MANUFACTURED
     * @param {number} requestedQuantity - Requested quantity to sell
     * @param {number} pricePerUnit - Price per unit
     * @param {number} currentDay - Current game day (for lot selection)
     * @returns {Object} Sale result
     */
    sellProduction(requestedQuantity, pricePerUnit, currentDay = 0) {
        // SEMI_RAW producers use lot-based sales
        if (this.isSemiRawProducer && this.lotInventory) {
            const productName = this.product?.name || this.productType;

            const selection = this.lotInventory.selectLotsForSale(
                productName,
                requestedQuantity,
                currentDay
            );

            if (selection.lots.length === 0) {
                return { revenue: 0, lots: [], totalQuantity: 0, avgQuality: 0 };
            }

            // Calculate revenue based on average quality
            const qualityMultiplier = selection.avgQuality / 50;
            const adjustedPrice = pricePerUnit * Math.sqrt(qualityMultiplier);
            const revenue = selection.totalQuantity * adjustedPrice;

            // Remove sold lots
            const soldLotIds = selection.lots.map(lot => lot.id);
            const soldLots = this.lotInventory.removeLots(soldLotIds);

            // Update financials
            this.cash += revenue;
            this.revenue += revenue;
            this.monthlyRevenue += revenue;

            // Update legacy inventory
            this.finishedGoodsInventory.quantity = this.getAvailableQuantity();

            return {
                revenue,
                lots: soldLots,
                totalQuantity: selection.totalQuantity,
                avgQuality: selection.avgQuality
            };
        }

        // MANUFACTURED products use standard inventory
        let quantity = requestedQuantity;
        if (quantity > this.finishedGoodsInventory.quantity) {
            quantity = this.finishedGoodsInventory.quantity;
        }

        if (quantity <= 0) return { revenue: 0, totalQuantity: 0 };

        const revenue = quantity * pricePerUnit;
        this.finishedGoodsInventory.quantity -= quantity;
        this.cash += revenue;
        this.revenue += revenue;
        this.monthlyRevenue += revenue;

        return { revenue, totalQuantity: quantity };
    }

    /**
     * Select lots for a potential sale (SEMI_RAW producers only)
     * @param {number} requestedQuantity - Quantity requested
     * @param {number} currentDay - Current game day
     * @returns {{ lots: Lot[], totalQuantity: number, avgQuality: number }}
     */
    selectLotsForSale(requestedQuantity, currentDay = 0) {
        if (!this.lotInventory) {
            return { lots: [], totalQuantity: 0, avgQuality: 0 };
        }
        const productName = this.product?.name || this.productType;
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
        if (!this.lotInventory) return [];

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
        this.finishedGoodsInventory.quantity = this.getAvailableQuantity();

        return transferredLots;
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
        const status = {
            firmId: this.id,
            type: this.type,
            product: this.productType,
            isSemiRawProducer: this.isSemiRawProducer || false,
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

        // Add lot information for SEMI_RAW producers
        if (this.isSemiRawProducer && this.lotInventory) {
            const lotStatus = this.lotInventory.getStatus();
            status.lots = {
                total: lotStatus.totalLots,
                available: lotStatus.availableLots,
                totalQuantity: lotStatus.totalQuantity,
                saleStrategy: lotStatus.saleStrategy,
                accumulatedBuffer: this.accumulatedProduction.toFixed(2),
                lotSize: this.lotSize
            };
        }

        return status;
    }

    // Override: Get display name for this manufacturing plant
    getDisplayName() {
        const abbr = this.corporationAbbreviation || '???';
        const productName = this.product?.name || 'Manufacturing';
        return `${abbr} ${productName} Plant`;
    }
}
