#!/usr/bin/env python3
"""
Load IEA scraped data into a SQLite database.

Database schema:
- countries: country metadata
- generation_data: electricity generation by source over time
- imports_exports_data: electricity imports/exports over time
- final_consumption_data: electricity consumption by sector over time
"""

import sqlite3
import csv
from pathlib import Path
from datetime import datetime


def create_database(db_path):
    """Create database and tables."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Countries table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS countries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country_code TEXT UNIQUE NOT NULL,
            country_name TEXT,
            has_generation_data BOOLEAN DEFAULT 0,
            has_imports_exports_data BOOLEAN DEFAULT 0,
            has_final_consumption_data BOOLEAN DEFAULT 0,
            last_updated TIMESTAMP
        )
    """)

    # Generation data table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS generation_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country_code TEXT NOT NULL,
            source TEXT NOT NULL,
            year INTEGER NOT NULL,
            value REAL,
            units TEXT,
            FOREIGN KEY (country_code) REFERENCES countries(country_code),
            UNIQUE(country_code, source, year)
        )
    """)

    # Imports/Exports data table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS imports_exports_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country_code TEXT NOT NULL,
            flow_type TEXT NOT NULL,
            year INTEGER NOT NULL,
            value REAL,
            units TEXT,
            FOREIGN KEY (country_code) REFERENCES countries(country_code),
            UNIQUE(country_code, flow_type, year)
        )
    """)

    # Final consumption data table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS final_consumption_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country_code TEXT NOT NULL,
            sector TEXT NOT NULL,
            year INTEGER NOT NULL,
            value REAL,
            units TEXT,
            FOREIGN KEY (country_code) REFERENCES countries(country_code),
            UNIQUE(country_code, sector, year)
        )
    """)

    # Create indexes for faster queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gen_country_year ON generation_data(country_code, year)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ie_country_year ON imports_exports_data(country_code, year)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_fc_country_year ON final_consumption_data(country_code, year)")

    conn.commit()
    return conn


def parse_csv_file(filepath):
    """
    Parse a CSV file and extract data.
    Returns: list of dicts with keys: source/sector/flow_type, year, value, units
    """
    data = []

    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)

        if len(rows) < 2:
            return data  # Empty or header-only file

        # First row is header
        header = rows[0]

        # Data starts from row 2
        for row in rows[1:]:
            if len(row) < 4:
                continue

            # Parse row: [source/sector/flow_type, value, year, units]
            source_sector = row[0].strip(' "')
            try:
                value = float(row[1]) if row[1].strip() else None
            except (ValueError, IndexError):
                value = None

            try:
                year = int(row[2]) if row[2].strip() else None
            except (ValueError, IndexError):
                year = None

            units = row[3].strip() if len(row) > 3 else ''

            # Skip rows with missing critical data
            if not source_sector or year is None:
                continue

            data.append({
                'source': source_sector,
                'year': year,
                'value': value,
                'units': units
            })

    return data


def insert_country(conn, country_code, country_name=None):
    """Insert or update country record."""
    cursor = conn.cursor()

    cursor.execute("""
        INSERT OR IGNORE INTO countries (country_code, country_name, last_updated)
        VALUES (?, ?, ?)
    """, (country_code, country_name or country_code.replace('-', ' ').title(), datetime.now()))

    conn.commit()


def update_country_flags(conn, country_code, has_gen=False, has_ie=False, has_fc=False):
    """Update country data availability flags."""
    cursor = conn.cursor()

    if has_gen:
        cursor.execute("UPDATE countries SET has_generation_data = 1 WHERE country_code = ?", (country_code,))
    if has_ie:
        cursor.execute("UPDATE countries SET has_imports_exports_data = 1 WHERE country_code = ?", (country_code,))
    if has_fc:
        cursor.execute("UPDATE countries SET has_final_consumption_data = 1 WHERE country_code = ?", (country_code,))

    conn.commit()


def load_generation_data(conn, country_code, filepath):
    """Load generation data from CSV."""
    data = parse_csv_file(filepath)

    if not data:
        return 0

    cursor = conn.cursor()
    count = 0

    for row in data:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO generation_data (country_code, source, year, value, units)
                VALUES (?, ?, ?, ?, ?)
            """, (country_code, row['source'], row['year'], row['value'], row['units']))
            count += 1
        except sqlite3.Error as e:
            print(f"    Error inserting generation data: {e}")

    conn.commit()
    return count


