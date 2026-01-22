#!/usr/bin/env python3
"""
Audit all scraped data to verify what we actually have.
"""

import csv
from pathlib import Path
from collections import defaultdict


def analyze_csv(filepath):
    """Analyze a CSV file and return info about it."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            rows = list(reader)

            if len(rows) < 2:
                return {'type': 'empty', 'rows': len(rows), 'samples': []}

            header = rows[0][0] if rows else ''

            # Get unique values from first column (sources/sectors/flow types)
            categories = set()
            for row in rows[1:]:
                if row and row[0]:
                    categories.add(row[0].strip(' "'))

            # Sample some data
            samples = []
            for row in rows[1:min(6, len(rows))]:
                if len(row) >= 4:
                    samples.append(f"{row[0]},{row[1]},{row[2]},{row[3]}")

            return {
                'header': header,
                'rows': len(rows) - 1,
                'categories': sorted(categories),
                'samples': samples
            }
    except Exception as e:
        return {'type': 'error', 'error': str(e)}


def main():
    # Check main scraped data
    scraped_dir = Path('data/iea_scraped')
    consumption_dir = Path('data/final_consumption_scraped')

    print("="*80)
    print("AUDIT OF SCRAPED DATA")
    print("="*80)

    # Analyze a few sample countries in detail
    sample_countries = ['canada', 'united-states', 'china', 'germany', 'japan']

    for country in sample_countries:
        country_dir = scraped_dir / country
        if not country_dir.exists():
            continue

        print(f"\n{'='*80}")
        print(f"COUNTRY: {country.upper()}")
        print(f"{'='*80}")

        for csv_file in sorted(country_dir.glob('*.csv')):
            print(f"\n📄 {csv_file.name}")
            print("-" * 80)

            info = analyze_csv(csv_file)

            if info.get('type') == 'error':
                print(f"   ERROR: {info['error']}")
                continue
            elif info.get('type') == 'empty':
                print(f"   EMPTY FILE (only {info['rows']} rows)")
                continue

            print(f"   Header: {info['header'][:70]}")
            print(f"   Data rows: {info['rows']}")
            print(f"   Categories ({len(info['categories'])}): {', '.join(info['categories'][:10])}")
            if len(info['categories']) > 10:
                print(f"                    ... and {len(info['categories']) - 10} more")
            print(f"   Sample data:")
            for sample in info['samples'][:5]:
                print(f"      {sample[:75]}")

        # Check consumption data
        consumption_file = consumption_dir / f"{country}_final_consumption.csv"
        if consumption_file.exists():
            print(f"\n📄 final_consumption.csv (from separate scrape)")
            print("-" * 80)
            info = analyze_csv(consumption_file)
            print(f"   Header: {info['header'][:70]}")
            print(f"   Data rows: {info['rows']}")
            print(f"   Categories: {', '.join(info['categories'])}")

    # Summary statistics
    print(f"\n{'='*80}")
    print("SUMMARY STATISTICS")
    print(f"{'='*80}")

    stats = defaultdict(lambda: {'count': 0, 'total_rows': 0})

    for country_dir in scraped_dir.iterdir():
        if not country_dir.is_dir():
            continue

        for csv_file in country_dir.glob('*.csv'):
            file_type = csv_file.stem
            info = analyze_csv(csv_file)
            if info.get('rows', 0) > 0:
                stats[file_type]['count'] += 1
                stats[file_type]['total_rows'] += info['rows']

    # Add consumption stats
    for csv_file in consumption_dir.glob('*.csv'):
        info = analyze_csv(csv_file)
        if info.get('rows', 0) > 0:
            stats['final_consumption (separate)']['count'] += 1
            stats['final_consumption (separate)']['total_rows'] += info['rows']

    print("\nFile type breakdown:")
    for file_type, data in sorted(stats.items()):
        print(f"  {file_type:30s}: {data['count']:3d} countries, {data['total_rows']:6,d} total rows")

    print(f"\n{'='*80}")


if __name__ == '__main__':
    main()
