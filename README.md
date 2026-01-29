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

- **25 fictional countries** across 5 continents with trade agreements
- **8 cities** with populations ranging from 250K to 5M
- **40 corporations** with different AI-driven strategies
- **6 firm types** operating across supply chains
- **3-tier supply chain** (RAW → SEMI_RAW → MANUFACTURED)
- **Global market** for materials not available from local producers
- **Real-time market activity** with B2B and retail transactions

**Time Scale:** 1 real second = 1 game hour (configurable speed: 0.5x to 8x)

## Features

### Simulation Engine
- Real-time economic simulation with hourly, daily, monthly, and yearly cycles
- Three-tier supply chain: RAW → SEMI_RAW → MANUFACTURED → Retail
- Dynamic market pricing based on supply and demand
- Global market fallback for unavailable materials
- Automatic inventory management with reorder thresholds
- Corporation AI with personality types (Conservative, Moderate, Aggressive, Very Aggressive)
- Random economic events affecting market conditions

### City System
- Dynamic population growth (0.1% - 0.3% monthly)
- 6 economic classes with realistic salary distributions
- Employment tracking with unemployment rates
- Infrastructure levels (airports, seaports, railways)
- Consumer confidence affecting purchasing behavior
- Cost of living variations by country development level

### Corporation System
- 40 unique corporations across 8 industry sectors
- Automatic facility management and employee tracking
- Revenue and profit aggregation from owned firms
- Different strategic behaviors based on personality type

### Market System
- B2B transactions between firms in supply chain
- Retail sales to city populations
- Global market for materials without local producers
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
├── index.html                      # Main HTML file with UI structure
├── README.md                       # This documentation file
├── css/
│   └── styles.css                  # All styling and layout
├── js/
│   ├── main.js                     # Application entry point and initialization
│   ├── core/
│   │   ├── SimulationEngine.js     # Main simulation coordinator
│   │   ├── GameClock.js            # Time management (hours, days, months, years)
│   │   ├── GlobalMarket.js         # Global market for external purchases
│   │   ├── City.js                 # City economic model and demographics
│   │   ├── CityManager.js          # Multi-city management and statistics
│   │   ├── Country.js              # Country definitions and trade agreements
│   │   ├── Product.js              # Product registry and definitions
│   │   ├── TransportationNetwork.js# Transportation cost calculations
│   │   ├── Dashboard.js            # UI state management
│   │   └── firms/
│   │       ├── Firm.js             # Base firm class
│   │       ├── MiningCompany.js    # Raw material extraction
│   │       ├── LoggingCompany.js   # Timber production
│   │       ├── Farm.js             # Agricultural production
│   │       ├── ManufacturingPlant.js # Product manufacturing
│   │       ├── RetailStore.js      # Consumer sales
│   │       └── Bank.js             # Financial services
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
- Update corporation statistics from firm data
- Track market history and generate events
- Emit update events for UI synchronization
```

**Update Cycle:**
- **Hourly:** Firm production, supply chain transactions, inventory checks, global market processing
- **Daily:** Random economic events (5% chance), supply chain statistics logging
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

### Complete Configuration Reference

```json
{
  "simulation": {
    "version": "1.0.2",
    "name": "Enhanced Economic Simulation System",
    "startYear": 2025,
    "timeScale": {
      "realSecond": 1000,
      "gameHour": 1,
      "gameDay": 24,
      "gameMonth": 720,
      "gameYear": 8640
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
  "cities": {
    "initial": 8,
    "minPopulation": 250000,
    "maxPopulation": 5000000
  },
  "firms": {
    "types": ["MINING", "LOGGING", "FARM", "MANUFACTURING", "RETAIL", "BANK"],
    "perCity": { "min": 2, "max": 4 },
    "distribution": {
      "MINING": 0.15,
      "LOGGING": 0.10,
      "FARM": 0.20,
      "MANUFACTURING_SEMI": 0.15,
      "MANUFACTURING": 0.15,
      "RETAIL": 0.15,
      "BANK": 0.10
    }
  },
  "transportation": { ... },
  "labor": { "wagesByFirm": { ... }, "benefitsMultiplier": 1.30 },
  "banking": { "reserveRequirement": 0.10, "baseInterestRate": 0.05 }
}
```

## User Interface

### Main Dashboard Sections

1. **Header Controls**
   - Game date/time display
   - Play/Pause buttons
   - Speed controls (0.5x to 8x)
   - Real time elapsed counter

2. **Global Economy Card**
   - Total population
   - Total GDP (purchasing power)
   - City count
   - Employment statistics
   - Average salary level

3. **Top Corporations Card**
   - Revenue and profit rankings
   - Employee counts
   - Click to view corporation details

4. **Market Activity Card**
   - Transaction volume chart (24-hour history)
   - Hourly transaction count
   - Average transaction value

5. **World Map**
   - Interactive city markers
   - Infrastructure indicators (green = standard, blue = coastal/seaport)
   - Click cities to select for route calculation

6. **Cities List**
   - Population and demographics
   - Infrastructure status
   - Click for detailed city view

7. **Active Products**
   - Product categories and prices
   - Supply and demand indicators

8. **Transportation Calculator**
   - Route planning between cities
   - Cost and time comparisons

9. **Event Feed**
   - Live updates on economic events
   - Monthly reports
   - Market notifications

### Detail Views

- **Corporation Detail:** Financial overview, performance metrics, facilities list, geographic presence
- **City Detail:** Demographics, infrastructure, economy stats, firms operating in city
- **Firm Detail:** Production stats, labor structure, operating costs, inventory levels

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
3. Add to `generateRandomFirm()` in `SimulationEngine.js`
4. Update firm type distribution in `config.json`

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
- [x] Automatic inventory management
- [x] Configurable price multiplier for global market
- [x] Hourly inventory checks with auto-reordering

### Known Limitations

- Firms array is sliced to 20 items in state for performance
- No persistent storage (refreshing resets simulation)
- Fixed number of initial corporations (40)

---

**Version:** 1.0.2
**Last Updated:** 2025-01-25
**Status:** Production Ready
