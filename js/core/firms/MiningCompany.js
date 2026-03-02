// js/core/firms/MiningCompany.js
import { Firm } from './Firm.js';
import { LotInventory, Lot } from '../Lot.js';
import { getLotConfigForProduct, getRecommendedSaleStrategy, isPerishable, getShelfLife } from '../LotSizings.js';

export class MiningCompany extends Firm {
    constructor(location, country, resourceType, customId = null, productRegistry = null) {
        super('MINING', location, country, customId);

        this.resourceType = resourceType; // 'Iron Ore', 'Coal', 'Gold Ore', etc.
        this.productRegistry = productRegistry;
        this.product = productRegistry?.getProductByName(resourceType) || null;
        this.mineType = this.determineMineType(resourceType);

        // Reserve information
        this.reserveQuality = 50 + Math.random() * 50; // 50-100 quality
        this.totalReserves = this.calculateInitialReserves();
        this.remainingReserves = this.totalReserves;
        this.depletionRate = 0; // Percentage depleted

        // Production capacity - use product's baseProductionRate if available
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
        
        // Output inventory (legacy - kept for backward compatibility during transition)
        this.inventory = {
            quantity: 0,
            quality: this.reserveQuality,
            storageCapacity: 100000
        };

        // Lot-based inventory system
        this.lotInventory = new LotInventory(this.id, 200); // Max 200 lots
        this.accumulatedProduction = 0; // Buffer for production before lot formation
        this.lotConfig = getLotConfigForProduct(resourceType, productRegistry);
        this.lotSize = this.lotConfig?.lotSize || 500; // Default lot size

        // Set sale strategy based on product type
        const recommendedStrategy = getRecommendedSaleStrategy(resourceType);
        this.lotInventory.setSaleStrategy(recommendedStrategy);

        // Reference to lot registry (set by SimulationEngine after firm creation)
        this.lotRegistry = null;

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
        let baseRate;

        // Use product's baseProductionRate if available from registry
        if (this.product && this.product.baseProductionRate) {
            baseRate = this.product.baseProductionRate;
        } else {
            // Fallback to hardcoded rates based on mine type
            const rates = {
                'OPEN_PIT': 50, // Higher rate for surface mining
                'UNDERGROUND': 25 // Lower rate for underground
            };
            baseRate = rates[this.mineType];
        }

        // Apply random 10-20% reduction to simulate equipment variability
        // This creates room for future efficiency improvements
        const randomFn = this.engine?.random || Math.random;
        const reductionPercent = 0.10 + (randomFn() * 0.10); // 10-20% reduction
        return baseRate * (1 - reductionPercent);
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

        // Accumulate production for lot formation
        this.accumulatedProduction += extractionAmount;

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

        this.currentProduction = extractionAmount;

        // Equipment degradation (slower rate)
        this.equipmentDegradation = Math.min(90, this.equipmentDegradation + 0.005);

        return {
            produced: true,
            resource: this.resourceType,
            quantity: extractionAmount,
            quality: this.inventory.quality,
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
        if (isPerishable(this.resourceType)) {
            const shelfLife = getShelfLife(this.resourceType);
            expiresDay = currentDay + shelfLife;
        }

        // Create lot configuration
        const lotConfig = {
            productName: this.resourceType,
            productId: this.product?.id || null,
            producerId: this.id,
            quantity: this.lotSize,
            unit: this.lotConfig?.unit || 'ton',
            quality: this.reserveQuality,
            createdAt: currentHour,
            createdDay: currentDay,
            expiresDay: expiresDay
        };

        // Use lot registry if available, otherwise create locally
        let lot;
        if (this.lotRegistry) {
            lot = this.lotRegistry.createLot(lotConfig);
        } else {
            // Create lot with temporary ID (will be registered later)
            const tempId = `LOT_${this.resourceType.replace(/\s+/g, '')}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
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
        // Cost per unit of production
        const monthlyLaborCost = this.calculateLaborCosts();
        const monthlyOperatingCost = this.calculateMonthlyOperatingCosts();
        const totalMonthlyCost = monthlyLaborCost + monthlyOperatingCost;
        
        // Expected monthly production (24 hours * 30 days)
        const monthlyProduction = this.actualExtractionRate * 24 * 30;
        
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
            this.resourceType,
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
     * Used by trade execution to check availability
     * @param {number} requestedQuantity - Quantity requested
     * @param {number} currentDay - Current game day
     * @returns {{ lots: Lot[], totalQuantity: number, avgQuality: number }}
     */
    selectLotsForSale(requestedQuantity, currentDay = 0) {
        return this.lotInventory.selectLotsForSale(
            this.resourceType,
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
                // Rollback any reservations made
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
        const lotStatus = this.lotInventory.getStatus();

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

    // Override: Get serializable state including mining-specific data
    getSerializableState() {
        const baseState = super.getSerializableState();
        return {
            ...baseState,
            remainingReserves: this.remainingReserves,
            depletionRate: this.depletionRate,
            reserveQuality: this.reserveQuality,
            equipmentDegradation: this.equipmentDegradation,
            equipmentEfficiency: this.equipmentEfficiency,
            accumulatedProduction: this.accumulatedProduction,
            lotInventory: this.lotInventory?.toJSON?.() || null,
            inventory: {
                quantity: this.inventory.quantity,
                quality: this.inventory.quality
            }
        };
    }

    // Override: Restore mining-specific state
    restoreState(state) {
        super.restoreState(state);
        if (!state) return;

        this.remainingReserves = state.remainingReserves ?? this.remainingReserves;
        this.depletionRate = state.depletionRate ?? this.depletionRate;
        this.reserveQuality = state.reserveQuality ?? this.reserveQuality;
        this.equipmentDegradation = state.equipmentDegradation ?? this.equipmentDegradation;
        this.equipmentEfficiency = state.equipmentEfficiency ?? this.equipmentEfficiency;
        this.accumulatedProduction = state.accumulatedProduction ?? this.accumulatedProduction;

        if (state.inventory) {
            this.inventory.quantity = state.inventory.quantity ?? this.inventory.quantity;
            this.inventory.quality = state.inventory.quality ?? this.inventory.quality;
        }

        // Restore lot inventory if serialization exists
        if (state.lotInventory && this.lotInventory) {
            this.lotInventory.restoreFromJSON?.(state.lotInventory, this.lotRegistry);
        }
    }
}
