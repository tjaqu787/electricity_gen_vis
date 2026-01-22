# Global Electricity Data Visualization

Interactive 3D globe visualization of global electricity data from IEA.

## Features

- **3D Interactive Globe** with country heatmap
- **Indicator Selection**: Toggle between Generation, Consumption, and Net Imports
- **Time Series**: View data from 2000-2024
- **Source Filtering**: Filter generation data by energy source (Coal, Oil, Gas, Nuclear, Renewables, etc.)
- **Country Details**: Click countries to view detailed charts
  - Generation by source (stacked bar chart)
  - Imports vs Exports (line chart)
  - Final consumption by sector (stacked bar chart)

## Running the Visualization

### Option 1: Simple HTTP Server (Python)

```bash
cd visualization
python3 -m http.server 8000
```

Then open: http://localhost:8000

### Option 2: Node.js HTTP Server

```bash
cd visualization
npx http-server -p 8000
```

### Option 3: VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Data

Data is loaded from JSON files in the `data/` directory:
- `countries.json` - Country names
- `generation.json` - Electricity generation by source
- `trade.json` - Imports and exports
- `consumption.json` - Final consumption by sector
- `summary.json` - Years and metadata

## Controls

- **Mouse Drag**: Rotate globe
- **Mouse Wheel**: Zoom in/out
- **Double Click**: Show random country details (for demo)
- **Dropdowns**: Change indicator, year, and energy source
- **X Button**: Close country detail panel

## Technology Stack

- **Three.js** - 3D graphics
- **three-globe** - Globe visualization
- **Chart.js** - Charts and graphs
- **Vanilla JavaScript** - No framework dependencies

## Browser Compatibility

Works in all modern browsers (Chrome, Firefox, Safari, Edge).
Requires JavaScript enabled.
