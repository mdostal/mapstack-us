#!/usr/bin/env python3
"""
Step 1 of the natural-hazard-risk dataset build: resolve each spine city's
already-known lat/lon (data/cities.json) to its real county FIPS code, via
the Census Bureau's free, keyless Geocoder API
(https://geocoding.geo.census.gov/geocoder/geographies/coordinates) -- a
different, keyless service from the Census statistical data API
(api.census.gov, which needs CENSUS_API_KEY and is unrelated/unused here).

The county FIPS (STCOFIPS, e.g. "36061") is the join key the FEMA National
Risk Index reports by -- see gen_hazard_data.py. Caches each city's raw
geocoder response to data/raw/geocode-cache/ so re-runs don't re-hit the
API.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/geocode-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def fetch_json(url, retries=4):
    # subprocess to curl, not urllib -- same reasoning as
    # fetch_crime_agencies.py: this machine's Python.org build doesn't pick
    # up the system CA bundle. Retries with backoff for the occasional
    # transient timeout across ~500 sequential requests.
    last_err = None
    for attempt in range(retries):
        try:
            result = subprocess.run(
                ["curl", "-s", "--max-time", "30", url], capture_output=True, text=True, check=True
            )
            return json.loads(result.stdout)
        except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    raise last_err


def geocode_county(city_id, lon, lat):
    cache_file = CACHE_DIR / f"{city_id}.json"
    if cache_file.exists():
        data = json.loads(cache_file.read_text())
    else:
        url = (
            "https://geocoding.geo.census.gov/geocoder/geographies/coordinates"
            f"?x={lon}&y={lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json"
        )
        data = fetch_json(url)
        cache_file.write_text(json.dumps(data))
        time.sleep(0.2)

    counties = data.get("result", {}).get("geographies", {}).get("Counties", [])
    if not counties:
        return None
    c = counties[0]
    return {"stcofips": c["GEOID"], "county_name": c["BASENAME"], "county_state_fips": c["STATE"]}


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())
    out = {}
    missing = []

    for i, city in enumerate(cities):
        result = geocode_county(city["id"], city["lon"], city["lat"])
        if result is None:
            missing.append(city["id"])
        else:
            out[city["id"]] = result
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(cities)} geocoded ({len(missing)} misses so far)", file=sys.stderr)

    (ROOT / "data/raw/city-county-fips.json").write_text(json.dumps(out, indent=2))
    print(f"Geocoded {len(out)}/{len(cities)} cities to a county FIPS.", file=sys.stderr)
    if missing:
        print(f"No county resolved for {len(missing)} cities: {missing}", file=sys.stderr)


if __name__ == "__main__":
    main()
