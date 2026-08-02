#!/usr/bin/env python3
"""
Step 1 of the crime dataset build: fetch every law-enforcement agency for
each state in the 168-city spine from the real FBI Crime Data Explorer API
(https://api.usa.gov/crime/fbi/cde/agency/byStateAbbr/<ST>), and fuzzy-match
each spine city to its real municipal police department ORI code.

Requires FBI_CRIME_API_KEY, read from the environment or from a local,
gitignored .env file at the repo root (KEY=VALUE, one per line) -- a free
key from https://api.data.gov/signup/. This script is run ONCE, locally,
at data-generation time; the key is never referenced by any shipped app
code and never committed anywhere.

Caches each state's raw agency list to data/raw/crime-cache/ so re-runs
(e.g. after fixing a match) don't re-hit the API.
"""
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/crime-cache"


def load_dotenv(path):
    """Tiny, dependency-free .env loader -- sets os.environ for any
    KEY=VALUE line not already set in the real environment. Avoids adding
    a pip dependency for a single local, one-off script's convenience."""
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


def fetch_json(url):
    # subprocess to curl, not urllib -- this machine's Python.org build
    # doesn't pick up the system CA bundle, causing a cert-verify failure
    # urllib can't work around without extra setup; curl already works.
    result = subprocess.run(["curl", "-s", url], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def agencies_for_state(state_abbr):
    cache_file = CACHE_DIR / f"{state_abbr}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = f"https://api.usa.gov/crime/fbi/cde/agency/byStateAbbr/{state_abbr}?api_key={API_KEY}"
    data = fetch_json(url)
    cache_file.write_text(json.dumps(data))
    time.sleep(0.3)
    return data


def normalize(name):
    name = name.lower()
    name = re.sub(r"[.,]", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


# Common real-world naming variants a straight "<city> police department"
# match misses -- consolidated city-county departments, sheriff's offices
# that are the actual primary law enforcement for a city, etc. Each verified
# directly against the real fetched agency list for that state (see
# data/raw/crime-cache/<ST>.json), not guessed blind.
CITY_NAME_OVERRIDES = {
    "new-york-ny": "new york city police department",
    "nashville-tn": "metropolitan nashville police department",
    "louisville-ky": "louisville metro police department",
    "indianapolis-in": "indianapolis police department",
    "las-vegas-nv": "las vegas metropolitan police department",
    "saint-paul-mn": "st paul police department",
    # No municipal police department -- Augusta-Richmond County is a
    # consolidated city-county government policed by its sheriff's office,
    # the real primary law enforcement agency for the city.
    "augusta-ga": "augusta-richmond county sheriff's office",
}

# Genuinely no matching agency in the FBI's own agency list -- these are
# small reference towns (kept in the city spine for climate/geographic
# diversity, not population) that don't appear to have their own
# NIBRS-participating police department. A real, honest data gap, not a
# bug: these cities simply have no crime layer data, same as any other
# real "not available" case in this project.
NO_AGENCY_FOUND = {"sundance-wy", "monticello-ut", "geraldine-mt"}


def best_agency_match(city_name, state_agencies_by_county):
    all_agencies = [a for agencies in state_agencies_by_county.values() for a in agencies]
    target = normalize(city_name) + " police department"
    for agency in all_agencies:
        if normalize(agency["agency_name"]) == target:
            return agency
    # loose containment fallback
    city_norm = normalize(city_name)
    candidates = [
        a
        for a in all_agencies
        if city_norm in normalize(a["agency_name"]) and "police" in normalize(a["agency_name"])
        and a.get("agency_type_name") in ("City", "Municipal Police", "County")
    ]
    if len(candidates) == 1:
        return candidates[0]
    return None


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    states = sorted({c["state"] for c in cities})
    print(f"Fetching agency lists for {len(states)} states...")
    agencies_by_state = {}
    for state in states:
        agencies_by_state[state] = agencies_for_state(state)
        print(f"  {state}: {sum(len(v) for v in agencies_by_state[state].values())} agencies")

    matches = {}
    unmatched = []
    for city in cities:
        if city["id"] in NO_AGENCY_FOUND:
            continue

        override_key = CITY_NAME_OVERRIDES.get(city["id"])
        agencies = agencies_by_state[city["state"]]
        if override_key:
            all_agencies = [a for lst in agencies.values() for a in lst]
            match = next((a for a in all_agencies if override_key in normalize(a["agency_name"])), None)
        else:
            match = best_agency_match(city["city"], agencies)

        if match:
            matches[city["id"]] = {
                "ori": match["ori"],
                "agency_name": match["agency_name"],
                "is_nibrs": match["is_nibrs"],
                "nibrs_start_date": match.get("nibrs_start_date"),
            }
        else:
            unmatched.append(f"{city['city']}, {city['state']} ({city['id']})")

    (ROOT / "data/raw/crime-agency-matches.json").write_text(json.dumps(matches, indent=2) + "\n")
    print(f"\nMatched {len(matches)}/{len(cities)} cities to a real agency ORI.")
    print(f"No agency found at all (real gap, kept as no-data): {sorted(NO_AGENCY_FOUND)}")
    if unmatched:
        print(f"Unmatched -- needs a CITY_NAME_OVERRIDES entry ({len(unmatched)}):")
        for u in unmatched:
            print(f"  - {u}")


if __name__ == "__main__":
    main()
