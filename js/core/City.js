// js/core/City.js (Updated)
export class City {
    constructor(name, population, salaryLevel = 0.5, country, config = {}) {
        this.id = this.generateId();
        this.name = name;
        this.config = config;
        this.population = this.validatePopulation(population);

        // Salary level bounds from config
        const salaryBounds = config.cities?.salaryLevel ?? { min: 0.1, max: 1.0 };
        this.salaryLevel = Math.max(salaryBounds.min, Math.min(salaryBounds.max, salaryLevel));
        this.country = country; // Reference to Country object

        // Economic structure
        this.demographics = this.calculateDemographics();
        this.economicClasses = this.calculateEconomicClasses();
        this.totalPurchasingPower = this.calculateTotalPurchasingPower();
        this.unemploymentRate = 0.15;

        // Market factors
        this.costOfLiving = country ? country.economicLevel === 'DEVELOPED' ? 1.2 :
                           country.economicLevel === 'EMERGING' ? 1.0 : 0.8 : 1.0;
        this.marketSize = this.calculateMarketSize();
        this.consumerConfidence = 0.7;

        // Location and infrastructure (thresholds from config)
        const infraConfig = config.cities?.infrastructure ?? {};
        this.coordinates = { x: 0, y: 0 };
        this.climate = 'TEMPERATE';
        this.isCoastal = false;
        this.hasAirport = this.population > (infraConfig.airportThreshold ?? 500000);
        this.hasSeaport = false;
        this.hasRailway = this.population > (infraConfig.railwayThreshold ?? 250000);
        this.infrastructureQuality = 0.5 + (Math.random() * 0.5);

        // Industry presence
        this.industries = new Map();
        this.localCompetitors = this.generateLocalCompetitors();
        this.firms = []; // Firms operating in this city

        // Statistics tracking
        this.monthlyStats = {
            totalSales: 0,
            avgProductPrice: 0,
            employmentChange: 0,
            populationGrowth: 0
        };
    }

