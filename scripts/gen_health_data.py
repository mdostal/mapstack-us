#!/usr/bin/env python3
"""
Step 2 of the health-outcomes dataset build: fetch each spine city's CDC
PLACES chronic-disease-prevalence measures from CDC's own free, keyless
Socrata API (data.cdc.gov), then write data/health.json.

Reuses the place FIPS already extracted by extract_city_places.py (itself
a zero-network re-parse of geocode_city_counties.py's cached responses) --
only the ~509 places the spine actually needs are fetched, via batched
`WHERE locationid IN (...)` queries, not the full 2.15M-row national
table.

Source: CDC PLACES (Population Level Analysis and Community Estimates),
place-level, "Age-adjusted prevalence" (%). https://www.cdc.gov/places/

Reports 5 layers, kept SEPARATE rather than blended into one composite
(same "don't invent a weighting" principle as crime.ts/hazard.ts/svi.ts).
All 5 are direction-obvious: higher prevalence of a chronic condition is
more concerning, no inversion needed (unlike several PROTECTIVE PLACES
measures -- e.g. "Annual Checkup", "Mammography" -- deliberately NOT
picked here, since higher there means LESS concerning and would need a
real inversion decision this dataset doesn't attempt).

A real per-place vintage gap found live: not every place reports every
year -- e.g. Philadelphia, Louisville, and Pittsburgh's PLACES rows exist
only for 2022, not the newer 2023 release most places have. Fetches BOTH
years and prefers 2023, falling back to 2022 per (place, measure) pair
that's missing in 2023 -- same "prefer latest, document the exception"
posture crime.ts uses for agencies that joined NIBRS late. The actual
year used is recorded per measure, not silently normalized away.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/health-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

QUERY_URL = "https://data.cdc.gov/resource/eav7-hnsx.json"
YEARS = ["2023", "2022"]  # preference order -- first match per (place, measure) wins
MEASURES = ["CASTHMA", "OBESITY", "DIABETES", "DEPRESSION", "BPHIGH"]
MEASURE_KEYS = {
    "CASTHMA": "asthma",
    "OBESITY": "obesity",
    "DIABETES": "diabetes",
    "DEPRESSION": "depression",
    "BPHIGH": "high_blood_pressure",
}
BATCH_SIZE = 100


def fetch_batch(place_ids, year, batch_index):
    cache_file = CACHE_DIR / f"batch-{year}-{batch_index}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    ids_clause = ",".join(f"'{p}'" for p in place_ids)
    measures_clause = ",".join(f"'{m}'" for m in MEASURES)
    where = (
        f"locationid in ({ids_clause}) AND measureid in ({measures_clause}) "
        f"AND datavaluetypeid='AgeAdjPrv' AND year='{year}'"
    )
    last_err = None
    for attempt in range(4):
        try:
            result = subprocess.run(
                [
                    "curl", "-s", "-G", "--max-time", "60", QUERY_URL,
                    "--data-urlencode", f"$where={where}",
                    "--data-urlencode", "$select=locationid,measureid,data_value",
                    "--data-urlencode", "$limit=5000",
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


def main():
    city_places = json.loads((ROOT / "data/raw/city-place-fips.json").read_text())
    unique_ids = sorted({v["place_fips"] for v in city_places.values()})

    # by_place[locationid][measureid] = {"value": ..., "year": ...} -- first
    # year in YEARS to report a (place, measure) pair wins; later years in
    # the list only fill gaps, never override an already-found value.
    by_place = {}
    for year in YEARS:
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch = unique_ids[i : i + BATCH_SIZE]
            rows = fetch_batch(batch, year, i // BATCH_SIZE)
            for row in rows:
                place_data = by_place.setdefault(row["locationid"], {})
                if row["measureid"] not in place_data:
                    place_data[row["measureid"]] = {"value": round(float(row["data_value"]), 1), "year": year}
            print(f"  fetched {year} batch {i // BATCH_SIZE + 1}", file=sys.stderr)
            time.sleep(0.2)

    cities = json.loads((ROOT / "data/cities.json").read_text())
    out = {}
    unmatched = []
    for city in cities:
        cid = city["id"]
        place_info = city_places.get(cid)
        if not place_info:
            unmatched.append(cid)
            continue
        measures = by_place.get(place_info["place_fips"])
        if not measures:
            unmatched.append(cid)
            continue

        record = {"place": place_info["place_name"]}
        for measureid, key in MEASURE_KEYS.items():
            entry = measures.get(measureid)
            record[key] = entry["value"] if entry else None
            record[f"{key}_year"] = entry["year"] if entry else None
        out[cid] = record

    result = {
        "_meta": {
            "source": "CDC PLACES, place-level, age-adjusted prevalence (2023 preferred, 2022 fallback per place)",
            "source_url": "https://www.cdc.gov/places/",
            "resolution": "place",
        },
        **out,
    }
    (ROOT / "data/health.json").write_text(json.dumps(result, indent=2))
    print(f"Wrote data/health.json: {len(out)}/{len(cities)} cities matched to a place record.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched: {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
