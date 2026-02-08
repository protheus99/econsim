// js/core/GlobalMarket.js
export class GlobalMarket {
    constructor(productRegistry, config = {}) {
        this.productRegistry = productRegistry;
        this.firms = null; // Reference to simulation firms Map for inventory updates
        this.transportationNetwork = null; // Reference to transportation network for cost calculations
        this.countries = null; // Reference to countries for global hub positions

        // Configuration with defaults
        this.config = {
            enabled: config.enabled ?? true,
            priceMultiplier: config.priceMultiplier ?? 1.5,
            marketDiscountRate: config.marketDiscountRate ?? 0.5, // Non-company orders pay 50% less
            availabilityFactor: config.availabilityFactor ?? 0.8,
            deliveryDelayHours: config.deliveryDelayHours ?? 24,
            minimumOrderSize: config.minimumOrderSize ?? 10,
            maxOrdersPerHour: config.maxOrdersPerHour ?? 1000,
            biddingStartHour: config.biddingStartHour ?? 6,  // 6am
            biddingEndHour: config.biddingEndHour ?? 12,     // 12pm
            initialOrderCount: config.initialOrderCount ?? 3500
        };

        // Market orders available for bidding
        this.availableOrders = [];
        // Orders currently in bidding window (6am-12pm)
        this.biddingOrders = [];
        // Bids placed on orders
        this.orderBids = new Map(); // orderId -> [bids]
        // Awarded orders pending delivery
        this.pendingOrders = [];
        // Completed orders
        this.completedOrders = [];
        // Internal firm orders (going through market)
        this.internalOrders = [];

        this.hourlyOrderCount = 0;
        this.totalRevenue = 0;
        this.totalVolume = 0;

        // Market prices (can fluctuate)
        this.marketPrices = new Map();
        this.initializeMarketPrices();

        // Statistics
        this.stats = {
            totalOrdersPlaced: 0,
            totalOrdersDelivered: 0,
            totalOrdersAwarded: 0,
            totalBidsReceived: 0,
            totalSpent: 0,
            averageMarkup: this.config.priceMultiplier
        };

        // Track current game hour for bidding windows
        this.currentHour = 0;
        this.currentDay = 1;
    }

    initializeMarketPrices() {
        const products = this.productRegistry.getAllProducts();
        products.forEach(product => {
            this.marketPrices.set(product.id, {
                productId: product.id,
                productName: product.name,
                tier: product.tier,
                basePrice: product.basePrice,
                currentPrice: product.basePrice * this.config.priceMultiplier,
                supply: 1000000,
                lastUpdated: Date.now()
            });
        });
    }

    // Set reference to firms Map for inventory updates during delivery
    setFirms(firms) {
        this.firms = firms;
    }

    // Set references to transportation network and countries for transport cost calculations
    setTransportation(transportationNetwork, countries) {
        this.transportationNetwork = transportationNetwork;
        this.countries = countries;
    }

    // Initialize with 3500+ orders for all non-retail products
    initializeOrders() {
        if (!this.config.enabled) {
            console.log('GlobalMarket disabled - skipping order initialization');
            return;
        }

        const products = this.productRegistry.getAllProducts();
        // Filter non-retail products (RAW, SEMI_RAW, MANUFACTURED)
        const nonRetailProducts = products.filter(p =>
            p.tier === 'RAW' || p.tier === 'SEMI_RAW' || p.tier === 'MANUFACTURED'
        );

        if (nonRetailProducts.length === 0) {
            console.log('No non-retail products found for order generation');
            return;
        }

        const ordersPerProduct = Math.ceil(this.config.initialOrderCount / nonRetailProducts.length);

        nonRetailProducts.forEach(product => {
            for (let i = 0; i < ordersPerProduct; i++) {
                const order = this.generateMarketOrder(product);
                this.availableOrders.push(order);
            }
        });

        console.log(`✅ GlobalMarket initialized with ${this.availableOrders.length} orders`);
    }

