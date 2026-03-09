# EconSim Development Notes

## Recently Completed

### Lot-Based Inventory System (Full Implementation)
- All tiers (RAW, SEMI_RAW, MANUFACTURED) now use lot-based inventory
- Lots track quantity, quality, creation time, expiration
- Auto-initialization for firms created before lot system update
- Lot transfer through pending deliveries with lotObjects array

### Supply Chain Purchasing Priority
- Manufacturers now prioritize suppliers by location:
  1. Local (same city)
  2. Domestic (same country)
  3. International (other countries)
  4. Global Market (fallback only - 1.5x premium)
- UI shows suppliers categorized by location with color-coded labels

### UI Improvements
- Firm detail page shows supplier links for input materials
- Lot inventory section shows for ALL manufacturers (not just SEMI_RAW)
- Added `debug.getLotReport()` helper for debugging

---

## Next Changes To Do

### 1. Retail Store Purchasing Priority
- Apply same location-based priority to retail stores buying from manufacturers
- Retailers should prefer local/domestic manufacturers over international
- Global market fallback for products with no firm suppliers

### 2. Potential Clients Display for Firms
- On firm detail page, determine and display potential clients using priority order:
  1. Same corporation (internal sales)
  2. Same city (local buyers)
  3. Same country (domestic buyers)
  4. Other country (international buyers)
  5. Global sales (fallback at lower price)
- For retail firms: show which retailers could buy their products
- For manufacturers: show which manufacturers need their outputs
- UI should categorize potential clients by priority tier
- Consider showing demand estimates or purchase history

### 3. Lot Display in Transactions
- Show lot IDs in transaction logs
- Display lot quality in sales records
- Track lot origin through supply chain

### 4. Competitive Retail System Completion
- Integrate `CityRetailDemandManager` with lot-based inventory
- Implement `RetailerAttractiveness` scoring system
- Add city `localPreference` for demand distribution

### 5. Price Competition
- Manufacturers should compete on price, not just inventory
- Consider transport costs in supplier selection
- Dynamic pricing based on supply/demand

### 6. Quality Tracking
- Quality should affect product pricing
- Track quality degradation for perishable goods
- Premium pricing for high-quality lots

### 7. Production Efficiency
- Technology level should affect production rate
- Worker skill affects quality
- Equipment upgrades

### 8. Working Hours & Shifts for Raw Material Production
- Introduce working hours for Mining, Logging, and Farm operations
- Implement shift system (e.g., Day shift 6am-2pm, Evening shift 2pm-10pm, Night shift 10pm-6am)
- Production only occurs during active shifts
- Configurable number of shifts per firm (1, 2, or 3 shifts)
- Labor costs vary by shift (night shift premium)
- Overtime mechanics for extended production
- Seasonal considerations for farms (longer days in summer)

### 9. Manufacturing Lines with Shifts
- Multiple production lines per manufacturing plant
- Each line can operate independently with own shift schedule
- Line capacity determines max production rate per line
- Workers assigned to specific lines and shifts
- Line maintenance/downtime scheduling
- Upgrade path: add new lines to increase capacity
- Line efficiency based on equipment age and maintenance
- Changeover time when switching products on a line
- 24/7 operation possible with 3-shift coverage per line

### 10. Corporation Strategy - Vertical & Horizontal Integration
- Eliminate unrealistic conglomerates (e.g., bank + baby formula factory + gold mine)
- Corporation types should focus on related industries:
  - **Vertical Integration**: Own supply chain (e.g., Iron Mine → Steel Mill → Auto Parts → Car Factory)
  - **Horizontal Integration**: Same industry/category (e.g., multiple food brands, multiple retail stores)
  - **Industry Focus**: Mining corps, Agriculture corps, Manufacturing corps, Retail corps, Financial corps
- Corporation specialization by product category:
  - Raw Materials: Mining, Logging, Farming
  - Processing: Refineries, Mills, Food Processing
  - Manufacturing: Electronics, Automotive, Consumer Goods, etc.
  - Retail: Supermarkets, Department Stores, Specialty Retail
  - Services: Banks, Insurance, Logistics
