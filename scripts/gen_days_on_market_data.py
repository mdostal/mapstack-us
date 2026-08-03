#!/usr/bin/env python3
"""
Builds the days-on-market dataset: fetches Zillow Research's free, keyless
"Mean Days to Pending" city-level CSV
(files.zillowstatic.com/research/public_csvs/mean_doz_pending/City_mean_doz_pending_uc_sfrcondo_sm_month.csv),
a near-free follow-on to the housing-inventory dataset -- same Zillow
portal, same direct city/state name join, same name-normalization
quirks, reusing gen_housing_inventory_data.py's approach directly rather
than a shared import (each gen_*.py script here is independently
runnable/readable, the established pattern for this repo's data scripts).

Source: Zillow Research Data, "Mean Days to Pending" (City, SFR+Condo,
smoothed, monthly). https://www.zillow.com/research/data/

Raw direction is a REAL, DELIBERATE FRAMING CHOICE, not an objective fact
the data hands you -- unlike housing-inventory's unambiguous "lower
supply = more concerning" direction. A LOW days-to-pending number (homes
selling in days) reads as "hard to compete for a home here" from a
prospective mover's perspective -- the framing adopted here, paired
conceptually with housing-inventory as a shared "market tightness" pair
(both invert toward "fast/tight = more concerning"). A fast market is
ALSO a legitimate positive signal (a place everyone wants to live) -- this
is named explicitly in the methodology doc, not smoothed over as if it
were the only reasonable reading.
"""
import csv
import io
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_FILE = ROOT / "data/raw/days-on-market-cache/zillow-dom.csv"
CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

ZILLOW_URL = "https://files.zillowstatic.com/research/public_csvs/mean_doz_pending/City_mean_doz_pending_uc_sfrcondo_sm_month.csv"

# Same real, documented per-city name-format quirk gen_housing_inventory_data.py
# already found: Zillow renders "O'Fallon" as "O Fallon" (a space) but strips
# the apostrophe with no replacement everywhere else (e.g. "Lee's Summit" ->
# "Lees Summit").
NAME_OVERRIDES = {
    ("o'fallon", "MO"): "o fallon",
}


def fetch_csv() -> str:
    if CACHE_FILE.exists():
        return CACHE_FILE.read_text()
    result = subprocess.run(
        ["curl", "-s", "--max-time", "60", ZILLOW_URL], capture_output=True, check=True
    )
    text = result.stdout.decode("utf-8")
    CACHE_FILE.write_text(text)
    return text


def normalize_name(name: str, state: str = "") -> str:
    override = NAME_OVERRIDES.get((name.lower(), state))
    if override:
        return override
    name = re.sub(r"\bSt\.\s*", "Saint ", name)
    name = name.replace("'", "")
    return re.sub(r"\s+", " ", name).strip().lower()


def main():
    csv_text = fetch_csv()
    reader = csv.DictReader(io.StringIO(csv_text))
    fieldnames = reader.fieldnames
    month_cols = sorted(c for c in fieldnames if re.match(r"^\d{4}-\d{2}-\d{2}$", c))

    by_city_state = {}
    for row in reader:
        if row["RegionType"] != "city":
            continue
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
        by_city_state[key] = {"days": value, "month": used_month}

    print(f"Loaded {len(by_city_state)} cities from Zillow.", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())
    records = {}
    unmatched = []
    for city in cities:
        key = (normalize_name(city["city"], city["state"]), city["state"])
        entry = by_city_state.get(key)
        if not entry:
            unmatched.append(city["id"])
            continue
        records[city["id"]] = {"days_to_pending": entry["days"], "month": entry["month"]}

    # Percentile rank among covered cities, INVERTED -- fewer days to
    # pending (a faster market) maps to a HIGHER concern percentile, per
    # this dataset's own explicit framing choice (see module docstring).
    ranked = sorted(records.items(), key=lambda kv: kv[1]["days_to_pending"])
    n = len(ranked)
    for rank, (city_id, rec) in enumerate(ranked):
        percentile = round((n - 1 - rank) / max(n - 1, 1) * 100, 1)
        records[city_id]["concern"] = percentile

    result = {
        "_meta": {
            "source": "Zillow Research Data, Mean Days to Pending (City, SFR+Condo, smoothed, monthly)",
            "source_url": "https://www.zillow.com/research/data/",
            "resolution": "city",
            "latest_month": month_cols[-1] if month_cols else None,
        },
        **records,
    }
    (ROOT / "data/days-on-market.json").write_text(json.dumps(result, indent=2))
    print(f"Wrote data/days-on-market.json: {len(records)}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched: {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
