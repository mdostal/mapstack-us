#!/usr/bin/env python3
"""
Builds data/winter-cold-burden.json -- the winter-cold-burden dataset, one
layer: average number of days per year with a min temperature at or below
32F (freezing), from NOAA's 1991-2020 U.S. Climate Normals (dataset
`normals-annualseasonal`, data type ANN-TMIN-AVGNDS-LSTH032), fetched via
NOAA's NCEI Data Service API. No API key -- the direct winter-cold
complement to heat.ts's extreme-heat-days dataset, reusing the exact
same real station-inventory + nearest-match pipeline shape
(scripts/fetch_winter_cold_stations.py).

Reads data/raw/winter-cold-burden-station-matches.json, which already
nearest-station-matches each of the 512 spine cities against ONLY the
~6,740 NOAA stations that actually report a real
ANN-TMIN-AVGNDS-LSTH032 value. 512/512 matched, all within 27km (tighter
than heat.ts's own real spread).

Raw direction / normalization: more freezing days is more concerning
(heating costs, ice/snow safety exposure) -- the direct winter-cold
complement to heat.ts's extreme-heat-days concern. Day count is already
a meaningful, externally bounded quantity (0-365/year) so it's DIRECTLY
rescaled onto 0-100, same posture as heat.ts's own HEAT_DAYS_CAP.
FREEZING_DAYS_CAP is chosen from the real observed spine distribution
(see printed distribution below).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FREEZING_DAYS_CAP = 180.0


def main():
    matches = json.loads((ROOT / "data/raw/winter-cold-burden-station-matches.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())
    city_ids = {c["id"] for c in cities}

    records = {}
    for city_id, match in matches.items():
        if city_id not in city_ids:
            continue
        days = match["freezing_days_per_year"]
        concern = round(min(100.0, (days / FREEZING_DAYS_CAP) * 100.0), 1)
        records[city_id] = {
            "freezing_days_per_year": days,
            "concern": concern,
            "station_id": match["station_id"],
            "station_name": match["station_name"],
            "station_distance_km": match["distance_km"],
        }

    missing = sorted(city_ids - set(records))
    records["_meta"] = {
        "source": "NOAA NCEI 1991-2020 U.S. Climate Normals, ANN-TMIN-AVGNDS-LSTH032",
        "generated_note": "freezing_days_per_year = 30-year average annual count of days with min temp <= 32F",
        "freezing_days_cap_for_100_concern": FREEZING_DAYS_CAP,
        "coverage": len(records),
    }

    (ROOT / "data/winter-cold-burden.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")

    covered = len(records) - 1  # exclude _meta
    print(f"Wrote data/winter-cold-burden.json: {covered}/{len(cities)} cities covered.")
    if missing:
        print(f"{len(missing)} cities missing (no match at all): {missing}")

    all_days = sorted(r["freezing_days_per_year"] for cid, r in records.items() if cid != "_meta")
    n = len(all_days)
    pcts = {p: all_days[min(int(n * p / 100), n - 1)] for p in [50, 75, 90, 95, 99]}
    print(f"freezing_days_per_year distribution: min={all_days[0]} {pcts} max={all_days[-1]}")
    clamped = sum(1 for d in all_days if d > FREEZING_DAYS_CAP)
    print(f"{clamped} cities clamp to 100 concern (days above the {FREEZING_DAYS_CAP}-day cap).")


if __name__ == "__main__":
    main()
