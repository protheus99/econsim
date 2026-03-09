# Sample Corporation Generation Output

**Simulation Parameters:**
- Seed: 42
- Target Corporations: 25
- Distribution: 60% Specialist, 20% Horizontal, 12% Vertical, 6% Conglomerate, 2% Full Vertical

---

## Generation Summary

| Type | Target | Generated | Percentage |
|------|--------|-----------|------------|
| Specialist (Level 0) | 15 | 15 | 60% |
| Horizontal Group | 5 | 5 | 20% |
| Vertical Chain (Level 1-2) | 3 | 3 | 12% |
| Industrial Conglomerate (Level 3) | 2 | 2 | 8% |
| **Total** | **25** | **25** | **100%** |

---

## SPECIALIST CORPORATIONS (Level 0)

### 1. Ferrous Mining Corp
```
Type:           Specialist
Integration:    Level 0
Industry:       RAW
Persona:        Mining Company
Product Focus:  Ferrous Metals
```

| Property | Value |
|----------|-------|
| Products | Iron Ore, Coal |
| Downstream Affinity | Steel Processing |
| Facilities | 3 mining operations |
| Employees | 2,400 |
| Annual Revenue | $180M |

**Facilities:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| FMC Iron Mine #1 | Pittsburgh | Iron Ore | 50,000 tons/month |
| FMC Iron Mine #2 | Cleveland | Iron Ore | 35,000 tons/month |
| FMC Coal Mine | Wheeling | Coal | 25,000 tons/month |

---

### 2. Valley Grain Farms Inc
```
Type:           Specialist
Integration:    Level 0
Industry:       RAW
Persona:        Farm - Crop Production
Product Focus:  Grain Farming
```

| Property | Value |
|----------|-------|
| Products | Wheat, Corn, Soybeans |
| Downstream Affinity | Flour Mill, Oil Processor |
| Facilities | 4 farm operations |
| Employees | 850 |
| Annual Revenue | $95M |

**Facilities:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| VGF Wheat Farm | Des Moines | Wheat | 8,000 bushels/month |
| VGF Corn Farm East | Springfield | Corn | 12,000 bushels/month |
| VGF Corn Farm West | Topeka | Corn | 10,000 bushels/month |
| VGF Soybean Farm | Lincoln | Soybeans | 6,000 bushels/month |

---

### 3. Pacific Steel Works
```
Type:           Specialist
Integration:    Level 0
Industry:       SEMI_RAW
Persona:        Steel Processing Plant
Product Focus:  Steel Production
```

| Property | Value |
|----------|-------|
| Products | Steel |
| Upstream Source | Iron Ore, Coal |
| Downstream Affinity | Vehicle Mfg, Auto Parts, Appliances |
| Facilities | 2 processing plants |
| Employees | 3,200 |
| Annual Revenue | $420M |

**Facilities:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| PSW Main Mill | Gary | Steel | 75,000 tons/month |
| PSW East Plant | Buffalo | Steel | 45,000 tons/month |

---

### 4. Heartland Flour Mills
```
Type:           Specialist
Integration:    Level 0
Industry:       SEMI_RAW
Persona:        Food Ingredient Processor
Product Focus:  Grain Processing
```

| Property | Value |
|----------|-------|
| Products | Flour |
| Upstream Source | Wheat |
| Downstream Affinity | Packaged Food (Bakery) |
| Facilities | 2 mills |
| Employees | 420 |
| Annual Revenue | $65M |

**Facilities:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| HFM Mill #1 | Kansas City | Flour | 15,000 tons/month |
| HFM Mill #2 | Omaha | Flour | 12,000 tons/month |

---

### 5. Sunrise Textile Mills
```
Type:           Specialist
Integration:    Level 0
Industry:       SEMI_RAW
Persona:        Textile Processing Mill
Product Focus:  Cotton Textiles
```

| Property | Value |
|----------|-------|
| Products | Cotton Fabric |
| Upstream Source | Cotton |
| Downstream Affinity | Clothing Mfg |
| Facilities | 2 textile mills |
| Employees | 1,800 |
| Annual Revenue | $145M |

