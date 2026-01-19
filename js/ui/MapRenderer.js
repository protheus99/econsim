// js/ui/MapRenderer.js
export class MapRenderer {
    constructor(simulation) {
        this.simulation = simulation;
        this.container = document.getElementById('world-map');
        this.selectedCities = [];
        this.showRoutes = false;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('simulation-update', () => {
            this.render();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.render();
        });
    }

    render() {
        if (!this.container || !this.simulation.cities) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Clear existing content
        this.container.innerHTML = '';

        // Draw routes first (so they appear behind cities)
        if (this.showRoutes && this.selectedCities.length === 2) {
            this.drawRoute(this.selectedCities[0], this.selectedCities[1], width, height);
        }

        // Draw cities
        this.simulation.cities.forEach(city => {
            this.drawCity(city, width, height);
        });
    }

    drawCity(city, width, height) {
        const x = (city.coordinates.x / 1000) * width;
        const y = (city.coordinates.y / 1000) * height;

        // Determine city dot size and class
        let sizeClass = '';
        if (city.population > 2000000) {
            sizeClass = 'large';
        }

        const coastalClass = city.isCoastal ? 'coastal' : '';
        const selected = this.selectedCities.includes(city) ? 'selected' : '';

        // Create city dot
        const dot = document.createElement('div');
        dot.className = `city-dot ${sizeClass} ${coastalClass} ${selected}`;
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
        dot.title = this.getCityTooltip(city);

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
    }

    drawRoute(city1, city2, width, height) {
        const x1 = (city1.coordinates.x / 1000) * width;
        const y1 = (city1.coordinates.y / 1000) * height;
        const x2 = (city2.coordinates.x / 1000) * width;
        const y2 = (city2.coordinates.y / 1000) * height;

        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

        const line = document.createElement('div');
        line.className = 'route-line';
        line.style.left = `${x1}px`;
        line.style.top = `${y1}px`;
        line.style.width = `${length}px`;
        line.style.transform = `rotate(${angle}deg)`;

        this.container.appendChild(line);

        // Add distance label
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        const distance = this.simulation.cityManager.transportation.calculateDistance(city1, city2);
        
        const distLabel = document.createElement('div');
        distLabel.className = 'city-label';
        distLabel.style.left = `${midX}px`;
        distLabel.style.top = `${midY - 15}px`;
        distLabel.style.background = 'rgba(100, 181, 246, 0.9)';
        distLabel.textContent = `${distance.toFixed(0)} km`;

        this.container.appendChild(distLabel);
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

        this.render();
    }

    updateTransportCalculator() {
        if (this.selectedCities.length !== 2) return;

        const originSelect = document.getElementById('origin-city');
        const destSelect = document.getElementById('destination-city');

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
        document.getElementById('calculate-route').click();
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
        this.render();
    }
}
