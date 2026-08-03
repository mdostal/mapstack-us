#!/usr/bin/env python3
"""
Step 2 of the public-transit-access dataset build: fetch the FTA's free,
keyless National Transit Database (NTD) 2024 agency/mode-level "Metrics"
table from its Socrata mirror on data.transportation.gov
(resource ekg5-frzt), aggregate real vehicle-revenue-miles (VRM) up to
each Census Urban Area (summing across every agency AND every mode --
bus, rail, vanpool, demand-response -- that reports service there), join
to each spine city via its real Urban-Area GEOID
(data/raw/city-urban-area.json, from geocode_city_urban_areas.py), and
normalize by the urban area's own population to get a real, comparable
"transit service per resident" number.

Why NTD's own `uace_code` field and NOT its `uza_name` field: `uza_name`
is a free-text, often multi-city label ("Nashville-Davidson, TN",
"Louisville/Jefferson County, KY--IN") that a plain name match against
spine cities only resolves for ~52% of the spine, AND silently
misclassifies real suburbs (Irvine CA, part of the LA urbanized area,
whose name never appears in "Los Angeles--Long Beach--Anaheim, CA") as
having no transit data at all -- a real, tested failure mode this project
declined to ship. `uace_code` is a stable numeric ID, matched to the SAME
ID Census's own Urban Area geography uses -- an exact join, not a guess.

Raw direction: LOWER revenue-miles per capita is MORE concerning (less
real transit service relative to population) -- inverted percentile rank
among covered cities, same convention as housing-inventory.ts.

A city with zero matched NTD rows for its own Urban Area (a real urban
area exists, per the crosswalk, but no FTA-funded agency reports serving
it) gets an honest null, not an implied worst-case 0 -- collapsing
"no reporting agency" into "worst score" is exactly the kind of
smoothing-over this project's principles reject.
"""
import json
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_FILE = ROOT / "data/raw/transit-cache/ntd-2024-metrics.json"
CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

REPORT_YEAR = "2024"
NTD_URL = (
    "https://data.transportation.gov/resource/ekg5-frzt.json"
    f"?$select=uace_code,uza_name,primary_uza_population,vehicle_revenue_miles"
    f"&report_year={REPORT_YEAR}&$limit=5000"
)


def fetch_ntd_rows():
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text())
    result = subprocess.run(
        ["curl", "-s", "--max-time", "60", "-A", "Mozilla/5.0", NTD_URL], capture_output=True, check=True
    )
    rows = json.loads(result.stdout.decode("utf-8"))
    CACHE_FILE.write_text(json.dumps(rows, indent=2))
    return rows


def percentile_ranks_inverted(values_by_id):
    """0-100 concern score: LOWER real VRM-per-capita = MORE concerning,
    so the lowest value gets the highest percentile. Computed once here,
    same convention as housing-inventory.ts's own inverted ranking."""
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    return {cid: round((n - 1 - i) / max(n - 1, 1) * 100, 1) for i, cid in enumerate(ids_sorted)}


def main():
    rows = fetch_ntd_rows()
    print(f"Loaded {len(rows)} NTD agency/mode rows for report year {REPORT_YEAR}.", file=sys.stderr)

    vrm_by_uace = defaultdict(float)
    pop_by_uace = {}
    name_by_uace = {}
    for row in rows:
        uace = row.get("uace_code")
        if not uace:
            continue
        vrm_by_uace[uace] += float(row.get("vehicle_revenue_miles") or 0)
        pop = row.get("primary_uza_population")
        if pop:
            pop_by_uace[uace] = int(pop)
        name_by_uace[uace] = row.get("uza_name")

    city_ua = json.loads((ROOT / "data/raw/city-urban-area.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    per_capita = {}
    meta_by_city = {}
    no_urban_area = []
    no_ntd_service = []
    for city in cities:
        cid = city["id"]
        ua = city_ua.get(cid)
        if not ua:
            no_urban_area.append(cid)
            continue

        uace = ua["uace"]
        vrm = vrm_by_uace.get(uace)
        pop = pop_by_uace.get(uace)
        if not vrm or not pop:
            no_ntd_service.append(cid)
            continue

        rate = vrm / pop
        per_capita[cid] = rate
        meta_by_city[cid] = {
            "urban_area": name_by_uace.get(uace, ua["name"]),
            "vrm_per_capita": round(rate, 3),
            "uza_population": pop,
        }

    concern = percentile_ranks_inverted(per_capita)
    records = {cid: {**meta_by_city[cid], "concern": concern[cid]} for cid in per_capita}

    result = {
        "_meta": {
            "source": f"FTA National Transit Database, {REPORT_YEAR} Annual Data -- Metrics (by Agency), via data.transportation.gov",
            "source_url": "https://www.transit.dot.gov/ntd",
            "resolution": "Census Urban Area",
        },
        **records,
    }
    (ROOT / "data/transit-access.json").write_text(json.dumps(result, indent=2))
    print(
        f"Wrote data/transit-access.json: {len(records)}/{len(cities)} cities matched "
        f"({len(no_urban_area)} no Urban Area, {len(no_ntd_service)} Urban Area with no reporting NTD agency).",
        file=sys.stderr,
    )
    if no_ntd_service:
        print(f"No reporting NTD agency: {no_ntd_service}", file=sys.stderr)


if __name__ == "__main__":
    main()
