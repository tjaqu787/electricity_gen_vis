#!/usr/bin/env python3
"""
Unit test for IEA scraper - validates that we can download all 4 required datasets for Canada.
Expected files:
1. generation.csv - electricity generation by source (Coal, Oil, Natural gas, Nuclear, Hydropower, Wind, Solar PV, Biofuels, Waste, etc.)
2. emissions.csv - emissions from power generation by source
3. imports_exports.csv - imports and exports of electricity
4. final_consumption.csv - electricity consumption by sector (Industry, Transport, Residential, Commercial, Agriculture)
"""

import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
import urllib.parse
import sys


def init_driver():
    """Initialize Selenium webdriver."""
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    return webdriver.Chrome(options=options)


def extract_csv_from_data_url(data_url):
    """Extract CSV content from a data URL."""
    if not data_url or not data_url.startswith('data:text/csv'):
        return None
    content = data_url.split(',', 1)[1]
    return urllib.parse.unquote(content)


def test_canada_downloads():
    """Test downloading all 4 datasets for Canada."""
    print("Testing IEA scraper with Canada data...")
    print("="*70)

    driver = init_driver()
    test_dir = Path('data/test_output')
    test_dir.mkdir(parents=True, exist_ok=True)

    try:
        url = "https://www.iea.org/countries/canada/electricity"
        print(f"\n1. Navigating to: {url}")
        driver.get(url)

        # Wait and scroll
        print("2. Waiting for page to load...")
        time.sleep(5)

        print("3. Scrolling to load all content...")
        for i in range(5):
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(2)

        # Find all CSV download links
        print("4. Finding CSV download links...")
        links = driver.find_elements(By.CSS_SELECTOR, 'a[download][href^="data:text/csv"]')
        print(f"   Found {len(links)} total CSV links")

        # Collect all data
        files_found = {}

        for link in links:
            download_attr = link.get_attribute('download')
            data_url = link.get_attribute('href')

            if not download_attr or not data_url:
                continue

            csv_content = extract_csv_from_data_url(data_url)
            if not csv_content:
                continue

            filename_lower = download_attr.lower()
            content_lower = csv_content.lower()
            lines = csv_content.count('\n')
            size = len(csv_content)

            # Classify files by looking at filename and content
            file_type = None

            if 'generation' in filename_lower and 'source' in filename_lower and size > 1000:
                file_type = 'generation'
            elif 'emission' in filename_lower and 'power generation' in filename_lower and size > 1000:
                file_type = 'emissions'
            elif 'final consumption' in filename_lower and 'sector' in filename_lower and size > 1000:
                file_type = 'final_consumption'
            elif filename_lower.strip().endswith('canada .csv') or \
                 ('electricity,' in content_lower and 'import' in content_lower and 'export' in content_lower):
                file_type = 'imports_exports'

            if file_type:
                # Keep the largest version of each file type
                if file_type not in files_found or size > len(files_found[file_type]['content']):
                    files_found[file_type] = {
                        'filename': download_attr,
                        'content': csv_content,
                        'size': size,
                        'lines': lines
                    }

        # Print results
        print("\n5. Results:")
        print("="*70)

        expected_files = ['generation', 'emissions', 'imports_exports', 'final_consumption']
        all_passed = True

        for file_type in expected_files:
            if file_type in files_found:
                info = files_found[file_type]
                print(f"   ✓ {file_type:20s} {info['size']:6,} bytes, {info['lines']:4} lines")

                # Save file
                filepath = test_dir / f"canada_{file_type}.csv"
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(info['content'])

                # Show first few lines
                first_lines = info['content'].split('\n')[:3]
                for line in first_lines:
                    print(f"      {line[:70]}")
                print()
            else:
                print(f"   ✗ {file_type:20s} NOT FOUND")
                all_passed = False

        print("="*70)
        if all_passed:
            print("✓ TEST PASSED - All 4 datasets downloaded successfully")
            print(f"Files saved to: {test_dir}")
            return 0
        else:
            print("✗ TEST FAILED - Some datasets missing")
            return 1

    finally:
        driver.quit()


if __name__ == '__main__':
    sys.exit(test_canada_downloads())
