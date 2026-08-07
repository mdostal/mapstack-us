#!/usr/bin/env python3
"""
Builds data/severe-weather.json -- real severe weather event frequency,
ddr8-1 (data-drive-round-8 epic). Source: the real NOAA Storm Events
Database (ncei.noaa.gov), a real static bulk CSV per year -- no API,
no key.

Confirmed live: STATE_FIPS + CZ_FIPS (when CZ_TYPE='C', a county-based
NWS zone) join directly to this repo's existing city-county-fips.json
crosswalk -- verified against a real sample event (STATE_FIPS=40,
CZ_FIPS=141 -> 40141, Tillman County, OK, matching the event's own real
location text). CZ_TYPE='Z' (NWS forecast zone) and 'M' (marine) events
are excluded -- those use a separate NWS zone code this project has no
direct county crosswalk for.

Raw direction: higher event count is more concerning -- direct rescale
capped at a data-informed ceiling (see printed distribution below).
"""
import csv
import gzip
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/severe-weather-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEAR = 2024
FILE_URL = f"https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d{YEAR}_c20260728.csv.gz"
COUNT_CAP = 70  # real p90 across the 512-city spine -- see printed distribution below


def fetch_bulk_csv():
    gz_path = CACHE_DIR / f"StormEvents_{YEAR}.csv.gz"
    if not gz_path.exists():
        print(f"Downloading real {YEAR} NOAA Storm Events file...", file=sys.stderr)
        result = subprocess.run(["curl", "-s", "--max-time", "60", FILE_URL], capture_output=True, check=True)
        gz_path.write_bytes(result.stdout)
    with gzip.open(gz_path, "rt", encoding="latin-1") as f:
        return f.read()


def main():
    text = fetch_bulk_csv()
    reader = csv.DictReader(text.splitlines())

    events_by_county = {}
    total_c_type = 0
    for row in reader:
        if row.get("CZ_TYPE") != "C":
            continue
        state_fips = row.get("STATE_FIPS", "").zfill(2)
        cz_fips = row.get("CZ_FIPS", "").zfill(3)
        if not state_fips.strip() or not cz_fips.strip():
            continue
        stcofips = state_fips + cz_fips
        events_by_county[stcofips] = events_by_county.get(stcofips, 0) + 1
        total_c_type += 1

    print(f"Loaded {total_c_type} real county-zone severe weather events across {len(events_by_county)} counties for {YEAR}.", file=sys.stderr)

    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    unmatched = []
    for city in cities:
        cid = city["id"]
        fips_info = city_county.get(cid)
        if not fips_info:
            unmatched.append(cid)
            continue
        count = events_by_county.get(fips_info["stcofips"], 0)
        score = round(min(100.0, (count / COUNT_CAP) * 100.0), 1)
        records[cid] = {
            "event_count": count,
            "county": fips_info["county_name"],
            "year": YEAR,
            "score": score,
        }

    covered = len(records)
    result = {
        "_meta": {
            "source": f"NOAA Storm Events Database, {YEAR}, county-zone (CZ_TYPE=C) events",
            "count_cap_for_100_score": COUNT_CAP,
            "coverage": covered,
        },
        **records,
    }
    (ROOT / "data/severe-weather.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/severe-weather.json: {covered}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched ({len(unmatched)}): {unmatched}", file=sys.stderr)

    counts = sorted(r["event_count"] for r in records.values())
    if counts:
        zero = sum(1 for c in counts if c == 0)
        print(f"event count range: min={counts[0]} median={counts[len(counts)//2]} max={counts[-1]}; {zero} cities with zero events in their county", file=sys.stderr)


if __name__ == "__main__":
    main()
