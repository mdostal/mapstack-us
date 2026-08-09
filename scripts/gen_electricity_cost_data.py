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
number. One request (start=2001&end=2025, length=5000) returns every
real year at once, confirmed live: 1550 real rows across 25 years.

Real multi-year history (2001-2025), per explicit operator direction to
get "as much data as possible" for real trends over time. 2001 is a
real, verified floor for this specific EIA series (earlier years
returned no data for this series id in a live check).

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
across all states/years, a FIXED cap so a state's price stays honestly
comparable year to year) -- same "cap at real observed max" posture as
sales-tax.ts/income-tax.ts.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
CACHE_DIR = ROOT / "data/raw/electricity-cost-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

START_YEAR = 2001
END_YEAR = 2025
PRICE_CAP = 41.0


def load_api_key():
    for line in ENV_FILE.read_text().splitlines():
        if line.startswith("EIA_API_KEY="):
            return line.split("=", 1)[1].strip()
    print("ERROR: EIA_API_KEY not found in .env", file=sys.stderr)
    sys.exit(1)


def fetch_state_prices(api_key):
    cache_file = CACHE_DIR / f"retail-sales-res-{START_YEAR}-{END_YEAR}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    url = (
        "https://api.eia.gov/v2/electricity/retail-sales/data/"
        f"?frequency=annual&data[0]=price&facets[sectorid][]=RES"
        f"&start={START_YEAR}&end={END_YEAR}&sort[0][column]=period&sort[0][direction]=desc"
        f"&length=5000&api_key={api_key}"
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
    by_year_state = {}
    for row in rows:
        state = row.get("stateid")
        price = row.get("price")
        year = row.get("period")
        if not state or state not in real_jurisdictions or not price or not year:
            continue
        by_year_state.setdefault(year, {})[state] = float(price)

    cache_file.write_text(json.dumps(by_year_state, indent=2, sort_keys=True) + "\n")
    return by_year_state


def main():
    api_key = load_api_key()
    prices_by_year = fetch_state_prices(api_key)
    years = sorted(int(y) for y in prices_by_year)
    print(f"Loaded real state residential electricity prices for {len(years)} years: {years[0]}-{years[-1]}", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    for city in cities:
        state = city["state"]
        years_data = {}
        for year in years:
            price = prices_by_year.get(str(year), {}).get(state)
            if price is None:
                continue
            concern = round(min(100.0, (price / PRICE_CAP) * 100.0), 1)
            years_data[str(year)] = {"price_cents_per_kwh": price, "concern": concern}
        if years_data:
            records[city["id"]] = {"state": state, "years": years_data}

    records["_meta"] = {
        "source": f"EIA (Energy Information Administration) API v2, electricity/retail-sales, residential sector, {years[0]}-{years[-1]}",
        "price_cap_for_100_concern": PRICE_CAP,
        "years": years,
        "coverage": len(records),
    }

    (ROOT / "data/electricity-cost.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/electricity-cost.json: {covered}/{len(cities)} cities covered (any year).", file=sys.stderr)
    for year in years:
        n = sum(1 for cid, r in records.items() if cid != "_meta" and str(year) in r["years"])
        print(f"  {year}: {n}/{len(cities)} cities covered", file=sys.stderr)


if __name__ == "__main__":
    main()
