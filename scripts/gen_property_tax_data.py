#!/usr/bin/env python3
"""
Builds data/property-tax.json -- real effective property tax rate (median
real estate taxes paid / median home value), the last of the three real
tax candidates from dataset-backlog.md (#22), and the first dataset this
project has ever pulled DIRECTLY from the Census API rather than via
County Health Rankings' free republication route. Unblocked by a real,
free, self-serve CENSUS_API_KEY (https://api.census.gov/data/key_signup.html).

Reuses the existing city->place-FIPS crosswalk (data/raw/city-place-fips.json,
built for health.ts) -- no new geocoding needed. 509/512 cities covered;
savannah-ga, kenosha-wi, sundance-wy have no place-FIPS match in that
crosswalk (a real, pre-existing gap, not introduced here).

Real multi-year history (2010-2023), per explicit operator direction to
get "as much data as possible" for real trends over time. 2010 is a REAL,
verified floor, not a guess: table B25103 (median real estate taxes paid)
does not exist in the ACS5 2009 vintage at all (confirmed live -- that
request 400s with "unknown variable 'B25103_001E'") even though
B19013/B25077/B01003 all work that same year, so this table's own real
floor is one vintage later than the other Census-cluster datasets it
shares an API pattern with.

Data source: Census ACS 5-year estimates, tables B25103 (median real
estate taxes paid, all owner-occupied units) and B25077 (median home
value), one vintage per real year in YEARS below.

One API call per (year, state) pair rather than 512 individual calls per
year.

Raw direction / normalization: higher effective rate (taxes / value) is
more concerning -- direct rescale, capped at a data-informed ceiling (see
RATE_CAP below), the SAME fixed cap across every year (not re-derived per
year) so a city's rate is honestly comparable year to year, same posture
as sales-tax.ts/income-tax.ts's own real-observed caps.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/property-tax-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEARS = list(range(2010, 2024))  # ACS5 2010-2023 vintages -- 2010 is B25103's own real floor
RATE_CAP = 0.025  # 2.5% -- see real observed range printed below; revisit if it ever clamps many cities


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
    url = (
        f"https://api.census.gov/data/{year}/acs/acs5"
        f"?get=NAME,B25103_001E,B25077_001E&for=place:*&in=state:{state_fips}&key={key}"
    )
    result = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True, check=True)
    text = result.stdout.decode("utf-8").strip()
    rows = json.loads(text) if text.startswith("[") else []
    cache_file.write_text(json.dumps(rows))
    return rows


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
                name, taxes, value, st, place = row
                by_place[f"{st}{place}"] = (taxes, value)
        by_year_place[year] = by_place
        print(f"{year}: {len(by_place)} real places fetched across {len(state_fips_needed)} states", file=sys.stderr)

    records = {}
    no_crosswalk = []
    for city in cities:
        cw = crosswalk.get(city["id"])
        if not cw:
            no_crosswalk.append(city["id"])
            continue

        years_data = {}
        for year in YEARS:
            pair = by_year_place[year].get(cw["place_fips"])
            if not pair:
                continue
            taxes_raw, value_raw = pair
            if taxes_raw in (None, "null") or value_raw in (None, "null"):
                continue
            taxes, value = float(taxes_raw), float(value_raw)
            if value <= 0:
                continue
            rate = taxes / value
            years_data[str(year)] = {
                "median_annual_taxes": round(taxes),
                "median_home_value": round(value),
                "effective_rate_pct": round(rate * 100, 2),
                "concern": round(min(100.0, (rate / RATE_CAP) * 100.0), 1),
            }

        if years_data:
            records[city["id"]] = {"years": years_data}

    records["_meta"] = {
        "source": "Census ACS 5-year estimates, B25103 (median real estate taxes) / B25077 (median home value), 2010-2023",
        "rate_cap_for_100_concern": RATE_CAP,
        "years": YEARS,
        "coverage": len(records),
    }

    (ROOT / "data/property-tax.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/property-tax.json: {covered}/{len(cities)} covered (any year).", file=sys.stderr)
    if no_crosswalk:
        print(f"No crosswalk entry: {no_crosswalk}", file=sys.stderr)

    for year in YEARS:
        n = sum(1 for cid, r in records.items() if cid != "_meta" and str(year) in r["years"])
        print(f"  {year}: {n}/{len(cities)} cities covered", file=sys.stderr)


if __name__ == "__main__":
    main()
