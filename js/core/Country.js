// js/core/Country.js
export class Country {
    constructor(config) {
        this.name = config.name;  // Set name first for deterministic ID
        this.id = this.generateId();
        this.continent = config.continent;
        this.economicLevel = config.economicLevel;
        this.resources = config.resources;
        this.specialization = config.specialization;
        
        // Economic parameters
        this.gdp = 0;
        this.population = 0;
        this.inflationRate = 0.02 + Math.random() * 0.03;
        this.unemploymentRate = 0.05 + Math.random() * 0.10;
        this.baseInterestRate = 0.03 + Math.random() * 0.07;
        this.riskPremium = this.calculateRiskPremium();
        this.currency = config.currency || this.name + ' Dollar';
        this.exchangeRate = 1.0; // vs base currency
        
        // Trade policy
        this.tariffs = new Map();
        this.tradeAgreements = new Set();
        this.bannedProducts = new Set();
        this.quotas = new Map();
        
        // Production capabilities
        this.productionCapabilities = new Set(config.specialization);
        this.resourceAvailability = new Map();

        this.cities = [];

        this.initializeTariffs();
        this.initializeResourceAvailability();
    }
    
    generateId() {
        // Use deterministic ID based on country name for stable state persistence
        const nameSlug = this.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return `COUNTRY_${nameSlug}`;
    }
    
    calculateRiskPremium() {
        const riskByLevel = {
            'DEVELOPED': 0.01,
            'EMERGING': 0.03,
            'DEVELOPING': 0.05
        };
        
        return riskByLevel[this.economicLevel] || 0.03;
    }
    
    initializeTariffs() {
        const baseTariffs = {
            'RAW': 0.05,
            'SEMI_RAW': 0.10,
            'MANUFACTURED': 0.15
        };
        
        // Set default tariffs for all product tiers
        Object.entries(baseTariffs).forEach(([tier, rate]) => {
            this.tariffs.set(tier, rate);
        });
    }
    
    initializeResourceAvailability() {
        this.resources.forEach(resource => {
            this.resourceAvailability.set(resource, {
                abundant: true,
                quality: 60 + Math.random() * 40,
                reserves: 1000000 + Math.random() * 9000000
            });
        });
    }
    
    canProduce(productCategory) {
        return this.productionCapabilities.has(productCategory);
    }
    
    hasResource(resourceName) {
        return this.resourceAvailability.has(resourceName);
    }
    
    getTariff(product, originCountry) {
        if (this.tradeAgreements.has(originCountry.id)) {
            return 0;
        }
        
        let baseTariff = this.tariffs.get(product.tier) || 0.10;
        let multiplier = 1.0;
        
        if (this.canProduce(product.category)) {
            multiplier = 1.5;
        }
        
        if (originCountry.continent === this.continent) {
            multiplier *= 0.7;
        }
        
        return baseTariff * multiplier;
    }
    
    checkImportRestrictions(product, quantity) {
        if (this.bannedProducts.has(product.id)) {
            return { allowed: false, reason: 'BANNED' };
        }
        
        if (this.quotas.has(product.id)) {
            const quota = this.quotas.get(product.id);
            if (quota.used + quantity > quota.annual) {
                return { 
                    allowed: false, 
                    reason: 'QUOTA_EXCEEDED',
                    available: quota.annual - quota.used
                };
            }
        }
        
        return { allowed: true };
    }
    
    addCity(city) {
        this.cities.push(city);
        this.population += city.population;
    }

    updateMonthly() {
        // Update economic indicators
        this.inflationRate += (Math.random() - 0.5) * 0.005;
        this.inflationRate = Math.max(0, Math.min(0.15, this.inflationRate));
        
        // Calculate GDP from all cities
        this.gdp = this.cities.reduce((sum, city) => sum + city.totalPurchasingPower, 0);
    }
}

