#!/usr/bin/env python3
"""
Builds the housing-inventory dataset: fetches Zillow Research's free,
keyless "For-Sale Inventory" city-level CSV
(files.zillowstatic.com/research/public_csvs/invt_fs/City_invt_fs_uc_sfrcondo_sm_month.csv),
a real, live, monthly-updated count of active for-sale single-family/condo
listings per city -- joined by city/state name directly, no geocoding
crosswalk needed at all (the simplest join of any dataset built this
session).

Source: Zillow Research Data, "For-Sale Inventory" (City, SFR+Condo,
smoothed, monthly). https://www.zillow.com/research/data/

Raw listing counts are meaningless without a population denominator (50
active listings means something very different in a town of 2,000 than a
city of 2 million) -- paired with each city's own population
(data/cities.json's `pop` field, already used by crime.ts's rate
computation, no Census API key needed) to compute listings per 1,000
residents. LOWER listings-per-capita is MORE concerning (tighter market,
harder to find a home) -- inverted via percentile rank among covered
cities, matching crime's own "percentile among covered cities" convention,
computed once here at generation time (same as crime.json's `concern`
field), not re-derived by the app.

A real, documented tension worth naming (not hidden): very low supply can
also reflect a place being highly desirable, not distressed -- this score
measures market TIGHTNESS, not desirability, the same both-directions
caveat population growth carries in the Census-cluster research notes.
"""
import csv
import io
import json
import subprocess
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_FILE = ROOT / "data/raw/housing-inventory-cache/zillow-invt.csv"
CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

ZILLOW_URL = "https://files.zillowstatic.com/research/public_csvs/invt_fs/City_invt_fs_uc_sfrcondo_sm_month.csv"


def fetch_csv() -> str:
    if CACHE_FILE.exists():
        return CACHE_FILE.read_text()
    result = subprocess.run(
        ["curl", "-s", "--max-time", "60", ZILLOW_URL], capture_output=True, check=True
    )
    text = result.stdout.decode("utf-8")
    CACHE_FILE.write_text(text)
    return text


# Zillow's own apostrophe-stripping isn't consistent: "Lee's Summit" ->
# "Lees Summit" (apostrophe just removed) but "O'Fallon" -> "O Fallon"
# (apostrophe replaced with a space) -- no single regex handles both
# correctly, so these are named overrides, same posture as crime.ts's
# CITY_NAME_OVERRIDES for its own real per-city name quirks.
NAME_OVERRIDES = {
    ("o'fallon", "MO"): "o fallon",
}


def normalize_name(name: str, state: str = "") -> str:
    override = NAME_OVERRIDES.get((name.lower(), state))
    if override:
        return override
    # Zillow spells out "Saint" rather than abbreviating "St.", and strips
    # apostrophes from most other names (e.g. "Lee's Summit" -> "Lees
    # Summit") -- a real, documented join-name mismatch, not a data gap.
    name = re.sub(r"\bSt\.\s*", "Saint ", name)
    name = name.replace("'", "")
    return re.sub(r"\s+", " ", name).strip().lower()


def main():
    csv_text = fetch_csv()
    reader = csv.DictReader(io.StringIO(csv_text))
    fieldnames = reader.fieldnames
    month_cols = [c for c in fieldnames if re.match(r"^\d{4}-\d{2}-\d{2}$", c)]
    month_cols.sort()

    by_city_state = {}
    for row in reader:
        if row["RegionType"] != "city":
            continue
        # Walk backward from the latest month until a real (non-empty)
        # value is found -- a small number of cities lag the absolute
        # latest month, a real reporting-lag gap, not a bug.
        value = None
        used_month = None
        for month in reversed(month_cols):
            raw = row.get(month, "")
            if raw:
                value = float(raw)
                used_month = month
                break
        if value is None:
            continue
        key = (normalize_name(row["RegionName"], row["State"]), row["State"])
        by_city_state[key] = {"listings": value, "month": used_month}

    print(f"Loaded {len(by_city_state)} cities from Zillow.", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())
    records = {}
    unmatched = []
    for city in cities:
        key = (normalize_name(city["city"], city["state"]), city["state"])
        entry = by_city_state.get(key)
        if not entry or not city.get("pop"):
            unmatched.append(city["id"])
            continue
        per_1000 = entry["listings"] / (city["pop"] / 1000)
        records[city["id"]] = {
            "listings": entry["listings"],
            "month": entry["month"],
            "listings_per_1000": round(per_1000, 3),
        }

    # Percentile rank among covered cities, INVERTED -- lower supply per
    # capita is more concerning, so a LOW listings_per_1000 should map to a
    # HIGH concern percentile. Computed once here, same posture as
    # crime.json's precomputed `concern` field.
    ranked = sorted(records.items(), key=lambda kv: kv[1]["listings_per_1000"])
    n = len(ranked)
    for rank, (city_id, rec) in enumerate(ranked):
        # rank 0 = lowest supply = most concerning = should get concern 100
        percentile = round((n - 1 - rank) / max(n - 1, 1) * 100, 1)
        records[city_id]["concern"] = percentile

    result = {
        "_meta": {
            "source": "Zillow Research Data, For-Sale Inventory (City, SFR+Condo, smoothed, monthly)",
            "source_url": "https://www.zillow.com/research/data/",
            "resolution": "city",
            "latest_month": month_cols[-1] if month_cols else None,
        },
        **records,
    }
    (ROOT / "data/housing-inventory.json").write_text(json.dumps(result, indent=2))
    print(f"Wrote data/housing-inventory.json: {len(records)}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched: {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
