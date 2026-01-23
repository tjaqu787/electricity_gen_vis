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
        this.valueType = 'absolute';
        this.baseYear = 2000;
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
        // Setup year slider
        const yearSlider = document.getElementById('year-slider');
        const yearValue = document.getElementById('year-value');
        const years = this.dataManager.getYears();

        // Set slider range
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        yearSlider.min = minYear;
        yearSlider.max = maxYear;
        yearSlider.value = this.currentYear;
        yearValue.textContent = this.currentYear;

        // Setup base year slider
        const baseYearSlider = document.getElementById('base-year-slider');
        const baseYearValue = document.getElementById('base-year-value');
        baseYearSlider.min = minYear;
        baseYearSlider.max = maxYear;
        baseYearSlider.value = this.baseYear;
        baseYearValue.textContent = this.baseYear;

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

        // Value type change
        document.getElementById('value-type-select').addEventListener('change', (e) => {
            this.valueType = e.target.value;

            // Show/hide base year selector based on value type
            const baseYearControl = document.getElementById('base-year-control');
            const sourceControl = document.getElementById('source-control');

            if (this.valueType === 'indexed') {
                baseYearControl.style.display = 'block';
            } else {
                baseYearControl.style.display = 'none';
            }

            // Show/hide source selector based on value type and indicator
            if (this.valueType === 'share' && this.currentIndicator === 'generation') {
                sourceControl.style.display = 'block';
                // If 'total' is selected, switch to a specific source
                if (this.currentSource === 'total') {
                    this.currentSource = 'Coal';
                    document.getElementById('source-select').value = 'Coal';
                }
            } else if (this.currentIndicator === 'generation') {
                sourceControl.style.display = 'block';
            }

            this.updateVisualization();
        });

        // Base year slider change
        baseYearSlider.addEventListener('input', (e) => {
            this.baseYear = parseInt(e.target.value);
            baseYearValue.textContent = this.baseYear;
            this.updateVisualization();
        });

        // Year slider change
        yearSlider.addEventListener('input', (e) => {
            this.currentYear = parseInt(e.target.value);
            yearValue.textContent = this.currentYear;
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
            this.currentSource,
            this.valueType,
            this.valueType === 'indexed' ? this.baseYear : null
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
