# Corporate Identity System

## Overview

Corporate identity determines what firms a corporation owns and what products they focus on. Identity is established at corporation creation and guides all expansion decisions.

```
Corporation
├── Industry Layer (RAW, SEMI_RAW, MANUFACTURED, RETAIL, SERVICES)
├── Persona Type (e.g., Mining Company, Textile Mill)
├── Product Focus (specialization within persona)
└── Affinity (natural expansion paths)
```

---

## RAW INDUSTRY PERSONAS

### Mining Company
Extracts mineral resources from the earth.

| Product Focus | Products | Downstream Affinity |
|---------------|----------|---------------------|
| Ferrous Metals | Iron Ore, Coal | Steel Processing |
| Non-Ferrous Metals | Copper Ore, Aluminum Ore | Metal Processing |
| Precious Metals | Gold Ore, Silver Ore | Jewelry Manufacturing |
| Energy Resources | Crude Oil, Natural Gas | Petroleum Refining |
| Industrial Minerals | Limestone, Salt, Silica Sand | Glass/Chemical Production |

**Focus Rules:**
- Ferrous and Non-Ferrous can combine (general metals)
- Precious Metals typically standalone (high-value specialization)
- Energy Resources typically standalone (different infrastructure)
- Industrial Minerals can combine with Ferrous (construction materials)

---

### Logging Company
Harvests timber from managed forests.

| Product Focus | Products | Downstream Affinity |
|---------------|----------|---------------------|
| Commercial Timber | Softwood Logs, Hardwood Logs | Lumber Processing |

**Focus Rules:**
- Single focus (both log types serve same downstream)
- High affinity with Lumber Mills

---

### Farm - Crop Production
Agricultural operations growing plant-based products.

| Product Focus | Products | Downstream Affinity |
|---------------|----------|---------------------|
| Grain Farming | Wheat, Rice, Corn, Soybeans | Flour/Oil Processing |
| Industrial Crops | Cotton, Sugarcane, Coffee Beans, Rubber Latex | Textile/Sugar/Rubber Processing |
| Produce Farming | Fresh Fruits, Vegetables | Food Manufacturing |

**Focus Rules:**
- Grain Farming is most common (staple crops)
- Industrial Crops requires specific climate/region
- Produce Farming has perishability concerns (local focus)
- Grain + Produce can combine (diversified farm)
- Industrial Crops typically standalone (specialized equipment)

---

### Farm - Livestock Production
Agricultural operations raising animals.

| Product Focus | Products | Downstream Affinity |
|---------------|----------|---------------------|
| Cattle Ranching | Cattle, Raw Hides | Meat/Leather Processing |
| Pig Farming | Pigs | Meat Processing |
| Poultry Farming | Chickens, Eggs | Meat/Food Processing |
| Dairy Farming | Raw Milk | Dairy Processing |
| Commercial Fishing | Fish | Seafood Processing |

**Focus Rules:**
- Cattle + Pig can combine (red meat producer)
- Poultry + Dairy can combine (farm cooperative)
- Cattle includes Raw Hides as byproduct
- Fishing is standalone (marine operations)

---

## SEMI_RAW INDUSTRY PERSONAS

### Steel Processing Plant
Converts iron ore into steel products.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Steel Production | Steel | Iron Ore, Coal | Heavy Manufacturing |

**Focus Rules:**
- Single product focus
- Strong vertical affinity with Ferrous Mining
- Primary supplier to automotive, appliance, construction

---

### Metal Processing Plant
Processes non-ferrous metals into industrial components.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Electrical Metals | Copper Wire | Copper Ore | Electronics Manufacturing |
| Structural Metals | Aluminum Sheets | Aluminum Ore | Automotive, Electronics |
| Combined Processing | Copper Wire, Aluminum Sheets | Both ores | General Manufacturing |

**Focus Rules:**
- Electrical focus serves electronics industry
- Structural focus serves automotive/aerospace
- Combined is most common (economies of scale)

---

### Petroleum Refinery
Refines crude oil into fuels and petrochemicals.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Fuel Production | Gasoline, Diesel | Crude Oil | Automotive (end consumer) |
| Petrochemicals | Plastic Pellets, Industrial Chemicals | Crude Oil | Plastics Manufacturing |
| Integrated Refining | All petroleum products | Crude Oil | Multiple industries |

