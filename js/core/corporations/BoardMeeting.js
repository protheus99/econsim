// js/core/corporations/BoardMeeting.js
// Constants shared across the corporate planning system.
// The BoardMeeting class has been removed — planning is handled by CorporateRoadmap.

import { GOAL_TYPES, INDUSTRY_TIERS } from './Corporation.js';

/**
 * Decision types that can be queued in a corporation's roadmap
 */
export const DECISION_TYPES = {
    OPEN_FIRM: 'OPEN_FIRM',
    SIGN_SUPPLY_CONTRACT: 'SIGN_SUPPLY_CONTRACT',
    SIGN_SALES_CONTRACT: 'SIGN_SALES_CONTRACT',
    EXPAND_FIRM: 'EXPAND_FIRM',
    CLOSE_FIRM: 'CLOSE_FIRM',
    HIRE_WORKERS: 'HIRE_WORKERS',
    ENTER_CITY: 'ENTER_CITY',
    DEFER: 'DEFER',
    CONSIDER_VERTICAL_INTEGRATION: 'CONSIDER_VERTICAL_INTEGRATION',
    ACQUIRE_FIRM: 'ACQUIRE_FIRM',
    BUILD_UPSTREAM: 'BUILD_UPSTREAM',
    BUILD_DOWNSTREAM: 'BUILD_DOWNSTREAM'
};

/**
 * Decision priority levels
 */
export const PRIORITY = {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
};

/**
 * Firm creation timeline (months to open)
 */
export const FIRM_CREATION_TIMELINE = {
    MINING_COMPANY: 3,
    LOGGING_COMPANY: 2,
    FARM_CROP: 2,
    FARM_LIVESTOCK: 2,
    STEEL_PROCESSING: 6,
    METAL_PROCESSING: 4,
    PETROLEUM_REFINERY: 8,
    FOOD_PROCESSOR: 3,
    FOOD_INGREDIENT_PROCESSOR: 3,
    DAIRY_PROCESSOR: 3,
    MEAT_PROCESSOR: 3,
    TEXTILE_MILL: 4,
    LUMBER_MILL: 3,
    GLASS_MANUFACTURING: 5,
    CHEMICAL_PRODUCTION: 5,
    RUBBER_PROCESSOR: 4,
    PACKAGED_FOOD: 3,
    BEVERAGE: 3,
    CLOTHING: 2,
    ELECTRONICS: 4,
    APPLIANCE: 4,
    FURNITURE: 3,
    RETAIL_STORE: 2,
    SUPERMARKET: 2,
    CONVENIENCE_STORE: 1,
    DISCOUNT_GROCERY: 2,
    ELECTRONICS_RETAIL: 2,
    FASHION_RETAIL: 2,
    HOME_GOODS_RETAIL: 2,
    AUTO_RETAIL: 3
};

/**
 * Starting capital requirements by tier
 */
export const CAPITAL_REQUIREMENTS = {
    RAW: {
        MINING_COMPANY: 5000000,
        LOGGING_COMPANY: 2000000,
        FARM_CROP: 1500000,
        FARM_LIVESTOCK: 2000000
    },
    SEMI_RAW: {
        STEEL_PROCESSING: 15000000,
        METAL_PROCESSING: 8000000,
        PETROLEUM_REFINERY: 25000000,
        FOOD_INGREDIENT_PROCESSOR: 3000000,
        DAIRY_PROCESSOR: 4000000,
        MEAT_PROCESSOR: 5000000,
        TEXTILE_MILL: 4000000,
        RUBBER_PROCESSOR: 3000000,
        GLASS_MANUFACTURING: 5000000,
        CHEMICAL_PRODUCTION: 8000000,
        LUMBER_MILL: 3000000
    },
    MANUFACTURED: {
        PACKAGED_FOOD: 3000000,
        BEVERAGE: 4000000,
        CLOTHING: 2500000,
        ACCESSORIES: 2000000,
        BABY_PRODUCTS: 2500000,
        HEALTH_PRODUCTS: 4000000,
        BEAUTY_PRODUCTS: 3000000,
        HARDWARE: 2000000,
        AUTO_PARTS: 5000000,
        CLEANING_PRODUCTS: 2500000,
        APPLIANCE: 6000000,
        FURNITURE: 3000000,
        ELECTRONICS: 10000000,
        RECREATION: 2000000,
        VEHICLE: 50000000
    },
    RETAIL: {
        SUPERMARKET: 2000000,
        CONVENIENCE_STORE: 500000,
        DISCOUNT_GROCERY: 1500000,
        PHARMACY: 1000000,
        ELECTRONICS_RETAIL: 1500000,
        FASHION_RETAIL: 800000,
        HOME_GOODS_RETAIL: 1200000,
        AUTO_RETAIL: 2500000,
        HARDWARE_RETAIL: 1500000
    }
};

/**
 * Determine the current economic phase from market state.
 * Used by CorporationManager to log/track overall economy stage.
 */
export function determineEconomicPhase(marketState) {
    const rawFirms = marketState.firmCounts?.[INDUSTRY_TIERS.RAW] || 0;
    const semiRawFirms = marketState.firmCounts?.[INDUSTRY_TIERS.SEMI_RAW] || 0;
    const manufacturedFirms = marketState.firmCounts?.[INDUSTRY_TIERS.MANUFACTURED] || 0;
    const retailFirms = marketState.firmCounts?.[INDUSTRY_TIERS.RETAIL] || 0;

    if (semiRawFirms < rawFirms * 0.3) return 'FOUNDATION';
    if (manufacturedFirms < semiRawFirms * 0.3) return 'PROCESSING';
    if (retailFirms < manufacturedFirms * 0.3) return 'MANUFACTURING';

    const expectedRetail = Math.floor((rawFirms + semiRawFirms + manufacturedFirms) * 0.2);
    if (retailFirms < expectedRetail) return 'RETAIL';

    return 'MATURE';
}
