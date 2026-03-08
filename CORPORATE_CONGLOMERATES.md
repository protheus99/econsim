# Corporate Conglomerate Combinations

## Overview

Conglomerates are corporations that own multiple complementary business personas. This document defines which persona combinations are valid and how they form.

```
Conglomerate Types:
├── Vertical Chain    - Adjacent supply chain tiers (RAW → SEMI → MANUFACTURED)
├── Horizontal Group  - Same tier, related products
├── Industrial Group  - Multiple related personas across tiers
└── Diversified       - Unrelated businesses (rare)
```

---

## Combination Rules

### Affinity Levels

| Level | Description | Formation Chance |
|-------|-------------|------------------|
| **Natural** | Business logic strongly favors combination | High (70%) |
| **Compatible** | Businesses complement each other | Moderate (40%) |
| **Possible** | Can work together but not obvious | Low (15%) |
| **Incompatible** | No business rationale | Never |

### Vertical Integration Limits

| Integration Level | Tiers Controlled | Rarity |
|-------------------|------------------|--------|
| Adjacent (1 step) | 2 tiers | Common |
| Extended (2 steps) | 3 tiers | Uncommon |
| Full Chain | 4+ tiers | Very Rare (5%) |

---

## VERTICAL CHAIN COMBINATIONS

This section details every possible vertical supply chain path from RAW materials to RETAIL.

---

## FOOD & AGRICULTURE CHAINS

### Grain Chain (Wheat Path)

```
WHEAT SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
                                               ┌→ Bread ─────────────→ Supermarket
Grain Farm ─────────→ Flour Mill ─────────────┼→ Cake ──────────────→ Supermarket
(Wheat)               (Flour)                  └→ Breakfast Cereal ──→ Supermarket
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Wheat-to-Bread | Wheat → Flour → Bread | Natural | Grupo Bimbo |
| Bakery Vertical | Wheat → Flour → Bread + Cake | Natural | Flowers Foods |
| Breakfast Chain | Wheat → Flour → Cereal | Compatible | General Mills |

**Template: Bakery Conglomerate**
```
├── RAW: Grain Farm (Wheat focus)
├── SEMI_RAW: Flour Mill
├── MANUFACTURED: Packaged Food (Bakery focus)
└── RETAIL: (optional) Supermarket, Convenience
```

---

### Grain Chain (Corn Path)

```
CORN SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
                       (Corn used directly)    ┌→ Breakfast Cereal ──→ Supermarket
Grain Farm ───────────────────────────────────┼→ Alcohol ────────────→ Supermarket
(Corn)                                         └→ Canned Goods ──────→ Supermarket
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Cereal Chain | Corn → Breakfast Cereal | Natural | Kellogg's |
| Spirits Chain | Corn → Alcohol | Natural | Archer Daniels Midland |
| Canning Chain | Corn → Canned Goods | Compatible | Del Monte |

---

### Grain Chain (Soybean Path)

```
SOYBEAN SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Grain Farm ─────────→ Oil Processor ──────────→ Cooking Oil ─────────→ Supermarket
(Soybeans)            (Vegetable Oil)
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Cooking Oil Chain | Soybeans → Vegetable Oil → Cooking Oil | Natural | Cargill |

**Template: Grain & Oils Conglomerate**
```
├── RAW: Grain Farm (Wheat + Corn + Soybeans)
├── SEMI_RAW: Flour Mill + Oil Processor
├── MANUFACTURED: Packaged Food (Bakery + Cooking Products)
└── RETAIL: (optional) Supermarket
```
**Real-World Examples:** ADM, Cargill, Bunge

---

### Sugar Chain

```
SUGAR SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
                                               ┌→ Candy ─────────────→ Supermarket
                                               ├→ Ice Cream ─────────→ Supermarket
Industrial Crop ────→ Sugar Refinery ─────────┼→ Soda ──────────────→ Supermarket
(Sugarcane)           (Sugar)                  ├→ Bread/Cake ────────→ Supermarket
                                               └→ Breakfast Cereal ──→ Supermarket
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Confectionery Chain | Sugarcane → Sugar → Candy | Natural | Hershey (partial) |
| Sweet Beverages | Sugarcane → Sugar → Soda | Natural | Coca-Cola (sugar buyer) |
| Dairy Desserts | Sugarcane → Sugar → Ice Cream | Compatible | - |

**Template: Confectionery Conglomerate**
```
├── RAW: Industrial Crop Farm (Sugarcane)
├── SEMI_RAW: Sugar Refinery
├── MANUFACTURED: Packaged Food (Confectionery focus: Candy, Ice Cream)
└── RETAIL: (optional) Supermarket, Convenience
```

---

### Fruit Chain

```
FRUIT SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Produce Farm ───────→ Fruit Processor ────────┬→ Packaged Fruits ────→ Supermarket
(Fresh Fruits)        (Fruit Concentrate)     └→ Soda ──────────────→ Supermarket
                                                  (fruit flavored)
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Juice Chain | Fruits → Concentrate → Packaged Fruits | Natural | Tropicana |
| Fruit Beverage | Fruits → Concentrate → Soda | Compatible | PepsiCo |

**Template: Fruit & Juice Conglomerate**
```
├── RAW: Produce Farm (Fruits focus)
├── SEMI_RAW: Fruit Processor
├── MANUFACTURED: Packaged Food (Fruits) + Beverage Mfg
└── RETAIL: (optional) Supermarket
```

---

### Meat Chains

```
BEEF SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Livestock Ranch ────→ Meat Processor ─────────→ Packaged Meat ───────→ Supermarket
(Cattle)              (Beef)

PORK SUPPLY CHAIN
─────────────────────────────────────────────────────────────────────────────────
Livestock Ranch ────→ Meat Processor ─────────→ Packaged Meat ───────→ Supermarket
(Pigs)                (Pork)

POULTRY SUPPLY CHAIN
─────────────────────────────────────────────────────────────────────────────────
Poultry Farm ───────→ Meat Processor ─────────→ Packaged Meat ───────→ Supermarket
(Chickens)            (Chicken)
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Beef Vertical | Cattle → Beef → Packaged Meat | Natural | JBS |
| Pork Vertical | Pigs → Pork → Packaged Meat | Natural | Smithfield |
| Poultry Vertical | Chickens → Chicken → Packaged Meat | Natural | Tyson, Perdue |
| Multi-Protein | All Livestock → All Meats → Packaged Meat | Natural | Tyson Foods |

**Template: Protein Conglomerate**
```
├── RAW: Livestock Ranch (Cattle + Pigs) + Poultry Farm
├── SEMI_RAW: Meat Processor (Multi-protein)
├── MANUFACTURED: Packaged Food (Protein focus)
└── RETAIL: (optional) Supermarket
```
**Real-World Examples:** Tyson Foods, JBS, Cargill Protein

---

### Dairy Chain

```
DAIRY SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
                                               ┌→ Ice Cream ─────────→ Supermarket
Dairy Farm ─────────→ Dairy Processor ────────┤
(Raw Milk)            (Pasteurized Milk)       └→ Formula ───────────→ Supermarket
                                                                       Baby Retail
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Dairy-to-Dessert | Milk → Pasteurized → Ice Cream | Natural | Dean Foods |
| Dairy-to-Baby | Milk → Pasteurized → Formula | Compatible | Nestlé |
| Full Dairy | Milk → Pasteurized → Ice Cream + Formula | Compatible | Danone |

**Template: Dairy Conglomerate**
```
├── RAW: Dairy Farm
├── SEMI_RAW: Dairy Processor
├── MANUFACTURED: Packaged Food (Dairy focus: Ice Cream, Formula)
└── RETAIL: (optional) Supermarket
```
**Real-World Examples:** Dairy Farmers of America, Lactalis, Danone

---

### Seafood Chain

```
SEAFOOD SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Commercial Fishing ─→ Seafood Processor ──────→ Packaged Seafood ────→ Supermarket
(Fish)                (Processed Fish)
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Seafood Vertical | Fish → Processed Fish → Packaged Seafood | Natural | Thai Union |