**Focus Rules:**
- Fuel Production is high volume, lower margin
- Petrochemicals is higher margin, specialized
- Integrated Refining requires massive capital
- Strong vertical affinity with Energy Extraction

---

### Lumber Processing Mill
Converts raw timber into building materials.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Construction Lumber | Plywood | Softwood/Hardwood Logs | Furniture Manufacturing |
| Paper Pulp | Wood Pulp | Softwood Logs | Paper Manufacturing |
| Integrated Mill | Plywood, Wood Pulp | All logs | Multiple industries |

**Focus Rules:**
- Construction Lumber serves furniture/construction
- Paper Pulp serves paper/packaging industry
- Integrated Mill maximizes log utilization
- Strong vertical affinity with Logging

---

### Food Ingredient Processor
Converts raw agricultural products into food ingredients.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Grain Processing | Flour | Wheat | Bakery Manufacturing |
| Sugar Refining | Sugar | Sugarcane | Confectionery, Beverages |
| Oil Extraction | Vegetable Oil | Soybeans | Food Manufacturing |
| Fruit Processing | Fruit Concentrate | Fresh Fruits | Beverage Manufacturing |
| Combined Processing | Multiple ingredients | Multiple crops | Food Manufacturing |

**Focus Rules:**
- Each focus serves different food manufacturers
- Grain + Sugar can combine (baking ingredients)
- Oil + Fruit can combine (cooking products)
- Combined Processing for large food conglomerates

---

### Dairy Processing Plant
Pasteurizes and processes dairy products.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Dairy Processing | Pasteurized Milk | Raw Milk | Food Manufacturing |

**Focus Rules:**
- Single product focus
- Strong vertical affinity with Dairy Farming
- Supplies ice cream, formula, dairy products

---

### Meat Processing Plant
Converts livestock into packaged meat products.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Beef Processing | Beef | Cattle | Packaged Food Manufacturing |
| Pork Processing | Pork | Pigs | Packaged Food Manufacturing |
| Poultry Processing | Chicken | Chickens | Packaged Food Manufacturing |
| Multi-Protein | Beef, Pork, Chicken | All livestock | Food Manufacturing |

**Focus Rules:**
- Single protein focus is common (specialized facilities)
- Multi-Protein for large processors
- Strong vertical affinity with corresponding farms

---

### Seafood Processing Plant
Processes fish into food-ready products.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Seafood Processing | Processed Fish | Fish | Packaged Food Manufacturing |

**Focus Rules:**
- Single product focus
- Strong vertical affinity with Commercial Fishing
- Coastal location preferred

---

### Textile Processing Mill
Converts raw fibers into fabrics.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Cotton Textiles | Cotton Fabric | Cotton | Clothing Manufacturing |
| Leather Processing | Leather | Raw Hides, Salt | Fashion Manufacturing |
| Combined Textiles | Cotton Fabric, Leather | Multiple | Apparel Manufacturing |

**Focus Rules:**
- Cotton Textiles is high volume
- Leather Processing is higher value
- Combined serves diversified fashion companies

---

### Rubber Processing Plant
Converts latex into industrial rubber.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Rubber Production | Rubber | Rubber Latex | Tire/Shoe Manufacturing |

**Focus Rules:**
- Single product focus
- Strong vertical affinity with Industrial Crop farms
- Serves automotive and footwear industries

---

### Glass Manufacturing Plant
Produces glass from raw minerals.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Glass Production | Glass | Silica Sand, Limestone | Beverage, Construction |

**Focus Rules:**
- Single product focus
- Vertical affinity with Industrial Minerals mining
- Serves bottles, windows, containers

---

### Chemical Production Plant
Produces industrial chemicals.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Chemical Production | Industrial Chemicals | Crude Oil, Salt | Health, Beauty, Cleaning |

**Focus Rules:**
- Single product focus
- Vertical affinity with Petroleum industry
- Foundation for health/beauty products

---

### Paper Manufacturing Plant
Produces paper and packaging materials.

