// js/core/TransportationNetwork.js
export class TransportationNetwork {
    constructor() {
        this.transportTypes = {
            LOCAL_ROAD: {
                name: 'Local Roads',
                costPerKm: 0.50,
                speedKmh: 50,
                reliability: 0.85,
                minDistance: 0,
                maxDistance: 100,
                requiresInfrastructure: false,
                icon: '🚗'
            },
            HIGHWAY: {
                name: 'Highway',
                costPerKm: 0.30,
                speedKmh: 90,
                reliability: 0.95,
                minDistance: 50,
                maxDistance: 1000,
                requiresInfrastructure: false,
                icon: '🛣️'
            },
            TRAIN: {
                name: 'Rail Freight',
                costPerKm: 0.15,
                speedKmh: 80,
                reliability: 0.90,
                minDistance: 100,
                maxDistance: 3000,
                requiresInfrastructure: true,
                requires: 'hasRailway',
                icon: '🚂'
            },
            AIR: {
                name: 'Air Freight',
                costPerKm: 2.50,
                speedKmh: 600,
                reliability: 0.92,
                minDistance: 200,
                maxDistance: 10000,
                requiresInfrastructure: true,
                requires: 'hasAirport',
                baseCost: 500,
                icon: '✈️'
            },
            SEA: {
                name: 'Sea Freight',
                costPerKm: 0.08,
                speedKmh: 40,
                reliability: 0.85,
                minDistance: 500,
                maxDistance: 20000,
                requiresInfrastructure: true,
                requires: 'hasSeaport',
                baseCost: 1000,
                icon: '🚢'
            }
        };
    }

    calculateDistance(city1, city2) {
        const dx = city1.coordinates.x - city2.coordinates.x;
        const dy = city1.coordinates.y - city2.coordinates.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getAvailableTransportOptions(originCity, destinationCity, distance) {
        const options = [];

        for (const [type, config] of Object.entries(this.transportTypes)) {
            if (distance < config.minDistance || distance > config.maxDistance) {
                continue;
            }

            if (config.requiresInfrastructure) {
                const infraCheck = config.requires;
                if (!originCity[infraCheck] || !destinationCity[infraCheck]) {
                    continue;
                }
            }

            options.push({
                type: type,
                config: config,
                available: true
            });
        }

        return options;
    }

    calculateTransportCost(transportType, distance, cargoUnits, productWeight = 1.0) {
        const config = this.transportTypes[transportType];
        if (!config) return null;

        let cost = config.costPerKm * distance * cargoUnits;

        if (config.baseCost) {
            cost += config.baseCost;
        }

        cost *= productWeight;

        return {
            type: transportType,
            typeName: config.name,
            icon: config.icon,
            distance: distance,
            cargoUnits: cargoUnits,
            baseCost: cost,
            costPerUnit: cost / cargoUnits,
            transitTime: this.calculateTransitTime(transportType, distance),
            reliability: config.reliability
        };
    }

    calculateTransitTime(transportType, distance) {
        const config = this.transportTypes[transportType];
        const hours = distance / config.speedKmh;

        return {
            hours: hours,
            days: hours / 24,
            formatted: this.formatTransitTime(hours)
        };
    }

    formatTransitTime(hours) {
        if (hours < 1) {
            return `${Math.round(hours * 60)} minutes`;
        } else if (hours < 24) {
            return `${hours.toFixed(1)} hours`;
        } else {
            const days = Math.floor(hours / 24);
            const remainingHours = Math.floor(hours % 24);
            return `${days} day${days > 1 ? 's' : ''} ${remainingHours}h`;
        }
    }

    findOptimalRoute(originCity, destinationCity, cargoUnits, priority = 'cost') {
        const distance = this.calculateDistance(originCity, destinationCity);
        const options = this.getAvailableTransportOptions(originCity, destinationCity, distance);

        if (options.length === 0) {
            return {
                error: 'No available transportation options',
                distance: distance
            };
        }

        const routes = options.map(opt => {
            const cost = this.calculateTransportCost(opt.type, distance, cargoUnits);
            return {
                ...cost,
                score: this.calculateRouteScore(cost, priority)
            };
        });

        routes.sort((a, b) => b.score - a.score);

        return {
            distance: distance,
            optimalRoute: routes[0],
            allRoutes: routes,
            origin: originCity.name,
            destination: destinationCity.name
        };
    }

    calculateRouteScore(routeCost, priority) {
        switch (priority) {
            case 'cost':
                return 10000 / routeCost.costPerUnit;
            case 'speed':
                return 1000 / routeCost.transitTime.hours;
            case 'reliability':
                return routeCost.reliability * 100;
            case 'balanced':
                const costScore = 5000 / routeCost.costPerUnit;
                const speedScore = 500 / routeCost.transitTime.hours;
                const reliabilityScore = routeCost.reliability * 50;
                return costScore + speedScore + reliabilityScore;
            default:
                return routeCost.reliability * 100;
        }
    }
}
