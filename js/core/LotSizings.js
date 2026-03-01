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
    // MANUFACTURED Products - Grocery (48hr lot formation)
    // ==================
    'Bread': {
        lotSize: 4800,
        unit: 'loaf',
        perishable: true,
        shelfLifeDays: 5,
        hoursToForm: 48  // ~100 units/hr * 48 hrs
    },
    'Meat': {
        lotSize: 2880,
        unit: 'lb',
        perishable: true,
        shelfLifeDays: 5,
        hoursToForm: 48  // ~60 units/hr * 48 hrs
    },
    'Seafood': {
        lotSize: 1920,
        unit: 'lb',
        perishable: true,
        shelfLifeDays: 3,
        hoursToForm: 48  // ~40 units/hr * 48 hrs
    },
    'Fruits': {
        lotSize: 3840,
        unit: 'lb',
        perishable: true,
        shelfLifeDays: 7,
        hoursToForm: 48  // ~80 units/hr * 48 hrs
    },
    'Breakfast Cereal': {
        lotSize: 3360,
        unit: 'box',
        perishable: false,
        hoursToForm: 48  // ~70 units/hr * 48 hrs
    },
    'Cake': {
        lotSize: 1440,
        unit: 'unit',
        perishable: true,
        shelfLifeDays: 4,
        hoursToForm: 48  // ~30 units/hr * 48 hrs
    },
    'Candy': {
        lotSize: 4800,
        unit: 'bag',
        perishable: false,
        hoursToForm: 48  // ~100 units/hr * 48 hrs
    },
    'Ice Cream': {
        lotSize: 2880,
        unit: 'pint',
        perishable: true,
        shelfLifeDays: 30,
        hoursToForm: 48  // ~60 units/hr * 48 hrs
    },
    'Soda': {
        lotSize: 7200,
        unit: 'can',
        perishable: false,
        hoursToForm: 48  // ~150 units/hr * 48 hrs
    },
    'Alcohol': {
        lotSize: 2400,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48  // ~50 units/hr * 48 hrs
    },
    'Canned Goods': {
        lotSize: 3840,
        unit: 'can',
        perishable: false,
        hoursToForm: 48  // ~80 units/hr * 48 hrs
    },
    'Cooking Oil': {
        lotSize: 3360,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48  // ~70 units/hr * 48 hrs
    },

    // ==================
    // MANUFACTURED Products - Clothing & Accessories (48hr lot formation)
    // ==================
    'Shirts': {
        lotSize: 1920,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~40 units/hr * 48 hrs
    },
    'Jackets': {
        lotSize: 960,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~20 units/hr * 48 hrs
    },
    'Jeans': {
        lotSize: 1440,
        unit: 'pair',
        perishable: false,
        hoursToForm: 48  // ~30 units/hr * 48 hrs
    },
    'Sweaters': {
        lotSize: 1200,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~25 units/hr * 48 hrs
    },
    'Shoes': {
        lotSize: 1200,
        unit: 'pair',
        perishable: false,
        hoursToForm: 48  // ~25 units/hr * 48 hrs
    },
    'Socks': {
        lotSize: 3840,
        unit: 'pair',
        perishable: false,
        hoursToForm: 48  // ~80 units/hr * 48 hrs
    },
    'Watches': {
        lotSize: 720,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~15 units/hr * 48 hrs
    },
    'Jewelry': {
        lotSize: 480,
        unit: 'piece',
        perishable: false,
        hoursToForm: 48  // ~10 units/hr * 48 hrs
    },
    'Belts': {
        lotSize: 1920,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~40 units/hr * 48 hrs
    },
    'Bags': {
        lotSize: 1440,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~30 units/hr * 48 hrs
    },

    // ==================
    // MANUFACTURED Products - Baby (48hr lot formation)
    // ==================
    'Diapers': {
        lotSize: 2880,
        unit: 'pack',
        perishable: false,
        hoursToForm: 48  // ~60 units/hr * 48 hrs
    },
    'Formula': {
        lotSize: 2400,
        unit: 'can',
        perishable: false,
        hoursToForm: 48  // ~50 units/hr * 48 hrs
    },
    'Car Seats': {
        lotSize: 720,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~15 units/hr * 48 hrs
    },
    'Strollers': {
        lotSize: 576,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~12 units/hr * 48 hrs
    },

    // ==================
    // MANUFACTURED Products - Health & Beauty (48hr lot formation)
    // ==================
    'Cold Medicine': {
        lotSize: 2880,
        unit: 'box',
        perishable: false,
        hoursToForm: 48  // ~60 units/hr * 48 hrs
    },
    'Pain Killers': {
        lotSize: 3360,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48  // ~70 units/hr * 48 hrs
    },
    'Vitamins': {
        lotSize: 2400,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48  // ~50 units/hr * 48 hrs
    },
    'Shampoo': {
        lotSize: 3360,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48  // ~70 units/hr * 48 hrs
    },
    'Deodorant': {
        lotSize: 3840,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~80 units/hr * 48 hrs
    },
    'Soap': {
        lotSize: 4800,
        unit: 'bar',
        perishable: false,
        hoursToForm: 48  // ~100 units/hr * 48 hrs
    },
    'Toothpaste': {
        lotSize: 4320,
        unit: 'tube',
        perishable: false,
        hoursToForm: 48  // ~90 units/hr * 48 hrs
    },
    'Makeup': {
        lotSize: 1920,
        unit: 'kit',
        perishable: false,
        hoursToForm: 48  // ~40 units/hr * 48 hrs
    },
    'Perfume': {
        lotSize: 1440,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 48  // ~30 units/hr * 48 hrs
    },
    'Glasses': {
        lotSize: 1200,
        unit: 'pair',
        perishable: false,
        hoursToForm: 48  // ~25 units/hr * 48 hrs
    },

    // ==================
    // MANUFACTURED Products - Auto & Hardware (48hr lot formation)
    // ==================
    'Tools': {
        lotSize: 1680,
        unit: 'set',
        perishable: false,
        hoursToForm: 48  // ~35 units/hr * 48 hrs
    },
    'Tires': {
        lotSize: 1200,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~25 units/hr * 48 hrs
    },
    'Auto Parts': {
        lotSize: 1440,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~30 units/hr * 48 hrs
    },
    'Oil & Fluids': {
        lotSize: 2880,
        unit: 'gallon',
        perishable: false,
        hoursToForm: 48  // ~60 units/hr * 48 hrs
    },
    'Car Battery': {
        lotSize: 960,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~20 units/hr * 48 hrs
    },

    // ==================
    // MANUFACTURED Products - Cleaning (48hr lot formation)
    // ==================
    'Cleaning Supplies': {
        lotSize: 3360,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~70 units/hr * 48 hrs
    },
    'Vacuums': {
        lotSize: 864,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~18 units/hr * 48 hrs
    },
    'Paper Towels': {
        lotSize: 4320,
        unit: 'pack',
        perishable: false,
        hoursToForm: 48  // ~90 units/hr * 48 hrs
    },
    'Trash Bags': {
        lotSize: 3840,
        unit: 'box',
        perishable: false,
        hoursToForm: 48  // ~80 units/hr * 48 hrs
    },

    // ==================
    // MANUFACTURED Products - Furniture (48hr lot formation)
    // ==================
    'Sofa': {
        lotSize: 288,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~6 units/hr * 48 hrs
    },
    'Dresser': {
        lotSize: 480,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~10 units/hr * 48 hrs
    },
    'Beds': {
        lotSize: 384,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~8 units/hr * 48 hrs
    },
    'Tables': {
        lotSize: 576,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~12 units/hr * 48 hrs
    },

    // ==================
    // MANUFACTURED Products - Appliances (48hr lot formation)
    // ==================
    'Microwave': {
        lotSize: 960,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~20 units/hr * 48 hrs
    },
    'Air Conditioner': {
        lotSize: 576,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~12 units/hr * 48 hrs
    },
    'Washing Machine': {
        lotSize: 480,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~10 units/hr * 48 hrs
    },
    'Dryer': {
        lotSize: 480,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~10 units/hr * 48 hrs
    },
    'Bikes': {
        lotSize: 720,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~15 units/hr * 48 hrs
    },

    // ==================
    // MANUFACTURED Products - Electronics (48hr lot formation)
    // ==================
    'Laptops': {
        lotSize: 480,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~10 units/hr * 48 hrs
    },
    'Personal Computer': {
        lotSize: 576,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~12 units/hr * 48 hrs
    },
    'Tablets': {
        lotSize: 864,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~18 units/hr * 48 hrs
    },
    'Monitors': {
        lotSize: 960,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~20 units/hr * 48 hrs
    },
    'Cellphone': {
        lotSize: 720,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~15 units/hr * 48 hrs
    },
    'TV': {
        lotSize: 720,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~15 units/hr * 48 hrs
    },
    'Console': {
        lotSize: 864,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~18 units/hr * 48 hrs
    },
    'Headphones': {
        lotSize: 1680,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~35 units/hr * 48 hrs
    },
    'Printers': {
        lotSize: 864,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~18 units/hr * 48 hrs
    },
    'Cameras': {
        lotSize: 960,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~20 units/hr * 48 hrs
    },
    'Batteries': {
        lotSize: 4800,
        unit: 'pack',
        perishable: false,
        hoursToForm: 48  // ~100 units/hr * 48 hrs
    },
    'Drones': {
        lotSize: 576,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~12 units/hr * 48 hrs
    },
    'Toys': {
        lotSize: 2400,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~50 units/hr * 48 hrs
    },

    // ==================
    // MANUFACTURED Products - Vehicles (48hr lot formation)
    // ==================
    'Cars': {
        lotSize: 96,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~2 units/hr * 48 hrs
    },
    'Motorcycles': {
        lotSize: 240,
        unit: 'unit',
        perishable: false,
        hoursToForm: 48  // ~5 units/hr * 48 hrs
    },

    // ==================
    // MANUFACTURED Products - Construction (48hr lot formation)
    // ==================
    'Cement': {
        lotSize: 2400,
        unit: 'bag',
        perishable: false,
        hoursToForm: 48  // ~50 units/hr * 48 hrs
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
            lotSize: 1440,  // ~30 units/hr * 48 hrs
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
