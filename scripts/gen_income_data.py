#!/usr/bin/env python3
"""
Builds the median-household-income dataset -- the second "Census-cluster"
roadmap item (population, INCOME, broadband, tax, housing) unblocked
without the missing CENSUS_API_KEY. Same discovery as broadband.ts: County
Health Rankings' free national CSV (the same file
traffic-fatalities.ts/broadband.ts already use) republishes real Census
ACS median household income directly, county by county.

Reuses the SAME city->county crosswalk hazard.ts's build already
produced (data/raw/city-county-fips.json) -- zero new geocoding.

Raw direction: LOWER income is MORE concerning -- but unlike broadband's
already-bounded 0-100 percentage, a dollar income figure has no natural
100-point ceiling, so this uses a percentile rank among covered cities,
INVERTED (lower dollar income = higher concern), same convention
housing-inventory.ts/days-on-market.ts already use for their own
unbounded raw quantities.

Source: County Health Rankings & Roadmaps, 2025 Annual Data Release --
Median Household Income measure (v063), sourced from Census ACS 5-year
estimates. https://www.countyhealthrankings.org/health-data/community-conditions/economic-opportunity/median-household-income
"""
import csv
import io
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_FILE = ROOT / "data/raw/income-cache/chr-analytic-data-2025.csv"
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
        raw = row[idx["v063_rawvalue"]]
        income = round(float(raw)) if raw.strip() else None

        if row[idx["countycode"]] == "000":
            by_state_abbrev[state] = income
        elif fips and income is not None:
            by_county_fips[fips] = income

    return by_county_fips, by_state_abbrev


def percentile_ranks_inverted(values_by_id):
    """0-100 concern score: LOWER income = MORE concerning, so the lowest
    income gets the highest percentile. Same convention as
    housing-inventory.ts's/days-on-market.ts's own unbounded raw values."""
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    return {cid: round((n - 1 - i) / max(n - 1, 1) * 100, 1) for i, cid in enumerate(ids_sorted)}


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

        income = by_county_fips.get(fips_info["stcofips"])
        fallback = None
        if income is None:
            income = by_state_abbrev.get(city["state"])
            fallback = "state"
        if income is None:
            unmatched.append(cid)
            continue

        records[cid] = {"median_income": income, "county": fips_info["county_name"], "fallback": fallback}

    concern = percentile_ranks_inverted({cid: r["median_income"] for cid, r in records.items()})
    for cid in records:
        records[cid]["concern"] = concern[cid]

    result = {
        "_meta": {
            "source": "County Health Rankings & Roadmaps, 2025 Annual Data Release -- Median Household Income (v063), Census ACS 5-year estimates",
            "source_url": "https://www.countyhealthrankings.org/health-data/community-conditions/economic-opportunity/median-household-income",
            "underlying_source": "Census American Community Survey (ACS) 5-year estimates",
            "resolution": "county (state fallback for suppressed small counties)",
        },
        **records,
    }
    (ROOT / "data/income.json").write_text(json.dumps(result, indent=2))
    fallback_count = sum(1 for r in records.values() if r["fallback"] == "state")
    print(
        f"Wrote data/income.json: {len(records)}/{len(cities)} cities matched "
        f"({fallback_count} via state fallback).",
        file=sys.stderr,
    )
    if unmatched:
        print(f"Unmatched: {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
