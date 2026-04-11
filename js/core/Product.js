// js/core/Product.js
export class Product {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.category = config.category;
        this.tier = config.tier; // RAW, SEMI_RAW, MANUFACTURED
        this.icon = config.icon;
        this.basePrice = config.basePrice;
        this.weight = config.weight;
        this.unit = config.unit || 'unit'; // Unit of sale (ton, barrel, dozen, etc.)
        this.necessityIndex = config.necessityIndex;

        // Minimum order quantities
        this.minB2BQuantity = config.minB2BQuantity || this.getDefaultMinB2B();
        this.minRetailQuantity = config.minRetailQuantity || this.getDefaultMinRetail();

        // Production requirements
        this.inputs = config.inputs || []; // [{material, quantity, tier}]
        this.productionTime = config.productionTime || 1; // hours
        this.technologyRequired = config.technologyRequired || 1;

        // Base production/extraction rate (units per hour before modifiers)
        this.baseProductionRate = config.baseProductionRate || this.getDefaultProductionRate();

        // Market data
        this.currentPrice = this.basePrice;
        this.demand = 50;
        this.supply = 50;
        this.quality = 50;
        this.brandRating = 0;

        // Production stats
        this.producers = new Set();
        this.totalProduced = 0;
        this.totalConsumed = 0;

        // Retail demand attributes (for competitive retail system)
        this.purchaseFrequency = config.purchaseFrequency || 1; // purchases per hour per 1000 pop
        this.publicDemand = config.publicDemand || 0.5; // base demand modifier (0-1)
        this.publicNecessity = config.publicNecessity || 0.5; // how essential (0-1, high = necessity)
        this.publicLuxury = config.publicLuxury || 0.5; // how luxurious (0-1, high = luxury)
        this.priceConcern = config.priceConcern || 0.5; // how much price affects purchase (0-1)
        this.qualityConcern = config.qualityConcern || 0.5; // how much quality affects purchase (0-1)
        this.reputationConcern = config.reputationConcern || 0.5; // how much brand matters (0-1)
        this.mainCategory = config.mainCategory || null; // 'Grocery', 'Clothing & Baby', etc.
        this.subcategory = config.subcategory || null; // 'Fresh Food', 'Apparel', etc.
    }

    getDefaultMinB2B() {
        // Default B2B minimums based on tier
        switch (this.tier) {
            case 'RAW': return 100;        // Raw materials sold in bulk (100 tons, barrels, etc.)
            case 'SEMI_RAW': return 50;    // Semi-processed in medium bulk
            case 'MANUFACTURED': return 10; // Manufactured goods in smaller bulk for B2B
            default: return 10;
        }
    }

    getDefaultMinRetail() {
        // Default retail minimums - mostly individual units
        switch (this.tier) {
            case 'RAW': return 1;           // Raw materials typically not sold retail
            case 'SEMI_RAW': return 1;      // Some semi-raw sold retail (fuel, lumber)
            case 'MANUFACTURED': return 1;  // Individual units for consumers
            default: return 1;
        }
    }

    getDefaultProductionRate() {
        // Default base production rates (units per hour) by tier
        // These are fallbacks - specific products should define their own rates
        switch (this.tier) {
            case 'RAW': return 50;          // High extraction rate for raw materials
            case 'SEMI_RAW': return 25;     // Medium processing rate
            case 'MANUFACTURED': return 10; // Lower rate for complex goods
            default: return 10;
        }
    }
    
    canBeProducedIn(country) {
        // Check if country can produce this product
        return country.productionCapabilities.has(this.category);
    }
    
    calculateProductionCost(inputPrices, laborCost, overheadCost) {
        let materialCost = 0;
        
        this.inputs.forEach(input => {
            const price = inputPrices.get(input.material) || 0;
            materialCost += price * input.quantity;
        });
        
        return materialCost + laborCost + overheadCost;
    }
}

export class ProductRegistry {
    constructor() {
        this.products = new Map();
        this.productsByName = new Map();
        this.productsByTier = new Map();
        this.productsByCategory = new Map();

        this.initializeProducts();
    }
    
    initializeProducts() {
        // RAW MATERIALS
        this.registerRawMaterials();
        this.registerSemiRawMaterials();
        this.registerManufacturedGoods();
    }
    
    registerRawMaterials() {
        const rawMaterials = [
            // Mining - Metals (B2B: bulk tons/oz, no retail)
            // baseProductionRate = tons/oz per hour extracted
            // weight = kg per traded unit (all weights in kg for consistent transport cost calculation)
            { id: 1, name: 'Iron Ore', category: 'METALS', icon: '⛏️', basePrice: 50, weight: 1000, unit: 'ton', necessityIndex: 0.3, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 60 },
            { id: 2, name: 'Copper Ore', category: 'METALS', icon: '🪨', basePrice: 80, weight: 1000, unit: 'ton', necessityIndex: 0.3, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 45 },
            { id: 3, name: 'Aluminum Ore', category: 'METALS', icon: '⚙️', basePrice: 70, weight: 1000, unit: 'ton', necessityIndex: 0.3, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 50 },
            { id: 4, name: 'Gold Ore', category: 'METALS', icon: '🥇', basePrice: 500, weight: 0.031, unit: 'oz', necessityIndex: 0.1, minB2BQuantity: 250, minRetailQuantity: 0, baseProductionRate: 15 },
            { id: 5, name: 'Silver Ore', category: 'METALS', icon: '🥈', basePrice: 300, weight: 0.031, unit: 'oz', necessityIndex: 0.1, minB2BQuantity: 300, minRetailQuantity: 0, baseProductionRate: 20 },

            // Mining - Minerals (B2B: bulk tons, no retail)
            { id: 6, name: 'Coal', category: 'MINERALS', icon: '⚫', basePrice: 40, weight: 1000, unit: 'ton', necessityIndex: 0.4, minB2BQuantity: 1000, minRetailQuantity: 0, baseProductionRate: 80 },
            { id: 7, name: 'Limestone', category: 'MINERALS', icon: '🪨', basePrice: 20, weight: 1000, unit: 'ton', necessityIndex: 0.3, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 100 },
            { id: 8, name: 'Salt', category: 'MINERALS', icon: '🧂', basePrice: 15, weight: 1000, unit: 'ton', necessityIndex: 0.5, minB2BQuantity: 100, minRetailQuantity: 0, baseProductionRate: 70 },

            // Energy (B2B: bulk barrels/mcf, no retail)
            { id: 9, name: 'Crude Oil', category: 'ENERGY', icon: '🛢️', basePrice: 100, weight: 136, unit: 'barrel', necessityIndex: 0.7, minB2BQuantity: 1000, minRetailQuantity: 0, baseProductionRate: 120 },
            { id: 10, name: 'Natural Gas', category: 'ENERGY', icon: '💨', basePrice: 60, weight: 19, unit: 'mcf', necessityIndex: 0.6, minB2BQuantity: 2500, minRetailQuantity: 0, baseProductionRate: 200 },

            // Logging (B2B: bulk cords, no retail)
            { id: 11, name: 'Softwood Logs', category: 'TIMBER', icon: '🪵', basePrice: 35, weight: 600, unit: 'cord', necessityIndex: 0.4, minB2BQuantity: 50, minRetailQuantity: 0, baseProductionRate: 30 },
            { id: 12, name: 'Hardwood Logs', category: 'TIMBER', icon: '🌳', basePrice: 60, weight: 900, unit: 'cord', necessityIndex: 0.3, minB2BQuantity: 25, minRetailQuantity: 0, baseProductionRate: 20 },

            // Farming - Crops (B2B: bulk bushels/bales/tons, no retail)
            { id: 13, name: 'Wheat', category: 'GRAINS', icon: '🌾', basePrice: 10, weight: 27, unit: 'bushel', necessityIndex: 0.9, minB2BQuantity: 1000, minRetailQuantity: 0, baseProductionRate: 150 },
            { id: 14, name: 'Rice', category: 'GRAINS', icon: '🍚', basePrice: 12, weight: 20, unit: 'bushel', necessityIndex: 0.9, minB2BQuantity: 1000, minRetailQuantity: 0, baseProductionRate: 120 },
            { id: 15, name: 'Corn', category: 'GRAINS', icon: '🌽', basePrice: 8, weight: 25, unit: 'bushel', necessityIndex: 0.8, minB2BQuantity: 1000, minRetailQuantity: 0, baseProductionRate: 180 },
            { id: 16, name: 'Cotton', category: 'INDUSTRIAL_CROPS', icon: '🧵', basePrice: 25, weight: 218, unit: 'bale', necessityIndex: 0.4, minB2BQuantity: 100, minRetailQuantity: 0, baseProductionRate: 40 },
            { id: 17, name: 'Sugarcane', category: 'INDUSTRIAL_CROPS', icon: '🎋', basePrice: 15, weight: 1000, unit: 'ton', necessityIndex: 0.5, minB2BQuantity: 100, minRetailQuantity: 0, baseProductionRate: 80 },
            { id: 18, name: 'Coffee Beans', category: 'INDUSTRIAL_CROPS', icon: '☕', basePrice: 40, weight: 60, unit: 'bag', necessityIndex: 0.6, minB2BQuantity: 50, minRetailQuantity: 0, baseProductionRate: 25 },

            // Farming - Livestock (B2B: bulk head/dozen, no retail)
            { id: 19, name: 'Cattle', category: 'LIVESTOCK', icon: '🐄', basePrice: 1200, weight: 500, unit: 'head', necessityIndex: 0.7, minB2BQuantity: 20, minRetailQuantity: 0, baseProductionRate: 2 },
            { id: 20, name: 'Pigs', category: 'LIVESTOCK', icon: '🐷', basePrice: 400, weight: 100, unit: 'head', necessityIndex: 0.6, minB2BQuantity: 50, minRetailQuantity: 0, baseProductionRate: 5 },
            { id: 21, name: 'Chickens', category: 'LIVESTOCK', icon: '🐔', basePrice: 15, weight: 2, unit: 'dozen', necessityIndex: 0.7, minB2BQuantity: 100, minRetailQuantity: 0, baseProductionRate: 20 },
            { id: 22, name: 'Raw Milk', category: 'ANIMAL_PRODUCTS', icon: '🥛', basePrice: 5, weight: 3.9, unit: 'gallon', necessityIndex: 0.8, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 100 },
            { id: 23, name: 'Eggs', category: 'ANIMAL_PRODUCTS', icon: '🥚', basePrice: 3, weight: 0.6, unit: 'dozen', necessityIndex: 0.8, minB2BQuantity: 100, minRetailQuantity: 0, baseProductionRate: 50 },

            // Fishing (B2B: bulk tons, no retail)
            { id: 24, name: 'Fish', category: 'SEAFOOD', icon: '🐟', basePrice: 200, weight: 1000, unit: 'ton', necessityIndex: 0.6, minB2BQuantity: 50, minRetailQuantity: 0, baseProductionRate: 25 },

            // Additional Industrial Crops
            { id: 25, name: 'Rubber Latex', category: 'INDUSTRIAL_CROPS', icon: '🌴', basePrice: 80, weight: 1000, unit: 'ton', necessityIndex: 0.4, minB2BQuantity: 100, minRetailQuantity: 0, baseProductionRate: 30 },
            { id: 26, name: 'Soybeans', category: 'GRAINS', icon: '🫘', basePrice: 12, weight: 27, unit: 'bushel', necessityIndex: 0.7, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 140 },

            // Fresh Produce (B2B: bulk crates, no retail - processed before sale)
            { id: 27, name: 'Fresh Fruits', category: 'PRODUCE', icon: '🍎', basePrice: 30, weight: 20, unit: 'crate', necessityIndex: 0.7, minB2BQuantity: 200, minRetailQuantity: 0, baseProductionRate: 60 },
            { id: 28, name: 'Vegetables', category: 'PRODUCE', icon: '🥕', basePrice: 25, weight: 20, unit: 'crate', necessityIndex: 0.75, minB2BQuantity: 200, minRetailQuantity: 0, baseProductionRate: 70 },

            // Additional minerals for glass/chemicals
            { id: 29, name: 'Silica Sand', category: 'MINERALS', icon: '🏖️', basePrice: 15, weight: 1000, unit: 'ton', necessityIndex: 0.3, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 90 },

            // Hides from livestock (byproduct)
            { id: 30, name: 'Raw Hides', category: 'ANIMAL_PRODUCTS', icon: '🐂', basePrice: 150, weight: 10, unit: 'hide', necessityIndex: 0.3, minB2BQuantity: 50, minRetailQuantity: 0, baseProductionRate: 10 }
        ];
        
        rawMaterials.forEach(product => {
            product.tier = 'RAW';
            product.inputs = [];
            this.registerProduct(new Product(product));
        });
    }
    
