#!/usr/bin/env python3
"""
Builds the median-household-income dataset -- the second "Census-cluster"
roadmap item (population, INCOME, broadband, tax, housing).

Real multi-year history (2009-2023), per explicit operator direction to
get "as much data as possible" for real trends over time. This required
switching sources: County Health Rankings (the original source) only
republishes the CURRENT release, with no real historical archive -- so
this now pulls DIRECTLY from the Census API instead, table B19013_001E
(median household income), the same place-level pattern
property-tax.ts's script already uses (city->place-FIPS crosswalk,
data/raw/city-place-fips.json). 2009 is B19013's own real floor: it's the
FIRST-EVER ACS5 vintage (the 2005-2009 window), confirmed live -- the
table simply doesn't exist before that, not a fetch gap.

Real, deliberate geography change alongside the year extension: the
original CHR-sourced build was COUNTY-level with a state-level fallback
for suppressed small counties. This direct-Census, place-level pull is a
real precision improvement (a city's own place boundary, not its whole
county) and reuses the exact crosswalk/pattern already proven for
property-tax.ts -- but it does NOT carry over the old state-fallback
mechanism, so real coverage may differ from the prior county-level build;
see the printed coverage count.

Raw direction: LOWER income is MORE concerning -- but unlike broadband's
already-bounded 0-100 percentage, a dollar income figure has no natural
100-point ceiling, so this uses a percentile rank AMONG THAT YEAR'S OWN
covered cities, INVERTED (lower dollar income = higher concern), same
convention crime.ts's percentile-per-year approach uses -- not comparable
across years, same real caveat.

One API call per (year, state) pair.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/income-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEARS = list(range(2009, 2024))  # ACS5 2009 (first-ever vintage) through 2023


def census_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("CENSUS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("CENSUS_API_KEY not found in .env")


def fetch_state_year(state_fips, year, key):
    cache_file = CACHE_DIR / f"state-{state_fips}-{year}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = f"https://api.census.gov/data/{year}/acs/acs5?get=NAME,B19013_001E&for=place:*&in=state:{state_fips}&key={key}"
    result = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True, check=True)
    text = result.stdout.decode("utf-8").strip()
    rows = json.loads(text) if text.startswith("[") else []
    cache_file.write_text(json.dumps(rows))
    return rows


def percentile_ranks_inverted(values_by_id):
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    return {cid: round((n - 1 - i) / max(n - 1, 1) * 100, 1) for i, cid in enumerate(ids_sorted)}


def main():
    key = census_key()
    crosswalk = json.loads((ROOT / "data/raw/city-place-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    state_fips_needed = sorted({crosswalk[c["id"]]["place_fips"][:2] for c in cities if c["id"] in crosswalk})

    by_year_place = {}
    for year in YEARS:
        by_place = {}
        for state_fips in state_fips_needed:
            rows = fetch_state_year(state_fips, year, key)
            for row in rows[1:] if rows and rows[0][0] == "NAME" else rows:
                name, income, st, place = row
                if income not in (None, "null"):
                    by_place[f"{st}{place}"] = float(income)
        by_year_place[year] = by_place
        print(f"{year}: {len(by_place)} real places fetched across {len(state_fips_needed)} states", file=sys.stderr)

    raw_by_year = {}
    for year in YEARS:
        raw_by_year[year] = {}
        for city in cities:
            cw = crosswalk.get(city["id"])
            if not cw:
                continue
            income = by_year_place[year].get(cw["place_fips"])
            if income is not None:
                raw_by_year[year][city["id"]] = income

    concern_by_year = {year: percentile_ranks_inverted(raw_by_year[year]) for year in YEARS}

    records = {}
    for city in cities:
        years_data = {}
        for year in YEARS:
            income = raw_by_year[year].get(city["id"])
            if income is None:
                continue
            years_data[str(year)] = {"median_income": round(income), "concern": concern_by_year[year][city["id"]]}
        if years_data:
            records[city["id"]] = {"years": years_data}

    records["_meta"] = {
        "source": "Census ACS 5-year estimates, B19013_001E (median household income), 2009-2023, direct place-level pull",
        "years": YEARS,
        "coverage": len(records),
    }

    (ROOT / "data/income.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/income.json: {covered}/{len(cities)} covered (any year).", file=sys.stderr)
    for year in YEARS:
        n = len(raw_by_year[year])
        print(f"  {year}: {n}/{len(cities)} cities covered", file=sys.stderr)


if __name__ == "__main__":
    main()