def load_imports_exports_data(conn, country_code, filepath):
    """Load imports/exports data from CSV."""
    data = parse_csv_file(filepath)

    if not data:
        return 0

    cursor = conn.cursor()
    count = 0

    for row in data:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO imports_exports_data (country_code, flow_type, year, value, units)
                VALUES (?, ?, ?, ?, ?)
            """, (country_code, row['source'], row['year'], row['value'], row['units']))
            count += 1
        except sqlite3.Error as e:
            print(f"    Error inserting imports/exports data: {e}")

    conn.commit()
    return count


def load_final_consumption_data(conn, country_code, filepath):
    """Load final consumption data from CSV."""
    data = parse_csv_file(filepath)

    if not data:
        return 0

    cursor = conn.cursor()
    count = 0

    for row in data:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO final_consumption_data (country_code, sector, year, value, units)
                VALUES (?, ?, ?, ?, ?)
            """, (country_code, row['source'], row['year'], row['value'], row['units']))
            count += 1
        except sqlite3.Error as e:
            print(f"    Error inserting final consumption data: {e}")

    conn.commit()
    return count


def main():
    """Main function to load all data into database."""
    # Paths
    data_dir = Path('data/iea_scraped')
    db_path = Path('data/iea_electricity.db')

    print("Creating database...")
    conn = create_database(db_path)

    # Get all country directories
    country_dirs = sorted([d for d in data_dir.iterdir() if d.is_dir()])

    print(f"Found {len(country_dirs)} countries to process\n")

    stats = {
        'total_countries': 0,
        'countries_with_generation': 0,
        'countries_with_imports_exports': 0,
        'countries_with_final_consumption': 0,
        'total_generation_rows': 0,
        'total_ie_rows': 0,
        'total_fc_rows': 0
    }

    for country_dir in country_dirs:
        country_code = country_dir.name
        stats['total_countries'] += 1

        print(f"[{stats['total_countries']}/{len(country_dirs)}] Processing {country_code}...")

        # Insert country
        insert_country(conn, country_code)

        has_gen = False
        has_ie = False
        has_fc = False

        # Load generation data
        gen_file = country_dir / 'generation.csv'
        if gen_file.exists():
            count = load_generation_data(conn, country_code, gen_file)
            if count > 0:
                print(f"    ✓ Loaded {count} generation records")
                stats['total_generation_rows'] += count
                stats['countries_with_generation'] += 1
                has_gen = True

        # Load imports/exports data
        ie_file = country_dir / 'imports_exports.csv'
        if ie_file.exists():
            count = load_imports_exports_data(conn, country_code, ie_file)
            if count > 0:
                print(f"    ✓ Loaded {count} imports/exports records")
                stats['total_ie_rows'] += count
                stats['countries_with_imports_exports'] += 1
                has_ie = True

        # Load final consumption data
        fc_file = country_dir / 'final_consumption.csv'
        if fc_file.exists():
            count = load_final_consumption_data(conn, country_code, fc_file)
            if count > 0:
                print(f"    ✓ Loaded {count} final consumption records")
                stats['total_fc_rows'] += count
                stats['countries_with_final_consumption'] += 1
                has_fc = True

        # Update country flags
        update_country_flags(conn, country_code, has_gen, has_ie, has_fc)

    conn.close()

    # Print summary
    print(f"\n{'='*70}")
    print("Database loading completed!")
    print(f"{'='*70}")
    print(f"Database saved to: {db_path}")
    print(f"\nStatistics:")
    print(f"  Total countries: {stats['total_countries']}")
    print(f"  Countries with generation data: {stats['countries_with_generation']}")
    print(f"  Countries with imports/exports data: {stats['countries_with_imports_exports']}")
    print(f"  Countries with final consumption data: {stats['countries_with_final_consumption']}")
    print(f"\n  Total generation records: {stats['total_generation_rows']:,}")
    print(f"  Total imports/exports records: {stats['total_ie_rows']:,}")
    print(f"  Total final consumption records: {stats['total_fc_rows']:,}")
    print(f"  Grand total records: {stats['total_generation_rows'] + stats['total_ie_rows'] + stats['total_fc_rows']:,}")
    print(f"{'='*70}")

    # Show database size
    db_size = db_path.stat().st_size / (1024 * 1024)
    print(f"\nDatabase size: {db_size:.2f} MB")


if __name__ == '__main__':
    main()