**Template: Seafood Conglomerate**
```
├── RAW: Commercial Fishing Fleet
├── SEMI_RAW: Seafood Processor
├── MANUFACTURED: Packaged Food (Seafood focus)
└── RETAIL: (optional) Supermarket
```

---

### Egg Chain

```
EGG SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Poultry Farm ─────────────────────────────────→ Cake ────────────────→ Supermarket
(Eggs)                 (direct to mfg)
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Egg-to-Bakery | Eggs → Cake (direct input) | Compatible | Cal-Maine Foods |

---

## TEXTILE & APPAREL CHAINS

### Cotton Chain

```
COTTON SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
                                               ┌→ Shirts ────────────→ Fashion Retail
                                               ├→ Jeans ─────────────→ Fashion Retail
Industrial Crop ────→ Textile Mill ───────────┼→ Jackets ────────────→ Fashion Retail
(Cotton)              (Cotton Fabric)          ├→ Sweaters ──────────→ Fashion Retail
                                               ├→ Socks ─────────────→ Fashion Retail
                                               ├→ Bags ──────────────→ Fashion Retail
                                               └→ Diapers ───────────→ Baby Retail
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Basic Apparel | Cotton → Fabric → Shirts/Jeans | Natural | Fruit of the Loom |
| Full Clothing | Cotton → Fabric → All Clothing | Natural | Hanesbrands |
| Baby Textiles | Cotton → Fabric → Diapers | Compatible | Kimberly-Clark |
| Fashion Vertical | Cotton → Fabric → Clothing → Fashion Retail | Compatible | Zara/Inditex |

**Template: Apparel Conglomerate**
```
├── RAW: Industrial Crop Farm (Cotton)
├── SEMI_RAW: Textile Mill
├── MANUFACTURED: Clothing Mfg (Full Apparel)
└── RETAIL: Fashion Retail, Footwear Retail
```
**Real-World Examples:** Hanesbrands, PVH, Kontoor Brands

---

### Leather Chain

```
LEATHER SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Livestock Ranch ────→ Leather Processor ──────┬→ Shoes ──────────────→ Fashion Retail
(Raw Hides)           (Leather)               │                        Footwear Retail
         +                                    ├→ Belts ──────────────→ Fashion Retail
Mining (Minerals) ──→ (Salt for processing)   └→ Bags ───────────────→ Fashion Retail
(Salt)
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Leather Footwear | Hides → Leather → Shoes | Natural | - |
| Leather Accessories | Hides → Leather → Belts + Bags | Natural | Coach, Kate Spade |
| Full Leather Goods | Hides → Leather → Shoes + Accessories | Compatible | LVMH |

**Template: Leather Goods Conglomerate**
```
├── RAW: Livestock Ranch (Cattle - Hides byproduct)
├── SEMI_RAW: Leather Processor
├── MANUFACTURED: Accessories Mfg (Leather Goods) + Clothing (Footwear)
└── RETAIL: Fashion Retail
```
**Real-World Examples:** Tapestry (Coach), Capri Holdings, Hermès

---

### Rubber/Footwear Chain

```
RUBBER SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Industrial Crop ────→ Rubber Processor ───────┬→ Shoes ──────────────→ Fashion Retail
(Rubber Latex)        (Rubber)                │                        Footwear Retail
                                              └→ Tires ──────────────→ Auto Retail
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Rubber-to-Footwear | Latex → Rubber → Shoes | Compatible | - |
| Rubber-to-Tires | Latex → Rubber → Tires | Natural | Michelin, Goodyear |

---

## METALS & HEAVY INDUSTRY CHAINS

### Steel Chain

```
STEEL SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Mining (Ferrous) ───→ Steel Processing ───────┬→ Vehicles (Cars) ────→ Auto Retail
(Iron Ore + Coal)     (Steel)                 ├→ Motorcycles ────────→ Auto Retail
                                              ├→ Auto Parts ─────────→ Auto Retail
                                              ├→ Tools ──────────────→ Hardware Retail
                                              ├→ Appliances ─────────→ Electronics Retail
                                              │   (Washing Machine,     Home Goods
                                              │    Dryer, Microwave)
                                              ├→ Furniture ──────────→ Home Goods
                                              │   (frames/hardware)
                                              ├→ Canned Goods ───────→ Supermarket
                                              └→ Watches ────────────→ Fashion Retail
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Steel Production | Iron + Coal → Steel | Natural | US Steel, Nucor |
| Steel-to-Auto | Steel → Vehicles + Auto Parts | Natural | - |
| Steel-to-Appliance | Steel → Appliances | Compatible | - |
| Steel-to-Tools | Steel → Tools | Compatible | Stanley Black & Decker |

**Template: Steel & Heavy Manufacturing Conglomerate**
```
├── RAW: Mining Company (Ferrous Metals focus)
├── SEMI_RAW: Steel Processing
├── MANUFACTURED: Vehicle Mfg OR Auto Parts OR Appliances
└── RETAIL: (optional) Auto Retail
```
**Real-World Examples:** ArcelorMittal, POSCO, Nippon Steel

---

### Copper/Aluminum Chain (Electronics Path)

```
NON-FERROUS METALS SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Mining (Copper) ────→ Metal Processing ───────┬→ Electronics ─────────→ Electronics Retail
                      (Copper Wire)           │   (all types)
                                              ├→ Appliances ──────────→ Electronics Retail
                                              │   (all types)
                                              ├→ Car Battery ─────────→ Auto Retail
                                              └→ Vehicles ────────────→ Auto Retail

Mining (Aluminum) ──→ Metal Processing ───────┬→ Electronics ─────────→ Electronics Retail
                      (Aluminum Sheets)       │   (all types)
                                              ├→ Appliances ──────────→ Electronics Retail
                                              └→ Vehicles ────────────→ Auto Retail
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Copper Production | Copper Ore → Copper Wire | Natural | Freeport-McMoRan |
| Aluminum Production | Aluminum Ore → Aluminum Sheets | Natural | Alcoa |
| Metals-to-Electronics | Copper/Aluminum → Electronics | Compatible | - |

**Template: Electronics Supply Chain Conglomerate**
```
├── RAW: Mining Company (Non-Ferrous focus)
├── SEMI_RAW: Metal Processing (Copper Wire, Aluminum Sheets)
├── MANUFACTURED: Electronics Mfg + Appliance Mfg
└── RETAIL: Electronics Retail
```

---

### Precious Metals Chain

```
PRECIOUS METALS SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Mining (Gold) ────────────────────────────────┬→ Jewelry ────────────→ Fashion Retail
                       (direct to mfg)        ├→ Watches ────────────→ Fashion Retail
                                              └→ Electronics ─────────→ Electronics Retail
                                                  (trace amounts)

Mining (Silver) ───────────────────────────────→ Jewelry ────────────→ Fashion Retail
                       (direct to mfg)
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Gold-to-Jewelry | Gold Ore → Jewelry | Natural | - |
| Precious-to-Luxury | Gold + Silver → Jewelry + Watches | Natural | Richemont |

**Template: Precious Metals & Luxury Conglomerate**
```
├── RAW: Mining Company (Precious Metals focus)
├── MANUFACTURED: Accessories Mfg (Luxury Goods focus)
└── RETAIL: Fashion Retail (Luxury segment)
```

---

### Automotive Chain (Full)

```
AUTOMOTIVE SUPPLY CHAIN (COMPLETE)
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Mining (Ferrous) ───→ Steel Processing ──────┐
                                             ├───→ VEHICLES ─────────→ Auto Retail