**Facilities:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| STM Main Mill | Charlotte | Cotton Fabric | 500,000 yards/month |
| STM South Plant | Atlanta | Cotton Fabric | 350,000 yards/month |

---

### 6. Modern Apparel Co
```
Type:           Specialist
Integration:    Level 0
Industry:       MANUFACTURED
Persona:        Clothing Manufacturer
Product Focus:  Casual Wear
```

| Property | Value |
|----------|-------|
| Products | Shirts, Jeans, Sweaters |
| Upstream Source | Cotton Fabric |
| Downstream Affinity | Fashion Retail |
| Facilities | 3 manufacturing plants |
| Employees | 2,100 |
| Annual Revenue | $180M |

**Facilities:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| MAC Shirts Factory | Los Angeles | Shirts | 50,000 units/month |
| MAC Denim Plant | El Paso | Jeans | 35,000 units/month |
| MAC Knits Factory | Phoenix | Sweaters | 25,000 units/month |

---

### 7. TechGear Electronics
```
Type:           Specialist
Integration:    Level 0
Industry:       MANUFACTURED
Persona:        Electronics Manufacturer
Product Focus:  Computing
```

| Property | Value |
|----------|-------|
| Products | Laptops, Personal Computers, Tablets |
| Upstream Source | Aluminum Sheets, Copper Wire, Plastic Pellets |
| Downstream Affinity | Electronics Retail |
| Facilities | 2 assembly plants |
| Employees | 4,500 |
| Annual Revenue | $890M |

**Facilities:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| TGE Computing Plant | Austin | Laptops, PCs | 25,000 units/month |
| TGE Mobile Plant | San Jose | Tablets | 40,000 units/month |

---

### 8. Home Comfort Appliances
```
Type:           Specialist
Integration:    Level 0
Industry:       MANUFACTURED
Persona:        Appliance Manufacturer
Product Focus:  Full Appliance
```

| Property | Value |
|----------|-------|
| Products | Washing Machine, Dryer, Microwave, Air Conditioner |
| Upstream Source | Steel, Copper Wire, Aluminum Sheets |
| Downstream Affinity | Electronics Retail, Home Goods Retail |
| Facilities | 2 manufacturing plants |
| Employees | 3,800 |
| Annual Revenue | $520M |

**Facilities:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| HCA Large Appliance | Louisville | Washer, Dryer | 15,000 units/month |
| HCA Small Appliance | Nashville | Microwave, AC | 30,000 units/month |

---

### 9. Fresh Choice Bakery Corp
```
Type:           Specialist
Integration:    Level 0
Industry:       MANUFACTURED
Persona:        Packaged Food Manufacturer
Product Focus:  Bakery
```

| Property | Value |
|----------|-------|
| Products | Bread, Cake |
| Upstream Source | Flour, Sugar, Eggs |
| Downstream Affinity | Supermarket, Convenience Store |
| Facilities | 3 bakery plants |
| Employees | 1,200 |
| Annual Revenue | $95M |

**Facilities:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| FCB Bread Plant #1 | Chicago | Bread | 200,000 loaves/month |
| FCB Bread Plant #2 | Milwaukee | Bread | 150,000 loaves/month |
| FCB Sweets Factory | Indianapolis | Cake | 50,000 units/month |

---

### 10. Sparkle Beauty Products
```
Type:           Specialist
Integration:    Level 0
Industry:       MANUFACTURED
Persona:        Beauty Products Manufacturer
Product Focus:  Full Beauty
```

| Property | Value |
|----------|-------|
| Products | Shampoo, Deodorant, Soap, Makeup |
| Upstream Source | Industrial Chemicals, Plastic Pellets |
| Downstream Affinity | Supermarket, Beauty Retail, Pharmacy |
| Facilities | 2 manufacturing plants |
| Employees | 1,600 |
| Annual Revenue | $210M |

**Facilities:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| SPB Personal Care | Cincinnati | Shampoo, Deodorant, Soap | 500,000 units/month |
| SPB Cosmetics | Columbus | Makeup | 200,000 units/month |

