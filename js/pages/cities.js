// js/pages/cities.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber, formatCurrency, getFirmTypeName } from './shared.js';

let simulation;
let currentSort = 'population-desc';
let infraFilter = 'all';
let countryFilter = 'all';
let searchTerm = '';
let currentCityId = null;

async function init() {
    try {
        simulation = await getSimulation();
        if (!simulation) {
            console.error('Failed to get simulation');
            return;
        }
        setupClock(simulation);
        setupControls(simulation);

    // Check for city ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const cityIdParam = urlParams.get('id');

    // Setup event listeners
    document.getElementById('cities-sort-select')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderCities();
    });

    document.getElementById('cities-infra-filter')?.addEventListener('change', (e) => {
        infraFilter = e.target.value;
        renderCities();
    });

    document.getElementById('cities-country-filter')?.addEventListener('change', (e) => {
        countryFilter = e.target.value;
        renderCities();
    });

    document.getElementById('cities-search-input')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderCities();
    });

    document.getElementById('btn-back-city')?.addEventListener('click', () => {
        document.getElementById('city-detail-view').classList.add('hidden');
        document.querySelector('.main-container').style.display = 'block';
        currentCityId = null;
        window.history.pushState({}, '', 'cities.html');
    });

    populateCountryFilter();
    updateDisplay();
    onUpdate(() => updateDisplay());

    // Show city detail if ID in URL
    if (cityIdParam) {
        showCityDetailById(cityIdParam);
    }
    } catch (error) {
        console.error('Error initializing cities page:', error);
    }
}

function populateCountryFilter() {
    const select = document.getElementById('cities-country-filter');
    if (!select || !simulation) return;

    const countries = Array.from(simulation.countries.values());
    countries.forEach(c => {
        const option = document.createElement('option');
        option.value = c.name;
        option.textContent = c.name;
        select.appendChild(option);
    });
}

function updateDisplay() {
    if (!simulation) return;

    const countries = Array.from(simulation.countries.values());
    const allCities = [];
    countries.forEach(c => {
        c.cities.forEach(city => {
            allCities.push({ ...city, country: c.name });
        });
    });

    document.getElementById('all-cities-count').textContent = allCities.length + ' Cities';
    renderSummary(allCities);
    renderCities();
}

function renderSummary(cities) {
    const container = document.getElementById('cities-summary-stats');
    if (!container) return;

    const totalPop = cities.reduce((sum, c) => sum + c.population, 0);
    const totalGDP = cities.reduce((sum, c) => sum + c.gdp, 0);
    const avgSalary = cities.reduce((sum, c) => sum + c.salaryLevel, 0) / cities.length;

    const countries = Array.from(simulation.countries.values());

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Total Population</span><span class="stat-value">${formatNumber(totalPop)}</span></div>
            <div class="stat-item"><span class="stat-label">Total GDP</span><span class="stat-value">${formatCurrency(totalGDP)}</span></div>
            <div class="stat-item"><span class="stat-label">Avg Salary Level</span><span class="stat-value">${(avgSalary * 100).toFixed(0)}%</span></div>
            <div class="stat-item"><span class="stat-label">Countries</span><span class="stat-value">${countries.length}</span></div>
        </div>
    `;
}

function renderCities() {
    const container = document.getElementById('all-cities-grid');
    if (!container) return;

    const countries = Array.from(simulation.countries.values());
    let cities = [];
    countries.forEach(c => {
        c.cities.forEach(city => {
            cities.push({ ...city, country: c.name });
        });
    });

    // Filters
    if (countryFilter !== 'all') {
        cities = cities.filter(c => c.country === countryFilter);
    }

    if (infraFilter !== 'all') {
        cities = cities.filter(c => {
            switch (infraFilter) {
                case 'airport': return c.infrastructure?.hasAirport;
                case 'seaport': return c.infrastructure?.hasSeaport;
                case 'railway': return c.infrastructure?.hasRailway;
                case 'coastal': return c.isCoastal;
                default: return true;
            }
        });
    }

    if (searchTerm) {
        cities = cities.filter(c => c.name.toLowerCase().includes(searchTerm));
    }

    // Sort
    const [field, dir] = currentSort.split('-');
    cities.sort((a, b) => {
        let aVal, bVal;
        switch (field) {
            case 'population': aVal = a.population; bVal = b.population; break;
            case 'gdp': aVal = a.gdp; bVal = b.gdp; break;
            case 'firms': aVal = a.firms?.length || 0; bVal = b.firms?.length || 0; break;
            case 'salary': aVal = a.salaryLevel; bVal = b.salaryLevel; break;
            case 'name': aVal = a.name; bVal = b.name; break;
            default: aVal = 0; bVal = 0;
        }
        if (dir === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });

    container.innerHTML = cities.map(city => `
        <div class="city-card" data-city-name="${city.name}">
            <div class="city-card-header">
                <span class="city-name">${city.name}</span>
                <span class="city-country">${city.country}</span>
            </div>
            <div class="city-card-stats">
                <div class="stat-item"><span class="stat-label">Population</span><span class="stat-value">${formatNumber(city.population)}</span></div>
                <div class="stat-item"><span class="stat-label">GDP</span><span class="stat-value">${formatCurrency(city.gdp)}</span></div>
                <div class="stat-item"><span class="stat-label">Firms</span><span class="stat-value">${city.firms?.length || 0}</span></div>
            </div>
            <div class="city-infra">
                ${city.infrastructure?.hasAirport ? '<span class="infra-badge">Airport</span>' : ''}
                ${city.infrastructure?.hasSeaport ? '<span class="infra-badge">Seaport</span>' : ''}
                ${city.infrastructure?.hasRailway ? '<span class="infra-badge">Railway</span>' : ''}
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.city-card').forEach(card => {
        card.addEventListener('click', () => {
            const cityName = card.dataset.cityName;
            // Find the city to get its ID for URL
            let cityId = null;
            const countries = Array.from(simulation.countries.values());
            for (const country of countries) {
                const found = country.cities.find(c => c.name === cityName);
                if (found) {
                    cityId = found.id || cityName;
                    break;
                }
            }
            window.history.pushState({}, '', `cities.html?id=${cityId}`);
            showCityDetail(cityName);
        });
    });
}

