// js/ui/Dashboard.js (Updated)
export class Dashboard {
    constructor(simulation) {
        this.simulation = simulation;
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('simulation-update', () => {
            this.update();
        });

        document.getElementById('btn-play')?.addEventListener('click', () => {
            this.simulation.resume();
            this.updateStatus('running');
        });

        document.getElementById('btn-pause')?.addEventListener('click', () => {
            this.simulation.pause();
            this.updateStatus('paused');
        });

        document.querySelectorAll('.btn-speed').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.simulation.setSpeed(speed);
            });
        });

        document.getElementById('calculate-route')?.addEventListener('click', () => {
            this.calculateRoute();
        });
    }

    update() {
        const state = this.simulation.getState();

        // Update clock
        document.getElementById('game-date').textContent = this.simulation.clock.getFormatted();
        document.getElementById('real-time').textContent = this.simulation.clock.getElapsed();

        // Update global stats
        document.getElementById('total-population').textContent = state.stats.totalPopulation.toLocaleString();
        document.getElementById('total-gdp').textContent = this.simulation.formatMoney(state.stats.totalGDP);
        document.getElementById('city-count').textContent = state.cities.length;
        document.getElementById('total-employed').textContent = state.stats.totalEmployed.toLocaleString();
        document.getElementById('avg-salary-level').textContent = (state.stats.avgSalaryLevel * 100).toFixed(0) + '%';

        // Update firms section
        this.updateFirms(state.firms);

        // Update cities
        this.updateCities(state.cities);

        // Update products
        this.updateProducts(state.products);

        // Update events
        this.updateEvents(state.events);

        // Update market chart
        this.updateMarketChart(state.marketHistory);

        // Update badges
        document.getElementById('corp-count').textContent = `${state.stats.totalFirms} Firms`;
        document.getElementById('cities-badge').textContent = `${state.cities.length} Cities`;
        document.getElementById('product-count').textContent = `${state.products.length} Products`;
        document.getElementById('map-info').textContent = `${state.cities.length} Cities`;
    }

    updateStatus(status) {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');

        if (status === 'running') {
            indicator.className = 'status-indicator status-running';
            text.textContent = 'Running';
        } else {
            indicator.className = 'status-indicator status-paused';
            text.textContent = 'Paused';
        }
    }

    updateFirms(firms) {
        const firmList = document.getElementById('corp-list');
        if (!firmList) return;

        // Group firms by type and show summary
        const firmsByType = {};
        firms.forEach(firm => {
            if (!firmsByType[firm.type]) {
                firmsByType[firm.type] = [];
            }
            firmsByType[firm.type].push(firm);
        });

        let html = '';
        Object.entries(firmsByType).forEach(([type, typeFirms]) => {
            const totalRevenue = typeFirms.reduce((sum, f) => sum + (f.revenue || 0), 0);
            const totalProfit = typeFirms.reduce((sum, f) => sum + (f.profit || 0), 0);
            const totalEmployees = typeFirms.reduce((sum, f) => sum + (f.totalEmployees || 0), 0);

            const icon = this.getFirmIcon(type);
            const color = this.getFirmColor(type);

            html += `
                <div class="corp-item" style="border-color: ${color}">
                    <div class="corp-header">
                        <div class="corp-name">${icon} ${type} (${typeFirms.length})</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${totalEmployees} employees</div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Revenue</span>
                            <span class="stat-value">${this.simulation.formatMoney(totalRevenue)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Profit</span>
                            <span class="stat-value ${totalProfit < 0 ? 'negative' : ''}">${this.simulation.formatMoney(totalProfit)}</span>
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(100, (totalRevenue / 10000000) * 100)}%"></div>
                    </div>
                </div>
            `;
        });

        firmList.innerHTML = html;
    }

    getFirmIcon(type) {
        const icons = {
            'MINING': '⛏️',
            'LOGGING': '🪵',
            'FARM': '🌾',
            'MANUFACTURING': '🏭',
            'RETAIL': '🏪',
            'BANK': '🏦'
        };
        return icons[type] || '🏢';
    }

    getFirmColor(type) {
        const colors = {
            'MINING': '#8B4513',
            'LOGGING': '#228B22',
            'FARM': '#FFD700',
            'MANUFACTURING': '#4169E1',
            'RETAIL': '#FF6347',
            'BANK': '#20B2AA'
        };
        return colors[type] || '#64b5f6';
    }

    updateCities(cities) {
        const cityList = document.getElementById('city-list');
        if (!cityList) return;

        cityList.innerHTML = cities.map(city => `
            <div class="city-item">
                <div class="city-header">
                    <div class="city-name">${city.name}</div>
                    <div class="city-population">${(city.population / 1000000).toFixed(2)}M</div>
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">
                    ${city.country ? city.country.name : 'Unknown'}
                </div>
                <div class="city-stats">
                    <div><span class="stat-label">Salary Level:</span></div>
                    <div><span class="stat-value">${(city.salaryLevel * 100).toFixed(0)}%</span></div>
                    <div><span class="stat-label">GDP:</span></div>
                    <div><span class="stat-value">${city.formatCurrency(city.totalPurchasingPower)}</span></div>
                </div>
                <div class="city-infrastructure">
                    <div class="infra-badge ${city.hasAirport ? '' : 'disabled'}">✈️ Airport</div>
                    <div class="infra-badge ${city.hasSeaport ? '' : 'disabled'}">⚓ Seaport</div>
                    <div class="infra-badge ${city.hasRailway ? '' : 'disabled'}">🚂 Railway</div>
                    <div class="infra-badge ${city.isCoastal ? '' : 'disabled'}">🌊 Coastal</div>
                </div>
            </div>
        `).join('');
    }

    updateProducts(products) {
        const productGrid = document.getElementById('product-grid');
        if (!productGrid) return;

        // Show only first 20 products for performance
        const displayProducts = products.slice(0, 20);

        productGrid.innerHTML = displayProducts.map(p => `
            <div class="product-card" title="${p.tier}">
                <div class="product-icon">${p.icon}</div>
                <div class="product-name">${p.name}</div>
                <div class="product-price">${this.simulation.formatMoney(p.currentPrice || p.basePrice)}</div>
                <div style="font-size: 10px; color: var(--text-secondary); margin-top: 4px;">
                    ${p.tier}
                </div>
            </div>
        `).join('');
    }

    updateEvents(events) {
        const eventFeed = document.getElementById('event-feed');
        if (!eventFeed) return;

        eventFeed.innerHTML = events.slice(0, 20).map(e => `
            <div class="event-item ${e.type}">
                <div class="event-time">${e.time}</div>
                <div><strong>${e.title}</strong>: ${e.message}</div>
            </div>
        `).join('');
    }

    updateMarketChart(history) {
        const svg = document.getElementById('market-chart');
        if (!svg) return;

        const width = svg.clientWidth;
        const height = svg.clientHeight;

        if (history.length < 2) return;

        const maxValue = Math.max(...history.map(h => h.transactions || h.sales || 1), 1);
        const points = history.map((h, i) => {
            const x = (i / (history.length - 1)) * width;
            const y = height - ((h.transactions || h.sales || 0) / maxValue * height * 0.9);
            return `${x},${y}`;
        }).join(' ');

        svg.innerHTML = `
            <polyline points="${points}" 
                      fill="none" 
                      stroke="var(--accent-green)" 
                      stroke-width="2"/>
            <polyline points="0,${height} ${points} ${width},${height}" 
                      fill="rgba(76, 175, 80, 0.1)" 
                      stroke="none"/>
        `;
    }

    populateTransportSelectors() {
        const cities = this.simulation.cities;
        if (!cities) return;

        const originSelect = document.getElementById('origin-city');
        const destSelect = document.getElementById('destination-city');

        if (!originSelect || !destSelect) return;

        const options = cities.map(city =>
            `<option value="${city.id}">${city.name} (${city.country ? city.country.name : 'Unknown'})</option>`
        ).join('');

        originSelect.innerHTML = options;
        destSelect.innerHTML = options;
        if (cities.length > 1) {
            destSelect.selectedIndex = 1;
        }
    }

    calculateRoute() {
        const originId = document.getElementById('origin-city')?.value;
        const destId = document.getElementById('destination-city')?.value;
        const cargoUnits = parseInt(document.getElementById('cargo-units')?.value || 10);
        const priority = document.getElementById('priority')?.value || 'cost';

        if (!originId || !destId) return;

        const result = this.simulation.cityManager.calculateShippingCost(
            originId,
            destId,
            cargoUnits,
            priority
        );

        const resultsDiv = document.getElementById('route-results');
        if (!resultsDiv) return;

        if (result.error) {
            resultsDiv.innerHTML = `
                <div class="route-results">
                    <div style="color: var(--accent-red);">${result.error}</div>
                </div>
            `;
            return;
        }

        resultsDiv.innerHTML = `
            <div class="route-results">
                <div style="margin-bottom: 15px; font-size: 14px;">
                    <strong>Route:</strong> ${result.origin} → ${result.destination}<br>
                    <strong>Distance:</strong> ${result.distance.toFixed(1)} km
                </div>
                ${result.allRoutes.map((route, i) => `
                    <div class="route-option ${i === 0 ? 'optimal' : ''}">
                        <div class="route-header">
                            <div class="route-name">${route.icon} ${route.typeName}</div>
                            <div class="route-cost">${this.simulation.formatMoney(route.baseCost)}</div>
                        </div>
                        <div class="route-details">
                            <div>
                                <div class="stat-label">Cost/Unit</div>
                                <div class="stat-value">${this.simulation.formatMoney(route.costPerUnit)}</div>
                            </div>
                            <div>
                                <div class="stat-label">Transit Time</div>
                                <div class="stat-value">${route.transitTime.formatted}</div>
                            </div>
                            <div>
                                <div class="stat-label">Reliability</div>
                                <div class="stat-value">${(route.reliability * 100).toFixed(0)}%</div>
                            </div>
                        </div>
                        ${route.tariff ? `
                            <div style="margin-top: 8px; font-size: 11px; color: var(--accent-orange);">
                                + Tariff: ${this.simulation.formatMoney(route.tariff)}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
}
