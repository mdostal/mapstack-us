#!/usr/bin/env python3
"""
Builds data/population-change.json -- real population growth/decline
(dataset-backlog.md #1), the last of the original five Census-cluster
items to ship. Unblocked by a real, free, self-serve CENSUS_API_KEY.

Real detour worth documenting: Census's own PEP (Population Estimates
Program) place-level annual population product -- the source the
backlog originally specified -- appears to have moved or been
restructured for recent vintages. Confirmed live: `pep/population`'s own
`/geography.json` for the 2021 vintage (the most recent one still
catalogued) lists only us/region/division/state geography, no place; 2022
and 2024 don't have a `pep/population` path at all. Rather than keep
hunting for wherever PEP's place-level product went, this uses two
non-overlapping ACS 5-year estimate windows instead (2014-2018 vintage
"2018", 2019-2023 vintage "2023") -- still real Census data, still a
genuine multi-year population comparison, just a 5-year window instead
of PEP's annual one. Reuses the same city->place-FIPS crosswalk and
one-request-per-state batching pattern already proven for
property-tax.ts.

Raw direction / normalization: per the backlog's own explicit framing,
DECLINE is the concerning pole -- growth isn't automatically "good"
either (strain on housing/infrastructure is real), but this ships the
initial concerning pole only, matching the backlog's own scope decision.
Any city with flat or positive change scores 0 concern; declining cities
are directly rescaled by how much they declined, capped at a
data-informed ceiling.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/population-change-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

EARLY_YEAR = 2018  # ACS5 2014-2018
LATE_YEAR = 2023  # ACS5 2019-2023
DECLINE_PCT_CAP = 10.0  # percent decline -- see real observed range printed below


def census_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("CENSUS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("CENSUS_API_KEY not found in .env")


def fetch_state(year, state_fips, key):
    cache_file = CACHE_DIR / f"{year}-state-{state_fips}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = f"https://api.census.gov/data/{year}/acs/acs5?get=NAME,B01003_001E&for=place:*&in=state:{state_fips}&key={key}"
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
    print(f"Fetching {len(state_fips_needed)} states x 2 vintages ({EARLY_YEAR}, {LATE_YEAR})...", file=sys.stderr)

    pop_by_year_place = {EARLY_YEAR: {}, LATE_YEAR: {}}
    for year in (EARLY_YEAR, LATE_YEAR):
        for i, state_fips in enumerate(state_fips_needed):
            rows = fetch_state(year, state_fips, key)
            for row in rows[1:] if rows and rows[0][0] == "NAME" else rows:
                name, pop, st, place = row
                pop_by_year_place[year][f"{st}{place}"] = pop
            print(f"  [{year}] [{i + 1}/{len(state_fips_needed)}] state {state_fips}: {len(rows) - 1 if rows else 0} places", file=sys.stderr)

    records = {}
    no_crosswalk = []
    no_acs_data = []
    for city in cities:
        cw = crosswalk.get(city["id"])
        if not cw:
            no_crosswalk.append(city["id"])
            continue
        early = pop_by_year_place[EARLY_YEAR].get(cw["place_fips"])
        late = pop_by_year_place[LATE_YEAR].get(cw["place_fips"])
        if early in (None, "null") or late in (None, "null"):
            no_acs_data.append(city["id"])
            continue
        early_pop, late_pop = float(early), float(late)
        if early_pop <= 0:
            no_acs_data.append(city["id"])
            continue

        pct_change = round((late_pop - early_pop) / early_pop * 100, 2)
        concern = 0.0 if pct_change >= 0 else round(min(100.0, (abs(pct_change) / DECLINE_PCT_CAP) * 100.0), 1)
        records[city["id"]] = {
            f"population_{EARLY_YEAR}": round(early_pop),
            f"population_{LATE_YEAR}": round(late_pop),
            "pct_change": pct_change,
            "concern": concern,
        }

    records["_meta"] = {
        "source": f"Census ACS 5-year estimates, B01003 (total population), {EARLY_YEAR} vintage vs {LATE_YEAR} vintage",
        "decline_pct_cap_for_100_concern": DECLINE_PCT_CAP,
        "coverage": len(records),
    }

    (ROOT / "data/population-change.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/population-change.json: {covered}/{len(cities)} covered.", file=sys.stderr)
    if no_crosswalk:
        print(f"No crosswalk entry: {no_crosswalk}", file=sys.stderr)
    if no_acs_data:
        print(f"No real ACS data despite a crosswalk match: {no_acs_data}", file=sys.stderr)

    changes = sorted(r["pct_change"] for cid, r in records.items() if cid != "_meta")
    if changes:
        print(f"pct_change range: min={changes[0]} median={changes[len(changes)//2]} max={changes[-1]}", file=sys.stderr)
        declining = sum(1 for c in changes if c < 0)
        clamped = sum(1 for c in changes if c < -DECLINE_PCT_CAP)
        print(f"{declining} cities declined; {clamped} clamp to 100 concern (decline steeper than {DECLINE_PCT_CAP}%)", file=sys.stderr)


if __name__ == "__main__":
    main()
