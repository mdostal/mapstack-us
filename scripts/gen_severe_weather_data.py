#!/usr/bin/env python3
"""
Builds data/severe-weather.json -- real severe weather event frequency,
ddr8-1 (data-drive-round-8 epic), extended to real multi-year history
1950-2026 (ddr-severe-weather-extend, this session). Source: the real
NOAA Storm Events Database (ncei.noaa.gov), a real static bulk CSV per
year -- no API, no key.

Real per-year files were confirmed live via the source's own directory
listing (ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/) -- a
CONTIGUOUS real range, 1950 through 2026 (77 files, no gaps), each named
`StormEvents_details-ftp_v1.0_d{YEAR}_c{PUBLISH_DATE}.csv.gz`. The
`c{PUBLISH_DATE}` suffix (NOAA's own "created/revised" timestamp) is
NOT predictable from the year alone -- most years share one recent
revision date, but several (1984, 2017, 2022, 2024, 2025, 2026) carry a
real, different, more recent revision date, so every year's exact
filename was read directly from the live listing rather than guessed.

A real, disclosed methodology note carried over from the 2024-only
build, now more visible across the full real range: NOAA's OWN tracked
event-type taxonomy expanded over time -- the Storm Events Database
began in 1950 tracking ONLY tornadoes, added thunderstorm wind and hail
in 1955, and didn't expand to its full modern ~50-category taxonomy
until 1996. Real early-decade file sizes are consequently far smaller
(the real 1950 file is ~10KB vs. the real 2024 file's ~13MB) -- a real
reflection of NOAA's own reporting scope at the time, not a gap in this
project's own join.

Confirmed live: STATE_FIPS + CZ_FIPS (when CZ_TYPE='C', a county-based
NWS zone) join directly to this repo's existing city-county-fips.json
crosswalk -- verified against a real sample event (STATE_FIPS=40,
CZ_FIPS=141 -> 40141, Tillman County, OK, matching the event's own real
location text). CZ_TYPE='Z' (NWS forecast zone) and 'M' (marine) events
are excluded -- those use a separate NWS zone code this project has no
direct county crosswalk for.

Raw direction: higher event count is more concerning -- direct rescale,
capped at a FIXED count (70, the real p90 for the 2024 vintage) applied
identically across every year so a city's count stays honestly
comparable year to year, in the same sense every other real-taxonomy-
evolution-affected dataset in this project already discloses (same
posture as crime.ts's own NIBRS-transition caveat).
"""
import csv
import gzip
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/severe-weather-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

COUNT_CAP = 70  # real p90 across the 512-city spine for the 2024 vintage

