#!/usr/bin/env python3
"""
Builds data/tri-facility-density.json -- real EPA Toxics Release Inventory
(TRI) facility density, tri-1 (tri-bulk-and-data-drive-2 epic). A prior
attempt (dvd-6, dataset-verification-drive epic) tried EPA's live query API
against the `tri_facility` table directly and hit a real wall: 16+ minutes
for one state, truncated response -- that table is EPA's entire cumulative
historical facility registry (64,990 records since 1987), not built for
ad hoc bulk querying with the wrong access pattern.

Real multi-year history (1987-2024), per explicit operator direction to
get "as much data as possible" for real trends over time. 1987 is TRI's
own real reporting floor; 2025 isn't published yet (a real, confirmed-live
HTTP 404 -- TRI's real reporting deadline is mid-year for the PRIOR
year's data).

Method, v2 -- a real architecture change after v1 hit a real wall:
v1 fetched EPA's purpose-built "TRI Basic Data File" bulk CSV
(one huge pre-generated file per year, `mv_tri_basic_download/{year}_US/csv`)
-- this worked for smaller-file years (1987-1996, and 2024 in an earlier
session) but consistently failed for 1997-2000/2005/2015 in this session:
every attempt (national AND a small single-state test) was cut off at a
consistent ~950-1070s wall time regardless of client --max-time or file
size, indicating a real, server-side connection/generation ceiling on
EPA's infrastructure that this session's testing window was hitting
broadly (confirmed via a 25min and a 60min cooldown that didn't
consistently fix it, and a per-state test that STILL hit the same wall
despite a much smaller file -- ruling out "file too big" as the sole
cause).

The real fix: EPA's Envirofacts REST API (`data.epa.gov/efservice`)
exposes the underlying tables directly, and two much smaller/faster
queries reconstruct the exact same "which facilities reported this
year, and where are they" answer without ever requesting the giant
combined per-year file:
  1. `tri_facility` -- the cumulative facility registry (TRIFD + lat/lon).
     Facility locations don't change year to year, so this is fetched
     ONCE (not per-year) and cached.
  2. `tri_reporting_form` filtered by `reporting_year` -- one row per
     (facility, chemical) report that year, same real row-count order of
     magnitude as the old Basic Data File, but small enough per row that
     PARALLEL row-window pagination (many concurrent ~10k-row chunks)
     finishes in ~100-200s wall time even for an 80k+ row year --
     confirmed live: three concurrent 10k-row chunks (30k rows total)
     completed in ~105s, vs the old single-connection approach's
     ~950-1070s wall for the same year.

Coordinate note: `tri_facility`'s `pref_latitude`/`pref_longitude` (and
the DMS-packed `fac_latitude`/`fac_longitude` fallback, format DDDMMSS)
store longitude as an unsigned magnitude -- confirmed live against a
Massachusetts facility (real longitude ~-72.6) returning pref_longitude
72.6244 -- so longitude is negated here to match standard WGS84 (safe
for all 50-state TRI facilities, which are entirely in the Western
hemisphere).

Raw direction: higher facility density within a fixed radius is MORE
concerning (cumulative proximity to reporting industrial facilities) --
direct rescale, capped at a FIXED count across every year (same posture
as sales-tax.ts/income-tax.ts's own real-observed caps) so a city's
density stays honestly comparable year to year.
"""
import csv
import io
import json
import math
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_CACHE = ROOT / "data/raw/tri-facility-registry-cache"
REPORTING_CACHE = ROOT / "data/raw/tri-reporting-form-cache"
REGISTRY_CACHE.mkdir(parents=True, exist_ok=True)
REPORTING_CACHE.mkdir(parents=True, exist_ok=True)

YEARS = list(range(1987, 2025))
RADIUS_MILES = 10
COUNT_CAP = 70  # real p90 (66) for the 2024 vintage, small pad -- see v1's own printed distribution
CHUNK_SIZE = 8000
MAX_WORKERS = 10
BASE = "https://data.epa.gov/efservice"


def fetch_url(url, retries=4, timeout=90):
    last_err = None
    for attempt in range(retries):
        try:
            result = subprocess.run(["curl", "-s", "--max-time", str(timeout), url], capture_output=True, check=True)
            return result.stdout.decode("utf-8", errors="replace")
        except subprocess.CalledProcessError as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2**attempt)
    raise last_err


def fetch_count(table, year=None):
    url = f"{BASE}/{table}/reporting_year/{year}/count/JSON" if year else f"{BASE}/{table}/count/JSON"
    text = fetch_url(url, timeout=30)
    return json.loads(text)[0]["TOTALQUERYRESULTS"]


def fetch_chunks_parallel(table, total, year=None, columns=None):
    """Fetch every row of `table` (optionally filtered by reporting_year)
    via concurrent row-window CSV requests -- confirmed live this avoids
    the single-connection ~950-1070s wall the old bulk-file approach hit."""
    windows = [(start, min(start + CHUNK_SIZE - 1, total - 1)) for start in range(0, total, CHUNK_SIZE)]
    rows = []

    def fetch_one(window):
        start, end = window
        year_seg = f"/reporting_year/{year}" if year else ""
        url = f"{BASE}/{table}{year_seg}/rows/{start}:{end}/CSV"
        # A successful HTTP response can still carry a non-CSV error body
        # (confirmed live: an occasional chunk under concurrent load) --
        # fetch_url's retry only covers transport-level curl failures, so
        # validate the parsed header here and retry the whole chunk if it
        # doesn't look like real tri_facility_id-bearing CSV.
        for attempt in range(4):
            text = fetch_url(url, timeout=120)
            reader = csv.reader(io.StringIO(text))
            header = next(reader, None)
            if header and "tri_facility_id" in header:
                return header, list(reader)
            if attempt < 3:
                time.sleep(2**attempt)
        raise RuntimeError(f"Never got a valid CSV header for {url} after 4 attempts")

    header = None
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(fetch_one, w): w for w in windows}
        for future in as_completed(futures):
            h, chunk_rows = future.result()
            header = header or h
            rows.extend(chunk_rows)
    return header, rows


