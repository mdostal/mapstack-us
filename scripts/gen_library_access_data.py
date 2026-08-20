#!/usr/bin/env python3
"""
Builds data/library-access.json -- real public library access, ddr7-1
(data-drive-round-7 epic), extended to real multi-year history 2007-2024
(ddr-library-extend, this session).

IMLS publishes the Public Libraries Survey (PLS) as a real static bulk
CSV download for EVERY fiscal year back to 1992 -- found by rendering
imls.gov/research-evaluation/surveys/public-libraries-survey-pls with a
real browser (the page is a Drupal site, but the download links are
plain anchors once rendered) and reading off every real per-year URL.
The exact URL naming convention changes across three real eras (no
predictable pattern, so each year's URL below was read directly off the
live page rather than guessed): `pupld{YY}{suffix}_csv.zip` for
2007-2013 (suffix varies year to year, e.g. `11b` not `11a`),
`pls_fy{YEAR}_data_files_csv.zip` for 2014-2018, and a date-prefixed
`{upload-date}/pls_fy{YEAR}_csv.zip` for 2019-2024.

Real floor for the radius-join technique this dataset uses: FY2007. A
live per-year column check found FY2006 and every earlier year's file
lacks LATITUDE/LONGITUD entirely (confirmed: FY2005/FY2006 have no lat
or lon columns at all; FY2007 is the first year that does) -- those
administrative-only years would need the same city/state-name join
already known to fail for 114/512 spine cities (see the original
single-year build's own finding), so 1992-2006 are honestly out of
scope for this join method rather than backfilled with a worse join.

Each year's zip contains multiple CSVs (an outlet/administrative-entity
file, a state-summary file, an "outlying areas" file); rather than
hardcode a filename per year (the inner naming also drifts,
e.g. `pupld10a.csv` vs `pupld07.csv` vs `PLS_FY24_AE_pupld24a.csv`),
this finds the one whose header contains ALL FOUR required columns
(VISITS, POPU_LSA, LATITUDE, LONGITUD together) -- confirmed live this
uniquely identifies the right file every year (the summary/outlying
files only carry some of the four).

Sums real VISITS and POPU_LSA (population of legal service area) across
every library system within a 10-mile radius, per real year, computes
visits per capita.

Raw direction: LOWER visits per capita is MORE concerning -- a public-
good-access framing matching parks.ts/transit-access.ts/walkability.ts's
existing convention. Percentile-ranked and inverted independently PER
YEAR among that year's own covered cities (same convention as
income.ts/crime.ts for unbounded raw quantities) -- not comparable
across years, only within a year.
"""
import csv
import io
import json
import math
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/library-access-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

RADIUS_MILES = 10
REQUIRED_COLUMNS = {"VISITS", "POPU_LSA", "LATITUDE", "LONGITUD"}

# Real per-year URLs, read directly off imls.gov/research-evaluation/surveys/
# public-libraries-survey-pls (rendered live) rather than guessed -- the
# naming convention changes across three real eras with no predictable
# pattern (see module docstring).
ZIP_URLS = {
    2024: "https://www.imls.gov/sites/default/files/2026-06/pls_fy2024_csv.zip",
    2023: "https://www.imls.gov/sites/default/files/2025-08/pls_fy2023_csv.zip",
    2022: "https://www.imls.gov/sites/default/files/2024-06/pls_fy2022_csv.zip",
    2021: "https://www.imls.gov/sites/default/files/2023-06/pls_fy2021_csv.zip",
    2020: "https://www.imls.gov/sites/default/files/2022-07/pls_fy2020_csv.zip",
    2019: "https://www.imls.gov/sites/default/files/2021-05/pls_fy2019_csv.zip",
    2018: "https://www.imls.gov/sites/default/files/pls_fy2018_data_files_csv.zip",
    2017: "https://www.imls.gov/sites/default/files/pls_fy2017_data_files_csv.zip",
    2016: "https://www.imls.gov/sites/default/files/pls_fy2016_data_files_csv.zip",
    2015: "https://www.imls.gov/sites/default/files/pls_fy2015_data_files_csv.zip",
    2014: "https://www.imls.gov/sites/default/files/pls_fy2014_data_files_csv.zip",
    2013: "https://www.imls.gov/sites/default/files/pupld13a_csv.zip",
    2012: "https://www.imls.gov/sites/default/files/pupld12a_csv.zip",
    2011: "https://www.imls.gov/sites/default/files/pupld11b_csv.zip",
    2010: "https://www.imls.gov/sites/default/files/pupld10a_csv.zip",
    2009: "https://www.imls.gov/sites/default/files/pupld09a_csv.zip",
    2008: "https://www.imls.gov/sites/default/files/pupld08a_csv.zip",
    2007: "https://www.imls.gov/sites/default/files/pupld07a_csv.zip",
}
YEARS = sorted(ZIP_URLS)


