/**
 * shared.js - Alpha Client Version
 *
 * Replaces local SimulationEngine with WebSocket connection to server.
 * Maintains API compatibility with original shared.js where possible.
 */

import { wsClient } from '../WebSocketClient.js';
import { stateManager } from '../StateManager.js';

// Track update callbacks for compatibility
let updateCallbacks = [];
let clockIntervalId = null;
let controlsInitialized = false;

// Server configuration
const SERVER_URL = window.ECONSIM_SERVER_URL || 'ws://localhost:3000/ws';

/**
 * Connect to server and initialize state management
 * Replaces getSimulation() - returns stateManager instead of SimulationEngine
 */
export async function initializeClient(sessionId = null) {
    // Initialize state manager with WebSocket client
    stateManager.init(wsClient);

    // Set WebSocket URL
    wsClient.url = SERVER_URL;

    // Connect to server
    await wsClient.connect();

    // If session ID provided, join it
    if (sessionId) {
        await wsClient.joinSession(sessionId);
    }

    // Subscribe to tick updates for compatibility callbacks
    wsClient.on('tick', () => {
        updateCallbacks.forEach(cb => {
            try {
                cb(stateManager);
            } catch (e) {
                console.error('Error in update callback:', e);
            }
        });
    });

    // Expose for debugging
    window.wsClient = wsClient;
    window.stateManager = stateManager;

    return stateManager;
}

/**
 * Get current state manager (compatibility with getSimulation())
 */
export function getStateManager() {
    return stateManager;
}

/**
 * Legacy compatibility: getSimulation() returns stateManager
 * Note: Not all SimulationEngine methods will be available
 */
export async function getSimulation() {
    if (!wsClient.isConnected) {
        await initializeClient();
    }
    return stateManager;
}

/**
 * Register update callback
 */
export function onUpdate(callback) {
    updateCallbacks.push(callback);
}

/**
 * Remove update callback
 */
export function removeUpdateCallback(callback) {
    const index = updateCallbacks.indexOf(callback);
    if (index > -1) {
        updateCallbacks.splice(index, 1);
    }
}

// ==================== Formatting Utilities ====================

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

export function formatCurrencyFull(num) {
    if (num == null || isNaN(num)) return '$0.00';
    return '$' + Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function moneyClass(num) {
    if (num == null || isNaN(num) || num === 0) return '';
    return num < 0 ? 'negative' : '';
}

export function formatPercent(num) {
    if (num == null || isNaN(num)) return '0%';
    return (num * 100).toFixed(1) + '%';
}

// ==================== Clock and Controls ====================

/**
 * Setup clock display
 * Uses stateManager subscriptions instead of polling
 */
export function setupClock() {
    // Clear any existing interval
    if (clockIntervalId) {
        clearInterval(clockIntervalId);
        clockIntervalId = null;
    }

    const gameDate = document.getElementById('game-date');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    // Subscribe to clock changes
    stateManager.subscribe('clockFormatted', (formatted) => {
        if (gameDate) {
            gameDate.textContent = formatted;
        }
    });

    // Subscribe to pause state changes
    stateManager.subscribe('isPaused', (isPaused) => {
        if (statusIndicator && statusText) {
            if (isPaused) {
                statusIndicator.className = 'status-indicator status-paused';
                statusText.textContent = 'Paused';
            } else {
                statusIndicator.className = 'status-indicator status-running';
                statusText.textContent = 'Running';
            }
        }
    });

    // Initial render
    if (gameDate) {
        gameDate.textContent = stateManager.get('clockFormatted') || '--';
    }

    return () => {
        // Cleanup is handled by stateManager
    };
}

/**
 * Setup control buttons
 * Sends commands to server via WebSocket
 */
export function setupControls() {
    if (controlsInitialized) return;
    controlsInitialized = true;

    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');
    const speedButtons = document.querySelectorAll('.btn-speed');

    if (btnPlay) {
        btnPlay.setAttribute('aria-label', 'Play simulation');
        btnPlay.addEventListener('click', async () => {
            try {
                await wsClient.resume();
            } catch (e) {
                console.error('Error resuming simulation:', e);
            }
        });
    }

    if (btnPause) {
        btnPause.setAttribute('aria-label', 'Pause simulation');
        btnPause.addEventListener('click', async () => {
            try {
                await wsClient.pause();
            } catch (e) {
                console.error('Error pausing simulation:', e);
            }
        });
    }

    speedButtons.forEach(btn => {
        const speed = btn.dataset.speed;
        btn.setAttribute('aria-label', `Set speed to ${speed}x`);
        btn.addEventListener('click', async () => {
            try {
                const speedValue = parseFloat(speed);
                await wsClient.setSpeed(speedValue);
                speedButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } catch (e) {
                console.error('Error setting speed:', e);
            }
        });
    });

    if (btnReset) {
        btnReset.addEventListener('click', async () => {
            if (confirm('Reset simulation? This will start a new game with fresh data.')) {
                await resetSimulation();
            }
        });
    }

    // Subscribe to speed changes
    stateManager.subscribe('speed', (speed) => {
        speedButtons.forEach(btn => {
            const btnSpeed = parseFloat(btn.dataset.speed);
            btn.classList.toggle('active', btnSpeed === speed);
        });
    });
}

/**
 * Reset the simulation - creates new game on server
 */
export async function resetSimulation() {
    try {
        // Leave current session
        wsClient.leaveSession();

        // Create new game via API
        const response = await fetch('http://localhost:3000/api/v1/games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `Game ${new Date().toLocaleDateString()}`
            })
        });

        const data = await response.json();
        if (data.success) {
            // Join the new session
            await wsClient.joinSession(data.game.id);
            // Reload page to refresh UI
            window.location.reload();
        }
    } catch (error) {
        console.error('Error resetting simulation:', error);
        alert('Failed to reset simulation. Check server connection.');
    }
}

// ==================== DOM Utilities ====================

export function getElement(id) {
    return document.getElementById(id);
}

export function setHTML(elementOrId, html) {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (el) {
        el.innerHTML = html;
    }
}

export function setText(elementOrId, text) {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (el) {
        el.textContent = text;
    }
}

// ==================== Firm Display Utilities ====================

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

export function getFirmDisplayName(firm) {
    if (!firm) return 'Unknown';

    // Use firm's displayName if available (from server)
    if (firm.displayName) {
        return firm.displayName;
    }

    // Fallback: construct display name with corp abbreviation
    const abbr = firm.corporationAbbreviation || '???';
    const typeName = getFirmTypeName(firm);
    return `${abbr} ${typeName}`;
}

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

// ==================== Cleanup ====================

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

// ==================== Connection Status UI ====================

/**
 * Add connection status indicator to page
 */
export function setupConnectionStatus() {
    // Create status element if it doesn't exist
    let statusEl = document.getElementById('connection-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'connection-status';
        statusEl.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(statusEl);
    }

    function updateStatus() {
        const connected = stateManager.get('connected');
        const sessionId = stateManager.get('sessionId');

        if (!connected) {
            statusEl.style.backgroundColor = '#f44336';
            statusEl.style.color = 'white';
            statusEl.textContent = '⚠ Disconnected';
        } else if (!sessionId) {
            statusEl.style.backgroundColor = '#ff9800';
            statusEl.style.color = 'white';
            statusEl.textContent = '⚡ Connected (no session)';
        } else {
            statusEl.style.backgroundColor = '#4caf50';
            statusEl.style.color = 'white';
            statusEl.textContent = '✓ Connected';
        }
    }

    stateManager.subscribe(['connected', 'sessionId'], updateStatus);
    updateStatus();
}
