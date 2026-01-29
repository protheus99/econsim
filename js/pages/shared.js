// js/pages/shared.js
// Shared utilities for all pages

import { SimulationEngine } from '../core/SimulationEngine.js';

// Singleton simulation instance shared across pages
let simulation = null;
let updateCallbacks = [];
let clockIntervalId = null;
let controlsInitialized = false;

export async function getSimulation() {
    if (simulation) {
        return simulation;
    }

    // Create and initialize simulation
    simulation = new SimulationEngine();
    simulation.initialize();

    // Setup update listener using window events (SimulationEngine uses dispatchEvent)
    window.addEventListener('simulation-update', (event) => {
        updateCallbacks.forEach(cb => {
            try {
                cb(simulation);
            } catch (e) {
                console.error('Error in update callback:', e);
            }
        });
    });

    return simulation;
}

export function onUpdate(callback) {
    updateCallbacks.push(callback);
}

export function removeUpdateCallback(callback) {
    const index = updateCallbacks.indexOf(callback);
    if (index > -1) {
        updateCallbacks.splice(index, 1);
    }
}

export function formatNumber(num) {
    if (num == null || isNaN(num)) return '0';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
}

export function formatCurrency(num) {
    if (num == null || isNaN(num)) return '$0';
    return '$' + formatNumber(num);
}

export function formatPercent(num) {
    if (num == null || isNaN(num)) return '0%';
    return (num * 100).toFixed(1) + '%';
}

export function setupClock(simulation) {
    // Clear any existing interval to prevent memory leaks
    if (clockIntervalId) {
        clearInterval(clockIntervalId);
        clockIntervalId = null;
    }

    const gameDate = document.getElementById('game-date');
    const realTime = document.getElementById('real-time');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    function updateClock() {
        if (!simulation || !simulation.clock) return;

        try {
            const time = simulation.clock.getGameTime();
            if (gameDate) {
                gameDate.textContent = `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')} ${String(time.hour).padStart(2, '0')}:00`;
            }

            if (realTime) {
                // Use getElapsed() method instead of realTimeElapsed property
                const elapsedStr = simulation.clock.getElapsed();
                realTime.textContent = elapsedStr;
            }

            if (statusIndicator && statusText) {
                if (simulation.clock.isPaused) {
                    statusIndicator.className = 'status-indicator status-paused';
                    statusText.textContent = 'Paused';
                } else {
                    statusIndicator.className = 'status-indicator status-running';
                    statusText.textContent = 'Running';
                }
            }
        } catch (e) {
            console.error('Error updating clock:', e);
        }
    }

    clockIntervalId = setInterval(updateClock, 100);
    updateClock();

    // Return cleanup function
    return () => {
        if (clockIntervalId) {
            clearInterval(clockIntervalId);
            clockIntervalId = null;
        }
    };
}

export function setupControls(simulation) {
    // Prevent duplicate initialization
    if (controlsInitialized) return;
    controlsInitialized = true;

    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    const speedButtons = document.querySelectorAll('.btn-speed');

    if (btnPlay) {
        btnPlay.setAttribute('aria-label', 'Play simulation');
        btnPlay.addEventListener('click', () => {
            try {
                simulation.clock.resume();
            } catch (e) {
                console.error('Error resuming simulation:', e);
            }
        });
    }

    if (btnPause) {
        btnPause.setAttribute('aria-label', 'Pause simulation');
        btnPause.addEventListener('click', () => {
            try {
                simulation.clock.pause();
            } catch (e) {
                console.error('Error pausing simulation:', e);
            }
        });
    }

    speedButtons.forEach(btn => {
        const speed = btn.dataset.speed;
        btn.setAttribute('aria-label', `Set speed to ${speed}x`);
        btn.addEventListener('click', () => {
            try {
                const speedValue = parseFloat(speed);
                simulation.setSpeed(speedValue);
                speedButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } catch (e) {
                console.error('Error setting speed:', e);
            }
        });
    });
}

// Utility function for safe DOM element access
export function getElement(id) {
    return document.getElementById(id);
}

// Utility function for safe innerHTML update
export function setHTML(elementOrId, html) {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (el) {
        el.innerHTML = html;
    }
}

// Utility function for safe textContent update
export function setText(elementOrId, text) {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (el) {
        el.textContent = text;
    }
}

// Get firm type name (without ID suffix)
export function getFirmTypeName(firm) {
    if (!firm) return 'Unknown';

    switch (firm.type) {
        case 'MINING': return `${firm.resourceType || 'Mining'} Mine`;
        case 'LOGGING': return `${firm.timberType || 'Timber'} Logging`;
        case 'FARM':
            if (firm.farmType === 'CROP') {
                return `${firm.cropType || 'Crop'} Farm`;
            } else {
                return `${firm.livestockType || 'Livestock'} Ranch`;
            }
        case 'MANUFACTURING': return `${firm.product?.name || 'Manufacturing'} Plant`;
        case 'RETAIL':
            const storeTypeNames = {
                'SUPERMARKET': 'Supermarket',
                'DEPARTMENT': 'Department Store',
                'ELECTRONICS': 'Electronics Store',
                'FURNITURE': 'Furniture Store'
            };
            return storeTypeNames[firm.storeType] || `${firm.storeType || 'Retail'} Store`;
        case 'BANK':
            const bankTypeNames = {
                'COMMERCIAL': 'Commercial Bank',
                'INVESTMENT': 'Investment Bank',
                'CENTRAL': 'Central Bank'
            };
            return bankTypeNames[firm.bankType] || firm.bankType || 'Bank';
        default: return firm.type || 'Unknown';
    }
}

// Get full firm display name with ID suffix
// Uses firm's getDisplayName() method if available, otherwise constructs one
export function getFirmDisplayName(firm) {
    if (!firm) return 'Unknown';

    // Use firm's getDisplayName method if available
    if (typeof firm.getDisplayName === 'function') {
        return firm.getDisplayName();
    }

    // Fallback: construct display name
    const typeName = getFirmTypeName(firm);
    const shortId = (firm.id || '').toString().slice(-6);
    return `${typeName} #${shortId}`;
}

// Get firm display name with corporation name prefix
export function getFirmFullDisplayName(firm, corporations) {
    if (!firm) return 'Unknown';

    const displayName = getFirmDisplayName(firm);

    // Find corporation if we have the list
    if (corporations && firm.corporationId) {
        const corp = corporations.find(c => c.id === firm.corporationId);
        if (corp) {
            return `${corp.name} - ${displayName}`;
        }
    }

    return displayName;
}

// Cleanup function for page unload
export function cleanup() {
    if (clockIntervalId) {
        clearInterval(clockIntervalId);
        clockIntervalId = null;
    }
    updateCallbacks = [];
    controlsInitialized = false;
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
}