    generateMarketOrder(product, isCompanyOrder = false, companyData = null) {
        // Calculate quantity to achieve order values between $2,000 and $2,000,000
        // Based on product base price and market multiplier
        const basePrice = product.basePrice || 10;
        const estimatedUnitPrice = basePrice * this.config.priceMultiplier;

        // Target value range: $10,000 to $2,000,000
        const minTargetValue = 10000;
        const maxTargetValue = 2000000;

        // Calculate quantity ranges based on price to hit target values
        let minQty = Math.max(10, Math.floor(minTargetValue / estimatedUnitPrice));
        let maxQty = Math.max(minQty * 2, Math.floor(maxTargetValue / estimatedUnitPrice));

        // Apply tier-based adjustments (higher tier = generally lower quantities, higher value per unit)
        switch (product.tier) {
            case 'RAW':
                // Raw materials: larger quantities, lower unit prices
                minQty = Math.max(100, minQty);
                maxQty = Math.min(100000, maxQty);
                break;
            case 'SEMI_RAW':
                // Semi-processed: medium quantities
                minQty = Math.max(50, minQty);
                maxQty = Math.min(50000, maxQty);
                break;
            case 'MANUFACTURED':
                // Finished goods: smaller quantities, higher unit prices
                minQty = Math.max(20, minQty);
                maxQty = Math.min(20000, maxQty);
                break;
            default:
                minQty = Math.max(50, minQty);
                maxQty = Math.min(50000, maxQty);
        }

        const quantity = Math.floor(Math.random() * (maxQty - minQty + 1)) + minQty;

        // Price calculation (basePrice already defined above)
        let offerPrice;
        if (isCompanyOrder) {
            // Company orders pay full market price (or more)
            offerPrice = basePrice * this.config.priceMultiplier * (1 + Math.random() * 0.2);
        } else {
            // Market orders pay 50% less
            offerPrice = basePrice * this.config.priceMultiplier * this.config.marketDiscountRate;
        }

        // Delivery deadline (1-7 days from now)
        const deliveryDays = Math.floor(Math.random() * 7) + 1;
        const deliveryHours = deliveryDays * 24;

        // Calculate transport cost and time based on distance from global hub
        let deliveryFee = 0;
        let transitHours = 24; // Default transit time
        let transportDetails = null;
        let deliveryLocation = 'Global Market';

        if (isCompanyOrder && companyData?.city && this.transportationNetwork) {
            const buyerCity = companyData.city;
            const buyerCountry = buyerCity.country;
            deliveryLocation = buyerCity.name;

            if (buyerCountry?.globalMarketHub) {
                // Create virtual hub city for route calculation
                const hubCity = {
                    coordinates: { x: buyerCountry.globalMarketHub.x, y: buyerCountry.globalMarketHub.y },
                    hasAirport: buyerCountry.globalMarketHub.hasAirport,
                    hasSeaport: buyerCountry.globalMarketHub.hasSeaport,
                    hasRailway: buyerCountry.globalMarketHub.hasRailway
                };

                const route = this.transportationNetwork.findOptimalRoute(
                    hubCity, buyerCity, quantity, 'balanced'
                );

                if (route.optimalRoute) {
                    deliveryFee = route.optimalRoute.baseCost || 0;
                    transitHours = Math.ceil(route.optimalRoute.transitTime?.hours || 24);
                    transportDetails = {
                        distance: route.distance,
                        mode: route.optimalRoute.type,
                        modeName: route.optimalRoute.typeName,
                        fromHub: { x: hubCity.coordinates.x, y: hubCity.coordinates.y },
                        toCity: buyerCity.name
                    };
                }
            }
        } else {
            // Fallback for market orders without known buyer - random delivery fee
            const locations = ['North Region', 'South Region', 'East Region', 'West Region', 'Central Region'];
            deliveryLocation = locations[Math.floor(Math.random() * locations.length)];
            deliveryFee = quantity * 0.5 * (Math.random() * 2 + 1);
        }

        const order = {
            id: `MKT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productId: product.id,
            productName: product.name,
            productTier: product.tier,
            quantity: quantity,
            basePrice: basePrice,
            offerPrice: offerPrice, // Price buyer is willing to pay per unit
            totalValue: offerPrice * quantity,
            deliveryFee: deliveryFee,
            deliveryLocation: deliveryLocation,
            deliveryDeadlineHours: deliveryHours,
            deliveryDeadlineDay: this.currentDay + deliveryDays,
            transitHours: transitHours, // Calculated based on distance from hub
            transportDetails: transportDetails, // Transport mode and distance info
            isCompanyOrder: isCompanyOrder,
            companyId: companyData?.id || null,
            companyName: companyData?.name || 'Market Order',
            priority: isCompanyOrder ? 'HIGH' : 'NORMAL',
            status: 'AVAILABLE', // AVAILABLE, BIDDING, AWARDED, IN_TRANSIT, DELIVERED, EXPIRED
            bids: [],
            winningBid: null,
            createdAt: Date.now(),
            createdDay: this.currentDay,
            createdHour: this.currentHour
        };

        this.stats.totalOrdersPlaced++;
        return order;
    }

    // Called at 6am - move available orders to bidding
    openBiddingWindow() {
        // Take orders that are available and move to bidding
        const ordersToOpen = this.availableOrders.filter(o => o.status === 'AVAILABLE');

        // Open up to 1000 orders for bidding each day
        const maxOrdersPerDay = 1000;
        const ordersForToday = ordersToOpen.slice(0, maxOrdersPerDay);

        ordersForToday.forEach(order => {
            order.status = 'BIDDING';
            order.biddingOpenedAt = Date.now();
            order.biddingDay = this.currentDay;
            this.biddingOrders.push(order);

            // Remove from available
            const idx = this.availableOrders.indexOf(order);
            if (idx > -1) this.availableOrders.splice(idx, 1);
        });

        console.log(`📢 Bidding opened for ${ordersForToday.length} orders at 6am Day ${this.currentDay}`);
        return ordersForToday;
    }

    // Place a bid on an order
    placeBid(firm, orderId, bidPrice, deliveryFee = 0) {
        const order = this.biddingOrders.find(o => o.id === orderId);
        if (!order) {
            return { success: false, reason: 'ORDER_NOT_FOUND' };
        }

        if (order.status !== 'BIDDING') {
            return { success: false, reason: 'ORDER_NOT_IN_BIDDING' };
        }

        // Calculate total bid (price per unit + delivery)
        const totalBidValue = (bidPrice * order.quantity) + deliveryFee;

        const bid = {
            id: `BID_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            orderId: orderId,
            firmId: firm.id,
            firmName: firm.name || firm.id,
            firmType: firm.type,
            bidPricePerUnit: bidPrice,
            deliveryFee: deliveryFee,
            totalBidValue: totalBidValue,
            placedAt: Date.now(),
            placedDay: this.currentDay,
            placedHour: this.currentHour
        };

        order.bids.push(bid);
        this.stats.totalBidsReceived++;

        console.log(`💰 Bid placed: ${firm.name || firm.id} bid ${bidPrice}/unit + ${deliveryFee} delivery on order ${orderId}`);

        return { success: true, bid: bid };
    }

