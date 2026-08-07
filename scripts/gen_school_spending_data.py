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

2020 is the latest year with real data (2021 query returns zero rows
live, a real ~5-year release lag -- worse than most datasets in this
repo, disclosed in the methodology doc, not hidden).

District boundaries don't align with county or city boundaries
one-to-one, so this aggregates district-level finance to COUNTY level via
an enrollment-weighted average (sum of total current expenditure across
every district whose real CCD directory record maps to that county,
divided by the sum of their real fall enrollment) -- an honest way to
combine a many-districts-per-county reality into one real per-pupil
number, not an arbitrary pick-one-district shortcut. Reuses the existing
city->county crosswalk (data/raw/city-county-fips.json) unchanged, same
join hazard.ts/unemployment.ts/cost-of-living.ts already use.

Raw direction: per the Dataset interface's hard contract (types.ts).
every dataset's value must be "higher = more concerning". Real education-
finance research broadly treats underfunding (not overfunding) as the
well-established risk to outcomes, the same asymmetry income.ts already
encodes for a different dollar figure -- so LOWER per-pupil spending is
more concerning, using the same percentile-rank-inverted convention
income.ts/housing-inventory.ts/days-on-market.ts already use for their
own unbounded raw quantities.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/school-spending-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEAR = 2020
BASE = "https://educationdata.urban.org/api/v1/school-districts/ccd"

STATE_FIPS = [f"{i:02d}" for i in range(1, 57) if i not in (3, 7, 14, 43, 52)]  # real, valid state/DC FIPS codes


def fetch(endpoint, fips, cache_name):
    cache_file = CACHE_DIR / f"{cache_name}-{fips}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = f"{BASE}/{endpoint}/{YEAR}/?fips={int(fips)}"
    result = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True, check=True)
    data = json.loads(result.stdout.decode("utf-8"))
    rows = data.get("results", [])
    cache_file.write_text(json.dumps(rows))
    return rows


def percentile_ranks_inverted(values_by_id):
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    return {cid: round((n - 1 - i) / max(n - 1, 1) * 100, 1) for i, cid in enumerate(ids_sorted)}


def main():
    county_totals = {}  # stcofips -> {"exp": 0.0, "enroll": 0.0}

    for i, fips in enumerate(STATE_FIPS):
        directory_rows = fetch("directory", fips, "directory")
        finance_rows = fetch("finance", fips, "finance")

        # county_code comes back as a plain integer-as-string, NOT zero-padded --
        # e.g. Los Angeles is "6037", not "06037". Confirmed live: this silently
        # broke the join for every single-leading-zero state (CA, AZ, CO, CT, AR,
        # AL...) until caught by the implausible 341/512 (heavily CA/AZ/CO-
        # clustered) match rate on the first run. zfill(5) to match this repo's
        # crosswalk's zero-padded stcofips convention.
        county_by_leaid = {r["leaid"]: r["county_code"].zfill(5) for r in directory_rows if r.get("county_code")}

        matched = 0
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
            matched += 1

        print(f"[{i + 1}/{len(STATE_FIPS)}] state {fips}: {len(directory_rows)} districts, {matched} matched into county totals", file=sys.stderr)

    per_pupil_by_county = {
        stcofips: round(b["exp"] / b["enroll"]) for stcofips, b in county_totals.items() if b["enroll"] > 0
    }
    print(f"Built real per-pupil spending for {len(per_pupil_by_county)} counties.", file=sys.stderr)

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
        per_pupil = per_pupil_by_county.get(fips_info["stcofips"])
        if per_pupil is None:
            unmatched.append(cid)
            continue
        records[cid] = {"per_pupil_spending": per_pupil, "county": fips_info["county_name"]}

    concern = percentile_ranks_inverted({cid: r["per_pupil_spending"] for cid, r in records.items()})
    for cid in records:
        records[cid]["concern"] = concern[cid]

    result = {
        "_meta": {
            "source": f"Urban Institute Education Data Portal, NCES CCD F-33 school district finance survey, {YEAR}",
            "source_url": "https://educationdata.urban.org/documentation/",
            "resolution": "county (enrollment-weighted average across every district mapped to that county)",
            "coverage": len(records),
        },
        **records,
    }
    (ROOT / "data/school-spending.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/school-spending.json: {len(records)}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched ({len(unmatched)}): {unmatched}", file=sys.stderr)

    values = sorted(r["per_pupil_spending"] for r in records.values())
    if values:
        print(f"per-pupil range: min=${values[0]:,} median=${values[len(values) // 2]:,} max=${values[-1]:,}", file=sys.stderr)


if __name__ == "__main__":
    main()
