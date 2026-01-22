// Charts Manager using Chart.js
export class ChartsManager {
    constructor() {
        this.generationChart = null;
        this.tradeChart = null;
        this.consumptionChart = null;
    }

    updateGenerationChart(data) {
        const canvas = document.getElementById('generation-chart');
        const ctx = canvas.getContext('2d');

        if (this.generationChart) {
            this.generationChart.destroy();
        }

        if (!data) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#888';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No generation data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        this.generationChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#e0e0e0' }
                    },
                    y: {
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#e0e0e0' },
                        title: {
                            display: true,
                            text: 'GWh',
                            color: '#e0e0e0'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: '#e0e0e0', boxWidth: 15, font: { size: 11 } }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#4fc3f7',
                        bodyColor: '#e0e0e0',
                        borderColor: '#4fc3f7',
                        borderWidth: 1
                    }
                }
            }
        });
    }

    updateTradeChart(data) {
        const canvas = document.getElementById('trade-chart');
        const ctx = canvas.getContext('2d');

        if (this.tradeChart) {
            this.tradeChart.destroy();
        }

        if (!data) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#888';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No trade data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        this.tradeChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#e0e0e0' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#e0e0e0' },
                        title: {
                            display: true,
                            text: 'GWh',
                            color: '#e0e0e0'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { color: '#e0e0e0', boxWidth: 15 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#4fc3f7',
                        bodyColor: '#e0e0e0',
                        borderColor: '#4fc3f7',
                        borderWidth: 1
                    }
                },
                elements: {
                    line: { tension: 0.4, borderWidth: 2 },
                    point: { radius: 3 }
                }
            }
        });
    }

    updateConsumptionChart(data) {
        const canvas = document.getElementById('consumption-chart');
        const ctx = canvas.getContext('2d');

        if (this.consumptionChart) {
            this.consumptionChart.destroy();
        }

        if (!data) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#888';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No consumption data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        this.consumptionChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#e0e0e0' }
                    },
                    y: {
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#e0e0e0' },
                        title: {
                            display: true,
                            text: 'TJ',
                            color: '#e0e0e0'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: '#e0e0e0', boxWidth: 15, font: { size: 11 } }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#4fc3f7',
                        bodyColor: '#e0e0e0',
                        borderColor: '#4fc3f7',
                        borderWidth: 1
                    }
                }
            }
        });
    }
}
