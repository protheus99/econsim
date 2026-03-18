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

    // Check if we have saved state to restore
    const savedStateJson = sessionStorage.getItem('gameState');
    let savedState = null;
    if (savedStateJson) {
        try {
            savedState = JSON.parse(savedStateJson);
        } catch (e) {
            // Invalid saved state, ignore
        }
    }

    // Create and initialize simulation
    simulation = new SimulationEngine();
    await simulation.initialize();

    // Auto-resume if the simulation was running before page navigation
    if (savedState && savedState.running) {
        simulation.clock.resume();
        console.log('▶️ Auto-resumed running simulation');
    }

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

    // Expose simulation globally for debugging
    window.simulation = simulation;

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
    const btnReset = document.getElementById('btn-reset');
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

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (confirm('Reset simulation? This will start a new game with fresh data.')) {
                resetSimulation();
            }
        });
    }

    // Save/Load buttons
    const btnSave = document.getElementById('btn-save');
    const btnLoad = document.getElementById('btn-load');

    if (btnSave) {
        btnSave.addEventListener('click', () => {
            openSaveLoadModal(simulation, 'save');
        });
    }

    if (btnLoad) {
        btnLoad.addEventListener('click', () => {
            openSaveLoadModal(simulation, 'load');
        });
    }
}

/**
 * Reset the simulation completely - clears all state and reloads
 */