def fetch_year_zip(year):
    zip_path = CACHE_DIR / f"pls_fy{year}.zip"
    if not zip_path.exists():
        print(f"Downloading real IMLS PLS FY{year} bulk CSV...", file=sys.stderr)
        result = subprocess.run(["curl", "-sL", "--max-time", "90", ZIP_URLS[year]], capture_output=True, check=True)
        zip_path.write_bytes(result.stdout)
    return zip_path


def find_library_csv(zip_path):
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            if not name.lower().endswith(".csv"):
                continue
            with zf.open(name) as f:
                try:
                    header_line = io.TextIOWrapper(f, encoding="latin-1").readline()
                except UnicodeDecodeError:
                    continue
                header = {c.strip() for c in header_line.strip().split(",")}
            if REQUIRED_COLUMNS.issubset(header):
                with zf.open(name) as f:
                    return io.TextIOWrapper(f, encoding="latin-1").read()
    raise SystemExit(f"No CSV with all of {REQUIRED_COLUMNS} found in {zip_path}")


def haversine_miles(lat1, lon1, lat2, lon2):
    r = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def load_library_systems(year):
    zip_path = fetch_year_zip(year)
    text = find_library_csv(zip_path)
    reader = csv.DictReader(io.StringIO(text))
    systems = []
    for row in reader:
        try:
            lat, lon = float(row["LATITUDE"]), float(row["LONGITUD"])
            visits, pop = float(row["VISITS"]), float(row["POPU_LSA"])
        except (ValueError, TypeError, KeyError):
            continue
        if lat == 0 or lon == 0 or visits < 0 or pop <= 0:
            continue
        systems.append((lat, lon, visits, pop))
    return systems


def percentile_ranks_inverted(values_by_id):
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    return {cid: round((n - 1 - i) / max(n - 1, 1) * 100, 1) for i, cid in enumerate(ids_sorted)}


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())

    per_year_records = {}
    for year in YEARS:
        systems = load_library_systems(year)
        year_records = {}
        for city in cities:
            nearby = [s for s in systems if haversine_miles(city["lat"], city["lon"], s[0], s[1]) <= RADIUS_MILES]
            if not nearby:
                continue
            total_visits = sum(s[2] for s in nearby)
            total_pop = sum(s[3] for s in nearby)
            if total_pop <= 0:
                continue
            year_records[city["id"]] = {
                "visits_per_capita": round(total_visits / total_pop, 2),
                "systems_nearby": len(nearby),
            }

        concern = percentile_ranks_inverted({cid: r["visits_per_capita"] for cid, r in year_records.items()})
        for cid in year_records:
            year_records[cid]["concern"] = concern[cid]

        per_year_records[year] = year_records
        print(f"{year}: {len(systems)} real library systems, {len(year_records)}/{len(cities)} cities matched", file=sys.stderr)

    records = {}
    for city in cities:
        years_data = {}
        for year in YEARS:
            if city["id"] in per_year_records[year]:
                years_data[str(year)] = per_year_records[year][city["id"]]
        if years_data:
            records[city["id"]] = {"years": years_data}

    records["_meta"] = {
        "source": "IMLS Public Libraries Survey (PLS), real annual bulk downloads, 10-mile radius join",
        "source_url": "https://www.imls.gov/research-evaluation/surveys/public-libraries-survey-pls",
        "radius_miles": RADIUS_MILES,
        "years": YEARS,
        "coverage": len(records),
    }

    (ROOT / "data/library-access.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/library-access.json: {len(records)}/{len(cities)} cities matched (any year).", file=sys.stderr)

    latest = per_year_records[YEARS[-1]]
    values = sorted(r["visits_per_capita"] for r in latest.values())
    if values:
        print(f"{YEARS[-1]} visits/capita range: min={values[0]:.2f} median={values[len(values)//2]:.2f} max={values[-1]:.2f}", file=sys.stderr)


if __name__ == "__main__":
    main()