# Real per-year filenames, read directly off NOAA's own live directory
# listing rather than guessed -- the "c{date}" revision suffix isn't
# predictable from the year alone (see module docstring).
FILE_URLS = {
    1950: "StormEvents_details-ftp_v1.0_d1950_c20260323.csv.gz",
    1951: "StormEvents_details-ftp_v1.0_d1951_c20260323.csv.gz",
    1952: "StormEvents_details-ftp_v1.0_d1952_c20260323.csv.gz",
    1953: "StormEvents_details-ftp_v1.0_d1953_c20260323.csv.gz",
    1954: "StormEvents_details-ftp_v1.0_d1954_c20260323.csv.gz",
    1955: "StormEvents_details-ftp_v1.0_d1955_c20260323.csv.gz",
    1956: "StormEvents_details-ftp_v1.0_d1956_c20260323.csv.gz",
    1957: "StormEvents_details-ftp_v1.0_d1957_c20260323.csv.gz",
    1958: "StormEvents_details-ftp_v1.0_d1958_c20260323.csv.gz",
    1959: "StormEvents_details-ftp_v1.0_d1959_c20260323.csv.gz",
    1960: "StormEvents_details-ftp_v1.0_d1960_c20260323.csv.gz",
    1961: "StormEvents_details-ftp_v1.0_d1961_c20260323.csv.gz",
    1962: "StormEvents_details-ftp_v1.0_d1962_c20260323.csv.gz",
    1963: "StormEvents_details-ftp_v1.0_d1963_c20260323.csv.gz",
    1964: "StormEvents_details-ftp_v1.0_d1964_c20260323.csv.gz",
    1965: "StormEvents_details-ftp_v1.0_d1965_c20260323.csv.gz",
    1966: "StormEvents_details-ftp_v1.0_d1966_c20260323.csv.gz",
    1967: "StormEvents_details-ftp_v1.0_d1967_c20260323.csv.gz",
    1968: "StormEvents_details-ftp_v1.0_d1968_c20260323.csv.gz",
    1969: "StormEvents_details-ftp_v1.0_d1969_c20260323.csv.gz",
    1970: "StormEvents_details-ftp_v1.0_d1970_c20260323.csv.gz",
    1971: "StormEvents_details-ftp_v1.0_d1971_c20260323.csv.gz",
    1972: "StormEvents_details-ftp_v1.0_d1972_c20260323.csv.gz",
    1973: "StormEvents_details-ftp_v1.0_d1973_c20260323.csv.gz",
    1974: "StormEvents_details-ftp_v1.0_d1974_c20260323.csv.gz",
    1975: "StormEvents_details-ftp_v1.0_d1975_c20260323.csv.gz",
    1976: "StormEvents_details-ftp_v1.0_d1976_c20260323.csv.gz",
    1977: "StormEvents_details-ftp_v1.0_d1977_c20260323.csv.gz",
    1978: "StormEvents_details-ftp_v1.0_d1978_c20260323.csv.gz",
    1979: "StormEvents_details-ftp_v1.0_d1979_c20260323.csv.gz",
    1980: "StormEvents_details-ftp_v1.0_d1980_c20260323.csv.gz",
    1981: "StormEvents_details-ftp_v1.0_d1981_c20260323.csv.gz",
    1982: "StormEvents_details-ftp_v1.0_d1982_c20260323.csv.gz",
    1983: "StormEvents_details-ftp_v1.0_d1983_c20260323.csv.gz",
    1984: "StormEvents_details-ftp_v1.0_d1984_c20260527.csv.gz",
    1985: "StormEvents_details-ftp_v1.0_d1985_c20260323.csv.gz",
    1986: "StormEvents_details-ftp_v1.0_d1986_c20260323.csv.gz",
    1987: "StormEvents_details-ftp_v1.0_d1987_c20260323.csv.gz",
    1988: "StormEvents_details-ftp_v1.0_d1988_c20260323.csv.gz",
    1989: "StormEvents_details-ftp_v1.0_d1989_c20260323.csv.gz",
    1990: "StormEvents_details-ftp_v1.0_d1990_c20260323.csv.gz",
    1991: "StormEvents_details-ftp_v1.0_d1991_c20260323.csv.gz",
    1992: "StormEvents_details-ftp_v1.0_d1992_c20260323.csv.gz",
    1993: "StormEvents_details-ftp_v1.0_d1993_c20260323.csv.gz",
    1994: "StormEvents_details-ftp_v1.0_d1994_c20260323.csv.gz",
    1995: "StormEvents_details-ftp_v1.0_d1995_c20260323.csv.gz",
    1996: "StormEvents_details-ftp_v1.0_d1996_c20260323.csv.gz",
    1997: "StormEvents_details-ftp_v1.0_d1997_c20260323.csv.gz",
    1998: "StormEvents_details-ftp_v1.0_d1998_c20260323.csv.gz",
    1999: "StormEvents_details-ftp_v1.0_d1999_c20260323.csv.gz",
    2000: "StormEvents_details-ftp_v1.0_d2000_c20260323.csv.gz",
    2001: "StormEvents_details-ftp_v1.0_d2001_c20260323.csv.gz",
    2002: "StormEvents_details-ftp_v1.0_d2002_c20260323.csv.gz",
    2003: "StormEvents_details-ftp_v1.0_d2003_c20260323.csv.gz",
    2004: "StormEvents_details-ftp_v1.0_d2004_c20260323.csv.gz",
    2005: "StormEvents_details-ftp_v1.0_d2005_c20260323.csv.gz",
    2006: "StormEvents_details-ftp_v1.0_d2006_c20260323.csv.gz",
    2007: "StormEvents_details-ftp_v1.0_d2007_c20260323.csv.gz",
    2008: "StormEvents_details-ftp_v1.0_d2008_c20260323.csv.gz",
    2009: "StormEvents_details-ftp_v1.0_d2009_c20260323.csv.gz",
    2010: "StormEvents_details-ftp_v1.0_d2010_c20260323.csv.gz",
    2011: "StormEvents_details-ftp_v1.0_d2011_c20260323.csv.gz",
    2012: "StormEvents_details-ftp_v1.0_d2012_c20260323.csv.gz",
    2013: "StormEvents_details-ftp_v1.0_d2013_c20260323.csv.gz",
    2014: "StormEvents_details-ftp_v1.0_d2014_c20260323.csv.gz",
    2015: "StormEvents_details-ftp_v1.0_d2015_c20260323.csv.gz",
    2016: "StormEvents_details-ftp_v1.0_d2016_c20260323.csv.gz",
    2017: "StormEvents_details-ftp_v1.0_d2017_c20260519.csv.gz",
    2018: "StormEvents_details-ftp_v1.0_d2018_c20260323.csv.gz",
    2019: "StormEvents_details-ftp_v1.0_d2019_c20260323.csv.gz",
    2020: "StormEvents_details-ftp_v1.0_d2020_c20260323.csv.gz",
    2021: "StormEvents_details-ftp_v1.0_d2021_c20260323.csv.gz",
    2022: "StormEvents_details-ftp_v1.0_d2022_c20260625.csv.gz",
    2023: "StormEvents_details-ftp_v1.0_d2023_c20260323.csv.gz",
    2024: "StormEvents_details-ftp_v1.0_d2024_c20260728.csv.gz",
    2025: "StormEvents_details-ftp_v1.0_d2025_c20260728.csv.gz",
    2026: "StormEvents_details-ftp_v1.0_d2026_c20260728.csv.gz",
}
YEARS = sorted(FILE_URLS)
BASE = "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/"