Mining (Non-Ferrous)→ Metal Processing ──────┤     (Cars,              (Dealerships)
                      (Copper, Aluminum)     │      Motorcycles)
                                             │
Industrial Crop ────→ Rubber Processing ─────┤
(Rubber Latex)        (Rubber)               │
                                             │
                      ┌──────────────────────┘
                      │
                      ├───→ AUTO PARTS ──────→ Auto Retail
                      │     (Tires,            (Parts Stores)
                      │      Auto Parts,
                      │      Car Battery)
                      │
Energy Extraction ──→ Petroleum Refinery ────→ Oil & Fluids ─────────→ Auto Retail
(Crude Oil)
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Full Auto Vertical | Mining → Steel/Metals → Vehicles | Rare | - |
| Parts Supplier | Steel/Rubber → Auto Parts + Tires | Natural | - |
| Tire Vertical | Rubber Latex → Rubber → Tires | Natural | Michelin, Goodyear |
| Fluids Chain | Crude Oil → Oil & Fluids | Natural | Valvoline |

**Template: Automotive Conglomerate**
```
├── RAW: (rare) Mining, Rubber Plantation
├── SEMI_RAW: Steel Processing, Rubber Processing
├── MANUFACTURED: Vehicle Mfg + Auto Parts Mfg
└── RETAIL: Automotive Retail (Dealerships, Parts)
```
**Real-World Examples:** Toyota, GM, Ford, Volkswagen

**Template: Tire & Rubber Conglomerate**
```
├── RAW: Industrial Crop (Rubber Latex)
├── SEMI_RAW: Rubber Processing
├── MANUFACTURED: Auto Parts (Tires focus)
└── RETAIL: Automotive Retail (Tire Centers)
```
**Real-World Examples:** Michelin, Goodyear, Bridgestone

---

## PETROLEUM & CHEMICAL CHAINS

### Fuel Chain

```
FUEL SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Energy Extraction ──→ Petroleum Refinery ─────→ (Fuel to consumers) ──→ Convenience Store
(Crude Oil,           (Gasoline, Diesel)                                (Gas Stations)
 Natural Gas)
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Oil-to-Pump | Crude → Gasoline/Diesel → Gas Station | Natural | ExxonMobil, Shell |

**Template: Integrated Oil Company**
```
├── RAW: Energy Extraction (Crude Oil, Natural Gas)
├── SEMI_RAW: Petroleum Refinery (Fuels)
└── RETAIL: Convenience Store (Gas Station format)
```
**Real-World Examples:** ExxonMobil, Shell, BP, Chevron

---

### Plastics Chain

```
PLASTICS SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
                                               ┌→ Toys ──────────────→ Toy Retail
                                               ├→ Electronics ────────→ Electronics Retail
Energy Extraction ──→ Petroleum Refinery ─────┼→ Soda (bottles) ─────→ Supermarket
(Crude Oil)           (Plastic Pellets)       ├→ Cooking Oil (bottles)→ Supermarket
                                               ├→ Health Products ───→ Pharmacy
                                               ├→ Beauty Products ───→ Beauty Retail
                                               ├→ Cleaning Products ─→ Supermarket
                                               └→ Trash Bags ─────────→ Supermarket
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Plastics-to-Toys | Crude → Plastics → Toys | Compatible | - |
| Plastics-to-Packaging | Crude → Plastics → Consumer Goods Packaging | Compatible | - |

---

### Chemical Chain

```
CHEMICAL SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Energy Extraction ──→ Petroleum Refinery ─────┐
(Crude Oil)           │                       │
         +            │                       │
Mining (Minerals) ────┘                       │
(Salt)                                        ↓
                      Chemical Production ────┬→ Cold Medicine ──────→ Pharmacy
                      (Industrial Chemicals)  ├→ Pain Killers ───────→ Pharmacy
                                              ├→ Vitamins ───────────→ Pharmacy
                                              ├→ Shampoo ────────────→ Supermarket
                                              │                        Beauty Retail
                                              ├→ Deodorant ──────────→ Supermarket
                                              ├→ Soap ───────────────→ Supermarket
                                              ├→ Toothpaste ─────────→ Supermarket
                                              ├→ Makeup ─────────────→ Beauty Retail
                                              ├→ Perfume ────────────→ Beauty Retail
                                              └→ Cleaning Supplies ──→ Supermarket
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Petrochemical Vertical | Crude → Chemicals | Natural | Dow, BASF |
| Chemicals-to-Health | Chemicals → Health Products | Natural | Johnson & Johnson |
| Chemicals-to-Beauty | Chemicals → Beauty Products | Natural | L'Oréal |
| Chemicals-to-Cleaning | Chemicals → Cleaning Products | Natural | Clorox |

**Template: Chemical & Consumer Products Conglomerate**
```
├── RAW: (optional) Energy Extraction
├── SEMI_RAW: Petroleum Refinery (Chemicals) + Chemical Production
├── MANUFACTURED: Health + Beauty + Cleaning Products
└── RETAIL: Pharmacy, Beauty Retail
```
**Real-World Examples:** P&G, Unilever, Johnson & Johnson, Henkel

---

## LUMBER & PAPER CHAINS

### Lumber/Furniture Chain

```
LUMBER SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Logging Company ────→ Lumber Mill ────────────┬→ Sofa ───────────────→ Home Goods
(Softwood Logs,       (Plywood)               ├→ Dresser ────────────→ Home Goods
 Hardwood Logs)                               ├→ Beds ───────────────→ Home Goods
                                              ├→ Tables ─────────────→ Home Goods
                                              └→ Tools (handles) ────→ Hardware Retail
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Lumber Production | Logs → Plywood | Natural | Weyerhaeuser |
| Lumber-to-Furniture | Plywood → Furniture | Compatible | - |

**Template: Lumber & Furniture Conglomerate**
```
├── RAW: Logging Company
├── SEMI_RAW: Lumber Mill
├── MANUFACTURED: Furniture Mfg
└── RETAIL: Home Goods Retail
```

---

### Paper Chain

```
PAPER SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Logging Company ────→ Pulp Mill ──────────────→ Paper Mfg ───────────┬→ Supermarket
(Softwood Logs)       (Wood Pulp)               (Paper, Cardboard)   └→ Hardware Retail
                            │
                            └─────────────────→ Cleaning Products ───→ Supermarket
                                                (Paper Towels)

                                              ┌→ Diapers ────────────→ Supermarket
                            └─────────────────┤                        Baby Retail
                                              └→ Trash Bags ─────────→ Supermarket
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Paper Vertical | Logs → Pulp → Paper | Natural | International Paper |
| Pulp-to-Tissue | Pulp → Paper Towels | Natural | Georgia-Pacific |
| Pulp-to-Baby | Pulp → Diapers | Compatible | Kimberly-Clark |

**Template: Paper & Packaging Conglomerate**
```
├── RAW: Logging Company
├── SEMI_RAW: Pulp Mill + Paper Mfg
├── MANUFACTURED: Cleaning Products (Paper focus)
└── RETAIL: (minimal)
```
**Real-World Examples:** International Paper, Georgia-Pacific, Kimberly-Clark

---

## CONSTRUCTION & MATERIALS CHAINS

### Glass Chain

```
GLASS SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Mining (Minerals) ──→ Glass Manufacturing ────┬→ Alcohol (bottles) ──→ Supermarket
(Silica Sand +        (Glass)                 ├→ Perfume (bottles) ──→ Beauty Retail
 Limestone)                                   └→ Glasses ────────────→ Pharmacy
                                                                       Fashion Retail
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Glass Production | Sand + Limestone → Glass | Natural | Owens-Illinois |
| Glass-to-Beverage | Glass → Bottles → Alcohol | Compatible | - |
| Glass-to-Eyewear | Glass → Glasses | Compatible | Luxottica |

