#!/usr/bin/env python3
"""
Builds data/population-change.json -- real population growth/decline
(dataset-backlog.md #1), the last of the original five Census-cluster
items to ship. Unblocked by a real, free, self-serve CENSUS_API_KEY.

Real multi-year history (2001-2023, year-over-year % change), a genuine
upgrade over the original single 2018-vs-2023 two-point comparison, per
explicit operator direction to get "as much data as possible" for real
trends over time. Built from THREE real, distinct Census sources, each
verified live before use, stitched at their real boundaries:

  1. 2000-2009: Census's `2000/pep/int_population` intercensal product,
     DATE_ codes 2-11 = real annual estimates (7/1/2000 through 7/1/2009),
     confirmed live via its own DATE_DESC field. Place-level geography
     confirmed present (geoLevelId 162, state-only requirement).
  2. 2010-2019: Census's `2019/pep/population` postcensal product,
     DATE_CODE 3-12 = real annual estimates (7/1/2010 through 7/1/2019),
     confirmed live via its own documented DATE_CODE value labels.
  3. 2020-2023: Census's PEP place-level product was confirmed live to
     have MOVED for post-2020 vintages -- `2021/pep/population/geography`
     lists only state-level geography, 2020/2022/2023 don't expose this
     exact path at all. Falls back to ACS5 vintage-year population
     (B01003), one point per vintage year -- a REAL, distinct published
     figure each year, but each is a rolling 5-year window average, NOT a
     true annual snapshot like the PEP-sourced years before it. This is a
     real, disclosed seam, not smoothed over -- see
     data/population-change-methodology.md.

One API call per state for each of the two PEP products (both return
EVERY real year in one response), plus one call per (state, ACS5 vintage)
for 2020-2023 -- reuses the existing city->place-FIPS crosswalk.

Raw direction / normalization: DECLINE is the concerning pole (matching
the backlog's own explicit scope decision) -- flat-or-growing years score
0 concern; a declining year is rescaled by how steep the year-over-year
(or vintage-over-vintage, for 2020+) decline was, capped at a
data-informed ceiling (see DECLINE_PCT_CAP below, chosen from this
build's own real observed range, printed at the end).
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/population-change-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

ACS5_YEARS = [2020, 2021, 2022, 2023]
DECLINE_PCT_CAP = 3.0  # percent year-over-year decline -- see real observed range printed below


def census_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("CENSUS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("CENSUS_API_KEY not found in .env")


def fetch(url, cache_name):
    cache_file = CACHE_DIR / cache_name
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    result = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True, check=True)
    text = result.stdout.decode("utf-8").strip()
    rows = json.loads(text) if text.startswith("[") else []
    cache_file.write_text(json.dumps(rows))
    return rows


def fetch_pep_2000s(state_fips, key):
    url = f"https://api.census.gov/data/2000/pep/int_population?get=GEONAME,POP,DATE_&for=place:*&in=state:{state_fips}&key={key}"
    return fetch(url, f"pep2000s-state-{state_fips}.json")


def fetch_pep_2010s(state_fips, key):
    url = f"https://api.census.gov/data/2019/pep/population?get=NAME,POP,DATE_CODE&for=place:*&in=state:{state_fips}&DATE_CODE=3:12&key={key}"
    return fetch(url, f"pep2010s-state-{state_fips}.json")


def fetch_acs5(state_fips, year, key):
    url = f"https://api.census.gov/data/{year}/acs/acs5?get=NAME,B01003_001E&for=place:*&in=state:{state_fips}&key={key}"
    return fetch(url, f"acs5-{year}-state-{state_fips}.json")


def main():
    key = census_key()
    crosswalk = json.loads((ROOT / "data/raw/city-place-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    state_fips_needed = sorted({crosswalk[c["id"]]["place_fips"][:2] for c in cities if c["id"] in crosswalk})

    # place_fips -> {year: population}
    pop_by_place_year = {}

    for state_fips in state_fips_needed:
        rows = fetch_pep_2000s(state_fips, key)
        for row in rows[1:] if rows and rows[0][0] == "GEONAME" else rows:
            name, pop, date_code, st, place = row
            code = int(date_code)
            if code < 2 or code > 11:  # skip the 4/1/2000 base and the 4/1/2010 census count
                continue
            year = 2000 + (code - 2)  # DATE_ 2 -> 2000, DATE_ 11 -> 2009
            pop_by_place_year.setdefault(f"{st}{place}", {})[year] = float(pop)

        rows = fetch_pep_2010s(state_fips, key)
        for row in rows[1:] if rows and rows[0][0] == "NAME" else rows:
            name, pop, date_code, date_code2, st, place = row
            code = int(date_code)
            year = 2010 + (code - 3)  # DATE_CODE 3 -> 2010, DATE_CODE 12 -> 2019
            pop_by_place_year.setdefault(f"{st}{place}", {})[year] = float(pop)

    print(f"PEP annual (2000-2019) fetched for {len(state_fips_needed)} states.", file=sys.stderr)

    for year in ACS5_YEARS:
        for state_fips in state_fips_needed:
            rows = fetch_acs5(state_fips, year, key)
            for row in rows[1:] if rows and rows[0][0] == "NAME" else rows:
                name, pop, st, place = row
                if pop not in (None, "null"):
                    pop_by_place_year.setdefault(f"{st}{place}", {})[year] = float(pop)
        print(f"ACS5 {year} vintage fetched for {len(state_fips_needed)} states.", file=sys.stderr)

    ALL_YEARS = list(range(2001, 2010)) + list(range(2010, 2020)) + ACS5_YEARS

    records = {}
    for city in cities:
        cw = crosswalk.get(city["id"])
        if not cw:
            continue
        by_year = pop_by_place_year.get(cw["place_fips"])
        if not by_year:
            continue

        years_data = {}
        for year in ALL_YEARS:
            if year not in by_year or (year - 1) not in by_year:
                continue
            prev_pop, this_pop = by_year[year - 1], by_year[year]
            if prev_pop <= 0:
                continue
            pct_change = round((this_pop - prev_pop) / prev_pop * 100, 2)
            concern = 0.0 if pct_change >= 0 else round(min(100.0, (abs(pct_change) / DECLINE_PCT_CAP) * 100.0), 1)
            years_data[str(year)] = {"population": round(this_pop), "pct_change": pct_change, "concern": concern}

        if years_data:
            records[city["id"]] = {"years": years_data}

    records["_meta"] = {
        "source": "Census PEP (2000/pep/int_population + 2019/pep/population, real annual, 2001-2019) and Census ACS5 vintage-year population (B01003, 2020-2023)",
        "method": "year-over-year % population change; 2020+ compares overlapping ACS5 5-year-window vintages, not true annual snapshots -- a real, disclosed seam",
        "decline_pct_cap_for_100_concern": DECLINE_PCT_CAP,
        "years": ALL_YEARS,
        "coverage": len(records),
    }

    (ROOT / "data/population-change.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/population-change.json: {covered}/{len(cities)} covered (any year).", file=sys.stderr)

    all_changes = [y["pct_change"] for cid, r in records.items() if cid != "_meta" for y in r["years"].values()]
    if all_changes:
        all_changes.sort()
        print(
            f"pct_change range across all city-years: min={all_changes[0]} median={all_changes[len(all_changes)//2]} max={all_changes[-1]}",
            file=sys.stderr,
        )
        clamped = sum(1 for c in all_changes if c < -DECLINE_PCT_CAP)
        print(f"{clamped}/{len(all_changes)} city-years clamp to 100 concern (decline steeper than {DECLINE_PCT_CAP}%)", file=sys.stderr)


if __name__ == "__main__":
    main()
