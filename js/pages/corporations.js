// js/pages/corporations.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber, formatCurrency, getFirmTypeName } from './shared.js';

let simulation;
let currentSort = 'capital-desc';
let currentTierFilter = 'all';
let currentPersonaFilter = 'all';

async function init() {
    try {
        simulation = await getSimulation();
        if (!simulation) {
            console.error('Failed to get simulation');
            return;
        }

        // Debug: Check corporation facilities right after simulation is loaded
        console.log('=== DEBUG: Corporations after simulation load ===');
        console.log('Total firms in simulation:', simulation.firms.size);
        console.log('Total corporations:', simulation.corporations.length);
        simulation.corporations.forEach(corp => {
            console.log(`Corp ${corp.id} (${corp.name}): ${corp.facilities?.length || 0} facilities`);
        });

        // Check if firms have corporationId set
        const firmsWithCorpId = Array.from(simulation.firms.values()).filter(f => f.corporationId);
        console.log('Firms with corporationId set:', firmsWithCorpId.length);

        setupClock(simulation);
        setupControls(simulation);

    // Check for corp ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const corpIdParam = urlParams.get('id');

    // Setup event listeners
    document.getElementById('corps-sort-select')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderCorporations();
    });

    document.getElementById('corps-tier-filter')?.addEventListener('change', (e) => {
        currentTierFilter = e.target.value;
        renderCorporations();
    });

    document.getElementById('corps-persona-filter')?.addEventListener('change', (e) => {
        currentPersonaFilter = e.target.value;
        renderCorporations();
    });

    document.getElementById('btn-back')?.addEventListener('click', () => {
        document.getElementById('corp-detail-view').classList.add('hidden');
        document.querySelector('.main-container').style.display = 'block';
        window.history.pushState({}, '', 'corporations.html');
    });

    // Initial render
    updateDisplay();
    onUpdate(() => updateDisplay());

    // Show corp detail if ID in URL
    if (corpIdParam) {
        showCorpDetail(corpIdParam);
    }
    } catch (error) {
        console.error('Error initializing corporations page:', error);
    }
}

function updateDisplay() {
    if (!simulation) return;

    document.getElementById('all-corps-count').textContent = simulation.corporations.length + ' Corporations';
    renderSummary();
    renderCorporations();
}

