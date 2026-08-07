#!/usr/bin/env python3
"""
Builds data/average-wage.json -- real average annual wage per employee,
tri-2 (tri-bulk-and-data-drive-2 epic, backlog addendum 2 #31). Reuses
the exact Census Business Patterns pipeline business-density.ts already
proved out -- same API, same CENSUS_API_KEY, same county-level ceiling
(CBP has no place-level geography at all) -- just one more real field
(PAYANN, total annual payroll) from the same request.

Genuinely distinct signal from income.ts (median HOUSEHOLD income --
includes non-wage income, multiple earners per household) and from
business-density.ts (establishment COUNT, not pay level): this is real
average pay PER EMPLOYEE at local businesses.

average_wage = PAYANN (real, in $1,000s per CBP's own units) * 1000 / EMP

Raw direction: LOWER average wage is MORE concerning -- percentile-ranked
and inverted among covered cities, the same convention income.ts already
uses for a related concept.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/average-wage-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

CBP_YEAR = 2023


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
    print(f"Fetching CBP payroll+employment for {len(state_fips_needed)} states...", file=sys.stderr)

    wage_by_county = {}
    for i, state_fips in enumerate(state_fips_needed):
        cbp_rows = fetch(
            f"https://api.census.gov/data/{CBP_YEAR}/cbp?get=NAME,EMP,PAYANN&for=county:*&in=state:{state_fips}&key={key}",
            f"cbp-state-{state_fips}",
        )
        for row in cbp_rows[1:] if cbp_rows and cbp_rows[0][0] == "NAME" else cbp_rows:
            _name, emp, payann, st, county = row
            emp, payann = int(emp), int(payann)
            if emp > 0:
                wage_by_county[f"{st}{county}"] = (payann * 1000) / emp

        print(f"  [{i + 1}/{len(state_fips_needed)}] state {state_fips}: {len(cbp_rows) - 1 if cbp_rows else 0} counties", file=sys.stderr)

    records = {}
    unmatched = []
    for city in cities:
        cid = city["id"]
        fips_info = city_county.get(cid)
        if not fips_info:
            unmatched.append(cid)
            continue
        wage = wage_by_county.get(fips_info["stcofips"])
        if wage is None:
            unmatched.append(cid)
            continue
        records[cid] = {
            "average_wage": round(wage),
            "county": fips_info["county_name"],
        }

    concern = percentile_ranks_inverted({cid: r["average_wage"] for cid, r in records.items()})
    for cid in records:
        records[cid]["concern"] = concern[cid]

    result = {
        "_meta": {
            "source": f"Census Business Patterns {CBP_YEAR} (PAYANN / EMP)",
            "resolution": "county (CBP has no place-level geography)",
            "coverage": len(records),
        },
        **records,
    }
    (ROOT / "data/average-wage.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    covered = len(records)
    print(f"Wrote data/average-wage.json: {covered}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched ({len(unmatched)}): {unmatched}", file=sys.stderr)

    values = sorted(r["average_wage"] for r in records.values())
    if values:
        print(f"average wage range: min=${values[0]:,} median=${values[len(values) // 2]:,} max=${values[-1]:,}", file=sys.stderr)


if __name__ == "__main__":
    main()
