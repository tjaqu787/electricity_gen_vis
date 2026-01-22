// Main application
import { DataManager } from './dataManager.js';
import { GlobeViz } from './globe.js';
import { ChartsManager } from './charts.js';

class App {
    constructor() {
        this.dataManager = new DataManager();
        this.globeViz = null;
        this.chartsManager = new ChartsManager();

        this.currentIndicator = 'generation';
        this.currentYear = 2023;
        this.currentSource = 'total';
        this.selectedCountry = null;

        this.init();
    }

    async init() {
        try {
            // Show loading
            document.getElementById('loading').classList.remove('hidden');

            console.log('Loading data...');
            // Load data
            await this.dataManager.loadAll();
            console.log('Data loaded successfully');

            console.log('Initializing globe...');
            // Initialize globe
            this.globeViz = new GlobeViz('globe-container');
            console.log('Globe initialized');

            // Setup controls
            this.setupControls();

            // Initial render
            this.updateVisualization();

            // Hide loading
            document.getElementById('loading').classList.add('hidden');

            console.log('App initialized successfully');

        } catch (error) {
            console.error('Failed to initialize app:', error);
            console.error('Error details:', error.message, error.stack);
            document.getElementById('loading').innerHTML = `
                <div class="spinner"></div>
                <p style="color: #ff6b6b;">Error: ${error.message}</p>
                <p style="font-size: 12px; color: #888;">Check console for details</p>
            `;
        }
    }

    setupControls() {
        // Populate year dropdown
        const yearSelect = document.getElementById('year-select');
        const years = this.dataManager.getYears();
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === this.currentYear) option.selected = true;
            yearSelect.appendChild(option);
        });

        // Indicator change
        document.getElementById('indicator-select').addEventListener('change', (e) => {
            this.currentIndicator = e.target.value;

            // Show/hide source selector based on indicator
            const sourceControl = document.getElementById('source-control');
            if (this.currentIndicator === 'generation') {
                sourceControl.style.display = 'block';
            } else {
                sourceControl.style.display = 'none';
            }

            this.updateVisualization();
        });

        // Year change
        yearSelect.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.updateVisualization();
            if (this.selectedCountry) {
                this.showCountryPanel(this.selectedCountry);
            }
        });

        // Source change
        document.getElementById('source-select').addEventListener('change', (e) => {
            this.currentSource = e.target.value;
            this.updateVisualization();
        });

        // Close panel
        document.getElementById('close-panel').addEventListener('click', () => {
            this.closePanel();
        });

        // Globe click handler
        this.globeViz.onCountryClick((country) => {
            this.showCountryPanel(country);
        });
    }

    updateVisualization() {
        const data = this.dataManager.getHeatmapData(
            this.currentIndicator,
            this.currentYear,
            this.currentSource
        );

        this.globeViz.updateHeatmap(data);
    }

    showCountryPanel(countryCode) {
        this.selectedCountry = countryCode;
        const countryName = this.dataManager.getCountryName(countryCode);

        // Update country name
        document.getElementById('country-name').textContent = countryName;

        // Get data for charts
        const generationData = this.dataManager.getGenerationTimeSeries(countryCode);
        const tradeData = this.dataManager.getTradeTimeSeries(countryCode);
        const consumptionData = this.dataManager.getConsumptionTimeSeries(countryCode);

        // Update charts
        this.chartsManager.updateGenerationChart(generationData);
        this.chartsManager.updateTradeChart(tradeData);
        this.chartsManager.updateConsumptionChart(consumptionData);

        // Show panel
        document.getElementById('side-panel').classList.remove('hidden');
        document.getElementById('side-panel').classList.add('visible');
    }

    closePanel() {
        document.getElementById('side-panel').classList.remove('visible');
        document.getElementById('side-panel').classList.add('hidden');
        this.selectedCountry = null;
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}