---

### 11. Metro Supermarkets Inc
```
Type:           Specialist
Integration:    Level 0
Industry:       RETAIL
Persona:        Supermarket Chain
Product Focus:  Full Supermarket
Store Format:   Supermarket (Medium)
```

| Property | Value |
|----------|-------|
| Products Sold | Food, Beverages, Cleaning, Health, Beauty |
| Upstream Suppliers | Multiple consumer goods manufacturers |
| Facilities | 12 retail stores |
| Employees | 2,800 |
| Annual Revenue | $340M |

**Facilities:**
| Store Name | City | Format | SKUs |
|------------|------|--------|------|
| Metro #101-104 | Detroit (4 stores) | Supermarket | 25,000 |
| Metro #105-108 | Toledo (4 stores) | Supermarket | 25,000 |
| Metro #109-112 | Ann Arbor (4 stores) | Neighborhood | 12,000 |

---

### 12. QuickStop Convenience
```
Type:           Specialist
Integration:    Level 0
Industry:       RETAIL
Persona:        Convenience Store
Product Focus:  Full Convenience
Store Format:   Gas Station C-Store
```

| Property | Value |
|----------|-------|
| Products Sold | Snacks, Beverages, Basic Groceries |
| Upstream Suppliers | Confectionery, Beverage Manufacturers |
| Facilities | 25 stores |
| Employees | 450 |
| Annual Revenue | $85M |

**Facilities:**
| Store Name | City | Format | SKUs |
|------------|------|--------|------|
| QuickStop (25 locations) | Various | Gas Station C-Store | 3,500 |

---

### 13. Fashion Forward Stores
```
Type:           Specialist
Integration:    Level 0
Industry:       RETAIL
Persona:        Fashion Retailer
Product Focus:  Full Fashion
Store Format:   Apparel Store (Medium)
Market Segment: Mid-Market
```

| Property | Value |
|----------|-------|
| Products Sold | Shirts, Jeans, Jackets, Shoes, Accessories |
| Upstream Suppliers | Clothing, Accessories Manufacturers |
| Facilities | 8 retail stores |
| Employees | 320 |
| Annual Revenue | $48M |

**Facilities:**
| Store Name | City | Format | SKUs |
|------------|------|--------|------|
| FF Store #1-8 | Various malls | Apparel Store | 6,000 |

---

### 14. BuildRight Hardware
```
Type:           Specialist
Integration:    Level 0
Industry:       RETAIL
Persona:        Hardware & Home Improvement Retailer
Product Focus:  Full Hardware
Store Format:   Hardware Store (Small)
```

| Property | Value |
|----------|-------|
| Products Sold | Tools, Cement, Building Materials |
| Upstream Suppliers | Hardware, Construction Manufacturers |
| Facilities | 6 stores |
| Employees | 180 |
| Annual Revenue | $32M |

**Facilities:**
| Store Name | City | Format | SKUs |
|------------|------|--------|------|
| BuildRight #1-6 | Various | Hardware Store | 12,000 |

---

### 15. City Auto Parts
```
Type:           Specialist
Integration:    Level 0
Industry:       RETAIL
Persona:        Automotive Retailer
Product Focus:  Auto Parts
Store Format:   Auto Parts Store
```

| Property | Value |
|----------|-------|
| Products Sold | Tires, Auto Parts, Oil & Fluids, Car Battery |
| Upstream Suppliers | Auto Parts Manufacturers |
| Facilities | 10 stores |
| Employees | 280 |
| Annual Revenue | $65M |

**Facilities:**
| Store Name | City | Format | SKUs |
|------------|------|--------|------|
| CAP Store #1-10 | Various | Auto Parts Store | 22,000 |

---

## HORIZONTAL GROUP CORPORATIONS

### 16. Continental Mining Group
```
Type:           Horizontal Group
Integration:    Level 0 (same tier)
Industry:       RAW
Personas:       Mining Company (Multiple Focus)
```

