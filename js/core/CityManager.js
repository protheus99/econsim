// js/core/CityManager.js
import { City } from './City.js';
import { TransportationNetwork } from './TransportationNetwork.js';
import { CityNameGenerator } from '../data/CityNames.js';

export class CityManager {
    constructor(countries, config = {}) {
        this.cities = new Map();
        this.countries = countries;
        this.config = config;
        this.transportation = new TransportationNetwork();
        this.cityNameGenerator = new CityNameGenerator(countries);

        // Initialize global market hubs for each country
        this.initializeGlobalMarketHubs();
    }

    initializeGlobalMarketHubs() {
        const countriesArray = Array.from(this.countries.values());
        countriesArray.forEach((country, index) => {
            country.setGlobalMarketHub(index);
        });
    }

    generateInitialCities(count = null) {
        // Use config value if count not specified
        const configCityCount = count ?? this.config.cities?.initial ?? 8;
        const minCitiesPerCountry = this.config.cities?.minPerCountry ?? 3;
        const countriesArray = Array.from(this.countries.values());

        // Ensure minimum cities per country
        const minTotalCities = countriesArray.length * minCitiesPerCountry;
        const cityCount = Math.max(configCityCount, minTotalCities);

        // First pass: Give each country the minimum number of cities
        for (const country of countriesArray) {
            for (let i = 0; i < minCitiesPerCountry; i++) {
                const city = this.generateCityForCountry(country);
                this.cities.set(city.id, city);
                country.addCity(city);
            }
        }

        // Second pass: Distribute remaining cities round-robin
        const remainingCities = cityCount - minTotalCities;
        for (let i = 0; i < remainingCities; i++) {
            const country = countriesArray[i % countriesArray.length];
            const city = this.generateCityForCountry(country);
            this.cities.set(city.id, city);
            country.addCity(city);
        }

        // Designate some coastal cities
        this.designateCoastalCities();

        console.log(`✅ Generated ${this.cities.size} cities across ${countriesArray.length} countries (min ${minCitiesPerCountry} per country)`);

        return Array.from(this.cities.values());
    }

    generateCityForCountry(country) {
        const name = this.cityNameGenerator.getNameForCountry(country);

        // Get population range from config
        const minPop = this.config.cities?.minPopulation ?? 250000;
        const maxPop = this.config.cities?.maxPopulation ?? 5000000;
        const popRange = maxPop - minPop;

        // Population distribution using config ranges
        const rand = Math.random();
        let population;

        if (rand < 0.4) {
            // Small: minPop to minPop + 10% of range
            population = minPop + Math.random() * (popRange * 0.1);
        } else if (rand < 0.7) {
            // Medium: 10% to 35% of range
            population = minPop + (popRange * 0.1) + Math.random() * (popRange * 0.25);
        } else if (rand < 0.9) {
            // Large: 35% to 65% of range
            population = minPop + (popRange * 0.35) + Math.random() * (popRange * 0.30);
        } else {
            // Major: 65% to 100% of range
            population = minPop + (popRange * 0.65) + Math.random() * (popRange * 0.35);
        }

        // Salary level influenced by country economic level
        const salaryConfig = this.config.cities?.salaryLevel ?? { min: 0.1, max: 1.0, default: 0.5 };
        let baseSalaryLevel = salaryConfig.default;

        if (country.economicLevel === 'DEVELOPED') {
            baseSalaryLevel = 0.6 + Math.random() * 0.3; // 0.6-0.9
        } else if (country.economicLevel === 'EMERGING') {
            baseSalaryLevel = 0.4 + Math.random() * 0.3; // 0.4-0.7
        } else {
            baseSalaryLevel = 0.3 + Math.random() * 0.3; // 0.3-0.6
        }

        // Clamp salary level to config bounds
        baseSalaryLevel = Math.max(salaryConfig.min, Math.min(salaryConfig.max, baseSalaryLevel));

        const city = new City(name, Math.floor(population), baseSalaryLevel, country, this.config);

        // Random location on country's territory
        // Each country gets a region of the map
        const countryIndex = Array.from(this.countries.values()).indexOf(country);
        const regionX = (countryIndex % 5) * 200;
        const regionY = Math.floor(countryIndex / 5) * 200;

        city.coordinates = {
            x: regionX + Math.random() * 200,
            y: regionY + Math.random() * 200
        };

        // Climate based on coordinates
        if (city.coordinates.y < 200) {
            city.climate = 'COLD';
        } else if (city.coordinates.y > 800) {
            city.climate = 'TROPICAL';
        } else {
            city.climate = 'TEMPERATE';
        }

        return city;
    }

