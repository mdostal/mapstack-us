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
goods-only) -- the broadest, most defensible single number. Year is the
latest BEA has published (2024 confirmed live).
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/bea-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEAR = "2024"
RPP_FLOOR = 82.0  # real observed low end -- 2024 spine minimum is 84.8 (Shreveport LA), small pad below
RPP_CEIL = 118.0  # real observed high end -- 2024 spine maximum is 115.6 (SF-Oakland-Fremont), small pad above


def bea_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("BEA_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("BEA_API_KEY not found in .env")


def fetch(table_name, geofips, key):
    cache_file = CACHE_DIR / f"{table_name}-{geofips}-{YEAR}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = (
        f"https://apps.bea.gov/api/data/?UserID={key}&method=GetData&datasetname=Regional"
        f"&TableName={table_name}&LineCode=1&GeoFips={geofips}&Year={YEAR}&ResultFormat=JSON"
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


def main():
    key = bea_key()
    county_to_cbsa = build_county_to_cbsa()
    county_crosswalk = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    print("Fetching MSA-level RPP (MARPP)...", file=sys.stderr)
    msa_rows = fetch("MARPP", "MSA", key)
    rpp_by_cbsa = {r["GeoFips"]: float(r["DataValue"]) for r in msa_rows if r["DataValue"] not in (None, "(NA)")}
    print(f"  {len(rpp_by_cbsa)} MSAs with real RPP", file=sys.stderr)

    print("Fetching state-level RPP (SARPP)...", file=sys.stderr)
    state_rows = fetch("SARPP", "STATE", key)
    rpp_by_state = {r["GeoFips"][:2]: float(r["DataValue"]) for r in state_rows if r["DataValue"] not in (None, "(NA)")}
    print(f"  {len(rpp_by_state)} states with real RPP", file=sys.stderr)

    records = {}
    no_crosswalk = []
    metro_tier = 0
    state_tier = 0
    for city in cities:
        cw = county_crosswalk.get(city["id"])
        if not cw:
            no_crosswalk.append(city["id"])
            continue
        stcofips = cw["stcofips"]
        cbsa = county_to_cbsa.get(stcofips)
        if cbsa and cbsa["cbsa_code"] in rpp_by_cbsa:
            rpp = rpp_by_cbsa[cbsa["cbsa_code"]]
            tier = "metro"
            tier_name = cbsa["cbsa_title"]
            metro_tier += 1
        else:
            state_fips = stcofips[:2]
            if state_fips not in rpp_by_state:
                no_crosswalk.append(city["id"])
                continue
            rpp = rpp_by_state[state_fips]
            tier = "state"
            tier_name = city["state"]
            state_tier += 1

        rpp_clamped = max(RPP_FLOOR, min(RPP_CEIL, rpp))
        score = round((rpp_clamped - RPP_FLOOR) / (RPP_CEIL - RPP_FLOOR) * 100.0, 1)
        records[city["id"]] = {
            "rpp": round(rpp, 1),
            "tier": tier,
            "tier_name": tier_name,
            "score": score,
        }

    records["_meta"] = {
        "source": f"BEA Regional Price Parities, {YEAR}, MARPP (metro) LineCode 1 with SARPP (state) fallback",
        "rpp_floor_for_0_score": RPP_FLOOR,
        "rpp_ceiling_for_100_score": RPP_CEIL,
        "coverage": len(records),
        "metro_tier_cities": metro_tier,
        "state_tier_cities": state_tier,
    }

    (ROOT / "data/cost-of-living.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/cost-of-living.json: {covered}/{len(cities)} covered ({metro_tier} metro, {state_tier} state).", file=sys.stderr)
    if no_crosswalk:
        print(f"No coverage ({len(no_crosswalk)}): {no_crosswalk}", file=sys.stderr)

    rpps = sorted(r["rpp"] for cid, r in records.items() if cid != "_meta")
    if rpps:
        print(f"RPP range: min={rpps[0]} median={rpps[len(rpps)//2]} max={rpps[-1]}", file=sys.stderr)


if __name__ == "__main__":
    main()
