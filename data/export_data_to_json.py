#!/usr/bin/env python3
"""
Export SQLite data to JSON for the web visualization.
"""

import sqlite3
import json
from pathlib import Path


def export_to_json():
    """Export database to JSON files."""
    db_path = Path('data/iea_electricity.db')
    output_dir = Path('visualization/data')
    output_dir.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Exporting data to JSON...")
    print("="*70)

    # Export countries
    print("\n1. Exporting countries...")
    cursor.execute("SELECT country_code, country_name FROM countries ORDER BY country_code")
    countries = {row[0]: row[1] for row in cursor.fetchall()}

    with open(output_dir / 'countries.json', 'w') as f:
        json.dump(countries, f)
    print(f"   ✓ {len(countries)} countries")

    # Export generation data by country and year
    print("\n2. Exporting generation data...")
    cursor.execute("""
        SELECT country_code, source, year, value
        FROM generation_data
        ORDER BY country_code, year, source
    """)

    generation_data = {}
    for country_code, source, year, value in cursor.fetchall():
        if country_code not in generation_data:
            generation_data[country_code] = {}
        if year not in generation_data[country_code]:
            generation_data[country_code][year] = {}
        generation_data[country_code][year][source] = value

    with open(output_dir / 'generation.json', 'w') as f:
        json.dump(generation_data, f)
    print(f"   ✓ {len(generation_data)} countries with generation data")

    # Export imports/exports
    print("\n3. Exporting imports/exports...")
    cursor.execute("""
        SELECT country_code, flow_type, year, value
        FROM imports_exports_data
        ORDER BY country_code, year, flow_type
    """)

    trade_data = {}
    for country_code, flow_type, year, value in cursor.fetchall():
        if country_code not in trade_data:
            trade_data[country_code] = {}
        if year not in trade_data[country_code]:
            trade_data[country_code][year] = {}
        trade_data[country_code][year][flow_type] = value

    with open(output_dir / 'trade.json', 'w') as f:
        json.dump(trade_data, f)
    print(f"   ✓ {len(trade_data)} countries with trade data")

    # Export final consumption
    print("\n4. Exporting final consumption...")
    cursor.execute("""
        SELECT country_code, sector, year, value
        FROM final_consumption_data
        ORDER BY country_code, year, sector
    """)

    consumption_data = {}
    for country_code, sector, year, value in cursor.fetchall():
        if country_code not in consumption_data:
            consumption_data[country_code] = {}
        if year not in consumption_data[country_code]:
            consumption_data[country_code][year] = {}
        consumption_data[country_code][year][sector] = value

    with open(output_dir / 'consumption.json', 'w') as f:
        json.dump(consumption_data, f)
    print(f"   ✓ {len(consumption_data)} countries with consumption data")

    # Create aggregated data for the globe heatmap
    print("\n5. Creating aggregated data for visualization...")

    # Get latest year's total generation by country
    cursor.execute("""
        SELECT country_code, year, SUM(value) as total
        FROM generation_data
        WHERE value IS NOT NULL
        GROUP BY country_code, year
    """)

    latest_generation = {}
    for country_code, year, total in cursor.fetchall():
        if country_code not in latest_generation or year > latest_generation[country_code]['year']:
            latest_generation[country_code] = {'year': year, 'total': total}

    # Get all available years
    cursor.execute("SELECT DISTINCT year FROM generation_data ORDER BY year")
    years = [row[0] for row in cursor.fetchall()]

    summary = {
        'years': years,
        'latest_generation': latest_generation
    }

    with open(output_dir / 'summary.json', 'w') as f:
        json.dump(summary, f)
    print(f"   ✓ Years: {min(years)} - {max(years)}")

    conn.close()

    # Calculate sizes
    total_size = sum(f.stat().st_size for f in output_dir.glob('*.json'))

    print(f"\n{'='*70}")
    print("Export completed!")
    print(f"{'='*70}")
    print(f"Output directory: {output_dir}")
    print(f"Total size: {total_size / 1024 / 1024:.2f} MB")
    print(f"{'='*70}")


if __name__ == '__main__':
    export_to_json()
