#!/usr/bin/env python3
"""
Builds the walkability dataset: queries the EPA's free, keyless "National
Walkability Index" ArcGIS FeatureServer directly at each spine city's
stored coordinate (geodata.epa.gov/arcgis/rest/services/OA/WalkabilityIndex/
MapServer/0 -- the same "hosted, queryable FeatureServer instead of a
Cloudflare/Akamai-gated bulk-download page or local GDAL/shapefile
processing" pattern hazard.ts's FEMA NRI fetch and transit-access.ts's
Urban Area crosswalk both already use), rather than downloading EPA's raw
block-group shapefile and doing local GIS aggregation -- the dataset
backlog's own research (`.pHive/epics/data-store/docs/dataset-backlog.md`
#16) assumed the latter was required ("Large effort... genuinely needs
polygon/GIS tooling") and flagged this candidate as too heavy to build.
A direct point query against EPA's own hosted service sidesteps that
entirely: the exact same query shape already proven for FEMA NRI and
Census Urban Areas this session.

The National Walkability Index (NatWalkInd) is EPA's own official,
already-computed 1-20 scale (1 = least walkable, 20 = most walkable),
published at census-BLOCK-GROUP resolution -- one query per city returns
the walkability score for the SPECIFIC block group containing that city's
stored coordinate, not a population-weighted aggregate across the city's
full area (a real, documented simplification -- the same "one point, one
number" posture hazard.ts already takes at county level, here at a finer
but still single-point granularity).

Raw direction: LOWER walkability is MORE concerning -- linearly rescaled
from EPA's own fixed 1-20 range onto 0-100 (concern = (20 - NatWalkInd) /
19 * 100), not a percentile among just the 512 spine cities, since EPA's
scale is already a meaningful, externally-defined range (same posture
hazard.ts takes with FEMA's own 0-100 Risk Index Score, rather than
crime.ts's percentile-among-covered-cities approach, which is used when
no externally meaningful scale exists).
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/walkability-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

QUERY_URL = "https://geodata.epa.gov/arcgis/rest/services/OA/WalkabilityIndex/MapServer/0/query"


def fetch_walkability(lat, lon, retries=4):
    url = (
        f"{QUERY_URL}?geometry={lon},{lat}&geometryType=esriGeometryPoint&inSR=4326"
        f"&spatialRel=esriSpatialRelIntersects&outFields=GEOID20,NatWalkInd,CBSA_Name"
        f"&returnGeometry=false&f=json"
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
            data = fetch_walkability(city["lat"], city["lon"])
            cache_file.write_text(json.dumps(data, indent=2))
            time.sleep(0.2)

        features = data.get("features", [])
        if not features:
            no_data.append(cid)
            continue

        attrs = features[0]["attributes"]
        nat_walk_ind = attrs.get("NatWalkInd")
        if nat_walk_ind is None:
            no_data.append(cid)
            continue

        concern = round((20 - nat_walk_ind) / 19 * 100, 1)
        concern = max(0.0, min(100.0, concern))
        records[cid] = {
            "nat_walk_ind": round(nat_walk_ind, 2),
            "block_group": attrs.get("GEOID20"),
            "cbsa": attrs.get("CBSA_Name"),
            "concern": concern,
        }

    result = {
        "_meta": {
            "source": "EPA National Walkability Index (Smart Location Database), 2021 release",
            "source_url": "https://www.epa.gov/smartgrowth/smart-location-mapping",
            "resolution": "census block group (single point sample at each city's stored coordinate)",
        },
        **records,
    }
    (ROOT / "data/walkability.json").write_text(json.dumps(result, indent=2))
    print(f"Wrote data/walkability.json: {len(records)}/{len(cities)} cities matched.", file=sys.stderr)
    if no_data:
        print(f"No block-group match: {no_data}", file=sys.stderr)


if __name__ == "__main__":
    main()
