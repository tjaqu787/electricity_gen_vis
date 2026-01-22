#!/usr/bin/env python3
"""
Update database with final consumption data.
"""

import sqlite3
import csv
from pathlib import Path
from datetime import datetime


def parse_csv_file(filepath):
    """Parse CSV and extract data."""
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)

        if len(rows) < 2:
            return data

        for row in rows[1:]:
            if len(row) < 4:
                continue

            sector = row[0].strip(' "')
            try:
                value = float(row[1]) if row[1].strip() else None
            except (ValueError, IndexError):
                value = None

            try:
                year = int(row[2]) if row[2].strip() else None
            except (ValueError, IndexError):
                year = None

            units = row[3].strip() if len(row) > 3 else ''

            if not sector or year is None:
                continue

            data.append({
                'sector': sector,
                'year': year,
                'value': value,
                'units': units
            })

    return data


def main():
    db_path = Path('data/iea_electricity.db')
    data_dir = Path('data/final_consumption_scraped')

    print("Updating database with final consumption data...")
    print("="*70)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get all consumption files
    csv_files = sorted(data_dir.glob('*_final_consumption.csv'))
    print(f"Found {len(csv_files)} consumption files\n")

    stats = {
        'total_files': 0,
        'successful': 0,
        'total_records': 0
    }

    for i, filepath in enumerate(csv_files, 1):
        # Extract country code from filename
        country_code = filepath.stem.replace('_final_consumption', '')
        stats['total_files'] += 1

        print(f"[{i}/{len(csv_files)}] {country_code}")

        # Parse CSV
        data = parse_csv_file(filepath)

        if not data:
            print(f"    ✗ No data")
            continue

        # Insert data
        count = 0
        for row in data:
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO final_consumption_data (country_code, sector, year, value, units)
                    VALUES (?, ?, ?, ?, ?)
                """, (country_code, row['sector'], row['year'], row['value'], row['units']))
                count += 1
            except sqlite3.Error as e:
                print(f"    Error: {e}")

        # Update country flag
        cursor.execute("""
            UPDATE countries
            SET has_final_consumption_data = 1, last_updated = ?
            WHERE country_code = ?
        """, (datetime.now(), country_code))

        conn.commit()

        print(f"    ✓ Loaded {count} records")
        stats['successful'] += 1
        stats['total_records'] += count

    # Get overall statistics
    cursor.execute("SELECT COUNT(*) FROM final_consumption_data")
    total_fc = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM generation_data")
    total_gen = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM imports_exports_data")
    total_ie = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM countries WHERE has_final_consumption_data = 1")
    countries_with_fc = cursor.fetchone()[0]

    conn.close()

    print(f"\n{'='*70}")
    print("Database update completed!")
    print(f"{'='*70}")
    print(f"Files processed: {stats['total_files']}")
    print(f"Successful: {stats['successful']}")
    print(f"Final consumption records added: {stats['total_records']:,}")
    print(f"\nDatabase totals:")
    print(f"  Generation records: {total_gen:,}")
    print(f"  Imports/exports records: {total_ie:,}")
    print(f"  Final consumption records: {total_fc:,}")
    print(f"  Grand total: {total_gen + total_ie + total_fc:,}")
    print(f"\nCountries with final consumption data: {countries_with_fc}")
    print(f"{'='*70}")

    # Show database size
    db_size = db_path.stat().st_size / (1024 * 1024)
    print(f"\nDatabase size: {db_size:.2f} MB")


if __name__ == '__main__':
    main()