**Template: Glass & Packaging Conglomerate**
```
├── RAW: Mining Company (Industrial Minerals)
├── SEMI_RAW: Glass Manufacturing
├── MANUFACTURED: Beverage Mfg OR Health Products (Glasses)
└── RETAIL: (optional)
```

---

### Cement Chain

```
CEMENT SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Mining (Minerals) ────────────────────────────→ Construction Mfg ────→ Hardware Retail
(Limestone + Coal)     (direct to mfg)          (Cement)
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Cement Vertical | Limestone + Coal → Cement | Natural | LafargeHolcim, CEMEX |

**Template: Building Materials Conglomerate**
```
├── RAW: Mining Company (Industrial Minerals: Limestone, Coal)
├── MANUFACTURED: Construction Materials (Cement)
└── RETAIL: Hardware Retail
```
**Real-World Examples:** LafargeHolcim, CEMEX, HeidelbergCement

---

## ELECTRONICS CHAINS

### Consumer Electronics Chain

```
ELECTRONICS SUPPLY CHAIN (COMPLETE)
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Mining (Copper) ────→ Metal Processing ──────┐
                      (Copper Wire)          │
                                             │
Mining (Aluminum) ──→ Metal Processing ──────┼───→ ELECTRONICS ──────→ Electronics Retail
                      (Aluminum Sheets)      │     Laptops
                                             │     Personal Computer
Mining (Gold) ──────────────────────────────┘     Tablets
                      (direct for trace)          Monitors
                                                  Cellphone
Energy Extraction ──→ Petroleum Refinery ────────→ TV
(Crude Oil)           (Plastic Pellets)           Console
                                                  Headphones
                                                  Printers
                                                  Cameras
                                                  Batteries
                                                  Drones
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Metals-to-Electronics | Copper/Aluminum → Electronics | Compatible | - |
| Computing Chain | Metals + Plastics → Laptops/PC/Tablets | Natural | Dell, HP |
| Mobile Chain | Metals + Plastics → Cellphones | Natural | Apple, Samsung |
| Entertainment Chain | Metals + Plastics → TV/Console | Natural | Sony, LG |

**Template: Electronics Conglomerate**
```
├── RAW: (rare) Mining (Non-Ferrous + Precious)
├── SEMI_RAW: Metal Processing
├── MANUFACTURED: Electronics Mfg (Multiple focus areas)
└── RETAIL: Electronics Retail
```
**Real-World Examples:** Samsung, LG, Sony, Panasonic, Apple

---

### Appliance Chain

```
APPLIANCE SUPPLY CHAIN
══════════════════════════════════════════════════════════════════════════════════

RAW                    SEMI_RAW                 MANUFACTURED            RETAIL
─────────────────────────────────────────────────────────────────────────────────
Mining (Ferrous) ───→ Steel Processing ──────┐
                                             │
Mining (Copper) ────→ Metal Processing ──────┼───→ APPLIANCES ───────→ Electronics Retail
                      (Copper Wire)          │     Vacuums             Home Goods Retail
                                             │     Microwave
Mining (Aluminum) ──→ Metal Processing ──────┘     Air Conditioner
                      (Aluminum Sheets)            Washing Machine
                                                   Dryer
```

| Chain Variant | Products Flow | Affinity | Real-World Example |
|---------------|---------------|----------|-------------------|
| Metals-to-Appliances | Steel + Copper → Appliances | Compatible | - |
| Full Appliance | All Metals → All Appliances | Natural | Whirlpool, LG |

**Template: Appliance Conglomerate**
```
├── SEMI_RAW: Steel Processing + Metal Processing
├── MANUFACTURED: Appliance Mfg (Full Appliance)
└── RETAIL: Home Goods Retail, Electronics Retail
```
**Real-World Examples:** Whirlpool, Electrolux, Haier, LG

---

## COMPLETE VERTICAL CHAINS (RARE)

These represent full RAW-to-RETAIL integration (only 2-5% of corporations).

### Full Food Chain

```
├── RAW: Grain Farm + Livestock Ranch + Dairy Farm
├── SEMI_RAW: Flour Mill + Meat Processor + Dairy Processor
├── MANUFACTURED: Packaged Food (Diversified)
└── RETAIL: Supermarket Chain
```
**Example:** Kroger (partial), Aldi (private label)

### Full Textile Chain

```
├── RAW: Industrial Crop (Cotton)
├── SEMI_RAW: Textile Mill
├── MANUFACTURED: Clothing Mfg (Full Apparel)
└── RETAIL: Fashion Retail Chain
```
**Example:** Zara/Inditex, Uniqlo/Fast Retailing

### Full Petroleum Chain

```
├── RAW: Energy Extraction (Oil + Gas)
├── SEMI_RAW: Petroleum Refinery + Chemical Production
├── MANUFACTURED: (minimal - some chemical products)
└── RETAIL: Convenience Store (Gas Stations)
```
**Example:** ExxonMobil, Shell, BP

### Full Electronics Chain

```
├── RAW: (rare) Mining interests
├── SEMI_RAW: Metal Processing + Component Manufacturing
├── MANUFACTURED: Electronics Mfg + Appliance Mfg
└── RETAIL: Electronics Retail (Brand Stores)
```
**Example:** Samsung (most vertically integrated electronics company)

---

## VERTICAL CHAIN SUMMARY TABLE

| Chain Name | RAW Source | SEMI_RAW | MANUFACTURED | RETAIL | Rarity |
|------------|------------|----------|--------------|--------|--------|
| Wheat/Bakery | Grain Farm | Flour Mill | Bread, Cake | Supermarket | Common |
| Corn/Cereal | Grain Farm | - | Cereal, Alcohol | Supermarket | Common |
| Soybean/Oil | Grain Farm | Oil Processor | Cooking Oil | Supermarket | Common |
| Sugar/Confection | Industrial Crop | Sugar Refinery | Candy, Soda | Supermarket | Common |
| Fruit/Juice | Produce Farm | Fruit Processor | Packaged Fruits | Supermarket | Common |
| Beef | Livestock | Meat Processor | Packaged Meat | Supermarket | Common |
| Pork | Livestock | Meat Processor | Packaged Meat | Supermarket | Common |
| Poultry | Poultry Farm | Meat Processor | Packaged Meat | Supermarket | Common |
| Dairy | Dairy Farm | Dairy Processor | Ice Cream, Formula | Supermarket | Common |
| Seafood | Fishing | Seafood Processor | Packaged Seafood | Supermarket | Moderate |
| Cotton/Apparel | Industrial Crop | Textile Mill | Clothing | Fashion Retail | Common |
| Leather/Goods | Livestock | Leather Processor | Shoes, Bags | Fashion Retail | Moderate |
| Rubber/Tires | Industrial Crop | Rubber Processor | Tires | Auto Retail | Moderate |
| Steel/Heavy | Mining (Ferrous) | Steel Processing | Vehicles, Parts | Auto Retail | Common |
| Copper/Electronics | Mining (Non-Ferrous) | Metal Processing | Electronics | Electronics Retail | Moderate |
| Aluminum/Electronics | Mining (Non-Ferrous) | Metal Processing | Electronics | Electronics Retail | Moderate |
| Gold/Jewelry | Mining (Precious) | - | Jewelry | Fashion Retail | Uncommon |
| Oil/Fuel | Energy Extraction | Refinery | - | Convenience | Common |
| Oil/Plastics | Energy Extraction | Refinery | Consumer Goods | Various | Moderate |
| Oil/Chemicals | Energy Extraction | Refinery + Chemicals | Health, Beauty | Pharmacy | Moderate |
| Lumber/Furniture | Logging | Lumber Mill | Furniture | Home Goods | Moderate |
| Pulp/Paper | Logging | Pulp Mill | Paper Products | Supermarket | Common |
| Glass | Mining (Minerals) | Glass Mfg | Beverages, Eyewear | Various | Uncommon |
| Cement | Mining (Minerals) | - | Cement | Hardware Retail | Moderate |

