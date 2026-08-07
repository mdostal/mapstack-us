#!/usr/bin/env python3
"""
Builds data/tri-facility-density.json -- real EPA Toxics Release Inventory
(TRI) facility density, tri-1 (tri-bulk-and-data-drive-2 epic). A prior
attempt (dvd-6, dataset-verification-drive epic) tried EPA's live query API
(data.epa.gov/efservice/tri_facility/...) and hit a real wall: 16+ minutes
for one state's facilities, truncated response. That table is EPA's entire
cumulative historical facility registry (59,208 records since 1987) --
not built for bulk querying.

The real fix, found by reading the TRI Basic Data Files page directly
rather than the query API docs: EPA publishes a separate, purpose-built
bulk download -- one pre-built CSV per reporting year, confirmed live at
data.epa.gov/efservice/downloads/tri/mv_tri_basic_download/{year}_US/csv.
This returns the COMPLETE national file in one ~60s request -- 3,525
unique CURRENT-year facilities after dedup (2024), each with real lat/lon
already included. No crosswalk needed at all: data/cities.json already
has real lat/lon per city, and the TRI file has real lat/lon per facility.

Raw direction: higher facility density within a fixed radius is MORE
concerning (cumulative proximity to reporting industrial facilities) --
direct rescale, same shape as air-quality.ts's own distance-based
approach (DISTANCE_MILES=50 there; 10 miles here, a tighter radius since
this measures facility density rather than air-monitor coverage).
"""
import csv
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/tri-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEAR = 2024
RADIUS_MILES = 10
COUNT_CAP = 70  # real p90 (66) across the 512-city spine, small pad -- see printed distribution below


def fetch_bulk_csv():
    cache_file = CACHE_DIR / f"tri-basic-{YEAR}-us.csv"
    if cache_file.exists():
        return cache_file.read_text()
    url = f"https://data.epa.gov/efservice/downloads/tri/mv_tri_basic_download/{YEAR}_US/csv"
    print(f"Downloading real {YEAR} TRI Basic Data File (national, ~60s, one request)...", file=sys.stderr)
    result = subprocess.run(["curl", "-s", "--max-time", "120", url], capture_output=True, check=True)
    text = result.stdout.decode("utf-8", errors="replace")
    cache_file.write_text(text)
    return text


def haversine_miles(lat1, lon1, lat2, lon2):
    r = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def load_facilities():
    text = fetch_bulk_csv()
    reader = csv.reader(text.splitlines())
    next(reader)  # header
    facilities = {}
    for row in reader:
        if len(row) < 13:
            continue
        trifd = row[1]
        try:
            lat, lon = float(row[11]), float(row[12])
        except ValueError:
            continue
        facilities[trifd] = (lat, lon)
    return facilities


def main():
    facilities = load_facilities()
    print(f"Loaded {len(facilities)} unique real TRI facilities for {YEAR}.", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())
    coords = list(facilities.values())

    records = {}
    for city in cities:
        count = sum(1 for lat, lon in coords if haversine_miles(city["lat"], city["lon"], lat, lon) <= RADIUS_MILES)
        score = round(min(100.0, (count / COUNT_CAP) * 100.0), 1)
        records[city["id"]] = {"facility_count": count, "score": score}

    records["_meta"] = {
        "source": f"EPA TRI Basic Data File, {YEAR} reporting year, national bulk download",
        "source_url": f"https://data.epa.gov/efservice/downloads/tri/mv_tri_basic_download/{YEAR}_US/csv",
        "radius_miles": RADIUS_MILES,
        "count_cap_for_100_score": COUNT_CAP,
        "unique_facilities_nationally": len(facilities),
        "coverage": len(records),
    }

    covered = records["_meta"]["coverage"]
    (ROOT / "data/tri-facility-density.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/tri-facility-density.json: {covered}/{len(cities)} cities.", file=sys.stderr)

    counts = sorted(r["facility_count"] for cid, r in records.items() if cid != "_meta")
    if counts:
        print(f"facility count range: min={counts[0]} median={counts[len(counts)//2]} max={counts[-1]}", file=sys.stderr)
        clamped = sum(1 for c in counts if c > COUNT_CAP)
        print(f"{clamped} cities clamp to 100 score (count exceeds {COUNT_CAP})", file=sys.stderr)


if __name__ == "__main__":
    main()
