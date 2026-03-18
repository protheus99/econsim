/**
 * StateManager - Client-side state management
 *
 * Maintains synchronized state from server and provides
 * reactive subscriptions for UI updates
 */

export class StateManager {
    constructor() {
        // Current state
        this.state = {
            connected: false,
            sessionId: null,
            sessionName: null,

            // Clock state
            clock: null,
            totalHours: 0,
            clockFormatted: '',

            // Control state
            isPaused: true,
            speed: 1,

            // Simulation data
            stats: null,
            firms: {},
            cities: {},
            corporations: [],

            // Display summaries
            firmsSummary: null,
            citiesSummary: null
        };

        // Subscribers by key
        this.subscribers = new Map();

        // All-state subscribers
        this.globalSubscribers = [];
    }

    /**
     * Initialize with WebSocket client
     */
    init(wsClient) {
        this.wsClient = wsClient;

        // Handle connection events
        wsClient.on('connected', (data) => {
            this._update({ connected: true });
        });

        wsClient.on('disconnected', () => {
            this._update({
                connected: false,
                sessionId: null
            });
        });

        // Handle session events
        wsClient.on('sessionJoined', (data) => {
            this._update({
                sessionId: data.sessionId,
                sessionName: data.session?.name
            });
        });

        wsClient.on('sessionLeft', () => {
            this._update({
                sessionId: null,
                sessionName: null,
                clock: null,
                stats: null
            });
        });

        // Handle initial state
        wsClient.on('initialState', (data) => {
            this._handleInitialState(data);
        });

        // Handle tick updates
        wsClient.on('tick', (data) => {
            this._handleTick(data);
        });

        // Handle control updates
        wsClient.on('controlUpdate', (data) => {
            this._update({
                isPaused: data.isPaused,
                speed: data.speed
            });
        });
    }

    /**
     * Handle initial state from server
     */
    _handleInitialState(data) {
        const updates = {
            sessionId: data.sessionId,
            sessionName: data.name,
            clock: data.clock,
            totalHours: data.totalHours || 0,
            clockFormatted: data.formatted || this._formatClock(data.clock),
            isPaused: data.isPaused ?? true,
            speed: data.speed || 1,
            stats: data.stats,
            firms: data.firms || {},
            cities: data.cities || {},
            corporations: data.corporations || []
        };

        // Add display data if present
        if (data.displayData) {
            updates.firmsSummary = data.displayData.firmsSummary;
            updates.citiesSummary = data.displayData.cities;
        }

        this._update(updates);
    }

    /**
     * Handle tick update from server
     */
    _handleTick(data) {
        this._update({
            clock: data.clock,
            totalHours: data.totalHours,
            clockFormatted: data.formatted || this._formatClock(data.clock),
            stats: data.stats,
            isPaused: data.isPaused,
            speed: data.speed
        });
    }

    /**
     * Format clock for display
     */
    _formatClock(clock) {
        if (!clock) return '';
        return `${clock.year}-${String(clock.month).padStart(2, '0')}-${String(clock.day).padStart(2, '0')} ${String(clock.hour).padStart(2, '0')}:00`;
    }

    /**
     * Update state and notify subscribers
     */
    _update(updates) {
        const changedKeys = [];

        for (const [key, value] of Object.entries(updates)) {
            if (this.state[key] !== value) {
                this.state[key] = value;
                changedKeys.push(key);
            }
        }

        // Notify key-specific subscribers
        for (const key of changedKeys) {
            const subs = this.subscribers.get(key);
            if (subs) {
                subs.forEach(callback => {
                    try {
                        callback(this.state[key], key, this.state);
                    } catch (error) {
                        console.error(`StateManager callback error (${key}):`, error);
                    }
                });
            }
        }

        // Notify global subscribers
        if (changedKeys.length > 0) {
            this.globalSubscribers.forEach(callback => {
                try {
                    callback(this.state, changedKeys);
                } catch (error) {
                    console.error('StateManager global callback error:', error);
                }
            });
        }
    }

    // ==================== Subscriptions ====================

    /**
     * Subscribe to specific state key(s)
     * @param {string|string[]} keys - Key(s) to subscribe to
     * @param {Function} callback - Called with (value, key, fullState)
     * @returns {Function} Unsubscribe function
     */
    subscribe(keys, callback) {
        const keyArray = Array.isArray(keys) ? keys : [keys];

        keyArray.forEach(key => {
            if (!this.subscribers.has(key)) {
                this.subscribers.set(key, []);
            }
            this.subscribers.get(key).push(callback);
        });

        // Return unsubscribe function
        return () => {
            keyArray.forEach(key => {
                const subs = this.subscribers.get(key);
                if (subs) {
                    const index = subs.indexOf(callback);
                    if (index !== -1) {
                        subs.splice(index, 1);
                    }
                }
            });
        };
    }

    /**
     * Subscribe to all state changes
     * @param {Function} callback - Called with (fullState, changedKeys)
     * @returns {Function} Unsubscribe function
     */
    subscribeAll(callback) {
        this.globalSubscribers.push(callback);
        return () => {
            const index = this.globalSubscribers.indexOf(callback);
            if (index !== -1) {
                this.globalSubscribers.splice(index, 1);
            }
        };
    }

    // ==================== Getters ====================

    /**
     * Get current state value
     */
    get(key) {
        return this.state[key];
    }

    /**
     * Get full state snapshot
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get clock info
     */
    getClock() {
        return {
            ...this.state.clock,
            totalHours: this.state.totalHours,
            formatted: this.state.clockFormatted
        };
    }

    /**
     * Get stats
     */
    getStats() {
        return this.state.stats;
    }

    /**
     * Check if connected and in session
     */
    get isReady() {
        return this.state.connected && this.state.sessionId !== null;
    }

    // ==================== Compatibility Layer ====================

    /**
     * Compatibility: Get firms as Map-like
     * For code that expects simulation.firms
     */
    get firms() {
        return {
            get: (id) => this.state.firms[id],
            has: (id) => id in this.state.firms,
            values: () => Object.values(this.state.firms),
            entries: () => Object.entries(this.state.firms),
            size: Object.keys(this.state.firms).length,
            forEach: (callback) => {
                Object.entries(this.state.firms).forEach(([id, firm]) => {
                    callback(firm, id);
                });
            }
        };
    }

    /**
     * Compatibility: Get cities as array
     */
    get cities() {
        return Object.values(this.state.cities);
    }

    /**
     * Compatibility: Get corporations as array
     */
    get corporations() {
        return this.state.corporations;
    }
}

// Export singleton
export const stateManager = new StateManager();
