/**
 * JSDoc Type Definitions for Economic Simulation
 *
 * This file provides type information for VS Code IntelliSense.
 * Import types using: @type {import('./types.js').TypeName}
 *
 * @module types
 */

// ============= CITY =============

/**
 * City coordinates using x/y system (NOT lat/lng).
 * Range: 0-1000 for both x and y.
 *
 * @typedef {Object} CityCoordinates
 * @property {number} x - X coordinate (0-1000), NOT lat
 * @property {number} y - Y coordinate (0-1000), NOT lng
 */

/**
 * City demographic breakdown.
 * Access via city.demographics, NOT directly on city.
 *
 * @typedef {Object} CityDemographics
 * @property {number} total - Total population
 * @property {number} employed - Number employed (use this, NOT city.employed)
 * @property {number} unemployed - Number unemployed
 * @property {number} workingAge - Working age population
 * @property {number} nonWorking - Non-working population (children, retired)
 * @property {number} nonWorkingPercent - Percentage non-working
 * @property {number} employedPercent - Employment rate
 */

/**
 * City economic class data.
 *
 * @typedef {Object} EconomicClass
 * @property {string} name - Class name (lower, working, lowerMiddle, upperMiddle, upper, rich)
 * @property {number} count - Number of people in this class
 * @property {number} percentage - Percentage of employed population
 * @property {{min: number, max: number}} salaryRange - Salary range for this class
 * @property {number} avgSalary - Average salary
 * @property {number} totalIncome - Total income for this class
 * @property {number} disposableIncome - Average disposable income
 */

/**
 * City - PROPERTY NOTES:
 * - Use `hasAirport`, `hasSeaport`, `hasRailway` directly (NOT infrastructure.hasXxx)
 * - Use `totalPurchasingPower` for economic output (NOT gdp - cities don't have GDP)
 * - Use `coordinates.x/y` (NOT lat/lng)
 * - Use `demographics.employed` (NOT city.employed directly)
 *
 * @typedef {Object} City
 * @property {string} id - Format: CITY_lowercase_name
 * @property {string} name - City name
 * @property {number} population - Total population
 * @property {number} salaryLevel - Salary level multiplier (0.1-1.0)
 * @property {number} totalPurchasingPower - USE THIS for economic output (NOT gdp)
 * @property {CityCoordinates} coordinates - USE x/y, NOT lat/lng
 * @property {CityDemographics} demographics - Access employed via demographics.employed
 * @property {Object<string, EconomicClass>} economicClasses - Economic class breakdown
 * @property {boolean} hasAirport - Direct property (NOT infrastructure.hasAirport)
 * @property {boolean} hasSeaport - Direct property (NOT infrastructure.hasSeaport)
 * @property {boolean} hasRailway - Direct property (NOT infrastructure.hasRailway)
 * @property {boolean} isCoastal - Whether city is coastal
 * @property {string} climate - COLD, TEMPERATE, or TROPICAL
 * @property {number} costOfLiving - Cost of living multiplier
 * @property {number} consumerConfidence - Consumer confidence (0.3-1.0)
 * @property {number} localPreference - Local business preference (0.0-1.0)
 * @property {number} infrastructureQuality - Infrastructure quality (0.5-1.0)
 * @property {number} unemploymentRate - Unemployment rate
 * @property {Object} marketSize - Market size metrics
 * @property {Country} country - Reference to parent country
 * @property {Firm[]} firms - Firms operating in this city
 * @property {Object} monthlyStats - Monthly statistics
 */

// ============= COUNTRY =============

/**
 * @typedef {Object} Country
 * @property {string} id - Format: COUNTRY_lowercase_name
 * @property {string} name - Country name
 * @property {string} economicLevel - DEVELOPED, EMERGING, or DEVELOPING
 * @property {City[]} cities - Cities in this country
 * @property {number} gdp - Countries have GDP (cities use totalPurchasingPower instead)
 */

// ============= FIRM (Base) =============

/**
 * Firm - PROPERTY NOTES:
 * - Use `getCurrentProfit()` method for real-time profit calculation
 * - Access lots via `lotInventory.getAvailableQuantity()` NOT `.lots` directly
 * - Use `getDisplayName()` method for display name
 *
 * @typedef {Object} Firm
 * @property {string} id - Unique firm identifier
 * @property {string} type - MINING, LOGGING, FARM, MANUFACTURING, RETAIL, BANK
 * @property {string} [name] - Display name (optional)
 * @property {City} city - City where firm is located
 * @property {Country} country - Country where firm is located
 * @property {string} [corporationId] - Parent corporation ID
 * @property {number} cash - Current cash on hand
 * @property {number} revenue - Total revenue
 * @property {number} profit - Total profit
 * @property {number} monthlyRevenue - This month's revenue
 * @property {number} monthlyExpenses - This month's expenses
 * @property {number} monthlyProfit - This month's profit
 * @property {number} totalEmployees - Number of employees
 * @property {number} totalLaborCost - Total labor cost
 * @property {LotInventory} [lotInventory] - Lot inventory (for producers)
 * @property {Object} [inventory] - Unit inventory (for retail)
 */