    // Called at 12pm - evaluate bids and select winners
    closeBiddingWindow() {
        const awardedOrders = [];
        const expiredOrders = [];

        this.biddingOrders.forEach(order => {
            if (order.status !== 'BIDDING') return;

            if (order.bids.length === 0) {
                // No bids - return to available or expire
                if (order.deliveryDeadlineDay - this.currentDay <= 1) {
                    order.status = 'EXPIRED';
                    expiredOrders.push(order);
                } else {
                    order.status = 'AVAILABLE';
                    this.availableOrders.push(order);
                }
            } else {
                // Select winner - highest total bid value wins
                // Company orders get 10% priority bonus in scoring
                const scoredBids = order.bids.map(bid => ({
                    ...bid,
                    score: bid.totalBidValue * (order.isCompanyOrder ? 1.1 : 1.0)
                }));

                scoredBids.sort((a, b) => b.score - a.score);
                const winningBid = scoredBids[0];

                order.winningBid = winningBid;
                order.status = 'AWARDED';
                order.awardedAt = Date.now();
                order.awardedDay = this.currentDay;
                // Use calculated transit time if available, otherwise fallback to deadline (max 48 hours)
                order.deliveryHoursRemaining = order.transitHours || Math.min(order.deliveryDeadlineHours, 48);

                this.pendingOrders.push(order);
                awardedOrders.push(order);
                this.stats.totalOrdersAwarded++;

                console.log(`🏆 Order ${order.id} awarded to ${winningBid.firmName} for ${winningBid.totalBidValue.toFixed(2)}`);
            }
        });

        // Clear bidding orders
        this.biddingOrders = this.biddingOrders.filter(o => o.status === 'BIDDING');

        console.log(`✅ Bidding closed: ${awardedOrders.length} awarded, ${expiredOrders.length} expired`);
        return { awarded: awardedOrders, expired: expiredOrders };
    }