---

## INTEGRATION LEVEL RULES

This section defines the rules, requirements, and restrictions for each level of vertical integration.

### Integration Level Overview

| Level | Name | Tiers Controlled | Rarity | Description |
|-------|------|------------------|--------|-------------|
| 0 | Pure Specialist | 1 tier | 60% | Single industry tier, focused operations |
| 1 | Adjacent Integration | 2 adjacent tiers | 25% | Controls supplier OR customer tier |
| 2 | Extended Chain | 3 tiers | 10% | Controls significant portion of supply chain |
| 3 | Near-Full Integration | 4 tiers | 4% | RAW through MANUFACTURED or SEMI through RETAIL |
| 4 | Full Vertical | All 4 tiers | 1% | Complete RAW → RETAIL control (extremely rare) |

---

### Level 0: Pure Specialist

**Definition:** Corporation operates in a single industry tier only.

**Characteristics:**
- Single persona type (e.g., only Mining, only Manufacturing)
- May have multiple product focuses within that persona
- No ownership of suppliers or customers
- Relies entirely on market transactions

**Examples by Tier:**

| Tier | Example Corporation | Product Focus |
|------|---------------------|---------------|
| RAW | Iron Mining Corp | Iron Ore, Coal |
| RAW | Valley Grain Farms | Wheat, Corn, Soybeans |
| SEMI_RAW | Pacific Steel Works | Steel |
| SEMI_RAW | Heartland Flour Mills | Flour |
| MANUFACTURED | Fashion Forward Inc | Shirts, Jeans, Jackets |
| MANUFACTURED | TechGear Electronics | Laptops, Tablets, Phones |
| RETAIL | Metro Supermarkets | Grocery retail |
| RETAIL | City Fashion Stores | Apparel retail |

**Advantages:**
- Lower capital requirements
- Focused expertise
- Operational simplicity
- Flexibility to switch suppliers/customers

**Disadvantages:**
- Vulnerable to supply disruptions
- No control over input costs
- Margin pressure from both directions
- Limited pricing power

**Requirements:**
```
├── Minimum Capital: Base requirement for persona
├── Management Complexity: Low (1.0x)
├── Personas Allowed: 1 (with multiple product focuses)
└── Horizontal Expansion: Allowed within same tier
```

---

### Level 1: Adjacent Integration

**Definition:** Corporation controls two adjacent tiers in the supply chain.

**Valid Combinations:**

| Pattern | Tiers | Direction | Example |
|---------|-------|-----------|---------|
| Backward | RAW + SEMI_RAW | Upstream | Mining + Steel Processing |
| Backward | SEMI_RAW + MANUFACTURED | Upstream | Flour Mill + Bakery |
| Forward | SEMI_RAW + MANUFACTURED | Downstream | Textile Mill + Clothing |
| Forward | MANUFACTURED + RETAIL | Downstream | Electronics + Electronics Retail |

**Direction Rules:**

**Backward Integration (controlling suppliers):**
- Secures raw material supply
- Reduces input cost volatility
- Common in commodity-dependent industries
- Example: Steel company buys iron mines

**Forward Integration (controlling customers):**
- Captures downstream margins
- Direct access to end markets
- Controls distribution/branding
- Example: Clothing manufacturer opens retail stores

**Requirements:**
```
├── Minimum Capital: 2x base requirement
├── Management Complexity: Moderate (1.5x)
├── Personas Required: 2 (must be adjacent tiers)
├── Affinity Requirement: Natural or Compatible
└── Transition Time: 2-4 years to establish
```

**Valid Adjacent Pairs:**

| RAW → SEMI_RAW | SEMI_RAW → MANUFACTURED | MANUFACTURED → RETAIL |
|----------------|-------------------------|----------------------|
| Iron Mining → Steel | Steel → Vehicles | Vehicles → Auto Dealer |
| Copper Mining → Metal Processing | Steel → Auto Parts | Auto Parts → Auto Parts Store |
| Logging → Lumber Mill | Steel → Appliances | Appliances → Electronics Retail |
| Logging → Pulp Mill | Steel → Tools | Tools → Hardware Retail |
| Grain Farm → Flour Mill | Flour → Packaged Food | Packaged Food → Supermarket |
| Grain Farm → Oil Processor | Sugar → Packaged Food | Packaged Food → Convenience |
| Sugarcane Farm → Sugar Refinery | Meat → Packaged Food | Beverages → Supermarket |
| Livestock → Meat Processor | Dairy → Packaged Food | Clothing → Fashion Retail |
| Dairy Farm → Dairy Processor | Textile → Clothing | Clothing → Department Store |
| Cotton Farm → Textile Mill | Leather → Accessories | Accessories → Fashion Retail |
| Rubber Plantation → Rubber Processor | Rubber → Tires | Electronics → Electronics Retail |
| Oil Extraction → Refinery | Chemicals → Health/Beauty | Furniture → Home Goods |
| Fishing → Seafood Processor | Glass → Beverages | Beauty → Beauty Retail |
| Minerals Mining → Glass Mfg | Paper → Cleaning Products | Health → Pharmacy |

**Restrictions:**
- Cannot skip tiers (no RAW → MANUFACTURED without SEMI_RAW)
- Must have supply/demand relationship between tiers
- Second persona must have Natural or Compatible affinity with first

---

### Level 2: Extended Chain

**Definition:** Corporation controls three consecutive tiers in the supply chain.

**Valid Combinations:**

| Pattern | Tiers | Example Chain |
|---------|-------|---------------|
| RAW-Heavy | RAW + SEMI_RAW + MANUFACTURED | Mining → Steel → Vehicles |
| Processing-Heavy | SEMI_RAW + MANUFACTURED + RETAIL | Textile → Clothing → Fashion Retail |
| Balanced | RAW + SEMI_RAW + MANUFACTURED | Grain → Flour → Packaged Food |

**Requirements:**
```
├── Minimum Capital: 5x base requirement
├── Management Complexity: High (2.5x)
├── Personas Required: 3 (consecutive tiers)
├── Affinity Requirement: All pairs must be Natural or Compatible
├── Transition Time: 5-8 years to establish
└── Corporate Structure: Divisional organization required
```

**Example Extended Chains:**

| Chain Type | RAW | SEMI_RAW | MANUFACTURED |
|------------|-----|----------|--------------|
| Food | Grain Farm | Flour Mill | Bakery (Bread, Cake) |
| Protein | Livestock Ranch | Meat Processor | Packaged Meat |
| Textile | Cotton Farm | Textile Mill | Clothing Manufacturer |
| Steel | Iron Mining | Steel Processing | Vehicle/Auto Parts |
| Paper | Logging | Pulp Mill | Paper Products |
| Petroleum | Oil Extraction | Refinery | (Chemicals → Consumer) |

