// js/main.js
import { SimulationEngine } from './core/SimulationEngine.js';
import { Dashboard } from './core/Dashboard.js';
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
            await this.simulation.initialize();

            // Initialize UI components
            this.dashboard = new Dashboard(this.simulation);
            this.mapRenderer = new MapRenderer(this.simulation);

            // Populate initial data
            this.dashboard.populateTransportSelectors();
            this.dashboard.update(); // Initial update to show data immediately
            this.mapRenderer.render();

            console.log('✅ Application initialized successfully');

            // Show welcome message
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showErrorMessage(error);
        } finally {
            // Always restore UI even if initialization failed
            this.hideLoadingScreen();
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
║     • ${this.simulation.productRegistry.getAllProducts().length} products                              ║
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
    getFirms: () => Array.from(window.app?.simulation?.firms?.values() || []),
    pause: () => window.app?.simulation?.pause(),
    resume: () => window.app?.simulation?.resume(),
    setSpeed: (speed) => window.app?.simulation?.setSpeed(speed),
    addEvent: (type, title, msg) => window.app?.simulation?.addEvent(type, title, msg),

    // Global Market helpers
    globalMarket: {
        getStats: () => window.app?.simulation?.getGlobalMarketStats(),
        getPrices: () => window.app?.simulation?.getGlobalMarketPrices(),
        setMultiplier: (mult) => window.app?.simulation?.setGlobalMarketMultiplier(mult),
        getMultiplier: () => window.app?.simulation?.getGlobalMarketMultiplier(),
        enable: () => window.app?.simulation?.enableGlobalMarket(true),
        disable: () => window.app?.simulation?.enableGlobalMarket(false)
    },

    // Config helpers
    getConfig: () => window.app?.simulation?.getConfig(),
    setInventoryConfig: (cfg) => window.app?.simulation?.setInventoryConfig(cfg),

    // Inventory inspection
    getInventoryReport: () => {
        const firms = Array.from(window.app?.simulation?.firms?.values() || []);
        return firms
            .filter(f => f.type === 'MANUFACTURING')
            .map(f => ({
                id: f.id,
                product: f.product?.name,
                isSemiRaw: f.isSemiRawProducer,
                finishedGoods: f.finishedGoodsInventory?.quantity?.toFixed(0),
                rawMaterials: Array.from(f.rawMaterialInventory?.entries() || []).map(([name, inv]) => ({
                    material: name,
                    quantity: inv.quantity?.toFixed(0),
                    minRequired: inv.minRequired?.toFixed(0)
                }))
            }));
    }
};

console.log('💡 Debug helpers available: window.debug');
console.log('   - debug.globalMarket.setMultiplier(1.5) - Set global market price multiplier');
console.log('   - debug.globalMarket.getStats() - View global market statistics');
console.log('   - debug.getInventoryReport() - View all manufacturing inventory');