    generateId() {
        return `CITY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    validatePopulation(pop) {
        const minPop = this.config?.cities?.minPopulation ?? 250000;
        const maxPop = this.config?.cities?.maxPopulation ?? 5000000;
        return Math.max(minPop, Math.min(maxPop, pop));
    }

    calculateDemographics() {
        const demographicsConfig = this.config?.cities?.demographics ?? {};
        const NON_WORKING_PERCENT = demographicsConfig.nonWorkingPercentage ?? 0.30;
        const EMPLOYED_PERCENT = demographicsConfig.employmentRate ?? 0.85;

        const workingAgePop = Math.floor(this.population * (1 - NON_WORKING_PERCENT));
        const employedPop = Math.floor(workingAgePop * EMPLOYED_PERCENT);
        const unemployedPop = workingAgePop - employedPop;
        const nonWorkingPop = this.population - workingAgePop;

        return {
            total: this.population,
            nonWorking: nonWorkingPop,
            workingAge: workingAgePop,
            employed: employedPop,
            unemployed: unemployedPop,
            nonWorkingPercent: NON_WORKING_PERCENT,
            employedPercent: EMPLOYED_PERCENT
        };
    }
    
    calculateEconomicClasses() {
        const employed = this.demographics.employed;
        
        const CLASS_DISTRIBUTION = {
            lower: 0.25,
            working: 0.35,
            lowerMiddle: 0.25,
            upperMiddle: 0.14,
            upper: 0.01,
            rich: 0.0005
        };
        
        const SALARY_RANGES = {
            lower: { min: 20000, max: 35000 },
            working: { min: 35000, max: 55000 },
            lowerMiddle: { min: 55000, max: 110000 },
            upperMiddle: { min: 110000, max: 375000 },
            upper: { min: 375000, max: 1500000 },
            rich: { min: 1500000, max: 5000000 }
        };
        
        const classes = {};
        
        for (const [className, percentage] of Object.entries(CLASS_DISTRIBUTION)) {
            const count = Math.floor(employed * percentage);
            const range = SALARY_RANGES[className];
            const avgSalary = this.calculateClassAverageSalary(range.min, range.max);
            
            classes[className] = {
                name: className,
                count: count,
                percentage: percentage * 100,
                salaryRange: range,
                avgSalary: avgSalary,
                totalIncome: count * avgSalary,
                disposableIncome: this.calculateDisposableIncome(avgSalary, className)
            };
        }
        
        return classes;
    }
    
    calculateClassAverageSalary(minSalary, maxSalary) {
        return Math.round(minSalary + ((maxSalary - minSalary) * this.salaryLevel));
    }
    
    calculateDisposableIncome(salary, className) {
        const disposableRates = {
            lower: 0.15,
            working: 0.25,
            lowerMiddle: 0.35,
            upperMiddle: 0.45,
            upper: 0.55,
            rich: 0.65
        };
        
        return Math.round(salary * disposableRates[className]);
    }
    
    calculateTotalPurchasingPower() {
        let total = 0;
        for (const classData of Object.values(this.economicClasses)) {
            total += classData.count * classData.disposableIncome;
        }
        return total;
    }
    
    calculateMarketSize() {
        return {
            total: this.totalPurchasingPower,
            perCapita: this.totalPurchasingPower / this.population,
            daily: this.totalPurchasingPower / 365,
            hourly: this.totalPurchasingPower / 365 / 24
        };
    }
    
    generateLocalCompetitors() {
        const competitorCount = Math.floor(Math.log10(this.population) * 2);
        const competitors = [];
        
        for (let i = 0; i < competitorCount; i++) {
            competitors.push({
                id: `LOCAL_${this.id}_${i}`,
                name: `Local Business ${i + 1}`,
                marketShare: Math.random() * 0.15,
                avgPrice: 1.0,
                avgQuality: 40 + Math.random() * 30,
                avgBrand: 20 + Math.random() * 40
            });
        }
        
        return competitors;
    }
    
    addEmployment(count, avgSalary) {
        const currentUnemployed = this.demographics.unemployed;
        const hired = Math.min(count, currentUnemployed);
        
        this.demographics.unemployed -= hired;
        this.demographics.employed += hired;
        
        const className = this.determineClassFromSalary(avgSalary);
        if (this.economicClasses[className]) {
            this.economicClasses[className].count += hired;
            this.totalPurchasingPower = this.calculateTotalPurchasingPower();
        }
        
        return hired;
    }
    
    removeEmployment(count) {
        this.demographics.employed -= count;
        this.demographics.unemployed += count;
        this.totalPurchasingPower = this.calculateTotalPurchasingPower();
    }
    
    determineClassFromSalary(salary) {
        if (salary < 35000) return 'lower';
        if (salary < 55000) return 'working';
        if (salary < 110000) return 'lowerMiddle';
        if (salary < 375000) return 'upperMiddle';
        if (salary < 1500000) return 'upper';
        return 'rich';
    }
    
    updateMonthly(gameTime) {
        // Get growth rate from config
        const growthConfig = this.config?.cities?.populationGrowthRate ?? { min: 0.001, max: 0.003 };
        const growthRange = growthConfig.max - growthConfig.min;
        const growthRate = growthConfig.min + (Math.random() * growthRange);

        this.population = Math.floor(this.population * (1 + growthRate));

        // Clamp to max population from config
        const maxPop = this.config?.cities?.maxPopulation ?? 5000000;
        this.population = Math.min(maxPop, this.population);

        this.monthlyStats.populationGrowth = growthRate;
        this.demographics = this.calculateDemographics();
        this.economicClasses = this.calculateEconomicClasses();
        this.totalPurchasingPower = this.calculateTotalPurchasingPower();

        this.consumerConfidence += (Math.random() - 0.5) * 0.1;
        this.consumerConfidence = Math.max(0.3, Math.min(1.0, this.consumerConfidence));

        this.marketSize = this.calculateMarketSize();
        this.monthlyStats.totalSales = 0;
    }
    
    updateYearly(gameTime) {
        const economicChange = (Math.random() - 0.45) * 0.05;
        this.salaryLevel += economicChange;
        this.salaryLevel = Math.max(0.1, Math.min(1.0, this.salaryLevel));
        this.costOfLiving *= 1.02 + (Math.random() * 0.02);
    }
    
    formatCurrency(amount) {
        if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
        if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
        if (amount >= 1e3) return `$${(amount / 1e3).toFixed(2)}K`;
        return `$${amount.toFixed(2)}`;
    }
}