| Chain Type | SEMI_RAW | MANUFACTURED | RETAIL |
|------------|----------|--------------|--------|
| Fashion | Textile Mill | Clothing Mfg | Fashion Retail |
| Electronics | Metal Processing | Electronics | Electronics Retail |
| Home | Lumber Mill | Furniture | Home Goods Retail |
| Consumer | Chemical Production | Health/Beauty | Pharmacy/Beauty Retail |

**Governance Requirements:**
- Separate P&L for each tier
- Internal transfer pricing policies
- Cross-tier coordination committee
- Dedicated supply chain management

**Advantages:**
- Significant cost control
- Quality assurance across chain
- Reduced transaction costs
- Strategic flexibility

**Disadvantages:**
- High capital requirements
- Management complexity
- Potential for internal inefficiency
- Antitrust scrutiny possible

---

### Level 3: Near-Full Integration

**Definition:** Corporation controls four tiers, missing only one end of the supply chain.

**Valid Combinations:**

| Pattern | Missing Tier | Tiers Controlled | Example |
|---------|--------------|------------------|---------|
| No RAW | RAW | SEMI + MFG + RETAIL | Textile → Clothing → Fashion → Retail |
| No RETAIL | RETAIL | RAW + SEMI + MFG | Mining → Steel → Vehicles |

**Requirements:**
```
├── Minimum Capital: 15x base requirement
├── Management Complexity: Very High (4.0x)
├── Personas Required: 4+ across 4 tiers
├── Affinity Requirement: All connections Natural or Compatible
├── Transition Time: 10-15 years to establish
├── Corporate Structure: Holding company with autonomous divisions
└── Regulatory: May require antitrust review
```

**Example Near-Full Chains:**

**Pattern: No RAW (Processor-to-Consumer)**
```
SEMI_RAW          MANUFACTURED         RETAIL
───────────────────────────────────────────────
Textile Mill ──→ Clothing Mfg ──────→ Fashion Retail Chain
                 Accessories Mfg       Department Stores

Chemical Prod ─→ Health Products ───→ Pharmacy Chain
                 Beauty Products       Beauty Retail
                 Cleaning Products
```

**Pattern: No RETAIL (Resource-to-Product)**
```
RAW              SEMI_RAW             MANUFACTURED
───────────────────────────────────────────────
Iron Mining ──→ Steel Processing ──→ Vehicle Manufacturer
Rubber Plant     Rubber Processing    Auto Parts Manufacturer

Grain Farm ───→ Flour Mill ────────→ Packaged Food
Dairy Farm       Dairy Processor      Beverage Manufacturer
Livestock        Meat Processor
```

**Governance Requirements:**
- Holding company structure
- Independent board oversight
- Formal transfer pricing audits
- Regulatory compliance team
- Strategic planning office

**Why Not Full Vertical?**

Most corporations stop at Level 3 because:
1. **RAW resources** require different expertise (geology, agriculture)
2. **Retail operations** require customer-facing skills
3. **Capital efficiency** - better to partner than own
4. **Antitrust concerns** increase with full integration
5. **Management span** becomes unwieldy

---

### Level 4: Full Vertical Integration

**Definition:** Corporation controls all four tiers from RAW extraction to RETAIL sales.

**Rarity:** Only 1-2% of corporations achieve this. Reserved for:
- Dominant industry players
- Strategic national champions
- Highly integrated commodity chains

**Requirements:**
```
├── Minimum Capital: 50x base requirement
├── Management Complexity: Extreme (6.0x)
├── Personas Required: 5+ across all 4 tiers
├── Affinity Requirement: Complete chain coherence
├── Transition Time: 15-25 years to establish
├── Corporate Structure: Conglomerate holding company
├── Regulatory: Mandatory antitrust review
└── Special Conditions: See below
```

**Special Conditions for Full Vertical:**

1. **Industry Coherence:** All tiers must serve the same end market
   - ✅ Oil → Refinery → (minimal mfg) → Gas Stations
   - ✅ Cotton → Textile → Clothing → Fashion Retail
   - ❌ Mining → Steel → Food Manufacturing → Supermarket

2. **Market Position:** Must have significant market share in primary tier
   - Minimum 15% market share in home country for primary persona

3. **Historical Justification:** Full vertical typically emerges from:
   - Decades of gradual acquisition
   - Government-backed industrial policy
   - Unique geographic/resource advantages

4. **Ongoing Requirements:**
   - Annual antitrust compliance reporting
   - Transfer pricing transparency
   - Open access requirements for competitors (in some cases)

**Example Full Vertical Chains:**

**Petroleum (Most Common Full Vertical)**
```
RAW                SEMI_RAW              MANUFACTURED    RETAIL
─────────────────────────────────────────────────────────────────
Oil Extraction ──→ Petroleum Refinery ──→ (Lubricants) ─→ Gas Station
Natural Gas         Fuel Production        Oil & Fluids    Convenience Store
                    Chemical Production
```
**Examples:** ExxonMobil, Shell, BP, Chevron, Saudi Aramco

**Fast Fashion (Rare)**
```
RAW                SEMI_RAW              MANUFACTURED    RETAIL
─────────────────────────────────────────────────────────────────
(Limited)         Textile Mill ────────→ Clothing Mfg ──→ Fashion Retail
Cotton sourcing    Fabric Production      Design/Assembly  Brand Stores
```
**Examples:** Inditex (Zara), Fast Retailing (Uniqlo)

**Food/Grocery (Partial - Private Label)**
```
RAW                SEMI_RAW              MANUFACTURED    RETAIL
─────────────────────────────────────────────────────────────────
Farm operations ─→ Processing ──────────→ Private Label ─→ Supermarket
(contracted)       (owned/contracted)     Manufacturing    Chain
```
**Examples:** Kroger, Aldi, Costco (Kirkland brand)

---

### Integration Progression Rules

**How Corporations Move Between Levels:**

```
Level 0 ──────→ Level 1 ──────→ Level 2 ──────→ Level 3 ──────→ Level 4
(Specialist)   (Adjacent)      (Extended)      (Near-Full)     (Full)
   60%            25%             10%              4%              1%
```

**Progression Requirements:**

| From → To | Capital Multiplier | Time Required | Success Rate |
|-----------|-------------------|---------------|--------------|
| 0 → 1 | 2x current | 2-4 years | 70% |
| 1 → 2 | 2.5x current | 3-5 years | 50% |
| 2 → 3 | 3x current | 5-8 years | 30% |
| 3 → 4 | 3.5x current | 8-15 years | 10% |

**Progression Methods:**

1. **Acquisition:** Buy existing company in target tier
   - Fastest method
   - Highest capital requirement
   - Integration risk

2. **Greenfield:** Build new operations in target tier
   - Slower but controlled
   - Lower acquisition premium
   - Execution risk

3. **Joint Venture:** Partner with existing player
   - Shared risk/capital
   - Limited control
   - May convert to full ownership later

4. **Backward from Contracts:** Convert long-term supplier contracts to ownership
   - Natural progression
   - Proven relationship
   - Supplier may resist

**Regression Rules:**

Corporations may also move DOWN integration levels:

| Trigger | Action | Result |
|---------|--------|--------|
| Financial distress | Divest non-core tier | Level decreases |
| Strategic refocus | Spin off division | Level decreases |
| Antitrust order | Forced divestiture | Level decreases |
| Poor performance | Close unprofitable tier | Level decreases |

---

### Integration Level by Industry

**Industries Most Likely to Integrate:**

| Industry | Typical Max Level | Reason |
|----------|------------------|--------|
| Petroleum | Level 4 | High capital, strategic resource |
| Steel | Level 2-3 | Capital intensive, commodity |
| Food/Beverage | Level 2-3 | Perishability, quality control |
| Apparel/Fashion | Level 2-3 | Speed to market, brand control |
| Electronics | Level 1-2 | Complexity, rapid change |
| Retail | Level 1-2 | Customer focus, local expertise |
| Automotive | Level 2-3 | Quality control, scale |
| Chemicals | Level 2-3 | Process integration |

