#!/usr/bin/env python3
"""
Builds data/property-tax.json -- real effective property tax rate (median
real estate taxes paid / median home value), the last of the three real
tax candidates from dataset-backlog.md (#22), and the first dataset this
project has ever pulled DIRECTLY from the Census API rather than via
County Health Rankings' free republication route. Unblocked by a real,
free, self-serve CENSUS_API_KEY (https://api.census.gov/data/key_signup.html).

Reuses the existing city->place-FIPS crosswalk (data/raw/city-place-fips.json,
built for health.ts) -- no new geocoding needed. 509/512 cities covered;
savannah-ga, kenosha-wi, sundance-wy have no place-FIPS match in that
crosswalk (a real, pre-existing gap, not introduced here).

Data source: Census ACS 5-year estimates, tables B25103 (median real
estate taxes paid, all owner-occupied units) and B25077 (median home
value), vintage 2023 -- the same "reflects a rolling average, not a
single-year snapshot" posture every other ACS-sourced dataset here
already carries.

One API call per state (place:*+in=state:XX) rather than 512 individual
calls -- 51 real requests total.

Raw direction / normalization: higher effective rate (taxes / value) is
more concerning -- direct rescale, capped at a data-informed ceiling (see
RATE_CAP below), same posture as sales-tax.ts/income-tax.ts's own real-
observed caps.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/property-tax-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

ACS_YEAR = 2023
RATE_CAP = 0.025  # 2.5% -- see real observed range printed below; revisit if it ever clamps many cities


def census_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("CENSUS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("CENSUS_API_KEY not found in .env")


def fetch_state(state_fips, key):
    cache_file = CACHE_DIR / f"state-{state_fips}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = (
        f"https://api.census.gov/data/{ACS_YEAR}/acs/acs5"
        f"?get=NAME,B25103_001E,B25077_001E&for=place:*&in=state:{state_fips}&key={key}"
    )
    result = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True, check=True)
    text = result.stdout.decode("utf-8").strip()
    rows = json.loads(text) if text.startswith("[") else []
    cache_file.write_text(json.dumps(rows))
    return rows


def main():
    key = census_key()
    crosswalk = json.loads((ROOT / "data/raw/city-place-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    state_fips_needed = sorted({crosswalk[c["id"]]["place_fips"][:2] for c in cities if c["id"] in crosswalk})
    print(f"Fetching {len(state_fips_needed)} states...", file=sys.stderr)

    by_place = {}
    for i, state_fips in enumerate(state_fips_needed):
        rows = fetch_state(state_fips, key)
        for row in rows[1:] if rows and rows[0][0] == "NAME" else rows:
            name, taxes, value, st, place = row
            by_place[f"{st}{place}"] = (taxes, value)
        print(f"  [{i + 1}/{len(state_fips_needed)}] state {state_fips}: {len(rows) - 1 if rows else 0} places", file=sys.stderr)

    records = {}
    no_crosswalk = []
    no_acs_data = []
    for city in cities:
        cw = crosswalk.get(city["id"])
        if not cw:
            no_crosswalk.append(city["id"])
            continue
        pair = by_place.get(cw["place_fips"])
        if not pair:
            no_acs_data.append(city["id"])
            continue
        taxes_raw, value_raw = pair
        if taxes_raw is None or value_raw is None or taxes_raw in ("null", None) or value_raw in ("null", None):
            no_acs_data.append(city["id"])
            continue
        taxes, value = float(taxes_raw), float(value_raw)
        if value <= 0:
            no_acs_data.append(city["id"])
            continue
        rate = taxes / value
        concern = round(min(100.0, (rate / RATE_CAP) * 100.0), 1)
        records[city["id"]] = {
            "median_annual_taxes": round(taxes),
            "median_home_value": round(value),
            "effective_rate_pct": round(rate * 100, 2),
            "concern": concern,
        }

    records["_meta"] = {
        "source": f"Census ACS {ACS_YEAR} 5-year estimates, B25103 (median real estate taxes) / B25077 (median home value)",
        "rate_cap_for_100_concern": RATE_CAP,
        "coverage": len(records),
    }

    (ROOT / "data/property-tax.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/property-tax.json: {covered}/{len(cities)} covered.", file=sys.stderr)
    if no_crosswalk:
        print(f"No crosswalk entry: {no_crosswalk}", file=sys.stderr)
    if no_acs_data:
        print(f"No real ACS data despite a crosswalk match: {no_acs_data}", file=sys.stderr)

    rates = sorted(r["effective_rate_pct"] for cid, r in records.items() if cid != "_meta")
    if rates:
        print(f"effective_rate_pct range: min={rates[0]} median={rates[len(rates)//2]} max={rates[-1]}", file=sys.stderr)
        clamped = sum(1 for r in rates if r / 100 > RATE_CAP)
        print(f"{clamped} cities clamp to 100 concern (rate above the {RATE_CAP*100}% cap)", file=sys.stderr)


if __name__ == "__main__":
    main()
