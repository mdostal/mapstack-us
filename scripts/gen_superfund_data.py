#!/usr/bin/env python3
"""
Builds data/superfund.json -- real EPA Superfund/NPL site density,
ddr5-1 (data-drive-round-5 epic). Resolves a lead deferred since
dataset-verification-drive's addendum -- three prior attempts guessing
Envirofacts table names against the legacy efservice endpoint
(SEMS_SITE, SEMS_ACTIVE_SITES, CERCLIS, ...) all failed with real "table
not available" errors.

The real fix, found by reading EPA's own Envirofacts API documentation
page (epa.gov/enviro/envirofacts-data-service-api) directly via a
browser -- the same technique that resolved FBI hate crime in ddr4:
Envirofacts has a NEWER API base (data.epa.gov/dmapservice/, distinct
from the legacy efservice base every prior attempt used exclusively),
and table names require a real program prefix (sems.envirofacts_site,
not a bare SEMS_* name). Confirmed live: one request per state returns
every real assessed Superfund site, each with a real county fips_code
(reuses the existing city-county-fips.json crosswalk directly, unlike
the abandoned drinking-water attempt) and a real npl_status_code.

Counts real npl_status_code='F' (Final NPL -- the currently-active
Superfund site status, distinct from 'N' not-listed, 'D' deleted/
cleaned-up, 'P' proposed, or 'R' removed) sites per county.

Raw direction: higher count is more concerning -- direct rescale capped
at a data-informed ceiling (see printed distribution below).
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/superfund-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
    "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
    "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
    "WV", "WI", "WY",
]

COUNT_CAP = 8  # real p90 (7) across the 512-city spine, small pad -- see printed distribution below


def fetch_state(state, retries=4):
    cache_file = CACHE_DIR / f"{state}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    url = f"https://data.epa.gov/dmapservice/sems.envirofacts_site/fk_ref_state_code/equals/{state}"
    last_err = None
    for attempt in range(retries):
        try:
            result = subprocess.run(["curl", "-s", "--max-time", "45", url], capture_output=True, check=True)
            text = result.stdout.decode("utf-8", errors="replace")
            data = json.loads(text)
            cache_file.write_text(json.dumps(data))
            return data
        except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    raise last_err


def main():
    final_npl_by_county = {}
    total_sites = 0
    for i, state in enumerate(STATES):
        sites = fetch_state(state)
        if not isinstance(sites, list):
            sites = []
        total_sites += len(sites)
        for site in sites:
            if site.get("npl_status_code") != "F":
                continue
            fips = site.get("fips_code")
            if not fips:
                continue
            final_npl_by_county[fips] = final_npl_by_county.get(fips, 0) + 1
        print(f"  [{i + 1}/{len(STATES)}] {state}: {len(sites)} sites", file=sys.stderr)

    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    unmatched = []
    for city in cities:
        cid = city["id"]
        fips_info = city_county.get(cid)
        if not fips_info:
            unmatched.append(cid)
            continue
        count = final_npl_by_county.get(fips_info["stcofips"], 0)
        score = round(min(100.0, (count / COUNT_CAP) * 100.0), 1)
        records[cid] = {
            "final_npl_site_count": count,
            "county": fips_info["county_name"],
            "concern": score,
        }

    covered = len(records)
    result = {
        "_meta": {
            "source": "EPA Envirofacts SEMS (Superfund Enterprise Management System), Final NPL sites by county",
            "total_sites_assessed_nationally": total_sites,
            "count_cap_for_100_score": COUNT_CAP,
            "coverage": covered,
        },
        **records,
    }
    (ROOT / "data/superfund.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/superfund.json: {covered}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched ({len(unmatched)}): {unmatched}", file=sys.stderr)

    counts = sorted(r["final_npl_site_count"] for r in records.values())
    if counts:
        zero = sum(1 for c in counts if c == 0)
        print(f"Final NPL count range: min={counts[0]} median={counts[len(counts)//2]} max={counts[-1]}; {zero} cities with zero Final NPL sites in their county", file=sys.stderr)


if __name__ == "__main__":
    main()