def fetch_bulk_csv(year):
    gz_path = CACHE_DIR / f"StormEvents_{year}.csv.gz"
    if not gz_path.exists():
        url = BASE + FILE_URLS[year]
        print(f"Downloading real {year} NOAA Storm Events file...", file=sys.stderr)
        result = subprocess.run(["curl", "-s", "--max-time", "120", url], capture_output=True, check=True)
        gz_path.write_bytes(result.stdout)
    with gzip.open(gz_path, "rt", encoding="latin-1") as f:
        return f.read()


def events_by_county_for_year(year):
    text = fetch_bulk_csv(year)
    reader = csv.DictReader(text.splitlines())

    events_by_county = {}
    max_month = 0
    for row in reader:
        # Real per-year completeness signal, found necessary by this
        # project's own QA sweep: NOAA's current-year file is published
        # incrementally, so the in-progress year's real file can genuinely
        # only cover a few months so far (2026's real file, at the time of
        # this build, has events only through April) -- computed here from
        # the file's own real BEGIN_YEARMONTH values, not assumed from the
        # calendar, since a "final" past-year file always has max_month=12.
        ym = row.get("BEGIN_YEARMONTH", "")
        if len(ym) == 6 and ym[4:6].isdigit():
            max_month = max(max_month, int(ym[4:6]))

        if row.get("CZ_TYPE") != "C":
            continue
        state_fips = row.get("STATE_FIPS", "").zfill(2)
        cz_fips = row.get("CZ_FIPS", "").zfill(3)
        if not state_fips.strip() or not cz_fips.strip():
            continue
        stcofips = state_fips + cz_fips
        events_by_county[stcofips] = events_by_county.get(stcofips, 0) + 1
    return events_by_county, max_month


def main():
    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    per_year_records = {}
    for year in YEARS:
        events_by_county, months_covered = events_by_county_for_year(year)
        year_records = {}
        for city in cities:
            cid = city["id"]
            fips_info = city_county.get(cid)
            if not fips_info:
                continue
            count = events_by_county.get(fips_info["stcofips"], 0)
            score = round(min(100.0, (count / COUNT_CAP) * 100.0), 1)
            year_records[cid] = {"event_count": count, "score": score, "months_covered": months_covered}
        per_year_records[year] = year_records
        print(f"{year}: {sum(events_by_county.values())} real county-zone events across {len(events_by_county)} counties, {len(year_records)}/{len(cities)} cities matched, real data through month {months_covered}", file=sys.stderr)

    records = {}
    for city in cities:
        cid = city["id"]
        fips_info = city_county.get(cid)
        if not fips_info:
            continue
        years_data = {}
        for year in YEARS:
            if cid in per_year_records[year]:
                years_data[str(year)] = per_year_records[year][cid]
        if years_data:
            records[cid] = {"county": fips_info["county_name"], "years": years_data}

    records["_meta"] = {
        "source": "NOAA Storm Events Database, real annual bulk files, county-zone (CZ_TYPE=C) events",
        "source_url": "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/",
        "count_cap_for_100_score": COUNT_CAP,
        "years": YEARS,
        "coverage": len(records),
    }
    (ROOT / "data/severe-weather.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/severe-weather.json: {len(records)}/{len(cities)} cities matched (any year).", file=sys.stderr)


if __name__ == "__main__":
    main()
