#!/usr/bin/env python3
"""
Step 2 of the crime dataset build: for every city matched to a real FBI
agency ORI (data/raw/crime-agency-matches.json, from
fetch_crime_agencies.py), fetch REAL MULTI-YEAR violent-crime and
property-crime monthly offense counts + agency population from the FBI
Crime Data Explorer API, compute an honest annual rate per 100k for each
year, and build data/crime.json -- a real year-by-year history, not just
one snapshot, per explicit user direction that every dataset should carry
"dates and years and historical data like the allergy one."

YEARS below are the years actually attempted. Real coverage grows over
time as more agencies join NIBRS, so EARLIER years cover fewer cities than
2024 -- an expected, honestly-reported property of real reporting history,
not a bug. An agency not NIBRS-reporting, or reporting for only PART of a
given year, gets NO score for that year. No estimation, no fabrication.

Two independent layers (violent crime, property crime) per year, not one
blended score -- deliberately not inventing a weighting between them,
matching the existing multi-layer pattern (care-access has 3 layers)
rather than a forced composite this project has no criminological basis
to justify.

Concern score (0-100) is a PERCENTILE RANK of the real annual rate among
THAT YEAR's own covered cities, not an absolute severity claim, and not
comparable across years (each year's percentile is relative to that
year's own covered-city set, which changes size year to year) --
documented explicitly in crime-methodology.md.

Requires FBI_CRIME_API_KEY, read from the environment or from a local,
gitignored .env file at the repo root. Run once, locally; the key never
touches shipped app code.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/crime-offense-cache"


def load_dotenv(path):
    """Tiny, dependency-free .env loader -- see fetch_crime_agencies.py's
    identical helper for why this isn't a pip dependency."""
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
YEARS = list(range(2010, 2026))  # 16 years -- extended from the original 2020-2025
# per explicit user request for "the last 10-20 years." Live-verified against
# the real FBI API before extending: agencies with long NIBRS history return
# real data back to at least 1985 (1975 hits a real API format floor, not
# just sparse data). Real per-year coverage across the matched-agency
# crosswalk, checked before committing to this range: 2010=27%, 2015=32%,
# 2018=36%, 2020=49%, 2023=86% -- growing coverage over time is expected and
# disclosed, not a bug (same as the original 2020-2025 range's own caveat).

if not API_KEY:
    print("FBI_CRIME_API_KEY not set (checked environment and .env).", file=sys.stderr)
    sys.exit(1)


def fetch_json(url, retries=4):
    """A run this size (~5,090 requests at current scale) will hit an
    occasional transient network/API timeout -- retry with backoff instead
    of letting one blip kill a multi-hour run. Every successful response is
    cached to disk before this returns, so a retry (or a later full re-run)
    never redoes completed work."""
    last_err = None
    for attempt in range(retries):
        try:
            result = subprocess.run(
                ["curl", "-s", "--max-time", "30", url], capture_output=True, text=True, check=True
            )
            return json.loads(result.stdout)
        except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    raise last_err


def fetch_offense(ori, offense, year):
    cache_file = CACHE_DIR / f"{ori}_{offense}_{year}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = (
        f"https://api.usa.gov/crime/fbi/cde/summarized/agency/{ori}/{offense}"
        f"?from=01-{year}&to=12-{year}&api_key={API_KEY}"
    )
    data = fetch_json(url)
    cache_file.write_text(json.dumps(data))
    time.sleep(0.25)
    return data


def annual_rate(data, agency_name):
    """Real annual rate per 100k = sum(12 real monthly counts) / population
    * 100000 -- computed from raw actuals, not by averaging already-rounded
    monthly rates (which would compound rounding error). Returns None if
    fewer than 12 months of actual data exist for this agency+year (a
    partial-year agency, e.g. one that started NIBRS reporting mid-year,
    or a year before it started reporting at all)."""
    try:
        actuals_key = f"{agency_name} Offenses"
        actuals = data["offenses"]["actuals"][actuals_key]
        pop_by_month = data["populations"]["population"][agency_name]
    except KeyError:
        return None

    months_present = [m for m in actuals if actuals[m] is not None]
    if len(months_present) < 12:
        return None

    total_offenses = sum(actuals.values())
    population = list(pop_by_month.values())[0]
    if not population:
        return None
    return round(total_offenses / population * 100000, 1)