export function resetSimulation() {
    // Prevent beforeunload from saving state
    SimulationEngine.isResetting = true;
    // Clear saved game state
    sessionStorage.removeItem('gameState');
    // Clear session seed to get a new world
    sessionStorage.removeItem('simulation_session');
    // Reload the page to start fresh
    window.location.reload();
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

// Get full firm display name with corporation abbreviation prefix
// Uses firm's getDisplayName() method if available, otherwise constructs one
export function getFirmDisplayName(firm) {
    if (!firm) return 'Unknown';

    // Use firm's getDisplayName method if available
    if (typeof firm.getDisplayName === 'function') {
        return firm.getDisplayName();
    }

    // Fallback: construct display name with corp abbreviation
    const abbr = firm.corporationAbbreviation || '???';
    const typeName = getFirmTypeName(firm);
    return `${abbr} ${typeName}`;
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

// ==================== Save/Load Modal Functions ====================

let currentSimulation = null;
let modalMode = 'save';

/**
 * Open the save/load modal
 * @param {SimulationEngine} simulation - The simulation instance
 * @param {string} mode - 'save' or 'load'
 */
export function openSaveLoadModal(simulation, mode = 'save') {
    currentSimulation = simulation;
    modalMode = mode;

    const modal = document.getElementById('save-load-modal');
    const modalTitle = document.getElementById('modal-title');
    const saveForm = document.getElementById('save-form');
    const saveSlotName = document.getElementById('save-slot-name');

    if (!modal) return;

    // Set modal title and form visibility based on mode
    if (mode === 'save') {
        modalTitle.textContent = 'Save Game';
        saveForm.style.display = 'block';
        // Default save name based on current game time
        const clock = simulation.clock;
        saveSlotName.value = `Save ${clock.year}-${String(clock.month).padStart(2, '0')}-${String(clock.day).padStart(2, '0')}`;
    } else {
        modalTitle.textContent = 'Load Game';
        saveForm.style.display = 'none';
    }

    // Show modal
    modal.style.display = 'flex';

    // Load saves list
    refreshSavesList();

    // Setup event listeners
    setupModalEventListeners();
}

/**
 * Close the save/load modal
 */
export function closeSaveLoadModal() {
    const modal = document.getElementById('save-load-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Setup modal event listeners
 */
function setupModalEventListeners() {
    const modal = document.getElementById('save-load-modal');
    const modalClose = document.getElementById('modal-close');
    const btnSaveConfirm = document.getElementById('btn-save-confirm');

    // Close button
    if (modalClose) {
        modalClose.onclick = closeSaveLoadModal;
    }

    // Click outside to close
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeSaveLoadModal();
            }
        };
    }

    // Escape key to close
    document.onkeydown = (e) => {
        if (e.key === 'Escape') {
            closeSaveLoadModal();
        }
    };

    // Save confirm button
    if (btnSaveConfirm) {
        btnSaveConfirm.onclick = async () => {
            const saveSlotName = document.getElementById('save-slot-name');
            const slotName = saveSlotName.value.trim() || 'quicksave';

            try {
                btnSaveConfirm.disabled = true;
                btnSaveConfirm.textContent = 'Saving...';

                await currentSimulation.saveToSlot(slotName);

                btnSaveConfirm.textContent = 'Saved!';
                setTimeout(() => {
                    btnSaveConfirm.disabled = false;
                    btnSaveConfirm.textContent = 'Save Game';
                    refreshSavesList();
                }, 1000);

            } catch (error) {
                console.error('Save failed:', error);
                btnSaveConfirm.textContent = 'Save Failed';
                btnSaveConfirm.disabled = false;
                setTimeout(() => {
                    btnSaveConfirm.textContent = 'Save Game';
                }, 2000);
            }
        };
    }
}

/**
 * Refresh the saves list in the modal
 */
async function refreshSavesList() {
    const savesItems = document.getElementById('saves-items');
    const storageStats = document.getElementById('storage-stats');

    if (!savesItems || !currentSimulation) return;

    savesItems.innerHTML = '<div class="loading">Loading saves...</div>';

    try {
        const saves = await currentSimulation.listSaves();
        const stats = await currentSimulation.getStorageStats();

        // Update storage stats
        if (storageStats) {
            storageStats.textContent = `${saves.length} saves (${stats.totalSizeFormatted})`;
        }

        if (saves.length === 0) {
            savesItems.innerHTML = `
                <div class="saves-empty">
                    <div class="empty-icon">📂</div>
                    <div>No saved games yet</div>
                </div>
            `;
            return;
        }

        // Render saves list
        savesItems.innerHTML = saves.map(save => {
            const savedDate = new Date(save.savedAt);
            const gameTime = save.gameTime
                ? `Year ${save.gameTime.year}, Month ${save.gameTime.month}, Day ${save.gameTime.day}`
                : 'Unknown';
            const sizeKB = save.size ? (save.size / 1024).toFixed(1) : '?';

            return `
                <div class="save-item" data-save-id="${save.id}">
                    <div class="save-item-info">
                        <div class="save-item-name">
                            ${save.slot}
                            ${save.isAutosave ? '<span class="autosave-badge">AUTO</span>' : ''}
                        </div>
                        <div class="save-item-meta">
                            ${gameTime} | ${savedDate.toLocaleString()} | ${sizeKB}KB
                        </div>
                    </div>
                    <div class="save-item-actions">
                        <button class="btn-load-save" data-save-id="${save.id}">Load</button>
                        <button class="btn-delete-save" data-save-id="${save.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to buttons
        savesItems.querySelectorAll('.btn-load-save').forEach(btn => {
            btn.onclick = () => loadSave(btn.dataset.saveId);
        });

        savesItems.querySelectorAll('.btn-delete-save').forEach(btn => {
            btn.onclick = () => deleteSave(btn.dataset.saveId);
        });

    } catch (error) {
        console.error('Failed to load saves:', error);
        savesItems.innerHTML = `<div class="saves-empty">Failed to load saves</div>`;
    }
}

/**
 * Load a save
 * @param {string} saveId - The save ID to load
 */
async function loadSave(saveId) {
    if (!currentSimulation) return;

    if (!confirm('Load this save? Current progress will be lost.')) {
        return;
    }

    try {
        const success = await currentSimulation.loadFromSlot(saveId);
        if (success) {
            closeSaveLoadModal();
            // Reload page to reinitialize UI with new state
            window.location.reload();
        } else {
            alert('Failed to load save');
        }
    } catch (error) {
        console.error('Load failed:', error);
        alert('Failed to load save: ' + error.message);
    }
}

/**
 * Delete a save
 * @param {string} saveId - The save ID to delete
 */
async function deleteSave(saveId) {
    if (!currentSimulation) return;

    if (!confirm('Delete this save?')) {
        return;
    }

    try {
        await currentSimulation.deleteSave(saveId);
        refreshSavesList();
    } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete save');
    }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
}
