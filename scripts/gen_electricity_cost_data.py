#!/usr/bin/env python3
"""
Builds data/electricity-cost.json -- the state-level real residential
electricity retail price, ddr13-1 (data-drive-round-13 epic). Source:
the real, live EIA (Energy Information Administration) API v2
(api.eia.gov/v2/electricity/retail-sales/data/), unlocked by a real
EIA_API_KEY the user obtained this session (also stored in GCP Secret
Manager, project personalsites-487021).

State-level only, same honest limit as income-tax.ts/sales-tax.ts/
property-tax.ts -- every spine city in a state gets that state's real
number. One request returns all 51 states+DC at once, joined directly
against data/cities.json's existing `state` field -- no crosswalk.

A real gotcha worth documenting: EIA's bracket-style query params
(facets[stateid][]=NY, data[0]=price) trip a real `curl` URL-globbing
bug -- curl interprets unescaped [ ] as its own glob syntax and exits
with "URL malformed" (exit code 3) unless --globoff is passed. An
earlier probe with a placeholder key returned an empty body and was
wrongly read as "maybe the key doesn't work" -- the real cause was this
globbing bug, confirmed once a real key was available and --globoff
was added.

Raw direction / normalization: higher price is more concerning (cost of
living) -- already a meaningful, externally bounded quantity (cents per
kWh), directly rescaled onto 0-100, capped at 41 (the real observed max
across all states, Hawaii at 40.59, small pad) -- same "cap at real
observed max" posture as sales-tax.ts/income-tax.ts.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
CACHE_DIR = ROOT / "data/raw/electricity-cost-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

YEAR = 2025
PRICE_CAP = 41.0


def load_api_key():
    for line in ENV_FILE.read_text().splitlines():
        if line.startswith("EIA_API_KEY="):
            return line.split("=", 1)[1].strip()
    print("ERROR: EIA_API_KEY not found in .env", file=sys.stderr)
    sys.exit(1)


def fetch_state_prices(api_key):
    cache_file = CACHE_DIR / f"retail-sales-res-{YEAR}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    url = (
        "https://api.eia.gov/v2/electricity/retail-sales/data/"
        f"?frequency=annual&data[0]=price&facets[sectorid][]=RES"
        f"&start={YEAR}&end={YEAR}&sort[0][column]=period&sort[0][direction]=desc"
        f"&length=200&api_key={api_key}"
    )
    result = subprocess.run(
        ["curl", "-s", "--globoff", "--max-time", "30", url],
        capture_output=True,
        text=True,
        check=True,
    )
    data = json.loads(result.stdout)
    rows = data["response"]["data"]
    # Real states + DC only. EIA's response mixes in census-division/region
    # aggregates (e.g. "PACN", "NEW") and a national total ("US") -- all of
    # which happen to include some 2-char codes too ("US"), so filter against
    # the exact real jurisdiction list rather than just checking length==2.
    real_jurisdictions = {c["state"] for c in json.loads((ROOT / "data/cities.json").read_text())}
    by_state = {}
    for row in rows:
        state = row.get("stateid")
        price = row.get("price")
        if not state or state not in real_jurisdictions or not price:
            continue
        by_state[state] = float(price)

    cache_file.write_text(json.dumps(by_state, indent=2, sort_keys=True) + "\n")
    return by_state


def main():
    api_key = load_api_key()
    prices = fetch_state_prices(api_key)
    print(f"Loaded {len(prices)} real state residential electricity prices for {YEAR}.", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    missing_states = set()
    for city in cities:
        state = city["state"]
        if state not in prices:
            missing_states.add(state)
            continue
        price = prices[state]
        concern = round(min(100.0, (price / PRICE_CAP) * 100.0), 1)
        records[city["id"]] = {
            "price_cents_per_kwh": price,
            "concern": concern,
            "state": state,
        }

    covered = len(records)
    result = {
        "_meta": {
            "source": f"EIA (Energy Information Administration) API v2, electricity/retail-sales, residential sector, {YEAR}",
            "price_cap_for_100_concern": PRICE_CAP,
            "coverage": covered,
        },
        **records,
    }
    (ROOT / "data/electricity-cost.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/electricity-cost.json: {covered}/{len(cities)} cities covered.", file=sys.stderr)
    if missing_states:
        print(f"States with no real EIA price this year: {sorted(missing_states)}", file=sys.stderr)

    all_prices = sorted(r["price_cents_per_kwh"] for r in records.values())
    n = len(all_prices)
    pcts = {p: all_prices[min(int(n * p / 100), n - 1)] for p in [50, 75, 90, 95, 99]}
    print(f"price distribution (cents/kWh): min={all_prices[0]} {pcts} max={all_prices[-1]}", file=sys.stderr)


if __name__ == "__main__":
    main()