def percentile_ranks(values_by_id):
    """0-100 concern score: this city's percentile rank among cities that
    HAVE data for this layer/year -- a relative comparison, not an
    absolute severity claim, and not comparable across years since the
    covered-city set changes size year to year."""
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    ranks = {}
    for i, cid in enumerate(ids_sorted):
        ranks[cid] = round(i / max(n - 1, 1) * 100, 1)
    return ranks


def agency_covered_for_year(agency, year):
    """Real NIBRS start-date check, per year: an agency covers a given
    year only if it was already NIBRS-reporting at the start of it."""
    if not agency["is_nibrs"] or not agency["nibrs_start_date"]:
        return False
    return agency["nibrs_start_date"] <= f"{year}-01-01"


def main():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    matches = json.loads((ROOT / "data/raw/crime-agency-matches.json").read_text())

    per_year_data = {}  # year -> {"violent": {city_id: rate}, "property": {...}}
    for year in YEARS:
        violent_rates, property_rates = {}, {}
        for city_id, agency in matches.items():
            if not agency_covered_for_year(agency, year):
                continue
            v_rate = annual_rate(fetch_offense(agency["ori"], "violent-crime", year), agency["agency_name"])
            p_rate = annual_rate(fetch_offense(agency["ori"], "property-crime", year), agency["agency_name"])
            if v_rate is not None:
                violent_rates[city_id] = v_rate
            if p_rate is not None:
                property_rates[city_id] = p_rate
        per_year_data[year] = {
            "violent": (violent_rates, percentile_ranks(violent_rates)),
            "property": (property_rates, percentile_ranks(property_rates)),
        }
        print(f"{year}: {len(violent_rates)} cities w/ violent-crime data, {len(property_rates)} w/ property-crime data.")

    out = {
        "_meta": {
            "description": "US crime rates per city, 2 layers (violent, property), by year, from the FBI Crime Data Explorer API.",
            "years": YEARS,
            "method": "Annual rate per 100k = sum of 12 real monthly offense counts / agency population * 100000. Concern score (0-100) is a PERCENTILE RANK among that YEAR's own covered cities -- a relative comparison, not an absolute severity claim, and not comparable across years.",
            "source": "FBI Crime Data Explorer (cde.ucr.cjis.gov), U.S. government public domain data.",
            "coverage_by_year": {
                str(year): {
                    "violent_crime": len(per_year_data[year]["violent"][0]),
                    "property_crime": len(per_year_data[year]["property"][0]),
                }
                for year in YEARS
            },
            "caveat": "Real coverage GROWS over time as more agencies join NIBRS -- earlier years genuinely cover fewer cities than 2024, an honest property of real reporting history, not a bug. Some agencies (including several large cities) don't participate in NIBRS at all, or only began reporting partway through a given year. Those city/year/layer combinations have NO score, never a fabricated or estimated one. See crime-methodology.md.",
        }
    }

    all_city_ids = {cid for year in YEARS for layer in ("violent", "property") for cid in per_year_data[year][layer][0]}
    for city_id in sorted(all_city_ids):
        entry = {"agency_name": matches[city_id]["agency_name"], "ori": matches[city_id]["ori"], "years": {}}
        for year in YEARS:
            year_entry = {}
            v_rates, v_ranks = per_year_data[year]["violent"]
            p_rates, p_ranks = per_year_data[year]["property"]
            if city_id in v_rates:
                year_entry["violent_crime"] = {"rate_per_100k": v_rates[city_id], "concern": v_ranks[city_id]}
            if city_id in p_rates:
                year_entry["property_crime"] = {"rate_per_100k": p_rates[city_id], "concern": p_ranks[city_id]}
            if year_entry:
                entry["years"][str(year)] = year_entry
        out[city_id] = entry

    (ROOT / "data/crime.json").write_text(json.dumps(out, indent=2) + "\n")
    print(f"\nWrote data/crime.json for {len(all_city_ids)} cities across {len(YEARS)} years.")


if __name__ == "__main__":
    main()
