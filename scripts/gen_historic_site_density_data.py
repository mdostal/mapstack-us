#!/usr/bin/env python3
"""
Builds data/historic-site-density.json -- real density of National Register
of Historic Places (NRHP)-listed sites within 10 miles of each city,
ddr10-1 (data-drive-round-10 epic). Source: the real, live, keyless NPS
ArcGIS FeatureServer (mapservices.nps.gov/arcgis/rest/services/cultural_
resources/nrhp_locations/MapServer/0), 72,668 real listed resources
nationally.

A first for this session's radius-join pattern: the server itself supports
a spatial distance query (geometryType=esriGeometryPoint&distance=10&
units=esriSRUnit_StatuteMile&spatialRel=esriSpatialRelIntersects&
returnCountOnly=true), so this returns an exact per-city count directly --
no bulk download, no local haversine. The source's own City/State field is
unreliable (confirmed live: City='NEW YORK' AND State='NY' -> count=0)
so this radius join is required, not optional.

Direction: fewer nearby historic sites is MORE concerning (an "access"-
style framing, per parks.ts/library-access.ts/transit-access.ts) --
inverted direct rescale, capped at a data-informed ceiling (see the real
60-city percentile check documented in
.pHive/epics/data-drive-round-10/docs/design-discussion.md: p50=57,
p75=110, p90=289, p95=585, p99=637).
"""
import concurrent.futures
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/historic-site-density-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "https://mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer/0/query"
COUNT_CAP = 290  # real p90 from a 60-city sample -- see design-discussion.md
MAX_WORKERS = 8
RETRIES = 4


def fetch_count(lat, lon, retries=RETRIES):
    url = (
        f"{BASE_URL}?geometry={lon},{lat}&geometryType=esriGeometryPoint&inSR=4326"
        "&distance=10&units=esriSRUnit_StatuteMile&spatialRel=esriSpatialRelIntersects"
        "&returnCountOnly=true&f=json"
    )
    last_err = None
    for attempt in range(retries):
        try:
            out = subprocess.run(
                ["curl", "-s", "--max-time", "20", url],
                capture_output=True,
                text=True,
                timeout=25,
                check=True,
            )
            data = json.loads(out.stdout)
            if "count" in data:
                return data["count"]
            last_err = data
        except Exception as e:
            last_err = e
        time.sleep(2**attempt)
    raise RuntimeError(f"Failed to fetch count for ({lat},{lon}) after {retries} retries: {last_err}")


def fetch_city(city):
    cid = city["id"]
    cache_file = CACHE_DIR / f"{cid}.json"
    if cache_file.exists():
        return cid, json.loads(cache_file.read_text())["count"]
    count = fetch_count(city["lat"], city["lon"])
    cache_file.write_text(json.dumps({"count": count}))
    return cid, count


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(fetch_city, city): city["id"] for city in cities}
        done = 0
        for fut in concurrent.futures.as_completed(futures):
            cid = futures[fut]
            try:
                cid_out, count = fut.result()
                results[cid_out] = count
            except Exception as e:
                print(f"FAILED {cid}: {e}", file=sys.stderr)
            done += 1
            if done % 50 == 0:
                print(f"{done}/{len(cities)} fetched...", file=sys.stderr)

    records = {}
    for city in cities:
        cid = city["id"]
        if cid not in results:
            continue
        count = results[cid]
        concern = round(100.0 * (1.0 - min(count, COUNT_CAP) / COUNT_CAP), 1)
        records[cid] = {
            "count_within_10mi": count,
            "concern": concern,
        }

    covered = len(records)
    result = {
        "_meta": {
            "source": "NPS National Register of Historic Places (NRHP), sites within 10mi via ArcGIS spatial radius query",
            "count_cap_for_0_concern": COUNT_CAP,
            "coverage": covered,
        },
        **records,
    }
    (ROOT / "data/historic-site-density.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/historic-site-density.json: {covered}/{len(cities)} cities matched.", file=sys.stderr)

    counts = sorted(r["count_within_10mi"] for r in records.values())
    if counts:
        n = len(counts)
        pcts = {p: counts[min(int(n * p / 100), n - 1)] for p in [50, 75, 90, 95, 99]}
        zero = sum(1 for c in counts if c == 0)
        print(f"count distribution: min={counts[0]} {pcts} max={counts[-1]}; {zero} cities with zero sites within 10mi", file=sys.stderr)


if __name__ == "__main__":
    main()
