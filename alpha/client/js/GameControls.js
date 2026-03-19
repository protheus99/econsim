/**
 * GameControls.js - Shared game control component
 *
 * Provides play/pause and speed controls for all pages
 */

export class GameControls {
    constructor(wsClient, stateManager, containerId = 'game-controls') {
        this.wsClient = wsClient;
        this.stateManager = stateManager;
        this.containerId = containerId;
        this.container = null;
    }

    /**
     * Get the CSS styles for game controls
     */
    static getStyles() {
        return `
            .game-controls-bar {
                background: #1e1e1e;
                padding: 10px 20px;
                border-radius: 6px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }
            .game-controls-left {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .game-controls-right {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            .gc-btn {
                padding: 6px 12px;
                border-radius: 4px;
                border: 1px solid #444;
                background: #2a2a2a;
                color: #fff;
                cursor: pointer;
                font-size: 13px;
                transition: background 0.2s;
            }
            .gc-btn:hover { background: #3a3a3a; }
            .gc-btn.active { background: #00d4ff; color: #000; border-color: #00d4ff; }
            .gc-btn-play { color: #4caf50; }
            .gc-btn-pause { color: #ff9800; }
            .gc-separator { color: #444; margin: 0 5px; }
            .gc-clock {
                font-size: 18px;
                font-weight: bold;
                color: #00d4ff;
                font-family: monospace;
            }
            .gc-status {
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 4px;
            }
            .gc-status-running { background: #1a3a2a; color: #4caf50; }
            .gc-status-paused { background: #3a3a1a; color: #ff9800; }
            .gc-status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                display: inline-block;
                margin-right: 5px;
            }
            .gc-indicator-running { background: #4caf50; }
            .gc-indicator-paused { background: #ff9800; }
        `;
    }

    /**
     * Get the HTML for game controls
     */
    static getHTML() {
        return `
            <div class="game-controls-bar" id="game-controls">
                <div class="game-controls-left">
                    <button class="gc-btn gc-btn-play" id="gc-play" title="Resume">&#9658; Play</button>
                    <button class="gc-btn gc-btn-pause" id="gc-pause" title="Pause">&#10074;&#10074; Pause</button>
                    <span class="gc-separator">|</span>
                    <button class="gc-btn gc-speed" data-speed="1">1x</button>
                    <button class="gc-btn gc-speed" data-speed="2">2x</button>
                    <button class="gc-btn gc-speed" data-speed="4">4x</button>
                    <button class="gc-btn gc-speed" data-speed="8">8x</button>
                    <button class="gc-btn gc-speed" data-speed="24">1D</button>
                    <button class="gc-btn gc-speed" data-speed="168">1W</button>
                </div>
                <div class="game-controls-right">
                    <span class="gc-status gc-status-paused" id="gc-status">
                        <span class="gc-status-indicator gc-indicator-paused" id="gc-indicator"></span>
                        <span id="gc-status-text">Paused</span>
                    </span>
                    <span class="gc-clock" id="gc-clock">--</span>
                </div>
            </div>
        `;
    }

    /**
     * Initialize controls - call after DOM is ready
     */
    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.warn('GameControls: Container not found:', this.containerId);
            return;
        }

        this._bindEvents();
        this._subscribeToState();
    }

    /**
     * Bind click events to control buttons
     */
    _bindEvents() {
        const playBtn = document.getElementById('gc-play');
        const pauseBtn = document.getElementById('gc-pause');

        if (playBtn) {
            playBtn.addEventListener('click', () => this.wsClient.resume());
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.wsClient.pause());
        }

        document.querySelectorAll('.gc-speed').forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = parseInt(btn.dataset.speed);
                this.wsClient.setSpeed(speed);
            });
        });
    }

    /**
     * Subscribe to state changes
     */
    _subscribeToState() {
        // Clock display
        this.stateManager.subscribe('clockFormatted', (formatted) => {
            const clock = document.getElementById('gc-clock');
            if (clock) clock.textContent = formatted || '--';
        });

        // Speed indicator
        this.stateManager.subscribe('speed', (speed) => {
            document.querySelectorAll('.gc-speed').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed);
            });
        });

        // Pause/Running status
        this.stateManager.subscribe('isPaused', (isPaused) => {
            const status = document.getElementById('gc-status');
            const indicator = document.getElementById('gc-indicator');
            const statusText = document.getElementById('gc-status-text');

            if (status) {
                status.className = 'gc-status ' + (isPaused ? 'gc-status-paused' : 'gc-status-running');
            }
            if (indicator) {
                indicator.className = 'gc-status-indicator ' + (isPaused ? 'gc-indicator-paused' : 'gc-indicator-running');
            }
            if (statusText) {
                statusText.textContent = isPaused ? 'Paused' : 'Running';
            }
        });
    }
}

/**
 * Helper to inject styles into page
 */
export function injectControlStyles() {
    if (document.getElementById('game-controls-styles')) return;

    const style = document.createElement('style');
    style.id = 'game-controls-styles';
    style.textContent = GameControls.getStyles();
    document.head.appendChild(style);
}

/**
 * Quick setup function for pages
 */
export function setupGameControls(wsClient, stateManager) {
    injectControlStyles();
    const controls = new GameControls(wsClient, stateManager);
    controls.init();
    return controls;
}
