# Supply Chain Graph

## Overview

```
RAW Materials → SEMI_RAW Processing → MANUFACTURED Products → Retail → Consumers
```

---

## RAW Materials (Tier 0)

**No inputs required - extracted/harvested directly**

| Category | Materials | Source |
|----------|-----------|--------|
| Metals | Iron Ore, Copper Ore, Aluminum Ore, Gold Ore, Silver Ore | MiningCompany |
| Minerals | Coal, Limestone, Salt, Silica Sand | MiningCompany |
| Energy | Crude Oil, Natural Gas | MiningCompany |
| Timber | Softwood Logs, Hardwood Logs | LoggingCompany |
| Grains | Wheat, Rice, Corn, Soybeans | Farm (CROP) |
| Industrial Crops | Cotton, Sugarcane, Coffee Beans, Rubber Latex | Farm (CROP) |
| Produce | Fresh Fruits, Vegetables | Farm (CROP) |
| Livestock | Cattle, Pigs, Chickens | Farm (LIVESTOCK) |
| Animal Products | Raw Milk, Eggs, Raw Hides | Farm (LIVESTOCK) |
| Seafood | Fish | Farm (LIVESTOCK) |

---

## SEMI_RAW Products (Tier 1)

**Processed from RAW materials**

### Metals Processing
```
Iron Ore + Coal → Steel
Copper Ore → Copper Wire
Aluminum Ore → Aluminum Sheets
```

### Fuel Refining
```
Crude Oil → Gasoline
Crude Oil → Diesel
Crude Oil → Plastic Pellets
Crude Oil + Salt → Industrial Chemicals
```

### Lumber Processing
```
Softwood Logs → Plywood
Softwood Logs → Wood Pulp
Wood Pulp → Paper
Wood Pulp → Cardboard
```

### Food Processing
```
Wheat → Flour
Sugarcane → Sugar
Soybeans → Vegetable Oil
Fresh Fruits → Fruit Concentrate
Raw Milk → Pasteurized Milk
Cattle → Beef
Pigs → Pork
Chickens → Chicken
Fish + Salt → Processed Fish
```

### Textile Processing
```
Cotton → Cotton Fabric
Rubber Latex → Rubber
Raw Hides + Salt → Leather
```

### Materials
```
Silica Sand + Limestone → Glass
```

---

## MANUFACTURED Products (Tier 2)

### Food Products

| Product | Inputs |
|---------|--------|
| Bread | Flour, Sugar |
| Packaged Meat | Beef |
| Packaged Seafood | Processed Fish, Salt |
| Packaged Fruits | Fruit Concentrate, Sugar |
| Breakfast Cereal | Corn, Sugar |
| Cake | Flour, Sugar, Eggs |
| Candy | Sugar |
| Ice Cream | Pasteurized Milk, Sugar |
| Canned Goods | Steel, Corn |
| Cooking Oil | Vegetable Oil, Plastic Pellets |

### Beverages

| Product | Inputs |
|---------|--------|
| Soda | Sugar, Plastic Pellets, Industrial Chemicals |
| Alcohol | Corn, Sugar, Glass |

### Clothing

| Product | Inputs |
|---------|--------|
| Shirts | Cotton Fabric |
| Jackets | Cotton Fabric, Steel |
| Jeans | Cotton Fabric |
| Sweaters | Cotton Fabric |
| Shoes | Leather, Rubber, Cotton Fabric |
| Socks | Cotton Fabric |

### Accessories

| Product | Inputs |
|---------|--------|
| Watches | Steel, Gold Ore, Aluminum Sheets |
| Jewelry | Gold Ore, Silver Ore |
| Belts | Leather, Steel |
| Bags | Leather, Cotton Fabric, Steel |

### Baby Products

| Product | Inputs |
|---------|--------|
| Diapers | Cotton Fabric, Wood Pulp |
| Formula | Pasteurized Milk, Sugar |
| Car Seats | Cotton Fabric, Steel, Plywood |
| Strollers | Steel, Aluminum Sheets, Cotton Fabric |

### Health & Beauty

| Product | Inputs |
|---------|--------|
| Cold Medicine | Industrial Chemicals, Sugar, Plastic Pellets |
| Pain Killers | Industrial Chemicals, Plastic Pellets |
| Vitamins | Industrial Chemicals, Plastic Pellets |
| Glasses | Glass, Steel, Plastic Pellets |
| Shampoo | Industrial Chemicals, Plastic Pellets |
| Deodorant | Industrial Chemicals, Plastic Pellets |
| Soap | Industrial Chemicals, Vegetable Oil |
| Toothpaste | Industrial Chemicals, Plastic Pellets |
| Makeup | Industrial Chemicals, Plastic Pellets |
| Perfume | Industrial Chemicals, Glass |

### Hardware & Automotive

| Product | Inputs |
|---------|--------|
| Tools | Steel, Plywood |
| Tires | Rubber, Steel |
| Auto Parts | Steel, Aluminum Sheets |
| Oil & Fluids | Crude Oil |
| Car Battery | Steel, Copper Wire |
| Cleaning Supplies | Industrial Chemicals, Plastic Pellets |
| Vacuums | Steel, Copper Wire, Aluminum Sheets |
| Paper Towels | Paper, Cardboard |
| Trash Bags | Plastic Pellets, Cardboard |

### Furniture

| Product | Inputs |
|---------|--------|
| Sofa | Cotton Fabric, Plywood, Steel |
| Dresser | Plywood, Steel |
| Beds | Plywood, Cotton Fabric, Steel |
| Tables | Plywood, Steel |

