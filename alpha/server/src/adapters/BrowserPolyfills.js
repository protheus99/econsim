/**
 * BrowserPolyfills.js - Node.js compatibility layer for browser APIs
 * 
 * Provides polyfills for:
 * - window.dispatchEvent / CustomEvent
 * - sessionStorage
 * - IndexedDB (via SQLite adapter)
 */

import { EventEmitter } from 'events';

// Global event emitter to replace window events
export const globalEvents = new EventEmitter();
globalEvents.setMaxListeners(100); // Allow many listeners

/**
 * CustomEvent polyfill for Node.js
 */
export class CustomEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail || null;
        this.bubbles = options.bubbles || false;
        this.cancelable = options.cancelable || false;
        this.timeStamp = Date.now();
    }
}

/**
 * Window polyfill - minimal implementation
 */
export const windowPolyfill = {
    dispatchEvent(event) {
        globalEvents.emit(event.type, event);
        return true;
    },
    
    addEventListener(type, listener, options) {
        globalEvents.on(type, listener);
    },
    
    removeEventListener(type, listener) {
        globalEvents.off(type, listener);
    }
};

/**
 * SessionStorage polyfill using in-memory Map
 */
class SessionStoragePolyfill {
    constructor() {
        this._data = new Map();
    }
    
    getItem(key) {
        return this._data.get(key) ?? null;
    }
    
    setItem(key, value) {
        this._data.set(key, String(value));
    }
    
    removeItem(key) {
        this._data.delete(key);
    }
    
    clear() {
        this._data.clear();
    }
    
    key(index) {
        return [...this._data.keys()][index] ?? null;
    }
    
    get length() {
        return this._data.size;
    }
}

export const sessionStoragePolyfill = new SessionStoragePolyfill();
export const localStoragePolyfill = new SessionStoragePolyfill();

/**
 * Document polyfill - minimal implementation
 */
export const documentPolyfill = {
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return {}; },
    addEventListener() {}
};

/**
 * IndexedDB polyfill - mock implementation for Node.js
 * Server uses SQLite for persistence, so this just provides a compatible interface
 */
class IDBRequestPolyfill {
    constructor() {
        this.result = null;
        this.error = null;
        this.onsuccess = null;
        this.onerror = null;
    }

    _succeed(result) {
        this.result = result;
        if (this.onsuccess) {
            setTimeout(() => this.onsuccess({ target: this }), 0);
        }
    }

    _fail(error) {
        this.error = error;
        if (this.onerror) {
            setTimeout(() => this.onerror({ target: this }), 0);
        }
    }
}

class IDBIndexPolyfill {
    constructor(store, keyPath) {
        this._store = store;
        this._keyPath = keyPath;
    }

    get(key) {
        const request = new IDBRequestPolyfill();
        // Find first item matching the index key
        for (const value of this._store._data.values()) {
            if (value && value[this._keyPath] === key) {
                request._succeed(value);
                return request;
            }
        }
        request._succeed(undefined);
        return request;
    }

    getAll(key) {
        const request = new IDBRequestPolyfill();
        const results = [];
        for (const value of this._store._data.values()) {
            if (key === undefined || (value && value[this._keyPath] === key)) {
                results.push(value);
            }
        }
        request._succeed(results);
        return request;
    }
}

class IDBObjectStorePolyfill {
    constructor() {
        this._data = new Map();
        this._indexes = new Map();
        this._autoIncrement = 0;
    }

    createIndex(name, keyPath, options) {
        const index = new IDBIndexPolyfill(this, keyPath);
        this._indexes.set(name, index);
        return index;
    }

    index(name) {
        return this._indexes.get(name);
    }

    put(value, key) {
        const request = new IDBRequestPolyfill();
        const actualKey = key !== undefined ? key : value.id || ++this._autoIncrement;
        this._data.set(actualKey, value);
        request._succeed(actualKey);
        return request;
    }

    add(value, key) {
        return this.put(value, key);
    }

    get(key) {
        const request = new IDBRequestPolyfill();
        request._succeed(this._data.get(key));
        return request;
    }

    delete(key) {
        const request = new IDBRequestPolyfill();
        this._data.delete(key);
        request._succeed(undefined);
        return request;
    }