export const FICTIONAL_COUNTRIES = [
    {
        name: 'Valdoria',
        continent: 'NORTHERN',
        economicLevel: 'DEVELOPED',
        resources: ['Coal', 'Iron Ore', 'Softwood Logs'],
        specialization: ['REFINED_METALS', 'ELECTRONICS', 'LUMBER']
    },
    {
        name: 'Thalassia',
        continent: 'SOUTHERN',
        economicLevel: 'DEVELOPED',
        resources: ['Natural Gas', 'Copper Ore', 'Fish'],
        specialization: ['FUELS', 'REFINED_METALS', 'FISHING']
    },
    {
        name: 'Meridian',
        continent: 'EASTERN',
        economicLevel: 'EMERGING',
        resources: ['Cotton', 'Rice', 'Sugarcane'],
        specialization: ['TEXTILES', 'GRAINS', 'FOOD_INGREDIENTS']
    },
    {
        name: 'Aetheria',
        continent: 'WESTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Gold Ore', 'Wheat'],
        specialization: ['ELECTRONICS', 'GRAINS']
    },
    {
        name: 'Novaterra',
        continent: 'CENTRAL',
        economicLevel: 'DEVELOPING',
        resources: ['Coffee Beans', 'Sugarcane'],
        specialization: ['INDUSTRIAL_CROPS', 'FOOD_INGREDIENTS']
    },
    {
        name: 'Crystalia',
        continent: 'NORTHERN',
        economicLevel: 'DEVELOPED',
        resources: ['Gold Ore', 'Silver Ore'],
        specialization: ['REFINED_METALS', 'ELECTRONICS']
    },
    {
        name: 'Verdania',
        continent: 'SOUTHERN',
        economicLevel: 'EMERGING',
        resources: ['Hardwood Logs', 'Cattle', 'Corn'],
        specialization: ['LUMBER', 'LIVESTOCK', 'GRAINS']
    },
    {
        name: 'Solvaris',
        continent: 'EASTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Aluminum Ore', 'Copper Ore'],
        specialization: ['REFINED_METALS', 'ELECTRONICS']
    },
    {
        name: 'Aquilonia',
        continent: 'WESTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Crude Oil', 'Natural Gas', 'Aluminum Ore'],
        specialization: ['FUELS', 'REFINED_METALS']
    },
    {
        name: 'Terranova',
        continent: 'CENTRAL',
        economicLevel: 'DEVELOPING',
        resources: ['Silver Ore', 'Coal'],
        specialization: ['REFINED_METALS', 'MINERALS']
    },
    {
        name: 'Lunaris',
        continent: 'NORTHERN',
        economicLevel: 'EMERGING',
        resources: ['Salt', 'Cattle'],
        specialization: ['MINERALS', 'DAIRY']
    },
    {
        name: 'Solstice',
        continent: 'SOUTHERN',
        economicLevel: 'DEVELOPED',
        resources: ['Wheat', 'Cotton'],
        specialization: ['GRAINS', 'TEXTILES', 'PACKAGED_FOOD']
    },
    {
        name: 'Industria',
        continent: 'EASTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Coal', 'Iron Ore'],
        specialization: ['REFINED_METALS', 'VEHICLES', 'CONSTRUCTION']
    },
    {
        name: 'Agraria',
        continent: 'WESTERN',
        economicLevel: 'EMERGING',
        resources: ['Wheat', 'Cattle'],
        specialization: ['GRAINS', 'LIVESTOCK', 'DAIRY']
    },
    {
        name: 'Technograd',
        continent: 'CENTRAL',
        economicLevel: 'DEVELOPED',
        resources: ['Copper Ore', 'Gold Ore'],
        specialization: ['ELECTRONICS', 'REFINED_METALS']
    },
    {
        name: 'Petrovia',
        continent: 'NORTHERN',
        economicLevel: 'DEVELOPED',
        resources: ['Crude Oil', 'Natural Gas'],
        specialization: ['FUELS', 'ENERGY']
    },
    {
        name: 'Florencia',
        continent: 'SOUTHERN',
        economicLevel: 'EMERGING',
        resources: ['Coffee Beans', 'Sugarcane', 'Cotton'],
        specialization: ['INDUSTRIAL_CROPS', 'FOOD_INGREDIENTS']
    },
    {
        name: 'Mechanica',
        continent: 'EASTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Copper Ore', 'Aluminum Ore', 'Iron Ore'],
        specialization: ['REFINED_METALS', 'VEHICLES']
    },
    {
        name: 'Maritima',
        continent: 'WESTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Salt', 'Chickens', 'Fish'],
        specialization: ['MINERALS', 'LIVESTOCK', 'FISHING']
    },
    {
        name: 'Volcania',
        continent: 'CENTRAL',
        economicLevel: 'EMERGING',
        resources: ['Coal', 'Limestone'],
        specialization: ['MINERALS', 'CONSTRUCTION']
    },
    {
        name: 'Aurelia',
        continent: 'NORTHERN',
        economicLevel: 'DEVELOPED',
        resources: ['Gold Ore'],
        specialization: ['REFINED_METALS', 'PACKAGED_FOOD']
    },
    {
        name: 'Carbonia',
        continent: 'SOUTHERN',
        economicLevel: 'DEVELOPING',
        resources: ['Coal'],
        specialization: ['MINERALS', 'FUELS']
    },
    {
        name: 'Silvermere',
        continent: 'EASTERN',
        economicLevel: 'EMERGING',
        resources: ['Silver Ore', 'Cotton'],
        specialization: ['REFINED_METALS', 'TEXTILES', 'CLOTHING']
    },
    {
        name: 'Greenland Republic',
        continent: 'WESTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Softwood Logs', 'Wheat'],
        specialization: ['LUMBER', 'GRAINS']
    },
    {
        name: 'Ironforge',
        continent: 'CENTRAL',
        economicLevel: 'DEVELOPED',
        resources: ['Iron Ore', 'Coal'],
        specialization: ['REFINED_METALS', 'CONSTRUCTION']
    },
    // Additional countries for economic diversity
    {
        name: 'Pacifica',
        continent: 'WESTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Fish', 'Softwood Logs', 'Aluminum Ore'],
        specialization: ['FISHING', 'LUMBER', 'ELECTRONICS']
    },
    {
        name: 'Borealus',
        continent: 'NORTHERN',
        economicLevel: 'EMERGING',
        resources: ['Softwood Logs', 'Iron Ore', 'Fish'],
        specialization: ['LUMBER', 'REFINED_METALS', 'FISHING']
    },
    {
        name: 'Tropicana',
        continent: 'SOUTHERN',
        economicLevel: 'DEVELOPING',
        resources: ['Sugarcane', 'Fresh Fruits', 'Rubber Latex'],
        specialization: ['FOOD_INGREDIENTS', 'INDUSTRIAL_CROPS']
    },
    {
        name: 'Eastholm',
        continent: 'EASTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Coal', 'Limestone', 'Silica Sand'],
        specialization: ['CONSTRUCTION', 'GLASS', 'MINERALS']
    },
    {
        name: 'Westmark',
        continent: 'WESTERN',
        economicLevel: 'EMERGING',
        resources: ['Cattle', 'Wheat', 'Corn'],
        specialization: ['LIVESTOCK', 'GRAINS', 'PACKAGED_FOOD']
    },
    {
        name: 'Northwind',
        continent: 'NORTHERN',
        economicLevel: 'DEVELOPED',
        resources: ['Natural Gas', 'Fish', 'Hardwood Logs'],
        specialization: ['FUELS', 'FISHING', 'LUMBER']
    },
    {
        name: 'Sunvale',
        continent: 'SOUTHERN',
        economicLevel: 'EMERGING',
        resources: ['Fresh Fruits', 'Vegetables', 'Chickens'],
        specialization: ['FOOD_INGREDIENTS', 'LIVESTOCK']
    },
    {
        name: 'Steelton',
        continent: 'CENTRAL',
        economicLevel: 'DEVELOPED',
        resources: ['Iron Ore', 'Coal', 'Limestone'],
        specialization: ['REFINED_METALS', 'VEHICLES', 'CONSTRUCTION']
    },
    {
        name: 'Copperdale',
        continent: 'EASTERN',
        economicLevel: 'EMERGING',
        resources: ['Copper Ore', 'Silver Ore', 'Salt'],
        specialization: ['REFINED_METALS', 'ELECTRONICS']
    },
    {
        name: 'Grainfields',
        continent: 'WESTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Wheat', 'Corn', 'Soybeans'],
        specialization: ['GRAINS', 'FOOD_INGREDIENTS', 'PACKAGED_FOOD']
    },
    {
        name: 'Timberland',
        continent: 'NORTHERN',
        economicLevel: 'EMERGING',
        resources: ['Hardwood Logs', 'Softwood Logs'],
        specialization: ['LUMBER', 'FURNITURE', 'CONSTRUCTION']
    },
    {
        name: 'Riverbend',
        continent: 'SOUTHERN',
        economicLevel: 'DEVELOPING',
        resources: ['Rice', 'Fish', 'Pigs'],
        specialization: ['GRAINS', 'FISHING', 'LIVESTOCK']
    },
    {
        name: 'Oilsands',
        continent: 'CENTRAL',
        economicLevel: 'DEVELOPED',
        resources: ['Crude Oil', 'Natural Gas', 'Salt'],
        specialization: ['FUELS', 'CHEMICALS', 'ENERGY']
    },
    {
        name: 'Silvania',
        continent: 'EASTERN',
        economicLevel: 'EMERGING',
        resources: ['Hardwood Logs', 'Coffee Beans', 'Rubber Latex'],
        specialization: ['LUMBER', 'INDUSTRIAL_CROPS']
    },
    {
        name: 'Coastalia',
        continent: 'WESTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Fish', 'Salt', 'Natural Gas'],
        specialization: ['FISHING', 'FUELS', 'MINERALS']
    },
    {
        name: 'Mountainheim',
        continent: 'NORTHERN',
        economicLevel: 'DEVELOPED',
        resources: ['Gold Ore', 'Silver Ore', 'Copper Ore'],
        specialization: ['REFINED_METALS', 'ELECTRONICS']
    },
    {
        name: 'Plainsworth',
        continent: 'SOUTHERN',
        economicLevel: 'EMERGING',
        resources: ['Cattle', 'Sheep', 'Wheat'],
        specialization: ['LIVESTOCK', 'TEXTILES', 'GRAINS']
    },
    {
        name: 'Sandoria',
        continent: 'EASTERN',
        economicLevel: 'DEVELOPING',
        resources: ['Silica Sand', 'Crude Oil', 'Salt'],
        specialization: ['GLASS', 'FUELS', 'MINERALS']
    },
    {
        name: 'Greenholm',
        continent: 'CENTRAL',
        economicLevel: 'EMERGING',
        resources: ['Vegetables', 'Pigs', 'Corn'],
        specialization: ['FOOD_INGREDIENTS', 'LIVESTOCK', 'GRAINS']
    },
    {
        name: 'Eastport',
        continent: 'EASTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Fish', 'Aluminum Ore', 'Rice'],
        specialization: ['FISHING', 'REFINED_METALS', 'GRAINS']
    },
    {
        name: 'Westoria',
        continent: 'WESTERN',
        economicLevel: 'DEVELOPING',
        resources: ['Cotton', 'Pigs', 'Sugarcane'],
        specialization: ['TEXTILES', 'LIVESTOCK', 'FOOD_INGREDIENTS']
    },
    {
        name: 'Frostmark',
        continent: 'NORTHERN',
        economicLevel: 'EMERGING',
        resources: ['Iron Ore', 'Softwood Logs', 'Fish'],
        specialization: ['REFINED_METALS', 'LUMBER', 'FISHING']
    },
    {
        name: 'Sunkissed Isles',
        continent: 'SOUTHERN',
        economicLevel: 'DEVELOPING',
        resources: ['Fresh Fruits', 'Fish', 'Sugarcane'],
        specialization: ['FOOD_INGREDIENTS', 'FISHING']
    },
    {
        name: 'Centrallia',
        continent: 'CENTRAL',
        economicLevel: 'DEVELOPED',
        resources: ['Coal', 'Copper Ore', 'Wheat'],
        specialization: ['REFINED_METALS', 'ELECTRONICS', 'GRAINS']
    },
    {
        name: 'Lakeshire',
        continent: 'NORTHERN',
        economicLevel: 'DEVELOPED',
        resources: ['Fish', 'Cattle', 'Hardwood Logs'],
        specialization: ['FISHING', 'DAIRY', 'LUMBER']
    },
    {
        name: 'Southvale',
        continent: 'SOUTHERN',
        economicLevel: 'EMERGING',
        resources: ['Chickens', 'Corn', 'Soybeans'],
        specialization: ['LIVESTOCK', 'GRAINS', 'FOOD_INGREDIENTS']
    },
    {
        name: 'Redstone',
        continent: 'EASTERN',
        economicLevel: 'DEVELOPED',
        resources: ['Iron Ore', 'Aluminum Ore', 'Coal'],
        specialization: ['REFINED_METALS', 'VEHICLES', 'CONSTRUCTION']
    },
    {
        name: 'Goldenfields',
        continent: 'WESTERN',
        economicLevel: 'EMERGING',
        resources: ['Wheat', 'Cattle', 'Corn'],
        specialization: ['GRAINS', 'LIVESTOCK', 'FOOD_INGREDIENTS']
    },
    {
        name: 'Emberfall',
        continent: 'CENTRAL',
        economicLevel: 'DEVELOPING',
        resources: ['Coal', 'Iron Ore', 'Limestone'],
        specialization: ['REFINED_METALS', 'CONSTRUCTION']
    }
];
