#!/usr/bin/env python3
"""
Builds data/business-density.json -- real business establishment density,
dvd-6 (dataset-verification-drive epic, addendum #30). Pivoted here after
EPA TRI (#29) turned out impractically slow to bulk-fetch live (see the
backlog addendum's "UPDATE (dvd-6 attempt)" note).

Source: Census Business Patterns (CBP) via api.census.gov, reusing the
existing CENSUS_API_KEY -- no new credential needed. CBP has NO
place-level geography at all (confirmed live via .../cbp/geography.json),
only county and coarser -- so this is county-level only, the same
fallback tier unemployment.ts/cost-of-living.ts already use, but with no
city-level tier above it this time.

Normalizes ESTAB (establishment count) by real county population (Census
ACS B01003) to get establishments per 1,000 residents -- raw
establishment counts alone would just reflect county size, not business
density.

Real multi-year history (2009-2023), per explicit operator direction to
get "as much data as possible" for real trends over time. CBP's own
ESTAB field goes back to 1986, but the real floor here is bounded by the
ACS5 population denominator: B01003 at county level is confirmed live to
work from the 2009 vintage (ACS5's first-ever window) -- no real
population denominator exists before that to normalize against. The
`NAME` field is dropped from both requests (unused downstream, and
confirmed not to exist in CBP vintages before 2012 -- see
average-wage.ts's identical fix).

Raw direction: LOWER business density is MORE concerning (fewer local
businesses per capita reads as reduced local economic activity) --
percentile-ranked AMONG THAT YEAR'S OWN covered cities and inverted, the
same per-year convention crime.ts's multi-year layers use -- not
comparable across years, same real caveat.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/business-density-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEARS = list(range(2009, 2024))


def census_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("CENSUS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("CENSUS_API_KEY not found in .env")


def fetch(url, cache_name, retries=4):
    """A run this size (2 endpoints x 15 years x 47 states) will hit an
    occasional transient network timeout -- retry with backoff instead of
    letting one blip kill a multi-hour run. Every successful response is
    cached to disk before this returns, so a retry never redoes completed
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

    density_by_year_county = {}
    for year in YEARS:
        estab_by_county = {}
        pop_by_county = {}
        for state_fips in state_fips_needed:
            cbp_rows = fetch(
                f"https://api.census.gov/data/{year}/cbp?get=ESTAB&for=county:*&in=state:{state_fips}&key={key}",
                f"cbp-{year}-state-{state_fips}",
            )
            for row in cbp_rows[1:] if cbp_rows and cbp_rows[0][0] == "ESTAB" else cbp_rows:
                estab, st, county = row
                # Defensive zfill -- see average-wage.ts's own real, confirmed-live
                # bug: some CBP vintages return UN-padded state/county FIPS digits
                # ("6" instead of "06"), which silently breaks this join for
                # leading-zero states. This dataset's own real 2009-2023 output
                # showed no anomalous single-year coverage dip (unlike
                # average-wage's 1986-2023 range, which caught it), but padding
                # defensively costs nothing and removes the risk for any future
                # re-run against an earlier vintage.
                estab_by_county[f"{st.zfill(2)}{county.zfill(3)}"] = int(estab)

            acs_rows = fetch(
                f"https://api.census.gov/data/{year}/acs/acs5?get=B01003_001E&for=county:*&in=state:{state_fips}&key={key}",
                f"acs-pop-{year}-state-{state_fips}",
            )
            for row in acs_rows[1:] if acs_rows and acs_rows[0][0] == "B01003_001E" else acs_rows:
                pop, st, county = row
                if pop not in (None, "null"):
                    pop_by_county[f"{st.zfill(2)}{county.zfill(3)}"] = float(pop)

        density_by_county = {}
        for stcofips, estab in estab_by_county.items():
            pop = pop_by_county.get(stcofips)
            if pop and pop > 0:
                density_by_county[stcofips] = (estab / pop) * 1000
        density_by_year_county[year] = density_by_county
        print(f"{year}: {len(density_by_county)} real counties fetched across {len(state_fips_needed)} states", file=sys.stderr)

    raw_by_year = {}
    for year in YEARS:
        raw_by_year[year] = {}
        for city in cities:
            fips_info = city_county.get(city["id"])
            if not fips_info:
                continue
            density = density_by_year_county[year].get(fips_info["stcofips"])
            if density is not None:
                raw_by_year[year][city["id"]] = density

    concern_by_year = {year: percentile_ranks_inverted(raw_by_year[year]) for year in YEARS}

    records = {}
    for city in cities:
        years_data = {}
        for year in YEARS:
            density = raw_by_year[year].get(city["id"])
            if density is None:
                continue
            years_data[str(year)] = {"establishments_per_1000": round(density, 2), "concern": concern_by_year[year][city["id"]]}
        if years_data:
            records[city["id"]] = {"years": years_data}

    records["_meta"] = {
        "source": f"Census Business Patterns (ESTAB) normalized by Census ACS 5-year population (B01003), {YEARS[0]}-{YEARS[-1]}",
        "resolution": "county (CBP has no place-level geography)",
        "years": YEARS,
        "coverage": len(records),
    }
    (ROOT / "data/business-density.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/business-density.json: {covered}/{len(cities)} cities matched (any year).", file=sys.stderr)
    for year in YEARS:
        n = len(raw_by_year[year])
        print(f"  {year}: {n}/{len(cities)} cities covered", file=sys.stderr)


if __name__ == "__main__":
    main()
