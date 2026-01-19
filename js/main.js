// js/main.js
import { SimulationEngine } from './simulation/SimulationEngine.js';
import { Dashboard } from './ui/Dashboard.js';
import { MapRenderer } from './ui/MapRenderer.js';

class Application {
    constructor() {
        this.simulation = null;
        this.dashboard = null;
        this.mapRenderer = null;
    }

    async initialize() {
        console.log('🎮 Starting Economic Simulation Application...');

        try {
            // Show loading state
            this.showLoadingScreen();

            // Initialize simulation engine
            this.simulation = new SimulationEngine();
            this.simulation.initialize();

            // Initialize UI components
            this.dashboard = new Dashboard(this.simulation);
            this.mapRenderer = new MapRenderer(this.simulation);

            // Populate initial data
            this.dashboard.populateTransportSelectors();
            this.mapRenderer.render();

            // Hide loading screen
            this.hideLoadingScreen();

            console.log('✅ Application initialized successfully');
            
            // Show welcome message
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showErrorMessage(error);
        }
    }

    showLoadingScreen() {
        document.body.style.opacity = '0.5';
    }

    hideLoadingScreen() {
        document.body.style.opacity = '1';
    }

    showWelcomeMessage() {
        // Could show a modal or notification here
        console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     🌍 ECONOMIC SIMULATION SYSTEM                     ║
║                                                       ║
║     Initialized with:                                 ║
║     • ${this.simulation.cities.length} cities                                        ║
║     • ${this.simulation.corporations.length} corporations                                  ║
║     • ${this.simulation.products.length} product categories                           ║
║                                                       ║
║     Time Scale: 1 second = 1 game hour               ║
║     Status: Running                                   ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
        `);
    }

    showErrorMessage(error) {
        alert(`Failed to initialize simulation: ${error.message}`);
    }

    destroy() {
        if (this.simulation) {
            this.simulation.destroy();
        }
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new Application();
        window.app.initialize();
    });
} else {
    window.app = new Application();
    window.app.initialize();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});

// Expose simulation to console for debugging
window.getSimulation = () => {
    if (window.app && window.app.simulation) {
        return window.app.simulation;
    }
    return null;
};

// Debug helpers
window.debug = {
    getState: () => window.app?.simulation?.getState(),
    getCities: () => window.app?.simulation?.cities,
    getCorporations: () => window.app?.simulation?.corporations,
    getProducts: () => window.app?.simulation?.products,
    pause: () => window.app?.simulation?.pause(),
    resume: () => window.app?.simulation?.resume(),
    setSpeed: (speed) => window.app?.simulation?.setSpeed(speed),
    addEvent: (type, title, msg) => window.app?.simulation?.addEvent(type, title, msg)
};

console.log('💡 Debug helpers available: window.debug');
