#!/usr/bin/env python3
"""
Builds the food-access dataset: fetches USDA ERS's Food Access Research
Atlas (FARA, now also called the Large Retailer Access Map/LRAM), a free
direct CSV/ZIP download requiring no API key or account, then joins it to
every spine city via a 2010-vintage census tract crosswalk
(data/raw/city-tract-fips-2010.json, built by geocode_city_tracts_2010.py).

NOT the same tract crosswalk the social-vulnerability dataset uses
(data/raw/city-tract-fips.json, current/2020-vintage tracts) -- a real
mismatch found live: FARA's tract boundaries are frozen at the 2010
census, and tracts get split/merged/renumbered between the 2010 and 2020
census (e.g. LA's own coordinate resolves to a DIFFERENT tract GEOID
under each vintage). Reusing the current-vintage crosswalk here silently
looked like ~25% of the spine had no food-access data, when it was
actually a boundary-vintage mismatch, not a real coverage gap. See
geocode_city_tracts_2010.py's own doc comment.

Source: USDA ERS Food Access Research Atlas, 2019 data (most recent
vintage as of this build -- FARA's core data hasn't been refreshed past
2019 despite later site rebrands).
https://www.ers.usda.gov/data-products/food-access-research-atlas

Reports 2 layers, both "higher = more concerning" already (share of a
population living far from a supermarket), rescaled from FARA's native
0-100 percentage (no change needed, already 0-100) -- kept SEPARATE
rather than blended, same "don't invent a weighting" principle as every
other multi-layer dataset here:
  - low_access: % of the WHOLE tract population living >0.5 mile (urban)
    from the nearest large supermarket/grocery -- FARA's standard
    "low access" definition.
  - low_income_low_access: % of the LOW-INCOME population specifically
    living >0.5 mile away -- the more targeted "food desert" equity
    measure, a real, distinct quantity from the tract-wide share above.

A real minority of tracts have FARA's own null (no population base to
compute a share) -- preserved as an honest null, never coerced to 0.
"""
import csv
import io
import json
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_FILE = ROOT / "data/raw/food-access-cache/fara-2019.csv"
CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

FARA_URL = (
    "https://www.ers.usda.gov/media/5627/"
    "2019-large-retailer-access-map-lram-formerly-known-as-the-food-access-research-atlas-fara-data.zip?v=16251"
)


def fetch_fara_csv() -> str:
    if CACHE_FILE.exists():
        return CACHE_FILE.read_text()

    result = subprocess.run(
        ["curl", "-s", "--max-time", "120", "-A", "Mozilla/5.0", FARA_URL],
        capture_output=True, check=True,
    )
    with zipfile.ZipFile(io.BytesIO(result.stdout)) as zf:
        csv_name = next(n for n in zf.namelist() if n.endswith(".csv") and "Atlas" in n)
        text = zf.read(csv_name).decode("utf-8")
    CACHE_FILE.write_text(text)
    return text


def parse_share(raw: str) -> float | None:
    if raw in ("NULL", "", None):
        return None
    return round(float(raw), 1)


def main():
    csv_text = fetch_fara_csv()
    reader = csv.DictReader(io.StringIO(csv_text))
    by_tract = {}
    for row in reader:
        # FARA's CensusTract column is exported as a plain number, so
        # single-digit state FIPS codes (e.g. Alabama = 01) lose their
        # leading zero -- re-pad to the real 11-digit tract FIPS so this
        # matches the Census Geocoder's own GEOID format used everywhere
        # else (city-tract-fips.json). Found live: without this, only
        # tracts in double-digit-state-FIPS states (10-56) matched at all.
        tract_fips = row["CensusTract"].zfill(11)
        by_tract[tract_fips] = {
            "low_access": parse_share(row["lapophalfshare"]),
            "low_income_low_access": parse_share(row["lalowihalfshare"]),
        }
    print(f"Loaded {len(by_tract)} tracts from FARA.", file=sys.stderr)

    city_tracts = json.loads((ROOT / "data/raw/city-tract-fips-2010.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    out = {}
    unmatched = []
    for city in cities:
        cid = city["id"]
        tract_info = city_tracts.get(cid)
        if not tract_info:
            unmatched.append(cid)
            continue
        record = by_tract.get(tract_info["tract_fips"])
        if not record:
            unmatched.append(cid)
            continue
        out[cid] = {"tract": tract_info["tract_name"], **record}

    result = {
        "_meta": {
            "source": "USDA ERS Food Access Research Atlas, 2019 data",
            "source_url": "https://www.ers.usda.gov/data-products/food-access-research-atlas",
            "resolution": "census tract",
        },
        **out,
    }
    (ROOT / "data/food-access.json").write_text(json.dumps(result, indent=2))
    print(f"Wrote data/food-access.json: {len(out)}/{len(cities)} cities matched to a FARA tract record.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched: {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
