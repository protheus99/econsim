// js/core/CityManager.js
import { City } from './City.js';
import { TransportationNetwork } from './TransportationNetwork.js';
import { CityNameGenerator } from '../data/CityNames.js';

export class CityManager {
    constructor(countries) {
        this.cities = new Map();
        this.countries = countries;
        this.transportation = new TransportationNetwork();
        this.cityNameGenerator = new CityNameGenerator(countries);
    }

    generateInitialCities(count = 8) {
        const countriesArray = Array.from(this.countries.values());
        
        for (let i = 0; i < count; i++) {
            // Distribute cities among countries
            const country = countriesArray[i % countriesArray.length];
            const city = this.generateCityForCountry(country);
            this.cities.set(city.id, city);
            country.addCity(city);
        }

        // Designate some coastal cities
        this.designateCoastalCities();
        
        return Array.from(this.cities.values());
    }

    generateCityForCountry(country) {
        const name = this.cityNameGenerator.getNameForCountry(country);

        // Population distribution
        const rand = Math.random();
        let population;

        if (rand < 0.4) {
            population = 250000 + Math.random() * 250000; // Small: 250K-500K
        } else if (rand < 0.7) {
            population = 500000 + Math.random() * 1000000; // Medium: 500K-1.5M
        } else if (rand < 0.9) {
            population = 1500000 + Math.random() * 1500000; // Large: 1.5M-3M
        } else {
            population = 3000000 + Math.random() * 2000000; // Major: 3M-5M
        }

        // Salary level influenced by country economic level
        let baseSalaryLevel = 0.5;
        if (country.economicLevel === 'DEVELOPED') {
            baseSalaryLevel = 0.6 + Math.random() * 0.3; // 0.6-0.9
        } else if (country.economicLevel === 'EMERGING') {
            baseSalaryLevel = 0.4 + Math.random() * 0.3; // 0.4-0.7
        } else {
            baseSalaryLevel = 0.3 + Math.random() * 0.3; // 0.3-0.6
        }

        const city = new City(name, Math.floor(population), baseSalaryLevel, country);

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