| Property | Value |
|----------|-------|
| Product Focuses | Ferrous Metals + Non-Ferrous Metals + Industrial Minerals |
| Products | Iron Ore, Coal, Copper Ore, Aluminum Ore, Limestone, Salt |
| Downstream Affinity | Steel Processing, Metal Processing, Glass Mfg |
| Facilities | 8 mining operations |
| Employees | 6,500 |
| Annual Revenue | $780M |

**Facilities:**
| Firm Name | City | Product Focus | Products |
|-----------|------|---------------|----------|
| CMG Iron Mine | Duluth | Ferrous | Iron Ore |
| CMG Coal Mine | Charleston | Ferrous | Coal |
| CMG Copper Mine | Phoenix | Non-Ferrous | Copper Ore |
| CMG Aluminum Mine | Mobile | Non-Ferrous | Aluminum Ore |
| CMG Limestone Quarry #1 | St. Louis | Minerals | Limestone |
| CMG Limestone Quarry #2 | Memphis | Minerals | Limestone |
| CMG Salt Mine | Detroit | Minerals | Salt |
| CMG Multi-Mineral | Denver | Minerals | Silica Sand |

---

### 17. United Protein Processors
```
Type:           Horizontal Group
Integration:    Level 0 (same tier)
Industry:       SEMI_RAW
Personas:       Meat Processing Plant (Multiple Focus)
```

| Property | Value |
|----------|-------|
| Product Focuses | Beef + Pork + Poultry Processing |
| Products | Beef, Pork, Chicken |
| Upstream Source | Cattle, Pigs, Chickens |
| Downstream Affinity | Packaged Food Manufacturer |
| Facilities | 5 processing plants |
| Employees | 4,200 |
| Annual Revenue | $520M |

**Facilities:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| UPP Beef Plant #1 | Omaha | Beef | 50,000 lbs/day |
| UPP Beef Plant #2 | Kansas City | Beef | 40,000 lbs/day |
| UPP Pork Plant | Des Moines | Pork | 45,000 lbs/day |
| UPP Poultry Plant #1 | Little Rock | Chicken | 60,000 lbs/day |
| UPP Poultry Plant #2 | Atlanta | Chicken | 55,000 lbs/day |

---

### 18. Consumer Brands International
```
Type:           Horizontal Group
Integration:    Level 0 (same tier)
Industry:       MANUFACTURED
Personas:       Health + Beauty + Cleaning Products Manufacturer
```

| Property | Value |
|----------|-------|
| Product Focuses | Personal Care + Household Cleaning |
| Products | Cold Medicine, Vitamins, Shampoo, Soap, Cleaning Supplies, Paper Towels |
| Upstream Source | Industrial Chemicals, Plastic Pellets, Paper |
| Downstream Affinity | Supermarket, Pharmacy, Beauty Retail |
| Facilities | 6 manufacturing plants |
| Employees | 5,800 |
| Annual Revenue | $890M |

**Facilities:**
| Firm Name | City | Product Focus | Products |
|-----------|------|---------------|----------|
| CBI Health Plant | New Jersey | Health | Cold Medicine, Vitamins |
| CBI Beauty Plant #1 | Los Angeles | Beauty | Shampoo, Soap |
| CBI Beauty Plant #2 | Dallas | Beauty | Deodorant, Makeup |
| CBI Cleaning Plant | Chicago | Cleaning | Cleaning Supplies |
| CBI Paper Products | Wisconsin | Cleaning | Paper Towels |
| CBI Home Care | Atlanta | Cleaning | Trash Bags |

---

### 19. Premier Grocery Holdings
```
Type:           Horizontal Group
Integration:    Level 0 (same tier)
Industry:       RETAIL
Personas:       Supermarket + Convenience Store + Discount Grocery
```

| Property | Value |
|----------|-------|
| Store Formats | Supermarket + Gas Station C-Store + Limited Assortment |
| Products Sold | Full grocery range |
| Upstream Suppliers | Multiple food and consumer goods manufacturers |
| Facilities | 45 retail locations |
| Employees | 4,200 |
| Annual Revenue | $620M |