| Product Focus | Products | Upstream Source | Downstream Affinity |
|---------------|----------|-----------------|---------------------|
| Paper Products | Paper | Wood Pulp | Office, Publishing |
| Packaging | Cardboard | Wood Pulp | Retail Packaging |
| Combined | Paper, Cardboard | Wood Pulp | Multiple industries |

**Focus Rules:**
- Combined is most efficient
- Strong vertical affinity with Pulp Mills

---

## MANUFACTURED INDUSTRY PERSONAS

### Packaged Food Manufacturer
Produces consumer food products.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Bakery | Bread, Cake | Flour, Sugar, Eggs |
| Confectionery | Candy, Ice Cream | Sugar, Milk |
| Breakfast Foods | Breakfast Cereal | Corn, Sugar |
| Canned Goods | Canned Goods | Steel, Vegetables |
| Packaged Proteins | Packaged Meat, Packaged Seafood | Beef, Pork, Chicken, Fish |
| Packaged Produce | Packaged Fruits | Fruit Concentrate |
| Cooking Products | Cooking Oil | Vegetable Oil |
| Diversified Food | All food products | Multiple ingredients |

**Focus Rules:**
- Bakery + Confectionery can combine (sweet goods)
- Packaged Proteins typically standalone (cold chain)
- Diversified Food for major food conglomerates

---

### Beverage Manufacturer
Produces drinks for consumers.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Soft Drinks | Soda | Sugar, Plastic, Chemicals |
| Alcoholic Beverages | Alcohol | Corn, Sugar, Glass |
| Full Beverage | Soda, Alcohol | Multiple |

**Focus Rules:**
- Soft Drinks vs Alcohol often separate (regulations)
- Full Beverage for large beverage companies

---

### Clothing Manufacturer
Produces apparel for consumers.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Casual Wear | Shirts, Jeans, Sweaters | Cotton Fabric |
| Outerwear | Jackets | Cotton Fabric, Steel |
| Footwear | Shoes, Socks | Leather, Rubber, Cotton |
| Full Apparel | All clothing | Multiple textiles |

**Focus Rules:**
- Footwear often standalone (specialized manufacturing)
- Casual Wear + Outerwear can combine
- Full Apparel for major fashion houses

---

### Accessories Manufacturer
Produces fashion accessories.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Luxury Goods | Watches, Jewelry | Gold, Silver, Steel |
| Leather Goods | Belts, Bags | Leather, Cotton, Steel |
| Full Accessories | All accessories | Multiple materials |

**Focus Rules:**
- Luxury Goods requires precious metals
- Leather Goods pairs with Clothing
- Full Accessories for fashion conglomerates

---

### Baby Products Manufacturer
Produces childcare products.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Baby Consumables | Diapers, Formula | Cotton, Wood Pulp, Milk |
| Baby Equipment | Car Seats, Strollers | Steel, Aluminum, Fabric |
| Full Baby Products | All baby products | Multiple |

**Focus Rules:**
- Consumables is recurring revenue
- Equipment is higher margin
- Full Baby Products for major brands

---

### Health Products Manufacturer
Produces over-the-counter health products.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Pharmaceuticals | Cold Medicine, Pain Killers | Chemicals, Plastic |
| Supplements | Vitamins | Chemicals, Plastic |
| Vision | Glasses | Glass, Steel, Plastic |
| Full Health | All health products | Multiple |

**Focus Rules:**
- Pharmaceuticals requires regulatory compliance
- Vision is specialized manufacturing
- Full Health for healthcare companies

---

### Beauty Products Manufacturer
Produces personal care items.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Hair Care | Shampoo | Chemicals, Plastic |
| Body Care | Deodorant, Soap | Chemicals, Oils |
| Oral Care | Toothpaste | Chemicals, Plastic |
| Cosmetics | Makeup, Perfume | Chemicals, Glass |
| Full Beauty | All beauty products | Multiple |

**Focus Rules:**
- Each category can be standalone brand
- Full Beauty for major personal care companies
- Often pairs with Health Products (P&G model)

---

### Hardware Manufacturer
Produces tools and hardware.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Hand Tools | Tools | Steel, Plywood |

**Focus Rules:**
- Single focus
- Serves construction and DIY market

