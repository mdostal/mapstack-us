#!/usr/bin/env python3
"""
Step 2 of the natural-hazard-risk dataset build: fetch every US county's
FEMA National Risk Index scores (free, keyless ArcGIS FeatureServer --
NOT the Cloudflare/Akamai-gated fema.gov/hazards.fema.gov download pages,
which 403 automated requests; this is the same underlying data, served by
FEMA's own ArcGIS Hub item 39485e8035d446a5bff03259508ae355), then join
each spine city to its county via data/raw/city-county-fips.json (built by
geocode_city_counties.py) and write data/hazard.json.

Source: FEMA National Risk Index, December 2025 release (v1.20).
https://hazards.fema.gov/nri/data-resources

Reports 4 layers, all already on a 0-100 "higher = more concerning" scale
(FEMA's own Risk Index Score, no re-normalization needed):
  - risk: composite risk across all 18 hazards FEMA models
  - inland_flood, coastal_flood, wildfire: individual hazard sub-scores,
    kept SEPARATE rather than blended into risk -- same "don't invent a
    weighting" principle crime.ts uses for violent vs. property crime.
    coastal_flood is honestly null (not zero) for landlocked counties --
    FEMA itself marks these "Not Applicable", not "no risk".

County-level, not city-level -- every spine city inherits its whole
county's score, which real blurs risk for a small town far from its
county seat. A real, documented limitation, not a data gap to silently
paper over (see data/hazard-methodology.md).
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_FILE = ROOT / "data/raw/nri-counties.json"

FIELDS = "STCOFIPS,COUNTY,STATE,RISK_SCORE,RISK_RATNG,IFLD_RISKS,IFLD_RISKR,CFLD_RISKS,CFLD_RISKR,WFIR_RISKS,WFIR_RISKR"
BASE_URL = "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query"


def fetch_json(url, retries=4):
    last_err = None
    for attempt in range(retries):
        try:
            result = subprocess.run(
                ["curl", "-s", "--max-time", "60", url], capture_output=True, text=True, check=True
            )
            return json.loads(result.stdout)
        except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    raise last_err


def fetch_all_counties():
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text())

    all_rows = []
    offset = 0
    page_size = 1000
    while True:
        url = (
            f"{BASE_URL}?where=1=1&outFields={FIELDS}&returnGeometry=false"
            f"&resultOffset={offset}&resultRecordCount={page_size}&f=json"
        )
        data = fetch_json(url)
        features = data.get("features", [])
        all_rows.extend(f["attributes"] for f in features)
        print(f"  fetched {len(all_rows)} counties so far", file=sys.stderr)
        if not data.get("exceededTransferLimit") or not features:
            break
        offset += page_size
        time.sleep(0.2)

    CACHE_FILE.write_text(json.dumps(all_rows, indent=2))
    return all_rows


def main():
    counties = fetch_all_counties()
    by_fips = {c["STCOFIPS"]: c for c in counties}
    print(f"Loaded {len(by_fips)} counties from FEMA NRI.", file=sys.stderr)

    city_fips = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    out = {}
    unmatched = []
    for city in cities:
        cid = city["id"]
        fips_info = city_fips.get(cid)
        if not fips_info:
            unmatched.append(cid)
            continue
        county = by_fips.get(fips_info["stcofips"])
        if not county:
            unmatched.append(cid)
            continue

        out[cid] = {
            "county": county["COUNTY"],
            "state": county["STATE"],
            "stcofips": fips_info["stcofips"],
            "risk_score": round(county["RISK_SCORE"], 1) if county["RISK_SCORE"] is not None else None,
            "risk_rating": county["RISK_RATNG"],
            "inland_flood_score": round(county["IFLD_RISKS"], 1) if county["IFLD_RISKS"] is not None else None,
            "inland_flood_rating": county["IFLD_RISKR"],
            "coastal_flood_score": round(county["CFLD_RISKS"], 1) if county["CFLD_RISKS"] is not None else None,
            "coastal_flood_rating": county["CFLD_RISKR"],
            "wildfire_score": round(county["WFIR_RISKS"], 1) if county["WFIR_RISKS"] is not None else None,
            "wildfire_rating": county["WFIR_RISKR"],
        }

    result = {
        "_meta": {
            "source": "FEMA National Risk Index, December 2025 release (v1.20)",
            "source_url": "https://hazards.fema.gov/nri/data-resources",
            "resolution": "county",
        },
        **out,
    }
    (ROOT / "data/hazard.json").write_text(json.dumps(result, indent=2))
    print(f"Wrote data/hazard.json: {len(out)}/{len(cities)} cities matched to a county.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched: {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