**Facilities:**
| Brand | Format | Count | Avg SKUs |
|-------|--------|-------|----------|
| Premier Market | Supermarket | 15 | 28,000 |
| Premier Express | Convenience | 20 | 3,000 |
| Premier Saver | Discount Grocery | 10 | 2,500 |

---

### 20. Home & Style Retail Group
```
Type:           Horizontal Group
Integration:    Level 0 (same tier)
Industry:       RETAIL
Personas:       Home Goods + Electronics + Hardware Retailer
```

| Property | Value |
|----------|-------|
| Store Formats | Furniture Showroom + Electronics Store + Home Center |
| Products Sold | Furniture, Appliances, Electronics, Tools |
| Upstream Suppliers | Furniture, Appliance, Electronics, Hardware Manufacturers |
| Facilities | 18 retail locations |
| Employees | 1,400 |
| Annual Revenue | $280M |

**Facilities:**
| Brand | Format | Count | Avg SKUs |
|-------|--------|-------|----------|
| HomeStyle Furniture | Furniture Showroom | 6 | 4,000 |
| TechZone | Electronics Store | 8 | 8,000 |
| BuildMaster | Hardware Store | 4 | 15,000 |

---

## VERTICAL CHAIN CORPORATIONS (Level 1-2)

### 21. Midwest Grain & Baking Co
```
Type:           Vertical Chain
Integration:    Level 2 (Extended - 3 tiers)
Industry:       RAW → SEMI_RAW → MANUFACTURED
Chain:          Grain → Flour → Bakery
```

| Tier | Persona | Products |
|------|---------|----------|
| RAW | Grain Farm | Wheat |
| SEMI_RAW | Flour Mill | Flour |
| MANUFACTURED | Packaged Food (Bakery) | Bread, Cake, Breakfast Cereal |

| Property | Value |
|----------|-------|
| Total Facilities | 8 |
| Total Employees | 2,400 |
| Annual Revenue | $310M |
| Downstream Affinity | Supermarket (not owned) |

**Facilities by Tier:**

**RAW Tier:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| MGB Wheat Farm #1 | Wichita | Wheat | 10,000 bushels/month |
| MGB Wheat Farm #2 | Oklahoma City | Wheat | 8,000 bushels/month |

**SEMI_RAW Tier:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| MGB Flour Mill | Kansas City | Flour | 20,000 tons/month |
| MGB Flour Mill East | St. Louis | Flour | 15,000 tons/month |

**MANUFACTURED Tier:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| MGB Bread Plant | Kansas City | Bread | 300,000 loaves/month |
| MGB Bread Plant East | Indianapolis | Bread | 200,000 loaves/month |
| MGB Cereal Plant | Minneapolis | Breakfast Cereal | 100,000 boxes/month |
| MGB Sweets Plant | Chicago | Cake | 50,000 units/month |

**Internal Supply Chain:**
```
MGB Wheat Farms ──→ MGB Flour Mills ──→ MGB Bakery Plants ──→ External Retailers
(18,000 bu/mo)      (35,000 tons/mo)    (Bread, Cake, Cereal)   (Supermarkets)
```

---

### 22. Southern Textile & Apparel
```
Type:           Vertical Chain
Integration:    Level 2 (Extended - 3 tiers)
Industry:       SEMI_RAW → MANUFACTURED → RETAIL
Chain:          Textile → Clothing → Fashion Retail
```

| Tier | Persona | Products |
|------|---------|----------|
| SEMI_RAW | Textile Mill | Cotton Fabric |
| MANUFACTURED | Clothing Manufacturer | Shirts, Jeans, Jackets |
| RETAIL | Fashion Retailer | Apparel sales |

| Property | Value |
|----------|-------|
| Total Facilities | 10 |
| Total Employees | 3,800 |
| Annual Revenue | $420M |
| Upstream Affinity | Cotton Farm (not owned) |

**Facilities by Tier:**

**SEMI_RAW Tier:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| STA Textile Mill | Charlotte | Cotton Fabric | 600,000 yards/month |
| STA Textile Mill South | Columbia | Cotton Fabric | 400,000 yards/month |

