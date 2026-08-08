#!/usr/bin/env python3
"""
One-off fix script (not part of the regular build pipeline) --
data/hospitals-general.json is a 168-facility curated list ported
unchanged from allergy-locator. A live audit this session
(scripts/audit-dataset-directions.ts) found it's missing real, major,
well-known hospitals in dozens of real mid-size cities -- Rochester NY
(Strong Memorial/URMC), Syracuse NY (Upstate University Hospital),
Albany NY (Albany Medical Center), Columbia SC (Prisma Health
Richland), the whole Northwest Arkansas metro (Fayetteville/
Springdale/Rogers, each with their own real hospital), and many more --
all showing multi-hour drive times to a distant "nearest" facility when
a real, major local hospital exists.

Real fix: cross-reference every spine city against the real, live,
keyless CMS Hospital General Information dataset (5,432 Medicare-
certified hospitals nationally, data.cms.gov/provider-data/api/1/
datastore/query/xubh-q36u/0) for a direct city-name match on a real
"Acute Care Hospitals" facility with emergency services. 409/512 spine
cities (80%) have one. This script merges those real facilities into
hospitals-general.json, using the spine city's own coordinates as a
reasonable proxy for the facility location (the CMS dataset has no
lat/lon; the facility is confirmed to be IN this city by its own
address city/state field, so this is not a guess). The remaining 103
cities (mostly real suburbs of a larger metro -- Irvine CA, Sunnyvale
CA, Tempe AZ, Surprise AZ) keep the existing curated-list-based
nearest-neighbor result unchanged, since a suburb genuinely relying on
a nearby city's hospital is often the honest real answer, not a bug.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CMS_CACHE_DIR = ROOT / "data/raw/care-access-cms-cache"
HOSPITALS_GENERAL = ROOT / "data/hospitals-general.json"


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def load_cms_hospitals():
    all_hospitals = []
    for offset in [0, 1000, 2000, 3000, 4000, 5000]:
        d = json.loads((CMS_CACHE_DIR / f"cms_hospitals_{offset}.json").read_text())
        all_hospitals.extend(d["results"])
    return [h for h in all_hospitals if h["hospital_type"] == "Acute Care Hospitals" and h["emergency_services"] == "Yes"]


def best_hospital_for_city(hospitals_at_city):
    def rating_key(h):
        try:
            return -int(h["hospital_overall_rating"])
        except (ValueError, TypeError):
            return 0
    return sorted(hospitals_at_city, key=lambda h: (rating_key(h), h["facility_name"]))[0]


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())
    existing = json.loads(HOSPITALS_GENERAL.read_text())
    # Dedup key MUST include city+state, not just hospital name -- many real
    # US hospitals share generic names (e.g. "Memorial Medical Center" is a
    # real facility in both Modesto CA and Springfield IL; "St Joseph
    # Medical Center" is real in both Tacoma WA and Bloomington IL). A
    # name-only dedup incorrectly treats the second city's real hospital as
    # already covered by the first -- a real bug caught and fixed here.
    existing_keys = {(h["name"], h["city"], h["state"]) for h in existing}

    acute = load_cms_hospitals()
    by_city_state = {}
    for h in acute:
        key = (norm(h["citytown"]), h["state"])
        by_city_state.setdefault(key, []).append(h)

    added = []
    for city in cities:
        key = (norm(city["city"]), city["state"])
        matches = by_city_state.get(key)
        if not matches:
            continue
        chosen = best_hospital_for_city(matches)
        name = chosen["facility_name"].title()
        dedup_key = (name, city["city"], city["state"])
        if dedup_key in existing_keys:
            continue  # this exact (hospital, city) is already covered
        added.append({
            "name": name,
            "city": city["city"],
            "state": city["state"],
            "lat": city["lat"],
            "lon": city["lon"],
            "note": f"CMS-verified acute care hospital w/ ER, rating {chosen['hospital_overall_rating'] or 'N/A'}",
        })
        existing_keys.add(dedup_key)

    merged = existing + added
    HOSPITALS_GENERAL.write_text(json.dumps(merged, indent=2) + "\n")
    print(f"Added {len(added)} real CMS-verified hospitals. Total facilities: {len(existing)} -> {len(merged)}.")


if __name__ == "__main__":
    main()