    registerSemiRawMaterials() {
        // Target: 150% profit margin (totalCost = basePrice / 2.5)
        // totalCost = materialCost * 1.15 (materials + 15% overhead, no labor)
        // materialCost = basePrice / 2.875
        const semiRaw = [
            // Refined Metals (B2B: medium bulk, retail: hardware stores only)
            // baseProductionRate = units processed per hour
            {
                id: 101, name: 'Steel', category: 'REFINED_METALS', icon: '🔩',
                basePrice: 200, weight: 1000, unit: 'ton', necessityIndex: 0.5,
                minB2BQuantity: 250, minRetailQuantity: 1, baseProductionRate: 30,
                inputs: [
                    { material: 'Iron Ore', quantity: 1.2 },
                    { material: 'Coal', quantity: 0.24 }
                ],
                technologyRequired: 2
            },
            {
                id: 102, name: 'Copper Wire', category: 'REFINED_METALS', icon: '📡',
                basePrice: 180, weight: 50, unit: 'spool', necessityIndex: 0.4,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 35,
                inputs: [{ material: 'Copper Ore', quantity: 0.78 }],
                technologyRequired: 2
            },
            {
                id: 103, name: 'Aluminum Sheets', category: 'REFINED_METALS', icon: '📄',
                basePrice: 160, weight: 20, unit: 'sheet', necessityIndex: 0.4,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 40,
                inputs: [{ material: 'Aluminum Ore', quantity: 0.79 }],
                technologyRequired: 2
            },

            // Fuels (B2B: bulk barrels, retail: gallons at gas stations)
            {
                id: 104, name: 'Gasoline', category: 'FUELS', icon: '⛽',
                basePrice: 150, weight: 120, unit: 'barrel', necessityIndex: 0.8,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 80,
                inputs: [{ material: 'Crude Oil', quantity: 0.52 }],
                technologyRequired: 3
            },
            {
                id: 105, name: 'Diesel', category: 'FUELS', icon: '🚛',
                basePrice: 140, weight: 130, unit: 'barrel', necessityIndex: 0.7,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 70,
                inputs: [{ material: 'Crude Oil', quantity: 0.49 }],
                technologyRequired: 3
            },

            // Lumber (B2B: bulk sheets/tons, retail: hardware stores)
            {
                id: 106, name: 'Plywood', category: 'LUMBER', icon: '🪚',
                basePrice: 80, weight: 20, unit: 'sheet', necessityIndex: 0.4,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 25,
                inputs: [{ material: 'Softwood Logs', quantity: 0.79 }],
                technologyRequired: 1
            },
            {
                id: 107, name: 'Wood Pulp', category: 'LUMBER', icon: '📃',
                basePrice: 60, weight: 1000, unit: 'ton', necessityIndex: 0.3,
                minB2BQuantity: 250, minRetailQuantity: 0, baseProductionRate: 20,
                inputs: [{ material: 'Softwood Logs', quantity: 0.60 }],
                technologyRequired: 2
            },

            // Food Ingredients (B2B: bulk bags, retail: supermarkets)
            {
                id: 108, name: 'Flour', category: 'FOOD_INGREDIENTS', icon: '🍞',
                basePrice: 25, weight: 25, unit: 'bag', necessityIndex: 0.9,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 60,
                inputs: [{ material: 'Wheat', quantity: 0.87 }],
                technologyRequired: 1
            },
            {
                id: 109, name: 'Sugar', category: 'FOOD_INGREDIENTS', icon: '🍬',
                basePrice: 30, weight: 25, unit: 'bag', necessityIndex: 0.7,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 50,
                inputs: [{ material: 'Sugarcane', quantity: 0.70 }],
                technologyRequired: 1
            },

            // Textiles (B2B: bulk bolts, retail: fabric stores)
            {
                id: 110, name: 'Cotton Fabric', category: 'TEXTILES', icon: '🧶',
                basePrice: 20, weight: 20, unit: 'bolt', necessityIndex: 0.6,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 30,
                inputs: [{ material: 'Cotton', quantity: 0.65 }],
                technologyRequired: 2
            },

            // Dairy & Meat (B2B: bulk, retail: supermarkets - individual units)
            {
                id: 111, name: 'Pasteurized Milk', category: 'DAIRY', icon: '🥛',
                basePrice: 8, weight: 3.9, unit: 'gallon', necessityIndex: 0.85,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 80,
                inputs: [{ material: 'Raw Milk', quantity: 0.56 }],
                technologyRequired: 1
            },
            {
                id: 112, name: 'Beef', category: 'MEAT', icon: '🥩',
                basePrice: 800, weight: 45, unit: 'cwt', necessityIndex: 0.75,
                minB2BQuantity: 250, minRetailQuantity: 1, baseProductionRate: 8,
                inputs: [{ material: 'Cattle', quantity: 0.23 }],
                technologyRequired: 1
            },
            {
                id: 113, name: 'Pork', category: 'MEAT', icon: '🍖',
                basePrice: 300, weight: 45, unit: 'cwt', necessityIndex: 0.7,
                minB2BQuantity: 250, minRetailQuantity: 1, baseProductionRate: 15,
                inputs: [{ material: 'Pigs', quantity: 0.26 }],
                technologyRequired: 1
            },
            {
                id: 114, name: 'Chicken', category: 'MEAT', icon: '🍗',
                basePrice: 12, weight: 0.45, unit: 'lb', necessityIndex: 0.8,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 50,
                inputs: [{ material: 'Chickens', quantity: 0.28 }],
                technologyRequired: 1
            },

            // Plastics & Polymers (from Crude Oil)
            {
                id: 115, name: 'Plastic Pellets', category: 'POLYMERS', icon: '🔘',
                basePrice: 120, weight: 1000, unit: 'ton', necessityIndex: 0.5,
                minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 40,
                inputs: [{ material: 'Crude Oil', quantity: 0.42 }],
                technologyRequired: 3
            },

            // Rubber (from Rubber Latex or Crude Oil for synthetic)
            {
                id: 116, name: 'Rubber', category: 'POLYMERS', icon: '⚫',
                basePrice: 150, weight: 1000, unit: 'ton', necessityIndex: 0.5,
                minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 30,
                inputs: [{ material: 'Rubber Latex', quantity: 0.65 }],
                technologyRequired: 2
            },

            // Glass (from Silica Sand and Limestone)
            {
                id: 117, name: 'Glass', category: 'MATERIALS', icon: '🪟',
                basePrice: 80, weight: 1000, unit: 'ton', necessityIndex: 0.4,
                minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 35,
                inputs: [
                    { material: 'Silica Sand', quantity: 0.70 },
                    { material: 'Limestone', quantity: 0.15 }
                ],
                technologyRequired: 2
            },

            // Leather (from Raw Hides)
            {
                id: 118, name: 'Leather', category: 'TEXTILES', icon: '🧥',
                basePrice: 250, weight: 5, unit: 'hide', necessityIndex: 0.4,
                minB2BQuantity: 250, minRetailQuantity: 0, baseProductionRate: 20,
                inputs: [
                    { material: 'Raw Hides', quantity: 0.58 },
                    { material: 'Salt', quantity: 0.05 }
                ],
                technologyRequired: 2
            },

            // Chemicals (base chemicals from Crude Oil and Salt)
            {
                id: 119, name: 'Industrial Chemicals', category: 'CHEMICALS', icon: '🧪',
                basePrice: 100, weight: 1000, unit: 'ton', necessityIndex: 0.4,
                minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 45,
                inputs: [
                    { material: 'Crude Oil', quantity: 0.30 },
                    { material: 'Salt', quantity: 0.15 }
                ],
                technologyRequired: 3
            },

            // Paper (from Wood Pulp)
            {
                id: 120, name: 'Paper', category: 'PAPER', icon: '📄',
                basePrice: 50, weight: 2.5, unit: 'ream', necessityIndex: 0.5,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 60,
                inputs: [{ material: 'Wood Pulp', quantity: 0.35 }],
                technologyRequired: 2
            },

            // Processed Fish (from Fish)
            {
                id: 121, name: 'Processed Fish', category: 'SEAFOOD', icon: '🐠',
                basePrice: 350, weight: 1000, unit: 'ton', necessityIndex: 0.5,
                minB2BQuantity: 250, minRetailQuantity: 1, baseProductionRate: 20,
                inputs: [
                    { material: 'Fish', quantity: 0.60 },
                    { material: 'Salt', quantity: 0.05 }
                ],
                technologyRequired: 1
            },

            // Vegetable Oil (from Soybeans or Corn)
            {
                id: 122, name: 'Vegetable Oil', category: 'FOOD_INGREDIENTS', icon: '🫒',
                basePrice: 40, weight: 3.7, unit: 'gallon', necessityIndex: 0.7,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 50,
                inputs: [{ material: 'Soybeans', quantity: 0.75 }],
                technologyRequired: 1
            },

            // Fruit Concentrate (from Fresh Fruits)
            {
                id: 123, name: 'Fruit Concentrate', category: 'FOOD_INGREDIENTS', icon: '🍊',
                basePrice: 45, weight: 4.0, unit: 'gallon', necessityIndex: 0.6,
                minB2BQuantity: 1000, minRetailQuantity: 0, baseProductionRate: 40,
                inputs: [{ material: 'Fresh Fruits', quantity: 0.80 }],
                technologyRequired: 1
            },

            // Cardboard (from Wood Pulp - for packaging)
            {
                id: 124, name: 'Cardboard', category: 'PAPER', icon: '📦',
                basePrice: 35, weight: 0.5, unit: 'sheet', necessityIndex: 0.4,
                minB2BQuantity: 2000, minRetailQuantity: 0, baseProductionRate: 70,
                inputs: [{ material: 'Wood Pulp', quantity: 0.25 }],
                technologyRequired: 1
            }
        ];
        
        semiRaw.forEach(product => {
            product.tier = 'SEMI_RAW';
            this.registerProduct(new Product(product));
        });
    }
    
