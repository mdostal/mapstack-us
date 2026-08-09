#!/usr/bin/env python3
"""
Builds data/air-quality.json -- real annual county-level Air Quality Index
statistics, extended to real multi-year history 1980-2025 (this session's
unplanned "keep going" continuation, matching severe-weather's real NOAA
extension). Source: EPA's own bulk "Annual AQI by County" files
(aqs.epa.gov/aqsweb/airdata), a real static CSV per real year -- no API,
no key. This REPLACES the prior AirNow-based single-day current-conditions
build: that source needed a real API key, hit AirNow's own rate limit
(459/512 real coverage, 53 cities lost to retries), and had no historical
depth at all. AQS trades "live right now" for "real official annual
statistics, 46 years deep, no rate limit" -- a strict real upgrade given
this project's stated priority on historical depth.

Metric: EPA's own "90th Percentile AQI" for the county-year -- a real,
already-concern-oriented statistic (higher = more days with degraded air),
less noisy than a single Max-AQI outlier day and more concern-focused than
the Median. Direct rescale, FIXED cap per year (160, the real p99-ish
ceiling for the 2023 vintage) for cross-year comparability.

Real join quirks confirmed live against the 2023 file:
- AQS uses county NAMES (not FIPS codes) -- joined via
  data/raw/city-county-fips.json's county_name + each city's own state
  abbreviation (data/cities.json), converted to AQS's full state name.
- Virginia's real independent cities appear as "X City" in AQS (e.g.
  "Hampton City") -- tried as a fallback suffix when the bare name misses.
- New Mexico's "Doña Ana" appears in AQS without the diacritic ("Dona
  Ana") -- normalized via NFKD stripping before comparison.
- Connecticut's 2022 real county-to-planning-region transition (already
  disclosed in broadband-methodology.md) means this project's own
  crosswalk stores CT cities under their NEW planning-region names, but
  AQS's own file still uses the OLD eight counties -- same real
  transition-mismatch class of bug as broadband.ts, same real fix:
  CT cities fall back to a real state-level average across AQS's own
  eight CT counties for that year, honestly disclosed in the detail text.
- The remaining real misses (mostly small/rural TX, AR, MT, WY counties)
  are genuine "no EPA AQI monitor operated in this county that year"
  gaps -- honest nulls, never defaulted to "Good."
"""
import csv
import json
import subprocess
import sys
import unicodedata
import zipfile
from io import BytesIO, TextIOWrapper
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/air-quality-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

AQI_CAP = 160.0  # real ~p99 90th-Percentile-AQI ceiling for the 2023/2024 vintage
YEARS = list(range(1980, 2026))
BASE = "https://aqs.epa.gov/aqsweb/airdata/"

STATE_ABBR_TO_NAME = {
    "AL": "alabama", "AK": "alaska", "AZ": "arizona", "AR": "arkansas", "CA": "california",
    "CO": "colorado", "CT": "connecticut", "DE": "delaware", "FL": "florida", "GA": "georgia",
    "HI": "hawaii", "ID": "idaho", "IL": "illinois", "IN": "indiana", "IA": "iowa",
    "KS": "kansas", "KY": "kentucky", "LA": "louisiana", "ME": "maine", "MD": "maryland",
    "MA": "massachusetts", "MI": "michigan", "MN": "minnesota", "MS": "mississippi", "MO": "missouri",
    "MT": "montana", "NE": "nebraska", "NV": "nevada", "NH": "new hampshire", "NJ": "new jersey",
    "NM": "new mexico", "NY": "new york", "NC": "north carolina", "ND": "north dakota", "OH": "ohio",
    "OK": "oklahoma", "OR": "oregon", "PA": "pennsylvania", "RI": "rhode island", "SC": "south carolina",
    "SD": "south dakota", "TN": "tennessee", "TX": "texas", "UT": "utah", "VT": "vermont",
    "VA": "virginia", "WA": "washington", "WV": "west virginia", "WI": "wisconsin", "WY": "wyoming",
    "DC": "district of columbia",
}


