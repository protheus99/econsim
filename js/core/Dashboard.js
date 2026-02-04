// js/ui/Dashboard.js
export class Dashboard {
    constructor(simulation) {
        this.simulation = simulation;
        this.setupEventListeners();
    }

    getSimulation() {
        // Fallback to global if this.simulation is undefined
        return this.simulation || window.app?.simulation;
    }

    // Safe DOM helpers to prevent crashes on pages with partial layouts
    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    setHTML(id, value) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = value;
    }

    getEl(id) {
        return document.getElementById(id);
    }

    setupEventListeners() {
        window.addEventListener('simulation-update', () => {
            this.update();
        });

        // Control buttons (with null checks since elements may not exist on all pages)
        document.getElementById('btn-play')?.addEventListener('click', () => {
            this.getSimulation().resume();
            this.updateStatus('running');
        });

        document.getElementById('btn-pause')?.addEventListener('click', () => {
            this.getSimulation().pause();
            this.updateStatus('paused');
        });

        document.querySelectorAll('.btn-speed').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.getSimulation().setSpeed(speed);
            });
        });

        // Transportation calculator
        document.getElementById('calculate-route')?.addEventListener('click', () => {
            this.calculateRoute();
        });

        // Back button for corporation detail view (removed - now on separate page)
        document.getElementById('btn-back')?.addEventListener('click', () => {
            this.showMainDashboard();
        });

        // Back button for city detail view (removed - now on separate page)
        document.getElementById('btn-back-city')?.addEventListener('click', () => {
            this.showMainDashboard();
        });

        // View all corporations button (removed - now a link)
        document.getElementById('btn-view-all-corps')?.addEventListener('click', () => {
            this.showAllCorporations();
        });

        // Back button for all corporations view (removed - now on separate page)
        document.getElementById('btn-back-all-corps')?.addEventListener('click', () => {
            this.showMainDashboard();
        });

        // Sort/filter/search for corporations (removed - now on separate page)
        document.getElementById('corps-sort-select')?.addEventListener('change', () => {
            this.renderAllCorporations();
        });

        document.getElementById('corps-filter-select')?.addEventListener('change', () => {
            this.renderAllCorporations();
        });

        document.getElementById('corps-search-input')?.addEventListener('input', () => {
            this.renderAllCorporations();
        });

        // View all cities button (removed - now a link)
        document.getElementById('btn-view-all-cities')?.addEventListener('click', () => {
            this.showAllCities();
        });

        // Back button for all cities view (removed - now on separate page)
        document.getElementById('btn-back-all-cities')?.addEventListener('click', () => {
            this.showMainDashboard();
        });

        // Sort/filter/search for cities (removed - now on separate page)
        document.getElementById('cities-sort-select')?.addEventListener('change', () => {
            this.renderAllCities();
        });

        document.getElementById('cities-infra-filter')?.addEventListener('change', () => {
            this.renderAllCities();
        });

        document.getElementById('cities-country-filter')?.addEventListener('change', () => {
            this.renderAllCities();
        });

        document.getElementById('cities-search-input')?.addEventListener('input', () => {
            this.renderAllCities();
        });

        // Back button for firm detail view (removed - now on separate page)
        document.getElementById('btn-back-firm')?.addEventListener('click', () => {
            this.goBackFromFirm();
        });

        // Market Activity view
        document.getElementById('btn-view-market-activity')?.addEventListener('click', () => {
            this.showMarketActivity();
        });

        document.getElementById('btn-back-market')?.addEventListener('click', () => {
            this.showMainDashboard();
        });

        document.getElementById('btn-refresh-transactions')?.addEventListener('click', () => {
            this.renderMarketActivity();
        });

        // Market activity filters
        document.getElementById('transaction-type-filter')?.addEventListener('change', () => {
            this.renderMarketActivity();
        });

        document.getElementById('transaction-search')?.addEventListener('input', () => {
            this.renderMarketActivity();
        });

        document.getElementById('transaction-city-filter')?.addEventListener('change', () => {
            this.renderMarketActivity();
        });
    }

    showCorporationDetail(corpId) {
        // Redirect to corporations page instead of internal view
        window.location.href = `corporations.html?id=${corpId}`;
        return;

        // Legacy code below - kept for reference but not executed
        const simulation = this.getSimulation();
        const corp = simulation.corporations.find(c => c.id === corpId);
        if (!corp) return;

        // Store current corp for filtering
        this.currentCorp = corp;

        // Hide all views, show detail view
        document.getElementById('main-dashboard')?.classList.add('hidden');
        document.getElementById('all-corps-view')?.classList.add('hidden');
        document.getElementById('city-detail-view')?.classList.add('hidden');
        document.getElementById('corp-detail-view')?.classList.remove('hidden');

        // Update corporation name and character badge
        document.getElementById('corp-detail-name').textContent = corp.name;
        const characterClass = corp.character.toLowerCase().replace('_', '-');
        document.getElementById('corp-character-badge').innerHTML = `
            <span class="character-badge ${characterClass}">${corp.character.replace('_', ' ')}</span>
        `;

        // Calculate additional metrics
        const facilities = corp.facilities || [];
        const totalAssets = facilities.reduce((sum, f) => sum + (f.totalAssets || 0), 0);
        const totalInventoryValue = facilities.reduce((sum, f) => {
            if (f.inventory?.quantity) return sum + (f.inventory.quantity * 10);
            if (f.finishedGoodsInventory?.quantity) return sum + (f.finishedGoodsInventory.quantity * 50);
            return sum;
        }, 0);
        const profitMargin = corp.revenue > 0 ? ((corp.profit / corp.revenue) * 100) : 0;
        const avgRevenuePerFacility = facilities.length > 0 ? corp.revenue / facilities.length : 0;
        const avgEmployeesPerFacility = facilities.length > 0 ? corp.employees / facilities.length : 0;

        // Financial Overview
        document.getElementById('corp-financial-stats').innerHTML = `
            <div class="financial-grid">
                <div class="financial-stat large">
                    <div class="financial-stat-value ${corp.cash < 0 ? 'negative' : ''}">${simulation.formatMoney(corp.cash || 0)}</div>
                    <div class="financial-stat-label">Cash on Hand</div>
                </div>
                <div class="financial-stat">
                    <div class="financial-stat-value ${corp.revenue < 0 ? 'negative' : ''}">${simulation.formatMoney(corp.revenue || 0)}</div>
                    <div class="financial-stat-label">Total Revenue</div>
                </div>
                <div class="financial-stat">
                    <div class="financial-stat-value ${corp.profit < 0 ? 'negative' : ''}">${simulation.formatMoney(corp.profit || 0)}</div>
                    <div class="financial-stat-label">Net Profit</div>
                </div>
                <div class="financial-stat">
                    <div class="financial-stat-value">${simulation.formatMoney(totalAssets)}</div>
                    <div class="financial-stat-label">Total Assets</div>
                </div>
                <div class="financial-stat">
                    <div class="financial-stat-value">${simulation.formatMoney(totalInventoryValue)}</div>
                    <div class="financial-stat-label">Inventory Value</div>
                </div>
            </div>
        `;

        // Performance Metrics
        document.getElementById('corp-performance-stats').innerHTML = `
            <div class="performance-grid">
                <div class="performance-stat">
                    <div class="performance-stat-value ${profitMargin < 0 ? 'negative' : ''}">${profitMargin.toFixed(1)}%</div>
                    <div class="performance-stat-label">Profit Margin</div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${profitMargin < 0 ? 'negative' : ''}" style="width: ${Math.min(100, Math.abs(profitMargin))}%"></div>
                    </div>
                </div>
                <div class="performance-stat">
                    <div class="performance-stat-value">${corp.employees?.toLocaleString() || 0}</div>
                    <div class="performance-stat-label">Total Employees</div>
                </div>
                <div class="performance-stat">
                    <div class="performance-stat-value">${facilities.length}</div>
                    <div class="performance-stat-label">Total Facilities</div>
                </div>
                <div class="performance-stat">
                    <div class="performance-stat-value">${simulation.formatMoney(avgRevenuePerFacility)}</div>
                    <div class="performance-stat-label">Avg Revenue/Facility</div>
                </div>
                <div class="performance-stat">
                    <div class="performance-stat-value">${Math.round(avgEmployeesPerFacility)}</div>
                    <div class="performance-stat-label">Avg Employees/Facility</div>
                </div>
            </div>
        `;

        // Industry Breakdown
        const industryStats = {};
        facilities.forEach(f => {
            if (!industryStats[f.type]) {
                industryStats[f.type] = { count: 0, employees: 0, revenue: 0, profit: 0 };
            }
            industryStats[f.type].count++;
            industryStats[f.type].employees += f.totalEmployees || 0;
            industryStats[f.type].revenue += f.revenue || 0;
            industryStats[f.type].profit += f.profit || 0;
        });

        document.getElementById('corp-industry-breakdown').innerHTML = Object.keys(industryStats).length > 0 ? `
            <div class="industry-breakdown-list">
                ${Object.entries(industryStats).map(([type, stats]) => `
                    <div class="industry-breakdown-item">
                        <div class="industry-breakdown-header">
                            <span class="industry-breakdown-icon">${this.getIndustryIcon(type)}</span>
                            <span class="industry-breakdown-name">${type}</span>
                            <span class="industry-breakdown-count">${stats.count} ${stats.count === 1 ? 'facility' : 'facilities'}</span>
                        </div>
                        <div class="industry-breakdown-stats">
                            <span>${stats.employees} employees</span>
                            <span class="${stats.revenue < 0 ? 'negative' : ''}">${simulation.formatMoney(stats.revenue)} rev</span>
                            <span class="${stats.profit < 0 ? 'negative' : ''}">${simulation.formatMoney(stats.profit)} profit</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : '<div class="no-data">No facilities yet</div>';

        // Geographic Presence
        const citiesMap = {};
        facilities.forEach(f => {
            const cityName = f.city?.name || 'Unknown';
            const cityId = f.city?.id;
            if (!citiesMap[cityName]) {
                citiesMap[cityName] = { id: cityId, count: 0, employees: 0, types: new Set() };
            }
            citiesMap[cityName].count++;
            citiesMap[cityName].employees += f.totalEmployees || 0;
            citiesMap[cityName].types.add(f.type);
        });

        const cities = Object.entries(citiesMap);
        document.getElementById('corp-cities-count').textContent = `${cities.length} Cities`;
        document.getElementById('corp-cities-list').innerHTML = cities.length > 0 ? `
            <div class="corp-cities-grid">
                ${cities.map(([cityName, data]) => `
                    <div class="corp-city-card" data-city-id="${data.id}">
                        <div class="corp-city-name">📍 ${cityName}</div>
                        <div class="corp-city-stats">
                            <span>${data.count} ${data.count === 1 ? 'facility' : 'facilities'}</span>
                            <span>${data.employees} employees</span>
                        </div>
                        <div class="corp-city-types">
                            ${Array.from(data.types).map(t => `<span class="mini-badge ${t.toLowerCase()}">${t}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : '<div class="no-data">No geographic presence</div>';

        // Add click handlers for city cards
        document.querySelectorAll('.corp-city-card').forEach(card => {
            card.addEventListener('click', () => {
                const cityId = card.dataset.cityId;
                if (cityId) this.showCityDetail(cityId);
            });
        });

        // Update facilities count badge
        document.getElementById('facilities-count').textContent = `${facilities.length} Facilities`;

        // Filter buttons for firms
        const allTypes = ['ALL', ...new Set(facilities.map(f => f.type))];
        document.getElementById('corp-firms-filter').innerHTML = `
            <div class="filter-buttons">
                ${allTypes.map(type => `
                    <button class="filter-btn ${type === 'ALL' ? 'active' : ''}" data-filter="${type}">
                        ${type === 'ALL' ? 'All' : type} ${type !== 'ALL' ? `(${industryStats[type]?.count || 0})` : ''}
                    </button>
                `).join('')}
            </div>
        `;

        // Add filter click handlers
        document.querySelectorAll('#corp-firms-filter .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#corp-firms-filter .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderCorpFirmsList(corp, btn.dataset.filter, simulation);
            });
        });

        // Render firms list
        this.renderCorpFirmsList(corp, 'ALL', simulation);
    }

    renderCorpFirmsList(corp, filter, simulation) {
        const facilities = corp.facilities || [];
        const filteredFirms = filter === 'ALL' ? facilities : facilities.filter(f => f.type === filter);

        document.getElementById('corp-firms-list').innerHTML = filteredFirms.length > 0 ?
            filteredFirms.map(firm => `
                <div class="firm-card clickable" data-firm-id="${firm.id}">
                    <div class="firm-card-header">
                        <span class="firm-type">${this.getFirmDisplayName(firm)}</span>
                        <span class="firm-type-badge ${firm.type.toLowerCase()}">${firm.type}</span>
                    </div>
                    <div class="firm-location">📍 ${firm.city?.name || 'Unknown City'}</div>
                    <div class="firm-stats">
                        <div class="firm-stat">
                            <div class="firm-stat-value">${firm.totalEmployees || 0}</div>
                            <div class="firm-stat-label">Employees</div>
                        </div>
                        <div class="firm-stat">
                            <div class="firm-stat-value ${(firm.revenue || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(firm.revenue || 0)}</div>
                            <div class="firm-stat-label">Revenue</div>
                        </div>
                        <div class="firm-stat">
                            <div class="firm-stat-value ${(firm.profit || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(firm.profit || 0)}</div>
                            <div class="firm-stat-label">Profit</div>
                        </div>
                        <div class="firm-stat">
                            <div class="firm-stat-value ${(firm.cash || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(firm.cash || 0)}</div>
                            <div class="firm-stat-label">Cash</div>
                        </div>
                    </div>
                    ${this.getFirmDetailedInfo(firm, simulation)}
                </div>
            `).join('')
            : '<div class="no-data">No facilities match the selected filter</div>';

        // Add click handlers for firm cards
        document.querySelectorAll('#corp-firms-list .firm-card.clickable').forEach(card => {
            card.addEventListener('click', () => {
                const firmId = card.dataset.firmId;
                this.showFirmDetail(firmId);
            });
        });
    }

    getFirmDisplayName(firm) {
        switch (firm.type) {
            case 'MINING': return `${firm.resourceType || 'Mining'} Mine`;
            case 'LOGGING': return `${firm.timberType || 'Timber'} Operation`;
            case 'FARM': return `${firm.cropType || firm.livestockType || 'Farm'} Farm`;
            case 'MANUFACTURING': return `${firm.productType || 'Manufacturing'} Plant`;
            case 'RETAIL': return `${firm.storeType || 'Retail'} Store`;
            case 'BANK': return `${firm.bankType || 'Commercial'} Bank`;
            default: return firm.type;
        }
    }

    getFirmSpecificInfo(firm, simulation) {
        let info = '';
        switch (firm.type) {
            case 'MINING':
                info = `<div class="firm-stats" style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <div class="firm-stat">
                        <div class="firm-stat-value">${firm.inventory?.quantity?.toFixed(0) || 0}</div>
                        <div class="firm-stat-label">Inventory</div>
                    </div>
                    <div class="firm-stat">
                        <div class="firm-stat-value">${firm.depletionRate?.toFixed(1) || 0}%</div>
                        <div class="firm-stat-label">Depleted</div>
                    </div>
                </div>`;
                break;
            case 'MANUFACTURING':
                info = `<div class="firm-stats" style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <div class="firm-stat">
                        <div class="firm-stat-value">${firm.finishedGoodsInventory?.quantity?.toFixed(0) || 0}</div>
                        <div class="firm-stat-label">Finished Goods</div>
                    </div>
                    <div class="firm-stat">
                        <div class="firm-stat-value">${(firm.defectRate * 100)?.toFixed(1) || 0}%</div>
                        <div class="firm-stat-label">Defect Rate</div>
                    </div>
                </div>`;
                break;
            case 'RETAIL':
                info = `<div class="firm-stats" style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <div class="firm-stat">
                        <div class="firm-stat-value">${firm.productInventory?.size || 0}</div>
                        <div class="firm-stat-label">Products</div>
                    </div>
                    <div class="firm-stat">
                        <div class="firm-stat-value">${(firm.customerSatisfaction)?.toFixed(0) || 0}%</div>
                        <div class="firm-stat-label">Satisfaction</div>
                    </div>
                </div>`;
                break;
        }
        return info;
    }

    showMainDashboard() {
        // Hide all detail views (with null checks since elements may not exist)
        document.getElementById('corp-detail-view')?.classList.add('hidden');
        document.getElementById('city-detail-view')?.classList.add('hidden');
        document.getElementById('all-corps-view')?.classList.add('hidden');
        document.getElementById('all-cities-view')?.classList.add('hidden');
        document.getElementById('firm-detail-view')?.classList.add('hidden');
        document.getElementById('market-activity-view')?.classList.add('hidden');
        document.getElementById('main-dashboard')?.classList.remove('hidden');
        this.previousView = null;
    }

    goBackFromFirm() {
        document.getElementById('firm-detail-view')?.classList.add('hidden');

        if (this.previousView === 'corp-detail' && this.currentCorp) {
            document.getElementById('corp-detail-view')?.classList.remove('hidden');
        } else if (this.previousView === 'city-detail' && this.currentCity) {
            document.getElementById('city-detail-view')?.classList.remove('hidden');
        } else {
            document.getElementById('main-dashboard')?.classList.remove('hidden');
        }
    }

    showFirmDetail(firmId) {
        // Redirect to firms page instead of internal view
        window.location.href = `firms.html?id=${firmId}`;
        return;

        // Legacy code below - kept for reference but not executed
        const simulation = this.getSimulation();
        const firm = simulation.firms.get(firmId);
        if (!firm) return;

        // Store previous view for back navigation
        const corpDetailView = document.getElementById('corp-detail-view');
        const cityDetailView = document.getElementById('city-detail-view');
        if (corpDetailView && !corpDetailView.classList.contains('hidden')) {
            this.previousView = 'corp-detail';
        } else if (cityDetailView && !cityDetailView.classList.contains('hidden')) {
            this.previousView = 'city-detail';
        } else {
            this.previousView = 'main';
        }

        // Hide all views
        document.getElementById('main-dashboard')?.classList.add('hidden');
        document.getElementById('corp-detail-view')?.classList.add('hidden');
        document.getElementById('city-detail-view')?.classList.add('hidden');
        document.getElementById('all-corps-view')?.classList.add('hidden');
        document.getElementById('all-cities-view')?.classList.add('hidden');
        document.getElementById('firm-detail-view')?.classList.remove('hidden');

        // Update firm name and type badge
        document.getElementById('firm-detail-name').textContent = this.getFirmDisplayName(firm);
        document.getElementById('firm-detail-type-badge').innerHTML = `
            <span class="firm-type-badge large ${firm.type.toLowerCase()}">${firm.type}</span>
        `;

        // Get corporation info
        const corp = simulation.corporations.find(c => c.id === firm.corporationId);

        // Overview stats
        document.getElementById('firm-overview-stats').innerHTML = `
            <div class="firm-overview-grid">
                <div class="firm-overview-item clickable" data-corp-id="${firm.corporationId}">
                    <div class="firm-overview-label">Corporation</div>
                    <div class="firm-overview-value">${corp?.name || 'Independent'}</div>
                </div>
                <div class="firm-overview-item clickable" data-city-id="${firm.city?.id}">
                    <div class="firm-overview-label">Location</div>
                    <div class="firm-overview-value">📍 ${firm.city?.name || 'Unknown'}</div>
                </div>
                <div class="firm-overview-item">
                    <div class="firm-overview-label">Country</div>
                    <div class="firm-overview-value">${firm.country?.name || firm.city?.country?.name || 'Unknown'}</div>
                </div>
                <div class="firm-overview-item">
                    <div class="firm-overview-label">Total Employees</div>
                    <div class="firm-overview-value">${firm.totalEmployees || 0}</div>
                </div>
                <div class="firm-overview-item">
                    <div class="firm-overview-label">Technology Level</div>
                    <div class="firm-overview-value">Level ${firm.technologyLevel || 1}</div>
                </div>
                <div class="firm-overview-item">
                    <div class="firm-overview-label">Brand Rating</div>
                    <div class="firm-overview-value">${firm.brandRating || 0}/100</div>
                </div>
            </div>
        `;

        // Add click handlers for corp and city
        document.querySelectorAll('#firm-overview-stats .clickable').forEach(item => {
            item.addEventListener('click', () => {
                if (item.dataset.corpId) {
                    this.showCorporationDetail(parseInt(item.dataset.corpId));
                } else if (item.dataset.cityId) {
                    this.showCityDetail(item.dataset.cityId);
                }
            });
        });

        // Financial stats
        const monthlyLabor = firm.calculateLaborCosts ? firm.calculateLaborCosts() : 0;
        const monthlyOperating = firm.calculateMonthlyOperatingCosts ? firm.calculateMonthlyOperatingCosts() : 0;
        const costPerUnit = firm.calculateProductionCost ? firm.calculateProductionCost() : 0;

        document.getElementById('firm-financial-stats').innerHTML = `
            <div class="financial-detail-grid">
                <div class="financial-detail-item large">
                    <div class="financial-detail-value ${(firm.cash || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(firm.cash || 0)}</div>
                    <div class="financial-detail-label">Cash on Hand</div>
                </div>
                <div class="financial-detail-item">
                    <div class="financial-detail-value ${(firm.revenue || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(firm.revenue || 0)}</div>
                    <div class="financial-detail-label">Total Revenue</div>
                </div>
                <div class="financial-detail-item">
                    <div class="financial-detail-value ${(firm.profit || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(firm.profit || 0)}</div>
                    <div class="financial-detail-label">Net Profit</div>
                </div>
                <div class="financial-detail-item">
                    <div class="financial-detail-value">${simulation.formatMoney(firm.totalAssets || 0)}</div>
                    <div class="financial-detail-label">Total Assets</div>
                </div>
                <div class="financial-detail-item">
                    <div class="financial-detail-value">${simulation.formatMoney(costPerUnit)}</div>
                    <div class="financial-detail-label">Cost per Unit</div>
                </div>
            </div>
        `;

        // Production stats - type specific
        document.getElementById('firm-production-stats').innerHTML = this.getFirmProductionStats(firm, simulation);

        // Type-specific details
        document.getElementById('firm-specific-title').textContent = this.getFirmSpecificTitle(firm);
        document.getElementById('firm-specific-details').innerHTML = this.getFirmSpecificDetails(firm, simulation);

        // Labor structure
        document.getElementById('firm-total-employees').textContent = `${firm.totalEmployees || 0} Employees`;
        document.getElementById('firm-labor-structure').innerHTML = this.getFirmLaborStructure(firm, simulation);

        // Operating costs
        document.getElementById('firm-operating-costs').innerHTML = this.getFirmOperatingCosts(firm, simulation);

        // Products & Sales info
        document.getElementById('firm-product-info').innerHTML = this.getFirmProductInfo(firm, simulation);

        // Recent sales to other firms
        this.renderFirmSales(firm, simulation);

        // Recent purchases (from other firms and global market)
        this.renderFirmPurchases(firm, simulation);

        // Market orders and bids
        this.renderFirmBidsAndOrders(firm, simulation);
    }

    getFirmProductInfo(firm, simulation) {
        let html = '';

        switch (firm.type) {
            case 'MINING':
                html = `
                    <div class="product-info-header">
                        <span class="product-icon">⛏️</span>
                        <span class="product-name">${firm.resourceType || 'Raw Material'}</span>
                    </div>
                    <div class="product-info-details">
                        <div class="product-info-row">
                            <span>Product Tier:</span>
                            <span class="tier-badge tier-raw">RAW</span>
                        </div>
                        <div class="product-info-row">
                            <span>Current Stock:</span>
                            <span>${firm.inventory?.quantity?.toFixed(0) || 0} units</span>
                        </div>
                        <div class="product-info-row">
                            <span>Quality:</span>
                            <span>${firm.inventory?.quality?.toFixed(0) || 0}%</span>
                        </div>
                        <div class="product-info-row">
                            <span>Sells To:</span>
                            <span>Semi-Raw Processors</span>
                        </div>
                    </div>
                `;
                break;

            case 'LOGGING':
                html = `
                    <div class="product-info-header">
                        <span class="product-icon">🪵</span>
                        <span class="product-name">${firm.timberType || 'Timber'}</span>
                    </div>
                    <div class="product-info-details">
                        <div class="product-info-row">
                            <span>Product Tier:</span>
                            <span class="tier-badge tier-raw">RAW</span>
                        </div>
                        <div class="product-info-row">
                            <span>Current Stock:</span>
                            <span>${firm.inventory?.quantity?.toFixed(0) || 0} m³</span>
                        </div>
                        <div class="product-info-row">
                            <span>Quality:</span>
                            <span>${firm.inventory?.quality?.toFixed(0) || 0}%</span>
                        </div>
                        <div class="product-info-row">
                            <span>Sells To:</span>
                            <span>Lumber Mills, Furniture Makers</span>
                        </div>
                    </div>
                `;
                break;

            case 'FARM':
                const farmProduct = firm.farmType === 'CROP' ? firm.cropType : firm.livestockType;
                html = `
                    <div class="product-info-header">
                        <span class="product-icon">${firm.farmType === 'CROP' ? '🌾' : '🐄'}</span>
                        <span class="product-name">${farmProduct || 'Agricultural Product'}</span>
                    </div>
                    <div class="product-info-details">
                        <div class="product-info-row">
                            <span>Product Tier:</span>
                            <span class="tier-badge tier-raw">RAW</span>
                        </div>
                        <div class="product-info-row">
                            <span>Current Stock:</span>
                            <span>${firm.inventory?.quantity?.toFixed(0) || 0} ${firm.farmType === 'CROP' ? 'kg' : 'units'}</span>
                        </div>
                        <div class="product-info-row">
                            <span>Quality:</span>
                            <span>${firm.inventory?.quality?.toFixed(0) || 0}%</span>
                        </div>
                        <div class="product-info-row">
                            <span>Sells To:</span>
                            <span>Food Processors, Manufacturers</span>
                        </div>
                    </div>
                `;
                break;

            case 'MANUFACTURING':
                const product = firm.product;
                const tier = product?.tier || 'MANUFACTURED';
                const tierClass = tier === 'SEMI_RAW' ? 'tier-semi' : 'tier-manufactured';
                html = `
                    <div class="product-info-header">
                        <span class="product-icon">${product?.icon || '🏭'}</span>
                        <span class="product-name">${product?.name || 'Manufactured Product'}</span>
                    </div>
                    <div class="product-info-details">
                        <div class="product-info-row">
                            <span>Product Tier:</span>
                            <span class="tier-badge ${tierClass}">${tier}</span>
                        </div>
                        <div class="product-info-row">
                            <span>Base Price:</span>
                            <span>${simulation.formatMoney(product?.basePrice || 0)}</span>
                        </div>
                        <div class="product-info-row">
                            <span>Finished Stock:</span>
                            <span>${firm.finishedGoodsInventory?.quantity?.toFixed(0) || 0} units</span>
                        </div>
                        <div class="product-info-row">
                            <span>Sells To:</span>
                            <span>${tier === 'SEMI_RAW' ? 'Manufacturers' : 'Retail Stores'}</span>
                        </div>
                    </div>
                    <div class="product-info-inputs">
                        <div class="inputs-header">Required Inputs:</div>
                        ${(product?.inputs || []).map(input => `
                            <div class="input-item">
                                <span>${input.material}</span>
                                <span>${input.quantity} per unit</span>
                            </div>
                        `).join('') || '<div class="input-item">No inputs defined</div>'}
                    </div>
                `;
                break;

            case 'RETAIL':
                const productTypes = firm.productInventory?.size || 0;
                const totalStock = firm.productInventory ?
                    Array.from(firm.productInventory.values()).reduce((sum, inv) => sum + (inv.quantity || 0), 0) : 0;
                const totalInventoryValue = firm.currentInventoryValue || 0;

                // Build product inventory list
                let inventoryListHtml = '';
                if (firm.productInventory && firm.productInventory.size > 0) {
                    inventoryListHtml = '<div class="retail-inventory-list"><div class="inventory-list-header">Current Inventory:</div>';
                    firm.productInventory.forEach((inv, productId) => {
                        const stockStatus = inv.quantity > 50 ? 'in-stock' : (inv.quantity > 0 ? 'low-stock' : 'out-of-stock');
                        // Get product name - try inventory, then lookup from registry, then use ID
                        let displayName = inv.productName;
                        if (!displayName || /^\d+$/.test(displayName)) {
                            // Try to look up product name from registry if it's a numeric ID
                            const product = simulation.productRegistry?.getProduct(parseInt(productId));
                            displayName = product?.name || `Product #${productId}`;
                        }
                        inventoryListHtml += `
                            <div class="inventory-item ${stockStatus}">
                                <span class="inv-product-name">${displayName}</span>
                                <span class="inv-quantity">${inv.quantity} units</span>
                                <span class="inv-price">${simulation.formatMoney(inv.retailPrice)}</span>
                            </div>
                        `;
                    });
                    inventoryListHtml += '</div>';
                }

                html = `
                    <div class="product-info-header">
                        <span class="product-icon">🏪</span>
                        <span class="product-name">${firm.storeType || 'Retail'} Store</span>
                    </div>
                    <div class="product-info-details">
                        <div class="product-info-row">
                            <span>Store Type:</span>
                            <span>${firm.storeType || 'General'}</span>
                        </div>
                        <div class="product-info-row">
                            <span>Product Types:</span>
                            <span>${productTypes} types</span>
                        </div>
                        <div class="product-info-row">
                            <span>Total Stock:</span>
                            <span>${totalStock.toFixed(0)} units</span>
                        </div>
                        <div class="product-info-row">
                            <span>Inventory Value:</span>
                            <span>${simulation.formatMoney(totalInventoryValue)}</span>
                        </div>
                        <div class="product-info-row">
                            <span>Daily Customers:</span>
                            <span>${firm.dailyCustomers || 0}</span>
                        </div>
                        <div class="product-info-row">
                            <span>Avg Transaction:</span>
                            <span>${simulation.formatMoney(firm.averageTransactionValue || 0)}</span>
                        </div>
                        <div class="product-info-row">
                            <span>Sells To:</span>
                            <span>Consumers</span>
                        </div>
                    </div>
                    ${inventoryListHtml}
                `;
                break;

            case 'BANK':
                html = `
                    <div class="product-info-header">
                        <span class="product-icon">🏦</span>
                        <span class="product-name">${firm.bankType || 'Banking'} Services</span>
                    </div>
                    <div class="product-info-details">
                        <div class="product-info-row">
                            <span>Services:</span>
                            <span>Deposits, Loans, Payments</span>
                        </div>
                        <div class="product-info-row">
                            <span>Interest Rate:</span>
                            <span>${((firm.interestRate || 0.05) * 100).toFixed(2)}%</span>
                        </div>
                        <div class="product-info-row">
                            <span>Customers:</span>
                            <span>Firms & Corporations</span>
                        </div>
                    </div>
                `;
                break;

            default:
                html = `<div class="product-info-empty">No product information available</div>`;
        }

        return html;
    }

    renderFirmSales(firm, simulation) {
        const transactionLog = simulation.transactionLog;
        if (!transactionLog) {
            document.getElementById('firm-sales-tbody').innerHTML =
                '<tr><td colspan="6" class="no-transactions">Transaction logging not available</td></tr>';
            return;
        }

        // Get all transactions where this firm is the seller
        const allTransactions = transactionLog.transactions || [];
        const firmSales = allTransactions
            .filter(t => t.seller?.id === firm.id)
            .slice(-50)
            .reverse();

        document.getElementById('firm-sales-count').textContent = `${firmSales.length} Sales`;

        if (firmSales.length === 0) {
            document.getElementById('firm-sales-tbody').innerHTML =
                '<tr><td colspan="6" class="no-transactions">No sales recorded yet</td></tr>';
            return;
        }

        document.getElementById('firm-sales-tbody').innerHTML = firmSales.map(t => {
            const timeDisplay = t.gameTime || new Date(t.timestamp).toLocaleTimeString();
            const total = t.totalCost || t.totalRevenue || 0;
            return `
                <tr class="transaction-row">
                    <td class="tx-time">${timeDisplay}</td>
                    <td class="tx-buyer">
                        <div class="tx-party">
                            <span class="tx-party-name">${this.truncate(t.buyer?.name || t.buyer?.type || 'Unknown', 20)}</span>
                            <span class="tx-party-city">${t.buyer?.city || ''}</span>
                        </div>
                    </td>
                    <td class="tx-material">${t.material || t.product || '-'}</td>
                    <td class="tx-quantity">${t.quantity?.toLocaleString() || '-'}</td>
                    <td class="tx-unit-price">${simulation.formatMoney(t.unitPrice || 0)}</td>
                    <td class="tx-value">${simulation.formatMoney(total)}</td>
                </tr>
            `;
        }).join('');
    }

    renderFirmPurchases(firm, simulation) {
        const transactionLog = simulation.transactionLog;
        if (!transactionLog) {
            document.getElementById('firm-purchases-tbody').innerHTML =
                '<tr><td colspan="7" class="no-transactions">Transaction logging not available</td></tr>';
            return;
        }

        // Get all transactions where this firm is the buyer
        const allTransactions = transactionLog.transactions || [];
        const firmPurchases = allTransactions
            .filter(t => t.buyer?.id === firm.id)
            .slice(-50)
            .reverse();

        document.getElementById('firm-purchases-count').textContent = `${firmPurchases.length} Purchases`;

        if (firmPurchases.length === 0) {
            document.getElementById('firm-purchases-tbody').innerHTML =
                '<tr><td colspan="7" class="no-transactions">No purchases recorded yet</td></tr>';
            return;
        }

        document.getElementById('firm-purchases-tbody').innerHTML = firmPurchases.map(t => {
            const timestamp = new Date(t.timestamp).toLocaleTimeString();
            const total = t.totalCost || 0;
            const isGlobalMarket = t.type === 'GLOBAL_MARKET';
            const sourceClass = isGlobalMarket ? 'source-global' : 'source-local';
            const sourceLabel = isGlobalMarket ? 'Global Market' : 'Local';

            return `
                <tr class="transaction-row">
                    <td class="tx-time">${timestamp}</td>
                    <td class="tx-seller">
                        <div class="tx-party">
                            <span class="tx-party-name">${this.truncate(t.seller?.name || 'Unknown', 20)}</span>
                            <span class="tx-party-city">${t.seller?.city || t.seller?.region || ''}</span>
                        </div>
                    </td>
                    <td class="tx-material">${t.material || t.product || '-'}</td>
                    <td class="tx-quantity">${t.quantity?.toLocaleString() || '-'}</td>
                    <td class="tx-unit-price">${simulation.formatMoney(t.unitPrice || 0)}</td>
                    <td class="tx-value">${simulation.formatMoney(total)}</td>
                    <td class="tx-source"><span class="source-badge ${sourceClass}">${sourceLabel}</span></td>
                </tr>
            `;
        }).join('');
    }

    renderFirmBidsAndOrders(firm, simulation) {
        const gm = simulation.globalMarket;
        if (!gm) {
            document.getElementById('firm-bids-summary').innerHTML =
                '<p class="no-data">Global market not available</p>';
            return;
        }

        const firmId = firm.id;

        // Find orders won by this firm (pending delivery)
        const ordersWon = (gm.pendingOrders || []).filter(o =>
            o.status === 'AWARDED' && o.winningBid?.firmId === firmId
        );

        // Find completed orders by this firm
        const completedOrders = (gm.completedOrders || []).filter(o =>
            o.winningBid?.firmId === firmId
        );

        // Find active bids by this firm (orders in bidding state)
        const activeBids = [];
        (gm.biddingOrders || []).forEach(order => {
            if (order.status === 'BIDDING' && order.bids) {
                const firmBid = order.bids.find(b => b.firmId === firmId);
                if (firmBid) {
                    activeBids.push({ order, bid: firmBid });
                }
            }
        });

        // Calculate stats
        const totalOrdersWon = ordersWon.length + completedOrders.length;
        const totalBidsPlaced = activeBids.length;
        const totalRevenue = [...ordersWon, ...completedOrders].reduce(
            (sum, o) => sum + (o.winningBid?.totalBidValue || 0), 0
        );
        const pendingValue = ordersWon.reduce(
            (sum, o) => sum + (o.winningBid?.totalBidValue || 0), 0
        );

        // Update badge
        document.getElementById('firm-orders-count').textContent = `${totalOrdersWon} Orders`;

        // Render summary stats
        document.getElementById('firm-bids-summary').innerHTML = `
            <div class="bids-summary-grid">
                <div class="bids-summary-stat">
                    <span class="bids-stat-value">${totalOrdersWon}</span>
                    <span class="bids-stat-label">Total Orders Won</span>
                </div>
                <div class="bids-summary-stat">
                    <span class="bids-stat-value">${ordersWon.length}</span>
                    <span class="bids-stat-label">Pending Delivery</span>
                </div>
                <div class="bids-summary-stat">
                    <span class="bids-stat-value">${completedOrders.length}</span>
                    <span class="bids-stat-label">Delivered</span>
                </div>
                <div class="bids-summary-stat">
                    <span class="bids-stat-value">${totalBidsPlaced}</span>
                    <span class="bids-stat-label">Active Bids</span>
                </div>
                <div class="bids-summary-stat">
                    <span class="bids-stat-value">${simulation.formatMoney(totalRevenue)}</span>
                    <span class="bids-stat-label">Total Revenue</span>
                </div>
                <div class="bids-summary-stat">
                    <span class="bids-stat-value">${simulation.formatMoney(pendingValue)}</span>
                    <span class="bids-stat-label">Pending Value</span>
                </div>
            </div>
        `;

        // Render orders won (pending delivery)
        const ordersWonList = document.getElementById('firm-orders-won-list');
        if (ordersWon.length === 0) {
            ordersWonList.innerHTML = '<p class="no-data">No pending orders</p>';
        } else {
            ordersWonList.innerHTML = ordersWon.slice(0, 10).map(order => `
                <div class="firm-bid-item order-won">
                    <div class="bid-item-left">
                        <span class="bid-product">${order.productName}</span>
                        <span class="bid-details">${order.quantity} units • ${order.deliveryLocation || 'Unknown'}</span>
                    </div>
                    <div class="bid-item-center">
                        <span class="bid-deadline">Due: ${order.deliveryHoursRemaining || 0}h</span>
                    </div>
                    <div class="bid-item-right">
                        <span class="bid-value">${simulation.formatMoney(order.winningBid?.totalBidValue || 0)}</span>
                        <span class="bid-status status-awarded">Awarded</span>
                    </div>
                </div>
            `).join('');
        }

        // Render active bids
        const activeBidsList = document.getElementById('firm-active-bids-list');
        if (activeBids.length === 0) {
            activeBidsList.innerHTML = '<p class="no-data">No active bids</p>';
        } else {
            activeBidsList.innerHTML = activeBids.slice(0, 10).map(({ order, bid }) => {
                const bidCount = order.bids?.length || 0;
                const isHighest = order.bids && order.bids[0]?.firmId === firmId;
                return `
                    <div class="firm-bid-item active-bid ${isHighest ? 'highest-bid' : ''}">
                        <div class="bid-item-left">
                            <span class="bid-product">${order.productName}</span>
                            <span class="bid-details">${order.quantity} units • ${bidCount} total bids</span>
                        </div>
                        <div class="bid-item-center">
                            <span class="bid-price-label">Your Bid:</span>
                            <span class="bid-price">${simulation.formatMoney(bid.totalBidValue || 0)}</span>
                        </div>
                        <div class="bid-item-right">
                            <span class="bid-rank">${isHighest ? '🥇 Highest' : '📊 Competing'}</span>
                            <span class="bid-status status-bidding">Bidding</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Render completed orders
        const completedList = document.getElementById('firm-completed-orders-list');
        if (completedOrders.length === 0) {
            completedList.innerHTML = '<p class="no-data">No completed deliveries</p>';
        } else {
            completedList.innerHTML = completedOrders.slice(-10).reverse().map(order => `
                <div class="firm-bid-item order-completed">
                    <div class="bid-item-left">
                        <span class="bid-product">${order.productName}</span>
                        <span class="bid-details">${order.quantity} units • ${order.deliveryLocation || 'Unknown'}</span>
                    </div>
                    <div class="bid-item-center">
                        <span class="bid-delivered">Delivered</span>
                    </div>
                    <div class="bid-item-right">
                        <span class="bid-value">${simulation.formatMoney(order.winningBid?.totalBidValue || 0)}</span>
                        <span class="bid-status status-delivered">Completed</span>
                    </div>
                </div>
            `).join('');
        }
    }

    getFirmProductionStats(firm, simulation) {
        let stats = '<div class="production-stats-grid">';

        switch (firm.type) {
            case 'MINING':
                stats += `
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.actualExtractionRate?.toFixed(2) || 0}</div>
                        <div class="production-stat-label">Extraction Rate/Hour</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.inventory?.quantity?.toFixed(0) || 0}</div>
                        <div class="production-stat-label">Current Inventory</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.inventory?.storageCapacity || 0}</div>
                        <div class="production-stat-label">Storage Capacity</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.inventory?.quality?.toFixed(0) || 0}%</div>
                        <div class="production-stat-label">Quality</div>
                    </div>
                `;
                break;
            case 'LOGGING':
                stats += `
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.actualHarvestRate?.toFixed(2) || 0} m³</div>
                        <div class="production-stat-label">Harvest Rate/Hour</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.inventory?.quantity?.toFixed(0) || 0} m³</div>
                        <div class="production-stat-label">Current Inventory</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.inventory?.storageCapacity || 0} m³</div>
                        <div class="production-stat-label">Storage Capacity</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.inventory?.quality?.toFixed(0) || 0}%</div>
                        <div class="production-stat-label">Quality</div>
                    </div>
                `;
                break;
            case 'FARM':
                if (firm.farmType === 'CROP') {
                    stats += `
                        <div class="production-stat">
                            <div class="production-stat-value">${firm.currentGrowthStage?.toFixed(1) || 0}%</div>
                            <div class="production-stat-label">Growth Stage</div>
                        </div>
                        <div class="production-stat">
                            <div class="production-stat-value">${firm.yieldPerHectare?.toFixed(0) || 0} kg/ha</div>
                            <div class="production-stat-label">Yield per Hectare</div>
                        </div>
                    `;
                } else {
                    stats += `
                        <div class="production-stat">
                            <div class="production-stat-value">${firm.currentMaturity?.toFixed(1) || 0}%</div>
                            <div class="production-stat-label">Maturity</div>
                        </div>
                        <div class="production-stat">
                            <div class="production-stat-value">${firm.herdSize || 0}</div>
                            <div class="production-stat-label">Herd Size</div>
                        </div>
                    `;
                }
                stats += `
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.inventory?.quantity?.toFixed(0) || 0} kg</div>
                        <div class="production-stat-label">Inventory</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.inventory?.quality?.toFixed(0) || 0}%</div>
                        <div class="production-stat-label">Quality</div>
                    </div>
                `;
                break;
            case 'MANUFACTURING':
                stats += `
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.unitsPerHour?.toFixed(1) || 0}</div>
                        <div class="production-stat-label">Units per Hour</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.finishedGoodsInventory?.quantity?.toFixed(0) || 0}</div>
                        <div class="production-stat-label">Finished Goods</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${((firm.capacityUtilization || 0) * 100).toFixed(0)}%</div>
                        <div class="production-stat-label">Capacity Utilization</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${((firm.defectRate || 0) * 100).toFixed(1)}%</div>
                        <div class="production-stat-label">Defect Rate</div>
                    </div>
                `;
                break;
            case 'RETAIL':
                stats += `
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.productInventory?.size || 0}</div>
                        <div class="production-stat-label">Product Types</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.dailyCustomers || 0}</div>
                        <div class="production-stat-label">Daily Customers</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${firm.customerSatisfaction?.toFixed(0) || 0}%</div>
                        <div class="production-stat-label">Satisfaction</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${simulation.formatMoney(firm.averageTransactionValue || 0)}</div>
                        <div class="production-stat-label">Avg Transaction</div>
                    </div>
                `;
                break;
            case 'BANK':
                stats += `
                    <div class="production-stat">
                        <div class="production-stat-value">${simulation.formatMoney(firm.totalDeposits || 0)}</div>
                        <div class="production-stat-label">Total Deposits</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${simulation.formatMoney(firm.totalLoans || 0)}</div>
                        <div class="production-stat-label">Total Loans</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${((firm.interestRate || 0.05) * 100).toFixed(2)}%</div>
                        <div class="production-stat-label">Interest Rate</div>
                    </div>
                    <div class="production-stat">
                        <div class="production-stat-value">${((firm.defaultRate || 0) * 100).toFixed(2)}%</div>
                        <div class="production-stat-label">Default Rate</div>
                    </div>
                `;
                break;
        }

        stats += '</div>';
        return stats;
    }

    getFirmSpecificTitle(firm) {
        switch (firm.type) {
            case 'MINING': return `⛏️ ${firm.resourceType || 'Mining'} Operations`;
            case 'LOGGING': return `🪵 ${firm.timberType || 'Timber'} Operations`;
            case 'FARM': return `🌾 ${firm.farmType === 'CROP' ? firm.cropType : firm.livestockType} Operations`;
            case 'MANUFACTURING': return `🏭 ${firm.productType || 'Manufacturing'} Production`;
            case 'RETAIL': return `🏪 ${firm.storeType || 'Retail'} Operations`;
            case 'BANK': return `🏦 ${firm.bankType || 'Banking'} Services`;
            default: return '🏢 Operations';
        }
    }

    getFirmSpecificDetails(firm, simulation) {
        let html = '<div class="specific-details-grid">';

        switch (firm.type) {
            case 'MINING':
                const reservePercent = ((firm.remainingReserves / firm.totalReserves) * 100) || 0;
                html += `
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Resource Information</div>
                        <div class="specific-detail-row"><span>Resource Type:</span><span>${firm.resourceType}</span></div>
                        <div class="specific-detail-row"><span>Mine Type:</span><span>${firm.mineType}</span></div>
                        <div class="specific-detail-row"><span>Reserve Quality:</span><span>${firm.reserveQuality?.toFixed(0)}%</span></div>
                    </div>
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Reserves</div>
                        <div class="specific-detail-row"><span>Total Reserves:</span><span>${firm.totalReserves?.toLocaleString()}</span></div>
                        <div class="specific-detail-row"><span>Remaining:</span><span>${firm.remainingReserves?.toLocaleString()}</span></div>
                        <div class="specific-detail-row"><span>Depleted:</span><span>${firm.depletionRate?.toFixed(2)}%</span></div>
                        <div class="reserve-bar"><div class="reserve-bar-fill" style="width: ${reservePercent}%"></div></div>
                    </div>
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Equipment</div>
                        <div class="specific-detail-row"><span>Equipment Level:</span><span>${firm.equipmentLevel}</span></div>
                        <div class="specific-detail-row"><span>Efficiency:</span><span>${((firm.equipmentEfficiency || 1) * 100).toFixed(0)}%</span></div>
                        <div class="specific-detail-row"><span>Degradation:</span><span>${firm.equipmentDegradation?.toFixed(1)}%</span></div>
                    </div>
                `;
                break;

            case 'LOGGING':
                html += `
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Forest Information</div>
                        <div class="specific-detail-row"><span>Timber Type:</span><span>${firm.timberType}</span></div>
                        <div class="specific-detail-row"><span>Forest Type:</span><span>${firm.forestType}</span></div>
                        <div class="specific-detail-row"><span>Forest Size:</span><span>${firm.forestSize?.toFixed(0)} hectares</span></div>
                    </div>
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Forest Health</div>
                        <div class="specific-detail-row"><span>Tree Density:</span><span>${firm.forestDensity?.toFixed(0)} trees/ha</span></div>
                        <div class="specific-detail-row"><span>Average Tree Age:</span><span>${firm.averageTreeAge?.toFixed(0)} years</span></div>
                        <div class="specific-detail-row"><span>Forest Health:</span><span>${firm.forestHealth?.toFixed(0)}%</span></div>
                        <div class="health-bar"><div class="health-bar-fill" style="width: ${firm.forestHealth}%"></div></div>
                    </div>
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Sustainability</div>
                        <div class="specific-detail-row"><span>Sustainable Yield:</span><span>${(firm.sustainableYieldRate * 100).toFixed(1)}%/year</span></div>
                        <div class="specific-detail-row"><span>Reforestation Rate:</span><span>${(firm.reforestationRate * 100).toFixed(1)}%/year</span></div>
                        <div class="specific-detail-row"><span>Certified:</span><span>${firm.certifiedSustainable ? '✓ Yes' : '✗ No'}</span></div>
                    </div>
                `;
                break;

            case 'FARM':
                if (firm.farmType === 'CROP') {
                    html += `
                        <div class="specific-detail-card">
                            <div class="specific-detail-header">Farm Information</div>
                            <div class="specific-detail-row"><span>Crop Type:</span><span>${firm.cropType}</span></div>
                            <div class="specific-detail-row"><span>Land Size:</span><span>${firm.landSize?.toFixed(0)} hectares</span></div>
                            <div class="specific-detail-row"><span>Climate:</span><span>${firm.climate}</span></div>
                        </div>
                        <div class="specific-detail-card">
                            <div class="specific-detail-header">Soil & Growth</div>
                            <div class="specific-detail-row"><span>Soil Quality:</span><span>${firm.soilQuality?.toFixed(0)}%</span></div>
                            <div class="specific-detail-row"><span>Growing Season:</span><span>${firm.growingSeasonLength} days</span></div>
                            <div class="specific-detail-row"><span>Growth Stage:</span><span>${firm.currentGrowthStage?.toFixed(1)}%</span></div>
                            <div class="growth-bar"><div class="growth-bar-fill" style="width: ${firm.currentGrowthStage}%"></div></div>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="specific-detail-card">
                            <div class="specific-detail-header">Farm Information</div>
                            <div class="specific-detail-row"><span>Livestock Type:</span><span>${firm.livestockType}</span></div>
                            <div class="specific-detail-row"><span>Land Size:</span><span>${firm.landSize?.toFixed(0)} hectares</span></div>
                            <div class="specific-detail-row"><span>Herd Size:</span><span>${firm.herdSize} animals</span></div>
                        </div>
                        <div class="specific-detail-card">
                            <div class="specific-detail-header">Breeding</div>
                            <div class="specific-detail-row"><span>Breeding Cycle:</span><span>${firm.breedingCycle} days</span></div>
                            <div class="specific-detail-row"><span>Current Maturity:</span><span>${firm.currentMaturity?.toFixed(1)}%</span></div>
                            <div class="growth-bar"><div class="growth-bar-fill" style="width: ${firm.currentMaturity}%"></div></div>
                        </div>
                    `;
                }
                break;

            case 'MANUFACTURING':
                html += `
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Production Information</div>
                        <div class="specific-detail-row"><span>Product:</span><span>${firm.productType}</span></div>
                        <div class="specific-detail-row"><span>Production Lines:</span><span>${firm.productionLines || 1}</span></div>
                        <div class="specific-detail-row"><span>Shift Type:</span><span>${firm.shiftType || 'Standard'}</span></div>
                    </div>
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Quality Control</div>
                        <div class="specific-detail-row"><span>Quality Rating:</span><span>${firm.finishedGoodsInventory?.quality?.toFixed(0) || 0}%</span></div>
                        <div class="specific-detail-row"><span>Defect Rate:</span><span>${((firm.defectRate || 0) * 100).toFixed(2)}%</span></div>
                        <div class="specific-detail-row"><span>Capacity Used:</span><span>${((firm.capacityUtilization || 0) * 100).toFixed(0)}%</span></div>
                    </div>
                `;
                // Show raw materials
                if (firm.rawMaterialInventory && firm.rawMaterialInventory.size > 0) {
                    html += `<div class="specific-detail-card full-width">
                        <div class="specific-detail-header">Raw Material Inventory</div>
                        <div class="raw-materials-grid">`;
                    firm.rawMaterialInventory.forEach((inv, material) => {
                        html += `<div class="raw-material-item">
                            <span class="material-name">${material}</span>
                            <span class="material-qty">${inv.quantity?.toFixed(0) || 0} units</span>
                        </div>`;
                    });
                    html += `</div></div>`;
                }
                break;

            case 'RETAIL':
                html += `
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Store Information</div>
                        <div class="specific-detail-row"><span>Store Type:</span><span>${firm.storeType}</span></div>
                        <div class="specific-detail-row"><span>Store Size:</span><span>${firm.storeSize || 'Medium'}</span></div>
                        <div class="specific-detail-row"><span>Location Quality:</span><span>${firm.locationQuality || 'Standard'}</span></div>
                    </div>
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Customer Metrics</div>
                        <div class="specific-detail-row"><span>Daily Customers:</span><span>${firm.dailyCustomers || 0}</span></div>
                        <div class="specific-detail-row"><span>Satisfaction:</span><span>${firm.customerSatisfaction?.toFixed(0) || 0}%</span></div>
                        <div class="specific-detail-row"><span>Avg Transaction:</span><span>${simulation.formatMoney(firm.averageTransactionValue || 0)}</span></div>
                    </div>
                `;
                break;

            case 'BANK':
                html += `
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Bank Information</div>
                        <div class="specific-detail-row"><span>Bank Type:</span><span>${firm.bankType}</span></div>
                        <div class="specific-detail-row"><span>Branches:</span><span>${firm.branches || 1}</span></div>
                        <div class="specific-detail-row"><span>ATMs:</span><span>${firm.atms || 0}</span></div>
                    </div>
                    <div class="specific-detail-card">
                        <div class="specific-detail-header">Financial Metrics</div>
                        <div class="specific-detail-row"><span>Interest Rate:</span><span>${((firm.interestRate || 0.05) * 100).toFixed(2)}%</span></div>
                        <div class="specific-detail-row"><span>Reserve Ratio:</span><span>${((firm.reserveRatio || 0.1) * 100).toFixed(0)}%</span></div>
                        <div class="specific-detail-row"><span>Default Rate:</span><span>${((firm.defaultRate || 0) * 100).toFixed(2)}%</span></div>
                    </div>
                `;
                break;
        }

        html += '</div>';
        return html;
    }

    getFirmLaborStructure(firm, simulation) {
        if (!firm.laborStructure) return '<div class="no-data">No labor data available</div>';

        let html = '<div class="labor-structure-grid">';

        Object.entries(firm.laborStructure).forEach(([role, data]) => {
            const roleName = role.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
            const adjustedWage = data.wage * (firm.city?.salaryLevel || 1);

            html += `
                <div class="labor-role-card">
                    <div class="labor-role-header">
                        <span class="labor-role-name">${roleName}</span>
                        <span class="labor-role-count">${data.count}</span>
                    </div>
                    <div class="labor-role-details">
                        <div class="labor-detail">
                            <span class="labor-detail-label">Base Wage:</span>
                            <span class="labor-detail-value">${simulation.formatMoney(data.wage)}</span>
                        </div>
                        <div class="labor-detail">
                            <span class="labor-detail-label">Adjusted Wage:</span>
                            <span class="labor-detail-value">${simulation.formatMoney(adjustedWage)}</span>
                        </div>
                        <div class="labor-detail">
                            <span class="labor-detail-label">Monthly Cost:</span>
                            <span class="labor-detail-value">${simulation.formatMoney(data.count * adjustedWage * 1.3)}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    getFirmOperatingCosts(firm, simulation) {
        let costs = [];

        // Collect all cost properties
        const costProps = [
            'equipmentCosts', 'fuelCosts', 'maintenanceCosts', 'utilitiesCosts',
            'safetyEquipmentCosts', 'operationalExpenses', 'environmentalComplianceCost',
            'licensingFees', 'seedCosts', 'fertilizerCosts', 'pesticideCosts',
            'irrigationCosts', 'feedCosts', 'veterinaryCosts', 'shelterMaintenanceCosts',
            'seedlingCosts', 'certificationCosts', 'explosivesCosts'
        ];

        costProps.forEach(prop => {
            if (firm[prop] && firm[prop] > 0) {
                costs.push({
                    name: prop.replace(/([A-Z])/g, ' $1').replace(/Costs?$/, '').trim(),
                    value: firm[prop]
                });
            }
        });

        if (costs.length === 0) return '<div class="no-data">No operating cost data available</div>';

        const totalCosts = costs.reduce((sum, c) => sum + c.value, 0);
        const laborCosts = firm.calculateLaborCosts ? firm.calculateLaborCosts() : 0;

        let html = `
            <div class="operating-costs-summary">
                <div class="cost-summary-item">
                    <span class="cost-summary-label">Monthly Labor Costs:</span>
                    <span class="cost-summary-value">${simulation.formatMoney(laborCosts)}</span>
                </div>
                <div class="cost-summary-item">
                    <span class="cost-summary-label">Monthly Operating Costs:</span>
                    <span class="cost-summary-value">${simulation.formatMoney(totalCosts)}</span>
                </div>
                <div class="cost-summary-item total">
                    <span class="cost-summary-label">Total Monthly Costs:</span>
                    <span class="cost-summary-value">${simulation.formatMoney(laborCosts + totalCosts)}</span>
                </div>
            </div>
            <div class="operating-costs-grid">
        `;

        costs.forEach(cost => {
            const percent = ((cost.value / totalCosts) * 100).toFixed(1);
            html += `
                <div class="cost-item">
                    <div class="cost-item-header">
                        <span class="cost-item-name">${cost.name}</span>
                        <span class="cost-item-value">${simulation.formatMoney(cost.value)}</span>
                    </div>
                    <div class="cost-bar"><div class="cost-bar-fill" style="width: ${percent}%"></div></div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    showAllCities() {
        // Redirect to cities page instead of internal view
        window.location.href = 'cities.html';
        return;

        // Legacy code below - kept for reference but not executed
        const simulation = this.getSimulation();
        const cities = simulation.cities || [];

        // Hide main dashboard, show all cities view
        document.getElementById('main-dashboard')?.classList.add('hidden');
        document.getElementById('corp-detail-view')?.classList.add('hidden');
        document.getElementById('city-detail-view')?.classList.add('hidden');
        document.getElementById('all-corps-view')?.classList.add('hidden');
        document.getElementById('all-cities-view')?.classList.remove('hidden');

        // Update count
        document.getElementById('all-cities-count').textContent = `${cities.length} Cities`;

        // Calculate summary stats
        const totalPopulation = cities.reduce((sum, c) => sum + (c.population || 0), 0);
        const totalGDP = cities.reduce((sum, c) => sum + (c.totalPurchasingPower || 0), 0);
        const totalEmployed = cities.reduce((sum, c) => sum + (c.employed || 0), 0);
        const totalFirms = cities.reduce((sum, c) => sum + (c.firms?.length || 0), 0);
        const avgSalaryLevel = cities.length > 0 ? cities.reduce((sum, c) => sum + (c.salaryLevel || 0), 0) / cities.length : 0;
        const citiesWithAirport = cities.filter(c => c.hasAirport).length;
        const citiesWithSeaport = cities.filter(c => c.hasSeaport).length;
        const coastalCities = cities.filter(c => c.isCoastal).length;

        document.getElementById('cities-summary-stats').innerHTML = `
            <div class="summary-stats-grid">
                <div class="summary-stat">
                    <div class="summary-stat-value">${(totalPopulation / 1000000).toFixed(1)}M</div>
                    <div class="summary-stat-label">Total Population</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${simulation.formatMoney(totalGDP)}</div>
                    <div class="summary-stat-label">Combined GDP</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${totalEmployed.toLocaleString()}</div>
                    <div class="summary-stat-label">Total Employed</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${totalFirms}</div>
                    <div class="summary-stat-label">Total Firms</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${(avgSalaryLevel * 100).toFixed(0)}%</div>
                    <div class="summary-stat-label">Avg Salary Level</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${citiesWithAirport} / ${citiesWithSeaport} / ${coastalCities}</div>
                    <div class="summary-stat-label">Airport / Seaport / Coastal</div>
                </div>
            </div>
        `;

        // Populate country filter
        const countries = [...new Set(cities.map(c => c.country?.name).filter(Boolean))];
        const countrySelect = document.getElementById('cities-country-filter');
        countrySelect.innerHTML = '<option value="all">All Countries</option>' +
            countries.map(country => `<option value="${country}">${country}</option>`).join('');

        // Reset filters
        document.getElementById('cities-search-input').value = '';

        // Render cities
        this.renderAllCities();
    }

    renderAllCities() {
        const simulation = this.getSimulation();
        let cities = [...(simulation.cities || [])];

        // Apply infrastructure filter
        const infraFilter = document.getElementById('cities-infra-filter').value;
        switch (infraFilter) {
            case 'airport':
                cities = cities.filter(c => c.hasAirport);
                break;
            case 'seaport':
                cities = cities.filter(c => c.hasSeaport);
                break;
            case 'railway':
                cities = cities.filter(c => c.hasRailway);
                break;
            case 'coastal':
                cities = cities.filter(c => c.isCoastal);
                break;
        }

        // Apply country filter
        const countryFilter = document.getElementById('cities-country-filter').value;
        if (countryFilter !== 'all') {
            cities = cities.filter(c => c.country?.name === countryFilter);
        }

        // Apply search
        const searchValue = document.getElementById('cities-search-input').value.toLowerCase();
        if (searchValue) {
            cities = cities.filter(c =>
                c.name.toLowerCase().includes(searchValue) ||
                c.country?.name?.toLowerCase().includes(searchValue)
            );
        }

        // Apply sort
        const sortValue = document.getElementById('cities-sort-select').value;
        switch (sortValue) {
            case 'population-desc':
                cities.sort((a, b) => (b.population || 0) - (a.population || 0));
                break;
            case 'population-asc':
                cities.sort((a, b) => (a.population || 0) - (b.population || 0));
                break;
            case 'gdp-desc':
                cities.sort((a, b) => (b.totalPurchasingPower || 0) - (a.totalPurchasingPower || 0));
                break;
            case 'gdp-asc':
                cities.sort((a, b) => (a.totalPurchasingPower || 0) - (b.totalPurchasingPower || 0));
                break;
            case 'firms-desc':
                cities.sort((a, b) => (b.firms?.length || 0) - (a.firms?.length || 0));
                break;
            case 'salary-desc':
                cities.sort((a, b) => (b.salaryLevel || 0) - (a.salaryLevel || 0));
                break;
            case 'name-asc':
                cities.sort((a, b) => a.name.localeCompare(b.name));
                break;
        }

        // Render grid
        const grid = document.getElementById('all-cities-grid');
        grid.innerHTML = cities.length > 0 ? cities.map(city => {
            // Get industry breakdown for this city
            const industryCount = {};
            (city.firms || []).forEach(f => {
                industryCount[f.type] = (industryCount[f.type] || 0) + 1;
            });

            return `
                <div class="city-card" data-city-id="${city.id}">
                    <div class="city-card-header">
                        <div class="city-card-name">${city.name}</div>
                        <div class="city-card-country">${city.country?.name || 'Unknown'}</div>
                    </div>
                    <div class="city-card-population">
                        <span class="pop-value">${(city.population / 1000000).toFixed(2)}M</span>
                        <span class="pop-label">population</span>
                    </div>
                    <div class="city-card-stats">
                        <div class="city-card-stat">
                            <div class="city-card-stat-value">${city.formatCurrency ? city.formatCurrency(city.totalPurchasingPower || 0) : simulation.formatMoney(city.totalPurchasingPower || 0)}</div>
                            <div class="city-card-stat-label">GDP</div>
                        </div>
                        <div class="city-card-stat">
                            <div class="city-card-stat-value">${(city.salaryLevel * 100).toFixed(0)}%</div>
                            <div class="city-card-stat-label">Salary Level</div>
                        </div>
                        <div class="city-card-stat">
                            <div class="city-card-stat-value">${city.firms?.length || 0}</div>
                            <div class="city-card-stat-label">Firms</div>
                        </div>
                        <div class="city-card-stat">
                            <div class="city-card-stat-value">${city.employed?.toLocaleString() || 0}</div>
                            <div class="city-card-stat-label">Employed</div>
                        </div>
                    </div>
                    <div class="city-card-infrastructure">
                        <span class="infra-icon-badge ${city.hasAirport ? 'active' : ''}">✈️</span>
                        <span class="infra-icon-badge ${city.hasSeaport ? 'active' : ''}">⚓</span>
                        <span class="infra-icon-badge ${city.hasRailway ? 'active' : ''}">🚂</span>
                        <span class="infra-icon-badge ${city.isCoastal ? 'active' : ''}">🌊</span>
                    </div>
                    <div class="city-card-industries">
                        ${Object.entries(industryCount).map(([type, count]) =>
                            `<span class="mini-badge ${type.toLowerCase()}">${type} (${count})</span>`
                        ).join('') || '<span class="mini-badge none">No firms</span>'}
                    </div>
                </div>
            `;
        }).join('') : '<div class="no-data">No cities match your criteria</div>';

        // Add click handlers
        grid.querySelectorAll('.city-card').forEach(card => {
            card.addEventListener('click', () => {
                const cityId = card.dataset.cityId;
                this.showCityDetail(cityId);
            });
        });
    }

    showAllCorporations() {
        // Redirect to corporations page instead of internal view
        window.location.href = 'corporations.html';
        return;

        // Legacy code below - kept for reference but not executed
        const simulation = this.getSimulation();

        // Hide main dashboard, show all corps view
        document.getElementById('main-dashboard')?.classList.add('hidden');
        document.getElementById('corp-detail-view')?.classList.add('hidden');
        document.getElementById('city-detail-view')?.classList.add('hidden');
        document.getElementById('all-corps-view')?.classList.remove('hidden');

        // Update count
        document.getElementById('all-corps-count').textContent = `${simulation.corporations.length} Corporations`;

        // Calculate summary stats
        const totalRevenue = simulation.corporations.reduce((sum, c) => sum + (c.revenue || 0), 0);
        const totalProfit = simulation.corporations.reduce((sum, c) => sum + (c.profit || 0), 0);
        const totalEmployees = simulation.corporations.reduce((sum, c) => sum + (c.employees || 0), 0);
        const totalFacilities = simulation.corporations.reduce((sum, c) => sum + (c.facilities?.length || 0), 0);
        const profitableCorp = simulation.corporations.filter(c => (c.profit || 0) > 0).length;

        document.getElementById('corps-summary-stats').innerHTML = `
            <div class="summary-stats-grid">
                <div class="summary-stat">
                    <div class="summary-stat-value">${simulation.corporations.length}</div>
                    <div class="summary-stat-label">Total Corporations</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${simulation.formatMoney(totalRevenue)}</div>
                    <div class="summary-stat-label">Combined Revenue</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value ${totalProfit < 0 ? 'negative' : ''}">${simulation.formatMoney(totalProfit)}</div>
                    <div class="summary-stat-label">Combined Profit</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${totalEmployees.toLocaleString()}</div>
                    <div class="summary-stat-label">Total Employees</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${totalFacilities}</div>
                    <div class="summary-stat-label">Total Facilities</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${profitableCorp} / ${simulation.corporations.length}</div>
                    <div class="summary-stat-label">Profitable</div>
                </div>
            </div>
        `;

        // Reset filters
        document.getElementById('corps-search-input').value = '';

        // Render corporations
        this.renderAllCorporations();
    }

    renderAllCorporations() {
        const simulation = this.getSimulation();
        let corporations = [...simulation.corporations];

        // Apply filter
        const filterValue = document.getElementById('corps-filter-select').value;
        if (filterValue !== 'all') {
            corporations = corporations.filter(c => c.character === filterValue);
        }

        // Apply search
        const searchValue = document.getElementById('corps-search-input').value.toLowerCase();
        if (searchValue) {
            corporations = corporations.filter(c =>
                c.name.toLowerCase().includes(searchValue)
            );
        }

        // Apply sort
        const sortValue = document.getElementById('corps-sort-select').value;
        switch (sortValue) {
            case 'profit-desc':
                corporations.sort((a, b) => (b.profit || 0) - (a.profit || 0));
                break;
            case 'profit-asc':
                corporations.sort((a, b) => (a.profit || 0) - (b.profit || 0));
                break;
            case 'revenue-desc':
                corporations.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
                break;
            case 'revenue-asc':
                corporations.sort((a, b) => (a.revenue || 0) - (b.revenue || 0));
                break;
            case 'employees-desc':
                corporations.sort((a, b) => (b.employees || 0) - (a.employees || 0));
                break;
            case 'employees-asc':
                corporations.sort((a, b) => (a.employees || 0) - (b.employees || 0));
                break;
            case 'facilities-desc':
                corporations.sort((a, b) => (b.facilities?.length || 0) - (a.facilities?.length || 0));
                break;
            case 'name-asc':
                corporations.sort((a, b) => a.name.localeCompare(b.name));
                break;
        }

        // Render grid
        const grid = document.getElementById('all-corps-grid');
        grid.innerHTML = corporations.length > 0 ? corporations.map(corp => `
            <div class="corp-card" data-corp-id="${corp.id}" style="border-color: ${corp.color}">
                <div class="corp-card-header">
                    <div class="corp-card-name">${corp.name}</div>
                    <div class="corp-card-character ${corp.character.toLowerCase().replace('_', '-')}">${corp.character.replace('_', ' ')}</div>
                </div>
                <div class="corp-card-stats">
                    <div class="corp-card-stat">
                        <div class="corp-card-stat-value ${(corp.revenue || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(corp.revenue || 0)}</div>
                        <div class="corp-card-stat-label">Revenue</div>
                    </div>
                    <div class="corp-card-stat">
                        <div class="corp-card-stat-value ${(corp.profit || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(corp.profit || 0)}</div>
                        <div class="corp-card-stat-label">Profit</div>
                    </div>
                    <div class="corp-card-stat">
                        <div class="corp-card-stat-value">${(corp.employees || 0).toLocaleString()}</div>
                        <div class="corp-card-stat-label">Employees</div>
                    </div>
                    <div class="corp-card-stat">
                        <div class="corp-card-stat-value">${corp.facilities?.length || 0}</div>
                        <div class="corp-card-stat-label">Facilities</div>
                    </div>
                </div>
                <div class="corp-card-footer">
                    <div class="corp-card-cash">
                        <span class="cash-label">Cash:</span>
                        <span class="cash-value">${simulation.formatMoney(corp.cash || 0)}</span>
                    </div>
                    <div class="corp-card-industries">
                        ${this.getCorpIndustryBadges(corp)}
                    </div>
                </div>
            </div>
        `).join('') : '<div class="no-data">No corporations match your criteria</div>';

        // Add click handlers
        grid.querySelectorAll('.corp-card').forEach(card => {
            card.addEventListener('click', () => {
                const corpId = parseInt(card.dataset.corpId);
                this.showCorporationDetail(corpId);
            });
        });
    }

    getCorpIndustryBadges(corp) {
        if (!corp.facilities || corp.facilities.length === 0) {
            return '<span class="industry-badge none">No facilities</span>';
        }

        const industries = {};
        corp.facilities.forEach(f => {
            industries[f.type] = (industries[f.type] || 0) + 1;
        });

        return Object.entries(industries).map(([type, count]) =>
            `<span class="industry-badge ${type.toLowerCase()}">${type} (${count})</span>`
        ).join('');
    }

    showCityDetail(cityId) {
        // Redirect to cities page instead of internal view
        window.location.href = `cities.html?id=${cityId}`;
        return;

        // Legacy code below - kept for reference but not executed
        const simulation = this.getSimulation();
        const city = simulation.cities.find(c => c.id === cityId);
        if (!city) return;

        // Hide all views, show city detail view
        document.getElementById('main-dashboard')?.classList.add('hidden');
        document.getElementById('corp-detail-view')?.classList.add('hidden');
        document.getElementById('all-corps-view')?.classList.add('hidden');
        document.getElementById('all-cities-view')?.classList.add('hidden');
        document.getElementById('city-detail-view')?.classList.remove('hidden');

        // Update city name and country
        document.getElementById('city-detail-name').textContent = city.name;
        document.getElementById('city-detail-country').textContent = city.country?.name || '';

        // Update overview stats
        document.getElementById('city-overview-stats').innerHTML = `
            <div class="overview-stat-grid">
                <div class="overview-stat">
                    <div class="overview-stat-value">${(city.population / 1000000).toFixed(2)}M</div>
                    <div class="overview-stat-label">Population</div>
                </div>
                <div class="overview-stat">
                    <div class="overview-stat-value">${(city.salaryLevel * 100).toFixed(0)}%</div>
                    <div class="overview-stat-label">Salary Level</div>
                </div>
                <div class="overview-stat">
                    <div class="overview-stat-value">${city.employed?.toLocaleString() || 0}</div>
                    <div class="overview-stat-label">Employed</div>
                </div>
                <div class="overview-stat">
                    <div class="overview-stat-value">${city.formatCurrency(city.averageSalary || 0)}</div>
                    <div class="overview-stat-label">Avg Salary</div>
                </div>
            </div>
        `;

        // Update infrastructure
        const infraItems = [
            { icon: '✈️', name: 'Airport', active: city.hasAirport },
            { icon: '⚓', name: 'Seaport', active: city.hasSeaport },
            { icon: '🚂', name: 'Railway', active: city.hasRailway },
            { icon: '🌊', name: 'Coastal', active: city.isCoastal },
            { icon: '🏭', name: 'Industrial Zone', active: city.hasIndustrialZone !== false },
            { icon: '🏦', name: 'Financial District', active: city.hasFinancialDistrict !== false }
        ];

        document.getElementById('city-infrastructure-detail').innerHTML = `
            <div class="infra-grid">
                ${infraItems.map(item => `
                    <div class="infra-item ${item.active ? 'active' : 'inactive'}">
                        <span class="infra-icon">${item.icon}</span>
                        <span class="infra-name">${item.name}</span>
                        <span class="infra-status">${item.active ? '✓' : '✗'}</span>
                    </div>
                `).join('')}
            </div>
        `;

        // Update economy stats
        document.getElementById('city-economy-stats').innerHTML = `
            <div class="economy-stat-grid">
                <div class="economy-stat">
                    <div class="economy-stat-label">Total GDP</div>
                    <div class="economy-stat-value">${city.formatCurrency(city.totalPurchasingPower || 0)}</div>
                </div>
                <div class="economy-stat">
                    <div class="economy-stat-label">Cost of Living</div>
                    <div class="economy-stat-value">${((city.costOfLiving || 1) * 100).toFixed(0)}%</div>
                </div>
                <div class="economy-stat">
                    <div class="economy-stat-label">Business Environment</div>
                    <div class="economy-stat-value">${((city.businessEnvironment || 0.5) * 100).toFixed(0)}%</div>
                </div>
                <div class="economy-stat">
                    <div class="economy-stat-label">Infrastructure Score</div>
                    <div class="economy-stat-value">${((city.infrastructureScore || 0.5) * 100).toFixed(0)}%</div>
                </div>
            </div>
        `;

        // Update industry summary
        const firms = city.firms || [];
        const industryCount = {};
        const industryRevenue = {};
        const industryEmployees = {};

        firms.forEach(firm => {
            const type = firm.type;
            industryCount[type] = (industryCount[type] || 0) + 1;
            industryRevenue[type] = (industryRevenue[type] || 0) + (firm.revenue || 0);
            industryEmployees[type] = (industryEmployees[type] || 0) + (firm.totalEmployees || 0);
        });

        const industries = Object.keys(industryCount);
        document.getElementById('city-industry-count').textContent = `${industries.length} Industries`;

        document.getElementById('city-industry-summary').innerHTML = industries.length > 0 ? `
            <div class="industry-cards">
                ${industries.map(type => `
                    <div class="industry-card">
                        <div class="industry-card-header">
                            <span class="industry-icon">${this.getIndustryIcon(type)}</span>
                            <span class="industry-name">${type}</span>
                        </div>
                        <div class="industry-stats">
                            <div class="industry-stat">
                                <span class="industry-stat-value">${industryCount[type]}</span>
                                <span class="industry-stat-label">Firms</span>
                            </div>
                            <div class="industry-stat">
                                <span class="industry-stat-value">${industryEmployees[type]}</span>
                                <span class="industry-stat-label">Employees</span>
                            </div>
                            <div class="industry-stat">
                                <span class="industry-stat-value">${simulation.formatMoney(industryRevenue[type])}</span>
                                <span class="industry-stat-label">Revenue</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : '<div class="no-data">No industries in this city</div>';

        // Update firms count
        document.getElementById('city-firms-count').textContent = `${firms.length} Firms`;

        // Update filter buttons
        const allTypes = ['ALL', ...new Set(firms.map(f => f.type))];
        document.getElementById('city-firms-filter').innerHTML = `
            <div class="filter-buttons">
                ${allTypes.map(type => `
                    <button class="filter-btn ${type === 'ALL' ? 'active' : ''}" data-filter="${type}">
                        ${type === 'ALL' ? 'All' : type}
                    </button>
                `).join('')}
            </div>
        `;

        // Add filter click handlers
        document.querySelectorAll('#city-firms-filter .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#city-firms-filter .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderCityDetailFirms(city, btn.dataset.filter, simulation);
            });
        });

        // Render firms list
        this.renderCityDetailFirms(city, 'ALL', simulation);
    }

    getIndustryIcon(type) {
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

    renderCityDetailFirms(city, filter, simulation) {
        const firms = city.firms || [];
        const filteredFirms = filter === 'ALL' ? firms : firms.filter(f => f.type === filter);

        // Store current city for back navigation
        this.currentCity = city;

        document.getElementById('city-detail-firms-list').innerHTML = filteredFirms.length > 0 ?
            filteredFirms.map(firm => `
                <div class="firm-card clickable" data-firm-id="${firm.id}">
                    <div class="firm-card-header">
                        <span class="firm-type">${this.getFirmDisplayName(firm)}</span>
                        <span class="firm-type-badge ${firm.type.toLowerCase()}">${firm.type}</span>
                    </div>
                    <div class="firm-corporation">
                        🏢 ${this.getCorporationName(firm.corporationId, simulation)}
                    </div>
                    <div class="firm-stats">
                        <div class="firm-stat">
                            <div class="firm-stat-value">${firm.totalEmployees || 0}</div>
                            <div class="firm-stat-label">Employees</div>
                        </div>
                        <div class="firm-stat">
                            <div class="firm-stat-value ${(firm.revenue || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(firm.revenue || 0)}</div>
                            <div class="firm-stat-label">Revenue</div>
                        </div>
                        <div class="firm-stat">
                            <div class="firm-stat-value ${(firm.profit || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(firm.profit || 0)}</div>
                            <div class="firm-stat-label">Profit</div>
                        </div>
                        <div class="firm-stat">
                            <div class="firm-stat-value ${(firm.cash || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(firm.cash || 0)}</div>
                            <div class="firm-stat-label">Cash</div>
                        </div>
                    </div>
                    ${this.getFirmDetailedInfo(firm, simulation)}
                </div>
            `).join('')
            : '<div class="no-data">No firms match the selected filter</div>';

        // Add click handlers for firm cards
        document.querySelectorAll('#city-detail-firms-list .firm-card.clickable').forEach(card => {
            card.addEventListener('click', () => {
                const firmId = card.dataset.firmId;
                this.showFirmDetail(firmId);
            });
        });
    }

    getCorporationName(corpId, simulation) {
        const corp = simulation.corporations.find(c => c.id === corpId);
        return corp ? corp.name : 'Independent';
    }

    getFirmDetailedInfo(firm, simulation) {
        let info = '<div class="firm-details">';

        switch (firm.type) {
            case 'MINING':
                info += `
                    <div class="firm-detail-row">
                        <span class="detail-label">Resource:</span>
                        <span class="detail-value">${firm.resourceType || 'Unknown'}</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Mine Type:</span>
                        <span class="detail-value">${firm.mineType || 'Unknown'}</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Reserves:</span>
                        <span class="detail-value">${((firm.remainingReserves / firm.totalReserves) * 100).toFixed(1)}% remaining</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Inventory:</span>
                        <span class="detail-value">${firm.inventory?.quantity?.toFixed(0) || 0} units</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Equipment:</span>
                        <span class="detail-value">Level ${firm.equipmentLevel || 1} (${((1 - firm.equipmentDegradation / 100) * 100).toFixed(0)}% condition)</span>
                    </div>
                `;
                break;
            case 'LOGGING':
                info += `
                    <div class="firm-detail-row">
                        <span class="detail-label">Timber Type:</span>
                        <span class="detail-value">${firm.timberType || 'Unknown'}</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Forest Size:</span>
                        <span class="detail-value">${firm.forestSize?.toFixed(0) || 0} hectares</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Forest Health:</span>
                        <span class="detail-value">${firm.forestHealth?.toFixed(0) || 0}%</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Inventory:</span>
                        <span class="detail-value">${firm.inventory?.quantity?.toFixed(0) || 0} m³</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Certified:</span>
                        <span class="detail-value">${firm.certifiedSustainable ? '✓ Sustainable' : '✗ Not Certified'}</span>
                    </div>
                `;
                break;
            case 'FARM':
                if (firm.farmType === 'CROP') {
                    info += `
                        <div class="firm-detail-row">
                            <span class="detail-label">Crop Type:</span>
                            <span class="detail-value">${firm.cropType || 'Unknown'}</span>
                        </div>
                        <div class="firm-detail-row">
                            <span class="detail-label">Land Size:</span>
                            <span class="detail-value">${firm.landSize?.toFixed(0) || 0} hectares</span>
                        </div>
                        <div class="firm-detail-row">
                            <span class="detail-label">Soil Quality:</span>
                            <span class="detail-value">${firm.soilQuality?.toFixed(0) || 0}%</span>
                        </div>
                        <div class="firm-detail-row">
                            <span class="detail-label">Growth Stage:</span>
                            <span class="detail-value">${firm.currentGrowthStage?.toFixed(1) || 0}%</span>
                        </div>
                    `;
                } else {
                    info += `
                        <div class="firm-detail-row">
                            <span class="detail-label">Livestock:</span>
                            <span class="detail-value">${firm.livestockType || 'Unknown'}</span>
                        </div>
                        <div class="firm-detail-row">
                            <span class="detail-label">Herd Size:</span>
                            <span class="detail-value">${firm.herdSize || 0} animals</span>
                        </div>
                        <div class="firm-detail-row">
                            <span class="detail-label">Maturity:</span>
                            <span class="detail-value">${firm.currentMaturity?.toFixed(1) || 0}%</span>
                        </div>
                    `;
                }
                info += `
                    <div class="firm-detail-row">
                        <span class="detail-label">Inventory:</span>
                        <span class="detail-value">${firm.inventory?.quantity?.toFixed(0) || 0} kg</span>
                    </div>
                `;
                break;
            case 'MANUFACTURING':
                info += `
                    <div class="firm-detail-row">
                        <span class="detail-label">Product:</span>
                        <span class="detail-value">${firm.productType || 'Unknown'}</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Finished Goods:</span>
                        <span class="detail-value">${firm.finishedGoodsInventory?.quantity?.toFixed(0) || 0} units</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Defect Rate:</span>
                        <span class="detail-value">${((firm.defectRate || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Capacity Used:</span>
                        <span class="detail-value">${((firm.capacityUtilization || 0) * 100).toFixed(0)}%</span>
                    </div>
                `;
                break;
            case 'RETAIL':
                info += `
                    <div class="firm-detail-row">
                        <span class="detail-label">Store Type:</span>
                        <span class="detail-value">${firm.storeType || 'Unknown'}</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Products:</span>
                        <span class="detail-value">${firm.productInventory?.size || 0} types</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Satisfaction:</span>
                        <span class="detail-value">${firm.customerSatisfaction?.toFixed(0) || 0}%</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Daily Customers:</span>
                        <span class="detail-value">${firm.dailyCustomers || 0}</span>
                    </div>
                `;
                break;
            case 'BANK':
                info += `
                    <div class="firm-detail-row">
                        <span class="detail-label">Bank Type:</span>
                        <span class="detail-value">${firm.bankType || 'Commercial'}</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Total Deposits:</span>
                        <span class="detail-value">${simulation.formatMoney(firm.totalDeposits || 0)}</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Total Loans:</span>
                        <span class="detail-value">${simulation.formatMoney(firm.totalLoans || 0)}</span>
                    </div>
                    <div class="firm-detail-row">
                        <span class="detail-label">Interest Rate:</span>
                        <span class="detail-value">${((firm.interestRate || 0.05) * 100).toFixed(1)}%</span>
                    </div>
                `;
                break;
        }

        info += '</div>';
        return info;
    }

    update() {
        const state = this.getSimulation().getState();

        // Helper to safely set element text content
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        // Update clock
        setText('game-date', this.getSimulation().clock.getFormatted());
        setText('real-time', this.getSimulation().clock.getElapsed());

        // Update global stats
        setText('total-population', state.stats.totalPopulation.toLocaleString());
        setText('total-gdp', this.getSimulation().formatMoney(state.stats.totalGDP));
        setText('city-count', state.cities.length);
        setText('total-employed', state.stats.totalEmployed.toLocaleString());
        setText('avg-salary-level', (state.stats.avgSalaryLevel * 100).toFixed(0) + '%');

        // Update corporations
        this.updateCorporations(state.corporations);

        // Update cities
        this.updateCities(state.cities);

        // Update products
        this.updateProducts(state.products);

        // Update events
        this.updateEvents(state.events);

        // Update market chart
        this.updateMarketChart(state.marketHistory);

        // Update market stats
        const recentTransactions = state.marketHistory.slice(-1)[0]?.transactions || 0;
        setText('hourly-transactions', Math.floor(recentTransactions).toLocaleString());

        const totalRevenue = state.corporations.reduce((sum, c) => sum + c.revenue, 0);
        setText('avg-transaction', this.getSimulation().formatMoney(totalRevenue / (recentTransactions || 1)));

        // Update badges
        setText('corp-count', `${state.corporations.length} Active`);
        setText('cities-badge', `${state.cities.length} Cities`);
        setText('product-count', `${state.products.length} Products`);
        setText('map-info', `${state.cities.length} Cities`);

        // Update orders summary
        this.updateOrdersSummary();
    }

    updateOrdersSummary() {
        const simulation = this.getSimulation();
        const gm = simulation.globalMarket;
        if (!gm) return;

        const gameTime = simulation.clock?.getGameTime();
        const currentHour = gameTime?.hour || 0;

        // Update bidding status mini banner
        const banner = document.getElementById('bidding-status-mini');
        const icon = document.getElementById('dash-bidding-icon');
        const text = document.getElementById('dash-bidding-text');

        if (banner && icon && text) {
            if (currentHour >= 9 && currentHour < 12) {
                banner.className = 'bidding-status-mini bidding-active';
                icon.textContent = '🔴';
                text.textContent = `BIDDING OPEN - ${12 - currentHour}h left`;
            } else if (currentHour >= 12) {
                banner.className = 'bidding-status-mini bidding-closed';
                icon.textContent = '⏰';
                text.textContent = 'Bidding closed - Opens 9AM';
            } else {
                banner.className = 'bidding-status-mini bidding-waiting';
                icon.textContent = '🔔';
                text.textContent = `Opens at 9AM (${9 - currentHour}h)`;
            }
        }

        // Update order counts
        const stats = gm.getStats ? gm.getStats() : {};
        const availableCount = gm.availableOrders?.filter(o => o.status === 'AVAILABLE')?.length || 0;
        const biddingCount = gm.biddingOrders?.filter(o => o.status === 'BIDDING')?.length || 0;
        const awardedCount = gm.pendingOrders?.filter(o => o.status === 'AWARDED')?.length || 0;
        const deliveredCount = stats.totalOrdersDelivered || 0;
        const totalBids = stats.totalBidsReceived || 0;
        const totalSpent = stats.totalSpent || 0;

        const el = (id) => document.getElementById(id);
        if (el('dash-available-orders')) el('dash-available-orders').textContent = availableCount.toLocaleString();
        if (el('dash-bidding-orders')) el('dash-bidding-orders').textContent = biddingCount.toLocaleString();
        if (el('dash-awarded-orders')) el('dash-awarded-orders').textContent = awardedCount.toLocaleString();
        if (el('dash-delivered-orders')) el('dash-delivered-orders').textContent = deliveredCount.toLocaleString();
        if (el('dash-total-bids')) el('dash-total-bids').textContent = totalBids.toLocaleString();
        if (el('dash-total-spent')) el('dash-total-spent').textContent = simulation.formatMoney(totalSpent);

        // Render recent awarded orders
        this.renderRecentOrders(gm, simulation);
    }

    renderRecentOrders(gm, simulation) {
        const container = document.getElementById('recent-orders-list');
        if (!container) return;

        // Get recently awarded orders (pending delivery)
        const pendingOrders = (gm.pendingOrders || []).filter(o => o.status === 'AWARDED');
        const completedOrders = (gm.completedOrders || []).slice(-5);

        const recentOrders = [...pendingOrders.slice(-5), ...completedOrders].slice(-8);

        if (recentOrders.length === 0) {
            container.innerHTML = '<p class="no-recent-orders">No orders awarded yet</p>';
            return;
        }

        container.innerHTML = `
            <div class="recent-orders-header">Recent Awarded Orders</div>
            ${recentOrders.map(order => `
                <div class="recent-order-item ${order.status === 'AWARDED' ? 'pending' : ''}">
                    <div class="recent-order-info">
                        <span class="recent-order-product">${order.productName}</span>
                        <span class="recent-order-details">${order.quantity} units • ${order.deliveryLocation || 'Unknown'}</span>
                    </div>
                    <div class="recent-order-right">
                        <span class="recent-order-value">${simulation.formatMoney(order.winningBid?.totalBidValue || 0)}</span>
                        <span class="recent-order-winner">${order.winningBid?.firmName || 'Unknown'}</span>
                    </div>
                </div>
            `).join('')}
        `;
    }

    updateStatus(status) {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        if (!indicator || !text) return;

        if (status === 'running') {
            indicator.className = 'status-indicator status-running';
            text.textContent = 'Running';
        } else {
            indicator.className = 'status-indicator status-paused';
            text.textContent = 'Paused';
        }
    }

    updateCorporations(corporations) {
        const corpList = document.getElementById('corp-list');
        if (!corpList) return;
        corpList.innerHTML = corporations
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 5)
            .map(corp => `
                <div class="corp-item" data-corp-id="${corp.id}" style="border-color: ${corp.color}">
                    <div class="corp-header">
                        <div class="corp-name">${corp.name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${corp.character}</div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Revenue</span>
                            <span class="stat-value ${corp.revenue < 0 ? 'negative' : ''}">${this.getSimulation().formatMoney(corp.revenue)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Profit</span>
                            <span class="stat-value ${corp.profit < 0 ? 'negative' : ''}">${this.getSimulation().formatMoney(corp.profit)}</span>
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(100, Math.abs(corp.revenue) / 10000000 * 100)}%; background: ${corp.revenue < 0 ? 'var(--accent-red)' : 'var(--accent-green)'}"></div>
                    </div>
                </div>
            `).join('');

        // Add click handlers for corporation items - navigate to corporations page
        corpList.querySelectorAll('.corp-item').forEach(item => {
            item.addEventListener('click', () => {
                const corpId = item.dataset.corpId;
                window.location.href = `corporations.html?id=${corpId}`;
            });
        });
    }

    updateCities(cities) {
        const cityList = document.getElementById('city-list');
        if (!cityList) return;
        const simulation = this.getSimulation();

        cityList.innerHTML = cities.map(city => `
            <div class="city-item" data-city-id="${city.id}">
                <div class="city-header">
                    <div class="city-name">${city.name}</div>
                    <div class="city-population">${(city.population / 1000000).toFixed(2)}M</div>
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
                <div class="city-firms-section">
                    <div class="city-firms-header" data-city-id="${city.id}">
                        <span>🏭 Firms (${city.firms?.length || 0})</span>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="city-firms-list" id="city-firms-${city.id}">
                        ${this.renderCityFirms(city.firms || [], simulation)}
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers for firm list toggle
        cityList.querySelectorAll('.city-firms-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent city click
                const cityId = header.dataset.cityId;
                const firmsList = document.getElementById(`city-firms-${cityId}`);
                const toggleIcon = header.querySelector('.toggle-icon');

                if (firmsList.classList.contains('collapsed')) {
                    firmsList.classList.remove('collapsed');
                    toggleIcon.textContent = '▼';
                } else {
                    firmsList.classList.add('collapsed');
                    toggleIcon.textContent = '▶';
                }
            });
        });

        // Add click handlers for city detail view - navigate to cities page
        cityList.querySelectorAll('.city-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Only navigate if not clicking on firms section
                if (!e.target.closest('.city-firms-section')) {
                    const cityId = item.dataset.cityId;
                    window.location.href = `cities.html?id=${cityId}`;
                }
            });
        });
    }

    renderCityFirms(firms, simulation) {
        if (!firms || firms.length === 0) {
            return '<div class="city-firm-empty">No firms in this city</div>';
        }

        return firms.map(firm => `
            <div class="city-firm-item">
                <div class="city-firm-header">
                    <span class="city-firm-name">${this.getFirmDisplayName(firm)}</span>
                    <span class="city-firm-type-badge ${firm.type.toLowerCase()}">${firm.type}</span>
                </div>
                <div class="city-firm-stats">
                    <div class="city-firm-stat">
                        <span class="city-firm-stat-label">Employees</span>
                        <span class="city-firm-stat-value">${firm.totalEmployees || 0}</span>
                    </div>
                    <div class="city-firm-stat">
                        <span class="city-firm-stat-label">Revenue</span>
                        <span class="city-firm-stat-value ${(firm.revenue || 0) < 0 ? 'negative' : ''}">${simulation.formatMoney(firm.revenue || 0)}</span>
                    </div>
                    <div class="city-firm-stat">
                        <span class="city-firm-stat-label">Inventory</span>
                        <span class="city-firm-stat-value">${this.getFirmInventoryDisplay(firm)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getFirmInventoryDisplay(firm) {
        if (firm.type === 'MANUFACTURING') {
            return (firm.finishedGoodsInventory?.quantity || 0).toFixed(0);
        } else if (firm.type === 'RETAIL') {
            return firm.productInventory?.size || 0;
        } else if (firm.type === 'BANK') {
            return '-';
        } else if (firm.inventory) {
            return firm.inventory.quantity?.toFixed(0) || 0;
        }
        return '0';
    }

    updateProducts(products) {
        const productGrid = document.getElementById('product-grid');
        if (!productGrid) return;
        productGrid.innerHTML = products.map(p => `
            <div class="product-card">
                <div class="product-icon">${p.icon}</div>
                <div class="product-name">${p.name}</div>
                <div class="product-price">${this.getSimulation().formatMoney(p.currentPrice || p.basePrice)}</div>
                <div class="product-demand">
                    <span>D: ${Math.round(p.demand)}</span>
                    <span>S: ${Math.round(p.supply)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${p.demand}%"></div>
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

        const maxTransactions = Math.max(...history.map(h => h.transactions || 0), 1);
        const points = history.map((h, i) => {
            const x = (i / (history.length - 1)) * width;
            const y = height - ((h.transactions || 0) / maxTransactions * height * 0.9);
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
        const cities = this.getSimulation().cities;
        const originSelect = document.getElementById('origin-city');
        const destSelect = document.getElementById('destination-city');

        const options = cities.map(city =>
            `<option value="${city.id}">${city.name}</option>`
        ).join('');

        originSelect.innerHTML = options;
        destSelect.innerHTML = options;
        if (cities.length > 1) {
            destSelect.selectedIndex = 1;
        }
    }

    calculateRoute() {
        const originId = document.getElementById('origin-city').value;
        const destId = document.getElementById('destination-city').value;
        const cargoUnits = parseInt(document.getElementById('cargo-units').value);
        const priority = document.getElementById('priority').value;

        const result = this.getSimulation().cityManager.calculateShippingCost(
            originId,
            destId,
            cargoUnits,
            priority
        );

        if (result.error) {
            document.getElementById('route-results').innerHTML = `
                <div class="route-results">
                    <div style="color: var(--accent-red);">${result.error}</div>
                </div>
            `;
            return;
        }

        document.getElementById('route-results').innerHTML = `
            <div class="route-results">
                <div style="margin-bottom: 15px; font-size: 14px;">
                    <strong>Route:</strong> ${result.origin} → ${result.destination}<br>
                    <strong>Distance:</strong> ${result.distance.toFixed(1)} km
                </div>
                ${result.allRoutes.map((route, i) => `
                    <div class="route-option ${i === 0 ? 'optimal' : ''}">
                        <div class="route-header">
                            <div class="route-name">${route.icon} ${route.typeName}</div>
                            <div class="route-cost">${this.getSimulation().formatMoney(route.baseCost)}</div>
                        </div>
                        <div class="route-details">
                            <div>
                                <div class="stat-label">Cost/Unit</div>
                                <div class="stat-value">${this.getSimulation().formatMoney(route.costPerUnit)}</div>
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
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Market Activity View Methods
    showMarketActivity() {
        // Redirect to market-activity page instead of internal view
        window.location.href = 'market-activity.html';
        return;

        // Legacy code below - kept for reference but not executed
        const simulation = this.getSimulation();

        // Hide all other views
        document.getElementById('main-dashboard')?.classList.add('hidden');
        document.getElementById('corp-detail-view')?.classList.add('hidden');
        document.getElementById('city-detail-view')?.classList.add('hidden');
        document.getElementById('all-corps-view')?.classList.add('hidden');
        document.getElementById('all-cities-view')?.classList.add('hidden');
        document.getElementById('firm-detail-view')?.classList.add('hidden');

        // Show market activity view
        document.getElementById('market-activity-view')?.classList.remove('hidden');

        // Render the data
        this.renderMarketActivity();
    }

    renderMarketActivity() {
        const simulation = this.getSimulation();
        const transactionLog = simulation.transactionLog;

        if (!transactionLog) {
            console.warn('Transaction log not available');
            return;
        }

        // Get filter values
        const typeFilter = document.getElementById('transaction-type-filter')?.value || 'all';
        const searchTerm = document.getElementById('transaction-search')?.value?.toLowerCase() || '';
        const cityFilter = document.getElementById('transaction-city-filter')?.value || 'all';

        // Update summary stats
        const stats = transactionLog.getStats();
        this.setText('total-transactions', stats.totalTransactions.toLocaleString());
        this.setText('total-value', simulation.formatMoney(stats.totalValue));
        this.setText('avg-per-hour',
            stats.hourlyStats.length > 0
                ? (stats.hourlyStats.reduce((sum, h) => sum + h.transactions, 0) / stats.hourlyStats.length).toFixed(1)
                : '0');
        this.setText('pending-orders', transactionLog.getPendingGlobalOrders().length);

        // Update transaction breakdown - count B2B by tier
        const b2bTransactions = transactionLog.b2bTransactions || [];
        const rawToSemi = b2bTransactions.filter(t => t.tier === 'RAW_TO_SEMI').length;
        const semiToMfg = b2bTransactions.filter(t => t.tier === 'SEMI_TO_MANUFACTURED').length;

        this.setText('b2b-raw-count', rawToSemi.toLocaleString());
        this.setText('b2b-semi-count', semiToMfg.toLocaleString());
        this.setText('retail-purchase-count', stats.totalRetail.toLocaleString());
        this.setText('consumer-sale-count', stats.totalConsumerSales.toLocaleString());
        this.setText('global-market-count', stats.totalGlobalMarket.toLocaleString());

        // Update global market status
        const globalMarketStats = simulation.getGlobalMarketStats?.() || { totalOrders: 0, pendingOrders: 0, totalSpent: 0 };
        const priceMultiplier = simulation.config?.globalMarket?.priceMultiplier || 1.5;
        this.setText('gm-status', simulation.config?.globalMarket?.enabled ? 'Enabled' : 'Disabled');
        this.setText('gm-multiplier', `${priceMultiplier}x`);
        this.setText('gm-total-orders', globalMarketStats.totalOrders?.toLocaleString() || '0');
        this.setText('gm-total-spent', simulation.formatMoney(globalMarketStats.totalSpent || 0));

        // Update pending orders count badge
        const pendingCount = transactionLog.getPendingGlobalOrders().length;
        this.setText('pending-orders-count', `${pendingCount} Pending`);

        // Populate city filter if not already done
        this.populateCityFilter();

        // Render hourly chart
        this.renderMarketHourlyChart(stats.hourlyStats);

        // Render pending orders
        this.renderPendingOrders(transactionLog.getPendingGlobalOrders());

        // Get and filter transactions
        let transactions = [];
        if (typeFilter === 'all') {
            transactions = transactionLog.getRecentTransactions(100);
        } else if (typeFilter === 'B2B') {
            transactions = transactionLog.getTransactionsByType('B2B', 100);
        } else if (typeFilter === 'RETAIL_PURCHASE') {
            transactions = transactionLog.getTransactionsByType('RETAIL_PURCHASE', 100);
        } else if (typeFilter === 'CONSUMER_SALE') {
            transactions = transactionLog.getTransactionsByType('CONSUMER_SALE', 100);
        } else if (typeFilter === 'GLOBAL_MARKET') {
            transactions = transactionLog.getTransactionsByType('GLOBAL_MARKET', 100);
        }

        // Apply city filter
        if (cityFilter && cityFilter !== 'all') {
            transactions = transactions.filter(t => {
                return t.seller?.city === cityFilter || t.buyer?.city === cityFilter;
            });
        }

        // Apply search filter
        if (searchTerm) {
            transactions = transactions.filter(t => {
                const sellerName = t.seller?.name?.toLowerCase() || '';
                const buyerName = t.buyer?.name?.toLowerCase() || '';
                const material = (t.material || t.product || '').toLowerCase();
                const city = (t.seller?.city || t.buyer?.city || '').toLowerCase();
                return sellerName.includes(searchTerm) ||
                       buyerName.includes(searchTerm) ||
                       material.includes(searchTerm) ||
                       city.includes(searchTerm);
            });
        }

        // Update showing count
        this.setText('showing-transactions', `Showing ${transactions.length}`);

        // Render transactions table
        this.renderTransactionsTable(transactions);
    }

    populateCityFilter() {
        const select = document.getElementById('transaction-city-filter');
        if (!select || select.options.length > 1) return; // Already populated

        const simulation = this.getSimulation();
        const cities = simulation.cities || [];

        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city.name;
            option.textContent = city.name;
            select.appendChild(option);
        });
    }

    renderMarketHourlyChart(hourlyStats) {
        const svg = document.getElementById('hourly-activity-chart');
        if (!svg || hourlyStats.length < 2) return;

        const width = svg.clientWidth || 400;
        const height = svg.clientHeight || 150;
        const padding = 20;

        const maxTransactions = Math.max(...hourlyStats.map(h => h.transactions || 0), 1);
        const maxValue = Math.max(...hourlyStats.map(h => h.value || 0), 1);

        // Create transaction line points
        const txPoints = hourlyStats.map((h, i) => {
            const x = padding + (i / (hourlyStats.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((h.transactions || 0) / maxTransactions * (height - 2 * padding));
            return `${x},${y}`;
        }).join(' ');

        // Create value line points
        const valuePoints = hourlyStats.map((h, i) => {
            const x = padding + (i / (hourlyStats.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((h.value || 0) / maxValue * (height - 2 * padding));
            return `${x},${y}`;
        }).join(' ');

        svg.innerHTML = `
            <polyline points="${txPoints}"
                      fill="none"
                      stroke="var(--accent-blue)"
                      stroke-width="2"/>
            <polyline points="${valuePoints}"
                      fill="none"
                      stroke="var(--accent-green)"
                      stroke-width="2"
                      stroke-dasharray="4,2"/>
            <text x="${width - 60}" y="15" font-size="10" fill="var(--accent-blue)">Transactions</text>
            <text x="${width - 60}" y="28" font-size="10" fill="var(--accent-green)">Value</text>
        `;
    }

    renderPendingOrders(pendingOrders) {
        const container = document.getElementById('pending-orders-list');
        if (!container) return;

        if (pendingOrders.length === 0) {
            container.innerHTML = '<div class="no-pending-orders">No pending orders</div>';
            return;
        }

        const simulation = this.getSimulation();
        container.innerHTML = pendingOrders.slice(0, 10).map(order => `
            <div class="pending-order-item">
                <div class="pending-order-header">
                    <span class="pending-order-material">${order.material}</span>
                    <span class="pending-order-status status-${order.status.toLowerCase()}">${order.status}</span>
                </div>
                <div class="pending-order-details">
                    <span>Qty: ${order.quantity}</span>
                    <span>Cost: ${simulation.formatMoney(order.totalCost)}</span>
                    <span>Buyer: ${order.buyer?.name || 'Unknown'}</span>
                </div>
            </div>
        `).join('');
    }

    renderTransactionsTable(transactions) {
        const tbody = document.getElementById('transactions-tbody');
        if (!tbody) return;

        const simulation = this.getSimulation();

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="no-transactions">No transactions found</td></tr>';
            return;
        }

        tbody.innerHTML = transactions.map(t => {
            const typeClass = this.getTransactionTypeClass(t.type);
            const typeBadge = this.getTransactionTypeBadge(t.type);
            const timestamp = new Date(t.timestamp).toLocaleTimeString();
            const totalValue = t.totalCost || t.totalRevenue || 0;
            const unitPrice = t.unitPrice || 0;
            const status = t.status || 'COMPLETED';
            const statusClass = status.toLowerCase().replace('_', '-');

            return `
                <tr class="transaction-row">
                    <td class="tx-time">${timestamp}</td>
                    <td><span class="tx-type-badge ${typeClass}">${typeBadge}</span></td>
                    <td class="tx-seller" title="${t.seller?.name || 'Unknown'}">
                        <div class="tx-party">
                            <span class="tx-party-name">${this.truncate(t.seller?.name || 'Unknown', 18)}</span>
                            <span class="tx-party-city">${t.seller?.city || ''}</span>
                        </div>
                    </td>
                    <td class="tx-buyer" title="${t.buyer?.name || t.buyer?.type || 'Unknown'}">
                        <div class="tx-party">
                            <span class="tx-party-name">${this.truncate(t.buyer?.name || t.buyer?.type || 'Unknown', 18)}</span>
                            <span class="tx-party-city">${t.buyer?.city || ''}</span>
                        </div>
                    </td>
                    <td class="tx-material">${t.material || t.product || '-'}</td>
                    <td class="tx-quantity">${t.quantity?.toLocaleString() || '-'}</td>
                    <td class="tx-unit-price">${simulation.formatMoney(unitPrice)}</td>
                    <td class="tx-value">${simulation.formatMoney(totalValue)}</td>
                    <td class="tx-status"><span class="status-badge status-${statusClass}">${status}</span></td>
                </tr>
            `;
        }).join('');
    }

    getTransactionTypeClass(type) {
        const classes = {
            'B2B': 'tx-b2b',
            'RETAIL_PURCHASE': 'tx-retail',
            'CONSUMER_SALE': 'tx-consumer',
            'GLOBAL_MARKET': 'tx-global'
        };
        return classes[type] || 'tx-other';
    }

    getTransactionTypeBadge(type) {
        const badges = {
            'B2B': 'B2B',
            'RETAIL_PURCHASE': 'Retail',
            'CONSUMER_SALE': 'Consumer',
            'GLOBAL_MARKET': 'Global'
        };
        return badges[type] || type;
    }

    truncate(str, maxLength) {
        if (!str) return '';
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    }
}
