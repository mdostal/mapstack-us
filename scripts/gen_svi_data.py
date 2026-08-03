#!/usr/bin/env python3
"""
Step 2 of the social-vulnerability-index dataset build: fetch each spine
city's CDC/ATSDR Social Vulnerability Index (SVI) 2022 tract record from
CDC's own free, keyless ArcGIS FeatureServer (onemap.cdc.gov), then write
data/svi.json.

Reuses the tract FIPS already extracted by extract_city_tracts.py (itself
a zero-network re-parse of geocode_city_counties.py's cached responses) --
only the ~511 tracts the spine actually needs are fetched, not all 84,120
US tracts, via batched `WHERE FIPS IN (...)` POST queries (well under the
service's 2000-row page limit either way, but this avoids an unnecessary
~43-page full-table fetch).

Source: CDC/ATSDR SVI 2022 (most recent release researched).
https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html

Reports 5 layers, RPL_THEMES/RPL_THEME1-4 rescaled from SVI's native 0-1
percentile fraction to Mapstack's 0-100 "higher = more concerning" scale
(SVI is already framed that direction -- higher percentile = more
vulnerable -- so this is pure rescaling, no inversion):
  - overall: the composite RPL_THEMES
  - socioeconomic, household, minority_language, housing_transport: the 4
    sub-themes, kept SEPARATE (same "don't invent a weighting" principle
    as crime.ts and hazard.ts) rather than re-blended into the composite.

SVI uses -999 as an explicit "data suppressed/unreliable" sentinel for
tracts with too small a population base -- treated as a real, honest null,
never coerced to 0.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/svi-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

QUERY_URL = "https://onemap.cdc.gov/onemapservices/rest/services/SVI/CDC_ATSDR_Social_Vulnerability_Index_2022_USA/FeatureServer/8/query"
FIELDS = "FIPS,STATE,COUNTY,LOCATION,RPL_THEMES,RPL_THEME1,RPL_THEME2,RPL_THEME3,RPL_THEME4"
BATCH_SIZE = 100


def fetch_batch(fips_batch, batch_index):
    cache_file = CACHE_DIR / f"batch-{batch_index}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    fips_clause = ",".join(f"'{f}'" for f in fips_batch)
    last_err = None
    for attempt in range(4):
        try:
            result = subprocess.run(
                [
                    "curl", "-s", "--max-time", "60", "-X", "POST", QUERY_URL,
                    "--data-urlencode", f"where=FIPS IN ({fips_clause})",
                    "--data-urlencode", f"outFields={FIELDS}",
                    "--data-urlencode", "returnGeometry=false",
                    "--data-urlencode", "f=json",
                ],
                capture_output=True, text=True, check=True,
            )
            data = json.loads(result.stdout)
            cache_file.write_text(json.dumps(data, indent=2))
            return data
        except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
            last_err = e
            if attempt < 3:
                time.sleep(2 ** attempt)
    raise last_err


def null_if_suppressed(value):
    # SVI's own -999 sentinel for suppressed/unreliable small-population
    # tracts -- a real, documented gap, never coerced to a fabricated 0.
    return None if value is None or value < 0 else round(value * 100, 1)


def main():
    city_tracts = json.loads((ROOT / "data/raw/city-tract-fips.json").read_text())
    unique_fips = sorted({v["tract_fips"] for v in city_tracts.values()})

    by_fips = {}
    for i in range(0, len(unique_fips), BATCH_SIZE):
        batch = unique_fips[i : i + BATCH_SIZE]
        data = fetch_batch(batch, i // BATCH_SIZE)
        for f in data.get("features", []):
            attrs = f["attributes"]
            by_fips[attrs["FIPS"]] = attrs
        print(f"  fetched batch {i // BATCH_SIZE + 1} ({len(by_fips)} tracts resolved so far)", file=sys.stderr)
        time.sleep(0.2)

    cities = json.loads((ROOT / "data/cities.json").read_text())
    out = {}
    unmatched = []
    for city in cities:
        cid = city["id"]
        tract_info = city_tracts.get(cid)
        if not tract_info:
            unmatched.append(cid)
            continue
        record = by_fips.get(tract_info["tract_fips"])
        if not record:
            unmatched.append(cid)
            continue

        out[cid] = {
            "tract": tract_info["tract_name"],
            "county": record["COUNTY"],
            "state": record["STATE"],
            "fips": tract_info["tract_fips"],
            "overall": null_if_suppressed(record["RPL_THEMES"]),
            "socioeconomic": null_if_suppressed(record["RPL_THEME1"]),
            "household": null_if_suppressed(record["RPL_THEME2"]),
            "minority_language": null_if_suppressed(record["RPL_THEME3"]),
            "housing_transport": null_if_suppressed(record["RPL_THEME4"]),
        }

    result = {
        "_meta": {
            "source": "CDC/ATSDR Social Vulnerability Index 2022",
            "source_url": "https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html",
            "resolution": "census tract",
        },
        **out,
    }
    (ROOT / "data/svi.json").write_text(json.dumps(result, indent=2))
    print(f"Wrote data/svi.json: {len(out)}/{len(cities)} cities matched to an SVI tract record.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched: {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
