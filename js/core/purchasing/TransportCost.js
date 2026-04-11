// js/core/purchasing/TransportCost.js
// Calculates transportation costs and distances between cities

export class TransportCost {
    // Cost rates in $/kg/km by transport mode
    // Calibrated so bulk ore (1000 kg/unit) at 500 km by rail ≈ 15-20% of product value
    // while light manufactured goods (0.1-50 kg/unit) pay negligible transport costs
    static RATES = {
        truck: 0.000060,  // $/kg/km  (~$0.060/ton-km)
        rail:  0.000016,  // $/kg/km  (~$0.016/ton-km)
        ship:  0.000003,  // $/kg/km  (~$0.003/ton-km)
        air:   0.000300   // $/kg/km  (~$0.300/ton-km)
    };

    // Speed in km/h by transport mode
    static SPEEDS = {
        truck: 60,
        rail: 80,
        ship: 40,
        air: 800
    };

    /**
     * Calculate transport cost between two cities
     * @param {City} originCity - Origin city object
     * @param {City} destCity - Destination city object
     * @param {number} quantity - Quantity being shipped
     * @param {number} weightPerUnit - Weight per unit in kg (default 1)
     * @param {string} mode - Transport mode: 'truck', 'rail', 'ship', 'air', or 'auto'
     * @returns {object} { cost, distance, mode, hours }
     */
    static calculate(originCity, destCity, quantity, weightPerUnit = 1, mode = 'auto') {
        const distance = this.getDistance(originCity, destCity);
        const weight = quantity * weightPerUnit;

        // Auto-select cheapest appropriate mode based on distance
        if (mode === 'auto') {
            mode = this.selectBestMode(originCity, destCity, distance);
        }

        const cost = distance * weight * this.RATES[mode];
        const hours = this.calculateTransitTime(distance, mode, originCity, destCity);

        return {
            cost: Math.round(cost * 100) / 100,
            distance: Math.round(distance),
            mode,
            hours: Math.ceil(hours),
            costPerUnit: Math.round((cost / quantity) * 100) / 100
        };
    }

    /**
     * Calculate distance between two cities
     * Uses coordinates if available, otherwise estimates based on location
     */
    static getDistance(city1, city2) {
        if (!city1 || !city2) return 1000;

        // Same city = minimal distance
        if (city1.id === city2.id || city1.name === city2.name) {
            return 10;
        }

        // Use coordinates if available
        if (city1.coordinates && city2.coordinates) {
            const lat1 = city1.coordinates.lat || city1.coordinates.y;
            const lon1 = city1.coordinates.lon || city1.coordinates.x;
            const lat2 = city2.coordinates.lat || city2.coordinates.y;
            const lon2 = city2.coordinates.lon || city2.coordinates.x;

            if (lat1 && lon1 && lat2 && lon2) {
                return this.haversine(lat1, lon1, lat2, lon2);
            }
        }

        // Fallback: estimate based on country relationship
        const country1 = city1.country?.name || city1.country;
        const country2 = city2.country?.name || city2.country;

        if (country1 === country2) {
            // Same country: estimate 200-800 km
            return 200 + Math.random() * 600;
        }

        // Different countries: estimate 1000-3000 km
        return 1000 + Math.random() * 2000;
    }

    /**
     * Haversine formula for calculating distance between two points on Earth
     * @returns Distance in kilometers
     */
    static haversine(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    static toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Select best transport mode based on distance and city infrastructure
     */
    static selectBestMode(originCity, destCity, distance) {
        const isInternational = this.isInternational(originCity, destCity);

        // Local deliveries: truck
        if (distance < 100) {
            return 'truck';
        }

        // Regional/domestic: prefer rail if available
        if (distance < 1000 && !isInternational) {
            const hasRail = (originCity.hasRailway || originCity.hasRailway === undefined) &&
                           (destCity.hasRailway || destCity.hasRailway === undefined);
            return hasRail ? 'rail' : 'truck';
        }

        // International or long distance
        if (isInternational) {
            // Prefer ship for coastal cities
            const hasSeaport = (originCity.hasSeaport || originCity.isCoastal) &&
                              (destCity.hasSeaport || destCity.isCoastal);
            return hasSeaport ? 'ship' : 'rail';
        }

        // Default to rail for long domestic
        return 'rail';
    }

    /**
     * Check if shipment is international
     */
    static isInternational(city1, city2) {
        const country1 = city1?.country?.name || city1?.country;
        const country2 = city2?.country?.name || city2?.country;

        if (!country1 || !country2) return false;
        return country1 !== country2;
    }

    /**
     * Calculate total transit time including loading/unloading and customs
     */
    static calculateTransitTime(distance, mode, originCity, destCity) {
        const travelHours = distance / this.SPEEDS[mode];

        // Loading and unloading time (2 hours each end)
        let totalHours = travelHours + 4;

        // International customs delay
        if (this.isInternational(originCity, destCity)) {
            totalHours += 8; // Customs processing
        }

        return totalHours;
    }

    /**
     * Get total landed cost (product cost + transport cost)
     */
    static getLandedCost(productCost, originCity, destCity, quantity, weightPerUnit = 1, mode = 'auto') {
        const transport = this.calculate(originCity, destCity, quantity, weightPerUnit, mode);
        return {
            productCost,
            transportCost: transport.cost,
            totalCost: productCost + transport.cost,
            costPerUnit: (productCost + transport.cost) / quantity,
            transportDetails: transport
        };
    }

    /**
     * Compare transport options for a shipment
     */
    static compareOptions(originCity, destCity, quantity, weightPerUnit = 1) {
        const options = {};

        for (const mode of ['truck', 'rail', 'ship', 'air']) {
            options[mode] = this.calculate(originCity, destCity, quantity, weightPerUnit, mode);
        }

        // Sort by cost
        const sorted = Object.entries(options)
            .sort((a, b) => a[1].cost - b[1].cost);

        return {
            options,
            cheapest: sorted[0][0],
            fastest: 'air',
            recommended: this.selectBestMode(originCity, destCity, options.truck.distance)
        };
    }
}