**MANUFACTURED Tier:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| STA Shirts Factory | Atlanta | Shirts | 80,000 units/month |
| STA Denim Factory | Birmingham | Jeans | 50,000 units/month |
| STA Outerwear Plant | Nashville | Jackets | 30,000 units/month |

**RETAIL Tier:**
| Store Name | City | Format | SKUs |
|------------|------|--------|------|
| Southern Style #1-5 | Various SE cities | Apparel Store | 5,000 |

**Internal Supply Chain:**
```
External Cotton ──→ STA Textile Mills ──→ STA Clothing Plants ──→ STA Retail Stores
(purchased)         (1M yards/mo)         (160,000 units/mo)      (5 locations)
```

---

### 23. Ironclad Steel Industries
```
Type:           Vertical Chain
Integration:    Level 1 (Adjacent - 2 tiers)
Industry:       RAW → SEMI_RAW
Chain:          Mining → Steel Processing
Direction:      Backward Integration (processor owns raw source)
```

| Tier | Persona | Products |
|------|---------|----------|
| RAW | Mining Company (Ferrous) | Iron Ore, Coal |
| SEMI_RAW | Steel Processing | Steel |

| Property | Value |
|----------|-------|
| Total Facilities | 5 |
| Total Employees | 5,200 |
| Annual Revenue | $680M |
| Downstream Affinity | Vehicle Mfg, Auto Parts (not owned) |

**Facilities by Tier:**

**RAW Tier:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| ISI Iron Mine | Duluth | Iron Ore | 80,000 tons/month |
| ISI Coal Mine | Pittsburgh | Coal | 30,000 tons/month |

**SEMI_RAW Tier:**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| ISI Steel Mill Main | Gary | Steel | 100,000 tons/month |
| ISI Steel Mill East | Cleveland | Steel | 60,000 tons/month |
| ISI Steel Mill South | Birmingham | Steel | 40,000 tons/month |

**Internal Supply Chain:**
```
ISI Mines ──────────→ ISI Steel Mills ──────────→ External Customers
(Iron: 80k tons/mo)   (200,000 tons steel/mo)     (Auto, Appliance,
(Coal: 30k tons/mo)                                Construction Mfg)
```

---

## INDUSTRIAL CONGLOMERATE CORPORATIONS (Level 3)

### 24. National Foods Corporation
```
Type:           Industrial Conglomerate
Integration:    Level 3 (Near-Full - 4 personas across 3 tiers)
Industry:       RAW + SEMI_RAW + MANUFACTURED
Conglomerate:   Food & Beverage
```

| Tier | Personas | Products |
|------|----------|----------|
| RAW | Grain Farm, Livestock Ranch, Dairy Farm | Wheat, Corn, Cattle, Raw Milk |
| SEMI_RAW | Flour Mill, Meat Processor, Dairy Processor | Flour, Beef, Pasteurized Milk |
| MANUFACTURED | Packaged Food, Beverage Mfg | Bread, Packaged Meat, Ice Cream, Soda |

| Property | Value |
|----------|-------|
| Total Facilities | 18 |
| Total Employees | 12,500 |
| Annual Revenue | $2.1B |
| Integration Level | Level 3 (No Retail) |
| Corporate Structure | Holding company with 4 divisions |

**Divisional Structure:**

```
National Foods Corporation (Holding)
├── NFC Farms Division (RAW)
│   ├── NFC Grain Farms (Wheat, Corn)
│   ├── NFC Cattle Ranch
│   └── NFC Dairy Farms
├── NFC Processing Division (SEMI_RAW)
│   ├── NFC Flour Mills
│   ├── NFC Meat Processing
│   └── NFC Dairy Processing
├── NFC Foods Division (MANUFACTURED)
│   ├── NFC Bakery
│   ├── NFC Meat Products
│   └── NFC Dairy Products
└── NFC Beverages Division (MANUFACTURED)
    └── NFC Beverage Plant
```

**Facilities by Division:**

