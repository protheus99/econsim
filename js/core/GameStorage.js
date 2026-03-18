/**
 * GameStorage - IndexedDB-based persistent storage for game state
 *
 * Replaces sessionStorage with IndexedDB for:
 * - Larger storage capacity (100MB+ vs 5MB)
 * - Persistence across browser sessions
 * - Multiple save slots
 * - Autosave support
 */

const DB_NAME = 'econsim';
const DB_VERSION = 1;
const STORE_SAVES = 'saves';
const STORE_META = 'meta';

class GameStorageManager {
    constructor() {
        this.db = null;
        this.isReady = false;
        this._readyPromise = null;
    }

    /**
     * Initialize the database
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this._readyPromise) {
            return this._readyPromise;
        }

        this._readyPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                console.log('✅ GameStorage initialized (IndexedDB)');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Saves store - holds game state saves
                if (!db.objectStoreNames.contains(STORE_SAVES)) {
                    const savesStore = db.createObjectStore(STORE_SAVES, { keyPath: 'id' });
                    savesStore.createIndex('slot', 'slot', { unique: false });
                    savesStore.createIndex('savedAt', 'savedAt', { unique: false });
                    savesStore.createIndex('isAutosave', 'isAutosave', { unique: false });
                }

                // Meta store - holds metadata like current session, settings
                if (!db.objectStoreNames.contains(STORE_META)) {
                    db.createObjectStore(STORE_META, { keyPath: 'key' });
                }

                console.log('📦 GameStorage database created/upgraded');
            };
        });

        return this._readyPromise;
    }

    /**
     * Ensure database is ready before operations
     */
    async _ensureReady() {
        if (!this.isReady) {
            await this.initialize();
        }
    }

    // ==================== Save Operations ====================

    /**
     * Save game state
     * @param {string} slot - Save slot name (e.g., 'autosave', 'save1', 'quicksave')
     * @param {Object} state - Game state to save
     * @param {Object} options - Additional options
     * @returns {Promise<string>} Save ID
     */
    async saveGame(slot, state, options = {}) {
        await this._ensureReady();

        const saveId = `${slot}_${Date.now()}`;
        const save = {
            id: saveId,
            slot,
            savedAt: Date.now(),
            isAutosave: options.isAutosave || false,
            gameTime: state.clock ? {
                year: state.clock.year,
                month: state.clock.month,
                day: state.clock.day,
                hour: state.clock.hour
            } : null,
            state: state,
            version: state.version || 1,
            size: JSON.stringify(state).length
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_SAVES], 'readwrite');
            const store = transaction.objectStore(STORE_SAVES);

            const request = store.put(save);

            request.onsuccess = () => {
                console.log(`💾 Game saved to slot '${slot}' (${(save.size / 1024).toFixed(1)}KB)`);

                // Clean up old autosaves if this is an autosave
                if (options.isAutosave) {
                    this._cleanupOldAutosaves(options.maxAutosaves || 5);
                }

                resolve(saveId);
            };

