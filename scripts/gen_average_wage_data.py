#!/usr/bin/env python3
"""
Builds data/average-wage.json -- real average annual wage per employee,
tri-2 (tri-bulk-and-data-drive-2 epic, backlog addendum 2 #31). Reuses
the exact Census Business Patterns pipeline business-density.ts already
proved out -- same API, same CENSUS_API_KEY, same county-level ceiling
(CBP has no place-level geography at all) -- just one more real field
(PAYANN, total annual payroll) from the same request.

Genuinely distinct signal from income.ts (median HOUSEHOLD income --
includes non-wage income, multiple earners per household) and from
business-density.ts (establishment COUNT, not pay level): this is real
average pay PER EMPLOYEE at local businesses.

average_wage = PAYANN (real, in $1,000s per CBP's own units) * 1000 / EMP

Real multi-year history (1986-2023), per explicit operator direction to
get "as much data as possible" for real trends over time. Confirmed
live: CBP has real EMP/PAYANN data back to 1986 (its own real start),
and 2024 isn't published yet (a real HTTP 404, a genuine release-lag
gap, not a bug). The `NAME` field this project's other CBP-sourced
scripts (business-density.ts) request is deliberately DROPPED here --
it's unused downstream anyway, and confirmed live to not exist in CBP
vintages before 2012 (would 400 the whole request for those years).

Raw direction: LOWER average wage is MORE concerning -- percentile-ranked
AMONG THAT YEAR'S OWN covered cities and inverted, the same per-year
convention crime.ts's multi-year layers use -- not comparable across
years, same real caveat.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/average-wage-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEARS = list(range(1986, 2024))  # CBP's own real floor through the latest published vintage


def census_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("CENSUS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("CENSUS_API_KEY not found in .env")


def fetch(url, cache_name, retries=4):
    """A run this size (38 years x 47 states) will hit an occasional
    transient network timeout -- retry with backoff instead of letting
    one blip kill a multi-hour run. Every successful response is cached
    to disk before this returns, so a retry never redoes completed
    work."""
    cache_file = CACHE_DIR / f"{cache_name}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    last_err = None
    for attempt in range(retries):
        try:
            result = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True, check=True)
            text = result.stdout.decode("utf-8").strip()
            rows = json.loads(text) if text.startswith("[") else []
            cache_file.write_text(json.dumps(rows))
            return rows
        except subprocess.CalledProcessError as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2**attempt)
    raise last_err


def percentile_ranks_inverted(values_by_id):
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    return {cid: round((n - 1 - i) / max(n - 1, 1) * 100, 1) for i, cid in enumerate(ids_sorted)}


def main():
    key = census_key()
    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    state_fips_needed = sorted({fips["stcofips"][:2] for fips in city_county.values()})

    wage_by_year_county = {}
    for year in YEARS:
        wage_by_county = {}
        for state_fips in state_fips_needed:
            cbp_rows = fetch(
                f"https://api.census.gov/data/{year}/cbp?get=EMP,PAYANN&for=county:*&in=state:{state_fips}&key={key}",
                f"cbp-{year}-state-{state_fips}",
            )
            for row in cbp_rows[1:] if cbp_rows and cbp_rows[0][0] == "EMP" else cbp_rows:
                emp, payann, st, county = row
                emp, payann = int(emp), int(payann)
                if emp > 0:
                    # Real, confirmed-live CBP quirk: some vintages (e.g. 1991's
                    # `state`, 1995's `county`) return UN-padded FIPS digits
                    # ("6"/"1" instead of "06"/"001") while most vintages return
                    # them zero-padded -- silently broke the join for every
                    # leading-zero state/county in those specific years until
                    # caught by an implausible single-year coverage dip (1991:
                    # 334/512, 1995: 128/512, vs. ~497/512 in neighboring years).
                    # zfill defensively on every row regardless of the vintage.
                    wage_by_county[f"{st.zfill(2)}{county.zfill(3)}"] = (payann * 1000) / emp
        wage_by_year_county[year] = wage_by_county
        print(f"{year}: {len(wage_by_county)} real counties fetched across {len(state_fips_needed)} states", file=sys.stderr)

    raw_by_year = {}
    for year in YEARS:
        raw_by_year[year] = {}
        for city in cities:
            fips_info = city_county.get(city["id"])
            if not fips_info:
                continue
            wage = wage_by_year_county[year].get(fips_info["stcofips"])
            if wage is not None:
                raw_by_year[year][city["id"]] = wage

    concern_by_year = {year: percentile_ranks_inverted(raw_by_year[year]) for year in YEARS}

    records = {}
    for city in cities:
        years_data = {}
        for year in YEARS:
            wage = raw_by_year[year].get(city["id"])
            if wage is None:
                continue
            years_data[str(year)] = {"average_wage": round(wage), "concern": concern_by_year[year][city["id"]]}
        if years_data:
            records[city["id"]] = {"years": years_data}

    records["_meta"] = {
        "source": f"Census Business Patterns (PAYANN / EMP), {YEARS[0]}-{YEARS[-1]}",
        "resolution": "county (CBP has no place-level geography)",
        "years": YEARS,
        "coverage": len(records),
    }
    (ROOT / "data/average-wage.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/average-wage.json: {covered}/{len(cities)} cities matched (any year).", file=sys.stderr)
    for year in YEARS:
        n = len(raw_by_year[year])
        print(f"  {year}: {n}/{len(cities)} cities covered", file=sys.stderr)


if __name__ == "__main__":
    main()
