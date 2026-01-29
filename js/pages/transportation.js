// js/pages/transportation.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber, formatCurrency } from './shared.js';

let simulation;
let routeHistory = [];

async function init() {
    simulation = await getSimulation();
    setupClock(simulation);
    setupControls(simulation);

    populateCitySelects();

    document.getElementById('calculate-route')?.addEventListener('click', calculateRoute);

    updateDisplay();
    onUpdate(() => updateDisplay());
}

function populateCitySelects() {
    const originSelect = document.getElementById('origin-city');
    const destSelect = document.getElementById('destination-city');
    if (!originSelect || !destSelect || !simulation) return;

    const countries = Array.from(simulation.countries.values());
    const cities = [];
    countries.forEach(c => {
        c.cities.forEach(city => {
            cities.push({ name: city.name, country: c.name });
        });
    });

    cities.sort((a, b) => a.name.localeCompare(b.name));

    cities.forEach(city => {
        const opt1 = document.createElement('option');
        opt1.value = city.name;
        opt1.textContent = `${city.name}, ${city.country}`;
        originSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = city.name;
        opt2.textContent = `${city.name}, ${city.country}`;
        destSelect.appendChild(opt2);
    });
}

function updateDisplay() {
    // Just keep clock updated
}

function calculateRoute() {
    const origin = document.getElementById('origin-city')?.value;
    const destination = document.getElementById('destination-city')?.value;
    const cargoUnits = parseInt(document.getElementById('cargo-units')?.value) || 10;
    const priority = document.getElementById('priority')?.value || 'balanced';

    if (!origin || !destination) {
        alert('Please select both origin and destination cities');
        return;
    }

    if (origin === destination) {
        alert('Origin and destination must be different');
        return;
    }

    // Find cities
    let originCity = null, destCity = null;
    const countries = Array.from(simulation.countries.values());
    countries.forEach(c => {
        c.cities.forEach(city => {
            if (city.name === origin) originCity = city;
            if (city.name === destination) destCity = city;
        });
    });

    if (!originCity || !destCity) {
        alert('Could not find cities');
        return;
    }

    // Calculate distance (simplified)
    const lat1 = originCity.coordinates?.lat || 0;
    const lng1 = originCity.coordinates?.lng || 0;
    const lat2 = destCity.coordinates?.lat || 0;
    const lng2 = destCity.coordinates?.lng || 0;

    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Calculate routes for different modes
    const routes = [];

    // Road
    routes.push({
        mode: 'Road',
        distance: distance * 1.3, // Roads are longer than straight line
        speed: 60,
        costPerKmUnit: 0.50,
        reliability: 0.85,
        available: true
    });

    // Rail
    const hasRail = originCity.infrastructure?.hasRailway && destCity.infrastructure?.hasRailway;
    routes.push({
        mode: 'Rail',
        distance: distance * 1.1,
        speed: 80,
        costPerKmUnit: 0.30,
        reliability: 0.95,
        available: hasRail
    });

    // Sea
    const hasSea = originCity.infrastructure?.hasSeaport && destCity.infrastructure?.hasSeaport;
    routes.push({
        mode: 'Sea',
        distance: distance * 1.5,
        speed: 30,
        costPerKmUnit: 0.10,
        reliability: 0.90,
        available: hasSea
    });

    // Air
    const hasAir = originCity.infrastructure?.hasAirport && destCity.infrastructure?.hasAirport;
    routes.push({
        mode: 'Air',
        distance: distance,
        speed: 800,
        costPerKmUnit: 2.00,
        reliability: 0.99,
        available: hasAir
    });

    // Calculate costs and times
    routes.forEach(route => {
        if (route.available) {
            route.time = route.distance / route.speed;
            route.cost = route.distance * route.costPerKmUnit * cargoUnits;
            route.score = calculateScore(route, priority);
        }
    });

    // Sort by score
    const availableRoutes = routes.filter(r => r.available).sort((a, b) => b.score - a.score);

    // Display results
    displayResults(origin, destination, cargoUnits, availableRoutes, distance);

    // Add to history
    routeHistory.unshift({
        origin, destination, cargoUnits, priority,
        bestRoute: availableRoutes[0],
        timestamp: new Date()
    });
    if (routeHistory.length > 10) routeHistory.pop();
    renderHistory();
}

function calculateScore(route, priority) {
    switch (priority) {
        case 'cost':
            return 1 / route.cost;
        case 'speed':
            return 1 / route.time;
        case 'reliability':
            return route.reliability;
        case 'balanced':
        default:
            return (route.reliability * 0.3) + (1 / route.time * 100 * 0.35) + (1 / route.cost * 1000 * 0.35);
    }
}

function displayResults(origin, destination, cargoUnits, routes, distance) {
    const container = document.getElementById('route-results');
    if (!container) return;

    if (routes.length === 0) {
        container.innerHTML = '<p class="error">No routes available between these cities</p>';
        return;
    }

    container.innerHTML = `
        <div class="route-summary">
            <h3>Route: ${origin} → ${destination}</h3>
            <p>Distance: ${distance.toFixed(0)} km (straight line) | Cargo: ${cargoUnits} units</p>
        </div>
        <div class="route-options">
            ${routes.map((r, i) => `
                <div class="route-option ${i === 0 ? 'recommended' : ''}">
                    <div class="route-mode">${r.mode} ${i === 0 ? '(Recommended)' : ''}</div>
                    <div class="route-details">
                        <div class="route-stat"><span>Time</span><span>${r.time.toFixed(1)} hours</span></div>
                        <div class="route-stat"><span>Cost</span><span>${formatCurrency(r.cost)}</span></div>
                        <div class="route-stat"><span>Distance</span><span>${r.distance.toFixed(0)} km</span></div>
                        <div class="route-stat"><span>Reliability</span><span>${(r.reliability * 100).toFixed(0)}%</span></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderHistory() {
    const container = document.getElementById('route-history');
    if (!container) return;

    if (routeHistory.length === 0) {
        container.innerHTML = '<p class="empty-state">No routes calculated yet</p>';
        return;
    }

    container.innerHTML = routeHistory.map(h => `
        <div class="history-item">
            <span class="history-route">${h.origin} → ${h.destination}</span>
            <span class="history-mode">${h.bestRoute?.mode || '-'}</span>
            <span class="history-cost">${h.bestRoute ? formatCurrency(h.bestRoute.cost) : '-'}</span>
            <span class="history-time">${h.timestamp.toLocaleTimeString()}</span>
        </div>
    `).join('');
}

init();
