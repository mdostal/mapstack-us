#!/usr/bin/env python3
"""
Builds data/cost-of-living.json -- real BEA Regional Price Parities (RPP),
the dataset BEA_API_KEY was obtained for. RPP is an index where 100.0 is
the national average cost of living (goods, rents, and services combined);
values above/below 100 mean that metro/state costs that percent more/less
than the national average.

BEA only publishes RPP at the national, state, and MSA (Metropolitan
Statistical Area) level -- there's no county or place-level product. So
this needs a real city -> CBSA (metro) crosswalk, which doesn't already
exist in this repo's raw data. Built one from the Census Bureau's own
2023 CBSA delineation file (county -> CBSA code, Metropolitan Statistical
Areas only, Micropolitan excluded since BEA's MARPP table doesn't cover
those), joined against the existing city -> county FIPS crosswalk
(data/raw/city-county-fips.json, reused from hazard.ts/broadband.ts).

Real, deliberate two-tier fallback: cities whose county isn't part of any
Metropolitan Statistical Area (real, mostly small/rural cities) fall back
to their real state-level RPP (BEA table SARPP) instead of a fabricated
metro estimate -- same fallback shape as unemployment.ts's city-tier/
county-tier split.

LineCode=1 is "RPPs: All items" (not a sub-component like rents-only or
goods-only) -- the broadest, most defensible single number.

Real multi-year history (2008-2024), per explicit operator direction to
get "as much data as possible" for real trends over time. 2008 is RPP's
own real floor -- the program didn't exist earlier. `Year=ALL` on a
single API call returns every real year at once (confirmed live: 6579
MSA rows, 884 state rows, both spanning 2008-2024) -- no per-year
looping needed.

A real data-quality issue found and fixed while extending to multi-year:
BEA's own MARPP table returns a literal "0" (not "(NA)") for a handful of
metro/year combinations with no real data -- confirmed live for Enid, OK
and Kiryas Joel-Poughkeepsie-Newburgh, NY, both 2008-2012. RPP can never
legitimately be near 0 (100 is the national average baseline), so "0" is
treated identically to "(NA)": excluded, not a real value.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/bea-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

RPP_FLOOR = 82.0  # real observed low end across 2008-2024, small pad below
RPP_CEIL = 118.0  # real observed high end across 2008-2024, small pad above


def bea_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("BEA_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("BEA_API_KEY not found in .env")


def fetch_all_years(table_name, geofips, key):
    cache_file = CACHE_DIR / f"{table_name}-{geofips}-ALL.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = (
        f"https://apps.bea.gov/api/data/?UserID={key}&method=GetData&datasetname=Regional"
        f"&TableName={table_name}&LineCode=1&GeoFips={geofips}&Year=ALL&ResultFormat=JSON"
    )
    result = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True, check=True)
    data = json.loads(result.stdout.decode("utf-8"))
    rows = data.get("BEAAPI", {}).get("Results", {}).get("Data", [])
    cache_file.write_text(json.dumps(rows))
    return rows


def build_county_to_cbsa():
    cached = CACHE_DIR / "county-to-cbsa.json"
    if cached.exists():
        return json.loads(cached.read_text())

    import openpyxl

    xlsx_path = CACHE_DIR / "cbsa-delineation-2023.xlsx"
    if not xlsx_path.exists():
        url = "https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx"
        print("Downloading Census 2023 CBSA delineation file...", file=sys.stderr)
        result = subprocess.run(["curl", "-s", "--max-time", "60", "-o", str(xlsx_path), url], check=True)

    wb = openpyxl.load_workbook(xlsx_path, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    header_idx = next(i for i, row in enumerate(rows) if row[0] == "CBSA Code")

    county_to_cbsa = {}
    for row in rows[header_idx + 1:]:
        if not row[0]:
            continue
        cbsa_code, _metdiv, _csa, cbsa_title, area_type, *_rest = row
        state_fips, county_fips = row[9], row[10]
        if area_type != "Metropolitan Statistical Area":
            continue
        county_to_cbsa[f"{state_fips}{county_fips}"] = {"cbsa_code": cbsa_code, "cbsa_title": cbsa_title}

    cached.write_text(json.dumps(county_to_cbsa, indent=2, sort_keys=True))
    print(f"Built county-to-cbsa.json: {len(county_to_cbsa)} Metropolitan counties", file=sys.stderr)
    return county_to_cbsa


def is_real_value(raw):
    """BEA returns a literal "0" (not "(NA)") for some metro/year gaps --
    a real RPP can never legitimately be near 0 (100 is the national
    baseline), so treat 0 identically to a real "(NA)" gap."""
    if raw in (None, "(NA)"):
        return False
    try:
        return float(raw) > 1.0
    except (TypeError, ValueError):
        return False


def main():
    key = bea_key()
    county_to_cbsa = build_county_to_cbsa()
    county_crosswalk = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    print("Fetching MSA-level RPP (MARPP), all years...", file=sys.stderr)
    msa_rows = fetch_all_years("MARPP", "MSA", key)
    rpp_by_year_cbsa = {}
    for r in msa_rows:
        if is_real_value(r["DataValue"]):
            rpp_by_year_cbsa.setdefault(r["TimePeriod"], {})[r["GeoFips"]] = float(r["DataValue"])

    print("Fetching state-level RPP (SARPP), all years...", file=sys.stderr)
    state_rows = fetch_all_years("SARPP", "STATE", key)
    rpp_by_year_state = {}
    for r in state_rows:
        if is_real_value(r["DataValue"]):
            rpp_by_year_state.setdefault(r["TimePeriod"], {})[r["GeoFips"][:2]] = float(r["DataValue"])

    years = sorted(set(rpp_by_year_cbsa) | set(rpp_by_year_state))
    print(f"Real years available: {years[0]}-{years[-1]} ({len(years)} years)", file=sys.stderr)

    records = {}
    metro_tier = 0
    state_tier = 0
    for city in cities:
        cw = county_crosswalk.get(city["id"])
        if not cw:
            continue
        stcofips = cw["stcofips"]
        cbsa = county_to_cbsa.get(stcofips)
        state_fips = stcofips[:2]

        years_data = {}
        for year in years:
            rpp, tier, tier_name = None, None, None
            if cbsa and cbsa["cbsa_code"] in rpp_by_year_cbsa.get(year, {}):
                rpp = rpp_by_year_cbsa[year][cbsa["cbsa_code"]]
                tier, tier_name = "metro", cbsa["cbsa_title"]
            elif state_fips in rpp_by_year_state.get(year, {}):
                rpp = rpp_by_year_state[year][state_fips]
                tier, tier_name = "state", city["state"]
            if rpp is None:
                continue

            rpp_clamped = max(RPP_FLOOR, min(RPP_CEIL, rpp))
            score = round((rpp_clamped - RPP_FLOOR) / (RPP_CEIL - RPP_FLOOR) * 100.0, 1)
            years_data[year] = {"rpp": round(rpp, 1), "tier": tier, "tier_name": tier_name, "score": score}

        if years_data:
            latest_covered_year = max(years_data)
            if years_data[latest_covered_year]["tier"] == "metro":
                metro_tier += 1
            else:
                state_tier += 1
            records[city["id"]] = {"years": years_data}

    records["_meta"] = {
        "source": f"BEA Regional Price Parities, {years[0]}-{years[-1]}, MARPP (metro) LineCode 1 with SARPP (state) fallback",
        "rpp_floor_for_0_score": RPP_FLOOR,
        "rpp_ceiling_for_100_score": RPP_CEIL,
        "years": [int(y) for y in years],
        "coverage": len(records),
    }

    (ROOT / "data/cost-of-living.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/cost-of-living.json: {covered}/{len(cities)} covered (any year).", file=sys.stderr)
    for year in years:
        n = sum(1 for cid, r in records.items() if cid != "_meta" and year in r["years"])
        print(f"  {year}: {n}/{len(cities)} cities covered", file=sys.stderr)


if __name__ == "__main__":
    main()
