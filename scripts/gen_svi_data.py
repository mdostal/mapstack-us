#!/usr/bin/env python3
"""
Step 2 of the social-vulnerability-index dataset build: fetch each spine
city's CDC/ATSDR Social Vulnerability Index (SVI) tract record, then
write data/svi.json. Extended to real multi-vintage history (ddr-svi-
extend, this session) -- CDC has published SVI seven times: 2000, 2010,
2014, 2016, 2018, 2020, 2022, not an annual series.

Real architecture change from the original single-vintage (2022) build:
found a SINGLE consolidated ArcGIS FeatureServer
(onemap.cdc.gov/onemapservices/rest/services/SVI/SVI_consolidated_data)
whose own service description says it "includes all SVI release years,
geographic levels... and percentile comparisons" -- confirmed live, one
query for a single real tract FIPS with no ReleaseYear filter returned
all 7 real vintages' rows at once. This replaces the original per-
vintage-specific-service approach entirely; every real year this dataset
covers comes from the SAME endpoint, filtered by `ReleaseYear`,
`GeoLevel='tract'`, `Comparison='national'`.

Real, CDC-documented tract-boundary generations (confirmed live via
atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html's
own "Data changes over time" section): SVI 2000 uses its own unique
2000-census tract boundaries; SVI 2010/2014/2016/2018 SHARE the same
2010-census tract boundaries; SVI 2020/2022 SHARE the same current
(2020-census) tract boundaries. This dataset already has BOTH the
2010-vintage crosswalk (`city-tract-fips-2010.json`, built for
food-access.ts) and the current-vintage crosswalk (`city-tract-
fips.json`, this dataset's own original crosswalk) -- so 2010/2014/
2016/2018 and 2020/2022 are all real, immediately reachable with ZERO
new crosswalk work. **2000 is a real, disclosed gap**: the Census
Geocoder's own `/geocoder/vintages` endpoint does not expose a
`Census2000_*` option (confirmed live, its real vintage list starts at
`Census2010_Current`) -- there is no equivalent third crosswalk
buildable with the same tool this project already uses for the other
two generations, so 2000 is left out rather than approximated with a
mismatched boundary vintage.

Reports 5 layers, the consolidated table's `Overall_SVI_Percentile`/
`ThemeN_Percentile` fields (already a 0-1 national percentile fraction,
matching the original build's RPL_THEMES/RPL_THEME1-4 semantics exactly)
rescaled to Mapstack's 0-100 "higher = more concerning" scale -- SVI is
already framed that direction, so this is pure rescaling, no inversion:
  - overall: the composite
  - socioeconomic, household, minority_language, housing_transport: the
    4 sub-themes, kept SEPARATE (same "don't invent a weighting"
    principle as crime.ts and hazard.ts) rather than re-blended.

A null/negative percentile is treated as SVI's real "data suppressed/
unreliable" signal for tracts with too small a population base -- a
real, honest null, never coerced to 0.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/svi-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

QUERY_URL = "https://onemap.cdc.gov/onemapservices/rest/services/SVI/SVI_consolidated_data/FeatureServer/0/query"
FIELDS = "ReleaseYear,FIPS,Overall_SVI_Percentile,Theme1_Percentile,Theme2_Percentile,Theme3_Percentile,Theme4_Percentile"
BATCH_SIZE = 100

# Real CDC-documented boundary generations -- see module docstring.
YEARS_2010_VINTAGE = [2010, 2014, 2016, 2018]
YEARS_CURRENT_VINTAGE = [2020, 2022]
YEARS = sorted(YEARS_2010_VINTAGE + YEARS_CURRENT_VINTAGE)


def fetch_batch(fips_batch, batch_index):
    cache_file = CACHE_DIR / f"consolidated-batch-{batch_index}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    fips_clause = ",".join(f"'{f}'" for f in fips_batch)
    last_err = None
    for attempt in range(4):
        try:
            result = subprocess.run(
                [
                    "curl", "-s", "--max-time", "60", "-X", "POST", QUERY_URL,
                    "--data-urlencode", f"where=FIPS IN ({fips_clause}) AND GeoLevel='tract' AND Comparison='national'",
                    "--data-urlencode", f"outFields={FIELDS}",
                    "--data-urlencode", "returnGeometry=false",
                    "--data-urlencode", "f=json",
                ],
                capture_output=True, text=True, check=True,
            )
            data = json.loads(result.stdout)
            if "error" in data:
                raise RuntimeError(data["error"])
            cache_file.write_text(json.dumps(data, indent=2))
            return data
        except (subprocess.CalledProcessError, json.JSONDecodeError, RuntimeError) as e:
            last_err = e
            if attempt < 3:
                time.sleep(2 ** attempt)
    raise last_err


def null_if_suppressed(value):
    # SVI's real suppressed/unreliable-small-population signal -- a real,
    # documented gap, never coerced to a fabricated 0.
    return None if value is None or value < 0 else round(value * 100, 1)


def main():
    city_tracts_2010 = json.loads((ROOT / "data/raw/city-tract-fips-2010.json").read_text())
    city_tracts_current = json.loads((ROOT / "data/raw/city-tract-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    unique_fips = sorted({v["tract_fips"] for v in city_tracts_2010.values()} | {v["tract_fips"] for v in city_tracts_current.values()})

    # by_year_fips[year][fips] = attrs
    by_year_fips = {y: {} for y in YEARS}
    for i in range(0, len(unique_fips), BATCH_SIZE):
        batch = unique_fips[i : i + BATCH_SIZE]
        data = fetch_batch(batch, i // BATCH_SIZE)
        for f in data.get("features", []):
            attrs = f["attributes"]
            year = attrs["ReleaseYear"]
            if year in by_year_fips:
                by_year_fips[year][attrs["FIPS"]] = attrs
        print(f"  fetched batch {i // BATCH_SIZE + 1} ({sum(len(v) for v in by_year_fips.values())} year-tract records resolved so far)", file=sys.stderr)
        time.sleep(0.2)

    records = {}
    for city in cities:
        cid = city["id"]
        years_data = {}
        for year in YEARS:
            crosswalk = city_tracts_2010 if year in YEARS_2010_VINTAGE else city_tracts_current
            tract_info = crosswalk.get(cid)
            if not tract_info:
                continue
            record = by_year_fips[year].get(tract_info["tract_fips"])
            if not record:
                continue
            years_data[str(year)] = {
                "tract": tract_info["tract_name"],
                "overall": null_if_suppressed(record["Overall_SVI_Percentile"]),
                "socioeconomic": null_if_suppressed(record["Theme1_Percentile"]),
                "household": null_if_suppressed(record["Theme2_Percentile"]),
                "minority_language": null_if_suppressed(record["Theme3_Percentile"]),
                "housing_transport": null_if_suppressed(record["Theme4_Percentile"]),
            }
        if years_data:
            records[cid] = {"years": years_data}

    records["_meta"] = {
        "source": "CDC/ATSDR Social Vulnerability Index (SVI), real published vintages 2010/2014/2016/2018/2020/2022",
        "source_url": "https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html",
        "resolution": "census tract",
        "years": YEARS,
        "coverage": len(records),
    }
    (ROOT / "data/svi.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/svi.json: {len(records)}/{len(cities)} cities matched (any vintage).", file=sys.stderr)


if __name__ == "__main__":
    main()
