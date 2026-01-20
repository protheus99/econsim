// js/simulation/SimulationEngine.js
import { GameClock } from '../core/GameClock.js';
import { CityManager } from '../core/CityManager.js';
import { ProductRegistry } from '../core/Product.js';
import { Country, FICTIONAL_COUNTRIES } from '../core/Country.js';
import { MiningCompany } from '../core/firms/MiningCompany.js';
import { LoggingCompany } from '../core/firms/LoggingCompany.js';
import { Farm } from '../core/firms/Farm.js';
import { ManufacturingPlant } from '../core/firms/ManufacturingPlant.js';
import { RetailStore } from '../core/firms/RetailStore.js';
import { Bank } from '../core/firms/Bank.js';

export class SimulationEngine {
    constructor() {
        this.clock = new GameClock();
        this.productRegistry = new ProductRegistry();
        this.countries = new Map();
        this.cityManager = null;
        this.firms = new Map();
        this.corporations = [];
        this.events = [];
        this.marketHistory = [];
        this.speed = 1;
        this.isInitialized = false;

        this.hourlyInterval = null;
        this.dailyTick = 0;
        this.monthlyTick = 0;
        this.yearlyTick = 0;
        
        // Statistics
        this.stats = {
            totalPopulation: 0,
            totalGDP: 0,
            totalEmployed: 0,
            totalFirms: 0,
            totalProducts: 0,
            avgSalaryLevel: 0
        };
    }

    initialize() {
        console.log('🚀 Initializing Enhanced Simulation Engine...');

        // Initialize countries first
        this.initializeCountries();

        // Initialize city manager with countries
        this.cityManager = new CityManager(this.countries);
        this.cities = this.cityManager.generateInitialCities(8);

        // Generate corporations
        this.corporations = this.generateCorporations();

        // Generate firms (mining, logging, farms, manufacturing, retail, banks)
        this.generateFirms();

        // Setup intervals
        this.setupIntervals();

        this.isInitialized = true;

        console.log('✅ Enhanced Simulation initialized with:');
        console.log(`   - ${this.countries.size} countries`);
        console.log(`   - ${this.cities.length} cities`);
        console.log(`   - ${this.cityManager.getTotalPopulation().toLocaleString()} total population`);
        console.log(`   - ${this.firms.size} firms operating`);
        console.log(`   - ${this.productRegistry.getAllProducts().length} products available`);

        this.addEvent('success', 'Simulation Started', 'Enhanced economic simulation initialized successfully');
    }

    initializeCountries() {
        FICTIONAL_COUNTRIES.forEach(config => {
            const country = new Country(config);
            this.countries.set(country.id, country);
        });

        // Establish some trade agreements
        this.establishTradeAgreements();

        console.log(`✅ Initialized ${this.countries.size} countries`);
    }

    establishTradeAgreements() {
        const countries = Array.from(this.countries.values());
        
        // Continental trade agreements
        const continents = {};
        countries.forEach(country => {
            if (!continents[country.continent]) {
                continents[country.continent] = [];
            }
            continents[country.continent].push(country);
        });

        // Countries on same continent have trade agreements
        Object.values(continents).forEach(continentCountries => {
            continentCountries.forEach(c1 => {
                continentCountries.forEach(c2 => {
                    if (c1.id !== c2.id) {
                        c1.tradeAgreements.add(c2.id);
                    }
                });
            });
        });
    }

    generateCorporations() {
        const names = ['TechCorp', 'MegaRetail', 'IndustrialGiant', 'FoodCo', 'AutoMakers', 'PharmaTech'];
        const characters = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE', 'VERY_AGGRESSIVE'];

        return names.map((name, i) => ({
            id: i + 1,
            name: name,
            character: characters[Math.floor(Math.random() * characters.length)],
            cash: 10000000 + Math.random() * 20000000,
            revenue: 0,
            profit: 0,
            monthlyRevenue: 0,
            monthlyProfit: 0,
            employees: 0,
            facilities: [],
            color: `hsl(${i * 60}, 70%, 60%)`
        }));
    }

    generateFirms() {
        const countries = Array.from(this.countries.values());
        
        // Generate 2-3 firms per city
        this.cities.forEach(city => {
            const country = countries.find(c => c.cities.includes(city));
            const numFirms = 2 + Math.floor(Math.random() * 2);
            
            for (let i = 0; i < numFirms; i++) {
                this.generateRandomFirm(city, country);
            }
        });

        console.log(`✅ Generated ${this.firms.size} firms`);
    }

