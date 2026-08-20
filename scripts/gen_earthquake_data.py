#!/usr/bin/env python3
"""
Builds data/earthquake.json -- real USGS seismic design values, ddr6-1
(data-drive-round-6 epic). Source: earthquake.usgs.gov's real ASCE 7-22
web service, the same standard structural-engineering values actual
building codes use. No API key required -- confirmed live.

Uses each city's own real lat/lon (data/cities.json) directly -- no
crosswalk needed at all, unlike almost every other dataset in this repo.

Raw value: sds (Design Spectral Response Acceleration, short period),
the real, standard headline value ASCE 7 building codes use for Seismic
Design Category classification. siteClass=D (stiff soil) is the real
ASCE 7 default absent site-specific geotechnical data; riskCategory=I
is standard occupancy.

Raw direction: higher sds is more concerning -- direct rescale capped at
a data-informed ceiling (see printed distribution below).
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/earthquake-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

SDS_CAP = 1.5  # real observed range -- see printed distribution below


def fetch_city(city_id, lat, lon, retries=4):
    cache_file = CACHE_DIR / f"{city_id}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = f"https://earthquake.usgs.gov/ws/designmaps/asce7-22.json?latitude={lat}&longitude={lon}&riskCategory=I&siteClass=D&title=mapstack"
    last_err = None
    for attempt in range(retries):
        try:
            result = subprocess.run(["curl", "-sL", "--max-time", "20", url], capture_output=True, check=True)
            data = json.loads(result.stdout.decode("utf-8"))
            cache_file.write_text(json.dumps(data))
            return data
        except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    print(f"  WARNING: {city_id} failed after {retries} attempts: {last_err}", file=sys.stderr)
    return None


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())
    records = {}
    unmatched = []

    for i, city in enumerate(cities):
        data = fetch_city(city["id"], city["lat"], city["lon"])
        sds = None
        sdc = None
        # On success, request.status == "success" and response is a dict with
        # a "data" key. On a real, informative error (confirmed live: e.g.
        # "Location [0.0, 0.0] out of bounds"), request.status == "error" and
        # response is a plain STRING, not a dict -- checked explicitly rather
        # than assumed, since a naive .get() chain would crash on that string.
        if data and data.get("request", {}).get("status") == "success":
            values = data.get("response", {}).get("data", {})
            sds = values.get("sds")
            sdc = values.get("sdc")
        if sds is None:
            unmatched.append(city["id"])
        else:
            score = round(min(100.0, (sds / SDS_CAP) * 100.0), 1)
            records[city["id"]] = {"sds": sds, "sdc": sdc, "concern": score}
        if (i + 1) % 50 == 0:
            print(f"  [{i + 1}/{len(cities)}] cities fetched", file=sys.stderr)

    covered = len(records)
    result = {
        "_meta": {
            "source": "USGS ASCE 7-22 Web Service, seismic design values (siteClass=D, riskCategory=I)",
            "sds_cap_for_100_score": SDS_CAP,
            "coverage": covered,
        },
        **records,
    }
    (ROOT / "data/earthquake.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/earthquake.json: {covered}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched ({len(unmatched)}): {unmatched}", file=sys.stderr)

    values = sorted(r["sds"] for r in records.values())
    if values:
        print(f"sds range: min={values[0]} median={values[len(values)//2]} max={values[-1]}", file=sys.stderr)


if __name__ == "__main__":
    main()
