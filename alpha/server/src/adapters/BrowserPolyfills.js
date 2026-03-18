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
    
    console.log('✅ Browser polyfills installed');
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
    installGlobalPolyfills,
    SimulationEventEmitter
};