---

### Automotive Parts Manufacturer
Produces vehicle components.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Tires | Tires | Rubber, Steel |
| Mechanical Parts | Auto Parts | Steel, Aluminum |
| Electrical Parts | Car Battery | Steel, Copper Wire |
| Fluids | Oil & Fluids | Crude Oil |
| Full Auto Parts | All parts | Multiple |

**Focus Rules:**
- Tires often standalone (Goodyear, Michelin)
- Full Auto Parts for Tier 1 suppliers
- Strong affinity with Vehicle Manufacturers

---

### Cleaning Products Manufacturer
Produces household cleaning items.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Cleaning Supplies | Cleaning Supplies | Chemicals, Plastic |
| Paper Products | Paper Towels, Trash Bags | Paper, Plastic |
| Full Cleaning | All cleaning products | Multiple |

**Focus Rules:**
- Often combined with Beauty (P&G model)
- Paper Products can be standalone

---

### Appliance Manufacturer
Produces household appliances.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Floor Care | Vacuums | Steel, Copper, Aluminum |
| Kitchen Appliances | Microwave | Steel, Copper, Aluminum |
| Climate Control | Air Conditioner | Steel, Copper, Aluminum |
| Laundry | Washing Machine, Dryer | Steel, Copper |
| Full Appliance | All appliances | Metals |

**Focus Rules:**
- Full Appliance most common (Whirlpool, LG)
- Heavy metal requirements
- Strong affinity with Electronics

---

### Furniture Manufacturer
Produces home furnishings.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Living Room | Sofa, Tables | Plywood, Fabric, Steel |
| Bedroom | Beds, Dresser | Plywood, Fabric, Steel |
| Full Furniture | All furniture | Lumber, Textiles |

**Focus Rules:**
- Full Furniture most common
- Strong lumber/textile requirements

---

### Electronics Manufacturer
Produces consumer electronics.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Computing | Laptops, PC, Tablets, Monitors | Aluminum, Copper, Gold |
| Mobile | Cellphone | Aluminum, Copper, Gold |
| Entertainment | TV, Console, Headphones | Aluminum, Copper, Steel |
| Imaging | Cameras, Printers | Steel, Copper, Aluminum |
| Power | Batteries | Steel, Copper |
| Recreational Tech | Drones | Aluminum, Copper |
| Full Electronics | All electronics | Metals |

**Focus Rules:**
- Computing + Mobile often together (Apple, Samsung)
- Entertainment can be standalone (Sony)
- Full Electronics for major tech conglomerates
- High precious metal requirements

---

### Recreation Manufacturer
Produces leisure goods.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Toys | Toys | Plastic, Fabric |
| Sporting Goods | Bikes | Plastic, Fabric |
| Full Recreation | All recreation | Multiple |

**Focus Rules:**
- Often combined categories
- Lower barrier to entry

---

### Vehicle Manufacturer
Produces automobiles and motorcycles.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Automobiles | Cars | Steel, Aluminum, Copper |
| Motorcycles | Motorcycles | Steel, Aluminum |
| Full Vehicles | Cars, Motorcycles | Heavy metals |

**Focus Rules:**
- Automobiles requires massive scale
- Motorcycles can be standalone
- Highest material requirements in simulation
- Strong affinity with Auto Parts suppliers

---

### Construction Materials Manufacturer
Produces building materials.

| Product Focus | Products | Upstream Source |
|---------------|----------|-----------------|
| Cement Production | Cement | Limestone, Coal |

**Focus Rules:**
- Single focus
- Regional/local distribution
- Affinity with Industrial Minerals mining

---

## RETAIL INDUSTRY PERSONAS

### Supermarket Chain
Full-service grocery stores selling food and household essentials.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Grocery Focus | Food, Beverages | Packaged Food, Beverage Manufacturers |
| Household Focus | Cleaning, Health, Beauty, Baby | Cleaning, Health, Beauty, Baby Manufacturers |
| Full Supermarket | All consumables | Multiple consumer goods manufacturers |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Neighborhood Grocery | Small | 5,000-15,000 | Local convenience |
| Supermarket | Medium | 15,000-40,000 | Weekly shopping |
| Hypermarket | Large | 40,000-100,000 | One-stop shopping |

