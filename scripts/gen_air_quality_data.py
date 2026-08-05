#!/usr/bin/env python3
"""
Builds data/air-quality.json -- real current-conditions Air Quality Index
(dataset-backlog.md #6), from EPA AirNow, unblocked by a real, free,
self-serve EPA_AIRNOW_API_KEY (https://docs.airnowapi.org). Uses AirNow's
lat/lon current-observation endpoint rather than the historical AQS Data
Mart API the backlog originally scoped -- confirmed live and simpler
(no separate monitor-crosswalk step; AirNow resolves nearest-reporting-
area server-side given a distance radius).

Real direction / normalization: AQI is already a 0-500+ concern-oriented
scale (EPA's own categories: 0-50 Good, 51-100 Moderate, 101-150
Unhealthy for Sensitive Groups, 151-200 Unhealthy, 201-300 Very
Unhealthy, 301+ Hazardous) -- direct rescale, no percentile needed. Each
location can report both PM2.5 and Ozone; this uses the WORSE (max) of
the two, matching AQI's own official convention of reporting the single
highest pollutant sub-index for a location/day.

City-level feasibility is real but genuinely thinner in remote areas --
AirNow only has real monitors to draw from, and its own distance-radius
search returns nothing at all for spine towns far from any reporting
area (a real, honest null, not defaulted to "Good").
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/air-quality-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

DISTANCE_MILES = 50
AQI_CAP = 150.0  # see real observed range printed below
MAX_RETRIES = 5
RETRY_SLEEP_SECONDS = 15


def airnow_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("EPA_AIRNOW_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("EPA_AIRNOW_API_KEY not found in .env")


def fetch_city(city_id, lat, lon, key):
    cache_file = CACHE_DIR / f"{city_id}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    url = (
        f"https://www.airnowapi.org/aq/observation/latLong/current/"
        f"?format=application/json&latitude={lat}&longitude={lon}"
        f"&distance={DISTANCE_MILES}&API_KEY={key}"
    )
    for attempt in range(MAX_RETRIES):
        result = subprocess.run(["curl", "-s", "--max-time", "20", url], capture_output=True, check=True)
        text = result.stdout.decode("utf-8").strip()
        # A real bug found live: AirNow's rate-limit error is a JSON OBJECT
        # ({"WebServiceError": [...]}), not a list -- an early version of
        # this script treated ANY non-list response as "no monitor nearby"
        # and cached it as a permanent empty result, silently mislabeling
        # 53 real rate-limited requests (including dense-monitor cities
        # like Irvine/Santa Ana in the LA basin) as genuine coverage gaps.
        # Real "no monitor nearby" responses are a real empty list `[]`,
        # never an object -- only THAT gets cached.
        if text.startswith("["):
            rows = json.loads(text)
            cache_file.write_text(json.dumps(rows))
            return rows
        if "request limit exceeded" in text.lower() or "WebServiceError" in text:
            print(f"  rate-limited on {city_id}, retry {attempt + 1}/{MAX_RETRIES} in {RETRY_SLEEP_SECONDS}s...", file=sys.stderr)
            time.sleep(RETRY_SLEEP_SECONDS)
            continue
        # Some other unexpected shape -- don't cache, surface it plainly.
        print(f"  unexpected response for {city_id}: {text[:200]}", file=sys.stderr)
        return []
    raise SystemExit(f"Still rate-limited after {MAX_RETRIES} retries on {city_id} -- try again later")


def main():
    key = airnow_key()
    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    no_data = []
    for i, city in enumerate(cities):
        cache_file = CACHE_DIR / f"{city['id']}.json"
        was_cached = cache_file.exists()
        rows = fetch_city(city["id"], city["lat"], city["lon"], key)
        if not was_cached:
            time.sleep(0.4)  # stay under AirNow's burst rate limit -- hit it once already this build
        if not rows:
            no_data.append(city["id"])
            continue

        best = max(rows, key=lambda r: r.get("AQI", -1))
        aqi = best.get("AQI")
        if aqi is None or aqi < 0:
            no_data.append(city["id"])
            continue

        concern = round(min(100.0, (aqi / AQI_CAP) * 100.0), 1)
        records[city["id"]] = {
            "aqi": aqi,
            "parameter": best.get("ParameterName"),
            "category": best.get("Category", {}).get("Name"),
            "reporting_area": best.get("ReportingArea"),
            "date_observed": best.get("DateObserved"),
            "concern": concern,
        }
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(cities)}...", file=sys.stderr)

    records["_meta"] = {
        "source": "EPA AirNow, current-conditions observation (real-time, single build-time snapshot)",
        "distance_miles": DISTANCE_MILES,
        "aqi_cap_for_100_concern": AQI_CAP,
        "coverage": len(records),
    }

    (ROOT / "data/air-quality.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/air-quality.json: {covered}/{len(cities)} covered.", file=sys.stderr)
    if no_data:
        print(f"{len(no_data)} cities with no nearby monitor within {DISTANCE_MILES} miles: {no_data}", file=sys.stderr)

    aqis = sorted(r["aqi"] for cid, r in records.items() if cid != "_meta")
    if aqis:
        print(f"AQI range: min={aqis[0]} median={aqis[len(aqis)//2]} max={aqis[-1]}", file=sys.stderr)
        clamped = sum(1 for a in aqis if a > AQI_CAP)
        print(f"{clamped} cities clamp to 100 concern (AQI above {AQI_CAP})", file=sys.stderr)


if __name__ == "__main__":
    main()