    registerManufacturedGoods() {
        // Target: 150% profit margin (totalCost = basePrice / 2.5)
        // totalCost = materialCost * 1.15 (materials + 15% overhead, no labor)
        // SEMI_RAW costs used: Steel~$80, Copper Wire~$72, Aluminum~$64,
        // Plywood~$32, Cotton Fabric~$18, Flour~$10, Sugar~$12
        const manufactured = [
            // ========== GROCERY PRODUCTS (12) ==========
            {
                id: 209, name: 'Bread', category: 'PACKAGED_FOOD', icon: '🍞',
                basePrice: 3, weight: 0.5, unit: 'loaf', necessityIndex: 0.95,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 100,
                inputs: [
                    { material: 'Flour', quantity: 0.08 },
                    { material: 'Sugar', quantity: 0.02 }
                ],
                technologyRequired: 1,
                // Retail demand attributes
                purchaseFrequency: 15, publicDemand: 0.9, publicNecessity: 0.95,
                publicLuxury: 0.05, priceConcern: 0.7, qualityConcern: 0.4, reputationConcern: 0.2,
                mainCategory: 'Grocery', subcategory: 'Bakery'
            },
            {
                id: 212, name: 'Meat', category: 'PACKAGED_FOOD', icon: '🥩',
                basePrice: 12, weight: 1.0, unit: 'lb', necessityIndex: 0.85,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 60,
                inputs: [{ material: 'Beef', quantity: 0.8 }],
                technologyRequired: 1,
                purchaseFrequency: 8, publicDemand: 0.85, publicNecessity: 0.8,
                publicLuxury: 0.15, priceConcern: 0.6, qualityConcern: 0.6, reputationConcern: 0.3,
                mainCategory: 'Grocery', subcategory: 'Fresh Food'
            },
            {
                id: 213, name: 'Seafood', category: 'PACKAGED_FOOD', icon: '🐟',
                basePrice: 18, weight: 1.0, unit: 'lb', necessityIndex: 0.6,
                minB2BQuantity: 300, minRetailQuantity: 1, baseProductionRate: 40,
                inputs: [
                    { material: 'Processed Fish', quantity: 0.5 },
                    { material: 'Salt', quantity: 0.02 }
                ],
                technologyRequired: 1,
                purchaseFrequency: 3, publicDemand: 0.5, publicNecessity: 0.4,
                publicLuxury: 0.5, priceConcern: 0.5, qualityConcern: 0.7, reputationConcern: 0.4,
                mainCategory: 'Grocery', subcategory: 'Fresh Food'
            },
            {
                id: 214, name: 'Fruits', category: 'PACKAGED_FOOD', icon: '🍎',
                basePrice: 5, weight: 1.0, unit: 'lb', necessityIndex: 0.8,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 80,
                inputs: [
                    { material: 'Fruit Concentrate', quantity: 0.3 },
                    { material: 'Sugar', quantity: 0.02 }
                ],
                technologyRequired: 1,
                purchaseFrequency: 10, publicDemand: 0.75, publicNecessity: 0.7,
                publicLuxury: 0.1, priceConcern: 0.6, qualityConcern: 0.5, reputationConcern: 0.2,
                mainCategory: 'Grocery', subcategory: 'Produce'
            },
            {
                id: 215, name: 'Breakfast Cereal', category: 'PACKAGED_FOOD', icon: '🥣',
                basePrice: 6, weight: 0.5, unit: 'box', necessityIndex: 0.7,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 70,
                inputs: [
                    { material: 'Corn', quantity: 0.15 },
                    { material: 'Sugar', quantity: 0.1 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 5, publicDemand: 0.65, publicNecessity: 0.6,
                publicLuxury: 0.15, priceConcern: 0.5, qualityConcern: 0.4, reputationConcern: 0.5,
                mainCategory: 'Grocery', subcategory: 'Packaged Food'
            },
            {
                id: 216, name: 'Cake', category: 'PACKAGED_FOOD', icon: '🎂',
                basePrice: 25, weight: 2.0, unit: 'unit', necessityIndex: 0.3,
                minB2BQuantity: 200, minRetailQuantity: 1, baseProductionRate: 30,
                inputs: [
                    { material: 'Flour', quantity: 0.2 },
                    { material: 'Sugar', quantity: 0.15 },
                    { material: 'Eggs', quantity: 0.1 }
                ],
                technologyRequired: 1,
                purchaseFrequency: 1, publicDemand: 0.4, publicNecessity: 0.1,
                publicLuxury: 0.6, priceConcern: 0.4, qualityConcern: 0.6, reputationConcern: 0.5,
                mainCategory: 'Grocery', subcategory: 'Bakery'
            },
            {
                id: 217, name: 'Candy', category: 'PACKAGED_FOOD', icon: '🍬',
                basePrice: 4, weight: 0.25, unit: 'bag', necessityIndex: 0.2,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 100,
                inputs: [{ material: 'Sugar', quantity: 0.3 }],
                technologyRequired: 1,
                purchaseFrequency: 4, publicDemand: 0.5, publicNecessity: 0.1,
                publicLuxury: 0.4, priceConcern: 0.4, qualityConcern: 0.3, reputationConcern: 0.6,
                mainCategory: 'Grocery', subcategory: 'Snacks'
            },
            {
                id: 218, name: 'Ice Cream', category: 'PACKAGED_FOOD', icon: '🍦',
                basePrice: 7, weight: 1.0, unit: 'pint', necessityIndex: 0.25,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 60,
                inputs: [
                    { material: 'Pasteurized Milk', quantity: 0.3 },
                    { material: 'Sugar', quantity: 0.15 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 3, publicDemand: 0.5, publicNecessity: 0.1,
                publicLuxury: 0.5, priceConcern: 0.4, qualityConcern: 0.5, reputationConcern: 0.5,
                mainCategory: 'Grocery', subcategory: 'Frozen'
            },
            {
                id: 219, name: 'Soda', category: 'BEVERAGES', icon: '🥤',
                basePrice: 2, weight: 0.5, unit: 'can', necessityIndex: 0.3,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 150,
                inputs: [
                    { material: 'Sugar', quantity: 0.08 },
                    { material: 'Plastic Pellets', quantity: 0.02 },
                    { material: 'Industrial Chemicals', quantity: 0.01 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 12, publicDemand: 0.6, publicNecessity: 0.2,
                publicLuxury: 0.3, priceConcern: 0.5, qualityConcern: 0.3, reputationConcern: 0.6,
                mainCategory: 'Grocery', subcategory: 'Beverages'
            },
            {
                id: 220, name: 'Alcohol', category: 'BEVERAGES', icon: '🍺',
                basePrice: 15, weight: 0.75, unit: 'bottle', necessityIndex: 0.2,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 50,
                inputs: [
                    { material: 'Corn', quantity: 0.15 },
                    { material: 'Sugar', quantity: 0.08 },
                    { material: 'Glass', quantity: 0.03 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 4, publicDemand: 0.55, publicNecessity: 0.1,
                publicLuxury: 0.6, priceConcern: 0.4, qualityConcern: 0.5, reputationConcern: 0.6,
                mainCategory: 'Grocery', subcategory: 'Beverages'
            },
            {
                id: 210, name: 'Canned Goods', category: 'PACKAGED_FOOD', icon: '🥫',
                basePrice: 5, weight: 0.4, unit: 'can', necessityIndex: 0.8,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 80,
                inputs: [
                    { material: 'Steel', quantity: 0.01 },
                    { material: 'Corn', quantity: 0.12 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 6, publicDemand: 0.7, publicNecessity: 0.75,
                publicLuxury: 0.1, priceConcern: 0.6, qualityConcern: 0.4, reputationConcern: 0.3,
                mainCategory: 'Grocery', subcategory: 'Packaged Food'
            },
            {
                id: 221, name: 'Cooking Oil', category: 'PACKAGED_FOOD', icon: '🫒',
                basePrice: 8, weight: 1.0, unit: 'bottle', necessityIndex: 0.85,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 70,
                inputs: [
                    { material: 'Vegetable Oil', quantity: 0.5 },
                    { material: 'Plastic Pellets', quantity: 0.02 }
                ],
                technologyRequired: 1,
                purchaseFrequency: 3, publicDemand: 0.7, publicNecessity: 0.8,
                publicLuxury: 0.05, priceConcern: 0.6, qualityConcern: 0.4, reputationConcern: 0.3,
                mainCategory: 'Grocery', subcategory: 'Cooking'
            },

            // ========== CLOTHING & BABY PRODUCTS (14) ==========
            {
                id: 207, name: 'Shirts', category: 'CLOTHING', icon: '👕',
                basePrice: 25, weight: 0.2, unit: 'unit', necessityIndex: 0.8,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 40,
                inputs: [{ material: 'Cotton Fabric', quantity: 0.1 }],
                technologyRequired: 2,
                purchaseFrequency: 2, publicDemand: 0.7, publicNecessity: 0.75,
                publicLuxury: 0.2, priceConcern: 0.5, qualityConcern: 0.5, reputationConcern: 0.5,
                mainCategory: 'Clothing & Baby', subcategory: 'Apparel'
            },
            {
                id: 222, name: 'Jackets', category: 'CLOTHING', icon: '🧥',
                basePrice: 80, weight: 0.8, unit: 'unit', necessityIndex: 0.6,
                minB2BQuantity: 300, minRetailQuantity: 1, baseProductionRate: 20,
                inputs: [
                    { material: 'Cotton Fabric', quantity: 0.25 },
                    { material: 'Steel', quantity: 0.05 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 0.5, publicDemand: 0.5, publicNecessity: 0.5,
                publicLuxury: 0.4, priceConcern: 0.4, qualityConcern: 0.6, reputationConcern: 0.6,
                mainCategory: 'Clothing & Baby', subcategory: 'Apparel'
            },
            {
                id: 208, name: 'Jeans', category: 'CLOTHING', icon: '👖',
                basePrice: 45, weight: 0.5, unit: 'pair', necessityIndex: 0.75,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 30,
                inputs: [{ material: 'Cotton Fabric', quantity: 0.15 }],
                technologyRequired: 2,
                purchaseFrequency: 1.5, publicDemand: 0.65, publicNecessity: 0.7,
                publicLuxury: 0.25, priceConcern: 0.5, qualityConcern: 0.5, reputationConcern: 0.5,
                mainCategory: 'Clothing & Baby', subcategory: 'Apparel'
            },
            {
                id: 223, name: 'Sweaters', category: 'CLOTHING', icon: '🧶',
                basePrice: 50, weight: 0.4, unit: 'unit', necessityIndex: 0.55,
                minB2BQuantity: 400, minRetailQuantity: 1, baseProductionRate: 25,
                inputs: [{ material: 'Cotton Fabric', quantity: 0.2 }],
                technologyRequired: 2,
                purchaseFrequency: 0.8, publicDemand: 0.5, publicNecessity: 0.5,
                publicLuxury: 0.35, priceConcern: 0.45, qualityConcern: 0.55, reputationConcern: 0.5,
                mainCategory: 'Clothing & Baby', subcategory: 'Apparel'
            },
            {
                id: 224, name: 'Shoes', category: 'CLOTHING', icon: '👟',
                basePrice: 70, weight: 0.8, unit: 'pair', necessityIndex: 0.8,
                minB2BQuantity: 300, minRetailQuantity: 1, baseProductionRate: 25,
                inputs: [
                    { material: 'Leather', quantity: 0.15 },
                    { material: 'Rubber', quantity: 0.08 },
                    { material: 'Cotton Fabric', quantity: 0.05 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 1, publicDemand: 0.7, publicNecessity: 0.75,
                publicLuxury: 0.3, priceConcern: 0.45, qualityConcern: 0.6, reputationConcern: 0.6,
                mainCategory: 'Clothing & Baby', subcategory: 'Footwear'
            },
            {
                id: 225, name: 'Socks', category: 'CLOTHING', icon: '🧦',
                basePrice: 8, weight: 0.1, unit: 'pair', necessityIndex: 0.85,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 80,
                inputs: [{ material: 'Cotton Fabric', quantity: 0.03 }],
                technologyRequired: 1,
                purchaseFrequency: 3, publicDemand: 0.7, publicNecessity: 0.8,
                publicLuxury: 0.1, priceConcern: 0.6, qualityConcern: 0.4, reputationConcern: 0.3,
                mainCategory: 'Clothing & Baby', subcategory: 'Apparel'
            },
            {
                id: 226, name: 'Watches', category: 'ACCESSORIES', icon: '⌚',
                basePrice: 200, weight: 0.15, unit: 'unit', necessityIndex: 0.2,
                minB2BQuantity: 200, minRetailQuantity: 1, baseProductionRate: 15,
                inputs: [
                    { material: 'Steel', quantity: 0.05 },
                    { material: 'Gold Ore', quantity: 0.01 },
                    { material: 'Aluminum Sheets', quantity: 0.02 }
                ],
                technologyRequired: 4,
                purchaseFrequency: 0.1, publicDemand: 0.35, publicNecessity: 0.1,
                publicLuxury: 0.8, priceConcern: 0.3, qualityConcern: 0.7, reputationConcern: 0.8,
                mainCategory: 'Clothing & Baby', subcategory: 'Accessories'
            },
            {
                id: 227, name: 'Jewelry', category: 'ACCESSORIES', icon: '💎',
                basePrice: 500, weight: 0.05, unit: 'piece', necessityIndex: 0.1,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 10,
                inputs: [
                    { material: 'Gold Ore', quantity: 0.1 },
                    { material: 'Silver Ore', quantity: 0.05 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 0.05, publicDemand: 0.25, publicNecessity: 0.05,
                publicLuxury: 0.95, priceConcern: 0.2, qualityConcern: 0.8, reputationConcern: 0.9,
                mainCategory: 'Clothing & Baby', subcategory: 'Accessories'
            },
            {
                id: 228, name: 'Belts', category: 'ACCESSORIES', icon: '🩹',
                basePrice: 30, weight: 0.2, unit: 'unit', necessityIndex: 0.5,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 40,
                inputs: [
                    { material: 'Leather', quantity: 0.08 },
                    { material: 'Steel', quantity: 0.01 }
                ],
                technologyRequired: 1,
                purchaseFrequency: 0.5, publicDemand: 0.45, publicNecessity: 0.4,
                publicLuxury: 0.3, priceConcern: 0.5, qualityConcern: 0.5, reputationConcern: 0.5,
                mainCategory: 'Clothing & Baby', subcategory: 'Accessories'
            },
            {
                id: 229, name: 'Bags', category: 'ACCESSORIES', icon: '👜',
                basePrice: 60, weight: 0.5, unit: 'unit', necessityIndex: 0.5,
                minB2BQuantity: 300, minRetailQuantity: 1, baseProductionRate: 30,
                inputs: [
                    { material: 'Leather', quantity: 0.12 },
                    { material: 'Cotton Fabric', quantity: 0.08 },
                    { material: 'Steel', quantity: 0.02 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 0.3, publicDemand: 0.5, publicNecessity: 0.4,
                publicLuxury: 0.5, priceConcern: 0.4, qualityConcern: 0.6, reputationConcern: 0.6,
                mainCategory: 'Clothing & Baby', subcategory: 'Accessories'
            },
            {
                id: 230, name: 'Diapers', category: 'BABY', icon: '👶',
                basePrice: 25, weight: 1.0, unit: 'pack', necessityIndex: 0.95,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 60,
                inputs: [
                    { material: 'Cotton Fabric', quantity: 0.08 },
                    { material: 'Wood Pulp', quantity: 0.1 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 5, publicDemand: 0.8, publicNecessity: 0.95,
                publicLuxury: 0.05, priceConcern: 0.6, qualityConcern: 0.6, reputationConcern: 0.4,
                mainCategory: 'Clothing & Baby', subcategory: 'Baby Care'
            },
            {
                id: 231, name: 'Formula', category: 'BABY', icon: '🍼',
                basePrice: 30, weight: 0.8, unit: 'can', necessityIndex: 0.95,
                minB2BQuantity: 400, minRetailQuantity: 1, baseProductionRate: 50,
                inputs: [
                    { material: 'Pasteurized Milk', quantity: 0.4 },
                    { material: 'Sugar', quantity: 0.1 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 4, publicDemand: 0.75, publicNecessity: 0.95,
                publicLuxury: 0.05, priceConcern: 0.5, qualityConcern: 0.8, reputationConcern: 0.6,
                mainCategory: 'Clothing & Baby', subcategory: 'Baby Care'
            },
            {
                id: 232, name: 'Car Seats', category: 'BABY', icon: '🚗',
                basePrice: 200, weight: 8.0, unit: 'unit', necessityIndex: 0.7,
                minB2BQuantity: 150, minRetailQuantity: 1, baseProductionRate: 15,
                inputs: [
                    { material: 'Cotton Fabric', quantity: 0.15 },
                    { material: 'Steel', quantity: 0.3 },
                    { material: 'Plywood', quantity: 0.2 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 0.05, publicDemand: 0.5, publicNecessity: 0.7,
                publicLuxury: 0.2, priceConcern: 0.4, qualityConcern: 0.8, reputationConcern: 0.6,
                mainCategory: 'Clothing & Baby', subcategory: 'Baby Equipment'
            },
            {
                id: 233, name: 'Strollers', category: 'BABY', icon: '🛒',
                basePrice: 300, weight: 10.0, unit: 'unit', necessityIndex: 0.65,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 12,
                inputs: [
                    { material: 'Steel', quantity: 0.4 },
                    { material: 'Aluminum Sheets', quantity: 0.15 },
                    { material: 'Cotton Fabric', quantity: 0.1 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 0.03, publicDemand: 0.45, publicNecessity: 0.6,
                publicLuxury: 0.3, priceConcern: 0.4, qualityConcern: 0.7, reputationConcern: 0.6,
                mainCategory: 'Clothing & Baby', subcategory: 'Baby Equipment'
            },

            // ========== HEALTH & WELLNESS PRODUCTS (10) ==========
            {
                id: 234, name: 'Cold Medicine', category: 'HEALTH', icon: '💊',
                basePrice: 12, weight: 0.2, unit: 'box', necessityIndex: 0.85,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 60,
                inputs: [
                    { material: 'Industrial Chemicals', quantity: 0.08 },
                    { material: 'Sugar', quantity: 0.02 },
                    { material: 'Plastic Pellets', quantity: 0.01 }
                ],
                technologyRequired: 4,
                purchaseFrequency: 2, publicDemand: 0.6, publicNecessity: 0.85,
                publicLuxury: 0.05, priceConcern: 0.5, qualityConcern: 0.7, reputationConcern: 0.5,
                mainCategory: 'Health & Wellness', subcategory: 'Medicine'
            },
            {
                id: 235, name: 'Pain Killers', category: 'HEALTH', icon: '💉',
                basePrice: 10, weight: 0.15, unit: 'bottle', necessityIndex: 0.9,
                minB2BQuantity: 600, minRetailQuantity: 1, baseProductionRate: 70,
                inputs: [
                    { material: 'Industrial Chemicals', quantity: 0.06 },
                    { material: 'Plastic Pellets', quantity: 0.01 }
                ],
                technologyRequired: 4,
                purchaseFrequency: 3, publicDemand: 0.7, publicNecessity: 0.9,
                publicLuxury: 0.05, priceConcern: 0.5, qualityConcern: 0.7, reputationConcern: 0.5,
                mainCategory: 'Health & Wellness', subcategory: 'Medicine'
            },
            {
                id: 236, name: 'Vitamins', category: 'HEALTH', icon: '💪',
                basePrice: 20, weight: 0.3, unit: 'bottle', necessityIndex: 0.5,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 50,
                inputs: [
                    { material: 'Industrial Chemicals', quantity: 0.1 },
                    { material: 'Plastic Pellets', quantity: 0.02 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 1, publicDemand: 0.5, publicNecessity: 0.4,
                publicLuxury: 0.3, priceConcern: 0.4, qualityConcern: 0.6, reputationConcern: 0.6,
                mainCategory: 'Health & Wellness', subcategory: 'Supplements'
            },
            {
                id: 237, name: 'Shampoo', category: 'BEAUTY', icon: '🧴',
                basePrice: 8, weight: 0.5, unit: 'bottle', necessityIndex: 0.85,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 70,
                inputs: [
                    { material: 'Industrial Chemicals', quantity: 0.05 },
                    { material: 'Plastic Pellets', quantity: 0.02 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 2, publicDemand: 0.75, publicNecessity: 0.8,
                publicLuxury: 0.15, priceConcern: 0.5, qualityConcern: 0.5, reputationConcern: 0.5,
                mainCategory: 'Health & Wellness', subcategory: 'Personal Care'
            },
            {
                id: 238, name: 'Deodorant', category: 'BEAUTY', icon: '🧊',
                basePrice: 6, weight: 0.15, unit: 'unit', necessityIndex: 0.8,
                minB2BQuantity: 600, minRetailQuantity: 1, baseProductionRate: 80,
                inputs: [
                    { material: 'Industrial Chemicals', quantity: 0.04 },
                    { material: 'Plastic Pellets', quantity: 0.02 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 2, publicDemand: 0.7, publicNecessity: 0.75,
                publicLuxury: 0.1, priceConcern: 0.5, qualityConcern: 0.5, reputationConcern: 0.5,
                mainCategory: 'Health & Wellness', subcategory: 'Personal Care'
            },
            {
                id: 239, name: 'Soap', category: 'BEAUTY', icon: '🧼',
                basePrice: 4, weight: 0.2, unit: 'bar', necessityIndex: 0.9,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 100,
                inputs: [
                    { material: 'Industrial Chemicals', quantity: 0.03 },
                    { material: 'Vegetable Oil', quantity: 0.02 }
                ],
                technologyRequired: 1,
                purchaseFrequency: 4, publicDemand: 0.8, publicNecessity: 0.9,
                publicLuxury: 0.05, priceConcern: 0.6, qualityConcern: 0.4, reputationConcern: 0.3,
                mainCategory: 'Health & Wellness', subcategory: 'Personal Care'
            },
            {
                id: 240, name: 'Toothpaste', category: 'BEAUTY', icon: '🦷',
                basePrice: 5, weight: 0.2, unit: 'tube', necessityIndex: 0.95,
                minB2BQuantity: 800, minRetailQuantity: 1, baseProductionRate: 90,
                inputs: [
                    { material: 'Industrial Chemicals', quantity: 0.04 },
                    { material: 'Plastic Pellets', quantity: 0.01 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 2, publicDemand: 0.85, publicNecessity: 0.95,
                publicLuxury: 0.05, priceConcern: 0.5, qualityConcern: 0.5, reputationConcern: 0.5,
                mainCategory: 'Health & Wellness', subcategory: 'Personal Care'
            },
            {
                id: 241, name: 'Makeup', category: 'BEAUTY', icon: '💄',
                basePrice: 25, weight: 0.1, unit: 'kit', necessityIndex: 0.3,
                minB2BQuantity: 300, minRetailQuantity: 1, baseProductionRate: 40,
                inputs: [
                    { material: 'Industrial Chemicals', quantity: 0.06 },
                    { material: 'Plastic Pellets', quantity: 0.02 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 0.5, publicDemand: 0.45, publicNecessity: 0.2,
                publicLuxury: 0.6, priceConcern: 0.4, qualityConcern: 0.6, reputationConcern: 0.7,
                mainCategory: 'Health & Wellness', subcategory: 'Beauty'
            },
            {
                id: 242, name: 'Perfume', category: 'BEAUTY', icon: '🌸',
                basePrice: 80, weight: 0.2, unit: 'bottle', necessityIndex: 0.2,
                minB2BQuantity: 200, minRetailQuantity: 1, baseProductionRate: 30,
                inputs: [
                    { material: 'Industrial Chemicals', quantity: 0.08 },
                    { material: 'Glass', quantity: 0.03 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 0.2, publicDemand: 0.35, publicNecessity: 0.1,
                publicLuxury: 0.8, priceConcern: 0.3, qualityConcern: 0.7, reputationConcern: 0.8,
                mainCategory: 'Health & Wellness', subcategory: 'Beauty'
            },
            {
                id: 243, name: 'Glasses', category: 'HEALTH', icon: '👓',
                basePrice: 150, weight: 0.1, unit: 'pair', necessityIndex: 0.7,
                minB2BQuantity: 200, minRetailQuantity: 1, baseProductionRate: 25,
                inputs: [
                    { material: 'Glass', quantity: 0.05 },
                    { material: 'Steel', quantity: 0.02 },
                    { material: 'Plastic Pellets', quantity: 0.01 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 0.1, publicDemand: 0.5, publicNecessity: 0.7,
                publicLuxury: 0.3, priceConcern: 0.4, qualityConcern: 0.7, reputationConcern: 0.5,
                mainCategory: 'Health & Wellness', subcategory: 'Vision'
            },

            // ========== AUTO & HOME GOODS (18) ==========
            {
                id: 244, name: 'Tools', category: 'HARDWARE', icon: '🔧',
                basePrice: 50, weight: 2.0, unit: 'set', necessityIndex: 0.6,
                minB2BQuantity: 300, minRetailQuantity: 1, baseProductionRate: 35,
                inputs: [
                    { material: 'Steel', quantity: 0.5 },
                    { material: 'Plywood', quantity: 0.1 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 0.3, publicDemand: 0.5, publicNecessity: 0.5,
                publicLuxury: 0.2, priceConcern: 0.5, qualityConcern: 0.6, reputationConcern: 0.4,
                mainCategory: 'Auto & Home', subcategory: 'Hardware'
            },
            {
                id: 245, name: 'Tires', category: 'AUTOMOTIVE', icon: '🛞',
                basePrice: 120, weight: 10.0, unit: 'unit', necessityIndex: 0.7,
                minB2BQuantity: 200, minRetailQuantity: 1, baseProductionRate: 25,
                inputs: [
                    { material: 'Rubber', quantity: 0.4 },
                    { material: 'Steel', quantity: 0.08 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 0.15, publicDemand: 0.5, publicNecessity: 0.7,
                publicLuxury: 0.1, priceConcern: 0.5, qualityConcern: 0.7, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Automotive'
            },
            {
                id: 246, name: 'Auto Parts', category: 'AUTOMOTIVE', icon: '⚙️',
                basePrice: 80, weight: 3.0, unit: 'unit', necessityIndex: 0.65,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 30,
                inputs: [
                    { material: 'Steel', quantity: 0.6 },
                    { material: 'Aluminum Sheets', quantity: 0.2 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 0.2, publicDemand: 0.45, publicNecessity: 0.6,
                publicLuxury: 0.1, priceConcern: 0.5, qualityConcern: 0.6, reputationConcern: 0.4,
                mainCategory: 'Auto & Home', subcategory: 'Automotive'
            },
            {
                id: 247, name: 'Oil & Fluids', category: 'AUTOMOTIVE', icon: '🛢️',
                basePrice: 30, weight: 4.0, unit: 'gallon', necessityIndex: 0.75,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 60,
                inputs: [{ material: 'Crude Oil', quantity: 0.5 }],
                technologyRequired: 2,
                purchaseFrequency: 0.5, publicDemand: 0.55, publicNecessity: 0.7,
                publicLuxury: 0.05, priceConcern: 0.6, qualityConcern: 0.5, reputationConcern: 0.4,
                mainCategory: 'Auto & Home', subcategory: 'Automotive'
            },
            {
                id: 248, name: 'Car Battery', category: 'AUTOMOTIVE', icon: '🔋',
                basePrice: 150, weight: 15.0, unit: 'unit', necessityIndex: 0.7,
                minB2BQuantity: 150, minRetailQuantity: 1, baseProductionRate: 20,
                inputs: [
                    { material: 'Steel', quantity: 0.3 },
                    { material: 'Copper Wire', quantity: 0.4 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 0.08, publicDemand: 0.4, publicNecessity: 0.7,
                publicLuxury: 0.1, priceConcern: 0.5, qualityConcern: 0.6, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Automotive'
            },
            {
                id: 249, name: 'Cleaning Supplies', category: 'CLEANING', icon: '🧹',
                basePrice: 10, weight: 1.0, unit: 'unit', necessityIndex: 0.85,
                minB2BQuantity: 1000, minRetailQuantity: 1, baseProductionRate: 70,
                inputs: [
                    { material: 'Industrial Chemicals', quantity: 0.06 },
                    { material: 'Plastic Pellets', quantity: 0.03 }
                ],
                technologyRequired: 1,
                purchaseFrequency: 3, publicDemand: 0.7, publicNecessity: 0.8,
                publicLuxury: 0.05, priceConcern: 0.6, qualityConcern: 0.4, reputationConcern: 0.3,
                mainCategory: 'Auto & Home', subcategory: 'Cleaning'
            },
            {
                id: 250, name: 'Vacuums', category: 'APPLIANCES', icon: '🧹',
                basePrice: 200, weight: 8.0, unit: 'unit', necessityIndex: 0.6,
                minB2BQuantity: 300, minRetailQuantity: 1, baseProductionRate: 18,
                inputs: [
                    { material: 'Steel', quantity: 0.3 },
                    { material: 'Copper Wire', quantity: 0.2 },
                    { material: 'Aluminum Sheets', quantity: 0.1 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 0.05, publicDemand: 0.45, publicNecessity: 0.5,
                publicLuxury: 0.3, priceConcern: 0.45, qualityConcern: 0.6, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Appliances'
            },
            {
                id: 251, name: 'Paper Towels', category: 'CLEANING', icon: '🧻',
                basePrice: 8, weight: 0.5, unit: 'pack', necessityIndex: 0.85,
                minB2BQuantity: 2000, minRetailQuantity: 1, baseProductionRate: 90,
                inputs: [
                    { material: 'Paper', quantity: 0.4 },
                    { material: 'Cardboard', quantity: 0.05 }
                ],
                technologyRequired: 1,
                purchaseFrequency: 4, publicDemand: 0.75, publicNecessity: 0.8,
                publicLuxury: 0.05, priceConcern: 0.6, qualityConcern: 0.4, reputationConcern: 0.3,
                mainCategory: 'Auto & Home', subcategory: 'Cleaning'
            },
            {
                id: 252, name: 'Trash Bags', category: 'CLEANING', icon: '🗑️',
                basePrice: 12, weight: 0.8, unit: 'box', necessityIndex: 0.9,
                minB2BQuantity: 600, minRetailQuantity: 1, baseProductionRate: 80,
                inputs: [
                    { material: 'Plastic Pellets', quantity: 0.15 },
                    { material: 'Cardboard', quantity: 0.02 }
                ],
                technologyRequired: 1,
                purchaseFrequency: 3, publicDemand: 0.7, publicNecessity: 0.85,
                publicLuxury: 0.05, priceConcern: 0.6, qualityConcern: 0.3, reputationConcern: 0.2,
                mainCategory: 'Auto & Home', subcategory: 'Cleaning'
            },
            {
                id: 253, name: 'Sofa', category: 'FURNITURE', icon: '🛋️',
                basePrice: 800, weight: 50.0, unit: 'unit', necessityIndex: 0.55,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 6,
                inputs: [
                    { material: 'Cotton Fabric', quantity: 0.8 },
                    { material: 'Plywood', quantity: 0.5 },
                    { material: 'Steel', quantity: 0.2 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 0.02, publicDemand: 0.4, publicNecessity: 0.5,
                publicLuxury: 0.45, priceConcern: 0.4, qualityConcern: 0.6, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Furniture'
            },
            {
                id: 254, name: 'Dresser', category: 'FURNITURE', icon: '🗄️',
                basePrice: 400, weight: 40.0, unit: 'unit', necessityIndex: 0.5,
                minB2BQuantity: 800, minRetailQuantity: 1, baseProductionRate: 10,
                inputs: [
                    { material: 'Plywood', quantity: 0.8 },
                    { material: 'Steel', quantity: 0.1 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 0.03, publicDemand: 0.4, publicNecessity: 0.45,
                publicLuxury: 0.35, priceConcern: 0.45, qualityConcern: 0.55, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Furniture'
            },
            {
                id: 206, name: 'Beds', category: 'FURNITURE', icon: '🛏️',
                basePrice: 600, weight: 50, unit: 'unit', necessityIndex: 0.7,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 8,
                inputs: [
                    { material: 'Plywood', quantity: 1.2 },
                    { material: 'Cotton Fabric', quantity: 0.5 },
                    { material: 'Steel', quantity: 0.3 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 0.02, publicDemand: 0.45, publicNecessity: 0.65,
                publicLuxury: 0.3, priceConcern: 0.4, qualityConcern: 0.6, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Furniture'
            },
            {
                id: 205, name: 'Tables', category: 'FURNITURE', icon: '🪑',
                basePrice: 300, weight: 25, unit: 'unit', necessityIndex: 0.5,
                minB2BQuantity: 250, minRetailQuantity: 1, baseProductionRate: 12,
                inputs: [
                    { material: 'Plywood', quantity: 0.5 },
                    { material: 'Steel', quantity: 0.15 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 0.03, publicDemand: 0.4, publicNecessity: 0.45,
                publicLuxury: 0.35, priceConcern: 0.45, qualityConcern: 0.55, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Furniture'
            },
            {
                id: 255, name: 'Microwave', category: 'APPLIANCES', icon: '📻',
                basePrice: 150, weight: 15.0, unit: 'unit', necessityIndex: 0.65,
                minB2BQuantity: 350, minRetailQuantity: 1, baseProductionRate: 20,
                inputs: [
                    { material: 'Steel', quantity: 0.4 },
                    { material: 'Copper Wire', quantity: 0.3 },
                    { material: 'Aluminum Sheets', quantity: 0.2 }
                ],
                technologyRequired: 4,
                purchaseFrequency: 0.04, publicDemand: 0.5, publicNecessity: 0.6,
                publicLuxury: 0.25, priceConcern: 0.5, qualityConcern: 0.55, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Appliances'
            },
            {
                id: 256, name: 'Air Conditioner', category: 'APPLIANCES', icon: '❄️',
                basePrice: 500, weight: 30.0, unit: 'unit', necessityIndex: 0.5,
                minB2BQuantity: 350, minRetailQuantity: 1, baseProductionRate: 12,
                inputs: [
                    { material: 'Steel', quantity: 0.6 },
                    { material: 'Copper Wire', quantity: 0.5 },
                    { material: 'Aluminum Sheets', quantity: 0.4 }
                ],
                technologyRequired: 4,
                purchaseFrequency: 0.02, publicDemand: 0.4, publicNecessity: 0.4,
                publicLuxury: 0.5, priceConcern: 0.45, qualityConcern: 0.6, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Appliances'
            },
            {
                id: 257, name: 'Washing Machine', category: 'APPLIANCES', icon: '🧺',
                basePrice: 600, weight: 60.0, unit: 'unit', necessityIndex: 0.7,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 10,
                inputs: [
                    { material: 'Steel', quantity: 0.8 },
                    { material: 'Copper Wire', quantity: 0.4 }
                ],
                technologyRequired: 4,
                purchaseFrequency: 0.02, publicDemand: 0.45, publicNecessity: 0.65,
                publicLuxury: 0.3, priceConcern: 0.45, qualityConcern: 0.6, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Appliances'
            },
            {
                id: 258, name: 'Dryer', category: 'APPLIANCES', icon: '🌀',
                basePrice: 550, weight: 55.0, unit: 'unit', necessityIndex: 0.55,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 10,
                inputs: [
                    { material: 'Steel', quantity: 0.7 },
                    { material: 'Copper Wire', quantity: 0.3 }
                ],
                technologyRequired: 4,
                purchaseFrequency: 0.02, publicDemand: 0.4, publicNecessity: 0.5,
                publicLuxury: 0.35, priceConcern: 0.45, qualityConcern: 0.6, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Appliances'
            },
            {
                id: 259, name: 'Bikes', category: 'RECREATION', icon: '🚲',
                basePrice: 300, weight: 12.0, unit: 'unit', necessityIndex: 0.35,
                minB2BQuantity: 150, minRetailQuantity: 1, baseProductionRate: 15,
                inputs: [
                    { material: 'Steel', quantity: 0.6 },
                    { material: 'Aluminum Sheets', quantity: 0.3 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 0.05, publicDemand: 0.4, publicNecessity: 0.25,
                publicLuxury: 0.45, priceConcern: 0.45, qualityConcern: 0.55, reputationConcern: 0.5,
                mainCategory: 'Auto & Home', subcategory: 'Recreation'
            },

            // ========== ELECTRONICS (13) ==========
            {
                id: 202, name: 'Laptops', category: 'ELECTRONICS', icon: '💻',
                basePrice: 1200, weight: 1.5, unit: 'unit', necessityIndex: 0.4,
                minB2BQuantity: 150, minRetailQuantity: 1, baseProductionRate: 10,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 3.5 },
                    { material: 'Copper Wire', quantity: 2.0 },
                    { material: 'Gold Ore', quantity: 1 },
                    { material: 'Steel', quantity: 0.6 }
                ],
                technologyRequired: 8,
                purchaseFrequency: 0.05, publicDemand: 0.45, publicNecessity: 0.35,
                publicLuxury: 0.55, priceConcern: 0.4, qualityConcern: 0.7, reputationConcern: 0.6,
                mainCategory: 'Electronics', subcategory: 'Computing'
            },
            {
                id: 260, name: 'Personal Computer', category: 'ELECTRONICS', icon: '🖥️',
                basePrice: 1000, weight: 10.0, unit: 'unit', necessityIndex: 0.45,
                minB2BQuantity: 150, minRetailQuantity: 1, baseProductionRate: 12,
                inputs: [
                    { material: 'Steel', quantity: 1.0 },
                    { material: 'Copper Wire', quantity: 1.5 },
                    { material: 'Aluminum Sheets', quantity: 0.8 },
                    { material: 'Gold Ore', quantity: 0.5 }
                ],
                technologyRequired: 7,
                purchaseFrequency: 0.04, publicDemand: 0.4, publicNecessity: 0.4,
                publicLuxury: 0.5, priceConcern: 0.45, qualityConcern: 0.65, reputationConcern: 0.55,
                mainCategory: 'Electronics', subcategory: 'Computing'
            },
            {
                id: 261, name: 'Tablets', category: 'ELECTRONICS', icon: '📱',
                basePrice: 500, weight: 0.5, unit: 'unit', necessityIndex: 0.35,
                minB2BQuantity: 250, minRetailQuantity: 1, baseProductionRate: 18,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 2.0 },
                    { material: 'Copper Wire', quantity: 1.0 },
                    { material: 'Gold Ore', quantity: 0.3 }
                ],
                technologyRequired: 7,
                purchaseFrequency: 0.06, publicDemand: 0.4, publicNecessity: 0.25,
                publicLuxury: 0.6, priceConcern: 0.4, qualityConcern: 0.65, reputationConcern: 0.6,
                mainCategory: 'Electronics', subcategory: 'Computing'
            },
            {
                id: 262, name: 'Monitors', category: 'ELECTRONICS', icon: '🖥️',
                basePrice: 300, weight: 5.0, unit: 'unit', necessityIndex: 0.45,
                minB2BQuantity: 200, minRetailQuantity: 1, baseProductionRate: 20,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 1.5 },
                    { material: 'Copper Wire', quantity: 0.8 },
                    { material: 'Steel', quantity: 0.5 }
                ],
                technologyRequired: 5,
                purchaseFrequency: 0.04, publicDemand: 0.4, publicNecessity: 0.4,
                publicLuxury: 0.4, priceConcern: 0.5, qualityConcern: 0.6, reputationConcern: 0.5,
                mainCategory: 'Electronics', subcategory: 'Computing'
            },
            {
                id: 201, name: 'Cellphone', category: 'ELECTRONICS', icon: '📱',
                basePrice: 800, weight: 0.2, unit: 'unit', necessityIndex: 0.7,
                minB2BQuantity: 200, minRetailQuantity: 1, baseProductionRate: 15,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 2.5 },
                    { material: 'Copper Wire', quantity: 1.2 },
                    { material: 'Gold Ore', quantity: 0.06 }
                ],
                technologyRequired: 8,
                purchaseFrequency: 0.1, publicDemand: 0.65, publicNecessity: 0.65,
                publicLuxury: 0.4, priceConcern: 0.4, qualityConcern: 0.65, reputationConcern: 0.7,
                mainCategory: 'Electronics', subcategory: 'Mobile'
            },
            {
                id: 263, name: 'TV', category: 'ELECTRONICS', icon: '📺',
                basePrice: 600, weight: 15.0, unit: 'unit', necessityIndex: 0.5,
                minB2BQuantity: 150, minRetailQuantity: 1, baseProductionRate: 15,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 2.0 },
                    { material: 'Copper Wire', quantity: 1.0 },
                    { material: 'Steel', quantity: 0.8 }
                ],
                technologyRequired: 5,
                purchaseFrequency: 0.03, publicDemand: 0.45, publicNecessity: 0.4,
                publicLuxury: 0.5, priceConcern: 0.45, qualityConcern: 0.6, reputationConcern: 0.55,
                mainCategory: 'Electronics', subcategory: 'Entertainment'
            },
            {
                id: 264, name: 'Console', category: 'ELECTRONICS', icon: '🎮',
                basePrice: 500, weight: 3.0, unit: 'unit', necessityIndex: 0.2,
                minB2BQuantity: 200, minRetailQuantity: 1, baseProductionRate: 18,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 1.0 },
                    { material: 'Copper Wire', quantity: 0.8 },
                    { material: 'Steel', quantity: 0.3 }
                ],
                technologyRequired: 6,
                purchaseFrequency: 0.02, publicDemand: 0.35, publicNecessity: 0.1,
                publicLuxury: 0.7, priceConcern: 0.4, qualityConcern: 0.6, reputationConcern: 0.7,
                mainCategory: 'Electronics', subcategory: 'Gaming'
            },
            {
                id: 265, name: 'Headphones', category: 'ELECTRONICS', icon: '🎧',
                basePrice: 100, weight: 0.3, unit: 'unit', necessityIndex: 0.35,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 35,
                inputs: [
                    { material: 'Copper Wire', quantity: 0.5 },
                    { material: 'Aluminum Sheets', quantity: 0.2 }
                ],
                technologyRequired: 4,
                purchaseFrequency: 0.15, publicDemand: 0.5, publicNecessity: 0.25,
                publicLuxury: 0.5, priceConcern: 0.45, qualityConcern: 0.6, reputationConcern: 0.6,
                mainCategory: 'Electronics', subcategory: 'Audio'
            },
            {
                id: 266, name: 'Printers', category: 'ELECTRONICS', icon: '🖨️',
                basePrice: 200, weight: 8.0, unit: 'unit', necessityIndex: 0.4,
                minB2BQuantity: 250, minRetailQuantity: 1, baseProductionRate: 18,
                inputs: [
                    { material: 'Steel', quantity: 0.5 },
                    { material: 'Copper Wire', quantity: 0.4 },
                    { material: 'Aluminum Sheets', quantity: 0.3 }
                ],
                technologyRequired: 5,
                purchaseFrequency: 0.03, publicDemand: 0.35, publicNecessity: 0.35,
                publicLuxury: 0.35, priceConcern: 0.5, qualityConcern: 0.55, reputationConcern: 0.5,
                mainCategory: 'Electronics', subcategory: 'Office'
            },
            {
                id: 267, name: 'Cameras', category: 'ELECTRONICS', icon: '📷',
                basePrice: 400, weight: 0.5, unit: 'unit', necessityIndex: 0.25,
                minB2BQuantity: 350, minRetailQuantity: 1, baseProductionRate: 20,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 0.8 },
                    { material: 'Copper Wire', quantity: 0.4 },
                    { material: 'Gold Ore', quantity: 0.05 }
                ],
                technologyRequired: 6,
                purchaseFrequency: 0.02, publicDemand: 0.3, publicNecessity: 0.15,
                publicLuxury: 0.65, priceConcern: 0.4, qualityConcern: 0.7, reputationConcern: 0.65,
                mainCategory: 'Electronics', subcategory: 'Imaging'
            },
            {
                id: 268, name: 'Batteries', category: 'ELECTRONICS', icon: '🔋',
                basePrice: 8, weight: 0.1, unit: 'pack', necessityIndex: 0.75,
                minB2BQuantity: 2000, minRetailQuantity: 1, baseProductionRate: 100,
                inputs: [
                    { material: 'Steel', quantity: 0.1 },
                    { material: 'Copper Wire', quantity: 0.2 }
                ],
                technologyRequired: 3,
                purchaseFrequency: 4, publicDemand: 0.65, publicNecessity: 0.7,
                publicLuxury: 0.1, priceConcern: 0.5, qualityConcern: 0.5, reputationConcern: 0.5,
                mainCategory: 'Electronics', subcategory: 'Power'
            },
            {
                id: 269, name: 'Drones', category: 'ELECTRONICS', icon: '🚁',
                basePrice: 800, weight: 1.0, unit: 'unit', necessityIndex: 0.1,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 12,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 1.2 },
                    { material: 'Copper Wire', quantity: 0.8 }
                ],
                technologyRequired: 7,
                purchaseFrequency: 0.01, publicDemand: 0.2, publicNecessity: 0.05,
                publicLuxury: 0.85, priceConcern: 0.35, qualityConcern: 0.7, reputationConcern: 0.6,
                mainCategory: 'Electronics', subcategory: 'Tech'
            },
            {
                id: 270, name: 'Toys', category: 'TOYS', icon: '🧸',
                basePrice: 25, weight: 0.5, unit: 'unit', necessityIndex: 0.3,
                minB2BQuantity: 500, minRetailQuantity: 1, baseProductionRate: 50,
                inputs: [
                    { material: 'Plastic Pellets', quantity: 0.12 },
                    { material: 'Cotton Fabric', quantity: 0.05 }
                ],
                technologyRequired: 1,
                purchaseFrequency: 0.5, publicDemand: 0.45, publicNecessity: 0.2,
                publicLuxury: 0.4, priceConcern: 0.5, qualityConcern: 0.5, reputationConcern: 0.6,
                mainCategory: 'Electronics', subcategory: 'Toys'
            },

            // ========== VEHICLES (kept as before but with retail attributes) ==========
            {
                id: 203, name: 'Cars', category: 'VEHICLES', icon: '🚗',
                basePrice: 25000, weight: 1200, unit: 'unit', necessityIndex: 0.3,
                minB2BQuantity: 50, minRetailQuantity: 1, baseProductionRate: 2,
                inputs: [
                    { material: 'Steel', quantity: 70 },
                    { material: 'Aluminum Sheets', quantity: 35 },
                    { material: 'Copper Wire', quantity: 12 }
                ],
                technologyRequired: 5,
                purchaseFrequency: 0.005, publicDemand: 0.35, publicNecessity: 0.25,
                publicLuxury: 0.6, priceConcern: 0.35, qualityConcern: 0.7, reputationConcern: 0.7,
                mainCategory: 'Auto & Home', subcategory: 'Vehicles'
            },
            {
                id: 204, name: 'Motorcycles', category: 'VEHICLES', icon: '🏍️',
                basePrice: 8000, weight: 180, unit: 'unit', necessityIndex: 0.2,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 0.5,
                inputs: [
                    { material: 'Steel', quantity: 25 },
                    { material: 'Aluminum Sheets', quantity: 12.2 }
                ],
                technologyRequired: 4,
                purchaseFrequency: 0.01, publicDemand: 0.25, publicNecessity: 0.15,
                publicLuxury: 0.65, priceConcern: 0.4, qualityConcern: 0.65, reputationConcern: 0.6,
                mainCategory: 'Auto & Home', subcategory: 'Vehicles'
            },

            // ========== CONSTRUCTION (kept as before) ==========
            {
                id: 211, name: 'Cement', category: 'CONSTRUCTION', icon: '🏗️',
                basePrice: 80, weight: 50, unit: 'bag', necessityIndex: 0.4,
                minB2BQuantity: 5000, minRetailQuantity: 1, baseProductionRate: 50,
                inputs: [
                    { material: 'Limestone', quantity: 1.0 },
                    { material: 'Coal', quantity: 0.2 }
                ],
                technologyRequired: 2,
                purchaseFrequency: 0.1, publicDemand: 0.3, publicNecessity: 0.35,
                publicLuxury: 0.1, priceConcern: 0.6, qualityConcern: 0.5, reputationConcern: 0.3,
                mainCategory: 'Auto & Home', subcategory: 'Construction'
            }
        ];
        
        manufactured.forEach(product => {
            product.tier = 'MANUFACTURED';
            this.registerProduct(new Product(product));
        });
    }
    
    registerProduct(product) {
        this.products.set(product.id, product);
        this.productsByName.set(product.name, product);

        if (!this.productsByTier.has(product.tier)) {
            this.productsByTier.set(product.tier, []);
        }
        this.productsByTier.get(product.tier).push(product);

        if (!this.productsByCategory.has(product.category)) {
            this.productsByCategory.set(product.category, []);
        }
        this.productsByCategory.get(product.category).push(product);
    }

    getProduct(id) {
        return this.products.get(id);
    }

    getProductByName(name) {
        return this.productsByName.get(name);
    }
    
    getProductsByTier(tier) {
        return this.productsByTier.get(tier) || [];
    }
    
    getProductsByCategory(category) {
        return this.productsByCategory.get(category) || [];
    }
    
    getAllProducts() {
        return Array.from(this.products.values());
    }
}
