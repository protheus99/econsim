/**
 * Browser API Polyfills for Node.js
 * Allows SimulationEngine and related classes to run server-side
 */

import { EventEmitter } from 'events';

// Global event bus to replace window.dispatchEvent
const eventBus = new EventEmitter();
eventBus.setMaxListeners(100); // Prevent warnings for many listeners

// CustomEvent polyfill
class CustomEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail || null;
        this.bubbles = options.bubbles || false;
        this.cancelable = options.cancelable || false;
    }
}

// In-memory storage to replace sessionStorage
class MemoryStorage {
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

    get length() {
        return this._data.size;
    }

    key(index) {
        return Array.from(this._data.keys())[index] ?? null;
    }
}

// Window polyfill
const windowPolyfill = {
    dispatchEvent(event) {
        eventBus.emit(event.type, event);
        return true;
    },

    addEventListener(type, listener) {
        eventBus.on(type, listener);
    },

    removeEventListener(type, listener) {
        eventBus.off(type, listener);
    }
};

// Document polyfill
const documentPolyfill = {
    visibilityState: 'visible',

    addEventListener(type, listener) {
        // No-op in Node.js - we don't have visibility changes
    },

    removeEventListener(type, listener) {
        // No-op
    }
};

// Storage instances
const sessionStoragePolyfill = new MemoryStorage();
const localStoragePolyfill = new MemoryStorage();

/**
 * Install polyfills into global scope
 * Call this before importing any simulation modules
 */
export function installPolyfills() {
    if (typeof globalThis.window === 'undefined') {
        globalThis.window = windowPolyfill;
    }
    if (typeof globalThis.document === 'undefined') {
        globalThis.document = documentPolyfill;
    }
    if (typeof globalThis.sessionStorage === 'undefined') {
        globalThis.sessionStorage = sessionStoragePolyfill;
    }
    if (typeof globalThis.localStorage === 'undefined') {
        globalThis.localStorage = localStoragePolyfill;
    }
    if (typeof globalThis.CustomEvent === 'undefined') {
        globalThis.CustomEvent = CustomEvent;
    }
}

/**
 * Get the internal event bus for server-side event handling
 * Use this to subscribe to simulation events
 */
export function getEventBus() {
    return eventBus;
}

/**
 * Clear all polyfill state (useful for testing)
 */
export function resetPolyfills() {
    sessionStoragePolyfill.clear();
    localStoragePolyfill.clear();
    eventBus.removeAllListeners();
}

export {
    CustomEvent,
    MemoryStorage,
    windowPolyfill,
    documentPolyfill,
    sessionStoragePolyfill,
    localStoragePolyfill
};