function showCityDetailById(cityId) {
    // Find city by ID or name
    let city = null;
    let cityName = '';

    const countries = Array.from(simulation.countries.values());
    for (const country of countries) {
        const found = country.cities.find(c => c.id === cityId || c.id === parseInt(cityId) || c.name === cityId);
        if (found) {
            city = found;
            cityName = found.name;
            break;
        }
    }

    if (city) {
        showCityDetail(cityName);
    } else {
        // Show error if city not found
        showCityNotFoundError(cityId);
    }
}

function showCityNotFoundError(cityId) {
    document.querySelector('.main-container').style.display = 'none';
    document.getElementById('city-detail-view').classList.remove('hidden');
    document.getElementById('city-detail-name').textContent = 'City Not Found';
    document.getElementById('city-detail-country').textContent = '';

    const errorMsg = `
        <div class="city-not-found-error">
            <p>The city with ID "${cityId}" was not found.</p>
            <p>This can happen if:</p>
            <ul>
                <li>The simulation was restarted (city IDs change on each page load)</li>
                <li>The city ID in the URL is invalid</li>
            </ul>
            <p><a href="cities.html" class="btn btn-primary">← Back to Cities List</a></p>
        </div>
    `;
    document.getElementById('city-overview-stats').innerHTML = errorMsg;
    document.getElementById('city-infrastructure-detail').innerHTML = '';
    document.getElementById('city-economy-stats').innerHTML = '';
    document.getElementById('city-detail-firms-list').innerHTML = '';
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

    if (!city) {
        showCityNotFoundError(cityName);
        return;
    }

    document.querySelector('.main-container').style.display = 'none';
    document.getElementById('city-detail-view').classList.remove('hidden');

    document.getElementById('city-detail-name').textContent = city.name;
    document.getElementById('city-detail-country').textContent = countryName;

    document.getElementById('city-overview-stats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Population</span><span class="stat-value">${formatNumber(city.population)}</span></div>
            <div class="stat-item"><span class="stat-label">GDP</span><span class="stat-value">${formatCurrency(city.gdp)}</span></div>
        </div>
    `;

    document.getElementById('city-infrastructure-detail').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Airport</span><span class="stat-value">${city.infrastructure?.hasAirport ? 'Yes' : 'No'}</span></div>
            <div class="stat-item"><span class="stat-label">Seaport</span><span class="stat-value">${city.infrastructure?.hasSeaport ? 'Yes' : 'No'}</span></div>
        </div>
    `;

    document.getElementById('city-economy-stats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Firms</span><span class="stat-value">${city.firms?.length || 0}</span></div>
            <div class="stat-item"><span class="stat-label">Salary Level</span><span class="stat-value">${(city.salaryLevel * 100).toFixed(0)}%</span></div>
        </div>
    `;

    // Firms
    const firmsList = document.getElementById('city-detail-firms-list');
    document.getElementById('city-firms-count').textContent = (city.firms?.length || 0) + ' Firms';

    if (city.firms?.length > 0) {
        firmsList.innerHTML = city.firms.map(f => {
            // Get corporation info
            const corp = simulation.corporations.find(c => c.id === f.corporationId);
            const corpName = corp?.name || 'Independent';
            const typeName = getFirmTypeName(f);
            const firmType = f.type?.toLowerCase() || 'unknown';

            return `
                <div class="firm-item clickable" data-firm-id="${f.id}">
                    <span class="firm-type">${typeName}</span>
                    <span class="firm-type-badge ${firmType}">${f.type || 'Unknown'}</span>
                    <span class="firm-corp">${corpName}</span>
                    <span class="firm-stats-mini">${formatCurrency(f.revenue || 0)} rev</span>
                </div>
            `;
        }).join('');

        // Add click handlers for firm navigation
        firmsList.querySelectorAll('.firm-item').forEach(item => {
            item.addEventListener('click', () => {
                const firmId = item.dataset.firmId;
                window.location.href = `firms.html?id=${firmId}`;
            });
        });
    } else {
        firmsList.innerHTML = '<p class="empty-state">No firms in this city</p>';
    }

    // Store current city ID
    currentCityId = city.id || cityName;
}

init();
