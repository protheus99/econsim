# Economic Simulation System

A comprehensive web-based economic simulation featuring autonomous cities, corporations, supply chains, and transportation networks. The simulation models realistic economic dynamics including demographics, labor markets, B2B transactions, and consumer behavior.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Core Systems](#core-systems)
- [Economic Model](#economic-model)
- [Firm Types](#firm-types)
- [Supply Chain](#supply-chain)
- [Global Market](#global-market)
- [Inventory Management](#inventory-management)
- [Transportation Network](#transportation-network)
- [Configuration](#configuration)
- [User Interface](#user-interface)
- [Debug Tools](#debug-tools)
- [Development](#development)
- [Roadmap](#roadmap)

## Overview

This simulation creates a dynamic economic world with:

- **25 fictional countries** across 5 continents with trade agreements and tariffs
- **8 cities** with populations ranging from 250K to 5M
- **Config-driven corporations** with 3-letter abbreviations and AI-driven strategies (Conservative, Moderate, Aggressive, Very Aggressive)
- **10-20 firms per city** operating across 6 firm types
- **3-tier supply chain** (RAW → SEMI_RAW → MANUFACTURED)
- **Global market** for materials not available from local producers (with seller inventory deduction)
- **Real-time market activity** with B2B, retail, and consumer transactions displayed in game time
- **Seeded RNG** for deterministic, reproducible simulations

**Time Scale:** 1 real second = 1 game hour (configurable speed: 0.5x to 8x)

## Features

### Simulation Engine
- Real-time economic simulation with hourly, daily, monthly, and yearly cycles
- Three-tier supply chain: RAW → SEMI_RAW → MANUFACTURED → Retail
- Dynamic market pricing based on supply and demand
- Global market fallback for unavailable materials (deducts seller inventory and pays seller)
- Automatic inventory management with reorder thresholds
- Corporation AI with personality types (Conservative, Moderate, Aggressive, Very Aggressive)
- Random economic events affecting market conditions
- Seeded random number generation for deterministic simulation runs
- Config-driven corporation count derived from total expected firms

### City System
- Dynamic population growth (0.1% - 0.3% monthly)
- 6 economic classes with realistic salary distributions
- Employment tracking with unemployment rates
- Infrastructure levels (airports, seaports, railways)
- Consumer confidence affecting purchasing behavior
- Cost of living variations by country development level

### Corporation System
- Config-driven corporation count (derived from `corporations.firmsPerCorp` and total firm count)
- 3-letter abbreviations auto-generated from corporation names (e.g., TechCorp Global → TCG)
- Firm display names use corporation abbreviation (e.g., "TCG Manufacturing")
- O(1) corporation lookups via Map-based indexing
- Revenue, profit, and cash aggregation from owned firms
- Monthly payroll tracking across all facilities
- Different strategic behaviors based on personality type

### Financial System
- Real-time profit tracking (not just month-end)
- Bi-monthly payroll: wages paid on 1st and 15th of each month
- End-of-month expenses: operating costs and loan payments on last day
- Full-precision currency display with comma formatting (e.g., $7,650,504.50)
- Color-coded financials: green for positive, red for negative values

### Market System
- B2B transactions between firms in supply chain
- Retail sales to city populations
- Global market for materials without local producers
- Transaction log with game time timestamps
- Transaction history and market activity charts
- Product pricing with wholesale and retail markups

## Quick Start

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (required for ES6 modules)

### Installation

1. **Clone or download this repository**
```bash
git clone https://github.com/yourusername/economic-simulation.git
cd economic-simulation
```

2. **Start a local web server**

Using Python:
```bash
python -m http.server 8000
```

Using Node.js:
```bash
npx http-server -p 8000
```

Using PHP:
```bash
php -S localhost:8000
```

3. **Open in browser**

Navigate to: `http://localhost:8000`

## Project Structure

```
economic-simulation/
├── index.html                      # Main dashboard
├── global-economy.html             # Global economy overview
├── world-map.html                  # Interactive world map
├── cities.html                     # City details and demographics
├── corporations.html               # Corporation management
├── firms.html                      # Firm details and financials
├── market-activity.html            # Transaction log and market data
├── products.html                   # Product catalog
├── transportation.html             # Transportation network
├── feed.html                       # Event feed
├── README.md                       # This documentation file
├── css/
│   └── styles.css                  # All styling and layout
├── js/
│   ├── main.js                     # Application entry point and initialization
│   ├── core/
│   │   ├── SimulationEngine.js     # Main simulation coordinator
│   │   ├── GameClock.js            # Time management (hours, days, months, years)
│   │   ├── GlobalMarket.js         # Global market for external purchases
│   │   ├── TransactionLog.js       # Transaction recording with game time
│   │   ├── City.js                 # City economic model and demographics
│   │   ├── CityManager.js          # Multi-city management and statistics
│   │   ├── Country.js              # Country definitions and trade agreements
│   │   ├── Product.js              # Product registry and definitions
│   │   ├── TransportationNetwork.js# Transportation cost calculations
│   │   ├── Dashboard.js            # Dashboard UI state management
│   │   └── firms/
│   │       ├── Firm.js             # Base firm class
│   │       ├── MiningCompany.js    # Raw material extraction
│   │       ├── LoggingCompany.js   # Timber production
│   │       ├── Farm.js             # Agricultural production
│   │       ├── ManufacturingPlant.js # Product manufacturing
│   │       ├── RetailStore.js      # Consumer sales
│   │       └── Bank.js             # Financial services
│   ├── pages/
│   │   ├── shared.js               # Shared utilities (formatCurrency, formatNumber, etc.)
│   │   ├── global-economy.js       # Global economy page logic
│   │   ├── world-map.js            # World map page logic
│   │   ├── cities.js               # Cities page logic
│   │   ├── corporations.js         # Corporations page logic
│   │   ├── firms.js                # Firms page logic
│   │   ├── market-activity.js      # Market activity page logic
│   │   ├── products.js             # Products page logic
│   │   ├── transportation.js       # Transportation page logic
│   │   └── feed.js                 # Event feed page logic
│   ├── ui/
│   │   ├── Dashboard.js            # UI updates and user interactions
│   │   └── MapRenderer.js          # Interactive world map
│   └── data/
│       └── CityNames.js            # City name generator
└── data/
    └── config.json                 # Simulation configuration
```

## Core Systems

### SimulationEngine

The central coordinator that manages all simulation systems:

```javascript
// Key responsibilities:
- Initialize countries, cities, corporations, and firms
- Initialize global market for external purchases
- Process hourly production cycles for all firms
- Execute three-tier supply chain transactions (B2B)
- Check inventory levels and trigger auto-purchasing
- Process global market orders and deliveries
- Update corporation statistics from firm data (O(1) lookups)
- Track market history and generate events
- Emit update events for UI synchronization
```

**Update Cycle:**
- **Hourly:** Firm production, supply chain transactions, inventory checks, global market processing
- **Daily:** Payroll on 1st and 15th, end-of-month expenses on last day, random economic events (5% chance)
- **Monthly:** City population growth, firm financial settlements, reports
- **Yearly:** Salary level adjustments, cost of living increases

### GameClock

Manages simulation time with configurable speed:

| Speed | Real Time | Game Time |
|-------|-----------|-----------|
| 0.5x  | 1 second  | 30 minutes |
| 1x    | 1 second  | 1 hour |
| 2x    | 1 second  | 2 hours |
| 4x    | 1 second  | 4 hours |
| 8x    | 1 second  | 8 hours |

### TransactionLog

Records all economic transactions with game time timestamps:
- B2B transactions (primary → semi-raw, semi-raw → manufactured)
- Retail purchases (manufacturers → retail stores)
- Consumer sales (retail → consumers)
- Global market orders and deliveries
- Global market sales (excess inventory disposal)
- Hourly and daily statistics aggregation

### CityManager

Handles multi-city operations:
- Generates initial cities with random characteristics
- Calculates distances between cities
- Aggregates statistics (total population, GDP, employment)
- Updates all cities on monthly/yearly cycles

## Economic Model

### Population Demographics

| Category | Percentage | Description |
|----------|------------|-------------|
| Non-Working | 30% | Children, retired, etc. |
| Working Age | 70% | Potential labor force |
| Employed | 85% of working age | Currently employed |
| Unemployed | 15% of working age | Seeking employment |

### Economic Classes

| Class | Population | Salary Range | Disposable Income |
|-------|------------|--------------|-------------------|
| Lower | 25% | $20,000 - $35,000 | 15% of salary |
| Working | 35% | $35,000 - $55,000 | 25% of salary |
| Lower Middle | 25% | $55,000 - $110,000 | 35% of salary |
| Upper Middle | 14% | $110,000 - $375,000 | 45% of salary |
| Upper | 1% | $375,000 - $1,500,000 | 55% of salary |
| Rich | 0.05% | $1,500,000 - $5,000,000 | 65% of salary |

### Salary Calculation

Actual salaries are calculated using the city's salary level (0.1 to 1.0):

```
Average Salary = Min + (Max - Min) × City Salary Level
```

### Purchasing Power

Total city purchasing power is calculated as:
```
Total = Σ (Class Count × Class Disposable Income)
```

## Firm Types

### Primary Producers (Raw Materials)

#### Mining Company
- **Products:** Iron Ore, Copper Ore, Coal, Gold Ore, Silver Ore, Aluminum Ore, Limestone, Salt, Crude Oil, Natural Gas
- **Labor:** Miners, Engineers, Supervisors, Geologists, Operators, Support
- **Output:** Raw materials for SEMI_RAW manufacturing

#### Logging Company
- **Products:** Softwood Logs, Hardwood Logs, Bamboo
- **Labor:** Lumberjacks, Operators, Foresters, Planters, Drivers, Support
- **Output:** Timber for lumber processing

#### Farm
- **Types:** Crop farms, Livestock farms
- **Crops:** Wheat, Rice, Corn, Cotton, Sugarcane, Coffee Beans
- **Livestock:** Cattle, Pigs, Chickens, Sheep
- **Labor:** Farmers, Agronomists, Operators, Specialists, Harvesters, Support

### Secondary Producers

#### Manufacturing Plant (SEMI_RAW)
- **Function:** Converts RAW materials into semi-processed goods
- **Inputs:** Iron Ore → Steel, Copper Ore → Copper Wire, Wheat → Flour, etc.
- **Outputs:** Steel, Copper Wire, Aluminum Sheets, Flour, Sugar, Cotton Fabric, etc.

#### Manufacturing Plant (MANUFACTURED)
- **Function:** Converts SEMI_RAW materials into finished goods
- **Inputs:** Steel, Copper Wire, Cotton Fabric, etc.
- **Outputs:** Electronics, Appliances, Vehicles, Furniture, Clothing, etc.
- **Labor:** Production Workers, Assembly Workers, Technicians, Inspectors, Engineers, Managers

### Tertiary Services

#### Retail Store
- **Types:** Supermarket, Department Store, Electronics Store, Furniture Store
- **Function:** Purchases from manufacturers, sells to consumers
- **Labor:** Sales, Cashiers, Stockers, Managers, Security, Cleaning

#### Bank
- **Types:** Commercial Bank, Investment Bank
- **Services:** Loans to firms, deposit accounts
- **Parameters:** 10% reserve requirement, 5% base interest rate, 3% margin
- **Labor:** Loan Officers, Tellers, Analysts, Advisors, Risk Managers

### Firm Naming Convention

Firms are named using their parent corporation's 3-letter abbreviation:
```
[Corp Abbreviation] [Firm Type]
Example: TCG Manufacturing, MRG Retail, IGC Mining
```

### Payroll Schedule

| Day | Payment |
|-----|---------|
| 1st of month | Half of monthly wages |
| 15th of month | Half of monthly wages |
| Last day of month | Operating expenses + loan payments |

## Supply Chain

### Three-Tier Supply Chain

The simulation implements a realistic three-tier supply chain:

```
TIER 1: Primary Producers (RAW Materials)
┌─────────────────────────────────────────────────────┐
│  Mining: Iron Ore, Copper Ore, Coal, Gold, etc.     │
│  Logging: Softwood Logs, Hardwood Logs, Bamboo      │
│  Farms: Wheat, Cotton, Cattle, Chickens, etc.       │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
TIER 2: SEMI_RAW Manufacturing
┌─────────────────────────────────────────────────────┐
│  Steel (from Iron Ore + Coal)                       │
│  Copper Wire (from Copper Ore)                      │
│  Flour (from Wheat)                                 │
│  Cotton Fabric (from Cotton)                        │
│  Beef, Pork, Chicken (from livestock)               │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
TIER 3: MANUFACTURED Goods
┌─────────────────────────────────────────────────────┐
│  Smartphones (Aluminum Sheets + Copper Wire + Gold) │
│  Cars (Steel + Aluminum Sheets + Copper Wire)       │
│  Shirts (Cotton Fabric)                             │
│  Bread (Flour + Sugar)                              │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
TIER 4: Retail → Consumers
```

### Hourly Supply Chain Processing

Each hour, the simulation:
1. All firms produce based on available materials
2. SEMI_RAW manufacturers buy from primary producers
3. MANUFACTURED manufacturers buy from SEMI_RAW manufacturers
4. Retailers buy finished goods from manufacturers
5. Retailers sell to city consumers

## Global Market

### Overview

The Global Market provides an external source for materials when local producers cannot meet demand. This ensures production never completely stops due to supply shortages.

### How It Works

1. **Hourly Inventory Check:** Each manufacturer checks if inventory is below threshold
2. **Local Purchase First:** System tries to buy from in-game producers
3. **Global Market Fallback:** If local purchase fails, order from global market
4. **Delivery Delay:** Global market orders take 24 hours (configurable) to deliver
5. **Price Markup:** Global market prices are higher than local prices (default: 1.5x)
6. **Seller Inventory:** When orders are fulfilled, seller inventory is deducted and seller is paid
7. **Enabled Check:** Global market respects the `enabled` config flag and skips processing when disabled

### Configuration

```json
"globalMarket": {
    "enabled": true,
    "priceMultiplier": 1.5,        // 50% markup over base price
    "availabilityFactor": 0.8,
    "deliveryDelayHours": 24,      // 24 game hours delivery time
    "minimumOrderSize": 10,
    "maxOrdersPerHour": 5
}
```

### Runtime Control

```javascript
// Change price multiplier
debug.globalMarket.setMultiplier(2.0)  // 100% markup

// Get current multiplier
debug.globalMarket.getMultiplier()

// View statistics
debug.globalMarket.getStats()

// View all market prices
debug.globalMarket.getPrices()

// Enable/disable
debug.globalMarket.enable()
debug.globalMarket.disable()
```

## Inventory Management

### Automatic Inventory System

Manufacturing firms automatically manage their inventory:

| Parameter | Default | Description |
|-----------|---------|-------------|
| Initial Stock | 1 week | Starting inventory for new firms |
| Reorder Threshold | 4 weeks | Trigger reorder when inventory falls below this |
| Reorder Quantity | 2 weeks | Amount to order when restocking |
| Max Stock | 8 weeks | Maximum inventory capacity |

### Configuration

```json
"inventory": {
    "initialStockWeeks": 1,
    "reorderThresholdWeeks": 4,
    "reorderQuantityWeeks": 2,
    "maxStockWeeks": 8
}
```

### Inventory Check Process

Every hour:
1. Calculate hourly material usage based on production rate
2. Calculate threshold: `hourlyUsage × 24 × 7 × reorderThresholdWeeks`
3. If current inventory < threshold:
   - Try to purchase from local producers
   - If unavailable, order from global market
4. Order quantity: `hourlyUsage × 24 × 7 × reorderQuantityWeeks`

### Viewing Inventory

```javascript
// View all manufacturing inventory
debug.getInventoryReport()

// Returns:
[
  {
    id: "FIRM_xxx",
    product: "Steel",
    isSemiRaw: true,
    finishedGoods: "150",
    rawMaterials: [
      { material: "Iron Ore", quantity: "500", minRequired: "1000" },
      { material: "Coal", quantity: "200", minRequired: "300" }
    ]
  },
  ...
]
```

## Transportation Network

### Transport Types

| Type | Cost/km | Speed | Min Distance | Max Distance | Requirements |
|------|---------|-------|--------------|--------------|--------------|
| Local Road | $0.50 | 50 km/h | 0 km | 100 km | None |
| Highway | $0.30 | 90 km/h | 50 km | 1,000 km | None |
| Rail Freight | $0.15 | 80 km/h | 100 km | 3,000 km | Railway |
| Air Freight | $2.50 | 600 km/h | 200 km | 10,000 km | Airport |
| Sea Freight | $0.08 | 40 km/h | 500 km | 20,000 km | Seaport |

**Note:** Air freight includes $500 base cost; Sea freight includes $1,000 base cost.

### Infrastructure Requirements

- **Airport:** Cities with population > 500,000
- **Railway:** Cities with population > 250,000
- **Seaport:** Coastal cities only

### Transportation Calculator

The UI provides a calculator to compare shipping options:
1. Select origin and destination cities
2. Enter cargo units
3. Choose priority (Cost, Speed, Reliability, Balanced)
4. View all available routes with costs and transit times

## Configuration

Edit `data/config.json` to customize simulation parameters:

### Key Configuration Sections

```json
{
  "simulation": {
    "version": "1.0.2",
    "name": "Enhanced Economic Simulation System",
    "startYear": 2025,
    "timeScale": {
      "realSecond": 1000
    }
  },
  "globalMarket": {
    "enabled": true,
    "priceMultiplier": 1.5,
    "availabilityFactor": 0.8,
    "deliveryDelayHours": 24,
    "minimumOrderSize": 10,
    "maxOrdersPerHour": 5
  },
  "inventory": {
    "initialStockWeeks": 1,
    "reorderThresholdWeeks": 4,
    "reorderQuantityWeeks": 2,
    "maxStockWeeks": 8
  },
  "countries": {
    "count": 25,
    "continents": ["NORTHERN", "SOUTHERN", "EASTERN", "WESTERN", "CENTRAL"],
    "economicLevels": ["DEVELOPED", "EMERGING", "DEVELOPING"],
    "tariffs": { "raw": 0.05, "semiRaw": 0.10, "manufactured": 0.15 }
  },
  "cities": {
    "initial": 8,
    "minPopulation": 250000,
    "maxPopulation": 5000000
  },
  "corporations": {
    "firmsPerCorp": 15
  },
  "firms": {
    "types": ["MINING", "LOGGING", "FARM", "MANUFACTURING", "RETAIL", "BANK"],
    "perCity": { "min": 10, "max": 20 },
    "distribution": {
      "MINING": 0.15,
      "LOGGING": 0.10,
      "FARM": 0.20,
      "MANUFACTURING": 0.25,
      "RETAIL": 0.20,
      "BANK": 0.10
    }
  },
  "transportation": { "..." },
  "labor": { "wagesByFirm": { "..." }, "benefitsMultiplier": 1.30 },
  "banking": { "reserveRequirement": 0.10, "baseInterestRate": 0.05 }
}
```

### Corporation Count Derivation

The number of corporations is automatically calculated:
```
expectedTotalFirms = cities.initial × avg(firms.perCity.min, firms.perCity.max)
corpCount = round(expectedTotalFirms / corporations.firmsPerCorp)
```

With default config: 8 cities × 15 avg firms = 120 firms / 15 per corp = **8 corporations**, each with ~15 firms.

## User Interface

### Pages

| Page | Description |
|------|-------------|
| **Dashboard** (`index.html`) | Main overview with global stats, top corporations, market activity chart, event feed |
| **Global Economy** (`global-economy.html`) | Aggregate economic indicators across all cities |
| **World Map** (`world-map.html`) | Interactive map with city markers and infrastructure indicators |
| **Cities** (`cities.html`) | City details, demographics, infrastructure, local firms |
| **Corporations** (`corporations.html`) | Corporation list with abbreviations, financials, monthly payroll, facilities |
| **Firms** (`firms.html`) | Firm details with full-precision financials, color-coded profit/loss, production, labor, bids |
| **Market Activity** (`market-activity.html`) | Transaction log with game time, filterable by type |
| **Products** (`products.html`) | Product catalog with pricing and supply chain tiers |
| **Transportation** (`transportation.html`) | Route calculator with cost/time comparisons |
| **Event Feed** (`feed.html`) | Live economic events and monthly reports |

### Shared Header Controls
- Game date/time display
- Play/Pause buttons
- Speed controls (0.5x to 8x)
- Navigation across all pages

### Detail Views

- **Corporation Detail:** Financial overview, monthly payroll, performance metrics, facilities list, geographic presence
- **City Detail:** Demographics, infrastructure, economy stats, firms operating in city
- **Firm Detail:** Cash/revenue/profit (full precision, color-coded), production stats, labor structure with monthly salary, inventory levels, bids and orders, recent sales and purchases with game time

## Debug Tools

Open browser console and use:

```javascript
// Get full simulation state
debug.getState()

// Access simulation data
debug.getCities()           // Array of all cities
debug.getCorporations()     // Array of all corporations
debug.getProducts()         // Array of all products
debug.getFirms()            // Array of all firms

// Control simulation
debug.pause()               // Pause game time
debug.resume()              // Resume game time
debug.setSpeed(2)           // Set speed multiplier

// Add custom event
debug.addEvent('info', 'Test Event', 'Custom message here')

// Global Market controls
debug.globalMarket.getStats()        // View market statistics
debug.globalMarket.getPrices()       // View all market prices
debug.globalMarket.setMultiplier(2)  // Set price multiplier (e.g., 2x)
debug.globalMarket.getMultiplier()   // Get current multiplier
debug.globalMarket.enable()          // Enable global market
debug.globalMarket.disable()         // Disable global market

// Configuration
debug.getConfig()                    // View current configuration
debug.setInventoryConfig({           // Update inventory settings
    initialStockWeeks: 2,
    reorderThresholdWeeks: 3
})

// Inventory inspection
debug.getInventoryReport()           // View all manufacturing inventory

// Direct simulation access
window.getSimulation()               // Returns simulation engine instance
```

## Development

### Adding a New Firm Type

1. Create new class in `js/core/firms/` extending `Firm`
2. Implement required methods: `produceHourly()`, `calculateLaborCosts()`, `updateMonthly()`
3. Implement `getDisplayName()` using `this.corporationAbbreviation`
4. Add to `generateRandomFirm()` in `SimulationEngine.js`
5. Update firm type distribution in `config.json`

### Adding a New Product

1. Add product definition in `Product.js` registry
2. Define inputs (for manufactured goods) or mark as raw material
3. Update relevant firm types to produce/consume the product
4. Products are automatically available in global market

### Adding a New Transportation Type

1. Add configuration in `config.json` under `transportation.types`
2. Update `TransportationNetwork.js` if special logic needed
3. Update UI selectors in `Dashboard.js`

### Code Style

- ES6 modules with explicit imports/exports
- Class-based architecture for entities
- Event-driven updates via CustomEvents
- Configuration-driven parameters where possible
- Seeded RNG (`this.random()`) for all randomness — never use `Math.random()` directly

## Roadmap

### Planned Features

- [ ] Save/Load game state to localStorage
- [ ] Historical data charts and analytics
- [ ] Advanced corporation AI decision-making
- [ ] Trade agreements between cities
- [ ] Natural disasters and random events
- [ ] Technology research system
- [ ] Stock market simulation
- [ ] Import/Export data to CSV
- [ ] Mobile responsive design
- [ ] Sound effects and background music
- [ ] Multiplayer support
- [ ] Mod/plugin system

### Recently Completed

- [x] Three-tier supply chain (RAW → SEMI_RAW → MANUFACTURED)
- [x] Global market system for external purchases
- [x] Global market respects enabled/disabled config flag
- [x] Global market orders deduct seller inventory and pay seller
- [x] Automatic inventory management
- [x] Configurable price multiplier for global market
- [x] Hourly inventory checks with auto-reordering
- [x] Config-driven corporation count (derived from firm count and firmsPerCorp)
- [x] 3-letter corporation abbreviations
- [x] Firm display names using corporation abbreviation
- [x] Real-time profit tracking (getCurrentProfit)
- [x] Bi-monthly payroll (1st and 15th) with end-of-month expenses
- [x] Monthly salary display for firms and corporations
- [x] Full-precision currency formatting with comma separators
- [x] Color-coded financials (green positive, red negative)
- [x] Game time timestamps on all transactions
- [x] Config-driven tick rate (timeScale.realSecond)
- [x] Config-driven country count and firms per city
- [x] Seeded RNG throughout simulation for determinism
- [x] O(1) corporation lookups via Map-based indexing
- [x] Multi-page UI (dashboard, global economy, world map, cities, corporations, firms, market activity, products, transportation, feed)

---

**Version:** 1.0.2
**Last Updated:** 2026-02-04
**Status:** Production Ready