**Industries Rarely Integrated:**

| Industry | Typical Max Level | Reason |
|----------|------------------|--------|
| Mining (pure) | Level 0-1 | Specialized geology |
| Farming (pure) | Level 0-1 | Land/climate dependent |
| Banking | Level 0 | Regulatory separation |
| Luxury goods | Level 1-2 | Brand exclusivity |

---

### Integration Level Calculations

**Capital Requirement Formula:**
```
Required Capital = Base Capital × Level Multiplier × Industry Factor

Level Multipliers:
- Level 0: 1.0x
- Level 1: 2.0x
- Level 2: 5.0x
- Level 3: 15.0x
- Level 4: 50.0x

Industry Factors:
- Mining/Energy: 2.0x
- Heavy Manufacturing: 1.5x
- Consumer Goods: 1.0x
- Retail: 0.8x
- Services: 0.5x
```

**Management Complexity Formula:**
```
Complexity Score = Base Complexity × Tier Count × Persona Count × Geographic Spread

Thresholds:
- Score < 5: Manageable (no penalty)
- Score 5-10: Challenging (efficiency -10%)
- Score 10-20: Difficult (efficiency -20%)
- Score > 20: Unwieldy (efficiency -30%, risk of spin-off)
```

**Efficiency Impact:**
```
Operating Efficiency = Base Efficiency × Integration Bonus × Complexity Penalty

Integration Bonuses:
- Level 1: +5% (reduced transaction costs)
- Level 2: +10% (supply chain control)
- Level 3: +12% (but offset by complexity)
- Level 4: +15% (but high complexity penalty)
```

---

### Integration Decision Matrix

**Should a Corporation Integrate?**

| Factor | Favors Integration | Favors Specialization |
|--------|-------------------|----------------------|
| Supply volatility | High | Low |
| Input costs | Rising/Volatile | Stable |
| Quality requirements | Critical | Acceptable |
| Speed to market | Essential | Flexible |
| Capital availability | Abundant | Limited |
| Management depth | Strong | Limited |
| Industry consolidation | High | Low |
| Regulatory environment | Permissive | Restrictive |
| Technology change | Slow | Rapid |

**Integration Score Calculation:**
```
For each factor, score 0-2:
- 0 = Favors Specialization
- 1 = Neutral
- 2 = Favors Integration

Total Score:
- 0-6: Stay at Level 0
- 7-10: Consider Level 1
- 11-14: Consider Level 2
- 15-16: Consider Level 3
- 17-18: Consider Level 4 (if viable)
```

---

## HORIZONTAL GROUP COMBINATIONS

### Same Tier, Related Products

#### RAW Tier Horizontal

| Combination | Personas | Affinity | Real-World Example |
|-------------|----------|----------|-------------------|
| General Mining | Ferrous + Non-Ferrous + Minerals | Natural | BHP, Rio Tinto |
| Energy Resources | Oil + Gas Extraction | Natural | ExxonMobil |
| Diversified Agriculture | Grain + Livestock + Dairy | Compatible | Cargill |
| Crop Farming | Grain + Industrial Crops + Produce | Compatible | ADM |

#### SEMI_RAW Tier Horizontal

| Combination | Personas | Affinity | Real-World Example |
|-------------|----------|----------|-------------------|
| Food Ingredients | Flour Mill + Sugar Refinery + Oil Processor | Natural | ADM, Cargill |
| Protein Processing | Beef + Pork + Poultry Processing | Natural | Tyson, JBS |
| Petroleum Products | Fuel + Plastics + Chemicals | Natural | ExxonMobil |
| Metal Products | Steel + Copper Wire + Aluminum | Compatible | - |

#### MANUFACTURED Tier Horizontal

| Combination | Personas | Affinity | Real-World Example |
|-------------|----------|----------|-------------------|
| Consumer Packaged Goods | Food + Beverage + Cleaning + Beauty | Natural | P&G, Unilever |
| Food Company | Packaged Food + Beverage | Natural | PepsiCo, Nestlé |
| Personal Care | Health + Beauty Products | Natural | Johnson & Johnson |
| Fashion House | Clothing + Accessories | Natural | LVMH, Kering |
| Home Products | Furniture + Appliances | Compatible | - |
| Electronics Conglomerate | Electronics + Appliances | Natural | Samsung, LG |
| Automotive Group | Vehicles + Auto Parts | Natural | Toyota, GM |

#### RETAIL Tier Horizontal

| Combination | Personas | Affinity | Real-World Example |
|-------------|----------|----------|-------------------|
| Grocery Group | Supermarket + Convenience + Discount Grocery | Natural | Kroger |
| Fashion Retail Group | Fashion + Footwear + Accessories Retail | Natural | TJX Companies |
| Home Retail Group | Home Goods + Hardware | Compatible | - |
| Health & Beauty Retail | Pharmacy + Beauty Retail | Natural | Walgreens Boots |

---

## INDUSTRIAL CONGLOMERATE TEMPLATES

### Food & Beverage Conglomerate

**Structure:**
```
├── RAW: Grain Farm, Produce Farm, Livestock Ranch
├── SEMI_RAW: Flour Mill, Sugar Refinery, Meat Processor, Fruit Processor
├── MANUFACTURED: Packaged Food, Beverage Manufacturer
└── RETAIL: (optional) Supermarket Chain
```

**Real-World Examples:** Nestlé, PepsiCo, Tyson Foods, Cargill

**Valid Persona Combinations:**
| Primary | Can Add | Affinity |
|---------|---------|----------|
| Packaged Food Mfg | Beverage Mfg | Natural |
| Packaged Food Mfg | Flour Mill | Natural |
| Packaged Food Mfg | Sugar Refinery | Natural |
| Packaged Food Mfg | Meat Processor | Natural |
| Packaged Food Mfg | Grain Farm | Compatible |
| Beverage Mfg | Fruit Processor | Natural |
| Beverage Mfg | Sugar Refinery | Compatible |

---

### Consumer Products Conglomerate

**Structure:**
```
├── SEMI_RAW: Chemical Production
├── MANUFACTURED: Health Products, Beauty Products, Cleaning Products, Baby Products
└── RETAIL: (optional) Pharmacy, Supermarket
```

**Real-World Examples:** Procter & Gamble, Unilever, Johnson & Johnson

**Valid Persona Combinations:**
| Primary | Can Add | Affinity |
|---------|---------|----------|
| Beauty Products Mfg | Health Products Mfg | Natural |
| Beauty Products Mfg | Cleaning Products Mfg | Natural |
| Beauty Products Mfg | Baby Products Mfg | Compatible |
| Health Products Mfg | Baby Products Mfg | Natural |
| Any Consumer Mfg | Chemical Production | Compatible |

---

### Electronics & Technology Conglomerate

**Structure:**
```
├── SEMI_RAW: Metal Processing (Copper, Aluminum)
├── MANUFACTURED: Electronics Mfg, Appliance Mfg
└── RETAIL: (optional) Electronics Retail
```

**Real-World Examples:** Samsung, LG, Sony, Panasonic

**Valid Persona Combinations:**
| Primary | Can Add | Affinity |
|---------|---------|----------|
| Electronics Mfg | Appliance Mfg | Natural |
| Electronics Mfg | Metal Processing | Compatible |
| Electronics Mfg | Electronics Retail | Compatible |
| Appliance Mfg | Home Goods Retail | Compatible |

---

### Fashion & Luxury Conglomerate

