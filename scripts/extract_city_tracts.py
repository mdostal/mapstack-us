#!/usr/bin/env python3
"""
Step 1 of the social-vulnerability-index dataset build: extract each spine
city's census TRACT GEOID from the geocoder responses ALREADY cached by
geocode_city_counties.py (data/raw/geocode-cache/*.json) -- the Census
Geocoder's coordinates lookup returns both "Counties" (used for the
hazard-risk dataset) and "Census Tracts" in the same response, so this
needs ZERO new network calls, just a re-parse of data already on disk.

Writes data/raw/city-tract-fips.json: {city_id: {tract_fips, tract_name}}.
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
        tracts = data.get("result", {}).get("geographies", {}).get("Census Tracts", [])
        if not tracts:
            missing.append(city["id"])
            continue
        t = tracts[0]
        out[city["id"]] = {"tract_fips": t["GEOID"], "tract_name": t["NAME"]}

    (ROOT / "data/raw/city-tract-fips.json").write_text(json.dumps(out, indent=2))
    print(f"Extracted {len(out)}/{len(cities)} cities to a tract FIPS (from existing cache, no new fetches).")
    if missing:
        print(f"Missing: {missing}")


if __name__ == "__main__":
    main()
