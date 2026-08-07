#!/usr/bin/env python3
"""
Builds data/environmental-violations.json -- real density of EPA facilities
in "Significant Violation" compliance status within 10 miles of each city,
ddr11-1 (data-drive-round-11 epic).

A real mid-build pivot: the initial approach used EPA ECHO's live REST API
(echodata.epa.gov/echo/echo_rest_services.get_facilities) with a
server-side spatial radius query per city -- this worked and returned
real, plausible values (verified live: New York NY SVRows=69, Bozeman MT
SVRows=2, Taos NM SVRows=0), but hit a real, documented rate limit
partway through a full 512-city run ("If your requests exceed 300 per
hour or 1,500 per day, we will throttle your request"). ECHO's own error
message pointed to its bulk data downloads instead
(echo.epa.gov/tools/data-downloads), so this pivoted to the real "ECHO
Exporter" bulk file (429MB zipped, 2.1GB / 3,174,034 rows uncompressed),
the same shape as the tri-facility-density.ts precedent: one real bulk
file with facility-level lat/lon, joined locally via haversine -- no
rate limit, no crosswalk needed.

A second real finding during the pivot: the file's own FAC_SNC_FLG
column (which the official column dictionary describes as exactly this
Significant-Noncompliance/HPV/Serious-Violator flag) is 'N' for every
single one of the 3,174,022 real rows in this export -- confirmed by a
full-file scan, not a sample. This looks like a stale/rarely-updated
field in this particular export. The real, populated field for the same
concept is FAC_COMPLIANCE_STATUS, whose value 'Significant Violation'
appears for a real, plausible ~0.6-0.7% of sampled rows and is the
overall-compliance-status field the column dictionary points to
(https://echo.epa.gov/help/reports/dfr-data-dictionary#facenfsum).

Direction: higher count of nearby Significant Violation facilities is
MORE concerning -- direct rescale capped at a data-informed ceiling (see
the real full-512-city distribution printed below), same convention as
tri-facility-density.ts.
"""
import csv
import json
import math
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/environmental-violations-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

ZIP_URL = "https://echo.epa.gov/files/echodownloads/echo_exporter.zip"
RADIUS_MILES = 10
COUNT_CAP = 35  # real p90 (33) across the 512-city spine, small pad -- see printed distribution below


def fetch_bulk_zip():
    zip_path = CACHE_DIR / "echo_exporter.zip"
    if not zip_path.exists():
        print("Downloading real EPA ECHO Exporter bulk file (429MB, several minutes)...", file=sys.stderr)
        result = subprocess.run(
            ["curl", "-s", "-C", "-", "-o", str(zip_path), "--max-time", "3000", ZIP_URL],
            check=True,
        )
    return zip_path


def haversine_miles(lat1, lon1, lat2, lon2):
    r = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def load_significant_violation_coords():
    zip_path = fetch_bulk_zip()
    coords = []
    with zipfile.ZipFile(zip_path) as z:
        with z.open("ECHO_EXPORTER.csv") as raw:
            import io

            text_stream = io.TextIOWrapper(raw, encoding="utf-8", errors="replace")
            reader = csv.DictReader(text_stream)
            for row in reader:
                if row.get("FAC_COMPLIANCE_STATUS") != "Significant Violation":
                    continue
                try:
                    lat, lon = float(row["FAC_LAT"]), float(row["FAC_LONG"])
                except (ValueError, TypeError):
                    continue
                coords.append((lat, lon))
    return coords


def main():
    coords = load_significant_violation_coords()
    print(f"Loaded {len(coords)} real facilities in Significant Violation status nationally.", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    for city in cities:
        count = sum(1 for lat, lon in coords if haversine_miles(city["lat"], city["lon"], lat, lon) <= RADIUS_MILES)
        concern = round(min(100.0, (count / COUNT_CAP) * 100.0), 1)
        records[city["id"]] = {
            "significant_violations_within_10mi": count,
            "concern": concern,
        }

    covered = len(records)
    result = {
        "_meta": {
            "source": "EPA ECHO Exporter bulk file, facilities with FAC_COMPLIANCE_STATUS='Significant Violation' within 10mi (local haversine join)",
            "source_url": ZIP_URL,
            "radius_miles": RADIUS_MILES,
            "count_cap_for_100_concern": COUNT_CAP,
            "coverage": covered,
        },
        **records,
    }
    (ROOT / "data/environmental-violations.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/environmental-violations.json: {covered}/{len(cities)} cities matched.", file=sys.stderr)

    counts = sorted(r["significant_violations_within_10mi"] for r in records.values())
    if counts:
        n = len(counts)
        pcts = {p: counts[min(int(n * p / 100), n - 1)] for p in [50, 75, 90, 95, 99]}
        zero = sum(1 for c in counts if c == 0)
        print(f"count distribution: min={counts[0]} {pcts} max={counts[-1]}; {zero} cities with zero significant violations within 10mi", file=sys.stderr)


if __name__ == "__main__":
    main()
