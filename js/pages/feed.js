// js/pages/feed.js
import { getSimulation, onUpdate, setupClock, setupControls, formatNumber } from './shared.js';

let simulation;
let feedPaused = false;
let typeFilter = 'all';
let severityFilter = 'all';
let events = [];
let eventStats = {
    total: 0,
    transaction: 0,
    production: 0,
    market: 0,
    other: 0,
    warning: 0,
    critical: 0
};

async function init() {
    simulation = await getSimulation();
    setupClock(simulation);
    setupControls(simulation);

    document.getElementById('feed-type-filter')?.addEventListener('change', (e) => {
        typeFilter = e.target.value;
        renderFeed();
    });

    document.getElementById('feed-severity-filter')?.addEventListener('change', (e) => {
        severityFilter = e.target.value;
        renderFeed();
    });

    document.getElementById('btn-clear-feed')?.addEventListener('click', () => {
        events = [];
        eventStats = { total: 0, transaction: 0, production: 0, market: 0, other: 0, warning: 0, critical: 0 };
        updateStats();
        renderFeed();
    });

    document.getElementById('btn-pause-feed')?.addEventListener('click', (e) => {
        feedPaused = !feedPaused;
        e.target.textContent = feedPaused ? 'Resume Feed' : 'Pause Feed';
        document.getElementById('feed-status').textContent = feedPaused ? 'Paused' : 'Live';
    });

    // Generate events on updates
    onUpdate(() => {
        if (!feedPaused) {
            generateEvents();
            updateStats();
            renderFeed();
        }
    });

    updateStats();
    renderFeed();
}

function generateEvents() {
    const log = simulation.transactionLog;
    if (!log) return;

    // Check for new transactions
    const recentTransactions = log.transactions.slice(-5);
    recentTransactions.forEach(t => {
        if (!events.find(e => e.id === t.id)) {
            const event = {
                id: t.id,
                type: 'transaction',
                severity: 'info',
                message: `${t.type}: ${t.seller?.name || 'Unknown'} → ${t.buyer?.name || 'Unknown'} (${t.quantity} ${t.material || 'items'})`,
                timestamp: new Date(t.timestamp)
            };
            addEvent(event);
        }
    });

    // Generate random production events occasionally
    if (Math.random() < 0.1) {
        const firms = Array.from(simulation.firms.values());
        const firm = firms[Math.floor(Math.random() * firms.length)];
        if (firm) {
            const event = {
                id: 'prod_' + Date.now() + Math.random(),
                type: 'production',
                severity: 'info',
                message: `${firm.type} ${firm.id.slice(-6)} completed production cycle`,
                timestamp: new Date()
            };
            addEvent(event);
        }
    }

    // Market events
    if (Math.random() < 0.05) {
        const event = {
            id: 'mkt_' + Date.now() + Math.random(),
            type: 'market',
            severity: Math.random() < 0.2 ? 'warning' : 'info',
            message: `Global market price fluctuation detected`,
            timestamp: new Date()
        };
        addEvent(event);
    }
}

function addEvent(event) {
    events.unshift(event);
    eventStats.total++;
    eventStats[event.type] = (eventStats[event.type] || 0) + 1;
    if (event.severity === 'warning') eventStats.warning++;
    if (event.severity === 'critical') eventStats.critical++;

    // Keep only last 500 events
    if (events.length > 500) {
        events = events.slice(0, 500);
    }
}

function updateStats() {
    document.getElementById('total-events').textContent = formatNumber(eventStats.total);
    document.getElementById('events-per-hour').textContent = formatNumber(eventStats.total / Math.max(1, (simulation.clock?.totalHours || 1)));
    document.getElementById('warning-count').textContent = eventStats.warning;
    document.getElementById('critical-count').textContent = eventStats.critical;

    document.getElementById('transaction-events').textContent = eventStats.transaction;
    document.getElementById('production-events').textContent = eventStats.production;
    document.getElementById('market-events').textContent = eventStats.market;
    document.getElementById('other-events').textContent = eventStats.other || 0;
}

function renderFeed() {
    const container = document.getElementById('event-feed');
    if (!container) return;

    let filtered = events;

    if (typeFilter !== 'all') {
        filtered = filtered.filter(e => e.type === typeFilter);
    }

    if (severityFilter !== 'all') {
        filtered = filtered.filter(e => e.severity === severityFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No events to display</p>';
        return;
    }

    container.innerHTML = filtered.slice(0, 100).map(e => `
        <div class="event-item ${e.type} ${e.severity}">
            <span class="event-time">${e.timestamp.toLocaleTimeString()}</span>
            <span class="event-type-badge ${e.type}">${e.type}</span>
            <span class="event-message">${e.message}</span>
            ${e.severity !== 'info' ? `<span class="event-severity ${e.severity}">${e.severity}</span>` : ''}
        </div>
    `).join('');
}

init();