    generateRandomFirm(city, country) {
        const firmTypes = ['MINING', 'LOGGING', 'FARM', 'MANUFACTURING', 'RETAIL', 'BANK'];
        const weights = [0.15, 0.10, 0.20, 0.25, 0.20, 0.10]; // Probability weights
        
        const type = this.weightedRandomChoice(firmTypes, weights);
        let firm = null;

        try {
            switch (type) {
                case 'MINING':
                    if (country.resources.length > 0) {
                        const resource = country.resources[Math.floor(Math.random() * country.resources.length)];
                        firm = new MiningCompany({ city: city }, country, resource);
                    }
                    break;

                case 'LOGGING':
                    const timberTypes = ['Softwood Logs', 'Hardwood Logs', 'Bamboo'];
                    const timberType = timberTypes[Math.floor(Math.random() * timberTypes.length)];
                    firm = new LoggingCompany({ city: city }, country, timberType);
                    break;

                case 'FARM':
                    const farmType = Math.random() < 0.6 ? 'CROP' : 'LIVESTOCK';
                    firm = new Farm({ city: city }, country, farmType);
                    break;

                case 'MANUFACTURING':
                    const manufacturedProducts = this.productRegistry.getProductsByTier('MANUFACTURED');
                    if (manufacturedProducts.length > 0) {
                        const product = manufacturedProducts[Math.floor(Math.random() * manufacturedProducts.length)];
                        firm = new ManufacturingPlant({ city: city }, country, product.id, this.productRegistry);
                    }
                    break;

                case 'RETAIL':
                    const storeTypes = ['SUPERMARKET', 'DEPARTMENT', 'ELECTRONICS', 'FURNITURE'];
                    const storeType = storeTypes[Math.floor(Math.random() * storeTypes.length)];
                    firm = new RetailStore({ city: city }, country, storeType);
                    break;

                case 'BANK':
                    const bankTypes = ['COMMERCIAL', 'INVESTMENT'];
                    const bankType = bankTypes[Math.floor(Math.random() * bankTypes.length)];
                    firm = new Bank({ city: city }, country, bankType);
                    break;
            }

            if (firm) {
                this.firms.set(firm.id, firm);
                
                // Add employment to city
                city.addEmployment(firm.totalEmployees, firm.calculateLaborCosts() / firm.totalEmployees);
            }
        } catch (error) {
            console.error(`Error creating ${type} firm:`, error);
        }
    }

    weightedRandomChoice(items, weights) {
        const total = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * total;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }
        
