#!/usr/bin/env python3
"""
Step 2 of the crime dataset build: for every city matched to a real FBI
agency ORI (data/raw/crime-agency-matches.json, from
fetch_crime_agencies.py), fetch 2024 violent-crime and property-crime
monthly offense counts + agency population from the real FBI Crime Data
Explorer API, compute a real annual rate per 100k, and build
data/crime.json.

2024 chosen deliberately: per the FBI's own 2024 report, every city with
population >=1M provided a full year of NIBRS data that year, and overall
population coverage was >95% -- the best-covered recent year. Still, real
coverage gaps exist (see crime-methodology.md) -- an agency not
NIBRS-reporting, or reporting for only PART of 2024, gets NO score at all
for that layer. No estimation, no fabrication.

Two independent layers (violent crime, property crime), not one blended
score -- deliberately not inventing a weighting between them, matching the
existing multi-layer pattern (care-access has 3 layers) rather than a
forced composite this project has no criminological basis to justify.

Concern score (0-100) is a PERCENTILE RANK of the real annual rate among
this dataset's own covered cities, not an absolute severity claim --
documented explicitly in crime-methodology.md as a relative comparison,
not a claim about crime being "high" or "low" in any absolute sense.

Requires FBI_CRIME_API_KEY in the environment. Run once, locally; the key
never touches shipped app code.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/crime-offense-cache"
API_KEY = os.environ.get("FBI_CRIME_API_KEY")
YEAR = 2024

if not API_KEY:
    print("FBI_CRIME_API_KEY not set in environment.", file=sys.stderr)
    sys.exit(1)


def fetch_json(url):
    result = subprocess.run(["curl", "-s", url], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def fetch_offense(ori, offense):
    cache_file = CACHE_DIR / f"{ori}_{offense}_{YEAR}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = (
        f"https://api.usa.gov/crime/fbi/cde/summarized/agency/{ori}/{offense}"
        f"?from=01-{YEAR}&to=12-{YEAR}&api_key={API_KEY}"
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
    partial-year agency, e.g. one that started NIBRS reporting mid-year)."""
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
    HAVE data for this layer -- a relative comparison, not an absolute
    severity claim. Higher rate = higher (more concerning) percentile,
    consistent with this project's "higher = more concerning" convention."""
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    ranks = {}
    for i, cid in enumerate(ids_sorted):
        ranks[cid] = round(i / max(n - 1, 1) * 100, 1)
    return ranks


def main():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    matches = json.loads((ROOT / "data/raw/crime-agency-matches.json").read_text())

    violent_rates = {}
    property_rates = {}
    skipped = {"not_nibrs": [], "partial_year": []}

    for city_id, agency in matches.items():
        if not agency["is_nibrs"]:
            skipped["not_nibrs"].append(city_id)
            continue
        if not agency["nibrs_start_date"] or agency["nibrs_start_date"] > f"{YEAR}-01-01":
            skipped["partial_year"].append(city_id)
            continue

        violent_data = fetch_offense(agency["ori"], "violent-crime")
        property_data = fetch_offense(agency["ori"], "property-crime")
        v_rate = annual_rate(violent_data, agency["agency_name"])
        p_rate = annual_rate(property_data, agency["agency_name"])
        if v_rate is not None:
            violent_rates[city_id] = v_rate
        if p_rate is not None:
            property_rates[city_id] = p_rate

    violent_concern = percentile_ranks(violent_rates)
    property_concern = percentile_ranks(property_rates)

    out = {
        "_meta": {
            "description": "US crime rates per city, 2 layers (violent, property), from the FBI Crime Data Explorer API.",
            "year": YEAR,
            "method": "Annual rate per 100k = sum of 12 real monthly offense counts / agency population * 100000. Concern score (0-100) is a PERCENTILE RANK among this dataset's own covered cities -- a relative comparison, not an absolute severity claim.",
            "source": "FBI Crime Data Explorer (cde.ucr.cjis.gov), U.S. government public domain data.",
            "coverage": f"{len(violent_rates)}/{len(matches)} matched cities have full-year {YEAR} violent-crime data; {len(property_rates)}/{len(matches)} have property-crime data.",
            "caveat": "Real, documented coverage gaps exist -- some agencies (including several large cities) don't participate in NIBRS at all, or only began reporting partway through 2024. Those cities have NO score for the affected layer(s), never a fabricated or estimated one. See crime-methodology.md.",
        }
    }

    all_city_ids = set(violent_rates) | set(property_rates)
    for city_id in sorted(all_city_ids):
        entry = {"agency_name": matches[city_id]["agency_name"], "ori": matches[city_id]["ori"]}
        if city_id in violent_rates:
            entry["violent_crime"] = {"rate_per_100k": violent_rates[city_id], "concern": violent_concern[city_id]}
        if city_id in property_rates:
            entry["property_crime"] = {"rate_per_100k": property_rates[city_id], "concern": property_concern[city_id]}
        out[city_id] = entry

    (ROOT / "data/crime.json").write_text(json.dumps(out, indent=2) + "\n")

    print(f"Wrote data/crime.json: {len(violent_rates)} cities w/ violent-crime data, {len(property_rates)} w/ property-crime data.")
    print(f"Not NIBRS-participating: {len(skipped['not_nibrs'])} -- {skipped['not_nibrs']}")
    print(f"Partial-year 2024 coverage: {len(skipped['partial_year'])} -- {skipped['partial_year']}")


if __name__ == "__main__":
    main()
