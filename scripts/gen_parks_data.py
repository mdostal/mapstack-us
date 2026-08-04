#!/usr/bin/env python3
"""
Builds the park-access dataset: queries the Trust for Public Land's free,
keyless ParkServe "Place" ArcGIS FeatureServer directly at each spine
city's stored coordinate (server7.tplgis.org/.../ParkServe_ProdNew/
FeatureServer/1) -- the SAME hosted-FeatureServer point-query pattern
hazard.ts, transit-access.ts, and walkability.ts already use, which again
sidesteps the "needs real GIS work" objection the dataset backlog
research assumed this candidate required
(.pHive/epics/data-store/docs/dataset-backlog.md #17).

The backlog's research found TPL's headline ParkScore product only ranks
the 100 largest cities, and assumed the full-coverage ParkServe database
would need Mapstack to derive its own "% of population within a 10-minute
walk of a park" metric from raw park-polygon/population-grid geometry --
"GIS work beyond anything crime.ts needed." That turned out to be
avoidable too: TPL's own ParkServe Place layer ALREADY publishes the two
aggregate sums needed (`total_pop`, the place's total population, and
`sum_totpopsvca`, the population living within a park's 10-minute walk
service area) -- TPL has already done the population-weighted spatial
overlay; this script only needs one division per city, not raw polygon
math. (The layer's own `percserved2022` field, which appears to be the
literal pre-computed percentage, was found to be uniformly null across
every city tested -- a real, apparently-deprecated field in this service
-- so this script computes the percentage itself from the two raw sums,
which ARE populated, rather than relying on that field.)

Raw direction: LOWER percent-served is MORE concerning -- direct
`concern = 100 - pct_served`, since percent-of-population-served is
already a meaningful 0-100 quantity (same posture walkability.ts/
hazard.ts take with an externally meaningful scale, rather than a
percentile among just the 512 spine cities).

A real coordinate-precision gap, already seen and fixed the same way for
transit-access.ts's Urban Area crosswalk: an exact 0-buffer point query
misses a real minority of cities (confirmed: Santa Monica CA, Charleston
SC, Miami Beach FL, Kenosha WI) whose `data/cities.json` 2-decimal-place
coordinate lands just outside their own (often narrow/coastal) place
polygon. Fixed the same way -- a 3km search buffer, preferring whichever
candidate place's name matches the spine city's own name when the buffer
returns more than one.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/parks-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

QUERY_URL = "https://server7.tplgis.org/arcgis7/rest/services/ParkServe/ParkServe_ProdNew/FeatureServer/1/query"
BUFFER_METERS = 3000


def fetch_place(lat, lon, buffer_m=0, retries=4):
    buffer_params = f"&distance={buffer_m}&units=esriSRUnit_Meter" if buffer_m else ""
    url = (
        f"{QUERY_URL}?geometry={lon},{lat}&geometryType=esriGeometryPoint&inSR=4326"
        f"{buffer_params}&spatialRel=esriSpatialRelIntersects&outFields=name,state_name,total_pop,"
        f"sum_totpopsvca,park_count,total_park_acreage&returnGeometry=false&f=json"
    )
    last_err = None
    for attempt in range(retries):
        try:
            result = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True, text=True, check=True)
            return json.loads(result.stdout)
        except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    raise last_err


def pick_best_feature(features, city_name):
    if len(features) == 1:
        return features[0]["attributes"]
    name_lower = city_name.lower()
    for f in features:
        if name_lower in (f["attributes"].get("name") or "").lower():
            return f["attributes"]
    return features[0]["attributes"]


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    no_data = []
    for city in cities:
        cid = city["id"]
        cache_file = CACHE_DIR / f"{cid}.json"
        if cache_file.exists():
            data = json.loads(cache_file.read_text())
        else:
            data = fetch_place(city["lat"], city["lon"])
            if not data.get("features"):
                data = fetch_place(city["lat"], city["lon"], buffer_m=BUFFER_METERS)
            cache_file.write_text(json.dumps(data, indent=2))
            time.sleep(0.2)

        features = data.get("features", [])
        if not features:
            no_data.append(cid)
            continue

        attrs = pick_best_feature(features, city["city"])
        total_pop = attrs.get("total_pop")
        served_pop = attrs.get("sum_totpopsvca")
        if not total_pop or served_pop is None:
            no_data.append(cid)
            continue

        pct_served = min(100.0, served_pop / total_pop * 100)
        records[cid] = {
            "place_name": attrs.get("name"),
            "pct_served": round(pct_served, 1),
            "park_count": attrs.get("park_count"),
            "total_park_acreage": attrs.get("total_park_acreage"),
            "concern": round(100 - pct_served, 1),
        }

    result = {
        "_meta": {
            "source": "Trust for Public Land, ParkServe database, 2024 release -- 10-minute walk service area analysis",
            "source_url": "https://parkserve.tpl.org",
            "resolution": "place (population within a 10-minute walk of a park, computed by TPL)",
        },
        **records,
    }
    (ROOT / "data/parks.json").write_text(json.dumps(result, indent=2))
    print(f"Wrote data/parks.json: {len(records)}/{len(cities)} cities matched.", file=sys.stderr)
    if no_data:
        print(f"No ParkServe place match: {no_data}", file=sys.stderr)


if __name__ == "__main__":
    main()
