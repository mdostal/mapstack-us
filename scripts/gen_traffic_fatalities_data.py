#!/usr/bin/env python3
"""
Builds the tenth real dataset: traffic-fatality risk, sourced from County
Health Rankings & Roadmaps' free, keyless national CSV
(countyhealthrankings.org/sites/default/files/media/document/analytic_data2025_v3.csv),
NOT NHTSA's own FARS CrashViewer API -- that API sits behind the same
Akamai edge-gateway that blocked automated requests to fema.gov/hazards.fema.gov
earlier this session (verified directly: crashviewer.nhtsa.dot.gov returns a
403 "Access Denied" to a plain curl, same failure shape). CHR republishes the
real underlying source (NCHS Mortality Files / National Vital Statistics
System, the same system FARS data ultimately feeds) as a clean county-level
CSV, no key, no login -- and its `v039_rawvalue` column is already a
population-normalized rate (deaths per 100,000), so no separate FARS
crash-record aggregation or population lookup is needed at all.

Reuses the SAME city->county crosswalk hazard.ts's build already produced
(data/raw/city-county-fips.json, from geocode_city_counties.py) -- zero new
geocoding, matching health.ts's/svi.ts's "reuse the existing crosswalk"
posture.

Real, honest coverage gap: CHR suppresses (blanks) `v039_rawvalue` for any
county with FEWER THAN 10 motor-vehicle deaths across the whole 2017-2023
window -- mostly small, rural counties, exactly the ones where a single-digit
count would be statistically unstable to publish. For those, this script
falls back to the county's STATE-level average (CHR ships one, `countycode
== "000"`) rather than a fabricated county number, explicitly recorded as
`fallback: "state"` in the per-city record so the UI can be honest about it
(same posture as care-access's/food-access's real fallback-tier patterns).

Source: County Health Rankings & Roadmaps, 2025 Annual Data Release --
Motor Vehicle Crash Deaths measure (v039), a 7-year rolling average
(2017-2023, most recent update Nov 2025), sourced from NCHS Mortality Files
+ Census Population Estimates via NVSS.
https://www.countyhealthrankings.org/health-data/community-conditions/social-and-economic-factors/safety-and-social-support/motor-vehicle-crash-deaths
"""
import csv
import io
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_FILE = ROOT / "data/raw/traffic-cache/chr-analytic-data-2025.csv"
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
        raw = row[idx["v039_rawvalue"]]
        numerator = row[idx["v039_numerator"]]
        rate = round(float(raw), 1) if raw.strip() else None
        deaths = round(float(numerator)) if numerator.strip() else None

        if row[idx["countycode"]] == "000":
            by_state_abbrev[state] = rate
        elif fips and rate is not None:
            by_county_fips[fips] = {"rate": rate, "deaths": deaths}

    return by_county_fips, by_state_abbrev


def percentile_ranks(values_by_id):
    """0-100 concern score: percentile rank among covered cities, higher
    real rate = more concerning = higher percentile. Same convention as
    crime.ts/hazard.ts/every other percentile-based dataset this session."""
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    return {cid: round(i / max(n - 1, 1) * 100, 1) for i, cid in enumerate(ids_sorted)}


def main():
    by_county_fips, by_state_abbrev = load_chr_rows()
    print(f"Loaded {len(by_county_fips)} counties, {len(by_state_abbrev)} states from CHR.", file=sys.stderr)

    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    rates = {}
    meta_by_city = {}
    unmatched = []
    for city in cities:
        cid = city["id"]
        fips_info = city_county.get(cid)
        if not fips_info:
            unmatched.append(cid)
            continue

        county = by_county_fips.get(fips_info["stcofips"])
        if county:
            rates[cid] = county["rate"]
            meta_by_city[cid] = {
                "rate_per_100k": county["rate"],
                "deaths_2017_2023": county["deaths"],
                "county": fips_info["county_name"],
                "fallback": None,
            }
            continue

        state_rate = by_state_abbrev.get(city["state"])
        if state_rate is not None:
            rates[cid] = state_rate
            meta_by_city[cid] = {
                "rate_per_100k": state_rate,
                "deaths_2017_2023": None,
                "county": fips_info["county_name"],
                "fallback": "state",
            }
        else:
            unmatched.append(cid)

    concern = percentile_ranks(rates)
    records = {cid: {**meta_by_city[cid], "concern": concern[cid]} for cid in rates}

    result = {
        "_meta": {
            "source": "County Health Rankings & Roadmaps, 2025 Annual Data Release -- Motor Vehicle Crash Deaths (v039), 2017-2023 average",
            "source_url": "https://www.countyhealthrankings.org/health-data/community-conditions/social-and-economic-factors/safety-and-social-support/motor-vehicle-crash-deaths",
            "underlying_source": "NCHS Mortality Files + Census Population Estimates Program, via NVSS",
            "resolution": "county (state fallback for suppressed small counties)",
        },
        **records,
    }
    (ROOT / "data/traffic-fatalities.json").write_text(json.dumps(result, indent=2))
    fallback_count = sum(1 for r in records.values() if r["fallback"] == "state")
    print(
        f"Wrote data/traffic-fatalities.json: {len(records)}/{len(cities)} cities matched "
        f"({fallback_count} via state fallback).",
        file=sys.stderr,
    )
    if unmatched:
        print(f"Unmatched: {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
