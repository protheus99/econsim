// js/core/CityManager.js
import { City } from './City.js';
import { TransportationNetwork } from './TransportationNetwork.js';

export class CityManager {
    constructor() {
        this.cities = new Map();
        this.transportation = new TransportationNetwork();
        this.cityNames = [
            'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
            'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
            'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte',
            'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Boston'
        ];
    }

    generateInitialCities(count = 8) {
        for (let i = 0; i < count; i++) {
            const city = this.generateRandomCity(i);
            this.cities.set(city.id, city);
        }

        this.designateCoastalCities();
        return Array.from(this.cities.values());
    }

    generateRandomCity(index) {
        const name = this.cityNames[index % this.cityNames.length];

        const rand = Math.random();
        let population;

        if (rand < 0.4) {
            population = 250000 + Math.random() * 250000;
        } else if (rand < 0.7) {
            population = 500000 + Math.random() * 1000000;
        } else if (rand < 0.9) {
            population = 1500000 + Math.random() * 1500000;
        } else {
            population = 3000000 + Math.random() * 2000000;
        }

        const salaryLevel = 0.3 + Math.random() * 0.5;
        const city = new City(name, Math.floor(population), salaryLevel);

        city.coordinates = {
            x: Math.random() * 1000,
            y: Math.random() * 1000
        };

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

    calculateShippingCost(originCityId, destinationCityId, cargoUnits, priority = 'cost') {
        const origin = this.cities.get(originCityId);
        const destination = this.cities.get(destinationCityId);

        if (!origin || !destination) {
            return { error: 'City not found' };
        }

        return this.transportation.findOptimalRoute(origin, destination, cargoUnits, priority);
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
                    distanceFormatted: `${distance.toFixed(1)} km`
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
}
