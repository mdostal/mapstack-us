#!/usr/bin/env python3
"""
Builds data/drought.json -- real county-level drought severity, extended
to real multi-year history 2000-2026 (this session's unplanned "keep
going" continuation, after severe-weather and air-quality). Source: the
real US Drought Monitor (USDM) data service (usdmdataservices.unl.edu), a
joint NOAA/USDA/University of Nebraska-Lincoln product. No API key
required. See git history for the original single-snapshot version.

USDM's own real weekly records begin 2000-01-04 -- the real start of the
Drought Monitor program itself, not a project-side limitation. Unlike
severe-weather/air-quality, this needed no per-year fetch loop: the API
takes a real date RANGE and returns every real weekly row within it in
one response, so this fetches each of the spine's ~480 unique counties
ONCE across the full real 2000-2026 range (not once per county per year).

Real value: the annual AVERAGE of USDM's own weekly `D2` column (% of the
county's area in Severe Drought or worse) across every real week
published within that calendar year -- a real annual severity measure,
smoother and more representative than picking one arbitrary week.
Already a natively 0-100-bounded percentage, no rescale needed, higher =
more concerning, comparable year to year without a cap.

A real, confirmed-live surprise: USDM's own FIPS-coded boundary layer
already reflects Connecticut's 2022 planning-region transition, and
matches consistently across the ENTIRE real 2000-2026 history -- USDM
appears to have retroactively recomputed historical CT percentages
against its current (post-2022) boundary set. This means CT cities join
cleanly via the existing FIPS crosswalk with no fallback needed, unlike
several other datasets this session that had to special-case CT's
transition.
"""
import csv
import io
import json
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/drought-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

START_DATE = "1/1/2000"
END_DATE = "12/31/2026"


def fetch_county(stcofips):
    cache_file = CACHE_DIR / f"{stcofips}_full.csv"
    if cache_file.exists():
        return cache_file.read_text()
    url = (
        "https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent"
        f"?aoi={stcofips}&startdate={START_DATE}&enddate={END_DATE}&statisticsType=1"
    )
    result = subprocess.run(["curl", "-s", "--max-time", "60", url], capture_output=True, check=True)
    text = result.stdout.decode("utf-8", errors="replace")
    cache_file.write_text(text)
    return text


def yearly_averages(csv_text):
    reader = csv.DictReader(io.StringIO(csv_text))
    by_year = defaultdict(list)
    for row in reader:
        year = row["MapDate"][:4]
        try:
            by_year[year].append(float(row["D2"]))
        except (KeyError, ValueError):
            continue
    return {year: (round(sum(vals) / len(vals), 1), len(vals)) for year, vals in by_year.items()}


def main():
    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    unique_counties = sorted({fips["stcofips"] for fips in city_county.values()})
    print(f"Fetching real full-history drought data for {len(unique_counties)} unique counties...", file=sys.stderr)

    county_years = {}
    for i, stcofips in enumerate(unique_counties):
        text = fetch_county(stcofips)
        county_years[stcofips] = yearly_averages(text)
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
        years_data = county_years.get(fips_info["stcofips"], {})
        if not years_data:
            unmatched.append(cid)
            continue
        records[cid] = {
            "county": fips_info["county_name"],
            "years": {
                year: {"severe_drought_pct": pct, "weeks": weeks}
                for year, (pct, weeks) in sorted(years_data.items())
            },
        }

    all_years = sorted({y for r in records.values() for y in r["years"]})
    covered = len(records)
    result = {
        **records,
        "_meta": {
            "source": "US Drought Monitor (usdmdataservices.unl.edu), county-level D2 (Severe Drought or worse) percentage",
            "source_url": "https://usdmdataservices.unl.edu",
            "resolution": "county",
            "metric": "annual average of real weekly D2 percentage",
            "years": [int(y) for y in all_years],
            "coverage": covered,
        },
    }
    (ROOT / "data/drought.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/drought.json: {covered}/{len(cities)} cities matched (any year), years {all_years[0]}-{all_years[-1]}.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched ({len(unmatched)}): {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
