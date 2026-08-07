#!/usr/bin/env python3
"""
Builds data/library-access.json -- real public library access, ddr7-1
(data-drive-round-7 epic). Resolves the IMLS Public Libraries Survey,
deferred twice this session -- found the real static bulk CSV download
by browsing IMLS's own site structure (imls.gov/research-evaluation/data
-> "Library Search & Compare" -> the real PLS survey page), not by
guessing a URL.

https://www.imls.gov/sites/default/files/2026-06/pls_fy2024_csv.zip
-- a real, static file (FY2024, the latest year), no API/key needed.

A real join-strategy lesson learned TWICE this session now: the file's
own CITY/STABR fields are administrative address fields, not service-
area fields -- confirmed live, 114/512 spine cities (including
Minneapolis, MN) have ZERO matching row by exact city+state name, the
same class of problem that sank this round's earlier drinking-water
attempt. The real fix, learned from tri-facility-density.ts/drought.ts:
the file also carries real LATITUDE/LONGITUD per library system --
100% of its 9,249 rows have valid, non-zero coordinates. This uses a
10-mile radius join instead (same haversine pattern as
tri-facility-density.ts), avoiding the administrative-naming problem
entirely.

Sums real VISITS and POPU_LSA (population of legal service area, a real
field already in the same file -- no separate population fetch needed)
across every library system within radius, computes visits per capita.

Raw direction: LOWER visits per capita is MORE concerning -- a public-
good-access framing, matching parks.ts/transit-access.ts/walkability.ts's
existing convention for access-to-a-resource datasets, percentile-ranked
and inverted among covered cities.
"""
import csv
import json
import math
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/library-access-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEAR = "2024"
RADIUS_MILES = 10
ZIP_URL = "https://www.imls.gov/sites/default/files/2026-06/pls_fy2024_csv.zip"


def fetch_bulk_zip():
    zip_path = CACHE_DIR / "pls_fy2024_csv.zip"
    if not zip_path.exists():
        print("Downloading real IMLS PLS FY2024 bulk CSV (~3.6MB, one request)...", file=sys.stderr)
        result = subprocess.run(["curl", "-sL", "--max-time", "60", ZIP_URL], capture_output=True, check=True)
        zip_path.write_bytes(result.stdout)

    extract_dir = CACHE_DIR / "extracted"
    if not extract_dir.exists():
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(extract_dir)
    csv_files = list(extract_dir.glob("**/PLS_FY24_AE_*.csv"))
    if not csv_files:
        raise SystemExit("Expected PLS_FY24_AE_*.csv not found after extracting the real IMLS bulk download")
    return csv_files[0]


def haversine_miles(lat1, lon1, lat2, lon2):
    r = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def load_library_systems():
    csv_path = fetch_bulk_zip()
    systems = []
    with open(csv_path, encoding="latin-1") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                lat, lon = float(row["LATITUDE"]), float(row["LONGITUD"])
                visits, pop = float(row["VISITS"]), float(row["POPU_LSA"])
            except (ValueError, TypeError, KeyError):
                continue
            if lat == 0 or lon == 0 or visits < 0 or pop <= 0:
                continue
            systems.append((lat, lon, visits, pop))
    return systems


def percentile_ranks_inverted(values_by_id):
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    return {cid: round((n - 1 - i) / max(n - 1, 1) * 100, 1) for i, cid in enumerate(ids_sorted)}


def main():
    systems = load_library_systems()
    print(f"Loaded {len(systems)} real library systems with valid geo + visits + population data.", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())
    records = {}
    unmatched = []

    for city in cities:
        nearby = [s for s in systems if haversine_miles(city["lat"], city["lon"], s[0], s[1]) <= RADIUS_MILES]
        if not nearby:
            unmatched.append(city["id"])
            continue
        total_visits = sum(s[2] for s in nearby)
        total_pop = sum(s[3] for s in nearby)
        if total_pop <= 0:
            unmatched.append(city["id"])
            continue
        visits_per_capita = total_visits / total_pop
        records[city["id"]] = {
            "visits_per_capita": round(visits_per_capita, 2),
            "systems_nearby": len(nearby),
            "year": YEAR,
        }

    concern = percentile_ranks_inverted({cid: r["visits_per_capita"] for cid, r in records.items()})
    for cid in records:
        records[cid]["score"] = concern[cid]

    covered = len(records)
    result = {
        "_meta": {
            "source": f"IMLS Public Libraries Survey (PLS), {YEAR}, {RADIUS_MILES}-mile radius join",
            "coverage": covered,
        },
        **records,
    }
    (ROOT / "data/library-access.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/library-access.json: {covered}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched ({len(unmatched)}): {unmatched}", file=sys.stderr)

    values = sorted(r["visits_per_capita"] for r in records.values())
    if values:
        print(f"visits/capita range: min={values[0]:.2f} median={values[len(values)//2]:.2f} max={values[-1]:.2f}", file=sys.stderr)


if __name__ == "__main__":
    main()