function renderSummary() {
    const container = document.getElementById('corps-summary-stats');
    if (!container) return;

    let totalRevenue = 0, totalMonthlyRevenue = 0, totalProfit = 0, totalMonthlyProfit = 0;
    let totalEmployees = 0, totalFacilities = 0;
    let totalOrdersWon = 0, totalOrderValue = 0, totalMonthlySalary = 0;

    simulation.corporations.forEach(c => {
        totalRevenue += c.revenue || 0;
        totalMonthlyRevenue += c.monthlyRevenue || 0;
        totalProfit += c.profit || 0;
        totalMonthlyProfit += c.monthlyProfit || 0;
        totalEmployees += c.employees || 0;
        totalFacilities += c.facilities?.length || 0;
        totalMonthlySalary += getCorpMonthlySalary(c);

        // Count orders won by this corp's firms
        const corpOrders = getCorpOrders(c);
        totalOrdersWon += corpOrders.length;
        totalOrderValue += corpOrders.reduce((sum, o) => sum + (o.winningBid?.totalBidValue || 0), 0);
    });

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-label">Monthly Revenue</span>
                <span class="stat-value">${formatCurrency(totalMonthlyRevenue)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Revenue</span>
                <span class="stat-value">${formatCurrency(totalRevenue)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Monthly Profit</span>
                <span class="stat-value ${totalMonthlyProfit < 0 ? 'negative' : ''}">${formatCurrency(totalMonthlyProfit)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Profit</span>
                <span class="stat-value ${totalProfit < 0 ? 'negative' : ''}">${formatCurrency(totalProfit)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Employees</span>
                <span class="stat-value">${formatNumber(totalEmployees)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Monthly Payroll</span>
                <span class="stat-value">${formatCurrency(totalMonthlySalary)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Facilities</span>
                <span class="stat-value">${totalFacilities}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Orders Won</span>
                <span class="stat-value">${totalOrdersWon}</span>
            </div>
        </div>
    `;
}

// Calculate total monthly salary for a corporation
function getCorpMonthlySalary(corp) {
    if (!corp.facilities || corp.facilities.length === 0) return 0;

    return corp.facilities.reduce((total, firm) => {
        if (typeof firm.calculateLaborCosts === 'function') {
            return total + firm.calculateLaborCosts();
        }
        return total + (firm.totalLaborCost || 0);
    }, 0);
}

function getCorpOrders(corp) {
    // Get firm IDs for this corporation
    const firmIds = (corp.facilities || []).map(f => f.id);

    // Get active contracts from the contract manager
    const contractManager = simulation.purchaseManager?.contractManager;
    if (!contractManager) return [];

    const contracts = contractManager.getActiveContracts?.() || [];
    return contracts.filter(c => firmIds.includes(c.supplierId) || firmIds.includes(c.buyerId));
}

function renderCorporations() {
    const container = document.getElementById('all-corps-grid');
    if (!container) return;

    let corps = [...simulation.corporations];

    // Filter by tier
    if (currentTierFilter !== 'all') {
        corps = corps.filter(c => {
            const tier = c.primaryPersona?.tier || c.getPrimaryTier?.() || null;
            return tier === currentTierFilter;
        });
    }

    // Filter by persona
    if (currentPersonaFilter !== 'all') {
        corps = corps.filter(c => {
            const personaType = c.primaryPersona?.type || null;
            return personaType === currentPersonaFilter;
        });
    }

    // Sort
    const [field, dir] = currentSort.split('-');
    corps.sort((a, b) => {
        let aVal, bVal;
        switch (field) {
            case 'capital': aVal = a.capital || 0; bVal = b.capital || 0; break;
            case 'cash': aVal = a.cash || 0; bVal = b.cash || 0; break;
            case 'profit': aVal = a.profit || 0; bVal = b.profit || 0; break;
            case 'revenue': aVal = a.revenue || 0; bVal = b.revenue || 0; break;
            case 'employees': aVal = a.employees || 0; bVal = b.employees || 0; break;
            case 'facilities': aVal = a.facilities?.length || a.firms?.length || 0; bVal = b.facilities?.length || b.firms?.length || 0; break;
            case 'name': aVal = a.name; bVal = b.name; break;
            default: aVal = 0; bVal = 0;
        }
        if (dir === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });

    container.innerHTML = corps.map(corp => {
        const corpOrders = getCorpOrders(corp);
        const monthlySalary = getCorpMonthlySalary(corp);
        const monthlyProfit = corp.monthlyProfit || 0;

        // Get tier and persona for organic growth corps
        const tier = corp.primaryPersona?.tier || null;
        const personaType = corp.primaryPersona?.type || null;
        const corpType = corp.type || null;
        const firmCount = corp.firms?.length || corp.facilities?.length || 0;
        const capital = corp.capital || 0;

        return `
        <div class="corp-card" data-corp-id="${corp.id}">
            <div class="corp-card-header">
                <span class="corp-abbr">${corp.abbreviation || '???'}</span>
                <span class="corp-name">${corp.name}</span>
                ${corpType ? `<span class="corp-type-badge ${corpType.toLowerCase()}">${formatCorpType(corpType)}</span>` : ''}
            </div>
            ${tier || personaType ? `
            <div class="corp-card-tags">
                ${tier ? `<span class="tier-badge ${tier.toLowerCase()}">${tier}</span>` : ''}
                ${personaType ? `<span class="persona-badge">${formatPersonaType(personaType)}</span>` : ''}
            </div>
            ` : ''}
            <div class="corp-card-stats">
                ${capital > 0 ? `
                <div class="stat-item">
                    <span class="stat-label">Capital</span>
                    <span class="stat-value">${formatCurrency(capital)}</span>
                </div>
                ` : `
                <div class="stat-item">
                    <span class="stat-label">Cash</span>
                    <span class="stat-value">${formatCurrency(corp.cash || 0)}</span>
                </div>
                `}
                <div class="stat-item">
                    <span class="stat-label">Firms</span>
                    <span class="stat-value">${firmCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Employees</span>
                    <span class="stat-value">${formatNumber(corp.employees || 0)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Monthly Profit</span>
                    <span class="stat-value ${monthlyProfit < 0 ? 'negative' : ''}">${formatCurrency(monthlyProfit)}</span>
                </div>
            </div>
            ${corpOrders.length > 0 ? `
            <div class="corp-orders-badge">
                <span class="orders-won-badge">${corpOrders.length} Orders Won</span>
            </div>
            ` : ''}
        </div>
    `}).join('');

    // Add click handlers
    container.querySelectorAll('.corp-card').forEach(card => {
        card.addEventListener('click', () => {
            const corpId = card.dataset.corpId;
            window.history.pushState({}, '', `corporations.html?id=${corpId}`);
            showCorpDetail(corpId);
        });
    });
}

function showCorpDetail(corpId) {
    const corp = simulation.corporations.find(c => c.id === corpId || c.id === parseInt(corpId));

    // If corporation not found, show error
    if (!corp) {
        document.querySelector('.main-container').style.display = 'none';
        document.getElementById('corp-detail-view').classList.remove('hidden');
        document.getElementById('corp-detail-name').textContent = 'Corporation Not Found';
        document.getElementById('corp-character-badge').textContent = '';
        document.getElementById('corp-character-badge').className = 'corp-character-badge';

        const errorMsg = `
            <div class="corp-not-found-error">
                <p>The corporation with ID "${corpId}" was not found.</p>
                <p><a href="corporations.html" class="btn btn-primary">← Back to Corporations List</a></p>
            </div>
        `;
        document.getElementById('corp-financial-stats').innerHTML = errorMsg;
        document.getElementById('corp-performance-stats').innerHTML = '';
        document.getElementById('corp-industry-breakdown').innerHTML = '';
        document.getElementById('corp-cities-list').innerHTML = '';
        document.getElementById('corp-firms-list').innerHTML = '';
        document.getElementById('corp-orders-stats').innerHTML = '';
        document.getElementById('corp-orders-list').innerHTML = '';
        return;
    }

    document.querySelector('.main-container').style.display = 'none';
    document.getElementById('corp-detail-view').classList.remove('hidden');

    document.getElementById('corp-detail-name').textContent = `[${corp.abbreviation || '???'}] ${corp.name}`;
    document.getElementById('corp-character-badge').textContent = corp.character || 'Unknown';
    document.getElementById('corp-character-badge').className = `corp-character-badge ${corp.character?.toLowerCase()}`;

    // Financial stats
    const monthlyProfit = corp.monthlyProfit || 0;
    const isOrganicGrowth = simulation.config?.corporations?.organicGrowth;
    const hasCapital = corp.capital !== undefined;

    // Calculate total funds (capital + cash from firms)
    const capital = corp.capital || 0;
    const firmCash = corp.cash || 0;
    const totalFunds = capital + firmCash;

    document.getElementById('corp-financial-stats').innerHTML = `
        <div class="stats-grid">
            ${isOrganicGrowth && hasCapital ? `
            <div class="stat-item">
                <span class="stat-label">Investment Capital</span>
                <span class="stat-value">${formatCurrency(capital)}</span>
                <span class="stat-hint">For opening new firms</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Operational Cash</span>
                <span class="stat-value">${formatCurrency(firmCash)}</span>
                <span class="stat-hint">From firm operations</span>
            </div>
            <div class="stat-item stat-highlight">
                <span class="stat-label">Total Funds</span>
                <span class="stat-value">${formatCurrency(totalFunds)}</span>
            </div>
            ` : `
            <div class="stat-item"><span class="stat-label">Cash</span><span class="stat-value">${formatCurrency(corp.cash || 0)}</span></div>
            `}
            <div class="stat-item"><span class="stat-label">Monthly Revenue</span><span class="stat-value">${formatCurrency(corp.monthlyRevenue || 0)}</span></div>
            <div class="stat-item"><span class="stat-label">Total Revenue</span><span class="stat-value">${formatCurrency(corp.revenue || 0)}</span></div>
            <div class="stat-item"><span class="stat-label">Monthly Expenses</span><span class="stat-value">${formatCurrency(corp.monthlyExpenses || 0)}</span></div>
            <div class="stat-item"><span class="stat-label">Monthly Profit</span><span class="stat-value ${monthlyProfit < 0 ? 'negative' : ''}">${formatCurrency(monthlyProfit)}</span></div>
            <div class="stat-item"><span class="stat-label">Total Profit</span><span class="stat-value ${(corp.profit || 0) < 0 ? 'negative' : ''}">${formatCurrency(corp.profit || 0)}</span></div>
        </div>
    `;

    // Performance stats
    const corpMonthlySalary = getCorpMonthlySalary(corp);
    document.getElementById('corp-performance-stats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Employees</span><span class="stat-value">${formatNumber(corp.employees || 0)}</span></div>
            <div class="stat-item"><span class="stat-label">Facilities</span><span class="stat-value">${corp.facilities?.length || 0}</span></div>
            <div class="stat-item"><span class="stat-label">Monthly Payroll</span><span class="stat-value">${formatCurrency(corpMonthlySalary)}</span></div>
            <div class="stat-item"><span class="stat-label">Avg Salary/Employee</span><span class="stat-value">${formatCurrency(corp.employees > 0 ? corpMonthlySalary / corp.employees : 0)}</span></div>
        </div>
    `;

    // Facilities list
    const facilitiesList = document.getElementById('corp-firms-list');
    document.getElementById('facilities-count').textContent = (corp.facilities?.length || 0) + ' Facilities';

    // Debug: Log corporation and facilities info
    console.log(`Corporation ${corp.id} - ${corp.name}:`);
    console.log(`  - facilities array:`, corp.facilities);
    console.log(`  - facilities count:`, corp.facilities?.length || 0);

    // Also check firms by corporationId
    const firmsByCorporationId = Array.from(simulation.firms.values()).filter(f => f.corporationId === corp.id);
    console.log(`  - firms with corporationId=${corp.id}:`, firmsByCorporationId.length);
    if (firmsByCorporationId.length > 0) {
        console.log(`  - sample firm:`, firmsByCorporationId[0]);
    }

    if (corp.facilities && corp.facilities.length > 0) {
        facilitiesList.innerHTML = corp.facilities.map(f => {
            const typeName = getFirmTypeName(f);
            const cityName = f.city?.name || 'Unknown';
            const firmType = f.type?.toLowerCase() || 'unknown';
            return `
                <div class="firm-item clickable" data-firm-id="${f.id}">
                    <span class="firm-type">${typeName}</span>
                    <span class="firm-type-badge ${firmType}">${f.type || 'Unknown'}</span>
                    <span class="firm-location">${cityName}</span>
                    <span class="firm-stats-mini">${formatCurrency(f.revenue || 0)} rev</span>
                </div>
            `;
        }).join('');

        // Add click handlers for firm navigation
        facilitiesList.querySelectorAll('.firm-item').forEach(item => {
            item.addEventListener('click', () => {
                const firmId = item.dataset.firmId;
                window.location.href = `firms.html?id=${firmId}`;
            });
        });
    } else {
        facilitiesList.innerHTML = '<p class="empty-state">No facilities</p>';
    }

    // Orders section
    renderCorpOrders(corp);

    // Board meeting section (organic growth)
    renderBoardMeetingInfo(corp);
}

function renderCorpOrders(corp) {
    const statsContainer = document.getElementById('corp-orders-stats');
    const listContainer = document.getElementById('corp-orders-list');
    const countBadge = document.getElementById('corp-orders-count');

    const orders = getCorpOrders(corp);
    const pendingOrders = orders.filter(o => o.status === 'AWARDED');
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
    const totalValue = orders.reduce((sum, o) => sum + (o.winningBid?.totalBidValue || 0), 0);

    countBadge.textContent = orders.length + ' Orders';

    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-label">Pending</span>
                <span class="stat-value">${pendingOrders.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Delivered</span>
                <span class="stat-value">${deliveredOrders.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Value</span>
                <span class="stat-value">${formatCurrency(totalValue)}</span>
            </div>
        </div>
    `;

    if (orders.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">No orders won yet</p>';
        return;
    }

    listContainer.innerHTML = `
        <div class="firm-orders-list">
            ${orders.slice(0, 20).map(order => `
                <div class="firm-order-item">
                    <span class="firm-order-product">${order.productName}</span>
                    <span class="firm-order-qty">${order.quantity} units</span>
                    <span class="firm-order-value">${formatCurrency(order.winningBid?.totalBidValue || 0)}</span>
                    <span class="firm-order-status ${order.status === 'AWARDED' ? 'pending' : 'won'}">
                        ${order.status === 'AWARDED' ? 'Pending' : 'Delivered'}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Render board meeting and strategy information for organic growth corporations
 */
function renderBoardMeetingInfo(corp) {
    const boardSection = document.getElementById('board-meeting-section');
    const personaInfo = document.getElementById('corp-persona-info');
    const goalsInfo = document.getElementById('corp-goals-info');
    const activeProjects = document.getElementById('corp-active-projects');
    const meetingSummary = document.getElementById('corp-meeting-summary');
    const meetingHistory = document.getElementById('corp-meeting-history');
    const phaseBadge = document.getElementById('corp-phase-badge');

    // Check if organic growth is enabled and corporation has the new structure
    const isOrganicGrowth = simulation.config?.corporations?.organicGrowth;
    const hasPersona = corp.primaryPersona || corp.personas;

    if (!isOrganicGrowth || !hasPersona) {
        // Hide the section for legacy corporations
        if (boardSection) {
            boardSection.style.display = 'none';
        }
        return;
    }

    // Show the section
    if (boardSection) {
        boardSection.style.display = 'block';
    }

    // Update phase badge
    const phase = corp.goals?.phase || 1;
    const phaseNames = { 1: 'Establishment', 2: 'Growth', 3: 'Maturity' };
    phaseBadge.textContent = `Phase ${phase}: ${phaseNames[phase] || 'Unknown'}`;
    phaseBadge.className = `card-badge phase-${phase}`;

    // Render Corporate Identity / Persona
    const primaryPersona = corp.primaryPersona || {};
    const secondaryPersonas = corp.secondaryPersonas || [];
    const corpType = corp.type || 'SPECIALIST';
    const integrationLevel = corp.integrationLevel || 0;

    personaInfo.innerHTML = `
        <div class="persona-grid">
            <div class="persona-item">
                <span class="persona-label">Corporation Type</span>
                <span class="persona-value corp-type-badge ${corpType.toLowerCase()}">${formatCorpType(corpType)}</span>
            </div>
            <div class="persona-item">
                <span class="persona-label">Integration Level</span>
                <span class="persona-value">${integrationLevel} / 4</span>
            </div>
            <div class="persona-item">
                <span class="persona-label">Primary Persona</span>
                <span class="persona-value">${formatPersonaType(primaryPersona.type)}</span>
            </div>
            <div class="persona-item">
                <span class="persona-label">Primary Tier</span>
                <span class="persona-value tier-badge ${(primaryPersona.tier || '').toLowerCase()}">${primaryPersona.tier || 'Unknown'}</span>
            </div>
            ${primaryPersona.products ? `
            <div class="persona-item full-width">
                <span class="persona-label">Focus Products</span>
                <span class="persona-value">${primaryPersona.products.join(', ')}</span>
            </div>
            ` : ''}
            ${secondaryPersonas.length > 0 ? `
            <div class="persona-item full-width">
                <span class="persona-label">Secondary Personas</span>
                <span class="persona-value">${secondaryPersonas.map(p => formatPersonaType(p.type)).join(', ')}</span>
            </div>
            ` : ''}
        </div>
        ${corp.attributes ? renderAttributes(corp.attributes) : ''}
    `;

    // Render Strategic Goals
    const goals = corp.goals || {};
    const currentGoal = goals.primary || 'ESTABLISH_OPERATIONS';
    const targetFirms = goals.targetFirms || 3;
    const completedGoals = goals.completedGoals || [];

    goalsInfo.innerHTML = `
        <div class="goals-grid">
            <div class="goal-item current-goal">
                <span class="goal-label">Current Goal</span>
                <span class="goal-value">${formatGoalType(currentGoal)}</span>
            </div>
            <div class="goal-item">
                <span class="goal-label">Target Firms</span>
                <span class="goal-value">${corp.firms?.length || corp.facilities?.length || 0} / ${targetFirms}</span>
            </div>
            <div class="goal-item">
                <span class="goal-label">Capital Available</span>
                <span class="goal-value">${formatCurrency(corp.capital || 0)}</span>
            </div>
            ${completedGoals.length > 0 ? `
            <div class="goal-item full-width">
                <span class="goal-label">Completed Goals</span>
                <span class="goal-value completed-goals">
                    ${completedGoals.map(g => `<span class="completed-goal-badge">${formatGoalType(g)}</span>`).join(' ')}
                </span>
            </div>
            ` : ''}
        </div>
    `;

    // Render Active Projects
    const projects = corp.boardMeeting?.activeProjects || [];
    const corporationManager = simulation.corporationManager;
    const pendingCreations = corporationManager?.pendingFirmCreations?.filter(p => p.corporationId === corp.id) || [];

    if (projects.length > 0 || pendingCreations.length > 0) {
        const allProjects = [...projects, ...pendingCreations];
        activeProjects.innerHTML = `
            <div class="projects-list">
                ${allProjects.map(project => {
                    const progress = project.completionMonth && corporationManager?.monthsElapsed
                        ? Math.min(100, Math.round(((corporationManager.monthsElapsed - project.startMonth) / (project.completionMonth - project.startMonth)) * 100))
                        : 0;
                    return `
                    <div class="project-item ${project.status?.toLowerCase() || 'in-progress'}">
                        <div class="project-header">
                            <span class="project-type">${formatDecisionType(project.type)}</span>
                            <span class="project-status">${project.status || 'IN_PROGRESS'}</span>
                        </div>
                        <div class="project-details">
                            ${project.persona ? `<span class="project-persona">${formatPersonaType(project.persona.type)}</span>` : ''}
                            ${project.cost ? `<span class="project-cost">${formatCurrency(project.cost)}</span>` : ''}
                            ${project.rationale ? `<span class="project-rationale">${project.rationale}</span>` : ''}
                        </div>
                        ${progress > 0 ? `
                        <div class="project-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <span class="progress-text">${progress}% complete</span>
                        </div>
                        ` : ''}
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        activeProjects.innerHTML = '<p class="empty-state">No active projects</p>';
    }

    // Render Last Board Meeting
    const lastMeeting = corp.boardMeeting?.lastMeeting;
    if (lastMeeting) {
        const summary = lastMeeting.summary || {};
        meetingSummary.innerHTML = `
            <div class="meeting-summary-content">
                <div class="meeting-date">
                    Meeting Date: ${formatMeetingDate(lastMeeting.date)}
                </div>
                <div class="meeting-stats-grid">
                    <div class="meeting-stat">
                        <span class="stat-label">Options Generated</span>
                        <span class="stat-value">${summary.optionsGenerated || 0}</span>
                    </div>
                    <div class="meeting-stat">
                        <span class="stat-label">Approved</span>
                        <span class="stat-value approved">${summary.approved || 0}</span>
                    </div>
                    <div class="meeting-stat">
                        <span class="stat-label">Deferred</span>
                        <span class="stat-value deferred">${summary.deferred || 0}</span>
                    </div>
                    <div class="meeting-stat">
                        <span class="stat-label">Current Goal</span>
                        <span class="stat-value">${formatGoalType(summary.currentGoal)}</span>
                    </div>
                </div>
                ${lastMeeting.approvedProjects?.length > 0 ? `
                <div class="approved-decisions">
                    <h5>Approved Decisions</h5>
                    <ul class="decisions-list">
                        ${lastMeeting.approvedProjects.map(d => `
                            <li class="decision-item approved">
                                <span class="decision-type">${formatDecisionType(d.type)}</span>
                                ${d.rationale ? `<span class="decision-rationale">${d.rationale}</span>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}
                ${lastMeeting.deferredProjects?.length > 0 ? `
                <div class="deferred-decisions">
                    <h5>Deferred Decisions</h5>
                    <ul class="decisions-list">
                        ${lastMeeting.deferredProjects.slice(0, 5).map(d => `
                            <li class="decision-item deferred">
                                <span class="decision-type">${formatDecisionType(d.type)}</span>
                                ${d.reason ? `<span class="decision-reason">${d.reason}</span>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
        `;
    } else {
        meetingSummary.innerHTML = '<p class="empty-state">No board meetings held yet</p>';
    }

    // Render Meeting History
    const history = corp.boardMeeting?.meetingHistory || [];
    if (history.length > 0) {
        meetingHistory.innerHTML = `
            <div class="meeting-history-list">
                ${history.slice(-6).reverse().map(meeting => {
                    const s = meeting.summary || {};
                    return `
                    <div class="history-item">
                        <span class="history-date">${formatMeetingDate(meeting.date)}</span>
                        <span class="history-stats">
                            <span class="approved">${s.approved || 0} approved</span>
                            <span class="deferred">${s.deferred || 0} deferred</span>
                        </span>
                        <span class="history-goal">${formatGoalType(s.currentGoal)}</span>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        meetingHistory.innerHTML = '<p class="empty-state">No meeting history</p>';
    }
}

/**
 * Render corporation attributes as a visual indicator
 */
function renderAttributes(attributes) {
    if (!attributes) return '';

    const attrs = [
        { key: 'riskTolerance', label: 'Risk Tolerance', low: 'Conservative', high: 'Aggressive' },
        { key: 'qualityFocus', label: 'Quality Focus', low: 'Cost-focused', high: 'Quality-focused' },
        { key: 'growthOrientation', label: 'Growth', low: 'Stable', high: 'Growth-oriented' },
        { key: 'integrationPreference', label: 'Integration', low: 'Independent', high: 'Integrated' }
    ];

    return `
        <div class="attributes-section">
            <h5>Corporation Attributes</h5>
            <div class="attributes-grid">
                ${attrs.map(attr => {
                    const value = attributes[attr.key] || 0.5;
                    const percentage = Math.round(value * 100);
                    return `
                    <div class="attribute-item">
                        <span class="attribute-label">${attr.label}</span>
                        <div class="attribute-bar">
                            <div class="attribute-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="attribute-description">${value < 0.4 ? attr.low : value > 0.6 ? attr.high : 'Balanced'}</span>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Helper functions for formatting
function formatCorpType(type) {
    const types = {
        'SPECIALIST': 'Specialist',
        'HORIZONTAL': 'Horizontal Group',
        'VERTICAL': 'Vertical Chain',
        'CONGLOMERATE': 'Conglomerate',
        'FULL_VERTICAL': 'Full Vertical'
    };
    return types[type] || type;
}

function formatPersonaType(type) {
    if (!type) return 'Unknown';
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatGoalType(goal) {
    if (!goal) return 'Unknown';
    const goals = {
        'ESTABLISH_OPERATIONS': 'Establish Operations',
        'SECURE_SUPPLY': 'Secure Supply',
        'EXPAND_CAPACITY': 'Expand Capacity',
        'VERTICAL_INTEGRATION': 'Vertical Integration',
        'HORIZONTAL_EXPANSION': 'Horizontal Expansion',
        'INCREASE_MARKET_SHARE': 'Market Share',
        'IMPROVE_PROFITABILITY': 'Profitability',
        'ENTER_NEW_MARKET': 'Enter New Market'
    };
    return goals[goal] || goal;
}

function formatDecisionType(type) {
    if (!type) return 'Unknown';
    const decisions = {
        'OPEN_FIRM': 'Open New Firm',
        'SIGN_SUPPLY_CONTRACT': 'Sign Supply Contract',
        'SIGN_SALES_CONTRACT': 'Sign Sales Contract',
        'EXPAND_FIRM': 'Expand Firm',
        'CLOSE_FIRM': 'Close Firm',
        'HIRE_WORKERS': 'Hire Workers',
        'ENTER_CITY': 'Enter New City',
        'DEFER': 'Deferred',
        'CONSIDER_VERTICAL_INTEGRATION': 'Consider Integration'
    };
    return decisions[type] || type;
}

function formatMeetingDate(date) {
    if (!date) return 'Unknown';
    if (typeof date === 'object') {
        return `Month ${date.month || 1}, Year ${date.year || 2025}`;
    }
    return date;
}

init();