// ============= LOT SYSTEM =============

/**
 * Individual lot representing a bulk quantity of product.
 *
 * @typedef {Object} Lot
 * @property {string} id - Format: LOT_PRODUCT_timestamp_random
 * @property {string} productName - Name of product
 * @property {number} quantity - Quantity in lot
 * @property {number} quality - Quality score (0-100)
 * @property {string} status - AVAILABLE, RESERVED, IN_TRANSIT, DELIVERED, EXPIRED
 * @property {string} producerId - ID of producing firm
 * @property {number} [createdHour] - Hour lot was created
 * @property {number} [expirationHour] - Hour lot expires (perishables)
 * @property {function(): boolean} isExpired - Check if lot is expired
 */

/**
 * LotInventory - Per-firm lot storage.
 *
 * IMPORTANT:
 * - Use `getAvailableQuantity(productName)` to get quantity
 * - Use `getAvailableLots(productName)` to enumerate lots
 * - NEVER access `.lots` Map directly in UI code
 *
 * @typedef {Object} LotInventory
 * @property {function(string=): number} getAvailableQuantity - Get available qty for product
 * @property {function(string=): Lot[]} getAvailableLots - Get available lots for product
 * @property {function(): Object} getStatus - Get inventory status summary
 * @property {function(Lot): void} addLot - Add a lot (must be Lot instance, not plain object)
 * @property {function(string[]|string, number=): Lot[]|{lots: Lot[], totalRemoved: number}} removeLots - Remove lots by ID or product+qty
 */

// ============= CONTRACTS =============

/**
 * Supply contract between firms.
 *
 * @typedef {Object} Contract
 * @property {string} id - Contract ID
 * @property {string} type - FIXED_VOLUME, MIN_MAX, or EXCLUSIVE
 * @property {string} status - active, pending, completed, terminated, defaulted
 * @property {string} supplierId - Supplier firm ID
 * @property {string} buyerId - Buyer firm ID
 * @property {string} supplierName - Supplier display name
 * @property {string} buyerName - Buyer display name
 * @property {string} product - Product name (alias for productName)
 * @property {string} productName - Product name
 * @property {number} volumePerPeriod - Volume per delivery period
 * @property {string} periodType - DAILY, WEEKLY, or MONTHLY
 * @property {number} pricePerUnit - Agreed price per unit
 * @property {number} startHour - Contract start hour
 * @property {number} [endHour] - Contract end hour (if applicable)
 * @property {function(): boolean} isActive - Check if contract is active
 */

// ============= PRODUCT =============

/**
 * Product definition.
 *
 * @typedef {Object} Product
 * @property {number} id - Product ID
 * @property {string} name - Product name
 * @property {string} tier - RAW, SEMI_RAW, or MANUFACTURED
 * @property {string} category - Product category
 * @property {number} basePrice - Base price per unit
 * @property {string} unit - Unit of measure
 * @property {number} necessityIndex - Necessity index (0-1)
 * @property {boolean} [isPerishable] - Whether product expires
 * @property {number} [shelfLifeDays] - Shelf life in days (perishables)
 */

// ============= GAME CLOCK =============

/**
 * GameClock - IMPORTANT:
 * - Use `totalHours` for scheduling (cumulative since simulation start)
 * - Use `hour` only for time-of-day display (0-23)
 *
 * @typedef {Object} GameClock
 * @property {number} year - Current year
 * @property {number} month - Current month (1-12)
 * @property {number} day - Current day (1-31)
 * @property {number} hour - Current hour (0-23), NOT for scheduling
 * @property {number} totalHours - Cumulative hours since start, USE THIS for scheduling
 * @property {boolean} isPaused - Whether simulation is paused
 * @property {number} speed - Simulation speed multiplier
 */

// ============= SIMULATION ENGINE =============

/**
 * Main simulation engine.
 *
 * @typedef {Object} SimulationEngine
 * @property {GameClock} clock - Game clock
 * @property {Map<string, Country>} countries - All countries
 * @property {Firm[]} firms - All firms
 * @property {Object[]} corporations - All corporations
 * @property {Object} transactionLog - Transaction logging
 * @property {Object} config - Simulation configuration
 */

// ============= CORPORATION =============

/**
 * Corporation owning multiple firms.
 *
 * @typedef {Object} Corporation
 * @property {string} id - Corporation ID
 * @property {string} name - Corporation name
 * @property {Firm[]} firms - Firms owned by this corporation
 * @property {number} totalRevenue - Total revenue across all firms
 * @property {number} totalProfit - Total profit across all firms
 */

// Export empty object to make this a module
export {};