- AI-driven corporation expansion decisions based on strategy type
- Synergy bonuses for related businesses (shared logistics, bulk purchasing)
- Penalties or restrictions for unrelated acquisitions

### 11. Corporation Branding & Reputation System
- **Corporation Reputation** (high-level brand):
  - Overall reputation score (0-100) affects all subsidiary brands
  - Built through: quality products, customer satisfaction, ethical practices
  - Damaged by: scandals, poor quality, labor issues, environmental violations
  - Reputation decay over time without active maintenance
  - Public perception influenced by news events and PR
- **Product Brands**:
  - Corporations can create multiple brands for different market segments
  - Brand attributes: name, logo, target market, positioning (budget/mid/premium)
  - Brand equity builds over time with consistent quality and marketing
  - Brand recognition affects consumer purchase decisions
- **Marketing Mechanics**:
  - Advertising campaigns (TV, digital, print) to boost brand awareness
  - Marketing budget allocation per brand/product
  - Campaign effectiveness based on spend, creativity, market saturation
  - Seasonal promotions and discounts
  - Sponsorships and endorsements
  - Word-of-mouth from customer satisfaction
- **Brand Impact on Sales**:
  - Strong brands command price premiums
  - Brand loyalty reduces price sensitivity
  - New brands need heavy marketing to establish
  - Brand reputation affects retail shelf placement priority

### 12. Brand Relationship Meters (Friends & Enemies System)
- **Relationship Score**: -100 (hostile) to +100 (allied), starts at 0 (neutral)
- **Positive Actions** (increase relationship):
  - Regular B2B trade partnerships (supplier/buyer)
  - Exclusive supply agreements
  - Joint ventures or co-branding
  - Non-compete in each other's primary markets
  - Referring business to each other
  - Long-term contracts with fair pricing
  - Helping during supply shortages
- **Negative Actions** (decrease relationship):
  - Selling similar products in the same city (direct competition)
  - Manufacturing same product category (market rivals)
  - Undercutting prices aggressively
  - Poaching employees or suppliers
  - Breaking contracts or exclusive agreements
  - Expanding into rival's home market
  - Negative PR campaigns against competitor
  - Acquiring rival's suppliers to cut them off
- **Relationship Tiers**:
  - **Allied** (+75 to +100): Preferential pricing, priority supply, shared logistics
  - **Friendly** (+25 to +74): Fair deals, reliable partner
  - **Neutral** (-24 to +24): Standard business terms
  - **Rival** (-74 to -25): Competitive tension, no cooperation
  - **Hostile** (-100 to -75): Active competition, price wars, blocked deals
- **Natural Dynamics**:
  - Vertical partners (supplier→manufacturer→retailer) tend toward friendship
  - Horizontal competitors (same products) tend toward rivalry
  - Relationship affects: trade prices, supply priority, joint opportunities
  - Alliances can form against common enemies
  - Betrayals cause major relationship drops

### 13. Centralized Commodity Market (Raw Material Price Control)
> **Status**: Concept phase - needs further design

- **Core Concept**: A global exchange where RAW material prices are determined by supply/demand across all producers and consumers, similar to real-world commodity exchanges (COMEX, NYMEX, LME)

- **Price Discovery Mechanism** (Option A - Order Book):
  - Producers list sell orders at desired prices
  - Manufacturers place buy orders at desired prices
  - Market matches orders and sets clearing price
  - Visible bid/ask spread for each commodity

- **Price Discovery Mechanism** (Option B - Index-Based):
  - Track total global supply (all producer inventory + production rate)
  - Track total global demand (all manufacturer consumption rate)
  - Calculate index price based on supply/demand ratio
  - Price adjusts hourly/daily based on market conditions

- **Market Features**:
  - **Spot Market**: Immediate delivery at current price
  - **Futures Contracts**: Lock in prices for future delivery (hedge against volatility)
  - **Price History**: Track commodity price trends over time
  - **Market News**: Events affecting prices (mine collapse, bumper harvest, etc.)

- **Price Influences**:
  - Global supply vs demand balance
  - Seasonal factors (agricultural commodities)
  - Geopolitical events (trade restrictions, wars)
  - Natural disasters affecting production
  - Speculation and hoarding
  - Currency exchange rates between countries

