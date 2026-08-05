#!/usr/bin/env python3
"""
Builds data/heat.json -- the extreme-heat-days dataset, one layer:
average number of days per year with a max temperature above 90F, from
NOAA's 1991-2020 U.S. Climate Normals (dataset `normals-annualseasonal`,
data type `ANN-TMAX-AVGNDS-GRTH090`), fetched via NOAA's NCEI Data
Service API. No API key at all -- confirmed by direct fetch, unlike
every still-blocked Census-cluster candidate.

Reads data/raw/heat-station-matches.json (scripts/fetch_heat_stations.py),
which already nearest-station-matches each of the 512 spine cities
against ONLY the ~6,700 NOAA stations that actually report a real
ANN-TMAX-AVGNDS-GRTH090 value (most of the 15,615-station inventory is
precip/snow-only and has no temperature normal at all -- filtered out
at the matching step, not here).

Raw direction / normalization: more extreme-heat days is more
concerning. Day count is already a meaningful, externally bounded
quantity (0-365/year) so it's DIRECTLY rescaled onto 0-100, not a
percentile rank among just the 512 spine cities -- same posture as
broadband.ts/walkability.ts's own externally-meaningful-scale datasets.
HEAT_DAYS_CAP is chosen from the real observed spine distribution:
Yuma AZ (184.7 days/year, the hottest spine city) and 19 other Sonoran/
Mojave desert cities clamp to 100 concern above the cap -- an honest
"these are the most extreme-heat places in the country" read, not a
data gap.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEAT_DAYS_CAP = 150.0


def main():
    matches = json.loads((ROOT / "data/raw/heat-station-matches.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())
    city_ids = {c["id"] for c in cities}

    records = {}
    for city_id, match in matches.items():
        if city_id not in city_ids:
            continue
        days = match["days_above_90f"]
        concern = round(min(100.0, (days / HEAT_DAYS_CAP) * 100.0), 1)
        records[city_id] = {
            "days_above_90f": days,
            "concern": concern,
            "station_id": match["station_id"],
            "station_name": match["station_name"],
            "station_distance_km": match["distance_km"],
        }

    missing = sorted(city_ids - set(records))
    records["_meta"] = {
        "source": "NOAA NCEI 1991-2020 U.S. Climate Normals, ANN-TMAX-AVGNDS-GRTH090",
        "generated_note": "days_above_90f = 30-year average annual count of days with max temp > 90F",
        "heat_days_cap_for_100_concern": HEAT_DAYS_CAP,
        "coverage": len(records) - 0,
    }

    (ROOT / "data/heat.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")

    covered = len(records) - 1  # exclude _meta
    print(f"Wrote data/heat.json: {covered}/{len(cities)} cities covered.")
    if missing:
        print(f"{len(missing)} cities missing (no match at all): {missing}")

    all_days = sorted(r["days_above_90f"] for cid, r in records.items() if cid != "_meta")
    print(f"days_above_90f range: min={all_days[0]} median={all_days[len(all_days)//2]} max={all_days[-1]}")
    clamped = sum(1 for d in all_days if d > HEAT_DAYS_CAP)
    print(f"{clamped} cities clamp to 100 concern (days above the {HEAT_DAYS_CAP}-day cap).")


if __name__ == "__main__":
    main()
