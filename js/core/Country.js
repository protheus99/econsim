// js/core/Country.js
export class Country {
    constructor(config) {
        this.id = this.generateId();
        this.name = config.name;
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
        return `COUNTRY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        resources: ['Natural Gas', 'Copper Ore'],
        specialization: ['FUELS', 'REFINED_METALS']
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
        resources: ['Salt', 'Raw Milk'],
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
        resources: ['Wheat', 'Cattle', 'Raw Milk'],
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
        resources: ['Salt', 'Chickens'],
        specialization: ['MINERALS', 'LIVESTOCK']
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
    }
];
