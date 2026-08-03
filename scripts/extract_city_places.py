#!/usr/bin/env python3
"""
Step 1 of the health-outcomes dataset build: extract each spine city's
census PLACE GEOID (incorporated place, or Census Designated Place for
unincorporated communities) from the geocoder responses ALREADY cached by
geocode_city_counties.py (data/raw/geocode-cache/*.json) -- the same
Census Geocoder coordinates response used for the hazard (county) and SVI
(tract) datasets also includes "Incorporated Places"/"Census Designated
Places" geography, so this needs ZERO new network calls.

This 7-digit place GEOID (2-digit state FIPS + 5-digit place code) is
exactly CDC PLACES' own `locationid` join key -- see gen_health_data.py.

Writes data/raw/city-place-fips.json: {city_id: {place_fips, place_name}}.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/geocode-cache"


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())
    out = {}
    missing = []

    for city in cities:
        cache_file = CACHE_DIR / f"{city['id']}.json"
        if not cache_file.exists():
            missing.append(city["id"])
            continue
        data = json.loads(cache_file.read_text())
        geos = data.get("result", {}).get("geographies", {})
        places = geos.get("Incorporated Places", []) or geos.get("Census Designated Places", [])
        if not places:
            missing.append(city["id"])
            continue
        p = places[0]
        out[city["id"]] = {"place_fips": p["GEOID"], "place_name": p["BASENAME"]}

    (ROOT / "data/raw/city-place-fips.json").write_text(json.dumps(out, indent=2))
    print(f"Extracted {len(out)}/{len(cities)} cities to a place FIPS (from existing cache, no new fetches).")
    if missing:
        print(f"No place-level geography for {len(missing)} cities (real gap, not a bug): {missing}")


if __name__ == "__main__":
    main()
