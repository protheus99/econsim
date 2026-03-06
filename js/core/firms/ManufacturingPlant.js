// js/core/firms/ManufacturingPlant.js
import { Firm } from './Firm.js';
import { LotInventory, Lot } from '../Lot.js';
import { getLotConfigForProduct, getRecommendedSaleStrategy, isPerishable, getShelfLife, usesLotSystem, getDefaultLotConfig } from '../LotSizings.js';

export class ManufacturingPlant extends Firm {
    constructor(location, country, productType, productRegistry, customId = null) {
        super('MANUFACTURING', location, country, customId);
        
        this.productType = productType;
        this.productRegistry = productRegistry;
        this.product = productRegistry.getProduct(productType);
        
        if (!this.product) {
            throw new Error(`Product ${productType} not found in registry`);
        }
        
        // Production lines - support multiple production lines for scaling
        this.productionLines = [this.setupProductionLine()];
        this.productionLine = this.productionLines[0]; // Legacy compatibility
        this.maxProductionLines = 5; // Maximum production lines per factory
        this.technologyLevel = this.product.technologyRequired;
        this.qualityControl = 50;
        this.productionEfficiency = 1.0;
        
        // Raw material inventory (quantity tracking for backward compatibility)
        this.rawMaterialInventory = new Map();
        // Lot-based raw material inventory (tracks actual lots per material)
        this.rawMaterialLots = new Map();
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

        // Calculate base output per hour adjusted by complexity
        let outputPerHour = baseOutput / Math.sqrt(complexity);

        // Apply random 10-20% reduction to simulate equipment variability
        // This creates room for future efficiency improvements
        const randomFn = this.engine?.random || Math.random;
        const reductionPercent = 0.10 + (randomFn() * 0.10); // 10-20% reduction
        outputPerHour = outputPerHour * (1 - reductionPercent);

        return {
            inputs: this.product.inputs,
            baseProductionRate: baseOutput, // Store the base rate for reference
            outputPerHour: outputPerHour,
            productionTime: this.product.productionTime || 1,
            requiredTech: this.product.technologyRequired
        };
    }

    /**
     * Get total output per hour across all production lines
     * @returns {number} Combined output per hour
     */
    getTotalOutputPerHour() {
        return this.productionLines.reduce((sum, line) => sum + line.outputPerHour, 0);
    }

    /**
     * Calculate the cost to add a new production line
     * Based on product complexity and existing infrastructure
     * @returns {number} Cost in dollars
     */
    calculateProductionLineCost() {
        const baseCost = this.engine?.config?.manufacturing?.productionLineCostMultiplier ?? 500000;
        const complexityMultiplier = Math.sqrt(this.product.technologyRequired || 1);
        const scaleMultiplier = 1 + (this.productionLines.length * 0.2); // Each new line costs 20% more
        return Math.floor(baseCost * complexityMultiplier * scaleMultiplier);
    }

    /**
     * Add a new production line to scale up capacity
     * @returns {boolean} True if line was added successfully
     */
    addProductionLine() {
        // Check if at max capacity
        const maxLines = this.engine?.config?.manufacturing?.maxProductionLines ?? this.maxProductionLines;
        if (this.productionLines.length >= maxLines) {
            return false;
        }

        // Calculate cost
        const lineCost = this.calculateProductionLineCost();

        // Check if can afford
        if (this.cash < lineCost) {
            return false;
        }

        // Deduct cost and add new line
        this.cash -= lineCost;
        this.expenses += lineCost;

        const newLine = this.setupProductionLine();
        this.productionLines.push(newLine);

        // Update legacy reference to first line
        this.productionLine = this.productionLines[0];

        // Update production capacity
        this.productionCapacity = this.getTotalOutputPerHour();

        console.log(`🏭 ${this.getDisplayName()} added production line ${this.productionLines.length} (cost: $${lineCost.toLocaleString()})`);

        return true;
    }

