// js/core/LotSizings.js
// Configuration for lot sizes by product type

/**
 * Lot sizing configuration for RAW and SEMI_RAW products
 *
 * lotSize: Number of units per lot
 * perishable: Whether the product can expire
 * shelfLifeDays: Days until expiration (only for perishable products)
 */
export const LOT_SIZING_CONFIG = {
    // ==================
    // RAW Materials - Mining (48hr lot formation)
    // ==================
    'Iron Ore': {
        lotSize: 3000,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~62 units/hr * 48 hrs = 3000
    },
    'Coal': {
        lotSize: 4000,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~83 units/hr * 48 hrs = 4000
    },
    'Crude Oil': {
        lotSize: 6000,
        unit: 'barrel',
        perishable: false,
        hoursToForm: 48  // ~125 units/hr * 48 hrs = 6000
    },
    'Gold Ore': {
        lotSize: 720,
        unit: 'oz',
        perishable: false,
        hoursToForm: 48  // ~15 units/hr * 48 hrs = 720
    },
    'Silver Ore': {
        lotSize: 960,
        unit: 'oz',
        perishable: false,
        hoursToForm: 48  // ~20 units/hr * 48 hrs = 960
    },
    'Copper Ore': {
        lotSize: 2200,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~45 units/hr * 48 hrs = 2160
    },
    'Aluminum Ore': {
        lotSize: 2400,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~50 units/hr * 48 hrs = 2400
    },
    'Limestone': {
        lotSize: 4800,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~100 units/hr * 48 hrs = 4800
    },
    'Salt': {
        lotSize: 3400,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~70 units/hr * 48 hrs = 3360
    },
    'Natural Gas': {
        lotSize: 9600,
        unit: 'mcf',
        perishable: false,
        hoursToForm: 48  // ~200 units/hr * 48 hrs = 9600
    },

    // ==================
    // RAW Materials - Logging (48hr lot formation)
    // ==================
    'Softwood Logs': {
        lotSize: 1440,
        unit: 'cord',
        perishable: false,
        hoursToForm: 48  // ~30 units/hr * 48 hrs = 1440
    },
    'Hardwood Logs': {
        lotSize: 960,
        unit: 'cord',
        perishable: false,
        hoursToForm: 48  // ~20 units/hr * 48 hrs = 960
    },
    'Bamboo': {
        lotSize: 1200,
        unit: 'cord',
        perishable: false,
        hoursToForm: 48  // ~25 units/hr * 48 hrs = 1200
    },

    // ==================
    // RAW Materials - Agriculture (Crops) - 48hr lot formation
    // ==================
    'Wheat': {
        lotSize: 4800,
        unit: 'bushel',
        perishable: false,
        hoursToForm: 48  // ~100 units/hr equivalent
    },
    'Rice': {
        lotSize: 4800,
        unit: 'bushel',
        perishable: false,
        hoursToForm: 48
    },
    'Corn': {
        lotSize: 4800,
        unit: 'bushel',
        perishable: false,
        hoursToForm: 48
    },
    'Cotton': {
        lotSize: 480,
        unit: 'bale',
        perishable: false,
        hoursToForm: 48  // ~10 bales/hr * 48 hrs
    },
    'Sugarcane': {
        lotSize: 2400,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~50 tons/hr * 48 hrs
    },
    'Coffee Beans': {
        lotSize: 240,
        unit: 'bag',
        perishable: false,
        hoursToForm: 48  // ~5 bags/hr * 48 hrs
    },

    // ==================
    // RAW Materials - Agriculture (Livestock) - 48hr lot formation
    // ==================
    'Cattle': {
        lotSize: 96,
        unit: 'head',
        perishable: false,
        hoursToForm: 48  // ~2 units/hr * 48 hrs = 96
    },
    'Pigs': {
        lotSize: 240,
        unit: 'head',
        perishable: false,
        hoursToForm: 48  // ~5 units/hr * 48 hrs = 240
    },
    'Chickens': {
        lotSize: 960,
        unit: 'dozen',
        perishable: false,
        hoursToForm: 48  // ~20 units/hr * 48 hrs = 960
    },
    'Sheep': {
        lotSize: 144,
        unit: 'head',
        perishable: false,
        hoursToForm: 48  // ~3 units/hr * 48 hrs = 144
    },
    'Raw Milk': {
        lotSize: 4800,
        unit: 'gallon',
        perishable: true,
        shelfLifeDays: 7,
        hoursToForm: 48  // ~100 units/hr * 48 hrs = 4800
    },
    'Eggs': {
        lotSize: 2400,
        unit: 'dozen',
        perishable: true,
        shelfLifeDays: 14,
        hoursToForm: 48  // ~50 units/hr * 48 hrs = 2400
    },

    // ==================
    // SEMI_RAW Products - Metals (48hr lot formation)
    // ==================
    'Steel': {
        lotSize: 1440,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~30 units/hr * 48 hrs = 1440
    },
    'Copper Wire': {
        lotSize: 1680,
        unit: 'spool',
        perishable: false,
        hoursToForm: 48  // ~35 units/hr * 48 hrs = 1680
    },
    'Aluminum Sheets': {
        lotSize: 1920,
        unit: 'sheet',
        perishable: false,
        hoursToForm: 48  // ~40 units/hr * 48 hrs = 1920
    },

    // ==================
    // SEMI_RAW Products - Fuels (48hr lot formation)
    // ==================
    'Gasoline': {
        lotSize: 3840,
        unit: 'barrel',
        perishable: false,
        hoursToForm: 48  // ~80 units/hr * 48 hrs = 3840
    },
    'Diesel': {
        lotSize: 3360,
        unit: 'barrel',
        perishable: false,
        hoursToForm: 48  // ~70 units/hr * 48 hrs = 3360
    },

    // ==================
    // SEMI_RAW Products - Lumber (48hr lot formation)
    // ==================
    'Plywood': {
        lotSize: 1200,
        unit: 'sheet',
        perishable: false,
        hoursToForm: 48  // ~25 units/hr * 48 hrs = 1200
    },
    'Wood Pulp': {
        lotSize: 960,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~20 units/hr * 48 hrs = 960
    },

    // ==================
    // SEMI_RAW Products - Food Ingredients (48hr lot formation)
    // ==================
    'Flour': {
        lotSize: 2880,
        unit: 'bag',
        perishable: false,
        hoursToForm: 48  // ~60 units/hr * 48 hrs = 2880
    },
    'Sugar': {
        lotSize: 2400,
        unit: 'bag',
        perishable: false,
        hoursToForm: 48  // ~50 units/hr * 48 hrs = 2400
    },

    // ==================
    // SEMI_RAW Products - Textiles (48hr lot formation)
    // ==================
    'Cotton Fabric': {
        lotSize: 1440,
        unit: 'bolt',
        perishable: false,
        hoursToForm: 48  // ~30 units/hr * 48 hrs = 1440
    },
    'Leather': {
        lotSize: 960,
        unit: 'hide',
        perishable: false,
        hoursToForm: 48  // ~20 units/hr * 48 hrs = 960
    },

    // ==================
    // SEMI_RAW Products - Polymers (48hr lot formation)
    // ==================
    'Plastic Pellets': {
        lotSize: 1920,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~40 units/hr * 48 hrs = 1920
    },
    'Rubber': {
        lotSize: 1440,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~30 units/hr * 48 hrs = 1440
    },

    // ==================
    // SEMI_RAW Products - Materials (48hr lot formation)
    // ==================
    'Glass': {
        lotSize: 1680,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~35 units/hr * 48 hrs = 1680
    },

    // ==================
    // SEMI_RAW Products - Chemicals (48hr lot formation)
    // ==================
    'Industrial Chemicals': {
        lotSize: 2160,
        unit: 'ton',
        perishable: false,
        hoursToForm: 48  // ~45 units/hr * 48 hrs = 2160
    },

    // ==================
    // SEMI_RAW Products - Paper (48hr lot formation)
    // ==================
    'Paper': {
        lotSize: 2880,
        unit: 'ream',
        perishable: false,
        hoursToForm: 48  // ~60 units/hr * 48 hrs = 2880
    },
    'Cardboard': {
        lotSize: 3360,
        unit: 'sheet',
        perishable: false,
        hoursToForm: 48  // ~70 units/hr * 48 hrs = 3360
    },

    // ==================
    // SEMI_RAW Products - Food Processing (48hr lot formation)
    // ==================
    'Processed Fish': {
        lotSize: 960,
        unit: 'ton',
        perishable: true,
        shelfLifeDays: 7,
        hoursToForm: 48  // ~20 units/hr * 48 hrs = 960
    },
    'Vegetable Oil': {
        lotSize: 2400,
        unit: 'gallon',
        perishable: false,
        hoursToForm: 48  // ~50 units/hr * 48 hrs = 2400
    },
    'Fruit Concentrate': {
        lotSize: 1920,
        unit: 'gallon',
        perishable: false,
        hoursToForm: 48  // ~40 units/hr * 48 hrs = 1920
    },

    // ==================
    // SEMI_RAW Products - Dairy & Meat (Perishable, 48hr lot formation)
    // ==================
    'Pasteurized Milk': {
        lotSize: 3840,
        unit: 'gallon',
        perishable: true,
        shelfLifeDays: 14,
        hoursToForm: 48  // ~80 units/hr * 48 hrs = 3840
    },
    'Beef': {
        lotSize: 384,
        unit: 'cwt',
        perishable: true,
        shelfLifeDays: 5,
        hoursToForm: 48  // ~8 units/hr * 48 hrs = 384
    },
    'Pork': {
        lotSize: 720,
        unit: 'cwt',
        perishable: true,
        shelfLifeDays: 5,
        hoursToForm: 48  // ~15 units/hr * 48 hrs = 720
    },
    'Chicken': {
        lotSize: 2400,
        unit: 'lb',
        perishable: true,
        shelfLifeDays: 4,
        hoursToForm: 48  // ~50 units/hr * 48 hrs = 2400
    },

    // ==================
    // MANUFACTURED Products - Grocery (retail-friendly lot sizes)
    // ==================
    'Bread': {
        lotSize: 240,       // Retail: ~1 case per lot
        unit: 'loaf',
        perishable: true,
        shelfLifeDays: 5,
        hoursToForm: 48
    },
    'Meat': {
        lotSize: 144,       // Retail: ~1 case per lot
        unit: 'lb',
        perishable: true,
        shelfLifeDays: 5,
        hoursToForm: 48
    },
    'Seafood': {
        lotSize: 96,        // Retail: ~1 case per lot
        unit: 'lb',
        perishable: true,
        shelfLifeDays: 3,
        hoursToForm: 48
    },
    'Fruits': {
        lotSize: 192,       // Retail: ~1 case per lot
        unit: 'lb',
        perishable: true,
        shelfLifeDays: 7,
        hoursToForm: 48
    },
    'Breakfast Cereal': {
        lotSize: 168,       // Retail: ~1 case per lot
        unit: 'box',
        perishable: false,
        hoursToForm: 48
    },
    'Cake': {
        lotSize: 72,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: true,
        shelfLifeDays: 4,
        hoursToForm: 48
    },
    'Candy': {
        lotSize: 240,       // Retail: ~1 case per lot
        unit: 'bag',
        perishable: false,
        hoursToForm: 48
    },
    'Ice Cream': {
        lotSize: 144,       // Retail: ~1 case per lot
        unit: 'pint',
        perishable: true,
        shelfLifeDays: 30,
        hoursToForm: 48
    },
    'Soda': {
        lotSize: 360,       // Retail: ~1 case per lot
        unit: 'can',
        perishable: false,
        hoursToForm: 48
    },
    'Alcohol': {
        lotSize: 120,       // Retail: ~1 case per lot
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48
    },
    'Canned Goods': {
        lotSize: 192,       // Retail: ~1 case per lot
        unit: 'can',
        perishable: false,
        hoursToForm: 48
    },
    'Cooking Oil': {
        lotSize: 168,       // Retail: ~1 case per lot
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48
    },

    // ==================
    // MANUFACTURED Products - Clothing & Accessories (retail-friendly lot sizes)
    // ==================
    'Shirts': {
        lotSize: 96,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Jackets': {
        lotSize: 48,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Jeans': {
        lotSize: 72,        // Retail: ~1 case per lot
        unit: 'pair',
        perishable: false,
        hoursToForm: 48
    },
    'Sweaters': {
        lotSize: 60,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Shoes': {
        lotSize: 60,        // Retail: ~1 case per lot
        unit: 'pair',
        perishable: false,
        hoursToForm: 48
    },
    'Socks': {
        lotSize: 192,       // Retail: ~1 case per lot
        unit: 'pair',
        perishable: false,
        hoursToForm: 48
    },
    'Watches': {
        lotSize: 36,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Jewelry': {
        lotSize: 24,        // Retail: ~1 case per lot
        unit: 'piece',
        perishable: false,
        hoursToForm: 48
    },
    'Belts': {
        lotSize: 96,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Bags': {
        lotSize: 72,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },

    // ==================
    // MANUFACTURED Products - Baby (retail-friendly lot sizes)
    // ==================
    'Diapers': {
        lotSize: 144,       // Retail: ~1 case per lot
        unit: 'pack',
        perishable: false,
        hoursToForm: 48
    },
    'Formula': {
        lotSize: 120,       // Retail: ~1 case per lot
        unit: 'can',
        perishable: false,
        hoursToForm: 48
    },
    'Car Seats': {
        lotSize: 36,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Strollers': {
        lotSize: 24,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },

    // ==================
    // MANUFACTURED Products - Health & Beauty (retail-friendly lot sizes)
    // ==================
    'Cold Medicine': {
        lotSize: 144,       // Retail: ~1 case per lot
        unit: 'box',
        perishable: false,
        hoursToForm: 48
    },
    'Pain Killers': {
        lotSize: 168,       // Retail: ~1 case per lot
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48
    },
    'Vitamins': {
        lotSize: 120,       // Retail: ~1 case per lot
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48
    },
    'Shampoo': {
        lotSize: 168,       // Retail: ~1 case per lot
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48
    },
    'Deodorant': {
        lotSize: 192,       // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Soap': {
        lotSize: 240,       // Retail: ~1 case per lot
        unit: 'bar',
        perishable: false,
        hoursToForm: 48
    },
    'Toothpaste': {
        lotSize: 216,       // Retail: ~1 case per lot
        unit: 'tube',
        perishable: false,
        hoursToForm: 48
    },
    'Makeup': {
        lotSize: 96,        // Retail: ~1 case per lot
        unit: 'kit',
        perishable: false,
        hoursToForm: 48
    },
    'Perfume': {
        lotSize: 72,        // Retail: ~1 case per lot
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48
    },
    'Glasses': {
        lotSize: 60,        // Retail: ~1 case per lot
        unit: 'pair',
        perishable: false,
        hoursToForm: 48
    },

    // ==================
    // MANUFACTURED Products - Auto & Hardware (retail-friendly lot sizes)
    // ==================
    'Tools': {
        lotSize: 84,        // Retail: ~1 case per lot
        unit: 'set',
        perishable: false,
        hoursToForm: 48
    },
    'Tires': {
        lotSize: 60,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Auto Parts': {
        lotSize: 72,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Oil & Fluids': {
        lotSize: 144,       // Retail: ~1 case per lot
        unit: 'gallon',
        perishable: false,
        hoursToForm: 48
    },
    'Car Battery': {
        lotSize: 48,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },

    // ==================
    // MANUFACTURED Products - Cleaning (retail-friendly lot sizes)
    // ==================
    'Cleaning Supplies': {
        lotSize: 168,       // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Vacuums': {
        lotSize: 36,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Paper Towels': {
        lotSize: 216,       // Retail: ~1 case per lot
        unit: 'pack',
        perishable: false,
        hoursToForm: 48
    },
    'Trash Bags': {
        lotSize: 192,       // Retail: ~1 case per lot
        unit: 'box',
        perishable: false,
        hoursToForm: 48
    },

    // ==================
    // MANUFACTURED Products - Furniture (retail-friendly lot sizes)
    // ==================
    'Sofa': {
        lotSize: 12,        // Retail: small furniture lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Dresser': {
        lotSize: 24,        // Retail: small furniture lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Beds': {
        lotSize: 18,        // Retail: small furniture lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Tables': {
        lotSize: 24,        // Retail: small furniture lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },

    // ==================
    // MANUFACTURED Products - Appliances (retail-friendly lot sizes)
    // ==================
    'Microwave': {
        lotSize: 48,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Air Conditioner': {
        lotSize: 24,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Washing Machine': {
        lotSize: 24,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Dryer': {
        lotSize: 24,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Bikes': {
        lotSize: 36,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },

    // ==================
    // MANUFACTURED Products - Electronics (retail-friendly lot sizes)
    // ==================
    'Laptops': {
        lotSize: 24,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Personal Computer': {
        lotSize: 24,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Tablets': {
        lotSize: 36,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Monitors': {
        lotSize: 48,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Cellphone': {
        lotSize: 36,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'TV': {
        lotSize: 36,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Console': {
        lotSize: 36,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Headphones': {
        lotSize: 84,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Printers': {
        lotSize: 36,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Cameras': {
        lotSize: 48,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Batteries': {
        lotSize: 240,       // Retail: ~1 case per lot
        unit: 'pack',
        perishable: false,
        hoursToForm: 48
    },
    'Drones': {
        lotSize: 24,        // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Toys': {
        lotSize: 120,       // Retail: ~1 case per lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },

    // ==================
    // MANUFACTURED Products - Vehicles (retail-friendly lot sizes)
    // ==================
    'Cars': {
        lotSize: 6,         // Retail: small dealer lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },
    'Motorcycles': {
        lotSize: 12,        // Retail: small dealer lot
        unit: 'unit',
        perishable: false,
        hoursToForm: 48
    },

    // ==================
    // MANUFACTURED Products - Construction (retail-friendly lot sizes)
    // ==================
    'Cement': {
        lotSize: 120,       // Retail: ~1 pallet per lot
        unit: 'bag',
        perishable: false,
        hoursToForm: 48
    }
};

/**
 * Get the lot size configuration for a product
 * @param {string} productName - Name of the product
 * @param {Object} productRegistry - Optional product registry for tier lookup
 * @returns {Object|null} Lot configuration or null if not found
 */
export function getLotConfigForProduct(productName, productRegistry = null) {
    // Check if product has explicit lot configuration
    if (LOT_SIZING_CONFIG[productName]) {
        return LOT_SIZING_CONFIG[productName];
    }

    // If product registry provided, check if it's a product that uses lots
    if (productRegistry) {
        const product = productRegistry.getProductByName(productName);
        if (product) {
            // All tiers now use lot system
            if (product.tier === 'RAW' || product.tier === 'SEMI_RAW' || product.tier === 'MANUFACTURED') {
                // Return default lot config based on tier
                return getDefaultLotConfig(product.tier, product.unit);
            }
        }
    }

    return null;
}

/**
 * Get the lot size for a product
 * @param {string} productName - Name of the product
 * @param {Object} productRegistry - Optional product registry
 * @returns {number} Lot size or 0 if not a lot-based product
 */
export function getLotSizeForProduct(productName, productRegistry = null) {
    const config = getLotConfigForProduct(productName, productRegistry);
    return config ? config.lotSize : 0;
}

/**
 * Check if a product is perishable
 * @param {string} productName - Name of the product
 * @returns {boolean}
 */
export function isPerishable(productName) {
    const config = LOT_SIZING_CONFIG[productName];
    return config ? config.perishable : false;
}

/**
 * Get shelf life in days for a perishable product
 * @param {string} productName - Name of the product
 * @returns {number|null} Shelf life in days or null if not perishable
 */
export function getShelfLife(productName) {
    const config = LOT_SIZING_CONFIG[productName];
    if (config && config.perishable) {
        return config.shelfLifeDays;
    }
    return null;
}

/**
 * Get the unit type for a product
 * @param {string} productName - Name of the product
 * @returns {string} Unit type (ton, barrel, etc.) or 'unit' as default
 */
export function getLotUnit(productName) {
    const config = LOT_SIZING_CONFIG[productName];
    return config ? config.unit : 'unit';
}

/**
 * Calculate approximate hours to form a lot based on production rate
 * @param {string} productName - Name of the product
 * @returns {number|null} Hours to form or null if harvest-based
 */
export function getHoursToFormLot(productName) {
    const config = LOT_SIZING_CONFIG[productName];
    return config ? config.hoursToForm : null;
}

/**
 * Get default lot configuration for products not explicitly configured
 * All defaults use 48hr lot formation time
 * @param {string} tier - Product tier (RAW, SEMI_RAW, or MANUFACTURED)
 * @param {string} unit - Product unit
 * @returns {Object} Default lot configuration
 */
export function getDefaultLotConfig(tier, unit) {
    if (tier === 'RAW') {
        return {
            lotSize: 2400,  // ~50 units/hr * 48 hrs
            unit: unit || 'unit',
            perishable: false,
            hoursToForm: 48
        };
    } else if (tier === 'SEMI_RAW') {
        return {
            lotSize: 1920,  // ~40 units/hr * 48 hrs
            unit: unit || 'unit',
            perishable: false,
            hoursToForm: 48
        };
    } else if (tier === 'MANUFACTURED') {
        return {
            lotSize: 72,    // Retail-friendly default (~1 case)
            unit: unit || 'unit',
            perishable: false,
            hoursToForm: 48
        };
    }
    return null;
}

/**
 * Check if a product should use the lot system
 * @param {string} productName - Name of the product
 * @param {Object} productRegistry - Product registry for tier lookup
 * @returns {boolean}
 */
export function usesLotSystem(productName, productRegistry) {
    // Check if explicitly configured (includes RAW, SEMI_RAW, and MANUFACTURED)
    if (LOT_SIZING_CONFIG[productName]) {
        return true;
    }

    // Check product tier from registry - all tiers now use lots
    if (productRegistry) {
        const product = productRegistry.getProductByName(productName);
        if (product && (product.tier === 'RAW' || product.tier === 'SEMI_RAW' || product.tier === 'MANUFACTURED')) {
            return true;
        }
    }

    return false;
}

/**
 * Get recommended sale strategy for a product based on perishability
 * @param {string} productName - Name of the product
 * @returns {string} Recommended sale strategy
 */
export function getRecommendedSaleStrategy(productName) {
    if (isPerishable(productName)) {
        return 'EXPIRING_SOON';
    }
    return 'FIFO';
}

/**
 * Calculate how many lots would be formed from a given quantity
 * @param {string} productName - Name of the product
 * @param {number} quantity - Total quantity
 * @returns {{ fullLots: number, remainder: number, lotSize: number }}
 */
export function calculateLotsFromQuantity(productName, quantity) {
    const lotSize = getLotSizeForProduct(productName);
    if (lotSize === 0) {
        return { fullLots: 0, remainder: quantity, lotSize: 0 };
    }

    const fullLots = Math.floor(quantity / lotSize);
    const remainder = quantity % lotSize;

    return { fullLots, remainder, lotSize };
}

/**
 * Calculate how many lots are needed to fulfill a quantity request
 * @param {string} productName - Name of the product
 * @param {number} requestedQuantity - Quantity requested
 * @returns {{ lotsNeeded: number, totalQuantity: number, lotSize: number }}
 */
export function calculateLotsNeeded(productName, requestedQuantity) {
    const lotSize = getLotSizeForProduct(productName);
    if (lotSize === 0) {
        return { lotsNeeded: 0, totalQuantity: 0, lotSize: 0 };
    }

    // Round to nearest whole lot
    const lotsNeeded = Math.round(requestedQuantity / lotSize);
    const totalQuantity = lotsNeeded * lotSize;

    return { lotsNeeded, totalQuantity, lotSize };
}
