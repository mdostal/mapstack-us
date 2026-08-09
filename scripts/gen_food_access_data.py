#!/usr/bin/env python3
"""
Builds the food-access dataset: fetches USDA ERS's Food Access Research
Atlas (FARA, now also called the Large Retailer Access Map/LRAM), a free
direct download requiring no API key or account, then joins it to every
spine city via a 2010-vintage census tract crosswalk
(data/raw/city-tract-fips-2010.json, built by geocode_city_tracts_2010.py).

Extended to real multi-vintage history -- 2010, 2015, 2019 (ddr-food-
access-extend, this session). FARA has only ever published THREE
vintages (confirmed live via ers.usda.gov/data-products/food-access-
research-atlas/download-the-data -- a 2006 "food desert locator" exists
but is a real, different, incompatible predecessor product, and a 2025
"SNAP Authorized Retailer Access Map" is a real, different dataset
entirely, not a FARA refresh), not an annual series -- `supportsTime`
still applies with real, sparse `availableYears` (same posture as
electoral-competitiveness.ts's real 4-year election-cycle gaps).

All three real vintages share the SAME `CensusTract` GEOID format and
the SAME `lapophalfshare`/`lalowihalfshare` columns -- confirmed live by
inspecting each vintage's real column headers directly -- meaning the
SAME 2010-vintage crosswalk this dataset already built serves all three
without a new geocode pass. The 2010 and 2015 vintages ship as .xlsx
(not .csv like 2019) -- parsed with openpyxl.

NOT the same tract crosswalk the social-vulnerability dataset uses
(data/raw/city-tract-fips.json, current/2020-vintage tracts) -- a real
mismatch found live: FARA's tract boundaries are frozen at the 2010
census, and tracts get split/merged/renumbered between the 2010 and 2020
census. See geocode_city_tracts_2010.py's own doc comment.

Reports 2 layers, both "higher = more concerning" already (share of a
population living far from a supermarket), already 0-100 (a real
percentage, directly comparable across vintages -- no rescale needed):
  - low_access: % of the WHOLE tract population living >0.5 mile (urban)
    from the nearest large supermarket/grocery.
  - low_income_low_access: % of the LOW-INCOME population specifically
    living that far away -- the more targeted "food desert" measure.

A real minority of tracts have FARA's own null (no population base to
compute a share) -- preserved as an honest null, never coerced to 0.
"""
import io
import json
import subprocess
import sys
import zipfile
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/food-access-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Real per-vintage URLs, read directly off ers.usda.gov's own download
# page (rendered live) -- FARA has only ever published these three
# vintages.
VINTAGE_URLS = {
    2019: "https://www.ers.usda.gov/media/5627/2019-large-retailer-access-map-lram-formerly-known-as-the-food-access-research-atlas-fara-data.zip?v=16251",
    2015: "https://www.ers.usda.gov/media/5623/2015-food-access-research-atlas-fara-data-and-documentation.zip?v=98922",
    2010: "https://www.ers.usda.gov/media/5624/2010-food-access-research-atlas-fara-data-and-documentation.zip?v=15624",
}
YEARS = sorted(VINTAGE_URLS)


def fetch_vintage_zip(year):
    zip_path = CACHE_DIR / f"fara-{year}.zip"
    if not zip_path.exists():
        print(f"Downloading real FARA {year} vintage...", file=sys.stderr)
        result = subprocess.run(
            ["curl", "-s", "--max-time", "120", "-A", "Mozilla/5.0", VINTAGE_URLS[year]],
            capture_output=True, check=True,
        )
        zip_path.write_bytes(result.stdout)
    return zip_path


def parse_share(raw) -> float | None:
    if raw in ("NULL", "", None):
        return None
    return round(float(raw), 1)


def load_vintage_2019():
    import csv

    zip_path = fetch_vintage_zip(2019)
    with zipfile.ZipFile(zip_path) as zf:
        csv_name = next(n for n in zf.namelist() if n.endswith(".csv") and "Atlas" in n)
        text = zf.read(csv_name).decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    by_tract = {}
    for row in reader:
        # FARA's CensusTract column is exported as a plain number in the
        # CSV, so single-digit state FIPS codes (e.g. Alabama = 01) lose
        # their leading zero -- re-pad to the real 11-digit tract FIPS.
        # Found live: without this, only tracts in double-digit-state-
        # FIPS states (10-56) matched at all.
        tract_fips = row["CensusTract"].zfill(11)
        by_tract[tract_fips] = {
            "low_access": parse_share(row["lapophalfshare"]),
            "low_income_low_access": parse_share(row["lalowihalfshare"]),
        }
    return by_tract


def load_vintage_xlsx(year):
    zip_path = fetch_vintage_zip(year)
    with zipfile.ZipFile(zip_path) as zf:
        xlsx_name = next(n for n in zf.namelist() if n.endswith(".xlsx"))
        xlsx_bytes = zf.read(xlsx_name)

    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), read_only=True)
    ws = wb["Food Access Research Atlas"]
    rows = ws.iter_rows(values_only=True)
    header = next(rows)
    idx = {name: i for i, name in enumerate(header)}

    by_tract = {}
    for row in rows:
        tract_fips = str(row[idx["CensusTract"]]).zfill(11)
        by_tract[tract_fips] = {
            "low_access": parse_share(row[idx["lapophalfshare"]]),
            "low_income_low_access": parse_share(row[idx["lalowihalfshare"]]),
        }
    wb.close()
    return by_tract


def main():
    city_tracts = json.loads((ROOT / "data/raw/city-tract-fips-2010.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    by_tract_per_year = {}
    for year in YEARS:
        by_tract = load_vintage_2019() if year == 2019 else load_vintage_xlsx(year)
        by_tract_per_year[year] = by_tract
        print(f"{year}: {len(by_tract)} real tracts loaded from FARA", file=sys.stderr)

    records = {}
    for city in cities:
        cid = city["id"]
        tract_info = city_tracts.get(cid)
        if not tract_info:
            continue

        years_data = {}
        for year in YEARS:
            record = by_tract_per_year[year].get(tract_info["tract_fips"])
            if record:
                years_data[str(year)] = record
        if years_data:
            records[cid] = {"tract": tract_info["tract_name"], "years": years_data}

    records["_meta"] = {
        "source": "USDA ERS Food Access Research Atlas (FARA), real published vintages 2010/2015/2019",
        "source_url": "https://www.ers.usda.gov/data-products/food-access-research-atlas",
        "resolution": "census tract, 2010 vintage boundaries",
        "years": YEARS,
        "coverage": len(records),
    }

    (ROOT / "data/food-access.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/food-access.json: {len(records)}/{len(cities)} cities matched (any vintage).", file=sys.stderr)


if __name__ == "__main__":
    main()
