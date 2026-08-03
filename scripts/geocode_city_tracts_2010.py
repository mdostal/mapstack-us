#!/usr/bin/env python3
"""
A SEPARATE tract crosswalk from extract_city_tracts.py's, needed
specifically for the food-access dataset: USDA's Food Access Research
Atlas (FARA) is keyed by 2010-vintage census tract boundaries, not the
current (2020-vintage) tracts extract_city_tracts.py already has cached
(geocode_city_counties.py's cached responses used the geocoder's default
"Current_Current" vintage). Census tracts get split/merged/renumbered
between the 2010 and 2020 census -- found live: LA's own coordinate
resolves to a DIFFERENT tract GEOID under each vintage
(current: 06037206202 vs 2010: 06037211410), and FARA only recognizes the
2010 one. Silently reusing the current-vintage tract crosswalm here would
have looked like a real data gap (126/512 cities "unmatched") when it was
actually a boundary-vintage mismatch.

Fetches the SAME free, keyless Census Geocoder coordinates endpoint as
geocode_city_counties.py, just with vintage=Census2010_Current instead of
the default. Caches responses separately (data/raw/geocode-2010-cache/)
since they're genuinely different data, not interchangeable with the
current-vintage cache.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/geocode-2010-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def fetch_json(url, retries=4):
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


def geocode_2010_tract(city_id, lon, lat):
    cache_file = CACHE_DIR / f"{city_id}.json"
    if cache_file.exists():
        data = json.loads(cache_file.read_text())
    else:
        url = (
            "https://geocoding.geo.census.gov/geocoder/geographies/coordinates"
            f"?x={lon}&y={lat}&benchmark=Public_AR_Current&vintage=Census2010_Current&format=json"
        )
        data = fetch_json(url)
        cache_file.write_text(json.dumps(data))
        time.sleep(0.2)

    tracts = data.get("result", {}).get("geographies", {}).get("Census Tracts", [])
    if not tracts:
        return None
    t = tracts[0]
    return {"tract_fips": t["GEOID"], "tract_name": t["NAME"]}


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())
    out = {}
    missing = []

    for i, city in enumerate(cities):
        result = geocode_2010_tract(city["id"], city["lon"], city["lat"])
        if result is None:
            missing.append(city["id"])
        else:
            out[city["id"]] = result
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(cities)} geocoded ({len(missing)} misses so far)", file=sys.stderr)

    (ROOT / "data/raw/city-tract-fips-2010.json").write_text(json.dumps(out, indent=2))
    print(f"Geocoded {len(out)}/{len(cities)} cities to a 2010-vintage tract FIPS.", file=sys.stderr)
    if missing:
        print(f"No 2010 tract resolved for {len(missing)} cities: {missing}", file=sys.stderr)


if __name__ == "__main__":
    main()