    // Submit an internal order (firm requesting materials)
    submitInternalOrder(buyer, productIdOrName, quantity, priority = 'normal') {
        if (!this.config.enabled) {
            return { success: false, reason: 'GLOBAL_MARKET_DISABLED' };
        }

        quantity = Math.floor(quantity);
        if (quantity < this.config.minimumOrderSize) {
            return { success: false, reason: 'BELOW_MINIMUM_ORDER', minimum: this.config.minimumOrderSize };
        }

        const product = this.productRegistry.getProduct(productIdOrName);
        if (!product) {
            return { success: false, reason: 'PRODUCT_NOT_FOUND' };
        }

        // Company orders pay full price - include city for transport calculations
        const order = this.generateMarketOrder(product, true, {
            id: buyer.id,
            name: buyer.name || buyer.id,
            city: buyer.city  // Pass city for transport cost calculation
        });

        // Override quantity with requested amount
        order.quantity = quantity;
        order.totalValue = order.offerPrice * quantity;
        order.buyerId = buyer.id;
        order.buyer = buyer;
        order.isInternalOrder = true;

        // Check if buyer can afford
        if (buyer.cash < order.totalValue) {
            return { success: false, reason: 'INSUFFICIENT_FUNDS', required: order.totalValue, available: buyer.cash };
        }

        // Reserve funds
        buyer.cash -= order.totalValue;
        buyer.expenses += order.totalValue;

        // Add to available orders for bidding
        this.availableOrders.push(order);
        this.internalOrders.push(order);

        return {
            success: true,
            order: order,
            message: 'Order submitted for bidding'
        };
    }

    // Legacy method for backward compatibility - direct purchase
    placeOrder(buyer, productIdOrName, quantity, priority = 'normal') {
        // Convert to internal order through bidding system
        return this.submitInternalOrder(buyer, productIdOrName, quantity, priority);
    }

    getMarketPrice(productIdOrName) {
        if (this.marketPrices.has(productIdOrName)) {
            return this.marketPrices.get(productIdOrName).currentPrice;
        }

        for (const [id, data] of this.marketPrices) {
            if (data.productName === productIdOrName) {
                return data.currentPrice;
            }
        }

        const product = this.productRegistry.getProduct(productIdOrName);
        if (product) {
            return product.basePrice * this.config.priceMultiplier;
        }

        return 100 * this.config.priceMultiplier;
    }

    canPlaceOrder() {
        return this.config.enabled;
    }