- **Integration with Existing System**:
  - Replace fixed `basePrice` with dynamic commodity price
  - B2B trades reference commodity market price (±negotiated margin)
  - Global Market purchases use commodity price + premium
  - Firms can choose to sell on commodity market vs direct B2B

- **Open Questions**:
  - How to handle price volatility without breaking economy?
  - Should AI corporations speculate on commodities?
  - How detailed should futures/options trading be?
  - Regional price differences or single global price?

### 14. World Map Visual Overhaul
> **Status**: Needs visual design exploration

- **Core Goal**: Display cities on a world map with clear country boundaries and visual hierarchy

- **City Display**:
  - City markers/dots scaled by population or economic activity
  - City names visible on hover or at zoom level
  - Color coding by: country, economic health, or industry focus
  - Click to view city details/firms

- **Country Display Options**:
  - Option A: Colored regions with borders (choropleth style)
  - Option B: Country labels with subtle boundary lines
  - Option C: Flag icons at capital/major cities
  - Option D: Highlight country on hover, dim others

- **Map Features to Consider**:
  - Zoom levels (world → continent → country → city)
  - Trade route visualization (lines between trading cities)
  - Resource indicators (icons for mining, farming regions)
  - Transportation infrastructure (ports, airports, railways)
  - Heat maps for: production density, demand, prices

- **Technical Considerations**:
  - SVG vs Canvas vs WebGL for rendering
  - Map projection (Mercator, Robinson, etc.)
  - Performance with many cities/routes
  - Mobile responsiveness

- **Visual Style Questions**:
  - Realistic geography or stylized/simplified?
  - Dark theme or light theme map?
  - How much detail on coastlines/terrain?
  - Animated trade flows or static?

- **Data Requirements**:
  - City coordinates (lat/long)
  - Country boundary data (GeoJSON)
  - Define which cities belong to which countries

### 15. Transportation & Order Tracking Overhaul
> **Status**: UX improvement needed

- **Current Problems**:
  - Difficult to understand movement of goods between firms
  - Delivery times not realistic or clearly communicated
  - No clear visibility into pending orders and their status
  - Hard to trace where products came from or are going

- **Order Tracking Screen**:
  - List all active orders/shipments in one place
  - Each order shows:
    - **Buyer**: Firm name, type, city
    - **Seller**: Firm name, type, city
    - **Product**: Name, quantity, lot IDs
    - **Status**: Ordered → Processing → In Transit → Delivered
    - **ETA**: Estimated delivery time remaining
    - **Route**: Origin city → Destination city (with transport mode)
    - **Cost**: Product cost + transport cost breakdown
  - Filter by: buyer, seller, product, status, route
  - Sort by: ETA, order date, value

- **Realistic Delivery Times**:
  - Based on actual distance between cities
  - Transport mode affects speed:
    - Truck: ~60 km/h average (local/regional)
    - Rail: ~80 km/h average (domestic bulk)
    - Ship: ~40 km/h average (international bulk, cheapest)
    - Air: ~800 km/h average (urgent, expensive)
  - Loading/unloading time at each end
  - Customs delays for international shipments
  - Weather/traffic factors (optional complexity)

