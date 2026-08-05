#!/usr/bin/env python3
"""
Nearest-station match for the extreme-heat-days dataset -- NOAA's 1991-2020
U.S. Climate Normals, data type ANN-TMAX-AVGNDS-GRTH090 (average number of
days per year with a max temp above 90F). Free, no API key at all, unlike
every Census-cluster candidate still blocked on CENSUS_API_KEY.

Station inventory: NOAA's live fixed-width inventory file, confirmed by
direct fetch (the old /pub/data/normals/... FTP-era path 404s; the current
path moved under /data/):
  https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/inventory_30yr.txt
15,615 rows: STATION_ID(1-11) LAT(13-20) LON(22-30) ELEV_M(32-37) STATE(39-40)
NAME(42-71) GSN(73-75) HCN/CRN(77-79) WMOID(81-85) -- same fixed-width shape
as classic ghcnd-stations.txt. Not every listed station reports the
temperature normals used here (many are precip/snow-only) -- gen_heat_data.py
handles that as a real per-city null, not assumed here.

For each of the 512 spine cities, finds the nearest station by great-circle
distance (haversine) -- no crosswalk table exists for "city -> weather
station," unlike crime's agency-ORI matching, so nearest-point is the
correct method here, the same one AQI/traffic-fatalities candidates in the
dataset backlog describe for monitor/station matching.

IMPORTANT: the 15,615-row inventory lists every normals station,
including thousands of CoCoRaHS-style precip/snow-only sites
(station IDs like "US1AZMR0071") with NO temperature normals at all --
matching blindly against the full inventory put real cities (Phoenix
included) next to a precip-only station with no ANN-TMAX-AVGNDS-GRTH090
value. Fixed by fetching the real temperature-normals value for EVERY
inventoried station first (data/raw/heat-cache/station-temps.json,
one-time, cached), then matching each city only against stations that
actually returned a value.
"""
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/heat-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
INVENTORY_CACHE = CACHE_DIR / "inventory_30yr.txt"
STATION_TEMPS_CACHE = CACHE_DIR / "station-temps.json"
OUTPUT_FILE = ROOT / "data/raw/heat-station-matches.json"

INVENTORY_URL = "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/inventory_30yr.txt"
API_URL = "https://www.ncei.noaa.gov/access/services/data/v1"
DATASET = "normals-annualseasonal"
DATA_TYPE = "ANN-TMAX-AVGNDS-GRTH090"
BATCH_SIZE = 100


def fetch_inventory() -> str:
    if INVENTORY_CACHE.exists():
        return INVENTORY_CACHE.read_text()
    result = subprocess.run(
        ["curl", "-sL", "--max-time", "60", INVENTORY_URL],
        capture_output=True,
        check=True,
    )
    text = result.stdout.decode("utf-8")
    if len(text.splitlines()) < 1000:
        print(f"ERROR: inventory fetch looks wrong ({len(text.splitlines())} lines)", file=sys.stderr)
        sys.exit(1)
    INVENTORY_CACHE.write_text(text)
    return text


def parse_inventory(text: str):
    stations = []
    for line in text.splitlines():
        if not line.strip():
            continue
        station_id = line[0:11].strip()
        lat = float(line[12:20].strip())
        lon = float(line[21:30].strip())
        name = line[41:71].strip()
        if not station_id:
            continue
        stations.append({"id": station_id, "lat": lat, "lon": lon, "name": name})
    return stations


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def fetch_station_temps(all_station_ids):
    """Real, cached fetch of ANN-TMAX-AVGNDS-GRTH090 for every inventoried
    station -- returns {station_id: days_above_90f} for only the subset
    (~7,300 of 15,615) that actually reports this temperature normal.
    NCEI's API returns the value in TENTHS of a day (Phoenix Sky Harbor's
    "1688" = 168.8 days/year), confirmed by direct inspection against
    Phoenix's well-known climate. -7777 is NOAA's own missing-value
    sentinel and is filtered out, not treated as zero."""
    if STATION_TEMPS_CACHE.exists():
        return json.loads(STATION_TEMPS_CACHE.read_text())

    by_station = {}
    for i in range(0, len(all_station_ids), BATCH_SIZE):
        batch = all_station_ids[i : i + BATCH_SIZE]
        url = (
            f"{API_URL}?dataset={DATASET}&stations={','.join(batch)}"
            f"&startDate=2006-01-01&endDate=2020-12-31&format=json&dataTypes={DATA_TYPE}"
        )
        result = subprocess.run(["curl", "-s", "--max-time", "60", url], capture_output=True, check=True)
        text = result.stdout.decode("utf-8").strip()
        rows = json.loads(text) if text else []
        for row in rows:
            raw = row.get(DATA_TYPE)
            if raw is None or raw == "" or int(raw) < 0:
                continue
            by_station[row["STATION"]] = round(int(raw) / 10.0, 1)
        print(f"  temp batch {i // BATCH_SIZE + 1}/{(len(all_station_ids) + BATCH_SIZE - 1) // BATCH_SIZE}: {len(rows)} rows, {len(by_station)} valid so far", file=sys.stderr)

    STATION_TEMPS_CACHE.write_text(json.dumps(by_station, indent=2, sort_keys=True) + "\n")
    return by_station


def nearest_station(city_lat, city_lon, stations):
    best = None
    best_dist = None
    for s in stations:
        # cheap pre-filter: skip stations way outside a generous bounding box
        # before paying for the full haversine call (15,615 stations x 512
        # cities is fine either way, but this keeps it fast in pure python).
        if abs(s["lat"] - city_lat) > 3 or abs(s["lon"] - city_lon) > 3:
            continue
        d = haversine_km(city_lat, city_lon, s["lat"], s["lon"])
        if best_dist is None or d < best_dist:
            best_dist = d
            best = s
    if best is None:
        # generous bounding box found nothing (rare, remote spine towns) --
        # fall back to a full unfiltered scan rather than returning no match.
        for s in stations:
            d = haversine_km(city_lat, city_lon, s["lat"], s["lon"])
            if best_dist is None or d < best_dist:
                best_dist = d
                best = s
    return best, best_dist


def main():
    all_stations = parse_inventory(fetch_inventory())
    print(f"Loaded {len(all_stations)} NOAA normals stations (all types).", file=sys.stderr)

    station_temps = fetch_station_temps([s["id"] for s in all_stations])
    stations = [s for s in all_stations if s["id"] in station_temps]
    print(f"{len(stations)} stations actually report ANN-TMAX-AVGNDS-GRTH090 -- matching only against these.", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())
    matches = {}
    for city in cities:
        station, dist_km = nearest_station(city["lat"], city["lon"], stations)
        matches[city["id"]] = {
            "station_id": station["id"],
            "station_name": station["name"],
            "distance_km": round(dist_km, 1),
            "days_above_90f": station_temps[station["id"]],
        }

    OUTPUT_FILE.write_text(json.dumps(matches, indent=2, sort_keys=True) + "\n")
    dists = [m["distance_km"] for m in matches.values()]
    print(f"Matched {len(matches)}/{len(cities)} cities. Distance km: min={min(dists):.1f} median={sorted(dists)[len(dists)//2]:.1f} max={max(dists):.1f}", file=sys.stderr)
    far = [c for c, m in matches.items() if m["distance_km"] > 50]
    print(f"{len(far)} cities matched a station over 50km away: {far[:15]}{'...' if len(far) > 15 else ''}", file=sys.stderr)


if __name__ == "__main__":
    main()
