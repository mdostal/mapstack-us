#!/usr/bin/env python3
"""
Builds data/historic-site-density.json -- real density of National Register
of Historic Places (NRHP)-listed sites within 10 miles of each city,
ddr10-1 (data-drive-round-10 epic). Source: the real, live, keyless NPS
ArcGIS FeatureServer (mapservices.nps.gov/arcgis/rest/services/cultural_
resources/nrhp_locations/MapServer/0), 72,668 real listed resources
nationally.

A first for this session's radius-join pattern: the server itself supports
a spatial distance query (geometryType=esriGeometryPoint&distance=10&
units=esriSRUnit_StatuteMile&spatialRel=esriSpatialRelIntersects), so this
returns exact per-city results directly -- no bulk download, no local
haversine. The source's own City/State field is unreliable (confirmed
live: City='NEW YORK' AND State='NY' -> count=0) so this radius join is
required, not optional.

Real multi-year history (1966-2025), per explicit operator direction to
get "as much data as possible" for real trends over time. Every NRHP
site carries a real `CertDate` (Certification Date) field -- confirmed
live via the server's own field metadata, format "MM/DD/YY" (a string,
not a proper date type). Rather than one radius query PER (city, year)
pair, this fetches each city's full list of real CertDates ONCE
(confirmed live: no pagination needed even for NYC's 823 real sites
within 10mi, well under the service's maxRecordCount), then computes
every real year's count LOCALLY from that one per-city fetch -- a site
listed in 1994 genuinely wasn't there in a real 1985 snapshot, so
year-X's count = count of sites with CertDate year <= X, a real,
non-fabricated reconstruction, not an estimate.

Direction: fewer nearby historic sites is MORE concerning (an "access"-
style framing, per parks.ts/library-access.ts/transit-access.ts) --
inverted direct rescale, capped at a FIXED ceiling across every year
(same real p90-derived cap the original single-year build already used)
so a city's score stays honestly comparable year to year.
"""
import concurrent.futures
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/historic-site-density-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "https://mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer/0/query"
COUNT_CAP = 290  # real p90 from a 60-city sample -- see design-discussion.md
MAX_WORKERS = 8
RETRIES = 4
EARLIEST_YEAR = 1966  # National Historic Preservation Act of 1966, NRHP's real start
LATEST_YEAR = 2025


def parse_cert_year(cert_date):
    """Real format confirmed live: "MM/DD/YY", a 2-digit year. NRHP has
    only existed since 1966, so YY 66-99 is unambiguously 19YY and YY
    00-25 is unambiguously 20YY -- no real listing can be dated outside
    that window."""
    if not cert_date:
        return None
    parts = cert_date.split("/")
    if len(parts) != 3:
        return None
    try:
        yy = int(parts[2])
    except ValueError:
        return None
    return 1900 + yy if yy >= 66 else 2000 + yy


def fetch_cert_dates(lat, lon, retries=RETRIES):
    url = (
        f"{BASE_URL}?geometry={lon},{lat}&geometryType=esriGeometryPoint&inSR=4326"
        "&distance=10&units=esriSRUnit_StatuteMile&spatialRel=esriSpatialRelIntersects"
        "&outFields=CertDate&returnGeometry=false&f=json"
    )
    last_err = None
    for attempt in range(retries):
        try:
            out = subprocess.run(
                ["curl", "-s", "--max-time", "20", url],
                capture_output=True,
                text=True,
                timeout=25,
                check=True,
            )
            data = json.loads(out.stdout)
            if "features" in data:
                return [f["attributes"].get("CertDate") for f in data["features"]]
            last_err = data
        except Exception as e:
            last_err = e
        time.sleep(2**attempt)
    raise RuntimeError(f"Failed to fetch cert dates for ({lat},{lon}) after {retries} retries: {last_err}")


def fetch_city(city):
    cid = city["id"]
    cache_file = CACHE_DIR / f"{cid}.json"
    if cache_file.exists():
        return cid, json.loads(cache_file.read_text())["cert_dates"]
    cert_dates = fetch_cert_dates(city["lat"], city["lon"])
    cache_file.write_text(json.dumps({"cert_dates": cert_dates}))
    return cid, cert_dates


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(fetch_city, city): city["id"] for city in cities}
        done = 0
        for fut in concurrent.futures.as_completed(futures):
            cid = futures[fut]
            try:
                cid_out, cert_dates = fut.result()
                results[cid_out] = cert_dates
            except Exception as e:
                print(f"FAILED {cid}: {e}", file=sys.stderr)
            done += 1
            if done % 50 == 0:
                print(f"{done}/{len(cities)} fetched...", file=sys.stderr)

    years = list(range(EARLIEST_YEAR, LATEST_YEAR + 1))
    records = {}
    for city in cities:
        cid = city["id"]
        if cid not in results:
            continue
        real_years = sorted(y for y in (parse_cert_year(d) for d in results[cid]) if y is not None)

        years_data = {}
        for year in years:
            # bisect: count of real years <= this target year
            count = sum(1 for y in real_years if y <= year)
            concern = round(100.0 * (1.0 - min(count, COUNT_CAP) / COUNT_CAP), 1)
            years_data[str(year)] = {"count_within_10mi": count, "concern": concern}
        records[cid] = {"years": years_data}

    covered = len(records)
    result = {
        "_meta": {
            "source": "NPS National Register of Historic Places (NRHP), sites within 10mi via ArcGIS spatial radius query, reconstructed per real CertDate",
            "count_cap_for_0_concern": COUNT_CAP,
            "years": years,
            "coverage": covered,
        },
        **records,
    }
    (ROOT / "data/historic-site-density.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/historic-site-density.json: {covered}/{len(cities)} cities matched.", file=sys.stderr)

    counts_2025 = sorted(records[cid]["years"][str(LATEST_YEAR)]["count_within_10mi"] for cid in records)
    if counts_2025:
        n = len(counts_2025)
        pcts = {p: counts_2025[min(int(n * p / 100), n - 1)] for p in [50, 75, 90, 95, 99]}
        zero = sum(1 for c in counts_2025 if c == 0)
        print(f"{LATEST_YEAR} count distribution: min={counts_2025[0]} {pcts} max={counts_2025[-1]}; {zero} cities with zero sites within 10mi", file=sys.stderr)


if __name__ == "__main__":
    main()
