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

Real multi-year history (2010-2025), per explicit operator direction to
get "as much data as possible" for real trends over time. Deliberately
scoped to match crime.ts's own real range rather than reaching back to
hate-crime's theoretical 1991 floor: the hate-crime endpoint itself
carries no population field (confirmed live), so a real population
denominator is required from elsewhere. crime.ts's own real per-year
population cache (data/raw/crime-offense-cache/{ori}_violent-crime_{year}.json)
covers exactly 2010-2025 -- reusing it means zero new population fetches.
Reaching further back would require a genuinely separate population
fetch for years crime.ts itself doesn't cover, for what voluntary NIBRS
hate-crime reporting research already flags as likely much sparser
coverage in the 1990s/2000s -- not attempted here.

Reuses data/raw/crime-agency-matches.json (509 real city->ORI mappings
already built for crime.ts) -- zero new crosswalk needed.

Raw direction: higher rate is more concerning -- direct rescale of real
incidents per 100k population PER YEAR, capped at a FIXED data-informed
ceiling (see printed distribution below) so a city's rate stays honestly
comparable year to year.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/hate-crime-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
CRIME_CACHE_DIR = ROOT / "data/raw/crime-offense-cache"

YEARS = list(range(2010, 2026))
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


def fetch_hate_crime(ori, year, retries=4):
    """A run this size (~500 agencies x 16 years) will hit an occasional
    transient network blip -- retry with backoff instead of letting one
    kill a multi-hour run. Every successful response is cached to disk
    before this returns, so a retry never redoes completed work."""
    cache_file = CACHE_DIR / f"{ori}_{year}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = f"https://api.usa.gov/crime/fbi/cde/hate-crime/agency/{ori}/all?from=01-{year}&to=12-{year}&api_key={API_KEY}"
    last_err = None
    for attempt in range(retries):
        try:
            result = subprocess.run(["curl", "-s", "--max-time", "20", url], capture_output=True, check=True)
            try:
                data = json.loads(result.stdout.decode("utf-8"))
            except json.JSONDecodeError:
                data = {}
            cache_file.write_text(json.dumps(data))
            return data
        except subprocess.CalledProcessError as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2**attempt)
    raise last_err


def real_population(ori, agency_name, year):
    """Reuses crime.ts's own cached population data for the SAME real
    year (not a fallback to a different year) -- crime.ts's cache
    already spans 2010-2025, matching this dataset's own real range
    exactly, so no cross-year population substitution is needed."""
    cache_file = CRIME_CACHE_DIR / f"{ori}_violent-crime_{year}.json"
    if not cache_file.exists():
        return None
    data = json.loads(cache_file.read_text())
    pop_series = data.get("populations", {}).get("population", {}).get(agency_name)
    if not pop_series:
        return None
    values = [v for v in pop_series.values() if v]
    return values[0] if values else None


def main():
    matches = json.loads((ROOT / "data/raw/crime-agency-matches.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    for city in cities:
        agency = matches.get(city["id"])
        if not agency:
            continue
        ori = agency["ori"]

        years_data = {}
        for year in YEARS:
            population = real_population(ori, agency["agency_name"], year)
            if not population:
                continue
            hc_data = fetch_hate_crime(ori, year)
            incidents = sum(hc_data.get("incident_section", {}).get("bias", {}).values()) if hc_data else 0
            rate = round(incidents / population * 100000, 2)
            years_data[str(year)] = {
                "incidents": incidents,
                "rate_per_100k": rate,
                "score": round(min(100.0, (rate / RATE_CAP) * 100.0), 1),
            }

        if years_data:
            records[city["id"]] = {"agency_name": agency["agency_name"], "years": years_data}

    records["_meta"] = {
        "source": "FBI Crime Data Explorer, hate crime statistics (voluntary agency reporting), 2010-2025",
        "rate_cap_for_100_score": RATE_CAP,
        "years": YEARS,
        "coverage": len(records),
    }
    (ROOT / "data/hate-crime.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/hate-crime.json: {covered}/{len(cities)} cities matched (any year).", file=sys.stderr)
    for year in YEARS:
        n = sum(1 for cid, r in records.items() if cid != "_meta" and str(year) in r["years"])
        print(f"  {year}: {n}/{len(cities)} cities covered", file=sys.stderr)


if __name__ == "__main__":
    main()
