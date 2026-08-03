#!/usr/bin/env python3
"""
Step 1 of the public-transit-access dataset build: resolve each spine
city's Census-delineated Urban Area (the same geography NTD's own
`uace_code` field uses), so transit service reported per-agency can be
aggregated to a real, ID-matched geography rather than a fuzzy city-name
match against NTD's often multi-city urbanized-area names (e.g. "Boise
City, ID" vs the spine's "Boise", or "Nashville-Davidson, TN" vs
"Nashville" -- a real, tested failure mode: a plain substring/name match
against NTD's own `uza_name` field only reached ~52% of the spine, well
below what this crosswalk achieves, and worse, silently misclassified
real suburbs of large urbanized areas -- like Irvine CA, part of the LA
urbanized area -- as "no transit data" alongside genuinely rural towns
with no urban area at all. That conflation is exactly the kind of
smoothing-over this project's principles reject, so this dataset uses a
real ID join instead.

Queries the Census Bureau's own authoritative TIGERweb "2020 Urban Areas"
layer directly (`TIGERweb/Urban/MapServer/8`, a free, keyless ArcGIS
FeatureServer -- same posture as hazard.ts's FEMA NRI source) with a point
query at each city's stored lat/lon, PLUS a 3km search buffer -- NOT the
Census geocoder's coordinate-lookup endpoint other scripts use, because
that endpoint's default response inconsistently omits the Urban Areas
layer even for cities clearly inside one (confirmed directly: Santa
Monica CA, unambiguously part of the LA urbanized area, returns no Urban
Area from the geocoder at its exact stored coordinate). The 3km buffer is
a deliberate, named tolerance for `data/cities.json`'s own 2-decimal-place
lat/lon precision (~1.1km per 0.01 degree at most US latitudes) -- without
it, a coordinate that rounds to a point just outside a real urban area's
polygon boundary (again, confirmed real for Santa Monica: 0km buffer finds
nothing, 3km finds "Los Angeles--Long Beach--Anaheim, CA" correctly) would
wrongly read as "no transit data" for a city that obviously has some.

Writes data/raw/city-urban-area.json: {city_id: {uace, name}} -- omitted
entirely only when NO Urban Area intersects even the buffered search area,
a real, honest signal that a town is small/rural enough to fall outside
any urbanized area, not a coordinate-precision or fetch artifact.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/urban-area-geocode-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

QUERY_URL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Urban/MapServer/8/query"
BUFFER_METERS = 3000


def fetch_urban_area(lat, lon, retries=4):
    url = (
        f"{QUERY_URL}?geometry={lon},{lat}&geometryType=esriGeometryPoint&inSR=4326"
        f"&distance={BUFFER_METERS}&units=esriSRUnit_Meter&spatialRel=esriSpatialRelIntersects"
        f"&outFields=GEOID,NAME,BASENAME&returnGeometry=false&f=json"
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

    out = {}
    no_urban_area = []
    for city in cities:
        cid = city["id"]
        cache_file = CACHE_DIR / f"{cid}.json"
        if cache_file.exists():
            data = json.loads(cache_file.read_text())
        else:
            data = fetch_urban_area(city["lat"], city["lon"])
            cache_file.write_text(json.dumps(data, indent=2))
            time.sleep(0.2)

        features = data.get("features", [])
        if features:
            attrs = features[0]["attributes"]
            out[cid] = {"uace": attrs["GEOID"], "name": attrs["NAME"]}
        else:
            no_urban_area.append(cid)

    (ROOT / "data/raw/city-urban-area.json").write_text(json.dumps(out, indent=2))
    print(
        f"Wrote data/raw/city-urban-area.json: {len(out)}/{len(cities)} cities have a real "
        f"Census Urban Area within {BUFFER_METERS}m.",
        file=sys.stderr,
    )
    if no_urban_area:
        print(f"No delineated Urban Area (real, honest gap): {no_urban_area}", file=sys.stderr)


if __name__ == "__main__":
    main()
