// js/pages/global-economy.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber, formatCurrency } from './shared.js';

let simulation;

async function init() {
    simulation = await getSimulation();
    setupClock(simulation);
    setupControls(simulation);

    // Initial render
    updateDisplay();

    // Update on simulation tick
    onUpdate(() => updateDisplay());
}

function updateDisplay() {
    if (!simulation) return;

    // Convert Map to array for iteration
    const countries = Array.from(simulation.countries.values());

    // Population
    const totalPop = countries.reduce((sum, c) => {
        return sum + c.cities.reduce((s, city) => s + city.population, 0);
    }, 0);
    document.getElementById('total-population').textContent = formatNumber(totalPop);

    // GDP
    const totalGDP = countries.reduce((sum, c) => {
        return sum + c.cities.reduce((s, city) => s + city.gdp, 0);
    }, 0);
    document.getElementById('total-gdp').textContent = formatCurrency(totalGDP);

    // Employment
    let totalEmployed = 0;
    simulation.firms.forEach(f => totalEmployed += f.totalEmployees || 0);
    document.getElementById('total-employed').textContent = formatNumber(totalEmployed);

    // Cities and Countries
    const cityCount = countries.reduce((sum, c) => sum + c.cities.length, 0);
    document.getElementById('city-count').textContent = cityCount;
    document.getElementById('country-count').textContent = countries.length;

    // Corporations
    document.getElementById('corp-count').textContent = simulation.corporations.length;

    // Avg Salary
    let totalSalary = 0;
    let salaryCount = 0;
    countries.forEach(c => {
        c.cities.forEach(city => {
            totalSalary += city.salaryLevel;
            salaryCount++;
        });
    });
    const avgSalary = salaryCount > 0 ? (totalSalary / salaryCount * 100).toFixed(0) : 0;
    document.getElementById('avg-salary-level').textContent = avgSalary + '%';

    // Firm counts
    let totalFirms = 0, miningCount = 0, manufacturingCount = 0, retailCount = 0;
    simulation.firms.forEach(f => {
        totalFirms++;
        if (f.type === 'MINING') miningCount++;
        else if (f.type === 'MANUFACTURING') manufacturingCount++;
        else if (f.type === 'RETAIL') retailCount++;
    });

    document.getElementById('total-firms').textContent = totalFirms;
    document.getElementById('mining-count').textContent = miningCount;
    document.getElementById('manufacturing-count').textContent = manufacturingCount;
    document.getElementById('retail-count').textContent = retailCount;

    // Trade stats
    const stats = simulation.transactionLog?.stats || {};
    document.getElementById('hourly-transactions').textContent = stats.totalTransactions || 0;
    document.getElementById('avg-transaction').textContent = formatCurrency(stats.totalValue / Math.max(1, stats.totalTransactions));
    document.getElementById('b2b-count').textContent = stats.totalB2B || 0;
    document.getElementById('gm-orders-count').textContent = stats.totalGlobalMarket || 0;

    // GDP by Country
    renderCountryGDP(countries);
}

function renderCountryGDP(countries) {
    const container = document.getElementById('country-gdp-list');
    if (!container) return;

    const countryData = countries.map(c => ({
        name: c.name,
        gdp: c.cities.reduce((sum, city) => sum + city.gdp, 0),
        cities: c.cities.length,
        population: c.cities.reduce((sum, city) => sum + city.population, 0)
    })).sort((a, b) => b.gdp - a.gdp);

    container.innerHTML = countryData.map(c => `
        <div class="country-gdp-item">
            <div class="country-name">${c.name}</div>
            <div class="country-stats">
                <span>GDP: ${formatCurrency(c.gdp)}</span>
                <span>Pop: ${formatNumber(c.population)}</span>
                <span>${c.cities} cities</span>
            </div>
        </div>
    `).join('');
}

// Initialize
init();