**Focus Rules:**
- Grocery Focus is most common (food-first strategy)
- Full Supermarket competes with General Merchandise
- Hypermarket format rare (requires high population density)
- Strong affinity with Packaged Food conglomerates

**Real-World Examples:** Kroger, Safeway, Publix, Albertsons

---

### Convenience Store
Small-format stores for quick purchases.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Snacks & Beverages | Candy, Soda, Packaged Snacks | Confectionery, Beverage Manufacturers |
| Essential Groceries | Bread, Milk, Eggs, Basic Items | Food Manufacturers |
| Full Convenience | Snacks, Beverages, Basic Groceries | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Corner Store | Very Small | 500-2,000 | Impulse/emergency purchases |
| Gas Station C-Store | Small | 2,000-5,000 | Travelers, commuters |

**Focus Rules:**
- Limited product selection, high margins
- Often paired with fuel sales (petroleum affinity)
- Premium pricing accepted for convenience
- High turnover, low inventory

**Real-World Examples:** 7-Eleven, Circle K, Wawa

---

### Discount Grocery
Budget-focused grocery with limited selection.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Staple Foods | Basic Food, Beverages | Budget food manufacturers |
| Private Label | Store-brand consumables | Contract manufacturers |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Limited Assortment | Small-Medium | 1,500-4,000 | Price-sensitive shoppers |

**Focus Rules:**
- Minimal SKUs, maximum efficiency
- Heavy private label (vertical integration opportunity)
- No-frills shopping experience
- Strong affinity with budget food manufacturers

**Real-World Examples:** Aldi, Lidl, Save-A-Lot

---

### Pharmacy/Drug Store
Health-focused retail with pharmacy services.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Health Products | Cold Medicine, Pain Killers, Vitamins | Health Manufacturers |
| Beauty & Personal Care | Shampoo, Soap, Makeup, Deodorant | Beauty Manufacturers |
| Convenience Items | Snacks, Beverages, Baby Products | Multiple |
| Full Drug Store | Health, Beauty, Convenience | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Neighborhood Pharmacy | Small | 5,000-10,000 | Local health needs |
| Drug Store Chain | Medium | 10,000-25,000 | Health & beauty destination |

**Focus Rules:**
- Pharmacy services drive traffic
- Health + Beauty natural combination
- Often includes photo services, seasonal items
- Strong affinity with Health/Beauty manufacturers

**Real-World Examples:** CVS, Walgreens, Rite Aid

---

### Electronics Retailer
Sells consumer technology and appliances.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Computing | Laptops, PCs, Tablets, Monitors, Printers | Electronics Manufacturers |
| Mobile | Cellphones, Headphones | Mobile Electronics Manufacturers |
| Entertainment | TVs, Consoles, Cameras | Entertainment Electronics |
| Appliances | Microwaves, Vacuums, AC, Washers, Dryers | Appliance Manufacturers |
| Full Electronics | All electronics and appliances | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Mobile Specialist | Small | 500-2,000 | Phone buyers |
| Electronics Store | Medium | 5,000-15,000 | Tech enthusiasts |
| Electronics Superstore | Large | 15,000-40,000 | Full tech destination |

**Focus Rules:**
- Computing + Mobile often combined
- Appliances can be standalone or combined
- High-value inventory, trained staff required
- Strong affinity with Electronics/Appliance manufacturers

**Real-World Examples:** Best Buy, Micro Center, B&H Photo

---

### Fashion Retailer
Sells clothing and fashion accessories.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Casual Wear | Shirts, Jeans, Sweaters, Socks | Clothing Manufacturers |
| Outerwear | Jackets | Outerwear Manufacturers |
| Footwear | Shoes | Footwear Manufacturers |
| Accessories | Watches, Jewelry, Belts, Bags | Accessories Manufacturers |
| Full Fashion | All clothing and accessories | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Boutique | Small | 500-2,000 | Specialty/luxury shoppers |
| Apparel Store | Medium | 3,000-10,000 | General fashion shoppers |
| Department Store (Fashion) | Large | 20,000-50,000 | Full fashion destination |