**Structure:**
```
├── SEMI_RAW: Textile Mill, Leather Processor
├── MANUFACTURED: Clothing Mfg, Accessories Mfg
└── RETAIL: Fashion Retail, Beauty Retail, Department Store
```

**Real-World Examples:** LVMH, Kering, PVH, Tapestry

**Valid Persona Combinations:**
| Primary | Can Add | Affinity |
|---------|---------|----------|
| Clothing Mfg | Accessories Mfg | Natural |
| Clothing Mfg | Textile Mill | Compatible |
| Clothing Mfg | Fashion Retail | Natural |
| Accessories Mfg | Beauty Products Mfg | Compatible |
| Accessories Mfg | Leather Processor | Compatible |

---

### Petroleum & Energy Conglomerate

**Structure:**
```
├── RAW: Energy Extraction (Oil, Gas)
├── SEMI_RAW: Petroleum Refinery, Chemical Production
├── MANUFACTURED: (minimal)
└── RETAIL: Convenience Store (Gas Stations)
```

**Real-World Examples:** ExxonMobil, Shell, BP, Chevron

**Valid Persona Combinations:**
| Primary | Can Add | Affinity |
|---------|---------|----------|
| Energy Extraction | Petroleum Refinery | Natural |
| Petroleum Refinery | Chemical Production | Natural |
| Petroleum Refinery | Convenience Store | Natural |
| Energy Extraction | Convenience Store | Compatible |

---

### Automotive Conglomerate

**Structure:**
```
├── SEMI_RAW: Steel Processing, Rubber Processing
├── MANUFACTURED: Vehicle Mfg, Auto Parts Mfg
└── RETAIL: Automotive Retail (Dealerships)
```

**Real-World Examples:** Toyota, GM, Ford, Volkswagen

**Valid Persona Combinations:**
| Primary | Can Add | Affinity |
|---------|---------|----------|
| Vehicle Mfg | Auto Parts Mfg | Natural |
| Vehicle Mfg | Steel Processing | Compatible |
| Vehicle Mfg | Rubber Processing | Compatible |
| Vehicle Mfg | Automotive Retail | Natural |
| Auto Parts Mfg | Rubber Processing | Natural |

---

### Forest Products Conglomerate

**Structure:**
```
├── RAW: Logging Company
├── SEMI_RAW: Lumber Mill, Pulp Mill, Paper Mfg
├── MANUFACTURED: Furniture Mfg, Cleaning Products (Paper)
└── RETAIL: (optional) Home Goods, Hardware
```

**Real-World Examples:** Weyerhaeuser, Georgia-Pacific, International Paper

**Valid Persona Combinations:**
| Primary | Can Add | Affinity |
|---------|---------|----------|
| Logging Company | Lumber Mill | Natural |
| Logging Company | Pulp Mill | Natural |
| Lumber Mill | Pulp Mill | Natural |
| Lumber Mill | Furniture Mfg | Compatible |
| Pulp Mill | Paper Mfg | Natural |
| Paper Mfg | Cleaning Products (Paper focus) | Compatible |

---

### Retail Conglomerate

**Structure:**
```
├── RETAIL: Multiple retail formats
└── MANUFACTURED: (optional) Private Label operations
```

**Real-World Examples:** Walmart, Target, Amazon, Kroger

**Valid Persona Combinations:**
| Primary | Can Add | Affinity |
|---------|---------|----------|
| General Merchandise | Supermarket | Natural |
| General Merchandise | Warehouse Club | Natural |
| Supermarket | Convenience Store | Natural |
| Supermarket | Pharmacy | Natural |
| Fashion Retail | Beauty Retail | Compatible |
| Electronics Retail | Appliance focus of Home Goods | Natural |

---

## INCOMPATIBLE COMBINATIONS

These persona combinations should **never** occur:

| Persona A | Persona B | Reason |
|-----------|-----------|--------|
| Mining (Ferrous) | Clothing Mfg | No supply chain connection |
| Fishing Fleet | Electronics Mfg | No supply chain connection |
| Petroleum Refinery | Furniture Mfg | No material relationship |
| Grain Farm | Electronics Mfg | No supply chain connection |
| Textile Mill | Vehicle Mfg | No material relationship |
| Dairy Processor | Hardware Mfg | No supply chain connection |
| Beauty Products | Construction Mfg | No material relationship |
| Toy Retail | Auto Parts Retail | No customer overlap |

**Rule:** If two personas share no common:
- Input materials
- Output products
- Customer base
- Supply chain adjacency

They should NOT combine into a conglomerate.

---

## GENERATION ALGORITHM

### Step 1: Determine Corporation Type

| Type | Weight | Description |
|------|--------|-------------|
| Specialist | 60% | Single persona, focused |
| Horizontal Group | 20% | 2-3 same-tier personas |
| Vertical Chain | 12% | 2-3 adjacent-tier personas |
| Industrial Conglomerate | 6% | 3-5 related personas |
| Full Vertical | 2% | RAW to RETAIL chain |

### Step 2: Select Primary Persona

Based on industry weights and city needs.

### Step 3: Add Secondary Personas (if applicable)

```javascript
function canAddPersona(primary, candidate) {
    // Check affinity table
    const affinity = getAffinity(primary, candidate);

    if (affinity === 'Natural') return random() < 0.70;
    if (affinity === 'Compatible') return random() < 0.40;
    if (affinity === 'Possible') return random() < 0.15;
    return false; // Incompatible
}
```

### Step 4: Assign Product Focus

Each persona gets a product focus based on:
- What the primary persona produces/consumes
- Supply chain needs
- Market demand

---

## CONGLOMERATE NAMING PATTERNS

| Type | Naming Convention | Examples |
|------|-------------------|----------|
| Specialist | "[Product] [Corp Type]" | "Iron Mining Corp", "Cotton Textiles Inc" |
| Horizontal | "[Category] [Group]" | "Consumer Products Group", "Food Industries" |
| Vertical | "[End Product] [Holdings]" | "Steel Holdings", "Dairy Foods Corp" |
| Industrial | "[Founder] Industries" or "[Region] Corp" | "Pacific Industries", "Continental Corp" |
| Diversified | "[Name] Holdings" | "Berkshire Holdings" |

---

## SUMMARY TABLES

### Quick Reference: Natural Combinations

| If Primary Is | Natural Partners |
|---------------|------------------|
| Grain Farm | Flour Mill, Oil Processor |
| Livestock Ranch | Meat Processor, Leather Processor |
| Mining (Ferrous) | Steel Processing |
| Mining (Non-Ferrous) | Metal Processing |
| Energy Extraction | Petroleum Refinery |
| Logging | Lumber Mill, Pulp Mill |
| Packaged Food Mfg | Beverage Mfg |
| Health Products Mfg | Beauty Products Mfg |
| Electronics Mfg | Appliance Mfg |
| Clothing Mfg | Accessories Mfg |
| Vehicle Mfg | Auto Parts Mfg |
| Supermarket | Convenience Store, Pharmacy |
| General Merchandise | Warehouse Club |

### Quick Reference: Vertical Chains

| Chain Name | RAW | SEMI_RAW | MANUFACTURED | RETAIL |
|------------|-----|----------|--------------|--------|
| Food | Grain/Livestock | Flour/Meat | Packaged Food | Supermarket |
| Textile | Cotton | Textile Mill | Clothing | Fashion Retail |
| Steel | Iron Mining | Steel Processing | Auto Parts | - |
| Petroleum | Oil Extraction | Refinery | - | Convenience |
| Paper | Logging | Pulp/Paper Mill | Cleaning (Paper) | - |
| Electronics | - | Metal Processing | Electronics | Electronics Retail |
