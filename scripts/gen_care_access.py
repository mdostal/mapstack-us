#!/usr/bin/env python3
"""
Regenerates data/care-access.json from the 3 hospital-facility lists
(data/hospitals-general.json, data/hospitals-pediatric-cardiac.json,
data/hospitals-pediatric-specialty.json) against the full city spine
(data/cities.json).

Ported unchanged from allergy-locator's scripts/gen_care_access.py -- see
data/care-access-methodology.md for why this dataset is a reduced port and
what's new here (the concern-score conversion, computed separately in
src/lib/formula/care-access-concern.ts and src/lib/datasets/care-access.ts,
not by this script). Re-run any time the city spine grows or the hospital
facility lists change -- this script itself never needs to change.

Method (unchanged from the original): est_drive_min = great_circle_distance_mi
* 1.25 road-factor / 55 mph. Distance is straight-line (haversine), not real
routing -- a documented, honest approximation, consistent with every other
estimate in this project.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROAD_FACTOR = 1.25
AVG_SPEED_MPH = 55

TIERS = [(30, "<=30"), (60, "<=60"), (120, "<=120")]


def tier_for(minutes):
    for threshold, label in TIERS:
        if minutes <= threshold:
            return label
    return "120+"


def haversine_mi(lat1, lon1, lat2, lon2):
    r = 3958.8  # Earth radius in miles
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_facility(city, facilities):
    best = None
    best_dist = None
    for f in facilities:
        d = haversine_mi(city["lat"], city["lon"], f["lat"], f["lon"])
        if best_dist is None or d < best_dist:
            best_dist = d
            best = f
    distance_mi = round(best_dist, 1)
    est_drive_min = round(distance_mi * ROAD_FACTOR / AVG_SPEED_MPH * 60, 1)
    return {
        "nearest_facility": best["name"],
        "facility_city": f"{best['city']}, {best['state']}",
        "distance_mi": distance_mi,
        "est_drive_min": est_drive_min,
        "tier": tier_for(est_drive_min),
    }


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())
    layers = {
        "pediatric_cardiac": json.loads((ROOT / "data/hospitals-pediatric-cardiac.json").read_text()),
        "pediatric_specialty": json.loads((ROOT / "data/hospitals-pediatric-specialty.json").read_text()),
        "general": json.loads((ROOT / "data/hospitals-general.json").read_text()),
    }

    out = {
        "_meta": {
            "description": "US healthcare access per city across 3 facility layers. Drive time is an ESTIMATE, not real routing.",
            "method": "est_drive_min = great_circle_distance_mi * 1.25 road-factor / 55 mph, converted to minutes. Distance is straight-line (haversine).",
            "tiers": {"<=30": "<=30 min", "<=60": "<=60 min", "<=120": "<=120 min", "120+": ">120 min"},
            "layer_counts": {name: len(facilities) for name, facilities in layers.items()},
            "caveat": "Straight-line distance x 1.25 factor underestimates drive time in mountainous/rural terrain (e.g. Rocky Mountain West).",
        }
    }

    for city in cities:
        record = {"city": f"{city['city']}, {city['state']}"}
        for layer_name, facilities in layers.items():
            record[layer_name] = nearest_facility(city, facilities)
        out[city["id"]] = record

    (ROOT / "data/care-access.json").write_text(json.dumps(out, indent=2) + "\n")
    print(f"Wrote data/care-access.json for {len(cities)} cities across {len(layers)} layers.")


if __name__ == "__main__":
    main()