            request.onerror = () => {
                console.error('Failed to save game:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Load game state from slot
     * @param {string} slotOrId - Slot name or specific save ID
     * @returns {Promise<Object|null>} Saved game state or null
     */
    async loadGame(slotOrId) {
        await this._ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_SAVES], 'readonly');
            const store = transaction.objectStore(STORE_SAVES);

            // Try loading by ID first
            const idRequest = store.get(slotOrId);

            idRequest.onsuccess = () => {
                if (idRequest.result) {
                    console.log(`📂 Loaded save: ${slotOrId}`);
                    resolve(idRequest.result.state);
                    return;
                }

                // Fall back to loading latest from slot
                const index = store.index('slot');
                const range = IDBKeyRange.only(slotOrId);
                const cursorRequest = index.openCursor(range, 'prev');

                cursorRequest.onsuccess = () => {
                    const cursor = cursorRequest.result;
                    if (cursor) {
                        console.log(`📂 Loaded latest from slot '${slotOrId}'`);
                        resolve(cursor.value.state);
                    } else {
                        resolve(null);
                    }
                };

                cursorRequest.onerror = () => reject(cursorRequest.error);
            };

            idRequest.onerror = () => reject(idRequest.error);
        });
    }

    /**
     * Get latest save (any slot)
     * @returns {Promise<Object|null>}
     */
    async getLatestSave() {
        await this._ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_SAVES], 'readonly');
            const store = transaction.objectStore(STORE_SAVES);
            const index = store.index('savedAt');
            const cursorRequest = index.openCursor(null, 'prev');

            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (cursor) {
                    resolve(cursor.value);
                } else {
                    resolve(null);
                }
            };

            cursorRequest.onerror = () => reject(cursorRequest.error);
        });
    }

    /**
     * List all saves
     * @returns {Promise<Array>}
     */
    async listSaves() {
        await this._ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_SAVES], 'readonly');
            const store = transaction.objectStore(STORE_SAVES);
            const index = store.index('savedAt');
            const request = index.getAll();

            request.onsuccess = () => {
                // Return sorted by date, newest first, without the full state
                const saves = request.result
                    .map(save => ({
                        id: save.id,
                        slot: save.slot,
                        savedAt: save.savedAt,
                        isAutosave: save.isAutosave,
                        gameTime: save.gameTime,
                        size: save.size
                    }))
                    .sort((a, b) => b.savedAt - a.savedAt);
                resolve(saves);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a save
     * @param {string} saveId - Save ID to delete
     * @returns {Promise<boolean>}
     */
    async deleteSave(saveId) {
        await this._ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_SAVES], 'readwrite');
            const store = transaction.objectStore(STORE_SAVES);
            const request = store.delete(saveId);

            request.onsuccess = () => {
                console.log(`🗑️ Deleted save: ${saveId}`);
                resolve(true);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete all saves for a slot
     * @param {string} slot - Slot name
     * @returns {Promise<number>} Number of saves deleted
     */
    async clearSlot(slot) {
        await this._ensureReady();

        const saves = await this.listSaves();
        const toDelete = saves.filter(s => s.slot === slot);

        for (const save of toDelete) {
            await this.deleteSave(save.id);
        }

        return toDelete.length;
    }

    /**
     * Clean up old autosaves, keeping only the most recent N
     */
    async _cleanupOldAutosaves(keepCount = 5) {
        const saves = await this.listSaves();
        const autosaves = saves
            .filter(s => s.isAutosave)
            .sort((a, b) => b.savedAt - a.savedAt);

        if (autosaves.length > keepCount) {
            const toDelete = autosaves.slice(keepCount);
            for (const save of toDelete) {
                await this.deleteSave(save.id);
            }
            console.log(`🧹 Cleaned up ${toDelete.length} old autosaves`);
        }
    }

    // ==================== Metadata Operations ====================

    /**
     * Set metadata value
     * @param {string} key - Metadata key
     * @param {*} value - Value to store
     */
    async setMeta(key, value) {
        await this._ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_META], 'readwrite');
            const store = transaction.objectStore(STORE_META);
            const request = store.put({ key, value, updatedAt: Date.now() });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get metadata value
     * @param {string} key - Metadata key
     * @returns {Promise<*>}
     */
    async getMeta(key) {
        await this._ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_META], 'readonly');
            const store = transaction.objectStore(STORE_META);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result?.value ?? null);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete metadata
     * @param {string} key - Metadata key
     */
    async deleteMeta(key) {
        await this._ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_META], 'readwrite');
            const store = transaction.objectStore(STORE_META);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== Session Storage Compatibility ====================

    /**
     * Compatibility layer for sessionStorage.setItem
     * Stores to 'session' slot
     */
    async setItem(key, value) {
        await this.setMeta(`session_${key}`, value);
    }

    /**
     * Compatibility layer for sessionStorage.getItem
     */
    async getItem(key) {
        return await this.getMeta(`session_${key}`);
    }

    /**
     * Compatibility layer for sessionStorage.removeItem
     */
    async removeItem(key) {
        await this.deleteMeta(`session_${key}`);
    }

    // ==================== Utility ====================

    /**
     * Get storage statistics
     */
    async getStats() {
        const saves = await this.listSaves();
        const totalSize = saves.reduce((sum, s) => sum + (s.size || 0), 0);

        return {
            saveCount: saves.length,
            totalSize,
            totalSizeFormatted: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
            oldestSave: saves[saves.length - 1]?.savedAt,
            newestSave: saves[0]?.savedAt,
            slots: [...new Set(saves.map(s => s.slot))]
        };
    }

    /**
     * Clear all data (use with caution!)
     */
    async clearAll() {
        await this._ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_SAVES, STORE_META], 'readwrite');

            transaction.objectStore(STORE_SAVES).clear();
            transaction.objectStore(STORE_META).clear();

            transaction.oncomplete = () => {
                console.log('🗑️ All game data cleared');
                resolve();
            };

            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Check if IndexedDB is supported
     */
    static isSupported() {
        return typeof indexedDB !== 'undefined';
    }
}

// Export singleton instance
export const gameStorage = new GameStorageManager();

// Also export the class for testing
export { GameStorageManager };
