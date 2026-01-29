// js/pages/world-map.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber, formatCurrency } from './shared.js';

let simulation;

async function init() {
    simulation = await getSimulation();
    setupClock(simulation);
    setupControls(simulation);

    document.getElementById('btn-back-city')?.addEventListener('click', () => {
        document.getElementById('city-detail-view').classList.add('hidden');
        document.querySelector('.main-container').style.display = 'block';
    });

    // Initial render
    updateDisplay();
    onUpdate(() => updateDisplay());
}

function updateDisplay() {
    if (!simulation) return;

    const countries = Array.from(simulation.countries.values());
    const cityCount = countries.reduce((sum, c) => sum + c.cities.length, 0);
    document.getElementById('map-info').textContent = cityCount + ' Cities';

    renderMap(countries);
    renderCountryCities(countries);
}

function renderMap(countries) {
    const container = document.getElementById('world-map');
    if (!container) return;

    // Simple text-based map representation
    let mapHTML = '<div class="map-grid">';

    countries.forEach(country => {
        country.cities.forEach(city => {
            const size = city.population > 1000000 ? 'large' : city.population > 500000 ? 'medium' : 'small';
            mapHTML += `
                <div class="map-city ${size}"
                     style="left: ${(city.coordinates?.lng + 180) / 360 * 100}%; top: ${(90 - city.coordinates?.lat) / 180 * 100}%"
                     data-city-name="${city.name}"
                     title="${city.name}, ${country.name}">
                    <span class="city-dot"></span>
                    <span class="city-label">${city.name}</span>
                </div>
            `;
        });
    });

    mapHTML += '</div>';
    container.innerHTML = mapHTML;

    // Add click handlers
    container.querySelectorAll('.map-city').forEach(el => {
        el.addEventListener('click', () => showCityDetail(el.dataset.cityName));
    });
}

function renderCountryCities(countries) {
    const container = document.getElementById('country-cities-list');
    if (!container) return;

    container.innerHTML = countries.map(country => `
        <div class="country-section">
            <div class="country-header">${country.name}</div>
            <div class="country-cities">
                ${country.cities.map(city => `
                    <span class="city-tag" data-city-name="${city.name}">${city.name}</span>
                `).join('')}
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.city-tag').forEach(el => {
        el.addEventListener('click', () => showCityDetail(el.dataset.cityName));
    });
}

function showCityDetail(cityName) {
    let city = null;
    let countryName = '';

    const countries = Array.from(simulation.countries.values());
    for (const country of countries) {
        const found = country.cities.find(c => c.name === cityName);
        if (found) {
            city = found;
            countryName = country.name;
            break;
        }
    }

    if (!city) return;

    document.querySelector('.main-container').style.display = 'none';
    document.getElementById('city-detail-view').classList.remove('hidden');

    document.getElementById('city-detail-name').textContent = city.name;
    document.getElementById('city-detail-country').textContent = countryName;

    document.getElementById('city-overview-stats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Population</span><span class="stat-value">${formatNumber(city.population)}</span></div>
            <div class="stat-item"><span class="stat-label">GDP</span><span class="stat-value">${formatCurrency(city.gdp)}</span></div>
            <div class="stat-item"><span class="stat-label">Salary Level</span><span class="stat-value">${(city.salaryLevel * 100).toFixed(0)}%</span></div>
        </div>
    `;

    document.getElementById('city-infrastructure-detail').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Airport</span><span class="stat-value">${city.infrastructure?.hasAirport ? 'Yes' : 'No'}</span></div>
            <div class="stat-item"><span class="stat-label">Seaport</span><span class="stat-value">${city.infrastructure?.hasSeaport ? 'Yes' : 'No'}</span></div>
            <div class="stat-item"><span class="stat-label">Railway</span><span class="stat-value">${city.infrastructure?.hasRailway ? 'Yes' : 'No'}</span></div>
        </div>
    `;

    document.getElementById('city-economy-stats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Firms</span><span class="stat-value">${city.firms?.length || 0}</span></div>
            <div class="stat-item"><span class="stat-label">Employed</span><span class="stat-value">${formatNumber(city.employed || 0)}</span></div>
        </div>
    `;

    // Firms list
    const firmsList = document.getElementById('city-detail-firms-list');
    document.getElementById('city-firms-count').textContent = (city.firms?.length || 0) + ' Firms';

    if (city.firms && city.firms.length > 0) {
        firmsList.innerHTML = city.firms.map(f => `
            <div class="firm-item">
                <span class="firm-type">${f.type}</span>
                <span class="firm-name">${f.name || f.id}</span>
            </div>
        `).join('');
    } else {
        firmsList.innerHTML = '<p class="empty-state">No firms in this city</p>';
    }
}

init();
