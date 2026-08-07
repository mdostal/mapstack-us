#!/usr/bin/env python3
"""
Builds data/business-density.json -- real business establishment density,
dvd-6 (dataset-verification-drive epic, addendum #30). Pivoted here after
EPA TRI (#29) turned out impractically slow to bulk-fetch live (see the
backlog addendum's "UPDATE (dvd-6 attempt)" note).

Source: Census Business Patterns (CBP) via api.census.gov, reusing the
existing CENSUS_API_KEY -- no new credential needed. CBP has NO
place-level geography at all (confirmed live via .../cbp/geography.json),
only county and coarser -- so this is county-level only, the same
fallback tier unemployment.ts/cost-of-living.ts already use, but with no
city-level tier above it this time.

Normalizes ESTAB (establishment count) by real county population (Census
ACS B01003, same 2023 vintage population-change.ts already uses) to get
establishments per 1,000 residents -- raw establishment counts alone
would just reflect county size, not business density.

Raw direction: LOWER business density is MORE concerning (fewer local
businesses per capita reads as reduced local economic activity) --
percentile-ranked and inverted among covered cities, the same convention
income.ts/housing-inventory.ts already use for their own unbounded raw
quantities.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/business-density-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

CBP_YEAR = 2023
ACS_YEAR = 2023


def census_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("CENSUS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("CENSUS_API_KEY not found in .env")


def fetch(url, cache_name):
    cache_file = CACHE_DIR / f"{cache_name}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    result = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True, check=True)
    text = result.stdout.decode("utf-8").strip()
    rows = json.loads(text) if text.startswith("[") else []
    cache_file.write_text(json.dumps(rows))
    return rows


def percentile_ranks_inverted(values_by_id):
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    return {cid: round((n - 1 - i) / max(n - 1, 1) * 100, 1) for i, cid in enumerate(ids_sorted)}


def main():
    key = census_key()
    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    state_fips_needed = sorted({fips["stcofips"][:2] for fips in city_county.values()})
    print(f"Fetching CBP + ACS population for {len(state_fips_needed)} states...", file=sys.stderr)

    estab_by_county = {}
    pop_by_county = {}
    for i, state_fips in enumerate(state_fips_needed):
        cbp_rows = fetch(
            f"https://api.census.gov/data/{CBP_YEAR}/cbp?get=NAME,ESTAB&for=county:*&in=state:{state_fips}&key={key}",
            f"cbp-state-{state_fips}",
        )
        for row in cbp_rows[1:] if cbp_rows and cbp_rows[0][0] == "NAME" else cbp_rows:
            _name, estab, st, county = row
            estab_by_county[f"{st}{county}"] = int(estab)

        acs_rows = fetch(
            f"https://api.census.gov/data/{ACS_YEAR}/acs/acs5?get=NAME,B01003_001E&for=county:*&in=state:{state_fips}&key={key}",
            f"acs-pop-state-{state_fips}",
        )
        for row in acs_rows[1:] if acs_rows and acs_rows[0][0] == "NAME" else acs_rows:
            _name, pop, st, county = row
            if pop not in (None, "null"):
                pop_by_county[f"{st}{county}"] = float(pop)

        print(f"  [{i + 1}/{len(state_fips_needed)}] state {state_fips}: {len(cbp_rows) - 1 if cbp_rows else 0} counties", file=sys.stderr)

    density_by_county = {}
    for stcofips, estab in estab_by_county.items():
        pop = pop_by_county.get(stcofips)
        if pop and pop > 0:
            density_by_county[stcofips] = (estab / pop) * 1000

    records = {}
    unmatched = []
    for city in cities:
        cid = city["id"]
        fips_info = city_county.get(cid)
        if not fips_info:
            unmatched.append(cid)
            continue
        density = density_by_county.get(fips_info["stcofips"])
        if density is None:
            unmatched.append(cid)
            continue
        records[cid] = {
            "establishments_per_1000": round(density, 2),
            "county": fips_info["county_name"],
        }

    concern = percentile_ranks_inverted({cid: r["establishments_per_1000"] for cid, r in records.items()})
    for cid in records:
        records[cid]["concern"] = concern[cid]

    result = {
        "_meta": {
            "source": f"Census Business Patterns {CBP_YEAR} (ESTAB) normalized by Census ACS 5-year population estimates {ACS_YEAR}",
            "resolution": "county (CBP has no place-level geography)",
            "coverage": len(records),
        },
        **records,
    }
    (ROOT / "data/business-density.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/business-density.json: {len(records)}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched ({len(unmatched)}): {unmatched}", file=sys.stderr)

    values = sorted(r["establishments_per_1000"] for r in records.values())
    if values:
        print(f"establishments/1000 range: min={values[0]:.2f} median={values[len(values) // 2]:.2f} max={values[-1]:.2f}", file=sys.stderr)


if __name__ == "__main__":
    main()