| Market Segment | Price Point | Quality Focus |
|----------------|-------------|---------------|
| Budget Fashion | Low | 0.3 |
| Mid-Market | Medium | 0.5 |
| Premium | High | 0.7 |
| Luxury | Very High | 0.9 |

**Focus Rules:**
- Footwear often standalone (specialized retail)
- Accessories can be standalone (jewelry stores)
- Market segment defines supplier relationships
- Strong affinity with Clothing/Accessories manufacturers

**Real-World Examples:** Gap, H&M, Nordstrom, Foot Locker, Zales

---

### Footwear Retailer
Specialized shoe and athletic footwear sales.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Athletic Footwear | Shoes (athletic focus) | Footwear Manufacturers |
| Casual Footwear | Shoes, Socks | Footwear Manufacturers |
| Full Footwear | All footwear types | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Shoe Store | Small-Medium | 2,000-8,000 | Footwear shoppers |

**Focus Rules:**
- High inventory variety (sizes, styles)
- Athletic vs casual positioning
- Brand partnerships common
- Strong affinity with Footwear manufacturers

**Real-World Examples:** Foot Locker, DSW, Famous Footwear

---

### Home Goods Retailer
Sells furniture, home decor, and housewares.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Furniture | Sofa, Beds, Dresser, Tables | Furniture Manufacturers |
| Appliances | Vacuums, Microwaves, Washers, Dryers | Appliance Manufacturers |
| Home Decor | Furniture, Accessories | Multiple |
| Full Home | Furniture, Appliances, Decor | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Furniture Showroom | Medium | 2,000-8,000 | Furniture buyers |
| Home Superstore | Large | 10,000-30,000 | Home improvement |
| Warehouse Furniture | Very Large | 5,000-15,000 | Value furniture |

**Focus Rules:**
- Large showroom space required
- Delivery logistics important
- Assembly services add value
- Strong affinity with Furniture manufacturers

**Real-World Examples:** IKEA, Ashley Furniture, Rooms To Go, Williams-Sonoma

---

### Baby & Children Retailer
Specialized retailer for baby and kids products.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Baby Essentials | Diapers, Formula | Baby Product Manufacturers |
| Baby Gear | Car Seats, Strollers | Baby Equipment Manufacturers |
| Children's Clothing | Kids Clothing | Clothing Manufacturers |
| Full Baby/Kids | All baby and children products | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Baby Specialty | Small-Medium | 3,000-10,000 | New parents |
| Kids Superstore | Large | 15,000-30,000 | Families |

**Focus Rules:**
- Registry services drive loyalty
- Safety certifications critical
- Seasonal (back-to-school) peaks
- Strong affinity with Baby Product manufacturers

**Real-World Examples:** Buy Buy Baby, Carter's, Children's Place

---

### Sporting Goods & Recreation Retailer
Sells sports equipment, bikes, and outdoor gear.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Bikes & Cycling | Bikes | Recreation Manufacturers |
| Outdoor Recreation | Bikes, Camping, Outdoor Gear | Recreation Manufacturers |
| Toys & Games | Toys | Toy Manufacturers |
| Full Recreation | All recreation products | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Bike Shop | Small | 1,000-3,000 | Cycling enthusiasts |
| Sporting Goods Store | Medium | 5,000-20,000 | Active lifestyle |
| Outdoor Superstore | Large | 20,000-50,000 | Outdoor enthusiasts |

**Focus Rules:**
- Seasonal demand (holidays, summer)
- Specialized staff for technical products
- Service/repair adds value (bikes)
- Strong affinity with Recreation manufacturers

**Real-World Examples:** Dick's Sporting Goods, REI, Academy Sports

---

### Toy Retailer
Specialized toy and game sales.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Toys & Games | Toys | Toy Manufacturers |
| Educational | Learning toys, games | Educational Toy Manufacturers |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Toy Store | Small-Medium | 5,000-20,000 | Children, gift buyers |
| Toy Superstore | Large | 20,000-50,000 | Full toy destination |

**Focus Rules:**
- Highly seasonal (Q4 holiday peak)
- Demo/play areas drive engagement
- Licensed products important
- Strong affinity with Toy manufacturers

