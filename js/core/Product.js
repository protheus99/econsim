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
        this.necessityIndex = config.necessityIndex;
        
        // Production requirements
        this.inputs = config.inputs || []; // [{material, quantity, tier}]
        this.productionTime = config.productionTime || 1; // hours
        this.technologyRequired = config.technologyRequired || 1;
        
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
            // Mining - Metals
            { id: 1, name: 'Iron Ore', category: 'METALS', icon: '⛏️', basePrice: 50, weight: 2.0, necessityIndex: 0.3 },
            { id: 2, name: 'Copper Ore', category: 'METALS', icon: '🪨', basePrice: 80, weight: 1.8, necessityIndex: 0.3 },
            { id: 3, name: 'Aluminum Ore', category: 'METALS', icon: '⚙️', basePrice: 70, weight: 1.5, necessityIndex: 0.3 },
            { id: 4, name: 'Gold Ore', category: 'METALS', icon: '🥇', basePrice: 500, weight: 3.0, necessityIndex: 0.1 },
            { id: 5, name: 'Silver Ore', category: 'METALS', icon: '🥈', basePrice: 300, weight: 2.5, necessityIndex: 0.1 },
            
            // Mining - Minerals
            { id: 6, name: 'Coal', category: 'MINERALS', icon: '⚫', basePrice: 40, weight: 1.8, necessityIndex: 0.4 },
            { id: 7, name: 'Limestone', category: 'MINERALS', icon: '🪨', basePrice: 20, weight: 2.0, necessityIndex: 0.3 },
            { id: 8, name: 'Salt', category: 'MINERALS', icon: '🧂', basePrice: 15, weight: 1.0, necessityIndex: 0.5 },
            
            // Energy
            { id: 9, name: 'Crude Oil', category: 'ENERGY', icon: '🛢️', basePrice: 100, weight: 0.9, necessityIndex: 0.7 },
            { id: 10, name: 'Natural Gas', category: 'ENERGY', icon: '💨', basePrice: 60, weight: 0.1, necessityIndex: 0.6 },
            
            // Logging
            { id: 11, name: 'Softwood Logs', category: 'TIMBER', icon: '🪵', basePrice: 35, weight: 1.5, necessityIndex: 0.4 },
            { id: 12, name: 'Hardwood Logs', category: 'TIMBER', icon: '🌳', basePrice: 60, weight: 1.8, necessityIndex: 0.3 },
            
            // Farming - Crops
            { id: 13, name: 'Wheat', category: 'GRAINS', icon: '🌾', basePrice: 10, weight: 0.8, necessityIndex: 0.9 },
            { id: 14, name: 'Rice', category: 'GRAINS', icon: '🍚', basePrice: 12, weight: 0.8, necessityIndex: 0.9 },
            { id: 15, name: 'Corn', category: 'GRAINS', icon: '🌽', basePrice: 8, weight: 0.7, necessityIndex: 0.8 },
            { id: 16, name: 'Cotton', category: 'INDUSTRIAL_CROPS', icon: '🧵', basePrice: 25, weight: 0.5, necessityIndex: 0.4 },
            { id: 17, name: 'Sugarcane', category: 'INDUSTRIAL_CROPS', icon: '🎋', basePrice: 15, weight: 1.0, necessityIndex: 0.5 },
            { id: 18, name: 'Coffee Beans', category: 'INDUSTRIAL_CROPS', icon: '☕', basePrice: 40, weight: 0.6, necessityIndex: 0.6 },
            
            // Farming - Livestock
            { id: 19, name: 'Cattle', category: 'LIVESTOCK', icon: '🐄', basePrice: 1200, weight: 500, necessityIndex: 0.7 },
            { id: 20, name: 'Pigs', category: 'LIVESTOCK', icon: '🐷', basePrice: 400, weight: 100, necessityIndex: 0.6 },
            { id: 21, name: 'Chickens', category: 'LIVESTOCK', icon: '🐔', basePrice: 15, weight: 2, necessityIndex: 0.7 },
            { id: 22, name: 'Raw Milk', category: 'ANIMAL_PRODUCTS', icon: '🥛', basePrice: 5, weight: 1.0, necessityIndex: 0.8 },
            { id: 23, name: 'Eggs', category: 'ANIMAL_PRODUCTS', icon: '🥚', basePrice: 3, weight: 0.5, necessityIndex: 0.8 }
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
            // Refined Metals
            {
                id: 101, name: 'Steel', category: 'REFINED_METALS', icon: '🔩',
                basePrice: 200, weight: 2.0, necessityIndex: 0.5,
                inputs: [
                    { material: 'Iron Ore', quantity: 1.2 },
                    { material: 'Coal', quantity: 0.24 }
                ],
                technologyRequired: 2
            },
            {
                id: 102, name: 'Copper Wire', category: 'REFINED_METALS', icon: '📡',
                basePrice: 180, weight: 1.0, necessityIndex: 0.4,
                inputs: [{ material: 'Copper Ore', quantity: 0.78 }],
                technologyRequired: 2
            },
            {
                id: 103, name: 'Aluminum Sheets', category: 'REFINED_METALS', icon: '📄',
                basePrice: 160, weight: 0.8, necessityIndex: 0.4,
                inputs: [{ material: 'Aluminum Ore', quantity: 0.79 }],
                technologyRequired: 2
            },

            // Fuels
            {
                id: 104, name: 'Gasoline', category: 'FUELS', icon: '⛽',
                basePrice: 150, weight: 0.75, necessityIndex: 0.8,
                inputs: [{ material: 'Crude Oil', quantity: 0.52 }],
                technologyRequired: 3
            },
            {
                id: 105, name: 'Diesel', category: 'FUELS', icon: '🚛',
                basePrice: 140, weight: 0.8, necessityIndex: 0.7,
                inputs: [{ material: 'Crude Oil', quantity: 0.49 }],
                technologyRequired: 3
            },

            // Lumber
            {
                id: 106, name: 'Plywood', category: 'LUMBER', icon: '🪚',
                basePrice: 80, weight: 1.2, necessityIndex: 0.4,
                inputs: [{ material: 'Softwood Logs', quantity: 0.79 }],
                technologyRequired: 1
            },
            {
                id: 107, name: 'Wood Pulp', category: 'LUMBER', icon: '📃',
                basePrice: 60, weight: 0.9, necessityIndex: 0.3,
                inputs: [{ material: 'Softwood Logs', quantity: 0.60 }],
                technologyRequired: 2
            },

            // Food Ingredients
            {
                id: 108, name: 'Flour', category: 'FOOD_INGREDIENTS', icon: '🍞',
                basePrice: 25, weight: 1.0, necessityIndex: 0.9,
                inputs: [{ material: 'Wheat', quantity: 0.87 }],
                technologyRequired: 1
            },
            {
                id: 109, name: 'Sugar', category: 'FOOD_INGREDIENTS', icon: '🍬',
                basePrice: 30, weight: 1.0, necessityIndex: 0.7,
                inputs: [{ material: 'Sugarcane', quantity: 0.70 }],
                technologyRequired: 1
            },

            // Textiles
            {
                id: 110, name: 'Cotton Fabric', category: 'TEXTILES', icon: '🧶',
                basePrice: 45, weight: 0.4, necessityIndex: 0.6,
                inputs: [{ material: 'Cotton', quantity: 0.63 }],
                technologyRequired: 2
            },

            // Dairy & Meat
            {
                id: 111, name: 'Pasteurized Milk', category: 'DAIRY', icon: '🥛',
                basePrice: 8, weight: 1.0, necessityIndex: 0.85,
                inputs: [{ material: 'Raw Milk', quantity: 0.56 }],
                technologyRequired: 1
            },
            {
                id: 112, name: 'Beef', category: 'MEAT', icon: '🥩',
                basePrice: 800, weight: 50, necessityIndex: 0.75,
                inputs: [{ material: 'Cattle', quantity: 0.23 }],
                technologyRequired: 1
            },
            {
                id: 113, name: 'Pork', category: 'MEAT', icon: '🍖',
                basePrice: 300, weight: 25, necessityIndex: 0.7,
                inputs: [{ material: 'Pigs', quantity: 0.26 }],
                technologyRequired: 1
            },
            {
                id: 114, name: 'Chicken', category: 'MEAT', icon: '🍗',
                basePrice: 12, weight: 1.5, necessityIndex: 0.8,
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
            // Electronics
            {
                id: 201, name: 'Smartphones', category: 'ELECTRONICS', icon: '📱',
                basePrice: 800, weight: 0.2, necessityIndex: 0.7,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 2.5 },
                    { material: 'Copper Wire', quantity: 1.2 },
                    { material: 'Gold Ore', quantity: 0.06 }
                ],
                technologyRequired: 8
            },
            {
                id: 202, name: 'Laptops', category: 'ELECTRONICS', icon: '💻',
                basePrice: 1200, weight: 1.5, necessityIndex: 0.65,
                inputs: [
                    { material: 'Aluminum Sheets', quantity: 3.5 },
                    { material: 'Copper Wire', quantity: 2.0 },
                    { material: 'Steel', quantity: 0.6 }
                ],
                technologyRequired: 8
            },

            // Vehicles
            {
                id: 203, name: 'Cars', category: 'VEHICLES', icon: '🚗',
                basePrice: 25000, weight: 1200, necessityIndex: 0.6,
                inputs: [
                    { material: 'Steel', quantity: 70 },
                    { material: 'Aluminum Sheets', quantity: 35 },
                    { material: 'Copper Wire', quantity: 12 }
                ],
                technologyRequired: 5
            },
            {
                id: 204, name: 'Motorcycles', category: 'VEHICLES', icon: '🏍️',
                basePrice: 8000, weight: 180, necessityIndex: 0.5,
                inputs: [
                    { material: 'Steel', quantity: 25 },
                    { material: 'Aluminum Sheets', quantity: 12.2 }
                ],
                technologyRequired: 4
            },

            // Furniture
            {
                id: 205, name: 'Tables', category: 'FURNITURE', icon: '🪑',
                basePrice: 300, weight: 25, necessityIndex: 0.5,
                inputs: [
                    { material: 'Plywood', quantity: 2.5 },
                    { material: 'Steel', quantity: 0.3 }
                ],
                technologyRequired: 2
            },
            {
                id: 206, name: 'Beds', category: 'FURNITURE', icon: '🛏️',
                basePrice: 600, weight: 50, necessityIndex: 0.7,
                inputs: [
                    { material: 'Plywood', quantity: 4.5 },
                    { material: 'Steel', quantity: 0.6 },
                    { material: 'Cotton Fabric', quantity: 0.9 }
                ],
                technologyRequired: 2
            },

            // Clothing
            {
                id: 207, name: 'Shirts', category: 'CLOTHING', icon: '👕',
                basePrice: 30, weight: 0.2, necessityIndex: 0.8,
                inputs: [
                    { material: 'Cotton Fabric', quantity: 0.58 }
                ],
                technologyRequired: 2
            },
            {
                id: 208, name: 'Jeans', category: 'CLOTHING', icon: '👖',
                basePrice: 50, weight: 0.5, necessityIndex: 0.75,
                inputs: [
                    { material: 'Cotton Fabric', quantity: 0.97 }
                ],
                technologyRequired: 2
            },

            // Packaged Foods
            {
                id: 209, name: 'Bread', category: 'PACKAGED_FOOD', icon: '🍞',
                basePrice: 3, weight: 0.5, necessityIndex: 0.95,
                inputs: [
                    { material: 'Flour', quantity: 0.08 },
                    { material: 'Sugar', quantity: 0.02 }
                ],
                technologyRequired: 1
            },
            {
                id: 210, name: 'Canned Goods', category: 'PACKAGED_FOOD', icon: '🥫',
                basePrice: 5, weight: 0.4, necessityIndex: 0.8,
                inputs: [
                    { material: 'Steel', quantity: 0.01 },
                    { material: 'Corn', quantity: 0.12 }
                ],
                technologyRequired: 2
            },

            // Construction Materials
            {
                id: 211, name: 'Cement', category: 'CONSTRUCTION', icon: '🏗️',
                basePrice: 80, weight: 50, necessityIndex: 0.4,
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