**NFC Farms Division (RAW):**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| NFC Wheat Farm | Topeka | Wheat | 15,000 bushels/month |
| NFC Corn Farm | Des Moines | Corn | 20,000 bushels/month |
| NFC Cattle Ranch | Amarillo | Cattle | 5,000 head/month |
| NFC Dairy Farm #1 | Madison | Raw Milk | 500,000 gal/month |
| NFC Dairy Farm #2 | Green Bay | Raw Milk | 400,000 gal/month |

**NFC Processing Division (SEMI_RAW):**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| NFC Flour Mill | Kansas City | Flour | 25,000 tons/month |
| NFC Beef Plant | Omaha | Beef | 80,000 lbs/day |
| NFC Dairy Plant | Milwaukee | Pasteurized Milk | 800,000 gal/month |

**NFC Foods Division (MANUFACTURED):**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| NFC Bakery Main | Chicago | Bread | 400,000 loaves/month |
| NFC Bakery East | Detroit | Bread, Cake | 250,000 units/month |
| NFC Meat Products | St. Louis | Packaged Meat | 200,000 lbs/month |
| NFC Ice Cream | Minneapolis | Ice Cream | 100,000 gal/month |

**NFC Beverages Division (MANUFACTURED):**
| Firm Name | City | Product | Capacity |
|-----------|------|---------|----------|
| NFC Beverage Plant | Indianapolis | Soda | 500,000 cases/month |
| NFC Juice Plant | Atlanta | Packaged Fruits | 200,000 cases/month |

**Internal Supply Chain:**
```
NFC Farms ────────→ NFC Processing ────────→ NFC Foods/Beverages ────→ External Retail
├── Wheat ──────────→ Flour ─────────────────→ Bread, Cake            (Supermarkets,
├── Corn ───────────────────────────────────→ Cereal, Soda            Convenience)
├── Cattle ─────────→ Beef ──────────────────→ Packaged Meat
└── Milk ───────────→ Pasteurized ───────────→ Ice Cream
```

---

### 25. PetroChem Energy Holdings
```
Type:           Industrial Conglomerate
Integration:    Level 3 (Near-Full - 4 personas across 3 tiers + Retail)
Industry:       RAW → SEMI_RAW → (minimal MFG) → RETAIL
Conglomerate:   Petroleum & Energy
```

| Tier | Personas | Products |
|------|----------|----------|
| RAW | Energy Extraction | Crude Oil, Natural Gas |
| SEMI_RAW | Petroleum Refinery, Chemical Production | Gasoline, Diesel, Plastic Pellets, Industrial Chemicals |
| MANUFACTURED | (minimal) | Oil & Fluids |
| RETAIL | Convenience Store | Gas Station format |

| Property | Value |
|----------|-------|
| Total Facilities | 35 |
| Total Employees | 8,200 |
| Annual Revenue | $4.8B |
| Integration Level | Level 3+ (approaching Level 4) |
| Corporate Structure | Holding company with 4 divisions |

**Divisional Structure:**

```
PetroChem Energy Holdings
├── PCE Exploration & Production (RAW)
│   ├── Oil Fields (3 locations)
│   └── Natural Gas Fields (2 locations)
├── PCE Refining Division (SEMI_RAW)
│   ├── Main Refinery
│   └── Chemical Plant
├── PCE Lubricants (MANUFACTURED)
│   └── Lubricants Plant
└── PCE Retail Division (RETAIL)
    └── Gas Stations (25 locations)
```

**Facilities by Division:**

**PCE Exploration (RAW):**
| Firm Name | Location | Product | Capacity |
|-----------|----------|---------|----------|
| PCE Oil Field #1 | Texas | Crude Oil | 50,000 barrels/day |
| PCE Oil Field #2 | Oklahoma | Crude Oil | 35,000 barrels/day |
| PCE Oil Field #3 | Louisiana | Crude Oil | 25,000 barrels/day |
| PCE Gas Field #1 | Texas | Natural Gas | 100M cubic ft/day |
| PCE Gas Field #2 | Colorado | Natural Gas | 60M cubic ft/day |

