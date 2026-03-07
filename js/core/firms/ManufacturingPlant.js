// js/core/firms/ManufacturingPlant.js
import { Firm } from './Firm.js';
import { LotInventory, Lot } from '../Lot.js';
import { getLotConfigForProduct, getRecommendedSaleStrategy, isPerishable, getShelfLife, usesLotSystem, getDefaultLotConfig } from '../LotSizings.js';

/**
 * Input material category mapping for product compatibility checks.
 * Products sharing categories can be produced on the same factory lines.
 */
const INPUT_CATEGORIES = {
    // LUMBER category
    'Softwood Logs': 'LUMBER', 'Hardwood Logs': 'LUMBER', 'Wood Pulp': 'LUMBER',
    'Plywood': 'LUMBER', 'Lumber': 'LUMBER',
    // METALS category
    'Iron Ore': 'METALS', 'Copper Ore': 'METALS', 'Aluminum Ore': 'METALS',
    'Steel': 'METALS', 'Copper Wire': 'METALS', 'Aluminum Sheets': 'METALS',
    'Gold Ore': 'METALS', 'Silver Ore': 'METALS',
    // TEXTILES category
    'Cotton': 'TEXTILES', 'Cotton Fabric': 'TEXTILES', 'Wool': 'TEXTILES',
    'Leather': 'TEXTILES', 'Raw Hides': 'TEXTILES',
    // FOOD category
    'Wheat': 'FOOD', 'Flour': 'FOOD', 'Sugar': 'FOOD', 'Beef': 'FOOD',
    'Pork': 'FOOD', 'Chicken': 'FOOD', 'Pasteurized Milk': 'FOOD', 'Fresh Fruits': 'FOOD',
    'Rice': 'FOOD', 'Corn': 'FOOD', 'Eggs': 'FOOD', 'Fish': 'FOOD', 'Processed Fish': 'FOOD',
    'Vegetables': 'FOOD', 'Fruit Concentrate': 'FOOD', 'Vegetable Oil': 'FOOD',
    'Raw Milk': 'FOOD', 'Cattle': 'FOOD', 'Pigs': 'FOOD', 'Chickens': 'FOOD',
    'Coffee Beans': 'FOOD', 'Sugarcane': 'FOOD', 'Soybeans': 'FOOD',
    // CHEMICALS category
    'Crude Oil': 'CHEMICALS', 'Plastic Pellets': 'CHEMICALS', 'Industrial Chemicals': 'CHEMICALS',
    'Rubber': 'CHEMICALS', 'Rubber Latex': 'CHEMICALS', 'Natural Gas': 'CHEMICALS',
    'Gasoline': 'CHEMICALS', 'Diesel': 'CHEMICALS',
    // ELECTRONICS category
    'Silicon': 'ELECTRONICS', 'Microchips': 'ELECTRONICS', 'Circuit Boards': 'ELECTRONICS',
    'Copper Wire': 'ELECTRONICS', // Also used in electronics
    // MINERALS category
    'Coal': 'MINERALS', 'Limestone': 'MINERALS', 'Salt': 'MINERALS',
    'Silica Sand': 'MINERALS',
    // GLASS category
    'Glass': 'GLASS',
    // PAPER category
    'Paper': 'PAPER', 'Cardboard': 'PAPER'
};

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
        // Each line can now produce a different product (multi-product support)
        this.productionLines = [this.setupProductionLine(this.product)];
        this.productionLine = this.productionLines[0]; // Legacy compatibility
        this.maxProductionLines = 5; // Maximum production lines per factory
        this.technologyLevel = this.product.technologyRequired;
        this.qualityControl = 50;
        this.productionEfficiency = 1.0;

        // === SHIFT SYSTEM ===
        // Configurable shift system (1/2/3 shifts per day)
        // Default to 1 shift (8 hours/day), can be expanded to 2 or 3 shifts
        const defaultShiftCount = this.engine?.config?.manufacturing?.defaultShiftCount ?? 1;
        this.shiftConfig = {
            shiftCount: defaultShiftCount,
            hoursPerShift: 8,
            shiftSchedule: this.calculateShiftSchedule(defaultShiftCount)
        };
        this.effectiveHoursPerDay = defaultShiftCount * 8;

        // === MULTI-PRODUCT SUPPORT ===
        // Products this factory can produce (all must share input categories)
        this.products = new Map(); // productId -> productDefinition
        this.products.set(this.product.id || this.productType, this.product);

        // Product family defines what products this factory can make
        this.productFamily = {
            primaryProduct: this.product,
            inputMaterials: new Set(this.product.inputs.map(i => i.material)),
            inputCategories: this.getInputCategoriesForProduct(this.product)
        };

        // Per-product inventory tracking (for multi-product factories)
        this.perProductInventory = new Map(); // productId -> { lotInventory, accumulatedProduction }
        this.perProductRawMaterials = new Map(); // productId -> Map<materialName, storage>

        // Line switching costs
        this.lineSwitchingCost = this.engine?.config?.manufacturing?.lineSwitchingCostMultiplier ?? 1000;
        this.lineSwitchingHours = this.engine?.config?.manufacturing?.lineSwitchingHours ?? 2;
        
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
    
    /**
     * Setup a new production line for a given product
     * @param {Object} product - Product definition to produce on this line (defaults to primary product)
     * @returns {Object} Production line configuration
     */
    setupProductionLine(product = null) {
        // Use provided product or fall back to primary product
        const targetProduct = product || this.product;
        if (!targetProduct) {
            throw new Error('Cannot setup production line: no product specified');
        }

        // Get production requirements from product
        // Use product's baseProductionRate from registry, fallback to 10 if not set
        const baseOutput = targetProduct.baseProductionRate || 10;
        const complexity = targetProduct.technologyRequired || 1;

        // Calculate base output per hour adjusted by complexity
        let outputPerHour = baseOutput / Math.sqrt(complexity);

        // Apply random 10-20% reduction to simulate equipment variability
        // This creates room for future efficiency improvements
        const randomFn = this.engine?.random || Math.random;
        const reductionPercent = 0.10 + (randomFn() * 0.10); // 10-20% reduction
        outputPerHour = outputPerHour * (1 - reductionPercent);

        // Generate unique line ID
        const lineIndex = this.productionLines ? this.productionLines.length + 1 : 1;
        const lineId = `LINE_${this.id}_${lineIndex}`;

        return {
            id: lineId,
            productId: targetProduct.id || targetProduct.name,
            productName: targetProduct.name,
            productReference: targetProduct,
            inputs: targetProduct.inputs,
            baseProductionRate: baseOutput,
            outputPerHour: outputPerHour,
            productionTime: targetProduct.productionTime || 1,
            requiredTech: targetProduct.technologyRequired || 1,
            status: 'ACTIVE', // ACTIVE, IDLE, SWITCHING
            switchingUntilHour: null // Hour when switching completes (null = not switching)
        };
    }

    // === SHIFT SYSTEM METHODS ===

    /**
     * Calculate shift schedule based on number of shifts
     * - 1 shift: 8:00-16:00 (main daytime shift)
     * - 2 shifts: 8:00-16:00, 16:00-24:00 (day + evening)
     * - 3 shifts: 8:00-16:00, 16:00-24:00, 0:00-8:00 (continuous 24h)
     * @param {number} shiftCount - Number of shifts (1, 2, or 3)
     * @returns {Array} Array of shift objects with start/end hours
     */
    calculateShiftSchedule(shiftCount) {
        const schedule = [];

        // Shift 1: Day shift (8:00-16:00) - always included
        schedule.push({ start: 8, end: 16 });

        if (shiftCount >= 2) {
            // Shift 2: Evening shift (16:00-24:00)
            schedule.push({ start: 16, end: 24 });
        }

        if (shiftCount >= 3) {
            // Shift 3: Night shift (0:00-8:00)
            schedule.push({ start: 0, end: 8 });
        }

        return schedule;
    }

    /**
     * Set the number of shifts for this factory
     * @param {number} count - Number of shifts (1, 2, or 3)
     * @returns {boolean} True if shift count was changed
     */
    setShiftCount(count) {
        if (count < 1 || count > 3) {
            console.warn(`Invalid shift count: ${count}. Must be 1, 2, or 3.`);
            return false;
        }

        this.shiftConfig.shiftCount = count;
        this.shiftConfig.shiftSchedule = this.calculateShiftSchedule(count);
        this.effectiveHoursPerDay = count * 8;

        console.log(`🏭 ${this.getDisplayName()} now operating ${count} shift(s) (${this.effectiveHoursPerDay} hours/day)`);
        return true;
    }

    /**
     * Check if the factory is active at the given hour of the day
     * @param {number} hourOfDay - Hour of day (0-23)
     * @returns {boolean} True if factory is operating at this hour
     */
    isActiveHour(hourOfDay) {
        const normalizedHour = hourOfDay % 24;

        for (const shift of this.shiftConfig.shiftSchedule) {
            if (normalizedHour >= shift.start && normalizedHour < shift.end) {
                return true;
            }
        }

        return false;
    }

    // === INPUT CATEGORY METHODS ===

    /**
     * Get input categories for a product based on its input materials
     * @param {Object} product - Product definition
     * @returns {Set<string>} Set of category names
     */
    getInputCategoriesForProduct(product) {
        const categories = new Set();

        if (!product?.inputs) return categories;

        for (const input of product.inputs) {
            const category = INPUT_CATEGORIES[input.material];
            if (category) {
                categories.add(category);
            }
        }

        return categories;
    }

    /**
     * Check if a product can be added to this factory based on input similarity
     * Products must share at least one input material OR one input category
     * @param {Object|string} productOrType - Product definition or product type name
     * @returns {{ compatible: boolean, sharedMaterials: string[], sharedCategories: string[], reason?: string }}
     */
    canAddProduct(productOrType) {
        // Resolve product from type name if string
        let product = productOrType;
        if (typeof productOrType === 'string') {
            product = this.productRegistry?.getProduct(productOrType);
            if (!product) {
                return { compatible: false, sharedMaterials: [], sharedCategories: [], reason: 'Product not found' };
            }
        }

        // Check max products limit
        const maxProducts = this.engine?.config?.manufacturing?.maxProductsPerFactory ?? 5;
        if (this.products.size >= maxProducts) {
            return { compatible: false, sharedMaterials: [], sharedCategories: [], reason: 'Max products reached' };
        }

        // Check if multi-product is enabled
        const multiProductEnabled = this.engine?.config?.manufacturing?.multiProductEnabled ?? true;
        if (!multiProductEnabled && this.products.size > 0) {
            return { compatible: false, sharedMaterials: [], sharedCategories: [], reason: 'Multi-product disabled' };
        }

        // Check if already registered
        const productId = product.id || product.name;
        if (this.products.has(productId)) {
            return { compatible: false, sharedMaterials: [], sharedCategories: [], reason: 'Product already registered' };
        }

        // Check input similarity
        const requireSimilarity = this.engine?.config?.manufacturing?.requireInputSimilarity ?? true;
        if (!requireSimilarity) {
            // Similarity not required - all products compatible
            return { compatible: true, sharedMaterials: [], sharedCategories: ['ANY'] };
        }

        const productInputs = new Set(product.inputs?.map(i => i.material) || []);
        const productCategories = this.getInputCategoriesForProduct(product);

        // Check for shared materials (direct overlap)
        const sharedMaterials = [...productInputs].filter(m => this.productFamily.inputMaterials.has(m));
        if (sharedMaterials.length > 0) {
            return { compatible: true, sharedMaterials, sharedCategories: [] };
        }

        // Check for shared categories
        const sharedCategories = [...productCategories].filter(c => this.productFamily.inputCategories.has(c));
        const minShared = this.engine?.config?.manufacturing?.minSharedCategoriesForCompatibility ?? 1;

        if (sharedCategories.length >= minShared) {
            return { compatible: true, sharedMaterials: [], sharedCategories };
        }

        return {
            compatible: false,
            sharedMaterials: [],
            sharedCategories: [],
            reason: `No shared input materials or categories. Factory uses [${[...this.productFamily.inputCategories].join(', ')}], product uses [${[...productCategories].join(', ')}]`
        };
    }

    /**
     * Add a new product type to this factory
     * @param {Object|string} productOrType - Product definition or product type name
     * @returns {{ success: boolean, message: string, productId?: string }}
     */
    addProductToFactory(productOrType) {
        // Resolve product
        let product = productOrType;
        if (typeof productOrType === 'string') {
            product = this.productRegistry?.getProduct(productOrType);
            if (!product) {
                return { success: false, message: `Product '${productOrType}' not found in registry` };
            }
        }

        // Check compatibility
        const compatibility = this.canAddProduct(product);
        if (!compatibility.compatible) {
            return { success: false, message: compatibility.reason };
        }

        const productId = product.id || product.name;

        // Add to products map
        this.products.set(productId, product);

        // Update product family
        for (const input of product.inputs || []) {
            this.productFamily.inputMaterials.add(input.material);
        }
        const newCategories = this.getInputCategoriesForProduct(product);
        for (const cat of newCategories) {
            this.productFamily.inputCategories.add(cat);
        }

        // Initialize raw material storage for new inputs
        this.initializeRawMaterialStorageForProduct(product);

        console.log(`🏭 ${this.getDisplayName()} added product: ${product.name}`);
        return { success: true, message: `Added ${product.name}`, productId };
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
     * @param {Object|string} productOrType - Product to produce on this line (defaults to primary product)
     * @returns {{ success: boolean, lineId?: string, message?: string }} Result object
     */
    addProductionLine(productOrType = null) {
        // Check if at max capacity
        const maxLines = this.engine?.config?.manufacturing?.maxProductionLines ?? this.maxProductionLines;
        if (this.productionLines.length >= maxLines) {
            return { success: false, message: 'Maximum production lines reached' };
        }

        // Resolve product
        let product = this.product; // Default to primary product
        if (productOrType) {
            if (typeof productOrType === 'string') {
                product = this.products.get(productOrType) || this.productRegistry?.getProduct(productOrType);
            } else {
                product = productOrType;
            }

            if (!product) {
                return { success: false, message: 'Product not found' };
            }

            // Ensure product is registered with this factory
            const productId = product.id || product.name;
            if (!this.products.has(productId)) {
                const addResult = this.addProductToFactory(product);
                if (!addResult.success) {
                    return { success: false, message: addResult.message };
                }
            }
        }

        // Calculate cost
        const lineCost = this.calculateProductionLineCost();

        // Check if can afford
        if (this.cash < lineCost) {
            return { success: false, message: 'Insufficient funds' };
        }

        // Deduct cost and add new line
        this.cash -= lineCost;
        this.expenses += lineCost;

        const newLine = this.setupProductionLine(product);
        this.productionLines.push(newLine);

        // Update legacy reference to first line
        this.productionLine = this.productionLines[0];

        // Update production capacity
        this.productionCapacity = this.getTotalOutputPerHour();

        console.log(`🏭 ${this.getDisplayName()} added production line ${newLine.id} for ${product.name} (cost: $${lineCost.toLocaleString()})`);

        return { success: true, lineId: newLine.id };
    }

    // === LINE REALLOCATION METHODS ===

    /**
     * Assign a different product to an existing production line
     * @param {string} lineId - ID of the line to reallocate
     * @param {Object|string} newProductOrType - New product to assign
     * @returns {{ success: boolean, message: string, switchingHours?: number }}
     */
    assignProductToLine(lineId, newProductOrType) {
        // Find the line
        const line = this.productionLines.find(l => l.id === lineId);
        if (!line) {
            return { success: false, message: `Production line ${lineId} not found` };
        }

        // Resolve product
        let newProduct = newProductOrType;
        if (typeof newProductOrType === 'string') {
            newProduct = this.products.get(newProductOrType) || this.productRegistry?.getProduct(newProductOrType);
        }

        if (!newProduct) {
            return { success: false, message: 'Product not found' };
        }

        const newProductId = newProduct.id || newProduct.name;

        // Ensure product is registered with factory
        if (!this.products.has(newProductId)) {
            const addResult = this.addProductToFactory(newProduct);
            if (!addResult.success) {
                return { success: false, message: `Cannot add product: ${addResult.message}` };
            }
        }

        // Check if already assigned to this product
        if (line.productId === newProductId) {
            return { success: false, message: 'Line already produces this product' };
        }

        // Apply switching cost if configured
        if (this.lineSwitchingCost > 0 && this.cash < this.lineSwitchingCost) {
            return { success: false, message: `Insufficient funds for line switching cost ($${this.lineSwitchingCost})` };
        }

        if (this.lineSwitchingCost > 0) {
            this.cash -= this.lineSwitchingCost;
            this.expenses += this.lineSwitchingCost;
        }

        // Set line to switching state
        const totalHours = this.getGameTime?.()?.totalHours || 0;
        line.status = 'SWITCHING';
        line.switchingUntilHour = totalHours + this.lineSwitchingHours;

        // Update line configuration for new product
        const baseOutput = newProduct.baseProductionRate || 10;
        const complexity = newProduct.technologyRequired || 1;
        let outputPerHour = baseOutput / Math.sqrt(complexity);
        const randomFn = this.engine?.random || Math.random;
        const reductionPercent = 0.10 + (randomFn() * 0.10);
        outputPerHour = outputPerHour * (1 - reductionPercent);

        line.productId = newProductId;
        line.productName = newProduct.name;
        line.productReference = newProduct;
        line.inputs = newProduct.inputs;
        line.baseProductionRate = baseOutput;
        line.outputPerHour = outputPerHour;
        line.requiredTech = newProduct.technologyRequired || 1;

        console.log(`🏭 ${this.getDisplayName()} line ${lineId} switching to ${newProduct.name} (${this.lineSwitchingHours}h downtime)`);

        return {
            success: true,
            message: `Line ${lineId} switching to ${newProduct.name}`,
            switchingHours: this.lineSwitchingHours
        };
    }

    /**
     * Reallocate a line from one product to another
     * @param {string} lineId - Line to reallocate
     * @param {string} fromProductId - Current product (for validation)
     * @param {string} toProductId - New product
     * @returns {{ success: boolean, message: string }}
     */
    reallocateLine(lineId, fromProductId, toProductId) {
        const line = this.productionLines.find(l => l.id === lineId);
        if (!line) {
            return { success: false, message: `Line ${lineId} not found` };
        }

        if (line.productId !== fromProductId) {
            return { success: false, message: `Line ${lineId} is not currently producing ${fromProductId}` };
        }

        return this.assignProductToLine(lineId, toProductId);
    }

    /**
     * Get all line assignments with their products and status
     * @returns {Array<{ lineId: string, productId: string, productName: string, status: string, outputPerHour: number }>}
     */
    getLineAssignments() {
        return this.productionLines.map(line => ({
            lineId: line.id,
            productId: line.productId,
            productName: line.productName,
            status: line.status,
            outputPerHour: line.outputPerHour,
            switchingUntilHour: line.switchingUntilHour
        }));
    }

    /**
     * Get total production capacity for a specific product
     * @param {string} productId - Product ID to check
     * @returns {number} Total output per hour for this product
     */
    getProductCapacity(productId) {
        return this.productionLines
            .filter(line => line.productId === productId && line.status === 'ACTIVE')
            .reduce((sum, line) => sum + line.outputPerHour, 0);
    }

    /**
     * Get lines producing a specific product
     * @param {string} productId - Product ID
     * @returns {Array} Lines producing this product
     */
    getLinesForProduct(productId) {
        return this.productionLines.filter(line => line.productId === productId);
    }

    /**
     * Check and update line switching status
     * Called each hour to complete line switches
     */
    updateLineSwitching() {
        const totalHours = this.getGameTime?.()?.totalHours || 0;

        for (const line of this.productionLines) {
            if (line.status === 'SWITCHING' && line.switchingUntilHour && totalHours >= line.switchingUntilHour) {
                line.status = 'ACTIVE';
                line.switchingUntilHour = null;
                console.log(`🏭 ${this.getDisplayName()} line ${line.id} now producing ${line.productName}`);
            }
        }
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

    /**
     * Initialize raw material storage for a specific product's inputs
     * Used when adding additional products to a multi-product factory
     * @param {Object} product - Product definition
     */
    initializeRawMaterialStorageForProduct(product) {
        if (!product?.inputs) return;

        product.inputs.forEach(input => {
            // Only add if not already tracked
            if (!this.rawMaterialInventory.has(input.material)) {
                this.rawMaterialInventory.set(input.material, {
                    quantity: 0,
                    capacity: 10000,
                    minRequired: input.quantity * 100,
                    avgQuality: 50
                });
                this.rawMaterialLots.set(input.material, {
                    lots: [],
                    consumptionStrategy: 'FIFO'
                });
            }
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

        // Update line switching status
        this.updateLineSwitching();

        // === SHIFT CHECK ===
        // Check if factory is active this hour (shift system)
        const gameTime = this.getGameTime?.() || { hour: 0 };
        const currentHourOfDay = gameTime.hour % 24;

        if (!this.isActiveHour(currentHourOfDay)) {
            this.actualProductionRate = 0;
            return {
                produced: false,
                reason: 'SHIFT_INACTIVE',
                message: `Factory operates ${this.shiftConfig.shiftCount} shift(s), not active at hour ${currentHourOfDay}`,
                shiftConfig: this.shiftConfig
            };
        }

        // Check if we should add production capacity based on demand
        this.checkAutoScaling();

        // === MULTI-PRODUCT PRODUCTION ===
        // Produce on each active line (each may produce a different product)
        const productionResults = [];
        let totalGoodUnits = 0;
        let totalDefects = 0;

        for (const line of this.productionLines) {
            // Skip lines that are switching or idle
            if (line.status !== 'ACTIVE') {
                productionResults.push({
                    lineId: line.id,
                    productName: line.productName,
                    produced: false,
                    reason: line.status === 'SWITCHING' ? 'LINE_SWITCHING' : 'LINE_IDLE'
                });
                continue;
            }

            // Get the product for this line
            const lineProduct = line.productReference || this.product;

            // Check raw materials for this line's product
            if (!this.checkRawMaterialsForProduct(lineProduct)) {
                productionResults.push({
                    lineId: line.id,
                    productName: line.productName,
                    produced: false,
                    reason: 'INSUFFICIENT_RAW_MATERIALS',
                    needed: this.getRawMaterialNeedsForProduct(lineProduct)
                });
                continue;
            }

            // Check contract-based production throttling
            let throttleMultiplier = 1.0;
            if (this.contractManager) {
                const productName = lineProduct.name;
                const currentInventory = this.getAvailableQuantityForProduct(lineProduct);
                const perishable = isPerishable(productName);
                const shelfLife = perishable ? getShelfLife(productName) : 30;

                const throttleCheck = this.contractManager.shouldThrottleProduction(
                    this, productName, currentInventory, perishable, shelfLife
                );

                if (throttleCheck.shouldThrottle) {
                    throttleMultiplier = 1 - (throttleCheck.throttlePercent / 100);
                    if (throttleMultiplier <= 0.05) {
                        productionResults.push({
                            lineId: line.id,
                            productName: line.productName,
                            produced: false,
                            reason: 'THROTTLED_' + throttleCheck.reason,
                            message: throttleCheck.message
                        });
                        continue;
                    }
                }
            }

            // Account for downtime (per line)
            const randomFn = this.engine?.random || Math.random;
            if (randomFn() < this.downtimePercentage) {
                productionResults.push({
                    lineId: line.id,
                    productName: line.productName,
                    produced: false,
                    reason: 'DOWNTIME'
                });
                continue;
            }

            // Calculate production for this line
            const techBonus = (this.technologyLevel - (lineProduct.technologyRequired || 1)) * 0.1;
            const efficiencyFactor = this.productionEfficiency;
            const workerSkillBonus = this.laborStructure.productionWorkers.count / 100;

            const lineOutput = line.outputPerHour *
                              (1 + techBonus) *
                              efficiencyFactor *
                              (1 + workerSkillBonus) *
                              throttleMultiplier;

            // Consume raw materials for this line's product
            this.consumeRawMaterialsForProduct(lineProduct, lineOutput / line.outputPerHour);

            // Calculate quality
            const productQuality = this.calculateQualityForProduct(lineProduct);

            // Apply defect rate
            const goodUnits = lineOutput * (1 - this.defectRate);
            const defects = lineOutput - goodUnits;

            totalGoodUnits += goodUnits;
            totalDefects += defects;

            // Add to inventory (lot-based or standard)
            const inventoryResult = this.addToInventoryForProduct(lineProduct, goodUnits, productQuality);

            productionResults.push({
                lineId: line.id,
                productId: line.productId,
                productName: line.productName,
                produced: true,
                quantity: goodUnits,
                defects: defects,
                quality: productQuality,
                lotsCreated: inventoryResult.lotsCreated || 0
            });
        }

        // Track actual production rate (total good units from all lines)
        this.actualProductionRate = totalGoodUnits;

        // Update legacy inventory for backward compatibility (primary product)
        this.finishedGoodsInventory.quantity = this.getAvailableQuantity();

        // Return aggregated results
        const anyProduced = productionResults.some(r => r.produced);
        return {
            produced: anyProduced,
            product: this.productType, // Primary product for backward compat
            totalQuantity: totalGoodUnits,
            totalDefects: totalDefects,
            lineResults: productionResults,
            costPerUnit: this.calculateProductionCost(),
            // Legacy fields for backward compatibility
            quantity: totalGoodUnits,
            defects: totalDefects,
            quality: this.finishedGoodsInventory.quality
        };
    }

    // === MULTI-PRODUCT SUPPORT HELPERS ===

    /**
     * Check raw materials for a specific product
     * @param {Object} product - Product definition
     * @returns {boolean} True if sufficient materials available
     */
    checkRawMaterialsForProduct(product) {
        if (!product?.inputs) return true; // No inputs required

        for (const input of product.inputs) {
            const inventory = this.rawMaterialInventory.get(input.material);
            if (!inventory || inventory.quantity < input.quantity) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get raw material needs for a specific product
     * @param {Object} product - Product definition
     * @returns {Array} Material needs
     */
    getRawMaterialNeedsForProduct(product) {
        const needs = [];
        if (!product?.inputs) return needs;

        for (const input of product.inputs) {
            const inventory = this.rawMaterialInventory.get(input.material);
            const minRequired = input.quantity * 100; // 100 hours of production
            if (!inventory || inventory.quantity < minRequired) {
                needs.push({
                    material: input.material,
                    current: inventory?.quantity || 0,
                    needed: minRequired - (inventory?.quantity || 0)
                });
            }
        }
        return needs;
    }

    /**
     * Consume raw materials for a specific product
     * @param {Object} product - Product definition
     * @param {number} multiplier - Production multiplier
     * @returns {number} Average quality of consumed materials
     */
    consumeRawMaterialsForProduct(product, multiplier = 1) {
        if (!product?.inputs) return 50;

        let totalQualityWeighted = 0;
        let totalQuantityConsumed = 0;

        for (const input of product.inputs) {
            const inventory = this.rawMaterialInventory.get(input.material);
            const lotStorage = this.rawMaterialLots.get(input.material);
            const amountNeeded = input.quantity * multiplier;

            if (lotStorage && lotStorage.lots.length > 0) {
                const consumed = this.consumeFromLots(input.material, amountNeeded);
                totalQualityWeighted += consumed.avgQuality * consumed.quantity;
                totalQuantityConsumed += consumed.quantity;

                if (inventory) {
                    inventory.quantity = this.calculateLotQuantity(input.material);
                    inventory.avgQuality = consumed.avgQuality;
                }
            } else if (inventory) {
                inventory.quantity -= amountNeeded;
                totalQualityWeighted += (inventory.avgQuality || 50) * amountNeeded;
                totalQuantityConsumed += amountNeeded;
            }
        }

        return totalQuantityConsumed > 0
            ? totalQualityWeighted / totalQuantityConsumed
            : 50;
    }

    /**
     * Calculate quality for a specific product based on inputs
     * @param {Object} product - Product definition
     * @returns {number} Quality rating
     */
    calculateQualityForProduct(product) {
        const techFactor = (this.technologyLevel / 10) * 100;
        const qcFactor = this.qualityControl;
        const rawMaterialQuality = this.getAverageInputQualityForProduct(product);
        const workerSkillFactor = Math.min(100, this.laborStructure.technicians.count * 5);

        const quality = (
            techFactor * 0.3 +
            qcFactor * 0.3 +
            rawMaterialQuality * 0.2 +
            workerSkillFactor * 0.2
        );

        return Math.min(100, quality);
    }

    /**
     * Get average input quality for a specific product
     * @param {Object} product - Product definition
     * @returns {number} Average quality
     */
    getAverageInputQualityForProduct(product) {
        if (!product?.inputs) return 50;

        let totalQuality = 0;
        let totalQuantity = 0;

        for (const input of product.inputs) {
            const lotStorage = this.rawMaterialLots.get(input.material);
            const inventory = this.rawMaterialInventory.get(input.material);

            if (lotStorage && lotStorage.lots.length > 0) {
                for (const lot of lotStorage.lots) {
                    const qty = lot.remainingQuantity ?? lot.quantity;
                    totalQuality += (lot.quality || 50) * qty;
                    totalQuantity += qty;
                }
            } else if (inventory && inventory.quantity > 0) {
                totalQuality += (inventory.avgQuality || 50) * inventory.quantity;
                totalQuantity += inventory.quantity;
            }
        }

        return totalQuantity > 0 ? totalQuality / totalQuantity : 50;
    }

    /**
     * Get available quantity for a specific product
     * @param {Object} product - Product definition
     * @returns {number} Available quantity
     */
    getAvailableQuantityForProduct(product) {
        // For now, use the main inventory (future: per-product inventory)
        if (this.lotInventory) {
            const productName = product?.name || this.productType;
            return this.lotInventory.getAvailableQuantity(productName) + this.accumulatedProduction;
        }
        return this.finishedGoodsInventory.quantity;
    }

    /**
     * Add produced goods to inventory for a specific product
     * @param {Object} product - Product definition
     * @param {number} quantity - Quantity produced
     * @param {number} quality - Quality rating
     * @returns {{ lotsCreated: number }}
     */
    addToInventoryForProduct(product, quantity, quality) {
        const productName = product?.name || this.productType;

        // Use lot-based inventory if available
        if (this.lotInventory) {
            this.accumulatedProduction += quantity;
            const lotsCreated = [];

            while (this.accumulatedProduction >= this.lotSize) {
                const lot = this.createLotForProduct(product, quality);
                if (lot) {
                    lotsCreated.push(lot);
                    this.accumulatedProduction -= this.lotSize;
                } else {
                    break;
                }
            }

            this.finishedGoodsInventory.quality = quality;
            return { lotsCreated: lotsCreated.length };
        }

        // Standard inventory
        if (this.finishedGoodsInventory.quantity + quantity <= this.finishedGoodsInventory.storageCapacity) {
            this.finishedGoodsInventory.quantity += quantity;
            this.finishedGoodsInventory.quality = quality;
        } else {
            this.finishedGoodsInventory.quantity = this.finishedGoodsInventory.storageCapacity;
        }

        return { lotsCreated: 0 };
    }

    /**
     * Create a lot for a specific product
     * @param {Object} product - Product definition
     * @param {number} quality - Quality rating
     * @returns {Lot|null}
     */
    createLotForProduct(product, quality) {
        if (!this.lotInventory) return null;

        if (this.lotInventory.lots.size >= this.lotInventory.storageCapacity) {
            return null;
        }

        const productName = product?.name || this.productType;
        const gameTime = this.getGameTime?.() || { hour: 0, day: 1, month: 1, year: 2025 };
        const currentHour = gameTime.hour + (gameTime.day - 1) * 24 + (gameTime.month - 1) * 30 * 24;
        const currentDay = gameTime.day + (gameTime.month - 1) * 30 + (gameTime.year - 2025) * 365;

        let expiresDay = null;
        if (isPerishable(productName)) {
            const shelfLife = getShelfLife(productName);
            expiresDay = currentDay + shelfLife;
        }

        const lotConfig = {
            productName: productName,
            productId: product?.id || null,
            producerId: this.id,
            quantity: this.lotSize,
            unit: this.lotConfig?.unit || 'unit',
            quality: quality,
            createdAt: currentHour,
            createdDay: currentDay,
            expiresDay: expiresDay
        };

        let lot;
        if (this.lotRegistry) {
            lot = this.lotRegistry.createLot(lotConfig);
        } else {
            const tempId = `LOT_${productName.replace(/\s+/g, '')}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            lot = new Lot({ ...lotConfig, id: tempId });
        }

        this.lotInventory.addLot(lot);
        return lot;
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
            // === SHIFT SYSTEM INFO ===
            shifts: {
                shiftCount: this.shiftConfig.shiftCount,
                hoursPerShift: this.shiftConfig.hoursPerShift,
                effectiveHoursPerDay: this.effectiveHoursPerDay,
                schedule: this.shiftConfig.shiftSchedule.map(s => `${s.start}:00-${s.end}:00`).join(', ')
            },
            // === MULTI-PRODUCT INFO ===
            multiProduct: {
                productsCount: this.products.size,
                products: [...this.products.values()].map(p => ({
                    id: p.id,
                    name: p.name,
                    linesAssigned: this.getLinesForProduct(p.id || p.name).length,
                    capacity: this.getProductCapacity(p.id || p.name).toFixed(2)
                })),
                inputCategories: [...this.productFamily.inputCategories]
            },
            // === LINE ASSIGNMENTS ===
            lineAssignments: this.getLineAssignments(),
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

        // Serialize products map (store product IDs/names only - registry has full data)
        const productsData = [];
        for (const [productId, product] of this.products) {
            productsData.push({
                id: productId,
                name: product.name
            });
        }

        return {
            ...baseState,
            productType: this.productType,
            productionEfficiency: this.productionEfficiency,
            defectRate: this.defectRate,
            qualityControl: this.qualityControl,
            downtimePercentage: this.downtimePercentage,
            accumulatedProduction: this.accumulatedProduction,
            // === SHIFT SYSTEM ===
            shiftConfig: {
                shiftCount: this.shiftConfig.shiftCount,
                hoursPerShift: this.shiftConfig.hoursPerShift
            },
            effectiveHoursPerDay: this.effectiveHoursPerDay,
            // === MULTI-PRODUCT ===
            productsData: productsData,
            productFamily: {
                inputMaterials: [...this.productFamily.inputMaterials],
                inputCategories: [...this.productFamily.inputCategories]
            },
            // === PRODUCTION LINES (with product assignments) ===
            productionLines: this.productionLines.map(line => ({
                id: line.id,
                productId: line.productId,
                productName: line.productName,
                outputPerHour: line.outputPerHour,
                baseProductionRate: line.baseProductionRate,
                status: line.status,
                switchingUntilHour: line.switchingUntilHour
            })),
            // Legacy field for backward compatibility
            productionLine: {
                outputPerHour: this.productionLine.outputPerHour,
                inputsPerHour: this.productionLine.inputsPerHour
            },
            lineSwitchingCost: this.lineSwitchingCost,
            lineSwitchingHours: this.lineSwitchingHours,
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

        // === RESTORE SHIFT SYSTEM ===
        if (state.shiftConfig) {
            this.shiftConfig.shiftCount = state.shiftConfig.shiftCount ?? this.shiftConfig.shiftCount;
            this.shiftConfig.hoursPerShift = state.shiftConfig.hoursPerShift ?? 8;
            this.shiftConfig.shiftSchedule = this.calculateShiftSchedule(this.shiftConfig.shiftCount);
        }
        this.effectiveHoursPerDay = state.effectiveHoursPerDay ?? (this.shiftConfig.shiftCount * 8);

        // === RESTORE LINE SWITCHING COSTS ===
        this.lineSwitchingCost = state.lineSwitchingCost ?? this.lineSwitchingCost;
        this.lineSwitchingHours = state.lineSwitchingHours ?? this.lineSwitchingHours;

        // === RESTORE PRODUCT FAMILY ===
        if (state.productFamily) {
            this.productFamily.inputMaterials = new Set(state.productFamily.inputMaterials || []);
            this.productFamily.inputCategories = new Set(state.productFamily.inputCategories || []);
        }

        // === RESTORE MULTI-PRODUCT STATE ===
        if (state.productsData && Array.isArray(state.productsData)) {
            // Restore products from registry
            for (const prodData of state.productsData) {
                const productId = prodData.id || prodData.name;
                if (!this.products.has(productId) && this.productRegistry) {
                    const product = this.productRegistry.getProduct(prodData.name);
                    if (product) {
                        this.products.set(productId, product);
                        // Also restore raw material storage for this product
                        this.initializeRawMaterialStorageForProduct(product);
                    }
                }
            }
        }

        // === RESTORE PRODUCTION LINES (with multi-product support) ===
        if (state.productionLines && Array.isArray(state.productionLines)) {
            // Check if new format (has id, productId) or legacy format
            const hasNewFormat = state.productionLines.length > 0 && state.productionLines[0].id;

            if (hasNewFormat) {
                // New format with product assignments
                this.productionLines = state.productionLines.map((lineData, index) => {
                    // Get product reference
                    let productRef = this.product;
                    if (lineData.productId && this.products.has(lineData.productId)) {
                        productRef = this.products.get(lineData.productId);
                    } else if (lineData.productName && this.productRegistry) {
                        productRef = this.productRegistry.getProduct(lineData.productName) || this.product;
                    }

                    return {
                        id: lineData.id || `LINE_${this.id}_${index + 1}`,
                        productId: lineData.productId || (productRef?.id || productRef?.name),
                        productName: lineData.productName || productRef?.name,
                        productReference: productRef,
                        inputs: productRef?.inputs || this.product.inputs,
                        baseProductionRate: lineData.baseProductionRate,
                        outputPerHour: lineData.outputPerHour,
                        productionTime: productRef?.productionTime || 1,
                        requiredTech: productRef?.technologyRequired || 1,
                        status: lineData.status || 'ACTIVE',
                        switchingUntilHour: lineData.switchingUntilHour || null
                    };
                });
            } else {
                // Legacy format - restore with primary product
                this.productionLines = state.productionLines.map((lineData, index) => ({
                    id: `LINE_${this.id}_${index + 1}`,
                    productId: this.product?.id || this.productType,
                    productName: this.product?.name || this.productType,
                    productReference: this.product,
                    inputs: this.product?.inputs || [],
                    baseProductionRate: lineData.baseProductionRate,
                    outputPerHour: lineData.outputPerHour,
                    productionTime: this.product?.productionTime || 1,
                    requiredTech: this.product?.technologyRequired || 1,
                    status: 'ACTIVE',
                    switchingUntilHour: null
                }));
            }
            this.productionLine = this.productionLines[0]; // Legacy compatibility
        } else if (state.productionLine) {
            // Very old legacy: single production line
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
