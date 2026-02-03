// js/ui/MapRenderer.js
export class MapRenderer {
    constructor(simulation) {
        this.simulation = simulation;
        this.container = document.getElementById('world-map');
        this.selectedCities = [];
        this.showRoutes = false;

        // DOM node cache for efficient updates
        this.cityElements = new Map(); // city.id -> { dot, label }
        this.routeElements = null; // { line, label }
        this.initialized = false;

        // Throttle resize
        this.resizeTimeout = null;
        this.lastWidth = 0;
        this.lastHeight = 0;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Map doesn't need to re-render on every simulation tick
        // City positions don't change during simulation
        // Only selection state changes trigger re-render (handled in handleCityClick)

        // Throttled resize handler
        window.addEventListener('resize', () => {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            this.resizeTimeout = setTimeout(() => {
                this.updatePositions();
            }, 100);
        });
    }

    render() {
        if (!this.container || !this.simulation.cities) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (!this.initialized) {
            // First render - create all elements
            this.initializeElements(width, height);
            this.initialized = true;
        } else {
            // Subsequent renders - just update what changed
            this.updateSelectionState();
            this.updateRoute(width, height);
        }

        this.lastWidth = width;
        this.lastHeight = height;
    }

    initializeElements(width, height) {
        // Clear any existing content
        this.container.innerHTML = '';
        this.cityElements.clear();
        this.routeElements = null;

        // Create route elements (hidden initially)
        this.createRouteElements();

        // Create city elements
        this.simulation.cities.forEach(city => {
            this.createCityElements(city, width, height);
        });
    }

    createCityElements(city, width, height) {
        const x = (city.coordinates.x / 1000) * width;
        const y = (city.coordinates.y / 1000) * height;

        // Determine city dot size class
        let sizeClass = city.population > 2000000 ? 'large' : '';
        const coastalClass = city.isCoastal ? 'coastal' : '';

        // Create city dot
        const dot = document.createElement('div');
        dot.className = `city-dot ${sizeClass} ${coastalClass}`;
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
        dot.title = this.getCityTooltip(city);
        dot.dataset.cityId = city.id;

        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleCityClick(city);
        });

        // Create city label
        const label = document.createElement('div');
        label.className = 'city-label';
        label.style.left = `${x + 10}px`;
        label.style.top = `${y - 5}px`;
        label.textContent = city.name;

        this.container.appendChild(dot);
        this.container.appendChild(label);

        // Cache references
        this.cityElements.set(city.id, { dot, label, city });
    }

    createRouteElements() {
        // Create route line (hidden initially)
        const line = document.createElement('div');
        line.className = 'route-line';
        line.style.display = 'none';

        // Create distance label (hidden initially)
        const label = document.createElement('div');
        label.className = 'city-label';
        label.style.display = 'none';
        label.style.background = 'rgba(100, 181, 246, 0.9)';

        this.container.appendChild(line);
        this.container.appendChild(label);

        this.routeElements = { line, label };
    }

    updatePositions() {
        if (!this.container || !this.initialized) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Skip if size hasn't changed
        if (width === this.lastWidth && height === this.lastHeight) return;

        // Update city positions
        this.cityElements.forEach(({ dot, label, city }) => {
            const x = (city.coordinates.x / 1000) * width;
            const y = (city.coordinates.y / 1000) * height;

            dot.style.left = `${x}px`;
            dot.style.top = `${y}px`;
            label.style.left = `${x + 10}px`;
            label.style.top = `${y - 5}px`;
        });

        // Update route if visible
        this.updateRoute(width, height);

        this.lastWidth = width;
        this.lastHeight = height;
    }

    updateSelectionState() {
        // Update selected class on all city dots
        this.cityElements.forEach(({ dot, city }) => {
            const isSelected = this.selectedCities.some(c => c.id === city.id);
            dot.classList.toggle('selected', isSelected);
        });
    }

    updateRoute(width, height) {
        if (!this.routeElements) return;

        const { line, label } = this.routeElements;

        if (!this.showRoutes || this.selectedCities.length !== 2) {
            // Hide route
            line.style.display = 'none';
            label.style.display = 'none';
            return;
        }

        const city1 = this.selectedCities[0];
        const city2 = this.selectedCities[1];

        const x1 = (city1.coordinates.x / 1000) * width;
        const y1 = (city1.coordinates.y / 1000) * height;
        const x2 = (city2.coordinates.x / 1000) * width;
        const y2 = (city2.coordinates.y / 1000) * height;

        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

        // Update line
        line.style.left = `${x1}px`;
        line.style.top = `${y1}px`;
        line.style.width = `${length}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.display = 'block';

        // Update distance label
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const distance = this.simulation.cityManager.transportation.calculateDistance(city1, city2);

        label.style.left = `${midX}px`;
        label.style.top = `${midY - 15}px`;
        label.textContent = `${distance.toFixed(0)} km`;
        label.style.display = 'block';
    }

    handleCityClick(city) {
        const index = this.selectedCities.findIndex(c => c.id === city.id);

        if (index > -1) {
            // Deselect city
            this.selectedCities.splice(index, 1);
        } else {
            // Select city
            this.selectedCities.push(city);
            if (this.selectedCities.length > 2) {
                this.selectedCities.shift(); // Keep only 2 cities
            }
        }

        this.showRoutes = this.selectedCities.length === 2;

        // Update transport calculator if 2 cities selected
        if (this.showRoutes) {
            this.updateTransportCalculator();
        }

        // Lightweight update - just selection state and route, no DOM rebuild
        this.updateSelectionState();
        this.updateRoute(this.lastWidth, this.lastHeight);
    }

    updateTransportCalculator() {
        if (this.selectedCities.length !== 2) return;

        const originSelect = document.getElementById('origin-city');
        const destSelect = document.getElementById('destination-city');
        const calcButton = document.getElementById('calculate-route');

        // Elements may not exist on all pages
        if (!originSelect || !destSelect) return;

        // Find and select cities in dropdowns
        Array.from(originSelect.options).forEach((option, index) => {
            if (option.value === this.selectedCities[0].id) {
                originSelect.selectedIndex = index;
            }
        });

        Array.from(destSelect.options).forEach((option, index) => {
            if (option.value === this.selectedCities[1].id) {
                destSelect.selectedIndex = index;
            }
        });

        // Trigger calculation
        calcButton?.click();
    }

    getCityTooltip(city) {
        return `${city.name}
Population: ${(city.population / 1000000).toFixed(2)}M
GDP: ${city.formatCurrency(city.totalPurchasingPower)}
Salary Level: ${(city.salaryLevel * 100).toFixed(0)}%
Infrastructure: ${this.getInfrastructureList(city)}`;
    }

    getInfrastructureList(city) {
        const infra = [];
        if (city.hasAirport) infra.push('Airport');
        if (city.hasSeaport) infra.push('Seaport');
        if (city.hasRailway) infra.push('Railway');
        if (city.isCoastal) infra.push('Coastal');
        return infra.join(', ') || 'None';
    }

    clearSelection() {
        this.selectedCities = [];
        this.showRoutes = false;
        // Lightweight update - just clear selection state and hide route
        this.updateSelectionState();
        this.updateRoute(this.lastWidth, this.lastHeight);
    }
}
