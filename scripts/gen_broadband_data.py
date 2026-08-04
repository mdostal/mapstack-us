#!/usr/bin/env python3
"""
Builds the broadband-access dataset -- one of the explicitly-requested
"Census-cluster" datasets (population, income, BROADBAND, tax, housing)
that sat blocked all session on a missing CENSUS_API_KEY. It turns out
County Health Rankings & Roadmaps already republishes the exact Census
ACS broadband-subscription question (their own "Broadband Access"
measure, v166 -- "% of households with a broadband internet subscription
of any type") as a free, keyless national CSV, the SAME source
(`analytic_data2025_v3.csv`) already used by
`scripts/gen_traffic_fatalities_data.py` for its own, different CHR
measure. This delivers real ACS-sourced broadband coverage WITHOUT
needing the blocked Census API key at all -- CHR did the ACS pull, this
project only needs the one already-built county crosswalk.

Reuses the SAME city->county crosswalk hazard.ts's build already
produced (data/raw/city-county-fips.json) -- zero new geocoding.

Raw direction: LOWER broadband-subscription rate is MORE concerning --
direct `concern = 100 - pct_with_broadband`, since a subscription rate
is already a meaningful 0-100 quantity (same posture as
traffic-fatalities.ts's/walkability.ts's own externally-meaningful-scale
datasets, not a percentile among just the 512 spine cities).

Source: County Health Rankings & Roadmaps, 2025 Annual Data Release --
Broadband Access measure (v166), sourced from Census ACS 5-year
estimates. https://www.countyhealthrankings.org/health-data/community-conditions/physical-environment/civic-and-community-resources/broadband-access
"""
import csv
import io
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_FILE = ROOT / "data/raw/broadband-cache/chr-analytic-data-2025.csv"
CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

CHR_URL = "https://www.countyhealthrankings.org/sites/default/files/media/document/analytic_data2025_v3.csv"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def fetch_csv() -> str:
    if CACHE_FILE.exists():
        return CACHE_FILE.read_text()
    result = subprocess.run(
        ["curl", "-s", "--max-time", "60", "-A", USER_AGENT, CHR_URL],
        capture_output=True,
        check=True,
    )
    text = result.stdout.decode("utf-8")
    CACHE_FILE.write_text(text)
    return text


def load_chr_rows():
    reader = csv.reader(io.StringIO(fetch_csv()))
    next(reader)  # human-readable header row
    codes = next(reader)  # machine variable-code header row
    idx = {name: i for i, name in enumerate(codes)}
    rows = list(reader)

    by_county_fips = {}
    by_state_abbrev = {}
    for row in rows:
        fips = row[idx["fipscode"]]
        state = row[idx["state"]]
        raw = row[idx["v166_rawvalue"]]
        pct = round(float(raw) * 100, 1) if raw.strip() else None

        if row[idx["countycode"]] == "000":
            by_state_abbrev[state] = pct
        elif fips and pct is not None:
            by_county_fips[fips] = pct

    return by_county_fips, by_state_abbrev


def main():
    by_county_fips, by_state_abbrev = load_chr_rows()
    print(f"Loaded {len(by_county_fips)} counties, {len(by_state_abbrev)} states from CHR.", file=sys.stderr)

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

        pct = by_county_fips.get(fips_info["stcofips"])
        fallback = None
        if pct is None:
            pct = by_state_abbrev.get(city["state"])
            fallback = "state"
        if pct is None:
            unmatched.append(cid)
            continue

        records[cid] = {
            "pct_broadband": pct,
            "county": fips_info["county_name"],
            "fallback": fallback,
            "concern": round(max(0.0, min(100.0, 100 - pct)), 1),
        }

    result = {
        "_meta": {
            "source": "County Health Rankings & Roadmaps, 2025 Annual Data Release -- Broadband Access (v166), Census ACS 5-year estimates",
            "source_url": "https://www.countyhealthrankings.org/health-data/community-conditions/physical-environment/civic-and-community-resources/broadband-access",
            "underlying_source": "Census American Community Survey (ACS) 5-year estimates",
            "resolution": "county (state fallback for suppressed small counties)",
        },
        **records,
    }
    (ROOT / "data/broadband.json").write_text(json.dumps(result, indent=2))
    fallback_count = sum(1 for r in records.values() if r["fallback"] == "state")
    print(
        f"Wrote data/broadband.json: {len(records)}/{len(cities)} cities matched "
        f"({fallback_count} via state fallback).",
        file=sys.stderr,
    )
    if unmatched:
        print(f"Unmatched: {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