    /**
     * Check if demand exceeds capacity and auto-scale if needed
     * Called during produceHourly to dynamically add capacity
     */
    checkAutoScaling() {
        if (!this.contractManager) return;

        const productName = this.product?.name || this.productType;
        const contractedDemand = this.contractManager.getContractedDemandForSupplier?.(this.id, productName);

        if (!contractedDemand) return;

        const weeklyDemand = contractedDemand.weeklyDemand || 0;
        const weeklyCapacity = this.getTotalOutputPerHour() * 168; // 168 hours/week
        const autoScaleThreshold = this.engine?.config?.manufacturing?.autoScaleThreshold ?? 0.9;

        // If demand exceeds threshold of capacity, consider adding a line
        if (weeklyDemand > weeklyCapacity * autoScaleThreshold) {
            const maxLines = this.engine?.config?.manufacturing?.maxProductionLines ?? this.maxProductionLines;
            if (this.productionLines.length < maxLines) {
                // Only scale if profitable and have sufficient cash reserves
                const lineCost = this.calculateProductionLineCost();
                const minCashReserve = lineCost * 2; // Keep 2x line cost as reserve

                if (this.cash >= lineCost + minCashReserve) {
                    this.addProductionLine();
                }
            }
        }
    }

    initializeRawMaterialStorage() {
        this.product.inputs.forEach(input => {
            // Quantity-based tracking (for backward compatibility and quick checks)
            this.rawMaterialInventory.set(input.material, {
                quantity: 0,
                capacity: 10000,
                minRequired: input.quantity * 100, // Keep 100 hours of production
                avgQuality: 50 // Track average quality of materials
            });
            // Lot-based tracking (for proper lot consumption)
            this.rawMaterialLots.set(input.material, {
                lots: [], // Array of received lots
                consumptionStrategy: 'FIFO' // FIFO, HIGHEST_QUALITY, LOWEST_QUALITY
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
     * Initialize lot-based inventory system for all manufacturers
     * Should be called after manufacturer type is determined
     */
    initializeLotSystem() {
        const productName = this.product?.name || this.productType;

        // Check if this product uses the lot system
        if (!usesLotSystem(productName, this.productRegistry)) return;

        // Initialize lot inventory
        this.lotInventory = new LotInventory(this.id, 100); // Max 100 lots
        this.lotConfig = getLotConfigForProduct(productName, this.productRegistry);

        // Set lot size based on tier
        if (this.isSemiRawProducer) {
            this.lotSize = this.lotConfig?.lotSize || 50; // Default for SEMI_RAW
        } else {
            this.lotSize = this.lotConfig?.lotSize || 25; // Default for MANUFACTURED
        }

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
        // Consume raw materials for production - lot-based with fallback
        let totalQualityWeighted = 0;
        let totalQuantityConsumed = 0;

        this.product.inputs.forEach(input => {
            const inventory = this.rawMaterialInventory.get(input.material);
            const lotStorage = this.rawMaterialLots.get(input.material);
            const amountNeeded = input.quantity * multiplier;

            if (lotStorage && lotStorage.lots.length > 0) {
                // Consume from lots
                const consumed = this.consumeFromLots(input.material, amountNeeded);
                totalQualityWeighted += consumed.avgQuality * consumed.quantity;
                totalQuantityConsumed += consumed.quantity;

                // Sync quantity with lot-based inventory
                if (inventory) {
                    inventory.quantity = this.calculateLotQuantity(input.material);
                    inventory.avgQuality = consumed.avgQuality;
                }
            } else if (inventory) {
                // Fallback to quantity-based consumption
                inventory.quantity -= amountNeeded;
                totalQualityWeighted += (inventory.avgQuality || 50) * amountNeeded;
                totalQuantityConsumed += amountNeeded;
            }
        });

        // Return average quality of consumed materials
        return totalQuantityConsumed > 0
            ? totalQualityWeighted / totalQuantityConsumed
            : 50;
    }

    /**
     * Consume a specific amount from lots of a given material
     * @param {string} materialName - Name of the material
     * @param {number} amountNeeded - Amount to consume
     * @returns {{ quantity: number, avgQuality: number }}
     */
    consumeFromLots(materialName, amountNeeded) {
        const lotStorage = this.rawMaterialLots.get(materialName);
        if (!lotStorage || lotStorage.lots.length === 0) {
            return { quantity: 0, avgQuality: 50 };
        }

        // Sort lots based on consumption strategy
        const sortedLots = this.sortLotsForConsumption(lotStorage.lots, lotStorage.consumptionStrategy);

        let remainingNeeded = amountNeeded;
        let totalConsumed = 0;
        let qualitySum = 0;
        const lotsToRemove = [];

        for (const lot of sortedLots) {
            if (remainingNeeded <= 0) break;

            const availableInLot = lot.remainingQuantity ?? lot.quantity;
            const consumeFromLot = Math.min(availableInLot, remainingNeeded);

            // Track consumption
            qualitySum += consumeFromLot * (lot.quality || 50);
            totalConsumed += consumeFromLot;
            remainingNeeded -= consumeFromLot;

            // Update lot's remaining quantity
            if (lot.remainingQuantity === undefined) {
                lot.remainingQuantity = lot.quantity;
            }
            lot.remainingQuantity -= consumeFromLot;

            // Mark lot for removal if fully consumed
            if (lot.remainingQuantity <= 0) {
                lotsToRemove.push(lot);
            }
        }

        // Remove fully consumed lots
        lotsToRemove.forEach(lot => {
            const index = lotStorage.lots.indexOf(lot);
            if (index > -1) {
                lotStorage.lots.splice(index, 1);
            }
        });

        return {
            quantity: totalConsumed,
            avgQuality: totalConsumed > 0 ? qualitySum / totalConsumed : 50
        };
    }

    /**
     * Sort lots based on consumption strategy
     * @param {Array} lots - Lots to sort
     * @param {string} strategy - FIFO, HIGHEST_QUALITY, LOWEST_QUALITY, EXPIRING_SOON
     * @returns {Array} Sorted lots
     */
    sortLotsForConsumption(lots, strategy) {
        const sorted = [...lots];
        switch (strategy) {
            case 'FIFO':
                // First in, first out - sort by creation time (oldest first)
                sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                break;
            case 'HIGHEST_QUALITY':
                // Use highest quality first
                sorted.sort((a, b) => (b.quality || 50) - (a.quality || 50));
                break;
            case 'LOWEST_QUALITY':
                // Use lowest quality first
                sorted.sort((a, b) => (a.quality || 50) - (b.quality || 50));
                break;
            case 'EXPIRING_SOON':
                // Use lots expiring soonest first
                sorted.sort((a, b) => {
                    if (a.expiresDay === null && b.expiresDay === null) return 0;
                    if (a.expiresDay === null) return 1;
                    if (b.expiresDay === null) return -1;
                    return a.expiresDay - b.expiresDay;
                });
                break;
            default:
                // Default to FIFO
                sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        }
        return sorted;
    }

    /**
     * Calculate total quantity available in lots for a material
     * @param {string} materialName - Name of the material
     * @returns {number} Total available quantity
     */
    calculateLotQuantity(materialName) {
        const lotStorage = this.rawMaterialLots.get(materialName);
        if (!lotStorage || lotStorage.lots.length === 0) return 0;

        return lotStorage.lots.reduce((sum, lot) => {
            return sum + (lot.remainingQuantity ?? lot.quantity);
        }, 0);
    }

    /**
     * Receive lots from a supplier (called when delivery completes)
     * @param {string} materialName - Name of the material
     * @param {Array} lots - Array of lot objects to receive
     */
    receiveLots(materialName, lots) {
        const lotStorage = this.rawMaterialLots.get(materialName);
        const inventory = this.rawMaterialInventory.get(materialName);

        if (!lotStorage) {
            // Material not in inputs - shouldn't happen but handle gracefully
            console.warn(`Received lots for unknown material: ${materialName}`);
            return;
        }

        // Add lots to storage
        lots.forEach(lot => {
            // Initialize remainingQuantity if not set
            if (lot.remainingQuantity === undefined) {
                lot.remainingQuantity = lot.quantity;
            }
            lotStorage.lots.push(lot);
        });

        // Update quantity tracking for backward compatibility
        if (inventory) {
            inventory.quantity = this.calculateLotQuantity(materialName);
            // Update average quality
            const totalLots = lotStorage.lots;
            if (totalLots.length > 0) {
                const qualitySum = totalLots.reduce((sum, lot) => {
                    const qty = lot.remainingQuantity ?? lot.quantity;
                    return sum + (lot.quality || 50) * qty;
                }, 0);
                const totalQty = this.calculateLotQuantity(materialName);
                inventory.avgQuality = totalQty > 0 ? qualitySum / totalQty : 50;
            }
        }
    }

    /**
     * Receive quantity without lot tracking (legacy method for backward compatibility)
     * @param {string} materialName - Name of the material
     * @param {number} quantity - Quantity to add
     * @param {number} quality - Quality of the material (default 50)
     */
    receiveQuantity(materialName, quantity, quality = 50) {
        const inventory = this.rawMaterialInventory.get(materialName);
        if (inventory) {
            // Weighted average quality
            const currentTotal = inventory.quantity * (inventory.avgQuality || 50);
            const newTotal = quantity * quality;
            inventory.quantity += quantity;
            inventory.avgQuality = inventory.quantity > 0
                ? (currentTotal + newTotal) / inventory.quantity
                : 50;
        }
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
        // Auto-initialize lot system for firms created before lot system update
        if (!this.lotInventory && this.productRegistry) {
            const productName = this.product?.name || this.productType;
            if (usesLotSystem(productName, this.productRegistry)) {
                this.initializeLotSystem();
            }
        }

        // Check if we should add production capacity based on demand
        this.checkAutoScaling();

        // Check if we can produce
        if (!this.checkRawMaterials()) {
            this.actualProductionRate = 0;
            return {
                produced: false,
                reason: 'INSUFFICIENT_RAW_MATERIALS',
                needed: this.getRawMaterialNeeds()
            };
        }

        // Check contract-based production throttling to prevent expiration losses
        let throttleMultiplier = 1.0;
        if (this.contractManager) {
            const productName = this.product?.name || this.productType;
            const currentInventory = this.getAvailableQuantity();
            const perishable = isPerishable(productName);
            const shelfLife = perishable ? getShelfLife(productName) : 30;

            const throttleCheck = this.contractManager.shouldThrottleProduction(
                this, productName, currentInventory, perishable, shelfLife
            );

            if (throttleCheck.shouldThrottle) {
                throttleMultiplier = 1 - (throttleCheck.throttlePercent / 100);
                if (throttleMultiplier <= 0.05) {
                    // Production fully throttled - don't consume materials
                    this.actualProductionRate = 0;
                    return {
                        produced: false,
                        reason: 'THROTTLED_' + throttleCheck.reason,
                        message: throttleCheck.message,
                        product: this.productType,
                        quantity: 0
                    };
                }
            }
        }

        // Account for downtime
        if (Math.random() < this.downtimePercentage) {
            this.actualProductionRate = 0;
            return {
                produced: false,
                reason: 'DOWNTIME'
            };
        }

        // Calculate production (with throttle applied) - aggregate across all production lines
        const techBonus = (this.technologyLevel - this.product.technologyRequired) * 0.1;
        const efficiencyFactor = this.productionEfficiency;
        const workerSkillBonus = this.laborStructure.productionWorkers.count / 100;

        const baseOutputPerHour = this.getTotalOutputPerHour();
        const actualOutput = baseOutputPerHour *
                            (1 + techBonus) *
                            efficiencyFactor *
                            (1 + workerSkillBonus) *
                            throttleMultiplier;

        // Consume materials proportional to actual output
        this.consumeRawMaterials(actualOutput / baseOutputPerHour);

        // Calculate quality
        const productQuality = this.calculateQuality();

        // Apply defect rate
        const goodUnits = actualOutput * (1 - this.defectRate);

        // Track actual production rate (good units produced per hour)
        this.actualProductionRate = goodUnits;

        // All manufacturers use lot-based inventory if lot system is initialized
        if (this.lotInventory) {
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

        // Fallback: products without lot system use standard inventory
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
     * Create a new lot from accumulated production (all manufacturers)
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
        if (this.lotInventory) {
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
        // Calculate average quality from lot-based raw material inventory
        let totalQuality = 0;
        let totalQuantity = 0;

        this.product.inputs.forEach(input => {
            const lotStorage = this.rawMaterialLots.get(input.material);
            const inventory = this.rawMaterialInventory.get(input.material);

            if (lotStorage && lotStorage.lots.length > 0) {
                // Use lot-based quality
                lotStorage.lots.forEach(lot => {
                    const qty = lot.remainingQuantity ?? lot.quantity;
                    totalQuality += (lot.quality || 50) * qty;
                    totalQuantity += qty;
                });
            } else if (inventory && inventory.quantity > 0) {
                // Use inventory-tracked average quality
                totalQuality += (inventory.avgQuality || 50) * inventory.quantity;
                totalQuantity += inventory.quantity;
            }
        });

        if (totalQuantity > 0) {
            return totalQuality / totalQuantity;
        }

        // Default quality if no materials available
        return 50;
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
     * Sell production - lot-based for all manufacturers with lot system
     * @param {number} requestedQuantity - Requested quantity to sell
     * @param {number} pricePerUnit - Price per unit
     * @param {number} currentDay - Current game day (for lot selection)
     * @returns {Object} Sale result
     */
    sellProduction(requestedQuantity, pricePerUnit, currentDay = 0) {
        // All manufacturers with lot system use lot-based sales
        if (this.lotInventory) {
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

        // Fallback: products without lot system use standard inventory
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
     * Select lots for a potential sale (all manufacturers with lot system)
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
                productionLines: this.productionLines.length,
                maxProductionLines: this.engine?.config?.manufacturing?.maxProductionLines ?? this.maxProductionLines,
                outputPerHour: this.getTotalOutputPerHour().toFixed(2),
                outputPerLine: this.productionLine.outputPerHour.toFixed(2),
                finishedGoods: this.finishedGoodsInventory.quantity.toFixed(0),
                quality: this.finishedGoodsInventory.quality.toFixed(0),
                defectRate: (this.defectRate * 100).toFixed(2) + '%',
                downtime: (this.downtimePercentage * 100).toFixed(0) + '%'
            },
            rawMaterials: Array.from(this.rawMaterialInventory.entries()).map(([material, inv]) => {
                const lotStorage = this.rawMaterialLots.get(material);
                return {
                    material: material,
                    quantity: inv.quantity.toFixed(0),
                    capacity: inv.capacity,
                    avgQuality: (inv.avgQuality || 50).toFixed(1),
                    lotCount: lotStorage ? lotStorage.lots.length : 0,
                    consumptionStrategy: lotStorage?.consumptionStrategy || 'FIFO'
                };
            }),
            employees: this.totalEmployees,
            technology: this.technologyLevel,
            financials: {
                cash: this.cash.toFixed(2),
                revenue: this.revenue.toFixed(2),
                profit: this.profit.toFixed(2),
                costPerUnit: this.calculateProductionCost().toFixed(2)
            }
        };

        // Add lot information for all manufacturers with lot system
        if (this.lotInventory) {
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

    // Override: Get serializable state including manufacturing-specific data
    getSerializableState() {
        const baseState = super.getSerializableState();

        // Serialize raw material inventory
        const rawMaterials = {};
        for (const [material, inv] of this.rawMaterialInventory) {
            rawMaterials[material] = {
                quantity: inv.quantity,
                avgQuality: inv.avgQuality
            };
        }

        // Serialize raw material lots
        const rawMaterialLotsData = {};
        for (const [material, storage] of this.rawMaterialLots) {
            rawMaterialLotsData[material] = storage.lots.map(lot => ({
                id: lot.id,
                productName: lot.productName,
                quantity: lot.quantity,
                remainingQuantity: lot.remainingQuantity,
                quality: lot.quality,
                createdAt: lot.createdAt,
                expiresDay: lot.expiresDay
            }));
        }

        return {
            ...baseState,
            productType: this.productType,
            productionEfficiency: this.productionEfficiency,
            defectRate: this.defectRate,
            qualityControl: this.qualityControl,
            downtimePercentage: this.downtimePercentage,
            accumulatedProduction: this.accumulatedProduction,
            // Serialize all production lines
            productionLines: this.productionLines.map(line => ({
                outputPerHour: line.outputPerHour,
                baseProductionRate: line.baseProductionRate
            })),
            // Legacy field for backward compatibility
            productionLine: {
                outputPerHour: this.productionLine.outputPerHour,
                inputsPerHour: this.productionLine.inputsPerHour
            },
            finishedGoodsInventory: {
                quantity: this.finishedGoodsInventory.quantity,
                quality: this.finishedGoodsInventory.quality
            },
            rawMaterialInventory: rawMaterials,
            rawMaterialLotsData: rawMaterialLotsData,
            lotInventory: this.lotInventory?.toJSON?.() || null
        };
    }

    // Override: Restore manufacturing-specific state
    restoreState(state) {
        super.restoreState(state);
        if (!state) return;

        this.productionEfficiency = state.productionEfficiency ?? this.productionEfficiency;
        this.defectRate = state.defectRate ?? this.defectRate;
        this.qualityControl = state.qualityControl ?? this.qualityControl;
        this.downtimePercentage = state.downtimePercentage ?? this.downtimePercentage;
        this.accumulatedProduction = state.accumulatedProduction ?? this.accumulatedProduction;

        // Restore production lines (new format) or fallback to single line (legacy)
        if (state.productionLines && Array.isArray(state.productionLines)) {
            // Restore multiple production lines
            this.productionLines = state.productionLines.map(lineData => ({
                ...this.setupProductionLine(), // Get base structure
                outputPerHour: lineData.outputPerHour,
                baseProductionRate: lineData.baseProductionRate
            }));
            this.productionLine = this.productionLines[0]; // Legacy compatibility
        } else if (state.productionLine) {
            // Legacy: single production line
            this.productionLine.outputPerHour = state.productionLine.outputPerHour ?? this.productionLine.outputPerHour;
            this.productionLines = [this.productionLine];
        }

        // Update production capacity
        this.productionCapacity = this.getTotalOutputPerHour();

        if (state.finishedGoodsInventory) {
            this.finishedGoodsInventory.quantity = state.finishedGoodsInventory.quantity ?? this.finishedGoodsInventory.quantity;
            this.finishedGoodsInventory.quality = state.finishedGoodsInventory.quality ?? this.finishedGoodsInventory.quality;
        }

        // Restore raw material inventory quantities
        if (state.rawMaterialInventory) {
            for (const [material, data] of Object.entries(state.rawMaterialInventory)) {
                const inv = this.rawMaterialInventory.get(material);
                if (inv) {
                    inv.quantity = data.quantity ?? inv.quantity;
                    inv.avgQuality = data.avgQuality ?? inv.avgQuality;
                }
            }
        }

        // Restore raw material lots
        if (state.rawMaterialLotsData) {
            for (const [material, lotsData] of Object.entries(state.rawMaterialLotsData)) {
                const storage = this.rawMaterialLots.get(material);
                if (storage) {
                    storage.lots = lotsData.map(lotData => ({
                        ...lotData,
                        remainingQuantity: lotData.remainingQuantity ?? lotData.quantity
                    }));
                }
            }
        }

        // Restore lot inventory if serialization exists
        if (state.lotInventory && this.lotInventory) {
            this.lotInventory.restoreFromJSON?.(state.lotInventory, this.lotRegistry);
        }
    }
}
