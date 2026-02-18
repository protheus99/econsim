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
    // RAW Materials - Mining
    // ==================
    'Iron Ore': {
        lotSize: 500,
        unit: 'ton',
        perishable: false,
        hoursToForm: 8  // ~60 units/hr * 8 hrs = 480, forms at 500
    },
    'Coal': {
        lotSize: 1000,
        unit: 'ton',
        perishable: false,
        hoursToForm: 12  // ~80 units/hr * 12 hrs = 960
    },
    'Crude Oil': {
        lotSize: 1000,
        unit: 'barrel',
        perishable: false,
        hoursToForm: 8  // ~120 units/hr * 8 hrs = 960
    },
    'Gold Ore': {
        lotSize: 250,
        unit: 'oz',
        perishable: false,
        hoursToForm: 17  // ~15 units/hr * 17 hrs = 255
    },
    'Silver Ore': {
        lotSize: 400,
        unit: 'oz',
        perishable: false,
        hoursToForm: 20  // ~20 units/hr * 20 hrs = 400
    },
    'Copper Ore': {
        lotSize: 500,
        unit: 'ton',
        perishable: false,
        hoursToForm: 11  // ~45 units/hr * 11 hrs = 495
    },
    'Aluminum Ore': {
        lotSize: 500,
        unit: 'ton',
        perishable: false,
        hoursToForm: 10  // ~50 units/hr * 10 hrs = 500
    },
    'Limestone': {
        lotSize: 1000,
        unit: 'ton',
        perishable: false,
        hoursToForm: 10  // ~100 units/hr * 10 hrs = 1000
    },
    'Salt': {
        lotSize: 700,
        unit: 'ton',
        perishable: false,
        hoursToForm: 10  // ~70 units/hr * 10 hrs = 700
    },
    'Natural Gas': {
        lotSize: 2000,
        unit: 'mcf',
        perishable: false,
        hoursToForm: 10  // ~200 units/hr * 10 hrs = 2000
    },

    // ==================
    // RAW Materials - Logging
    // ==================
    'Softwood Logs': {
        lotSize: 50,
        unit: 'cord',
        perishable: false,
        hoursToForm: 2  // ~30 units/hr * 2 hrs = 60, forms at 50
    },
    'Hardwood Logs': {
        lotSize: 25,
        unit: 'cord',
        perishable: false,
        hoursToForm: 1.25  // ~20 units/hr * 1.25 hrs = 25
    },
    'Bamboo': {
        lotSize: 50,
        unit: 'cord',
        perishable: false,
        hoursToForm: 2
    },

    // ==================
    // RAW Materials - Agriculture (Crops)
    // ==================
    'Wheat': {
        lotSize: 1000,
        unit: 'bushel',
        perishable: false,
        hoursToForm: null  // Harvest-based, not hourly
    },
    'Rice': {
        lotSize: 1000,
        unit: 'bushel',
        perishable: false,
        hoursToForm: null
    },
    'Corn': {
        lotSize: 1000,
        unit: 'bushel',
        perishable: false,
        hoursToForm: null
    },
    'Cotton': {
        lotSize: 100,
        unit: 'bale',
        perishable: false,
        hoursToForm: null
    },
    'Sugarcane': {
        lotSize: 500,
        unit: 'ton',
        perishable: false,
        hoursToForm: null
    },
    'Coffee Beans': {
        lotSize: 50,
        unit: 'bag',
        perishable: false,
        hoursToForm: null
    },

    // ==================
    // RAW Materials - Agriculture (Livestock)
    // ==================
    'Cattle': {
        lotSize: 20,
        unit: 'head',
        perishable: false,
        hoursToForm: 10  // ~2 units/hr * 10 hrs = 20
    },
    'Pigs': {
        lotSize: 50,
        unit: 'head',
        perishable: false,
        hoursToForm: 10  // ~5 units/hr * 10 hrs = 50
    },
    'Chickens': {
        lotSize: 200,
        unit: 'dozen',
        perishable: false,
        hoursToForm: 10  // ~20 units/hr * 10 hrs = 200
    },
    'Sheep': {
        lotSize: 30,
        unit: 'head',
        perishable: false,
        hoursToForm: 10
    },
    'Raw Milk': {
        lotSize: 500,
        unit: 'gallon',
        perishable: true,
        shelfLifeDays: 7,
        hoursToForm: 5  // ~100 units/hr * 5 hrs = 500
    },
    'Eggs': {
        lotSize: 100,
        unit: 'dozen',
        perishable: true,
        shelfLifeDays: 14,
        hoursToForm: 2  // ~50 units/hr * 2 hrs = 100
    },

    // ==================
    // SEMI_RAW Products - Metals
    // ==================
    'Steel': {
        lotSize: 25,
        unit: 'ton',
        perishable: false,
        hoursToForm: 1  // ~30 units/hr processed
    },
    'Copper Wire': {
        lotSize: 35,
        unit: 'spool',
        perishable: false,
        hoursToForm: 1  // ~35 units/hr
    },
    'Aluminum Sheets': {
        lotSize: 40,
        unit: 'sheet',
        perishable: false,
        hoursToForm: 1  // ~40 units/hr
    },

    // ==================
    // SEMI_RAW Products - Fuels
    // ==================
    'Gasoline': {
        lotSize: 100,
        unit: 'barrel',
        perishable: false,
        hoursToForm: 1.25  // ~80 units/hr * 1.25 = 100
    },
    'Diesel': {
        lotSize: 100,
        unit: 'barrel',
        perishable: false,
        hoursToForm: 1.4  // ~70 units/hr * 1.4 = 98
    },

    // ==================
    // SEMI_RAW Products - Lumber
    // ==================
    'Plywood': {
        lotSize: 50,
        unit: 'sheet',
        perishable: false,
        hoursToForm: 2  // ~25 units/hr * 2 = 50
    },
    'Wood Pulp': {
        lotSize: 40,
        unit: 'ton',
        perishable: false,
        hoursToForm: 2  // ~20 units/hr * 2 = 40
    },

    // ==================
    // SEMI_RAW Products - Food Ingredients
    // ==================
    'Flour': {
        lotSize: 100,
        unit: 'bag',
        perishable: false,
        hoursToForm: 1.7  // ~60 units/hr * 1.7 = 102
    },
    'Sugar': {
        lotSize: 100,
        unit: 'bag',
        perishable: false,
        hoursToForm: 2  // ~50 units/hr * 2 = 100
    },

    // ==================
    // SEMI_RAW Products - Textiles
    // ==================
    'Cotton Fabric': {
        lotSize: 50,
        unit: 'bolt',
        perishable: false,
        hoursToForm: 1.7  // ~30 units/hr * 1.7 = 51
    },

    // ==================
    // SEMI_RAW Products - Dairy & Meat (Perishable)
    // ==================
    'Pasteurized Milk': {
        lotSize: 100,
        unit: 'gallon',
        perishable: true,
        shelfLifeDays: 14,
        hoursToForm: 1.25  // ~80 units/hr * 1.25 = 100
    },
    'Beef': {
        lotSize: 10,
        unit: 'cwt',
        perishable: true,
        shelfLifeDays: 5,
        hoursToForm: 1.25  // ~8 units/hr * 1.25 = 10
    },
    'Pork': {
        lotSize: 20,
        unit: 'cwt',
        perishable: true,
        shelfLifeDays: 5,
        hoursToForm: 1.3  // ~15 units/hr * 1.3 = 19.5
    },
    'Chicken': {
        lotSize: 100,
        unit: 'lb',
        perishable: true,
        shelfLifeDays: 4,
        hoursToForm: 2  // ~50 units/hr * 2 = 100
    },

    // ==================
    // MANUFACTURED Products - Grocery
    // ==================
    'Bread': {
        lotSize: 100,
        unit: 'loaf',
        perishable: true,
        shelfLifeDays: 5,
        hoursToForm: 1
    },
    'Meat': {
        lotSize: 60,
        unit: 'lb',
        perishable: true,
        shelfLifeDays: 5,
        hoursToForm: 1
    },
    'Seafood': {
        lotSize: 40,
        unit: 'lb',
        perishable: true,
        shelfLifeDays: 3,
        hoursToForm: 1
    },
    'Fruits': {
        lotSize: 80,
        unit: 'lb',
        perishable: true,
        shelfLifeDays: 7,
        hoursToForm: 1
    },
    'Breakfast Cereal': {
        lotSize: 70,
        unit: 'box',
        perishable: false,
        hoursToForm: 1
    },
    'Cake': {
        lotSize: 30,
        unit: 'unit',
        perishable: true,
        shelfLifeDays: 4,
        hoursToForm: 1
    },
    'Candy': {
        lotSize: 100,
        unit: 'bag',
        perishable: false,
        hoursToForm: 1
    },
    'Ice Cream': {
        lotSize: 60,
        unit: 'pint',
        perishable: true,
        shelfLifeDays: 30,
        hoursToForm: 1
    },
    'Soda': {
        lotSize: 150,
        unit: 'can',
        perishable: false,
        hoursToForm: 1
    },
    'Alcohol': {
        lotSize: 50,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 1
    },
    'Canned Goods': {
        lotSize: 80,
        unit: 'can',
        perishable: false,
        hoursToForm: 1
    },
    'Cooking Oil': {
        lotSize: 70,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 1
    },

    // ==================
    // MANUFACTURED Products - Clothing & Accessories
    // ==================
    'Shirts': {
        lotSize: 40,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Jackets': {
        lotSize: 20,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Jeans': {
        lotSize: 30,
        unit: 'pair',
        perishable: false,
        hoursToForm: 1
    },
    'Sweaters': {
        lotSize: 25,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Shoes': {
        lotSize: 25,
        unit: 'pair',
        perishable: false,
        hoursToForm: 1
    },
    'Socks': {
        lotSize: 80,
        unit: 'pair',
        perishable: false,
        hoursToForm: 1
    },
    'Watches': {
        lotSize: 15,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Jewelry': {
        lotSize: 10,
        unit: 'piece',
        perishable: false,
        hoursToForm: 1
    },
    'Belts': {
        lotSize: 40,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Bags': {
        lotSize: 30,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },

    // ==================
    // MANUFACTURED Products - Baby
    // ==================
    'Diapers': {
        lotSize: 60,
        unit: 'pack',
        perishable: false,
        hoursToForm: 1
    },
    'Formula': {
        lotSize: 50,
        unit: 'can',
        perishable: false,
        hoursToForm: 1
    },
    'Car Seats': {
        lotSize: 15,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Strollers': {
        lotSize: 12,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },

    // ==================
    // MANUFACTURED Products - Health & Beauty
    // ==================
    'Cold Medicine': {
        lotSize: 60,
        unit: 'box',
        perishable: false,
        hoursToForm: 1
    },
    'Pain Killers': {
        lotSize: 70,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 1
    },
    'Vitamins': {
        lotSize: 50,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 1
    },
    'Shampoo': {
        lotSize: 70,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 1
    },
    'Deodorant': {
        lotSize: 80,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Soap': {
        lotSize: 100,
        unit: 'bar',
        perishable: false,
        hoursToForm: 1
    },
    'Toothpaste': {
        lotSize: 90,
        unit: 'tube',
        perishable: false,
        hoursToForm: 1
    },
    'Makeup': {
        lotSize: 40,
        unit: 'kit',
        perishable: false,
        hoursToForm: 1
    },
    'Perfume': {
        lotSize: 30,
        unit: 'bottle',
        perishable: false,
        hoursToForm: 1
    },
    'Glasses': {
        lotSize: 25,
        unit: 'pair',
        perishable: false,
        hoursToForm: 1
    },

    // ==================
    // MANUFACTURED Products - Auto & Hardware
    // ==================
    'Tools': {
        lotSize: 35,
        unit: 'set',
        perishable: false,
        hoursToForm: 1
    },
    'Tires': {
        lotSize: 25,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Auto Parts': {
        lotSize: 30,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Oil & Fluids': {
        lotSize: 60,
        unit: 'gallon',
        perishable: false,
        hoursToForm: 1
    },
    'Car Battery': {
        lotSize: 20,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },

    // ==================
    // MANUFACTURED Products - Cleaning
    // ==================
    'Cleaning Supplies': {
        lotSize: 70,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Vacuums': {
        lotSize: 18,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Paper Towels': {
        lotSize: 90,
        unit: 'pack',
        perishable: false,
        hoursToForm: 1
    },
    'Trash Bags': {
        lotSize: 80,
        unit: 'box',
        perishable: false,
        hoursToForm: 1
    },

    // ==================
    // MANUFACTURED Products - Furniture
    // ==================
    'Sofa': {
        lotSize: 6,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Dresser': {
        lotSize: 10,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Beds': {
        lotSize: 8,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Tables': {
        lotSize: 12,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },

    // ==================
    // MANUFACTURED Products - Appliances
    // ==================
    'Microwave': {
        lotSize: 20,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Air Conditioner': {
        lotSize: 12,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Washing Machine': {
        lotSize: 10,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Dryer': {
        lotSize: 10,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Bikes': {
        lotSize: 15,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },

    // ==================
    // MANUFACTURED Products - Electronics
    // ==================
    'Laptops': {
        lotSize: 10,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Personal Computer': {
        lotSize: 12,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Tablets': {
        lotSize: 18,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Monitors': {
        lotSize: 20,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Cellphone': {
        lotSize: 15,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'TV': {
        lotSize: 15,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Console': {
        lotSize: 18,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Headphones': {
        lotSize: 35,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Printers': {
        lotSize: 18,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Cameras': {
        lotSize: 20,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Batteries': {
        lotSize: 100,
        unit: 'pack',
        perishable: false,
        hoursToForm: 1
    },
    'Drones': {
        lotSize: 12,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Toys': {
        lotSize: 50,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },

    // ==================
    // MANUFACTURED Products - Vehicles
    // ==================
    'Cars': {
        lotSize: 2,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },
    'Motorcycles': {
        lotSize: 5,
        unit: 'unit',
        perishable: false,
        hoursToForm: 1
    },

    // ==================
    // MANUFACTURED Products - Construction
    // ==================
    'Cement': {
        lotSize: 50,
        unit: 'bag',
        perishable: false,
        hoursToForm: 1
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
 * @param {string} tier - Product tier (RAW, SEMI_RAW, or MANUFACTURED)
 * @param {string} unit - Product unit
 * @returns {Object} Default lot configuration
 */
export function getDefaultLotConfig(tier, unit) {
    if (tier === 'RAW') {
        return {
            lotSize: 100,
            unit: unit || 'unit',
            perishable: false,
            hoursToForm: 2
        };
    } else if (tier === 'SEMI_RAW') {
        return {
            lotSize: 50,
            unit: unit || 'unit',
            perishable: false,
            hoursToForm: 1
        };
    } else if (tier === 'MANUFACTURED') {
        return {
            lotSize: 25,
            unit: unit || 'unit',
            perishable: false,
            hoursToForm: 1
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