- **Visual Indicators**:
  - Progress bar showing shipment journey
  - Map view with moving shipment icons (tie into Map Overhaul #13)
  - Color coding: green (on time), yellow (delayed), red (problem)
  - Notifications when orders arrive

- **Firm-Level View**:
  - Incoming orders (what I'm receiving)
  - Outgoing orders (what I'm shipping)
  - Order history with delivery performance stats

- **Integration Points**:
  - Link from firm detail page to their orders
  - Link from transaction log to shipment details
  - Alerts for low stock with pending deliveries shown

### 16. Save & Load Game State
> **Status**: Core feature needed

- **Core Functionality**:
  - Save entire simulation state to file or browser storage
  - Load saved state to continue where left off
  - Multiple save slots (manual saves)
  - Auto-save at configurable intervals

- **Data to Persist**:
  - Game clock (current date/time, tick count)
  - All firms (type, inventory, cash, employees, lot inventory, settings)
  - All corporations (cash, owned firms, reputation, relationships)
  - Cities (population, economic stats, local preferences)
  - Countries (GDP, policies, trade agreements)
  - Product registry state (current prices, supply/demand)
  - Transaction history (recent transactions, or summary)
  - Pending deliveries and orders in transit
  - Global market state (order book, price history)
  - Commodity market prices
  - Random seed (for reproducible simulation)

- **Save Format Options**:
  - JSON (human-readable, larger file size)
  - Compressed JSON (smaller, still portable)
  - IndexedDB (browser storage, fast access)
  - File download/upload (for sharing/backup)

- **UI Features**:
  - Save game button with name/description
  - Load game menu showing saved games with:
    - Save name and timestamp
    - Game date/time at save
    - Brief stats (firms, corporations, GDP)
  - Delete save option
  - Export save to file / Import from file
  - Warning before overwriting saves

- **Technical Considerations**:
  - Serialize complex objects (Maps, Sets, circular refs)
  - Handle version migration (old saves with new code)
  - Performance with large simulations
  - Validate save file integrity on load
  - Handle corrupted saves gracefully

- **Cloud Save (Future)**:
  - User accounts for cloud storage
  - Sync saves across devices
  - Share saves with other players

### 17. Corporation Intelligence & Strategy AI
> **Status**: Needs design

- **Strategic Decision Making**:
  - AI-driven decisions for building new firms based on market gaps
  - Analyze supply chain needs and vertical integration opportunities
  - Evaluate market demand vs current production capacity
  - Identify profitable product categories to enter

- **Profitability Analysis**:
  - Track profitability of each product/firm over time
  - Decision to stop selling unprofitable products after X periods
  - Decide to close or sell underperforming firms
  - Reinvest profits into high-performing areas

- **Expansion Logic**:
  - When to build new production facilities
  - Where to locate new firms (city selection)
  - Capacity planning based on demand forecasts
  - Capital allocation between existing firms and new ventures

- **Risk Management**:
  - Diversification strategies
  - Avoid over-dependence on single supplier/customer
  - Cash reserve management
  - Debt vs equity financing decisions

### 18. Farm System Review & Fix
> **Status**: Bug fix needed

- **Current Issues**:
  - Farms not working as expected
  - Review farm setup and initialization
  - Check production cycles and output generation

- **Areas to Review**:
  - `js/core/firms/Farm.js` - Core farm logic
  - Seasonal production mechanics
  - Crop types and yields
  - Labor and equipment requirements
  - Integration with lot-based inventory system
  - Weather/climate effects on production

- **Expected Behavior**:
  - Farms should produce RAW agricultural goods
  - Production should follow seasonal patterns
  - Output should be stored in lot-based inventory
  - Products should be available for B2B sales to processors

### 19. Bank System Review & Fix
> **Status**: Bug fix needed

- **Current Issues**:
  - Banks not functioning currently
  - Review banking system architecture
  - Determine core functionality requirements

- **Banking Features to Review**:
  - Loan origination and repayment
  - Interest calculation and collection
  - Deposit accounts for firms/individuals
  - Cash flow management
  - Credit scoring for loan approval
  - Default handling and collections

- **Integration Points**:
  - Firm financing for new equipment/expansion
  - Corporation borrowing for acquisitions
  - Working capital loans for inventory
  - Mortgage/real estate financing
  - Inter-bank transactions

### 20. B2B vs B2C Transaction Display Separation
> **Status**: UX improvement needed

- **Current Problem**:
  - All transactions displayed in same format
  - Hard to distinguish B2B (business-to-business) from B2C (business-to-consumer)
  - Mining and manufacturing sales mixed with retail sales

- **Transaction Types to Differentiate**:
  - **B2B - Raw Material Sales**: Mine → Processor, Farm → Manufacturer
  - **B2B - Semi-Raw Sales**: Steel Mill → Auto Parts Factory
  - **B2B - Manufactured Goods**: Manufacturer → Retailer (wholesale)
  - **B2C - Retail Sales**: Retailer → Consumer (end sales)
  - **Global Market**: Purchases from/sales to global market

- **Display Differences**:
  - Different icons or color coding per transaction type
  - B2B: Show lot IDs, bulk quantities, unit prices
  - B2C: Show individual item sales, consumer info
  - Separate tabs or filters for B2B vs B2C
  - Summary statistics per transaction type

- **UI Updates Needed**:
  - Transaction log filters (B2B / B2C / Global Market)
  - Visual indicators (icons, colors, badges)
  - Firm detail page: separate incoming/outgoing B2B section
  - Dashboard: B2B volume vs B2C volume metrics
  - Consider separate transaction log pages for each type

- **Data Model Considerations**:
  - Add `transactionType` field to transaction records
  - Categories: 'B2B_RAW', 'B2B_SEMI', 'B2B_MANUFACTURED', 'B2C_RETAIL', 'GLOBAL_MARKET'
  - Track buyer/seller firm types for automatic categorization

### 21. Inventory Contracts System (B2B Supply Agreements)
> **Status**: Concept phase

- **Core Concept**:
  - Replace ad-hoc purchasing with structured supply contracts
  - Long-term agreements between suppliers and buyers
  - Predictable supply chains with committed volumes and pricing
  - Contracts span: Producer → Manufacturer → Retailer

- **Contract Types**:
  - **Fixed Volume Contract**: Deliver X units per period at agreed price
  - **Minimum/Maximum Contract**: Guaranteed minimum, optional up to max
  - **Exclusive Supply**: Supplier commits 100% output to single buyer
  - **Preferred Supplier**: Buyer commits to purchase X% from supplier first
  - **Spot + Contract Hybrid**: Base volume contracted, extra via spot market

- **Contract Terms**:
  - **Duration**: Weekly, monthly, quarterly, annual
  - **Volume**: Units per period (e.g., 100 tons/week)
  - **Price**: Fixed, indexed to commodity market, or cost-plus margin
  - **Delivery Schedule**: Daily, weekly, on-demand
  - **Quality Standards**: Minimum quality level required
  - **Penalties**: Late delivery fees, shortfall charges, cancellation costs
  - **Renewal**: Auto-renew, renegotiate, or expire

- **Contract Negotiation**:
  - Buyer initiates contract request with terms
  - Supplier accepts, rejects, or counter-offers
  - Negotiation factors: volume, price, duration, exclusivity
  - Relationship score affects negotiation willingness
  - Better terms for allied corporations (see #12)

- **Contract Fulfillment**:
  - Contracted volumes fulfilled before spot market sales
  - Automatic delivery scheduling based on contract terms
  - Track fulfillment rate per contract
  - Alerts for contracts at risk of shortfall
  - Inventory reservation for contracted volumes

- **Contract Benefits**:
  - **For Buyers**: Guaranteed supply, stable pricing, planning certainty
  - **For Suppliers**: Guaranteed demand, revenue predictability, capacity planning
  - **Price Advantages**: Contract prices typically 5-15% below spot market
  - **Relationship Building**: Contracts improve relationship scores

- **Contract Risks**:
  - **Overcommitment**: Supplier contracts more than can produce
  - **Market Shifts**: Locked into unfavorable prices if market changes
  - **Default**: Counterparty fails to fulfill obligations
  - **Opportunity Cost**: Can't sell to higher bidder if contracted

- **UI Requirements**:
  - Contract management screen per firm
  - Active contracts with status, fulfillment progress
  - Contract negotiation interface
  - Contract history and performance metrics
  - Alerts for expiring contracts, fulfillment issues

- **Integration with Existing Systems**:
  - Supply chain prioritizes contracted suppliers
  - Transaction log marks contract vs spot purchases
  - Corporation strategy AI considers contracts (#17)
  - Relationship meters affected by contract performance (#12)

---

## Known Issues

- Some firms created before lot system may need page refresh to show lots
- Transaction log shows requested quantity vs actual lot quantity (partially fixed)

---

## File Reference

Key files for lot system:
- `js/core/Lot.js` - Lot and LotInventory classes
- `js/core/LotSizings.js` - Lot configurations per product
- `js/core/firms/ManufacturingPlant.js` - Lot creation and selection
- `js/core/SimulationEngine.js` - Supply chain with lot transfers
- `js/core/GlobalMarket.js` - Lot-based global market sales

Key files for UI:
- `js/pages/firms.js` - Firm detail page with supplier links
- `css/styles.css` - Supplier label styles
