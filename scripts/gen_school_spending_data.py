#!/usr/bin/env python3
"""
Builds data/school-spending.json -- real per-pupil school district
spending, dvd-5 (dataset-verification-drive epic, addendum #28). Upgrades
dataset-backlog.md #21 (school quality) from "weak, proxy-only" (rating
services like GreatSchools/Niche aren't real measured data) to a real,
direct government-finance number.

Source: Urban Institute Education Data Portal API
(https://educationdata.urban.org/documentation/), built on NCES Common
Core of Data (CCD) F-33 school district finance survey. No API key
required -- confirmed live and free.

Real multi-year history (1994-2020), per explicit operator direction to
get "as much data as possible" for real trends over time. Both ends
verified live: 1993 returns zero real rows (a real floor, not a fetch
bug) and 1994 returns 711 real district records for NY alone; 2021+
returns zero real rows (the same ~5-year release lag the original
single-year build already disclosed).

District boundaries don't align with county or city boundaries
one-to-one, so this aggregates district-level finance to COUNTY level via
an enrollment-weighted average (sum of total current expenditure across
every district whose real CCD directory record maps to that county,
divided by the sum of their real fall enrollment) -- an honest way to
combine a many-districts-per-county reality into one real per-pupil
number, not an arbitrary pick-one-district shortcut, computed
independently per year (district-to-county mappings are refetched every
year since real district boundaries/consolidations do shift over
decades). Reuses the existing city->county crosswalk
(data/raw/city-county-fips.json) unchanged.

Raw direction: per the Dataset interface's hard contract (types.ts),
every dataset's value must be "higher = more concerning". Real education-
finance research broadly treats underfunding (not overfunding) as the
well-established risk to outcomes, the same asymmetry income.ts already
encodes for a different dollar figure -- so LOWER per-pupil spending is
more concerning, using the same per-year percentile-rank-inverted
convention crime.ts's multi-year layers use -- not comparable across
years, same real caveat.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/school-spending-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEARS = list(range(1994, 2021))
BASE = "https://educationdata.urban.org/api/v1/school-districts/ccd"

STATE_FIPS = [f"{i:02d}" for i in range(1, 57) if i not in (3, 7, 14, 43, 52)]  # real, valid state/DC FIPS codes


def fetch(endpoint, year, fips, cache_name, retries=4):
    """A run this size (2 endpoints x 27 years x 51 states) will hit an
    occasional transient network timeout -- retry with backoff instead of
    letting one blip kill a multi-hour run. Every successful response is
    cached to disk before this returns, so a retry (or a later full
    re-run) never redoes completed work."""
    cache_file = CACHE_DIR / f"{cache_name}-{year}-{fips}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = f"{BASE}/{endpoint}/{year}/?fips={int(fips)}"
    last_err = None
    for attempt in range(retries):
        try:
            result = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True, check=True)
            data = json.loads(result.stdout.decode("utf-8"))
            rows = data.get("results", [])
            cache_file.write_text(json.dumps(rows))
            return rows
        except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2**attempt)
    raise last_err


def percentile_ranks_inverted(values_by_id):
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    return {cid: round((n - 1 - i) / max(n - 1, 1) * 100, 1) for i, cid in enumerate(ids_sorted)}


def main():
    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    per_pupil_by_year_county = {}
    for year in YEARS:
        county_totals = {}  # stcofips -> {"exp": 0.0, "enroll": 0.0}
        for fips in STATE_FIPS:
            directory_rows = fetch("directory", year, fips, "directory")
            finance_rows = fetch("finance", year, fips, "finance")

            # county_code comes back as a plain integer-as-string, NOT zero-padded
            # (e.g. Los Angeles is "6037", not "06037") -- zfill(5) to match this
            # repo's crosswalk's zero-padded stcofips convention, the same real
            # bug the original single-year build found and fixed.
            county_by_leaid = {r["leaid"]: r["county_code"].zfill(5) for r in directory_rows if r.get("county_code")}

            for row in finance_rows:
                leaid = row.get("leaid")
                stcofips = county_by_leaid.get(leaid)
                exp_total = row.get("exp_total")
                enrollment = row.get("enrollment_fall_responsible") or row.get("enrollment_fall_school")
                if not stcofips or exp_total is None or not enrollment or enrollment <= 0 or exp_total <= 0:
                    continue
                bucket = county_totals.setdefault(stcofips, {"exp": 0.0, "enroll": 0.0})
                bucket["exp"] += float(exp_total)
                bucket["enroll"] += float(enrollment)

        per_pupil_by_county = {
            stcofips: round(b["exp"] / b["enroll"]) for stcofips, b in county_totals.items() if b["enroll"] > 0
        }
        per_pupil_by_year_county[year] = per_pupil_by_county
        print(f"{year}: real per-pupil spending built for {len(per_pupil_by_county)} counties", file=sys.stderr)

    raw_by_year = {}
    for year in YEARS:
        raw_by_year[year] = {}
        for city in cities:
            fips_info = city_county.get(city["id"])
            if not fips_info:
                continue
            per_pupil = per_pupil_by_year_county[year].get(fips_info["stcofips"])
            if per_pupil is not None:
                raw_by_year[year][city["id"]] = per_pupil

    concern_by_year = {year: percentile_ranks_inverted(raw_by_year[year]) for year in YEARS}

    records = {}
    for city in cities:
        years_data = {}
        for year in YEARS:
            per_pupil = raw_by_year[year].get(city["id"])
            if per_pupil is None:
                continue
            years_data[str(year)] = {"per_pupil_spending": per_pupil, "concern": concern_by_year[year][city["id"]]}
        if years_data:
            records[city["id"]] = {"years": years_data}

    records["_meta"] = {
        "source": f"Urban Institute Education Data Portal, NCES CCD F-33 school district finance survey, {YEARS[0]}-{YEARS[-1]}",
        "source_url": "https://educationdata.urban.org/documentation/",
        "resolution": "county (enrollment-weighted average across every district mapped to that county)",
        "years": YEARS,
        "coverage": len(records),
    }
    (ROOT / "data/school-spending.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/school-spending.json: {covered}/{len(cities)} cities matched (any year).", file=sys.stderr)
    for year in YEARS:
        n = len(raw_by_year[year])
        print(f"  {year}: {n}/{len(cities)} cities covered", file=sys.stderr)


if __name__ == "__main__":
    main()
