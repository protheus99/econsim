// js/simulation/SimulationEngine.js
import { GameClock } from '../core/GameClock.js';
import { CityManager } from '../core/CityManager.js';

export class SimulationEngine {
    constructor() {
        this.clock = new GameClock();
        this.cityManager = new CityManager();
        this.corporations = [];
        this.products = [];
        this.events = [];
        this.marketHistory = [];
        this.speed = 1;
        this.isInitialized = false;

        this.hourlyInterval = null;
        this.dailyTick = 0;
        this.monthlyTick = 0;
        this.yearlyTick = 0;
    }

    initialize() {
        console.log('🚀 Initializing Simulation Engine...');

        // Generate cities
        this.cities = this.cityManager.generateInitialCities(8);

        // Generate corporations
        this.corporations = this.generateCorporations();

        // Generate products
        this.products = this.generateProducts();

        // Setup intervals
        this.setupIntervals();

        this.isInitialized = true;

        console.log('✅ Simulation initialized with:');
        console.log(`   - ${this.cities.length} cities`);
        console.log(`   - ${this.cityManager.getTotalPopulation().toLocaleString()} total population`);
        console.log(`   - $${(this.cityManager.getTotalPurchasingPower() / 1e9).toFixed(2)}B total purchasing power`);

        this.addEvent('success', 'Simulation Started', 'Economic simulation initialized successfully');
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
            employees: Math.floor(100 + Math.random() * 900),
            facilities: [],
            color: `hsl(${i * 60}, 70%, 60%)`
        }));
    }

    generateProducts() {
        const productData = [
            {
                name: 'Computers',
                icon: '💻',
                basePrice: 1200,
                category: 'ELECTRONICS',
                weight: 1.2,
                necessityIndex: 0.6
            },
            {
                name: 'Smartphones',
                icon: '📱',
                basePrice: 800,
                category: 'ELECTRONICS',
                weight: 0.5,
                necessityIndex: 0.7
            },
            {
                name: 'Clothing',
                icon: '👔',
                basePrice: 50,
                category: 'APPAREL',
                weight: 0.8,
                necessityIndex: 0.8
            },
            {
                name: 'Furniture',
                icon: '🪑',
                basePrice: 500,
                category: 'HOME',
                weight: 3.5,
                necessityIndex: 0.5
            },
            {
                name: 'Food',
                icon: '🍔',
                basePrice: 10,
                category: 'FOOD',
                weight: 1.0,
                necessityIndex: 1.0
            },
            {
                name: 'Automobiles',
                icon: '🚗',
                basePrice: 25000,
                category: 'AUTOMOTIVE',
                weight: 8.0,
                necessityIndex: 0.6
            },
            {
                name: 'Medicine',
                icon: '💊',
                basePrice: 30,
                category: 'PHARMA',
                weight: 0.3,
                necessityIndex: 0.9
            },
            {
                name: 'Books',
                icon: '📚',
                basePrice: 20,
                category: 'MEDIA',
                weight: 0.6,
                necessityIndex: 0.4
            }
        ];

        return productData.map((p, i) => ({
            ...p,
            id: i + 1,
            price: p.basePrice * (0.8 + Math.random() * 0.4),
            demand: 50 + Math.random() * 50,
            supply: 50 + Math.random() * 50,
            quality: 50 + Math.random() * 50,
            brandRating: 30 + Math.random() * 40,
            sales: 0,
            hourlySales: 0
        }));
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

        // Process hourly operations
        this.processProductSales();
        this.processCorporationRevenue();
        this.updateMarketHistory();
    }

    processProductSales() {
        this.products.forEach(p => {
            const hourMod = this.getHourlyDemandModifier(this.clock.hour, p.category);
            p.demand = Math.max(20, Math.min(100, p.demand + (Math.random() - 0.5) * 5 * hourMod));
            p.supply = Math.max(20, Math.min(100, p.supply + (Math.random() - 0.5) * 3));

            const ratio = p.demand / p.supply;
            if (ratio > 1.2) p.price *= 1.001;
            if (ratio < 0.8) p.price *= 0.999;

            const hourlySales = Math.floor(Math.min(p.demand, p.supply) * (Math.random() * 0.5 + 0.5));
            p.hourlySales = hourlySales;
            p.sales += hourlySales;
        });
    }

    processCorporationRevenue() {
        this.corporations.forEach(corp => {
            const hourlyRevenue = Math.random() * 100000 * (corp.employees / 500);
            corp.revenue += hourlyRevenue;
            corp.monthlyRevenue += hourlyRevenue;

            const transportCost = hourlyRevenue * 0.05;
            const hourlyProfit = (hourlyRevenue - transportCost) * (0.05 + Math.random() * 0.15);
            corp.profit += hourlyProfit;
            corp.monthlyProfit += hourlyProfit;
        });
    }

    updateMarketHistory() {
        const totalSales = this.products.reduce((sum, p) => sum + p.hourlySales, 0);
        this.marketHistory.push({
            hour: this.clock.hour,
            sales: totalSales
        });
        if (this.marketHistory.length > 24) this.marketHistory.shift();
    }

    getHourlyDemandModifier(hour, category) {
        const patterns = {
            FOOD: [0.3, 0.2, 0.1, 0.1, 0.1, 0.3, 1.5, 2.0, 1.0, 0.8, 0.9, 1.5, 2.2, 2.0, 1.0, 0.8, 0.9, 1.5, 2.5, 2.3, 1.5, 1.0, 0.7, 0.4],
            ELECTRONICS: [0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.5, 0.8, 1.0, 1.5, 2.0, 2.0, 1.8, 1.9, 2.0, 2.0, 1.8, 1.5, 1.3, 1.0, 0.8, 0.5, 0.3, 0.2],
            DEFAULT: Array(24).fill(1.0)
        };
        return (patterns[category] || patterns.DEFAULT)[hour];
    }

    updateDaily() {
        this.monthlyTick++;
        if (this.monthlyTick >= 30) {
            this.monthlyTick = 0;
            this.updateMonthly();
        }

        if (Math.random() < 0.1) {
            this.addEvent('info', 'Market Update', 'Daily trading volume reached new high');
        }
    }

    updateMonthly() {
        console.log(`📅 Month ${this.clock.month}, Year ${this.clock.year}`);

        // Update cities
        this.cityManager.updateAllCities('monthly', this.clock.getGameTime());

        // Corporation reports
        this.corporations.forEach(corp => {
            if (corp.monthlyProfit > 1000000) {
                this.addEvent('success', `${corp.name}`, `Monthly profit: ${this.formatMoney(corp.monthlyProfit)}`);
            }
            corp.monthlyRevenue = 0;
            corp.monthlyProfit = 0;
        });

        // Reset product sales
        this.products.forEach(p => p.sales = 0);

        this.yearlyTick++;
        if (this.yearlyTick >= 12) {
            this.yearlyTick = 0;
            this.updateYearly();
        }

        this.addEvent('info', 'Monthly Report', `Month ${this.clock.month} complete - Total Population: ${this.cityManager.getTotalPopulation().toLocaleString()}`);
    }

    updateYearly() {
        console.log(`🎆 Year ${this.clock.year} complete`);
        this.cityManager.updateAllCities('yearly', this.clock.getGameTime());
        this.addEvent('success', 'Annual Report', `Year ${this.clock.year} complete - GDP: ${this.formatMoney(this.cityManager.getTotalPurchasingPower())}`);
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
            cities: this.cities,
            corporations: this.corporations,
            products: this.products,
            events: this.events,
            marketHistory: this.marketHistory,
            stats: {
                totalPopulation: this.cityManager.getTotalPopulation(),
                totalGDP: this.cityManager.getTotalPurchasingPower(),
                totalEmployed: this.cityManager.getTotalEmployed(),
                avgSalaryLevel: this.cityManager.getAverageSalaryLevel()
            }
        };
    }

    destroy() {
        if (this.hourlyInterval) {
            clearInterval(this.hourlyInterval);
        }
    }
}