    designateCoastalCities() {
        const cities = Array.from(this.cities.values());

        cities.forEach(city => {
            const isNearEdge =
                city.coordinates.x < 100 ||
                city.coordinates.x > 900 ||
                city.coordinates.y < 100 ||
                city.coordinates.y > 900;

            if (isNearEdge) {
                city.isCoastal = true;
                city.hasSeaport = city.population > 500000;
            }
        });
    }

    getCityById(id) {
        return this.cities.get(id);
    }

    getAllCities() {
        return Array.from(this.cities.values());
    }

    getCitiesByCountry(countryId) {
        return this.getAllCities().filter(city => city.country.id === countryId);
    }

    calculateShippingCost(originCityId, destinationCityId, cargoUnits, priority = 'cost') {
        const origin = this.cities.get(originCityId);
        const destination = this.cities.get(destinationCityId);

        if (!origin || !destination) {
            return { error: 'City not found' };
        }

        const route = this.transportation.findOptimalRoute(origin, destination, cargoUnits, priority);

        // Add tariff if crossing borders
        if (origin.country.id !== destination.country.id) {
            const tariffRate = destination.country.getTariff(
                { tier: 'MANUFACTURED', category: 'GENERAL' },
                origin.country
            );
            
            if (route.optimalRoute) {
                const tariffCost = route.optimalRoute.baseCost * tariffRate;
                route.optimalRoute.tariff = tariffCost;
                route.optimalRoute.baseCost += tariffCost;
                route.optimalRoute.costPerUnit = route.optimalRoute.baseCost / cargoUnits;
            }
        }

        return route;
    }

    getNearbyCities(cityId, maxDistance = 200) {
        const city = this.cities.get(cityId);
        if (!city) return [];

        const nearby = [];
        for (const otherCity of this.cities.values()) {
            if (otherCity.id === cityId) continue;

            const distance = this.transportation.calculateDistance(city, otherCity);
            if (distance <= maxDistance) {
                nearby.push({
                    city: otherCity,
                    distance: distance,
                    distanceFormatted: `${distance.toFixed(1)} km`,
                    sameCountry: city.country.id === otherCity.country.id
                });
            }
        }

        return nearby.sort((a, b) => a.distance - b.distance);
    }

    updateAllCities(updateType, gameTime) {
        for (const city of this.cities.values()) {
            if (updateType === 'monthly') {
                city.updateMonthly(gameTime);
            } else if (updateType === 'yearly') {
                city.updateYearly(gameTime);
            }
        }
    }

    getTotalPopulation() {
        let total = 0;
        for (const city of this.cities.values()) {
            total += city.population;
        }
        return total;
    }

    getTotalPurchasingPower() {
        let total = 0;
        for (const city of this.cities.values()) {
            total += city.totalPurchasingPower;
        }
        return total;
    }

    getTotalEmployed() {
        let total = 0;
        for (const city of this.cities.values()) {
            total += city.demographics.employed;
        }
        return total;
    }

    getAverageSalaryLevel() {
        let total = 0;
        const cities = Array.from(this.cities.values());
        for (const city of cities) {
            total += city.salaryLevel;
        }
        return cities.length > 0 ? total / cities.length : 0;
    }

    getStatisticsByCountry() {
        const stats = new Map();
        
        this.countries.forEach(country => {
            const countryCities = this.getCitiesByCountry(country.id);
            const population = countryCities.reduce((sum, c) => sum + c.population, 0);
            const gdp = countryCities.reduce((sum, c) => sum + c.totalPurchasingPower, 0);
            
            stats.set(country.id, {
                country: country.name,
                cities: countryCities.length,
                population: population,
                gdp: gdp,
                avgSalaryLevel: countryCities.reduce((sum, c) => sum + c.salaryLevel, 0) / countryCities.length
            });
        });
        
        return stats;
    }
}
