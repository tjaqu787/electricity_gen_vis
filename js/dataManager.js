// Data Manager - handles loading and querying data
export class DataManager {
    constructor() {
        this.countries = {};
        this.generation = {};
        this.trade = {};
        this.consumption = {};
        this.summary = {};
    }

    async loadAll() {
        const [countries, generation, trade, consumption, summary] = await Promise.all([
            fetch('data/countries.json').then(r => r.json()),
            fetch('data/generation.json').then(r => r.json()),
            fetch('data/trade.json').then(r => r.json()),
            fetch('data/consumption.json').then(r => r.json()),
            fetch('data/summary.json').then(r => r.json())
        ]);

        this.countries = countries;
        this.generation = generation;
        this.trade = trade;
        this.consumption = consumption;
        this.summary = summary;
    }

    getYears() {
        return this.summary.years || [];
    }

    getCountryName(countryCode) {
        return this.countries[countryCode] || countryCode.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getHeatmapData(indicator, year, source = 'total', valueType = 'absolute', baseYear = null) {
        const data = [];

        for (const countryCode in this.countries) {
            let value = null;
            let baseValue = null;

            if (indicator === 'generation') {
                const countryData = this.generation[countryCode];
                if (countryData && countryData[year]) {
                    if (valueType === 'share' && source !== 'total') {
                        // Calculate share: (source / total) * 100
                        const sourceValue = countryData[year][source] || 0;
                        const totalValue = Object.values(countryData[year]).reduce((sum, val) => sum + (val || 0), 0);
                        value = totalValue > 0 ? (sourceValue / totalValue) * 100 : null;
                    } else if (source === 'total') {
                        // Sum all sources
                        value = Object.values(countryData[year]).reduce((sum, val) => sum + (val || 0), 0);
                        if (valueType === 'indexed' && baseYear && countryData[baseYear]) {
                            baseValue = Object.values(countryData[baseYear]).reduce((sum, val) => sum + (val || 0), 0);
                        }
                    } else {
                        // Specific source
                        value = countryData[year][source] || null;
                        if (valueType === 'indexed' && baseYear && countryData[baseYear]) {
                            baseValue = countryData[baseYear][source] || null;
                        }
                    }
                }
            } else if (indicator === 'consumption') {
                const countryData = this.consumption[countryCode];
                if (countryData && countryData[year]) {
                    // Sum all sectors
                    value = Object.values(countryData[year]).reduce((sum, val) => sum + (val || 0), 0);
                    if (valueType === 'indexed' && baseYear && countryData[baseYear]) {
                        baseValue = Object.values(countryData[baseYear]).reduce((sum, val) => sum + (val || 0), 0);
                    }
                }
            } else if (indicator === 'imports') {
                const countryData = this.trade[countryCode];
                if (countryData && countryData[year]) {
                    const imports = countryData[year]['Imports'] || 0;
                    const exports = Math.abs(countryData[year]['Exports'] || 0);
                    value = imports - exports; // Net imports

                    if (valueType === 'indexed' && baseYear && countryData[baseYear]) {
                        const baseImports = countryData[baseYear]['Imports'] || 0;
                        const baseExports = Math.abs(countryData[baseYear]['Exports'] || 0);
                        baseValue = baseImports - baseExports;
                    }
                }
            }

            // Calculate indexed value if requested
            if (valueType === 'indexed' && baseValue !== null && baseValue !== 0) {
                value = (value / baseValue) * 100;
            }

            if (value !== null && value !== 0) {
                data.push({ country: countryCode, value });
            }
        }

        return data;
    }

    getGenerationTimeSeries(countryCode) {
        const countryData = this.generation[countryCode];
        if (!countryData) return null;

        // Get all years and sources
        const years = Object.keys(countryData).map(Number).sort((a, b) => a - b);
        const sources = new Set();

        years.forEach(year => {
            Object.keys(countryData[year]).forEach(source => sources.add(source));
        });

        const datasets = [];
        const sourceColors = {
            'Coal': '#1f1f1f',
            'Oil': '#8B4513',
            'Natural gas': '#4169E1',
            'Nuclear': '#FF6B6B',
            'Hydropower': '#4FC3F7',
            'Wind': '#81C784',
            'Solar PV': '#FFD54F',
            'Biofuels': '#9CCC65',
            'Geothermal': '#FF8A65',
            'Waste': '#A1887F',
            'Other sources': '#BDBDBD'
        };

        Array.from(sources).forEach(source => {
            const data = years.map(year => countryData[year][source] || 0);
            datasets.push({
                label: source,
                data: data,
                backgroundColor: sourceColors[source] || '#888',
                borderWidth: 0
            });
        });

        return { labels: years, datasets };
    }

    getTradeTimeSeries(countryCode) {
        const countryData = this.trade[countryCode];
        if (!countryData) return null;

        const years = Object.keys(countryData).map(Number).sort((a, b) => a - b);

        const imports = years.map(year => countryData[year]['Imports'] || 0);
        const exports = years.map(year => Math.abs(countryData[year]['Exports'] || 0));

        return {
            labels: years,
            datasets: [
                {
                    label: 'Imports',
                    data: imports,
                    backgroundColor: '#4FC3F7',
                    borderWidth: 0
                },
                {
                    label: 'Exports',
                    data: exports,
                    backgroundColor: '#FF6B6B',
                    borderWidth: 0
                }
            ]
        };
    }

    getConsumptionTimeSeries(countryCode) {
        const countryData = this.consumption[countryCode];
        if (!countryData) return null;

        const years = Object.keys(countryData).map(Number).sort((a, b) => a - b);
        const sectors = new Set();

        years.forEach(year => {
            Object.keys(countryData[year]).forEach(sector => sectors.add(sector));
        });

        const sectorColors = {
            'Industry': '#1976D2',
            'Transport': '#388E3C',
            'Residential': '#FFA726',
            'Commercial and public services': '#AB47BC',
            'Agriculture and forestry': '#8D6E63'
        };

        const datasets = [];
        Array.from(sectors).forEach(sector => {
            const data = years.map(year => countryData[year][sector] || 0);
            datasets.push({
                label: sector,
                data: data,
                backgroundColor: sectorColors[sector] || '#888',
                borderWidth: 0
            });
        });

        return { labels: years, datasets };
    }
}