    // Process hourly updates
    processHourly(currentHour, currentDay) {
        this.currentHour = currentHour;
        this.currentDay = currentDay;

        // Skip all processing if market is disabled
        if (!this.config.enabled) {
            return {
                delivered: 0,
                deliveredOrders: [],
                pending: 0,
                availableOrders: 0,
                biddingOrders: 0
            };
        }

        this.hourlyOrderCount = 0;

        // Handle bidding window
        if (currentHour === this.config.biddingStartHour) {
            this.openBiddingWindow();
        } else if (currentHour === this.config.biddingEndHour) {
            this.closeBiddingWindow();
        }

        // Process deliveries for awarded orders
        const deliveredOrders = [];
        this.pendingOrders = this.pendingOrders.filter(order => {
            if (order.status !== 'AWARDED') return true;

            order.deliveryHoursRemaining--;

            if (order.deliveryHoursRemaining <= 0) {
                this.deliverOrder(order);
                deliveredOrders.push(order);
                return false;
            }

            return true;
        });

        // Generate new orders occasionally to keep market active
        if (Math.random() < 0.1) { // 10% chance per hour
            this.generateNewMarketOrders(5);
        }

        // Update market prices
        this.updateMarketPrices();

        return {
            delivered: deliveredOrders.length,
            deliveredOrders: deliveredOrders,
            pending: this.pendingOrders.length,
            availableOrders: this.availableOrders.length,
            biddingOrders: this.biddingOrders.length
        };
    }

    generateNewMarketOrders(count) {
        const products = this.productRegistry.getAllProducts();
        const nonRetailProducts = products.filter(p =>
            p.tier === 'RAW' || p.tier === 'SEMI_RAW' || p.tier === 'MANUFACTURED'
        );

        if (nonRetailProducts.length === 0) return;

        for (let i = 0; i < count; i++) {
            const product = nonRetailProducts[Math.floor(Math.random() * nonRetailProducts.length)];
            const isCompany = Math.random() < 0.3; // 30% are company orders
            const order = this.generateMarketOrder(product, isCompany);
            this.availableOrders.push(order);
        }
    }

    deliverOrder(order) {
        // If internal order, deliver to buyer
        if (order.isInternalOrder && order.buyer) {
            const buyer = order.buyer;

            if (buyer.type === 'MANUFACTURING') {
                if (buyer.rawMaterialInventory && buyer.rawMaterialInventory.has(order.productName)) {
                    const inventory = buyer.rawMaterialInventory.get(order.productName);
                    inventory.quantity += order.quantity;
                } else if (buyer.rawMaterialInventory) {
                    buyer.rawMaterialInventory.set(order.productName, {
                        quantity: order.quantity,
                        capacity: order.quantity * 10,
                        minRequired: order.quantity
                    });
                }
            } else if (buyer.type === 'RETAIL') {
                if (buyer.receiveDelivery) {
                    buyer.receiveDelivery(order.productId, order.quantity, order.offerPrice, order.productName);
                }
            } else if (buyer.inventory) {
                buyer.inventory.quantity += order.quantity;
            }
        }

        // Process winning bid - deduct inventory and pay seller
        if (order.winningBid && this.firms) {
            const seller = this.firms.get(order.winningBid.firmId);

            if (seller) {
                // Deduct inventory from seller based on firm type
                let inventorySource = null;
                if (seller.type === 'MANUFACTURING') {
                    inventorySource = seller.finishedGoodsInventory;
                } else if (seller.type === 'MINING' || seller.type === 'LOGGING' || seller.type === 'FARM') {
                    inventorySource = seller.inventory;
                }

                if (inventorySource && inventorySource.quantity >= order.quantity) {
                    inventorySource.quantity -= order.quantity;
                } else if (inventorySource) {
                    // Deduct what's available (partial fulfillment)
                    console.warn(`⚠️ Firm ${seller.id} has insufficient inventory for order ${order.id}. Available: ${inventorySource.quantity}, Required: ${order.quantity}`);
                    inventorySource.quantity = Math.max(0, inventorySource.quantity - order.quantity);
                }

                // Pay the seller
                const payment = order.winningBid.totalBidValue;
                seller.cash += payment;
                seller.revenue += payment;
                seller.monthlyRevenue += payment;
            }

            this.totalRevenue += order.winningBid.totalBidValue;
            this.totalVolume += order.quantity;
        }

        order.status = 'DELIVERED';
        order.deliveredAt = Date.now();
        order.deliveredDay = this.currentDay;

        this.completedOrders.push(order);
        this.stats.totalOrdersDelivered++;

        if (this.completedOrders.length > 3500) {
            this.completedOrders.shift();
        }

        return true;
    }

