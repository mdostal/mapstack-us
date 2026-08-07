#!/usr/bin/env python3
"""
Builds data/hate-crime.json -- real FBI hate crime statistics, ddr4-1
(data-drive-round-4 epic). Resolves a lead deferred across THREE prior
research rounds this session -- the blocker was never the offense code
(every guess against crime.ts's summarized/agency/{ori}/{offense} shape
failed with a real "offense is missing or not a valid one" error); hate
crime is a genuinely separate resource tree with its own {bias} path
parameter. Found by rendering the FBI CDE's own JS-based API docs page
(cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi) via a real browser --
unreadable via plain curl, which is exactly why 3 rounds of guessing the
endpoint shape never found it.

Real endpoint: GET /hate-crime/agency/{ori}/{bias} -- bias=all (confirmed
via the docs page's own Enum Info panel) returns every bias category's
incident count. sum(incident_section.bias.values()) = the real total
hate crime incident count for that agency/year (confirmed live: NYC 2023
= 624 incidents).

Reuses data/raw/crime-agency-matches.json (509 real city->ORI mappings
already built for crime.ts) and that build's cached per-agency population
data (data/raw/crime-offense-cache/{ori}_violent-crime_{year}.json) --
zero new crosswalk or population fetch needed.

Raw direction: higher rate is more concerning -- direct rescale of real
incidents per 100k population, capped at a data-informed ceiling (see
printed distribution below), same shape as unemployment.ts's direct
rescale for a real, bounded-in-practice rate.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/hate-crime-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
CRIME_CACHE_DIR = ROOT / "data/raw/crime-offense-cache"

PREFERRED_YEAR = 2023
FALLBACK_YEARS = [2024, 2025, 2022, 2021, 2020]  # nearest-first, for agencies with no 2023 cache
RATE_CAP = 15.0  # real incidents per 100k -- see printed distribution below


def load_dotenv(path):
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


load_dotenv(ROOT / ".env")
API_KEY = os.environ.get("FBI_CRIME_API_KEY")
if not API_KEY:
    print("FBI_CRIME_API_KEY not set (checked environment and .env).", file=sys.stderr)
    sys.exit(1)


def fetch_hate_crime(ori, year):
    cache_file = CACHE_DIR / f"{ori}_{year}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = f"https://api.usa.gov/crime/fbi/cde/hate-crime/agency/{ori}/all?from=01-{year}&to=12-{year}&api_key={API_KEY}"
    result = subprocess.run(["curl", "-s", "--max-time", "20", url], capture_output=True, check=True)
    try:
        data = json.loads(result.stdout.decode("utf-8"))
    except json.JSONDecodeError:
        data = {}
    cache_file.write_text(json.dumps(data))
    return data


def real_population_and_year(ori, agency_name):
    """Reuses crime.ts's own cached population data instead of a new
    fetch. Prefers PREFERRED_YEAR, but falls back to whichever year that
    ORI actually has real cached NIBRS population data for -- an agency
    that joined NIBRS reporting after 2023 (a real, documented pattern in
    crime-methodology.md) has no 2023 cache, but does have a real cache
    for whatever year it started reporting in."""
    for year in [PREFERRED_YEAR, *FALLBACK_YEARS]:
        cache_file = CRIME_CACHE_DIR / f"{ori}_violent-crime_{year}.json"
        if not cache_file.exists():
            continue
        data = json.loads(cache_file.read_text())
        pop_series = data.get("populations", {}).get("population", {}).get(agency_name)
        if pop_series:
            values = [v for v in pop_series.values() if v]
            if values:
                return values[0], year
    return None, None


def main():
    matches = json.loads((ROOT / "data/raw/crime-agency-matches.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    unmatched = []
    for i, city in enumerate(cities):
        agency = matches.get(city["id"])
        if not agency:
            unmatched.append(city["id"])
            continue
        ori = agency["ori"]
        population, year = real_population_and_year(ori, agency["agency_name"])
        if not population:
            unmatched.append(city["id"])
            continue

        hc_data = fetch_hate_crime(ori, year)
        incidents = sum(hc_data.get("incident_section", {}).get("bias", {}).values()) if hc_data else 0
        rate = round(incidents / population * 100000, 2)
        score = round(min(100.0, (rate / RATE_CAP) * 100.0), 1)
        records[city["id"]] = {
            "incidents": incidents,
            "rate_per_100k": rate,
            "agency_name": agency["agency_name"],
            "year": year,
            "score": score,
        }
        if (i + 1) % 50 == 0:
            print(f"  [{i + 1}/{len(cities)}] cities fetched", file=sys.stderr)

    covered = len(records)
    result = {
        "_meta": {
            "source": "FBI Crime Data Explorer, hate crime statistics (voluntary agency reporting, real year per agency -- see each record's own year field)",
            "rate_cap_for_100_score": RATE_CAP,
            "coverage": covered,
        },
        **records,
    }
    (ROOT / "data/hate-crime.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/hate-crime.json: {covered}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched ({len(unmatched)}): {unmatched}", file=sys.stderr)

    rates = sorted(r["rate_per_100k"] for r in records.values())
    if rates:
        zero = sum(1 for r in rates if r == 0)
        print(f"rate/100k range: min={rates[0]} median={rates[len(rates)//2]} max={rates[-1]}; {zero} cities with zero reported incidents", file=sys.stderr)


if __name__ == "__main__":
    main()