    clear() {
        const request = new IDBRequestPolyfill();
        this._data.clear();
        request._succeed(undefined);
        return request;
    }

    getAll() {
        const request = new IDBRequestPolyfill();
        request._succeed([...this._data.values()]);
        return request;
    }

    getAllKeys() {
        const request = new IDBRequestPolyfill();
        request._succeed([...this._data.keys()]);
        return request;
    }

    count() {
        const request = new IDBRequestPolyfill();
        request._succeed(this._data.size);
        return request;
    }
}

class IDBTransactionPolyfill {
    constructor(store) {
        this._store = store;
        this.oncomplete = null;
        this.onerror = null;
    }

    objectStore(name) {
        return this._store;
    }
}

class IDBDatabasePolyfill {
    constructor(name) {
        this.name = name;
        this._stores = new Map();
        this.onversionchange = null;
    }

    createObjectStore(name, options) {
        const store = new IDBObjectStorePolyfill();
        this._stores.set(name, store);
        return store;
    }

    transaction(storeNames, mode) {
        const storeName = Array.isArray(storeNames) ? storeNames[0] : storeNames;
        let store = this._stores.get(storeName);
        if (!store) {
            store = new IDBObjectStorePolyfill();
            this._stores.set(storeName, store);
        }
        const tx = new IDBTransactionPolyfill(store);
        setTimeout(() => {
            if (tx.oncomplete) tx.oncomplete({});
        }, 0);
        return tx;
    }

    close() {}

    get objectStoreNames() {
        return {
            contains: (name) => this._stores.has(name)
        };
    }
}

class IDBOpenDBRequestPolyfill extends IDBRequestPolyfill {
    constructor() {
        super();
        this.onupgradeneeded = null;
    }
}

export const indexedDBPolyfill = {
    _databases: new Map(),

    open(name, version) {
        const request = new IDBOpenDBRequestPolyfill();

        setTimeout(() => {
            let db = this._databases.get(name);
            const isNew = !db;

            if (isNew) {
                db = new IDBDatabasePolyfill(name);
                this._databases.set(name, db);
            }

            if (isNew && request.onupgradeneeded) {
                request.onupgradeneeded({ target: { result: db } });
            }

            request._succeed(db);
        }, 0);

        return request;
    },

    deleteDatabase(name) {
        const request = new IDBRequestPolyfill();
        this._databases.delete(name);
        request._succeed(undefined);
        return request;
    }
};

/**
 * Install polyfills globally (optional - for maximum compatibility)
 */
export function installGlobalPolyfills() {
    if (typeof globalThis.window === 'undefined') {
        globalThis.window = windowPolyfill;
    }
    if (typeof globalThis.CustomEvent === 'undefined') {
        globalThis.CustomEvent = CustomEvent;
    }
    if (typeof globalThis.sessionStorage === 'undefined') {
        globalThis.sessionStorage = sessionStoragePolyfill;
    }
    if (typeof globalThis.localStorage === 'undefined') {
        globalThis.localStorage = localStoragePolyfill;
    }
    if (typeof globalThis.document === 'undefined') {
        globalThis.document = documentPolyfill;
    }
    if (typeof globalThis.indexedDB === 'undefined') {
        globalThis.indexedDB = indexedDBPolyfill;
    }

    console.log('✅ Browser polyfills installed (including indexedDB)');
}

/**
 * Enhanced EventEmitter mixin for simulation classes
 * Can be used to add emit() method to classes that previously used window.dispatchEvent
 */
export class SimulationEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50);
    }
    
    // Compatibility method matching the pattern used in GameClock
    dispatchEvent(event) {
        this.emit(event.type, event);
        globalEvents.emit(event.type, event);
    }
}

/**
 * Get the global event bus (for use by EngineAdapter)
 */
export function getEventBus() {
    return globalEvents;
}

export default {
    globalEvents,
    getEventBus,
    CustomEvent,
    windowPolyfill,
    sessionStoragePolyfill,
    localStoragePolyfill,
    documentPolyfill,
    indexedDBPolyfill,
    installGlobalPolyfills,
    SimulationEventEmitter
};
