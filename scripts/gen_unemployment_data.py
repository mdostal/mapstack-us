#!/usr/bin/env python3
"""
Builds data/unemployment.json -- real local unemployment rate
(dataset-backlog.md #11), from BLS Local Area Unemployment Statistics
(LAUS), unblocked by a real, free, self-serve BLS_API_KEY
(https://data.bls.gov/registrationEngine/).

BLS LAUS series IDs are constructed directly from FIPS codes already in
this project's existing crosswalks -- no need for BLS's own area-code
reference file, which turned out to be blocked to automated retrieval
("Access Denied... bot activity... is prohibited", confirmed live by
direct request) at download.bls.gov. The actual data API (api.bls.gov,
what the free key is for) has no such restriction and was used
exclusively here.

Series ID format (reverse-engineered from a known-good county series ID
and confirmed live against real city data): "LAU" + area type ("CT" for
city/place, "CN" for county) + FIPS code padded to 13 digits + measure
code ("03" = unemployment rate). E.g. New York City = "LAU" + "CT" +
state(36) + place(51000) + "000000" + "03" = "LAUCT365100000000003" --
confirmed live, returns real monthly data (5.2% for June 2026).

City-level (CT) series don't exist for every place -- BLS's own LAUS
program covers ~7,600 areas, not all 512 spine cities individually. Any
city with no real CT-level series falls back to its county's CN-level
series (data/raw/city-county-fips.json, 512/512 real coverage, already
built for hazard.ts/broadband.ts) -- the same two-tier honesty pattern
this project already uses for wildfire/unemployment-style candidates in
dataset-backlog.md.

Raw direction / normalization: higher unemployment rate is more
concerning -- direct rescale, capped at a data-informed ceiling (see
RATE_CAP below).
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/unemployment-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

BATCH_SIZE = 50
START_YEAR = "2024"
END_YEAR = "2026"
RATE_CAP = 12.0  # percent -- see real observed range printed below


def bls_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("BLS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("BLS_API_KEY not found in .env")


def ct_series_id(place_fips):
    return "LAUCT" + place_fips.zfill(7) + "000000" + "03"


def cn_series_id(stcofips):
    return "LAUCN" + stcofips.zfill(5) + "00000000" + "03"


def fetch_batch(series_ids, key):
    cache_key = CACHE_DIR / f"batch-{series_ids[0]}-{len(series_ids)}.json"
    if cache_key.exists():
        return json.loads(cache_key.read_text())

    payload = json.dumps({"seriesid": series_ids, "registrationkey": key, "startyear": START_YEAR, "endyear": END_YEAR})
    result = subprocess.run(
        ["curl", "-s", "--max-time", "30", "-X", "POST", "https://api.bls.gov/publicAPI/v2/timeseries/data/",
         "-H", "Content-Type: application/json", "-d", payload],
        capture_output=True, check=True,
    )
    data = json.loads(result.stdout.decode("utf-8"))
    cache_key.write_text(json.dumps(data))
    return data


def latest_real_value(series_data):
    for point in series_data:
        if point.get("value") not in (None, "-", ""):
            return float(point["value"]), point["year"], point["periodName"]
    return None


def main():
    key = bls_key()
    place_cw = json.loads((ROOT / "data/raw/city-place-fips.json").read_text())
    county_cw = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    # Build the id->cityId lookup for both tiers, since one big batched
    # fetch is far cheaper than one request per city (BLS API caps at
    # 50 series/request even for registered keys).
    ct_lookup, cn_lookup = {}, {}
    for city in cities:
        if city["id"] in place_cw:
            ct_lookup[ct_series_id(place_cw[city["id"]]["place_fips"])] = city["id"]
        if city["id"] in county_cw:
            cn_lookup[cn_series_id(county_cw[city["id"]]["stcofips"])] = city["id"]

    all_ids = list(ct_lookup.keys()) + list(cn_lookup.keys())
    print(f"Fetching {len(all_ids)} series ({len(ct_lookup)} city-level + {len(cn_lookup)} county-level fallback) in batches of {BATCH_SIZE}...", file=sys.stderr)

    series_values = {}
    for i in range(0, len(all_ids), BATCH_SIZE):
        batch = all_ids[i : i + BATCH_SIZE]
        result = fetch_batch(batch, key)
        for s in result.get("Results", {}).get("series", []):
            val = latest_real_value(s.get("data", []))
            if val:
                series_values[s["seriesID"]] = val
        print(f"  batch {i // BATCH_SIZE + 1}/{(len(all_ids) + BATCH_SIZE - 1) // BATCH_SIZE}", file=sys.stderr)

    records = {}
    city_tier_count = 0
    county_tier_count = 0
    for city in cities:
        ct_id = ct_series_id(place_cw[city["id"]]["place_fips"]) if city["id"] in place_cw else None
        if ct_id and ct_id in series_values:
            rate, year, period = series_values[ct_id]
            tier = "city"
            city_tier_count += 1
        else:
            cn_id = cn_series_id(county_cw[city["id"]]["stcofips"]) if city["id"] in county_cw else None
            if cn_id and cn_id in series_values:
                rate, year, period = series_values[cn_id]
                tier = "county"
                county_tier_count += 1
            else:
                continue

        concern = round(min(100.0, (rate / RATE_CAP) * 100.0), 1)
        records[city["id"]] = {
            "unemployment_rate_pct": rate,
            "as_of": f"{period} {year}",
            "tier": tier,
            "concern": concern,
        }

    records["_meta"] = {
        "source": "BLS Local Area Unemployment Statistics (LAUS)",
        "rate_cap_for_100_concern": RATE_CAP,
        "coverage": len(records),
    }

    (ROOT / "data/unemployment.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/unemployment.json: {covered}/{len(cities)} covered ({city_tier_count} city-tier, {county_tier_count} county-tier fallback).", file=sys.stderr)

    missing = [c["id"] for c in cities if c["id"] not in records]
    if missing:
        print(f"{len(missing)} cities with no real series at either tier: {missing}", file=sys.stderr)

    rates = sorted(r["unemployment_rate_pct"] for cid, r in records.items() if cid != "_meta")
    if rates:
        print(f"unemployment_rate_pct range: min={rates[0]} median={rates[len(rates)//2]} max={rates[-1]}", file=sys.stderr)
        clamped = sum(1 for r in rates if r > RATE_CAP)
        print(f"{clamped} cities clamp to 100 concern (rate above {RATE_CAP}%)", file=sys.stderr)


if __name__ == "__main__":
    main()
