#!/usr/bin/env python3
"""
Builds the housing-cost-burden dataset -- the third "Census-cluster"
roadmap item (population, income, broadband, tax, HOUSING).

Real multi-year history (2009-2023), per explicit operator direction to
get "as much data as possible" for real trends over time. Switched
sources for the same reason income.ts did: County Health Rankings only
republishes the CURRENT release, no real historical archive -- this now
pulls DIRECTLY from the Census API, combining renter and owner severe
cost-burden brackets the same way CHR's own v154 measure does:

  severe burden % = (renters paying >=50% + owners paying >=50%)
                     / (total renters + total owner-occupied units)

Real, verified bracket codes (fetched live from the Census API's own
B25070/B25091 group definitions, not guessed):
  - B25070_010E = renters paying 50.0%+ of income on gross rent
  - B25070_001E = total renter-occupied units
  - B25091_011E = owners WITH a mortgage paying 50.0%+
  - B25091_022E = owners WITHOUT a mortgage paying 50.0%+
  - B25091_001E = total owner-occupied units

2009 is a REAL, verified floor: confirmed live that all 5 of the above
variables exist in the ACS5 2009 vintage (the first-ever ACS5 window,
2005-2009).

Reuses the SAME city->place-FIPS crosswalk property-tax.ts's script
already uses (data/raw/city-place-fips.json) -- a real, deliberate
geography change from the original county-level CHR build to
place-level, the same precision improvement income.ts made alongside its
own year extension. Does NOT carry over the old state-level fallback for
suppressed counties, so real coverage may differ from the prior build.

Raw direction: higher severe-cost-burden percentage is MORE concerning --
already a meaningful 0-100 quantity, used directly as the concern score
(no inversion, no percentile) -- unlike income's unbounded dollar figure,
this IS comparable across years (a real percentage, not a
relative-to-that-year's-cohort rank).
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/housing-cost-burden-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEARS = list(range(2009, 2024))


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
        f"?get=NAME,B25070_010E,B25070_001E,B25091_011E,B25091_022E,B25091_001E"
        f"&for=place:*&in=state:{state_fips}&key={key}"
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
                name, rent50, rent_total, own_mort50, own_nomort50, own_total, st, place = row
                by_place[f"{st}{place}"] = (rent50, rent_total, own_mort50, own_nomort50, own_total)
        by_year_place[year] = by_place
        print(f"{year}: {len(by_place)} real places fetched across {len(state_fips_needed)} states", file=sys.stderr)

    records = {}
    for city in cities:
        cw = crosswalk.get(city["id"])
        if not cw:
            continue

        years_data = {}
        for year in YEARS:
            vals = by_year_place[year].get(cw["place_fips"])
            if not vals:
                continue
            rent50, rent_total, own_mort50, own_nomort50, own_total = vals
            if any(v in (None, "null") for v in vals):
                continue
            rent50, rent_total = float(rent50), float(rent_total)
            own_mort50, own_nomort50, own_total = float(own_mort50), float(own_nomort50), float(own_total)
            denom = rent_total + own_total
            if denom <= 0:
                continue
            severe_burdened = rent50 + own_mort50 + own_nomort50
            pct = round(severe_burdened / denom * 100, 1)
            years_data[str(year)] = {"pct_severe_burden": pct, "concern": pct}

        if years_data:
            records[city["id"]] = {"years": years_data}

    records["_meta"] = {
        "source": "Census ACS 5-year estimates, B25070 (renter gross rent burden) + B25091 (owner cost burden), 2009-2023",
        "method": "severe burden % = (renters >=50% + owners >=50%) / (total renters + total owner-occupied units)",
        "years": YEARS,
        "coverage": len(records),
    }

    (ROOT / "data/housing-cost-burden.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/housing-cost-burden.json: {covered}/{len(cities)} covered (any year).", file=sys.stderr)
    for year in YEARS:
        n = sum(1 for cid, r in records.items() if cid != "_meta" and str(year) in r["years"])
        print(f"  {year}: {n}/{len(cities)} cities covered", file=sys.stderr)


if __name__ == "__main__":
    main()