def dms_to_decimal(raw):
    """DDDMMSS-packed integer (e.g. 723728 -> 72 deg 37 min 28 sec)."""
    try:
        v = int(float(raw))
    except (TypeError, ValueError):
        return None
    if v == 0:
        return None
    deg = v // 10000
    minutes = (v % 10000) // 100
    seconds = v % 100
    return deg + minutes / 60 + seconds / 3600


def build_facility_registry():
    cache_file = REGISTRY_CACHE / "registry.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    print("Fetching real tri_facility registry (once, cumulative across all years)...", file=sys.stderr)
    total = fetch_count("tri_facility")
    header, rows = fetch_chunks_parallel("tri_facility", total)
    idx = {name: i for i, name in enumerate(header)}

    registry = {}
    for row in rows:
        if len(row) <= idx.get("pref_longitude", -1):
            continue
        trifd = row[idx["tri_facility_id"]]
        lat = lon = None
        try:
            pref_lat, pref_lon = row[idx["pref_latitude"]], row[idx["pref_longitude"]]
            if pref_lat and pref_lon:
                lat, lon = float(pref_lat), -abs(float(pref_lon))
        except ValueError:
            lat = lon = None
        if lat is None:
            fac_lat = dms_to_decimal(row[idx["fac_latitude"]])
            fac_lon = dms_to_decimal(row[idx["fac_longitude"]])
            if fac_lat and fac_lon:
                lat, lon = fac_lat, -abs(fac_lon)
        # A small number of facilities (confirmed live: 106/65k, ~0.16%)
        # carry genuinely malformed source coordinates (e.g. a literal
        # "1111111" placeholder) that convert to impossible lat/lon --
        # bounded to a real US-territory box (15-72N covers PR to
        # northern AK, -180 to -65W covers Guam's antimeridian wrap to
        # PR) rather than trusting every conversion blindly.
        if lat is not None and lon is not None and 15 <= lat <= 72 and -180 <= lon <= -65:
            registry[trifd] = [lat, lon]

    print(f"Real tri_facility registry: {len(registry)}/{total} facilities have usable coordinates.", file=sys.stderr)
    cache_file.write_text(json.dumps(registry))
    return registry


def facilities_reporting_in_year(year):
    cache_file = REPORTING_CACHE / f"{year}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    total = fetch_count("tri_reporting_form", year)
    print(f"  {year}: {total} real reporting_form rows to fetch (parallel chunks)...", file=sys.stderr)
    header, rows = fetch_chunks_parallel("tri_reporting_form", total, year=year)
    idx = header.index("tri_facility_id")
    facility_ids = sorted({row[idx] for row in rows if len(row) > idx and row[idx]})

    cache_file.write_text(json.dumps(facility_ids))
    return facility_ids


def haversine_miles(lat1, lon1, lat2, lon2):
    r = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())
    registry = build_facility_registry()

    counts_by_year_city = {}
    for year in YEARS:
        facility_ids = facilities_reporting_in_year(year)
        coords = [tuple(registry[fid]) for fid in facility_ids if fid in registry]
        by_city = {}
        for city in cities:
            count = sum(1 for lat, lon in coords if haversine_miles(city["lat"], city["lon"], lat, lon) <= RADIUS_MILES)
            by_city[city["id"]] = count
        counts_by_year_city[year] = by_city
        print(f"{year}: {len(facility_ids)} real reporting facilities, {len(coords)} with known coordinates", file=sys.stderr)

    records = {}
    for city in cities:
        years_data = {}
        for year in YEARS:
            count = counts_by_year_city[year][city["id"]]
            years_data[str(year)] = {"facility_count": count, "score": round(min(100.0, (count / COUNT_CAP) * 100.0), 1)}
        records[city["id"]] = {"years": years_data}

    records["_meta"] = {
        "source": "EPA Envirofacts REST API (tri_facility + tri_reporting_form tables), real reporting years 1987-2024",
        "source_url": "https://data.epa.gov/efservice/tri_reporting_form/reporting_year/{YEAR}/rows/{start}:{end}/CSV",
        "radius_miles": RADIUS_MILES,
        "count_cap_for_100_score": COUNT_CAP,
        "years": YEARS,
        "coverage": len(records),
    }

    (ROOT / "data/tri-facility-density.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/tri-facility-density.json: {len(records)}/{len(cities)} cities.", file=sys.stderr)

    counts_2024 = sorted(counts_by_year_city[2024].values())
    print(f"2024 facility count range: min={counts_2024[0]} median={counts_2024[len(counts_2024)//2]} max={counts_2024[-1]}", file=sys.stderr)


if __name__ == "__main__":
    main()