### Appliances

| Product | Inputs |
|---------|--------|
| Microwave | Steel, Copper Wire, Aluminum Sheets |
| Air Conditioner | Steel, Copper Wire, Aluminum Sheets |
| Washing Machine | Steel, Copper Wire |
| Dryer | Steel, Copper Wire |
| Vacuums | Steel, Aluminum Sheets |

### Electronics

| Product | Inputs |
|---------|--------|
| Laptops | Aluminum Sheets, Copper Wire, Gold Ore, Plastic Pellets |
| Personal Computer | Steel, Copper Wire, Aluminum Sheets, Plastic Pellets |
| Tablets | Aluminum Sheets, Copper Wire, Gold Ore |
| Monitors | Aluminum Sheets, Copper Wire, Steel |
| Cellphone | Aluminum Sheets, Copper Wire, Gold Ore |
| TV | Aluminum Sheets, Copper Wire, Steel |
| Console | Aluminum Sheets, Copper Wire, Steel |
| Headphones | Copper Wire, Aluminum Sheets |
| Printers | Steel, Copper Wire, Aluminum Sheets |
| Cameras | Aluminum Sheets, Copper Wire, Gold Ore |
| Batteries | Steel, Copper Wire |
| Drones | Aluminum Sheets, Copper Wire |

### Recreation

| Product | Inputs |
|---------|--------|
| Bikes | Plastic Pellets, Cotton Fabric |

### Vehicles

| Product | Inputs |
|---------|--------|
| Cars | Steel (70), Aluminum Sheets (35), Copper Wire (12) |
| Motorcycles | Steel (25), Aluminum Sheets (12.2) |

### Construction

| Product | Inputs |
|---------|--------|
| Cement | Limestone, Coal |

---

## Supply Chain Depth

```
Tier 0 (RAW)        Tier 1 (SEMI_RAW)      Tier 2 (MANUFACTURED)
─────────────────────────────────────────────────────────────────
Iron Ore ────────→ Steel ──────────────→ Cars, Tools, Appliances
Coal ─────────────┘    └───────────────→ Furniture, Auto Parts

Copper Ore ──────→ Copper Wire ────────→ Electronics, Appliances
                                        Vehicles, Car Batteries

Aluminum Ore ────→ Aluminum Sheets ────→ Electronics, Vehicles
                                        Appliances, Watches

Crude Oil ───────→ Plastic Pellets ────→ Electronics, Beauty
         │       │                      Toys, Packaging
         │       → Industrial Chemicals → Health, Beauty, Cleaning
         │       → Gasoline/Diesel ────→ (Fuel consumption)
         └───────→ Oil & Fluids ───────→ (Direct to retail)

Softwood Logs ───→ Plywood ────────────→ Furniture, Tools
                 → Wood Pulp ──────────→ Paper → Paper Towels
                                       → Cardboard → Packaging

Cotton ──────────→ Cotton Fabric ──────→ Clothing, Bags, Furniture
                                        Diapers, Baby Products

Raw Hides ───────→ Leather ────────────→ Shoes, Belts, Bags
Salt ────────────┘

Rubber Latex ────→ Rubber ─────────────→ Tires, Shoes

Wheat ───────────→ Flour ──────────────→ Bread, Cake
Sugarcane ───────→ Sugar ──────────────→ Food, Beverages, Candy
Soybeans ────────→ Vegetable Oil ──────→ Cooking Oil, Soap
Fresh Fruits ────→ Fruit Concentrate ──→ Packaged Fruits
Raw Milk ────────→ Pasteurized Milk ───→ Ice Cream, Formula
Cattle ──────────→ Beef ───────────────→ Packaged Meat
Pigs ────────────→ Pork ───────────────→ Packaged Meat
Chickens ────────→ Chicken ────────────→ Packaged Meat
Fish ────────────→ Processed Fish ─────→ Packaged Seafood

Silica Sand ─────→ Glass ──────────────→ Alcohol, Perfume, Glasses
Limestone ───────┘
```

---

## Input Categories (for Multi-Product Factories)

Factories can produce multiple products if they share input categories:

| Category | Input Materials |
|----------|-----------------|
| LUMBER | Softwood Logs, Hardwood Logs, Wood Pulp, Plywood |
| METALS | Iron Ore, Copper Ore, Aluminum Ore, Steel, Copper Wire, Aluminum Sheets, Gold Ore, Silver Ore |
| TEXTILES | Cotton, Cotton Fabric, Leather, Raw Hides |
| FOOD | Wheat, Flour, Sugar, Beef, Pork, Chicken, Pasteurized Milk, Fresh Fruits, Vegetables, Eggs |
| CHEMICALS | Crude Oil, Plastic Pellets, Industrial Chemicals, Rubber, Rubber Latex |
| ELECTRONICS | Copper Wire, Aluminum Sheets, Gold Ore |
| GLASS | Glass, Silica Sand |
| PAPER | Paper, Cardboard, Wood Pulp |
| MINERALS | Coal, Limestone, Salt |

**Compatible Product Examples:**
- Furniture factory (LUMBER): Sofa, Dresser, Beds, Tables
- Clothing factory (TEXTILES): Shirts, Jeans, Jackets, Sweaters
- Electronics factory (ELECTRONICS+METALS): Laptops, Tablets, Cellphones, TVs
- Food factory (FOOD): Bread, Cake, Ice Cream, Cereal