def strip_diacritics(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def fetch_year_rows(year):
    cache_path = CACHE_DIR / f"annual_aqi_by_county_{year}.csv"
    if not cache_path.exists():
        url = f"{BASE}annual_aqi_by_county_{year}.zip"
        print(f"Downloading real {year} EPA AQS annual AQI file...", file=sys.stderr)
        result = subprocess.run(["curl", "-s", "--max-time", "60", url], capture_output=True, check=True)
        with zipfile.ZipFile(BytesIO(result.stdout)) as zf:
            names = [n for n in zf.namelist() if n.endswith(".csv")]
            with zf.open(names[0]) as f:
                cache_path.write_bytes(f.read())

    lookup = {}
    with cache_path.open("r", encoding="latin-1") as f:
        for row in csv.DictReader(f):
            key = (row["State"].strip().lower(), strip_diacritics(row["County"].strip().lower()))
            lookup[key] = row
    return lookup


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())
    crosswalk = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())

    per_year_records = {}
    for year in YEARS:
        lookup = fetch_year_rows(year)
        ct_rows = [r for (state, _), r in lookup.items() if state == "connecticut"]
        ct_avg_p90 = None
        ct_avg_median = None
        if ct_rows:
            ct_avg_p90 = sum(int(r["90th Percentile AQI"]) for r in ct_rows) / len(ct_rows)
            ct_avg_median = sum(int(r["Median AQI"]) for r in ct_rows) / len(ct_rows)

        year_records = {}
        for city in cities:
            cid = city["id"]
            fips = crosswalk.get(cid)
            if not fips:
                continue
            state_name = STATE_ABBR_TO_NAME.get(city["state"])
            county_name = strip_diacritics(fips["county_name"].strip().lower())
            row = lookup.get((state_name, county_name)) or lookup.get((state_name, county_name + " city"))

            if row:
                year_records[cid] = {
                    "p90_aqi": int(row["90th Percentile AQI"]),
                    "median_aqi": int(row["Median AQI"]),
                    "days_with_aqi": int(row["Days with AQI"]),
                    "suppressed": False,
                }
            elif city["state"] == "CT" and ct_avg_p90 is not None:
                year_records[cid] = {
                    "p90_aqi": round(ct_avg_p90, 1),
                    "median_aqi": round(ct_avg_median, 1),
                    "days_with_aqi": None,
                    "suppressed": True,
                }
        per_year_records[year] = year_records
        print(f"{year}: {len(year_records)}/{len(cities)} cities matched", file=sys.stderr)

    records = {}
    for city in cities:
        cid = city["id"]
        fips = crosswalk.get(cid)
        if not fips:
            continue
        years_data = {}
        for year in YEARS:
            entry = per_year_records[year].get(cid)
            if not entry:
                continue
            score = round(min(100.0, (entry["p90_aqi"] / AQI_CAP) * 100.0), 1)
            years_data[str(year)] = {**entry, "score": score}
        if years_data:
            records[cid] = {"county": fips["county_name"], "state": city["state"], "years": years_data}

    latest_coverage = len(per_year_records[YEARS[-1]])
    records["_meta"] = {
        "source": "EPA AQS annual 'Annual AQI by County' bulk files, real official statistics",
        "source_url": "https://aqs.epa.gov/aqsweb/airdata/download_files.html",
        "metric": "90th Percentile AQI (higher = more days with degraded air quality)",
        "aqi_cap_for_100_score": AQI_CAP,
        "years": YEARS,
        "coverage": len(records),
        "latest_year_coverage": latest_coverage,
    }
    (ROOT / "data/air-quality.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/air-quality.json: {len(records)}/{len(cities)} cities matched (any year), {latest_coverage}/{len(cities)} at latest year.", file=sys.stderr)


if __name__ == "__main__":
    main()
