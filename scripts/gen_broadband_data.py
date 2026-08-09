#!/usr/bin/env python3
"""
Builds the broadband-access dataset -- one of the explicitly-requested
"Census-cluster" datasets (population, income, BROADBAND, tax, housing)
that sat blocked all session on a missing CENSUS_API_KEY. It turns out
County Health Rankings & Roadmaps already republishes the exact Census
ACS broadband-subscription question (their own "Broadband Access"
measure -- "% of households with a broadband internet subscription of
any type") as a free, keyless national CSV per real annual release, the
SAME source family already used by `scripts/gen_traffic_fatalities_data.py`
for its own, different CHR measure. This delivers real ACS-sourced
broadband coverage WITHOUT needing the blocked Census API key at all --
CHR did the ACS pull, this project only needs the one already-built
county crosswalk.

Extended to real multi-year history (ddr-broadband-extend, this
session): CHR publishes a real annual release back to 2010, but the
Broadband Access measure itself is a real, newer addition -- confirmed
live by searching every year's own real column headers directly: 2010,
2013, 2016, 2018, and 2020's releases have NO broadband measure at all;
**2021 is the real first year it appears**, present in every release
through 2025. The measure's own internal variable code (`v166`) IS
stable across all five of those real years (confirmed live, not
assumed), so no year-by-year label-matching workaround was needed.
Real years shipped: **2021-2025**.

Reuses the SAME city->county crosswalk hazard.ts's build already
produced (data/raw/city-county-fips.json) -- zero new geocoding.

Raw direction: LOWER broadband-subscription rate is MORE concerning --
direct `concern = 100 - pct_with_broadband`, since a subscription rate
is already a meaningful 0-100 quantity (same posture as
traffic-fatalities.ts's/walkability.ts's own externally-meaningful-scale
datasets, not a percentile among just the 512 spine cities).

Source: County Health Rankings & Roadmaps, real annual releases 2021-2025
-- Broadband Access measure (v166), sourced from Census ACS 5-year
estimates. https://www.countyhealthrankings.org/health-data/community-conditions/physical-environment/civic-and-community-resources/broadband-access
"""
import csv
import io
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/broadband-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# Real per-year CHR analytic-data CSV URLs -- read directly off CHR's own
# data-documentation archive page rather than guessed (filename
# conventions drift year to year, e.g. a trailing "_0" or "_v3" that
# isn't predictable). Confirmed live: 2010/2013/2016/2018/2020 exist as
# real files but have no Broadband Access measure at all -- only years
# 2021-2025 (below) carry it.
CHR_URLS = {
    2021: "https://www.countyhealthrankings.org/sites/default/files/media/document/analytic_data2021.csv",
    2022: "https://www.countyhealthrankings.org/sites/default/files/media/document/analytic_data2022.csv",
    2023: "https://www.countyhealthrankings.org/sites/default/files/media/document/analytic_data2023_0.csv",
    2024: "https://www.countyhealthrankings.org/sites/default/files/media/document/analytic_data2024.csv",
    2025: "https://www.countyhealthrankings.org/sites/default/files/media/document/analytic_data2025_v3.csv",
}
YEARS = sorted(CHR_URLS)


def fetch_csv(year) -> str:
    cache_file = CACHE_DIR / f"chr-analytic-data-{year}.csv"
    if cache_file.exists():
        return cache_file.read_text()
    result = subprocess.run(
        ["curl", "-s", "--max-time", "60", "-A", USER_AGENT, CHR_URLS[year]],
        capture_output=True,
        check=True,
    )
    text = result.stdout.decode("utf-8")
    cache_file.write_text(text)
    return text


def load_chr_rows(year):
    reader = csv.reader(io.StringIO(fetch_csv(year)))
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
    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    for city in cities:
        cid = city["id"]
        fips_info = city_county.get(cid)
        if fips_info:
            records[cid] = {"county": fips_info["county_name"], "years": {}}

    for year in YEARS:
        by_county_fips, by_state_abbrev = load_chr_rows(year)
        print(f"{year}: {len(by_county_fips)} counties, {len(by_state_abbrev)} states from CHR", file=sys.stderr)

        for city in cities:
            cid = city["id"]
            if cid not in records:
                continue
            fips_info = city_county[cid]

            pct = by_county_fips.get(fips_info["stcofips"])
            fallback = None
            if pct is None:
                pct = by_state_abbrev.get(city["state"])
                fallback = "state"
            if pct is None:
                continue

            records[cid]["years"][str(year)] = {
                "pct_broadband": pct,
                "fallback": fallback,
                "concern": round(max(0.0, min(100.0, 100 - pct)), 1),
            }

    records = {cid: r for cid, r in records.items() if r["years"]}

    records["_meta"] = {
        "source": "County Health Rankings & Roadmaps, real annual releases 2021-2025 -- Broadband Access (v166), Census ACS 5-year estimates",
        "source_url": "https://www.countyhealthrankings.org/health-data/community-conditions/physical-environment/civic-and-community-resources/broadband-access",
        "underlying_source": "Census American Community Survey (ACS) 5-year estimates",
        "resolution": "county (state fallback for suppressed small counties)",
        "years": YEARS,
        "coverage": len(records),
    }
    (ROOT / "data/broadband.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/broadband.json: {len(records)}/{len(cities)} cities matched (any year).", file=sys.stderr)


if __name__ == "__main__":
    main()