        return items[0];
    }

    setupIntervals() {
        this.hourlyInterval = setInterval(() => {
            if (!this.clock.isPaused) {
                for (let i = 0; i < this.speed; i++) {
                    this.clock.tick();
                    this.updateHourly();
                }
            }
            this.emit('update');
        }, 1000);
    }

    updateHourly() {
        this.dailyTick++;
        if (this.dailyTick >= 24) {
            this.dailyTick = 0;
            this.updateDaily();
        }

        // Process hourly operations for all firms
        this.processFirmOperations();
        
        // Update market history
        this.updateMarketHistory();
        
        // Update statistics
        this.updateStatistics();
    }

    processFirmOperations() {
        this.firms.forEach(firm => {
            try {
                // Each firm produces/operates hourly
                const result = firm.produceHourly();
                
                if (result && result.produced !== false) {
                    // Track production
                    if (result.resource || result.product) {
                        const productName = result.resource || result.product;
                        // Could update product registry with production data
                    }
                }
            } catch (error) {
                console.error(`Error processing firm ${firm.id}:`, error);
            }
        });
    }

    updateMarketHistory() {
        // Track total economic activity
        let totalTransactions = 0;
        let totalValue = 0;

        this.firms.forEach(firm => {
            totalTransactions += firm.monthlyRevenue / 10000 || 0;
            totalValue += firm.revenue || 0;
        });

        this.marketHistory.push({
            hour: this.clock.hour,
            transactions: totalTransactions,
            value: totalValue
        });

        if (this.marketHistory.length > 24) {
            this.marketHistory.shift();
        }
    }

    updateStatistics() {
        this.stats.totalPopulation = this.cityManager.getTotalPopulation();
        this.stats.totalGDP = this.cityManager.getTotalPurchasingPower();
        this.stats.totalEmployed = this.cityManager.getTotalEmployed();
        this.stats.avgSalaryLevel = this.cityManager.getAverageSalaryLevel();
        this.stats.totalFirms = this.firms.size;
        this.stats.totalProducts = this.productRegistry.getAllProducts().length;
    }

    updateDaily() {
        this.monthlyTick++;
        if (this.monthlyTick >= 30) {
            this.monthlyTick = 0;
            this.updateMonthly();
        }

        if (Math.random() < 0.05) {
            this.generateRandomEvent();
        }
    }

    updateMonthly() {
        console.log(`📅 Month ${this.clock.month}, Year ${this.clock.year}`);

        // Update all cities
        this.cityManager.updateAllCities('monthly', this.clock.getGameTime());

        // Update all countries
        this.countries.forEach(country => {
            country.updateMonthly();
        });

        // Update all firms
        this.firms.forEach(firm => {
            try {
                firm.updateMonthly();
                
                // Update corporation stats
                const corp = this.corporations.find(c => c.id === (firm.corporationId || 1));
                if (corp) {
                    corp.employees += firm.totalEmployees;
                    corp.revenue += firm.monthlyRevenue;
                    corp.profit += firm.monthlyProfit;
                }
            } catch (error) {
                console.error(`Error updating firm ${firm.id}:`, error);
            }
        });

        // Generate monthly reports
        this.generateMonthlyReport();

        // Check for yearly update
        this.yearlyTick++;
        if (this.yearlyTick >= 12) {
            this.yearlyTick = 0;
            this.updateYearly();
        }
    }

    generateMonthlyReport() {
        const totalRevenue = Array.from(this.firms.values())
            .reduce((sum, firm) => sum + firm.monthlyRevenue, 0);
        
        const totalProfit = Array.from(this.firms.values())
            .reduce((sum, firm) => sum + firm.monthlyProfit, 0);

        this.addEvent('info', 'Monthly Report', 
            `Total Revenue: ${this.formatMoney(totalRevenue)}, Total Profit: ${this.formatMoney(totalProfit)}`);

        // Reset corporation monthly stats
        this.corporations.forEach(corp => {
            corp.employees = 0;
            corp.revenue = 0;
            corp.profit = 0;
        });
    }

    updateYearly() {
        console.log(`🎆 Year ${this.clock.year} complete`);

        // Update cities
        this.cityManager.updateAllCities('yearly', this.clock.getGameTime());

        // Update countries
        this.countries.forEach(country => {
            country.updateMonthly(); // Countries use monthly update
        });

        this.addEvent('success', 'Annual Report', 
            `Year ${this.clock.year} complete - GDP: ${this.formatMoney(this.stats.totalGDP)}`);
    }

    generateRandomEvent() {
        const events = [
            { type: 'info', title: 'Market Update', message: 'Trading volume increased across all markets' },
            { type: 'success', title: 'Economic Growth', message: 'GDP growth exceeded expectations this quarter' },
            { type: 'warning', title: 'Supply Chain', message: 'Minor disruptions reported in logistics networks' },
            { type: 'info', title: 'New Technology', message: 'Manufacturing efficiency improvements announced' }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        this.addEvent(event.type, event.title, event.message);
    }

    addEvent(type, title, message) {
        this.events.unshift({
            type,
            title,
            message,
            time: this.clock.getFormatted()
        });
        if (this.events.length > 50) this.events.pop();
    }

    formatMoney(value) {
        if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
        if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
        return `$${Math.round(value).toLocaleString()}`;
    }

    pause() {
        this.clock.pause();
        this.addEvent('warning', 'Simulation Paused', 'Game time has been paused');
    }

    resume() {
        this.clock.resume();
        this.addEvent('info', 'Simulation Resumed', 'Game time is running');
    }

    setSpeed(multiplier) {
        this.speed = multiplier;
        this.addEvent('info', 'Speed Changed', `Simulation speed set to ${multiplier}x`);
    }

    emit(event) {
        window.dispatchEvent(new CustomEvent(`simulation-${event}`, {
            detail: this.getState()
        }));
    }

    getState() {
        return {
            clock: this.clock.getGameTime(),
            elapsed: this.clock.getElapsed(),
            countries: Array.from(this.countries.values()),
            cities: this.cities,
            firms: Array.from(this.firms.values()).slice(0, 20), // First 20 for performance
            corporations: this.corporations,
            products: this.productRegistry.getAllProducts(),
            events: this.events,
            marketHistory: this.marketHistory,
            stats: this.stats
        };
    }

    // Helper methods for UI
    getFirmsByType(type) {
        return Array.from(this.firms.values()).filter(f => f.type === type);
    }

    getProductsByTier(tier) {
        return this.productRegistry.getProductsByTier(tier);
    }

    getCountryById(id) {
        return this.countries.get(id);
    }

    destroy() {
        if (this.hourlyInterval) {
            clearInterval(this.hourlyInterval);
        }
    }
}