    sellToGlobalMarket(seller, productIdOrName, quantity) {
        if (!this.config.enabled) {
            return { success: false, reason: 'GLOBAL_MARKET_DISABLED' };
        }

        quantity = Math.floor(quantity);

        if (quantity < this.config.minimumOrderSize) {
            return { success: false, reason: 'BELOW_MINIMUM_ORDER', minimum: this.config.minimumOrderSize };
        }

        const marketPrice = this.getMarketPrice(productIdOrName);
        const sellPrice = marketPrice / this.config.priceMultiplier;
        const totalRevenue = quantity * sellPrice;

        let inventorySource = null;
        if (seller.type === 'MANUFACTURING') {
            inventorySource = seller.finishedGoodsInventory;
        } else if (seller.type === 'MINING' || seller.type === 'LOGGING' || seller.type === 'FARM') {
            inventorySource = seller.inventory;
        }

        if (!inventorySource || inventorySource.quantity < quantity) {
            return {
                success: false,
                reason: 'INSUFFICIENT_INVENTORY',
                available: inventorySource?.quantity || 0
            };
        }

        inventorySource.quantity -= quantity;
        seller.cash += totalRevenue;
        seller.revenue += totalRevenue;
        seller.monthlyRevenue += totalRevenue;

        this.stats.totalSoldToMarket = (this.stats.totalSoldToMarket || 0) + quantity;
        this.stats.totalSalesRevenue = (this.stats.totalSalesRevenue || 0) + totalRevenue;

        const sale = {
            id: `GMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sellerId: seller.id,
            sellerName: seller.name || seller.id,
            productIdOrName: productIdOrName,
            quantity: quantity,
            unitPrice: sellPrice,
            totalRevenue: totalRevenue,
            soldAt: Date.now(),
            status: 'COMPLETED'
        };

        if (!this.completedSales) {
            this.completedSales = [];
        }
        this.completedSales.push(sale);

        if (this.completedSales.length > 100) {
            this.completedSales.shift();
        }

        return {
            success: true,
            sale: sale,
            revenue: totalRevenue
        };
    }

    /**
     * Direct purchase from global market - bypasses bidding system
     * Used when local supply is unavailable and materials are urgently needed
     * Pays a premium (1.5x price multiplier) plus transport costs for expedited delivery
     */
    directPurchase(buyer, productIdOrName, quantity) {
        if (!this.config.enabled) {
            return { success: false, reason: 'GLOBAL_MARKET_DISABLED' };
        }

        quantity = Math.floor(quantity);
        if (quantity < 1) {
            return { success: false, reason: 'INVALID_QUANTITY' };
        }

        // Get product info
        const product = this.productRegistry.getProductByName(productIdOrName) ||
                        this.productRegistry.getProduct(productIdOrName);

        if (!product) {
            return { success: false, reason: 'PRODUCT_NOT_FOUND' };
        }

        // Direct purchase costs 1.5x the normal market price (premium for expedited delivery)
        const basePrice = product.basePrice || 100;
        const directPurchaseMultiplier = this.config.priceMultiplier * 1.5;
        const unitPrice = basePrice * directPurchaseMultiplier;
        const productCost = quantity * unitPrice;

        // Calculate transport cost from global hub to buyer
        let transportCost = 0;
        let transitHours = 1; // Direct purchases are expedited but not instant
        let transportDetails = null;

        if (buyer.city && this.transportationNetwork) {
            const buyerCity = buyer.city;
            const buyerCountry = buyerCity.country;

            if (buyerCountry?.globalMarketHub) {
                const hubCity = {
                    coordinates: { x: buyerCountry.globalMarketHub.x, y: buyerCountry.globalMarketHub.y },
                    hasAirport: buyerCountry.globalMarketHub.hasAirport,
                    hasSeaport: buyerCountry.globalMarketHub.hasSeaport,
                    hasRailway: buyerCountry.globalMarketHub.hasRailway
                };

                // Use 'speed' priority for direct/urgent purchases
                const route = this.transportationNetwork.findOptimalRoute(
                    hubCity, buyerCity, quantity, 'speed'
                );

                if (route.optimalRoute) {
                    transportCost = route.optimalRoute.baseCost || 0;
                    transitHours = Math.max(1, Math.ceil(route.optimalRoute.transitTime?.hours || 1));
                    transportDetails = {
                        distance: route.distance,
                        mode: route.optimalRoute.type,
                        modeName: route.optimalRoute.typeName,
                        fromHub: { x: hubCity.coordinates.x, y: hubCity.coordinates.y },
                        toCity: buyerCity.name
                    };
                }
            }
        }

        const totalCost = productCost + transportCost;

        // Check if buyer can afford (including transport)
        if (buyer.cash < totalCost) {
            return {
                success: false,
                reason: 'INSUFFICIENT_FUNDS',
                required: totalCost,
                available: buyer.cash
            };
        }

        // Deduct payment
        buyer.cash -= totalCost;
        buyer.expenses += totalCost;
        buyer.monthlyExpenses = (buyer.monthlyExpenses || 0) + totalCost;

        // Deliver immediately to buyer's inventory (direct purchases are expedited)
        if (buyer.type === 'MANUFACTURING') {
            if (buyer.rawMaterialInventory && buyer.rawMaterialInventory.has(productIdOrName)) {
                const inventory = buyer.rawMaterialInventory.get(productIdOrName);
                inventory.quantity += quantity;
            } else if (buyer.rawMaterialInventory) {
                // Create inventory slot if it doesn't exist
                buyer.rawMaterialInventory.set(productIdOrName, {
                    quantity: quantity,
                    capacity: quantity * 10,
                    minRequired: quantity
                });
            }
        } else if (buyer.inventory) {
            buyer.inventory.quantity += quantity;
        }

        // Track statistics
        this.stats.directPurchases = (this.stats.directPurchases || 0) + 1;
        this.stats.directPurchaseVolume = (this.stats.directPurchaseVolume || 0) + quantity;
        this.stats.directPurchaseSpend = (this.stats.directPurchaseSpend || 0) + totalCost;

        return {
            success: true,
            quantity: quantity,
            unitPrice: unitPrice,
            productCost: productCost,
            transportCost: transportCost,
            totalCost: totalCost,
            transitHours: transitHours,
            transportDetails: transportDetails,
            productName: product.name
        };
    }

    updateMarketPrices() {
        this.marketPrices.forEach((data, productId) => {
            const fluctuation = (Math.random() - 0.5) * 0.02;
            const newPrice = data.basePrice * this.config.priceMultiplier * (1 + fluctuation);
            data.currentPrice = Math.max(data.basePrice * 1.1, newPrice);
            data.lastUpdated = Date.now();
        });
    }

    updatePriceMultiplier(newMultiplier) {
        this.config.priceMultiplier = newMultiplier;
        this.stats.averageMarkup = newMultiplier;
        this.marketPrices.forEach((data, productId) => {
            data.currentPrice = data.basePrice * newMultiplier;
        });
    }

    // Get orders available for bidding
    getAvailableOrders() {
        return this.availableOrders.filter(o => o.status === 'AVAILABLE');
    }

    // Get orders currently in bidding window
    getBiddingOrders() {
        return this.biddingOrders.filter(o => o.status === 'BIDDING');
    }

    // Get pending deliveries
    getPendingDeliveries() {
        return this.pendingOrders.filter(o => o.status === 'AWARDED');
    }

    getStats() {
        return {
            ...this.stats,
            availableOrders: this.availableOrders.length,
            biddingOrders: this.biddingOrders.length,
            pendingOrders: this.pendingOrders.length,
            completedOrders: this.completedOrders.length,
            totalSoldToMarket: this.stats.totalSoldToMarket || 0,
            totalSalesRevenue: this.stats.totalSalesRevenue || 0,
            config: this.config
        };
    }

    getMarketData() {
        return Array.from(this.marketPrices.values());
    }
}