**Real-World Examples:** Toys "R" Us (historical), specialty toy stores

---

### Automotive Retailer
Sells vehicles, parts, and automotive services.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| New Vehicles | Cars, Motorcycles | Vehicle Manufacturers |
| Auto Parts | Tires, Auto Parts, Car Battery | Auto Parts Manufacturers |
| Fluids & Maintenance | Oil & Fluids | Petroleum, Auto Parts |
| Full Automotive | Vehicles, Parts, Fluids | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Auto Parts Store | Small-Medium | 10,000-30,000 | DIY mechanics, shops |
| Tire Center | Small | 500-2,000 | Tire buyers |
| Car Dealership | Large | 50-500 vehicles | Vehicle buyers |
| Motorcycle Dealer | Medium | 20-100 vehicles | Motorcycle buyers |

**Focus Rules:**
- Dealerships are franchise-based (manufacturer affinity)
- Parts stores serve DIY and professional
- Service bays add revenue
- Strong vertical affinity with Vehicle/Parts manufacturers

**Real-World Examples:** AutoZone, O'Reilly, Pep Boys, Local Dealerships

---

### Hardware & Home Improvement Retailer
Sells tools, building materials, and DIY supplies.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Hand Tools | Tools | Hardware Manufacturers |
| Building Materials | Cement, Lumber products | Construction Manufacturers |
| Full Hardware | Tools, Materials, Supplies | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Hardware Store | Small | 5,000-15,000 | Local DIY, contractors |
| Home Center | Large | 30,000-50,000 | Home improvement |
| Warehouse Home Center | Very Large | 40,000-100,000 | Full home improvement |

**Focus Rules:**
- Contractor sales important (bulk, accounts)
- Seasonal (spring/summer peak)
- Installation services add value
- Strong affinity with Hardware/Construction manufacturers

**Real-World Examples:** Home Depot, Lowe's, Ace Hardware, Menards

---

### Beauty Retailer
Specialized cosmetics and personal care sales.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Cosmetics | Makeup, Perfume | Beauty Manufacturers |
| Personal Care | Shampoo, Soap, Deodorant | Personal Care Manufacturers |
| Full Beauty | All beauty products | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Beauty Boutique | Small | 2,000-8,000 | Beauty enthusiasts |
| Beauty Superstore | Medium | 10,000-25,000 | Full beauty destination |

| Market Segment | Price Point | Brand Focus |
|----------------|-------------|-------------|
| Mass Market | Low-Medium | Drugstore brands |
| Prestige | High | Premium brands |
| Luxury | Very High | Designer brands |

**Focus Rules:**
- Sampling/testing important
- Loyalty programs drive retention
- Trained beauty consultants add value
- Strong affinity with Beauty manufacturers

**Real-World Examples:** Sephora, Ulta, Bath & Body Works

---

### Department Store
Large-format store selling multiple categories.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Fashion Department | Clothing, Accessories, Shoes | Fashion Manufacturers |
| Beauty Department | Makeup, Perfume | Beauty Manufacturers |
| Home Department | Furniture, Appliances | Home Goods Manufacturers |
| Full Department | All categories | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Regional Department | Medium | 30,000-80,000 | Middle market |
| Flagship Department | Large | 80,000-200,000 | Premium destination |

| Market Segment | Price Point | Quality Focus |
|----------------|-------------|---------------|
| Moderate | Medium | 0.5 |
| Better | Medium-High | 0.65 |
| Premium | High | 0.8 |

**Focus Rules:**
- Anchor tenant in malls
- Brand shop-in-shops common
- Declining format (competition from specialists)
- Diverse manufacturer relationships

**Real-World Examples:** Macy's, Nordstrom, Dillard's, JCPenney

---

### General Merchandise / Big Box
Large discount stores selling wide variety.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Consumables | Food, Beverages, Cleaning, Health, Beauty | Consumer Goods Manufacturers |
| Hardlines | Electronics, Hardware, Auto, Recreation | Hardlines Manufacturers |
| Softlines | Clothing, Home Goods | Softlines Manufacturers |
| Full General | All categories | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Discount Store | Large | 50,000-100,000 | Value shoppers |
| Supercenter | Very Large | 100,000-150,000 | One-stop shopping |

