#!/usr/bin/env python3
"""
Builds data/measured-grass-pollen.json -- REAL, measured (not modeled)
grass pollen counts, direct operator request after allergy.ts's grass
severity score turned out to be climate-modeled rather than measured (see
allergy-methodology.md). Real government-hosted station data DOES exist,
just scattered across individual state/county health departments rather
than one national feed -- this is the first of what's realistically a
small, extensible roster of real stations, not a national dataset.

Confirmed real, live, free, keyless ArcGIS FeatureServer sources found
this session (operator-supplied lead: Vermont's "EPHT Pollen" dataset,
https://www.arcgis.com/home/item.html?id=ecf4b3d2deb4462cab0131beebb175ac,
led to searching ArcGIS Online's own public catalog for siblings):

- Carver County, MN (Environmental Services) -- "Elevated Pollen Days",
  https://www.arcgis.com/home/item.html?id=8226f81050bf4b1cade2eebfd033354a,
  real annual counts of "elevated grass pollen days" 1993-2020 (not
  updated since 2020 -- a real, dated snapshot, not a live feed). USED
  HERE -- the only one of the sources found that has any real spine-city
  match (the Twin Cities MN metro sits within real range of it).
- Vermont Dept. of Health (EPHT Pollen, the operator's own linked source)
  -- real DAILY grass/tree/weed/ragweed counts 2009-2025, genuinely
  live-maintained (confirmed real Oct 2025 data), the best single source
  found. NOT used here: Vermont has zero cities in the 512-city spine
  (no VT city clears the spine's population threshold), so real,
  verified station data exists but currently has no city to attach to.
  Documented here so whoever extends this dataset next doesn't have to
  re-find it.
- Washington DOH's "Pollen Sense Data Summary" FeatureServer lists 36
  real real-time-sensor site locations across WA but its PUBLIC view
  ships every reading field as null -- a real network exists, the public
  layer just doesn't expose readings. Not usable as-is.
- Nashville Open Data's "Air Quality and Pollen Count" has real fields
  but its most recent real record is from May 2010 -- abandoned, not
  live. Not usable.

Raw direction / normalization: more elevated-grass-pollen days per year
is more concerning -- direct rescale, capped at 90 days (Carver County's
own real observed max across 1993-2020), matching heat.ts's data-informed
cap posture.
"""
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/measured-grass-pollen-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
CACHE_FILE = CACHE_DIR / "carver-county-elevated-pollen-days.json"

CARVER_URL = "https://services.arcgis.com/wMZT8kNwa6tOxhKg/arcgis/rest/services/Elevated_Pollen_Days/FeatureServer/0/query?where=1%3D1&outFields=*&f=json"

# Carver County, MN's approximate centroid (Chaska, the county seat) --
# no lat/lon ships with the ArcGIS table itself (it's a non-spatial
# annual-summary table), so this project's usual point-geocode-lookup
# pattern doesn't apply; a county-seat approximation is precise enough
# for a coarse nearest-city distance check at this scale.
CARVER_LAT, CARVER_LON = 44.79, -93.60
MATCH_RADIUS_KM = 65
RECENT_YEARS = 5  # average the most recent 5 real years on file, not just the single latest (noisy small-count metric)
GRASS_DAYS_CAP = 90.0


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def fetch_carver_data():
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text())
    result = subprocess.run(["curl", "-s", "--max-time", "30", CARVER_URL], capture_output=True, check=True)
    data = json.loads(result.stdout.decode("utf-8"))
    CACHE_FILE.write_text(json.dumps(data, indent=2))
    return data


def main():
    raw = fetch_carver_data()
    rows = [f["attributes"] for f in raw["features"]]
    rows.sort(key=lambda r: r["Year"], reverse=True)
    recent = rows[:RECENT_YEARS]
    years_used = [r["Year"] for r in recent]
    avg_grass_days = sum(r["Count_of_elevated_grass_pollen_"] for r in recent) / len(recent)
    print(f"Carver County MN: averaging {years_used} -> {avg_grass_days:.1f} elevated grass pollen days/year", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())
    concern = round(min(100.0, (avg_grass_days / GRASS_DAYS_CAP) * 100.0), 1)

    records = {}
    for city in cities:
        dist = haversine_km(city["lat"], city["lon"], CARVER_LAT, CARVER_LON)
        if dist <= MATCH_RADIUS_KM:
            records[city["id"]] = {
                "avg_elevated_grass_pollen_days_per_year": round(avg_grass_days, 1),
                "years_averaged": years_used,
                "distance_km_from_station_region": round(dist, 1),
                "concern": concern,
            }

    records["_meta"] = {
        "source": "Carver County, MN Environmental Services -- Elevated Pollen Days (real annual counts, 1993-2020, not updated since)",
        "match_radius_km": MATCH_RADIUS_KM,
        "grass_days_cap_for_100_concern": GRASS_DAYS_CAP,
        "coverage": len(records),
        "note": "Vermont's EPHT Pollen dataset (real daily grass counts, 2009-2025, genuinely live-maintained) was also confirmed real this session but has zero cities in the 512-city spine within range -- documented in gen_measured_grass_pollen_data.py for whoever extends this next.",
    }

    (ROOT / "data/measured-grass-pollen.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    matched = sorted(k for k in records if k != "_meta")
    print(f"Wrote data/measured-grass-pollen.json: {len(matched)} cities matched (of 512) -- intentionally sparse, real coverage only.", file=sys.stderr)
    print(f"Matched cities: {matched}", file=sys.stderr)


if __name__ == "__main__":
    main()
