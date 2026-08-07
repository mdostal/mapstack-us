#!/usr/bin/env python3
"""
Builds data/drought.json -- real county-level drought severity, ddr3-1
(data-drive-round-3 epic). Source: the real US Drought Monitor (USDM) data
service (usdmdataservices.unl.edu), a joint NOAA/USDA/University of
Nebraska-Lincoln product. No API key required -- confirmed live.

Reuses the existing city->county crosswalk (data/raw/city-county-fips.json)
unchanged -- no new geocoding. The API takes a real 5-digit county FIPS
directly as its `aoi` parameter; state-level and national aoi values were
tried live and return empty responses, so this is one request per unique
county (~480 for this spine), not a batchable-by-state fetch like the
Census-sourced scripts.

Raw value: the real `D2` column (% of the county's area in Severe Drought
or worse, USDM's own nested D0-D4 classification) from the most recent
available week -- already a natively 0-100-bounded percentage, direct
mapping, no rescale needed. Higher = more concerning.
"""
import csv
import io
import json
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/drought-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

LOOKBACK_DAYS = 14  # USDM publishes weekly; a 14-day window always catches the latest release


def fetch_county(stcofips, start_str, end_str):
    cache_file = CACHE_DIR / f"{stcofips}.csv"
    if cache_file.exists():
        return cache_file.read_text()
    url = (
        "https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent"
        f"?aoi={stcofips}&startdate={start_str}&enddate={end_str}&statisticsType=1"
    )
    result = subprocess.run(["curl", "-s", "--max-time", "20", url], capture_output=True, check=True)
    text = result.stdout.decode("utf-8", errors="replace")
    cache_file.write_text(text)
    return text


def latest_d2(csv_text):
    reader = csv.DictReader(io.StringIO(csv_text))
    rows = list(reader)
    if not rows:
        return None, None
    latest = max(rows, key=lambda r: r["MapDate"])
    return float(latest["D2"]), latest["MapDate"]


def main():
    today = datetime.now()
    start_str = (today - timedelta(days=LOOKBACK_DAYS)).strftime("%-m/%-d/%Y")
    end_str = today.strftime("%-m/%-d/%Y")

    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    unique_counties = sorted({fips["stcofips"] for fips in city_county.values()})
    print(f"Fetching real drought data for {len(unique_counties)} unique counties...", file=sys.stderr)

    d2_by_county = {}
    date_by_county = {}
    for i, stcofips in enumerate(unique_counties):
        text = fetch_county(stcofips, start_str, end_str)
        d2, map_date = latest_d2(text)
        if d2 is not None:
            d2_by_county[stcofips] = d2
            date_by_county[stcofips] = map_date
        if (i + 1) % 50 == 0:
            print(f"  [{i + 1}/{len(unique_counties)}] counties fetched", file=sys.stderr)

    records = {}
    unmatched = []
    for city in cities:
        cid = city["id"]
        fips_info = city_county.get(cid)
        if not fips_info:
            unmatched.append(cid)
            continue
        d2 = d2_by_county.get(fips_info["stcofips"])
        if d2 is None:
            unmatched.append(cid)
            continue
        records[cid] = {
            "severe_drought_pct": d2,
            "as_of": date_by_county[fips_info["stcofips"]],
            "county": fips_info["county_name"],
        }

    covered = len(records)
    result = {
        "_meta": {
            "source": "US Drought Monitor (usdmdataservices.unl.edu), county-level D2 (Severe Drought or worse) percentage",
            "resolution": "county",
            "coverage": covered,
        },
        **records,
    }
    (ROOT / "data/drought.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/drought.json: {covered}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched ({len(unmatched)}): {unmatched}", file=sys.stderr)

    values = sorted(r["severe_drought_pct"] for r in records.values())
    if values:
        in_severe = sum(1 for v in values if v > 0)
        print(f"D2 range: min={values[0]:.1f} median={values[len(values) // 2]:.1f} max={values[-1]:.1f}; {in_severe} cities with any real D2 coverage", file=sys.stderr)


if __name__ == "__main__":
    main()