**Focus Rules:**
- Massive purchasing power
- Private label important
- Price leadership strategy
- Diverse manufacturer relationships (leverage)

**Real-World Examples:** Walmart, Target, Kmart (historical)

---

### Warehouse Club
Membership-based bulk retail.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Bulk Groceries | Food, Beverages (bulk sizes) | Food Manufacturers |
| Bulk Household | Cleaning, Health, Beauty (bulk) | Consumer Goods Manufacturers |
| General Merchandise | Electronics, Furniture, Clothing | Multiple |
| Full Warehouse | All categories in bulk | Multiple |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Warehouse Club | Very Large | 4,000-7,000 (limited SKU) | Families, small businesses |

**Focus Rules:**
- Membership revenue model
- Limited SKUs, bulk packaging
- Treasure hunt merchandising
- Strong private label focus

**Real-World Examples:** Costco, Sam's Club, BJ's

---

### Specialty Food Retailer
Focused grocery with premium or specialty positioning.

| Product Focus | Products Sold | Upstream Suppliers |
|---------------|---------------|-------------------|
| Organic/Natural | Organic food products | Specialty Food Manufacturers |
| Gourmet | Premium, imported foods | Gourmet Food Manufacturers |
| Ethnic/International | Regional specialty foods | Regional Food Manufacturers |

| Store Format | Size | SKU Range | Target Market |
|--------------|------|-----------|---------------|
| Natural Food Store | Small-Medium | 5,000-20,000 | Health-conscious |
| Gourmet Market | Medium | 10,000-30,000 | Food enthusiasts |

**Focus Rules:**
- Premium pricing accepted
- Knowledgeable staff important
- Local/artisan products valued
- Strong affinity with specialty food manufacturers

**Real-World Examples:** Whole Foods, Trader Joe's, Sprouts

---

## Retail Persona Summary

| Persona | Store Formats | Primary Categories | Rarity |
|---------|---------------|-------------------|--------|
| Supermarket Chain | 3 | Food, Household | Common |
| Convenience Store | 2 | Snacks, Essentials | Common |
| Discount Grocery | 1 | Staple Foods | Common |
| Pharmacy/Drug Store | 2 | Health, Beauty | Common |
| Electronics Retailer | 3 | Electronics, Appliances | Moderate |
| Fashion Retailer | 3 | Clothing, Accessories | Common |
| Footwear Retailer | 1 | Shoes | Moderate |
| Home Goods Retailer | 3 | Furniture, Appliances | Moderate |
| Baby & Children | 2 | Baby Products | Uncommon |
| Sporting Goods | 3 | Recreation | Moderate |
| Toy Retailer | 2 | Toys | Uncommon |
| Automotive Retailer | 4 | Vehicles, Parts | Common |
| Hardware Retailer | 3 | Tools, Materials | Common |
| Beauty Retailer | 2 | Beauty Products | Moderate |
| Department Store | 2 | Multiple | Uncommon |
| General Merchandise | 2 | All Categories | Moderate |
| Warehouse Club | 1 | Bulk All Categories | Uncommon |
| Specialty Food | 2 | Premium Food | Uncommon |

---

## SERVICES INDUSTRY PERSONAS

### Bank
Provides financial services.

| Product Focus | Services |
|---------------|----------|
| Commercial Banking | Business loans, accounts |
| Consumer Banking | Personal loans, mortgages |
| Full Service | All banking services |

---

## Generation Reference

### Rarity by Corporation Type

| Type | Description | Weight |
|------|-------------|--------|
| Specialist | Single persona, 1-2 product focus | 60% |
| Diversified | Single persona, broad focus | 20% |
| Conglomerate | 2-3 complementary personas | 15% |
| Vertically Integrated | Multiple supply chain tiers | 5% |

### Persona Selection by Industry Weight

| Industry | Weight | Notes |
|----------|--------|-------|
| RAW | 25% | Foundation of supply chain |
| SEMI_RAW | 25% | Processing layer |
| MANUFACTURED | 35% | Largest variety |
| RETAIL | 10% | Consumer-facing |
| SERVICES | 5% | Support functions |
