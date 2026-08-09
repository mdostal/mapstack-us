#!/usr/bin/env python3
"""
Builds the housing-inventory dataset: fetches Zillow Research's free,
keyless "For-Sale Inventory" city-level CSV
(files.zillowstatic.com/research/public_csvs/invt_fs/City_invt_fs_uc_sfrcondo_sm_month.csv),
a real, live, monthly-updated count of active for-sale single-family/condo
listings per city -- joined by city/state name directly, no geocoding
crosswalk needed at all.

Extended to real multi-year history (ddr-zillow-extend, this session):
the SAME file already fetched for the original single-snapshot build
turns out to be a full monthly time series back to 2018-03 -- confirmed
live, no new source or fetch needed, just parsing every month column
instead of only the latest. One real value per calendar year is taken
(December's real reading, or the latest real reading within that year
if December itself is missing -- a real reporting-lag gap, not a bug),
matching this project's year-granularity time convention.

Source: Zillow Research Data, "For-Sale Inventory" (City, SFR+Condo,
smoothed, monthly). https://www.zillow.com/research/data/

Raw listing counts are meaningless without a population denominator (50
active listings means something very different in a town of 2,000 than a
city of 2 million) -- paired with each city's own CURRENT population
(data/cities.json's `pop` field) for every real year, a known, disclosed
simplification (this dataset doesn't have a historical per-year
population series wired in) rather than a fabricated one. LOWER
listings-per-capita is MORE concerning (tighter market, harder to find a
home) -- inverted via percentile rank among covered cities, computed
independently PER YEAR (same convention as crime.ts/income.ts for
unbounded raw quantities).

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

    years = sorted({int(m[:4]) for m in month_cols})
    # For each real year, prefer December's reading; fall back to the
    # latest real month within that year if December itself is a real
    # reporting-lag gap (most recent partial year has no December yet).
    year_to_month = {}
    for year in years:
        months_in_year = [m for m in month_cols if m.startswith(str(year))]
        dec = f"{year}-12-31"
        year_to_month[year] = dec if dec in months_in_year else months_in_year[-1]

    by_city_state = {}
    for row in reader:
        if row["RegionType"] != "city":
            continue
        key = (normalize_name(row["RegionName"], row["State"]), row["State"])
        year_values = {}
        for year, month in year_to_month.items():
            raw = row.get(month, "")
            if raw:
                year_values[year] = {"listings": float(raw), "month": month}
        if year_values:
            by_city_state[key] = year_values

    print(f"Loaded {len(by_city_state)} cities from Zillow, {len(years)} real years ({years[0]}-{years[-1]}).", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())
    per_year_records = {y: {} for y in years}
    for city in cities:
        if not city.get("pop"):
            continue
        key = (normalize_name(city["city"], city["state"]), city["state"])
        year_values = by_city_state.get(key)
        if not year_values:
            continue
        for year, entry in year_values.items():
            per_1000 = entry["listings"] / (city["pop"] / 1000)
            per_year_records[year][city["id"]] = {
                "listings": entry["listings"],
                "month": entry["month"],
                "listings_per_1000": round(per_1000, 3),
            }

    # Percentile rank among covered cities, INVERTED, computed
    # independently PER YEAR -- lower supply per capita is more
    # concerning, so a LOW listings_per_1000 should map to a HIGH concern
    # percentile.
    for year, year_records in per_year_records.items():
        ranked = sorted(year_records.items(), key=lambda kv: kv[1]["listings_per_1000"])
        n = len(ranked)
        for rank, (city_id, rec) in enumerate(ranked):
            percentile = round((n - 1 - rank) / max(n - 1, 1) * 100, 1)
            year_records[city_id]["concern"] = percentile

    records = {}
    for city in cities:
        years_data = {}
        for year in years:
            if city["id"] in per_year_records[year]:
                years_data[str(year)] = per_year_records[year][city["id"]]
        if years_data:
            records[city["id"]] = {"years": years_data}

    records["_meta"] = {
        "source": "Zillow Research Data, For-Sale Inventory (City, SFR+Condo, smoothed, monthly)",
        "source_url": "https://www.zillow.com/research/data/",
        "resolution": "city",
        "years": years,
        "coverage": len(records),
    }
    (ROOT / "data/housing-inventory.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/housing-inventory.json: {len(records)}/{len(cities)} cities matched (any year).", file=sys.stderr)


if __name__ == "__main__":
    main()