**PCE Refining (SEMI_RAW):**
| Firm Name | City | Products | Capacity |
|-----------|------|----------|----------|
| PCE Main Refinery | Houston | Gasoline, Diesel, Plastics | 100,000 barrels/day |
| PCE Chemical Plant | Baton Rouge | Industrial Chemicals | 20,000 tons/month |

**PCE Lubricants (MANUFACTURED):**
| Firm Name | City | Products | Capacity |
|-----------|------|----------|----------|
| PCE Lubricants | Houston | Oil & Fluids | 50,000 cases/month |

**PCE Retail (RETAIL):**
| Brand | Format | Count | Avg Revenue |
|-------|--------|-------|-------------|
| PetroChem Express | Gas Station + C-Store | 25 | $2M/year each |

**Internal Supply Chain:**
```
PCE Oil/Gas Fields ──→ PCE Refinery ──────→ PCE Products ──────→ PCE Gas Stations
(110k barrels/day)     (Gasoline, Diesel,   (Oil & Fluids)       (25 locations)
                        Chemicals, Plastics)
                              │
                              └──────────────→ External Industrial Customers
                                               (Plastics → Manufacturers)
                                               (Chemicals → Consumer Goods)
```

---

## GENERATION STATISTICS

### By Industry Tier
| Tier | Corporations | % |
|------|--------------|---|
| RAW Primary | 3 | 12% |
| SEMI_RAW Primary | 4 | 16% |
| MANUFACTURED Primary | 8 | 32% |
| RETAIL Primary | 6 | 24% |
| Multi-Tier | 4 | 16% |

### By Integration Level
| Level | Corporations | % |
|-------|--------------|---|
| Level 0 | 20 | 80% |
| Level 1 | 1 | 4% |
| Level 2 | 2 | 8% |
| Level 3 | 2 | 8% |
| Level 4 | 0 | 0% |

### Total Facilities Generated
| Type | Count |
|------|-------|
| Mining Operations | 13 |
| Farm Operations | 9 |
| Processing Plants | 18 |
| Manufacturing Plants | 32 |
| Retail Stores | 118 |
| **Total** | **190** |

### Total Employment
| Sector | Employees |
|--------|-----------|
| RAW | 12,150 |
| SEMI_RAW | 15,420 |
| MANUFACTURED | 28,500 |
| RETAIL | 9,630 |
| **Total** | **65,700** |

---

## SUPPLY CHAIN RELATIONSHIPS

### Key Supplier-Customer Relationships (External)

| Supplier Corp | Customer Corp | Product | Relationship |
|---------------|---------------|---------|--------------|
| Ferrous Mining Corp | Pacific Steel Works | Iron Ore, Coal | Contract |
| Valley Grain Farms | Heartland Flour Mills | Wheat | Spot Market |
| Sunrise Textile Mills | Modern Apparel Co | Cotton Fabric | Contract |
| Heartland Flour Mills | Fresh Choice Bakery | Flour | Contract |
| Pacific Steel Works | Home Comfort Appliances | Steel | Contract |
| Fresh Choice Bakery | Metro Supermarkets | Bread, Cake | Contract |
| Modern Apparel Co | Fashion Forward Stores | Clothing | Wholesale |
| TechGear Electronics | Home & Style Retail | Electronics | Wholesale |
| Sparkle Beauty Products | Metro Supermarkets | Beauty Products | Contract |
| Consumer Brands Int'l | Premier Grocery Holdings | Health, Beauty, Cleaning | Contract |

### Internal Supply Chains (Vertical Corps)

| Corporation | Internal Flow | External Dependencies |
|-------------|---------------|----------------------|
| Midwest Grain & Baking | Wheat → Flour → Bread | Sugar, Eggs (purchased) |
| Southern Textile & Apparel | Fabric → Clothing → Stores | Cotton (purchased) |
| Ironclad Steel Industries | Iron + Coal → Steel | Customers (external) |
| National Foods Corp | Farms → Processing → Products | Retail (external) |
| PetroChem Energy Holdings | Oil → Refinery → Gas Stations | - (nearly self-contained) |
