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
            { id: 1, name: 'Iron Ore', category: 'METALS', icon: '⛏️', basePrice: 50, weight: 2.0, unit: 'ton', necessityIndex: 0.3, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 60 },
            { id: 2, name: 'Copper Ore', category: 'METALS', icon: '🪨', basePrice: 80, weight: 1.8, unit: 'ton', necessityIndex: 0.3, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 45 },
            { id: 3, name: 'Aluminum Ore', category: 'METALS', icon: '⚙️', basePrice: 70, weight: 1.5, unit: 'ton', necessityIndex: 0.3, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 50 },
            { id: 4, name: 'Gold Ore', category: 'METALS', icon: '🥇', basePrice: 500, weight: 3.0, unit: 'oz', necessityIndex: 0.1, minB2BQuantity: 250, minRetailQuantity: 0, baseProductionRate: 15 },
            { id: 5, name: 'Silver Ore', category: 'METALS', icon: '🥈', basePrice: 300, weight: 2.5, unit: 'oz', necessityIndex: 0.1, minB2BQuantity: 300, minRetailQuantity: 0, baseProductionRate: 20 },

            // Mining - Minerals (B2B: bulk tons, no retail)
            { id: 6, name: 'Coal', category: 'MINERALS', icon: '⚫', basePrice: 40, weight: 1.8, unit: 'ton', necessityIndex: 0.4, minB2BQuantity: 1000, minRetailQuantity: 0, baseProductionRate: 80 },
            { id: 7, name: 'Limestone', category: 'MINERALS', icon: '🪨', basePrice: 20, weight: 2.0, unit: 'ton', necessityIndex: 0.3, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 100 },
            { id: 8, name: 'Salt', category: 'MINERALS', icon: '🧂', basePrice: 15, weight: 1.0, unit: 'ton', necessityIndex: 0.5, minB2BQuantity: 100, minRetailQuantity: 0, baseProductionRate: 70 },

            // Energy (B2B: bulk barrels/mcf, no retail)
            { id: 9, name: 'Crude Oil', category: 'ENERGY', icon: '🛢️', basePrice: 100, weight: 0.9, unit: 'barrel', necessityIndex: 0.7, minB2BQuantity: 1000, minRetailQuantity: 0, baseProductionRate: 120 },
            { id: 10, name: 'Natural Gas', category: 'ENERGY', icon: '💨', basePrice: 60, weight: 0.1, unit: 'mcf', necessityIndex: 0.6, minB2BQuantity: 2500, minRetailQuantity: 0, baseProductionRate: 200 },

            // Logging (B2B: bulk cords, no retail)
            { id: 11, name: 'Softwood Logs', category: 'TIMBER', icon: '🪵', basePrice: 35, weight: 1.5, unit: 'cord', necessityIndex: 0.4, minB2BQuantity: 50, minRetailQuantity: 0, baseProductionRate: 30 },
            { id: 12, name: 'Hardwood Logs', category: 'TIMBER', icon: '🌳', basePrice: 60, weight: 1.8, unit: 'cord', necessityIndex: 0.3, minB2BQuantity: 25, minRetailQuantity: 0, baseProductionRate: 20 },

            // Farming - Crops (B2B: bulk bushels/bales/tons, no retail)
            { id: 13, name: 'Wheat', category: 'GRAINS', icon: '🌾', basePrice: 10, weight: 0.8, unit: 'bushel', necessityIndex: 0.9, minB2BQuantity: 1000, minRetailQuantity: 0, baseProductionRate: 150 },
            { id: 14, name: 'Rice', category: 'GRAINS', icon: '🍚', basePrice: 12, weight: 0.8, unit: 'bushel', necessityIndex: 0.9, minB2BQuantity: 1000, minRetailQuantity: 0, baseProductionRate: 120 },
            { id: 15, name: 'Corn', category: 'GRAINS', icon: '🌽', basePrice: 8, weight: 0.7, unit: 'bushel', necessityIndex: 0.8, minB2BQuantity: 1000, minRetailQuantity: 0, baseProductionRate: 180 },
            { id: 16, name: 'Cotton', category: 'INDUSTRIAL_CROPS', icon: '🧵', basePrice: 25, weight: 0.5, unit: 'bale', necessityIndex: 0.4, minB2BQuantity: 100, minRetailQuantity: 0, baseProductionRate: 40 },
            { id: 17, name: 'Sugarcane', category: 'INDUSTRIAL_CROPS', icon: '🎋', basePrice: 15, weight: 1.0, unit: 'ton', necessityIndex: 0.5, minB2BQuantity: 100, minRetailQuantity: 0, baseProductionRate: 80 },
            { id: 18, name: 'Coffee Beans', category: 'INDUSTRIAL_CROPS', icon: '☕', basePrice: 40, weight: 0.6, unit: 'bag', necessityIndex: 0.6, minB2BQuantity: 50, minRetailQuantity: 0, baseProductionRate: 25 },

            // Farming - Livestock (B2B: bulk head/dozen, no retail)
            { id: 19, name: 'Cattle', category: 'LIVESTOCK', icon: '🐄', basePrice: 1200, weight: 500, unit: 'head', necessityIndex: 0.7, minB2BQuantity: 20, minRetailQuantity: 0, baseProductionRate: 2 },
            { id: 20, name: 'Pigs', category: 'LIVESTOCK', icon: '🐷', basePrice: 400, weight: 100, unit: 'head', necessityIndex: 0.6, minB2BQuantity: 50, minRetailQuantity: 0, baseProductionRate: 5 },
            { id: 21, name: 'Chickens', category: 'LIVESTOCK', icon: '🐔', basePrice: 15, weight: 2, unit: 'dozen', necessityIndex: 0.7, minB2BQuantity: 100, minRetailQuantity: 0, baseProductionRate: 20 },
            { id: 22, name: 'Raw Milk', category: 'ANIMAL_PRODUCTS', icon: '🥛', basePrice: 5, weight: 1.0, unit: 'gallon', necessityIndex: 0.8, minB2BQuantity: 500, minRetailQuantity: 0, baseProductionRate: 100 },
            { id: 23, name: 'Eggs', category: 'ANIMAL_PRODUCTS', icon: '🥚', basePrice: 3, weight: 0.5, unit: 'dozen', necessityIndex: 0.8, minB2BQuantity: 100, minRetailQuantity: 0, baseProductionRate: 50 }
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
                basePrice: 200, weight: 2.0, unit: 'ton', necessityIndex: 0.5,
                minB2BQuantity: 25, minRetailQuantity: 1, baseProductionRate: 30,
                inputs: [
                    { material: 'Iron Ore', quantity: 1.2 },
                    { material: 'Coal', quantity: 0.24 }
                ],
                technologyRequired: 2
            },
            {
                id: 102, name: 'Copper Wire', category: 'REFINED_METALS', icon: '📡',
                basePrice: 180, weight: 1.0, unit: 'spool', necessityIndex: 0.4,
                minB2BQuantity: 50, minRetailQuantity: 1, baseProductionRate: 35,
                inputs: [{ material: 'Copper Ore', quantity: 0.78 }],
                technologyRequired: 2
            },
            {
                id: 103, name: 'Aluminum Sheets', category: 'REFINED_METALS', icon: '📄',
                basePrice: 160, weight: 0.8, unit: 'sheet', necessityIndex: 0.4,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 40,
                inputs: [{ material: 'Aluminum Ore', quantity: 0.79 }],
                technologyRequired: 2
            },

            // Fuels (B2B: bulk barrels, retail: gallons at gas stations)
            {
                id: 104, name: 'Gasoline', category: 'FUELS', icon: '⛽',
                basePrice: 150, weight: 0.75, unit: 'barrel', necessityIndex: 0.8,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 80,
                inputs: [{ material: 'Crude Oil', quantity: 0.52 }],
                technologyRequired: 3
            },
            {
                id: 105, name: 'Diesel', category: 'FUELS', icon: '🚛',
                basePrice: 140, weight: 0.8, unit: 'barrel', necessityIndex: 0.7,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 70,
                inputs: [{ material: 'Crude Oil', quantity: 0.49 }],
                technologyRequired: 3
            },

            // Lumber (B2B: bulk sheets/tons, retail: hardware stores)
            {
                id: 106, name: 'Plywood', category: 'LUMBER', icon: '🪚',
                basePrice: 80, weight: 1.2, unit: 'sheet', necessityIndex: 0.4,
                minB2BQuantity: 50, minRetailQuantity: 1, baseProductionRate: 25,
                inputs: [{ material: 'Softwood Logs', quantity: 0.79 }],
                technologyRequired: 1
            },
            {
                id: 107, name: 'Wood Pulp', category: 'LUMBER', icon: '📃',
                basePrice: 60, weight: 0.9, unit: 'ton', necessityIndex: 0.3,
                minB2BQuantity: 25, minRetailQuantity: 0, baseProductionRate: 20,
                inputs: [{ material: 'Softwood Logs', quantity: 0.60 }],
                technologyRequired: 2
            },

            // Food Ingredients (B2B: bulk bags, retail: supermarkets)
            {
                id: 108, name: 'Flour', category: 'FOOD_INGREDIENTS', icon: '🍞',
                basePrice: 25, weight: 1.0, unit: 'bag', necessityIndex: 0.9,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 60,
                inputs: [{ material: 'Wheat', quantity: 0.87 }],
                technologyRequired: 1
            },
            {
                id: 109, name: 'Sugar', category: 'FOOD_INGREDIENTS', icon: '🍬',
                basePrice: 30, weight: 1.0, unit: 'bag', necessityIndex: 0.7,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 50,
                inputs: [{ material: 'Sugarcane', quantity: 0.70 }],
                technologyRequired: 1
            },

            // Textiles (B2B: bulk bolts, retail: fabric stores)
            {
                id: 110, name: 'Cotton Fabric', category: 'TEXTILES', icon: '🧶',
                basePrice: 45, weight: 0.4, unit: 'bolt', necessityIndex: 0.6,
                minB2BQuantity: 50, minRetailQuantity: 1, baseProductionRate: 30,
                inputs: [{ material: 'Cotton', quantity: 0.63 }],
                technologyRequired: 2
            },

            // Dairy & Meat (B2B: bulk, retail: supermarkets - individual units)
            {
                id: 111, name: 'Pasteurized Milk', category: 'DAIRY', icon: '🥛',
                basePrice: 8, weight: 1.0, unit: 'gallon', necessityIndex: 0.85,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 80,
                inputs: [{ material: 'Raw Milk', quantity: 0.56 }],
                technologyRequired: 1
            },
            {
                id: 112, name: 'Beef', category: 'MEAT', icon: '🥩',
                basePrice: 800, weight: 50, unit: 'cwt', necessityIndex: 0.75,
                minB2BQuantity: 10, minRetailQuantity: 1, baseProductionRate: 8,
                inputs: [{ material: 'Cattle', quantity: 0.23 }],
                technologyRequired: 1
            },
            {
                id: 113, name: 'Pork', category: 'MEAT', icon: '🍖',
                basePrice: 300, weight: 25, unit: 'cwt', necessityIndex: 0.7,
                minB2BQuantity: 20, minRetailQuantity: 1, baseProductionRate: 15,
                inputs: [{ material: 'Pigs', quantity: 0.26 }],
                technologyRequired: 1
            },
            {
                id: 114, name: 'Chicken', category: 'MEAT', icon: '🍗',
                basePrice: 12, weight: 1.5, unit: 'lb', necessityIndex: 0.8,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 50,
                inputs: [{ material: 'Chickens', quantity: 0.28 }],
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
            // Electronics (B2B: small bulk for retailers, retail: individual units)
            // baseProductionRate = units manufactured per hour
            {
                id: 201, name: 'Smartphones', category: 'ELECTRONICS', icon: '📱',
                basePrice: 800, weight: 0.2, unit: 'unit', necessityIndex: 0.7,
                minB2BQuantity: 20, minRetailQuantity: 1, baseProductionRate: 15,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 2.5 },
                    { material: 'Copper Wire', quantity: 1.2 },
                    { material: 'Gold Ore', quantity: 0.06 }
                ],
                technologyRequired: 8
            },
            {
                id: 202, name: 'Laptops', category: 'ELECTRONICS', icon: '💻',
                basePrice: 1200, weight: 1.5, unit: 'unit', necessityIndex: 0.15,
                minB2BQuantity: 200, minRetailQuantity: 1, baseProductionRate: 1,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 3.5 },
                    { material: 'Copper Wire', quantity: 2.0 },
					{ material: 'Gold Ore', quantity: 0.01 },
                    { material: 'Steel', quantity: 0.6 }
                ],
                technologyRequired: 8
            },

            // Vehicles (B2B: small lots for dealerships, retail: individual)
            {
                id: 203, name: 'Cars', category: 'VEHICLES', icon: '🚗',
                basePrice: 25000, weight: 1200, unit: 'unit', necessityIndex: 0.6,
                minB2BQuantity: 5, minRetailQuantity: 1, baseProductionRate: 2,
                inputs: [
                    { material: 'Steel', quantity: 70 },
                    { material: 'Aluminum Sheets', quantity: 35 },
                    { material: 'Copper Wire', quantity: 12 }
                ],
                technologyRequired: 5
            },
            {
                id: 204, name: 'Motorcycles', category: 'VEHICLES', icon: '🏍️',
                basePrice: 8000, weight: 180, unit: 'unit', necessityIndex: 0.5,
                minB2BQuantity: 10, minRetailQuantity: 1, baseProductionRate: 5,
                inputs: [
                    { material: 'Steel', quantity: 25 },
                    { material: 'Aluminum Sheets', quantity: 12.2 }
                ],
                technologyRequired: 4
            },

            // Furniture (B2B: small lots for stores, retail: individual)
            {
                id: 205, name: 'Tables', category: 'FURNITURE', icon: '🪑',
                basePrice: 300, weight: 25, unit: 'unit', necessityIndex: 0.5,
                minB2BQuantity: 10, minRetailQuantity: 1, baseProductionRate: 12,
                inputs: [
                    { material: 'Plywood', quantity: 2.5 },
                    { material: 'Steel', quantity: 0.3 }
                ],
                technologyRequired: 2
            },
            {
                id: 206, name: 'Beds', category: 'FURNITURE', icon: '🛏️',
                basePrice: 600, weight: 50, unit: 'unit', necessityIndex: 0.7,
                minB2BQuantity: 5, minRetailQuantity: 1, baseProductionRate: 8,
                inputs: [
                    { material: 'Plywood', quantity: 4.5 },
                    { material: 'Steel', quantity: 0.6 },
                    { material: 'Cotton Fabric', quantity: 0.9 }
                ],
                technologyRequired: 2
            },

            // Clothing (B2B: bulk for stores, retail: individual)
            {
                id: 207, name: 'Shirts', category: 'CLOTHING', icon: '👕',
                basePrice: 30, weight: 0.2, unit: 'unit', necessityIndex: 0.8,
                minB2BQuantity: 50, minRetailQuantity: 1, baseProductionRate: 40,
                inputs: [
                    { material: 'Cotton Fabric', quantity: 0.58 }
                ],
                technologyRequired: 2
            },
            {
                id: 208, name: 'Jeans', category: 'CLOTHING', icon: '👖',
                basePrice: 50, weight: 0.5, unit: 'pair', necessityIndex: 0.75,
                minB2BQuantity: 50, minRetailQuantity: 1, baseProductionRate: 30,
                inputs: [
                    { material: 'Cotton Fabric', quantity: 0.97 }
                ],
                technologyRequired: 2
            },

            // Packaged Foods (B2B: case lots, retail: individual)
            {
                id: 209, name: 'Bread', category: 'PACKAGED_FOOD', icon: '🍞',
                basePrice: 3, weight: 0.5, unit: 'loaf', necessityIndex: 0.95,
                minB2BQuantity: 100, minRetailQuantity: 1, baseProductionRate: 100,
                inputs: [
                    { material: 'Flour', quantity: 0.08 },
                    { material: 'Sugar', quantity: 0.02 }
                ],
                technologyRequired: 1
            },
            {
                id: 210, name: 'Canned Goods', category: 'PACKAGED_FOOD', icon: '🥫',
                basePrice: 5, weight: 0.4, unit: 'can', necessityIndex: 0.8,
                minB2BQuantity: 24, minRetailQuantity: 1, baseProductionRate: 80,
                inputs: [
                    { material: 'Steel', quantity: 0.01 },
                    { material: 'Corn', quantity: 0.12 }
                ],
                technologyRequired: 2
            },

            // Construction Materials (B2B: bulk pallets, retail: individual bags)
            {
                id: 211, name: 'Cement', category: 'CONSTRUCTION', icon: '🏗️',
                basePrice: 80, weight: 50, unit: 'bag', necessityIndex: 0.4,
                minB2BQuantity: 50, minRetailQuantity: 1, baseProductionRate: 50,
                inputs: [
                    { material: 'Limestone', quantity: 1.0 },
                    { material: 'Coal', quantity: 0.2 }
                ],
                technologyRequired: 2
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
