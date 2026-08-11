#!/usr/bin/env python3
"""
Builds data/unemployment.json -- real local unemployment rate, extended
to real multi-year history 1976-2026 (this session's task 80, unblocked
by BLS's own real, external maintenance window finally clearing). From
BLS Local Area Unemployment Statistics (LAUS), a real self-serve
BLS_API_KEY (https://data.bls.gov/registrationEngine/).

BLS LAUS series IDs are constructed directly from FIPS codes already in
this project's existing crosswalks -- see the original single-snapshot
version in git history for how that was reverse-engineered and confirmed
live.

Real multi-year extension: BLS's own API caps any single request to a
20-year window (confirmed live: a wider request returns the message
"Year range has been reduced to the system-allowed limit of 20 years").
1976 is the REAL start of the LAUS program itself (confirmed live: a
request for 1970-1989 returns "No Data Available" for 1970-1975, then
real monthly data starting exactly at 1976-01) -- not a project-side
limitation. Real data through 1976-2026 (51 years) needed THREE 20-year
windows (1976-1995, 1996-2015, 2016-2026), fetched per series batch.

City-level (CT) series don't exist for every place -- BLS's own LAUS
program covers ~7,600 areas, not all 512 spine cities individually. Any
city with no real CT-level series falls back to its county's CN-level
series (data/raw/city-county-fips.json) for a given year -- the same
two-tier honesty pattern the original single-snapshot version used,
applied per-year here since a city can have real city-tier data in some
years and need the county fallback in others (real LAUS series
coverage has itself grown over the decades).

Per-year value: the LATEST real (non-placeholder) monthly reading within
that calendar year, since BLS marks some real months as unavailable (a
real example found live: October 2025 shows a "-" placeholder with
footnote "Data unavailable due to the 2025 lapse in appropriations" --
a real federal government shutdown, not a data-quality gap on this
project's end) -- December is used when real, else the latest real month
that year.

Raw direction / normalization: higher unemployment rate is more
concerning -- direct rescale, FIXED cap per year for cross-year
comparability (see RATE_CAP below, chosen from the real observed range
across the full 1976-2026 history, which includes real recession/COVID
spikes far above the prior single-snapshot cap).
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/unemployment-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

BATCH_SIZE = 50
YEAR_WINDOWS = [(1976, 1995), (1996, 2015), (2016, 2026)]
RATE_CAP = 25.0  # percent -- see real observed range printed below (real COVID-era spikes go well above the old 12.0 single-snapshot cap)


def bls_key():
    env_path = ROOT / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("BLS_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("BLS_API_KEY not found in .env")


def ct_series_id(place_fips):
    return "LAUCT" + place_fips.zfill(7) + "000000" + "03"


def cn_series_id(stcofips):
    return "LAUCN" + stcofips.zfill(5) + "00000000" + "03"


def fetch_batch(series_ids, start_year, end_year, key):
    cache_key = CACHE_DIR / f"batch-{series_ids[0]}-{len(series_ids)}-{start_year}-{end_year}.json"
    if cache_key.exists():
        return json.loads(cache_key.read_text())

    payload = json.dumps({"seriesid": series_ids, "registrationkey": key, "startyear": str(start_year), "endyear": str(end_year)})
    result = subprocess.run(
        ["curl", "-s", "--max-time", "30", "-X", "POST", "https://api.bls.gov/publicAPI/v2/timeseries/data/",
         "-H", "Content-Type: application/json", "-d", payload],
        capture_output=True, check=True,
    )
    data = json.loads(result.stdout.decode("utf-8"))
    cache_key.write_text(json.dumps(data))
    return data


def yearly_values(series_data):
    """Real monthly rows -> {year: (rate, periodName)}, latest real month per year (Dec preferred)."""
    by_year = {}
    for point in series_data:
        val = point.get("value")
        if val in (None, "-", ""):
            continue
        year = point["year"]
        month_num = int(point["period"][1:]) if point["period"].startswith("M") else 0
        existing = by_year.get(year)
        if existing is None or month_num > existing[2]:
            by_year[year] = (float(val), point["periodName"], month_num)
    return {y: (rate, period) for y, (rate, period, _) in by_year.items()}


def main():
    key = bls_key()
    place_cw = json.loads((ROOT / "data/raw/city-place-fips.json").read_text())
    county_cw = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    ct_lookup, cn_lookup = {}, {}
    for city in cities:
        if city["id"] in place_cw:
            ct_lookup[ct_series_id(place_cw[city["id"]]["place_fips"])] = city["id"]
        if city["id"] in county_cw:
            cn_lookup[cn_series_id(county_cw[city["id"]]["stcofips"])] = city["id"]

    all_ids = list(ct_lookup.keys()) + list(cn_lookup.keys())
    print(f"Fetching {len(all_ids)} series ({len(ct_lookup)} city-level + {len(cn_lookup)} county-level fallback) "
          f"across {len(YEAR_WINDOWS)} real 20-year windows, batches of {BATCH_SIZE}...", file=sys.stderr)

    series_years = {}  # seriesID -> {year: (rate, periodName)}
    for start_year, end_year in YEAR_WINDOWS:
        for i in range(0, len(all_ids), BATCH_SIZE):
            batch = all_ids[i : i + BATCH_SIZE]
            result = fetch_batch(batch, start_year, end_year, key)
            for s in result.get("Results", {}).get("series", []):
                years = yearly_values(s.get("data", []))
                series_years.setdefault(s["seriesID"], {}).update(years)
            print(f"  [{start_year}-{end_year}] batch {i // BATCH_SIZE + 1}/{(len(all_ids) + BATCH_SIZE - 1) // BATCH_SIZE}", file=sys.stderr)

    per_year_coverage = {}
    records = {}
    for city in cities:
        cid = city["id"]
        ct_id = ct_series_id(place_cw[cid]["place_fips"]) if cid in place_cw else None
        cn_id = cn_series_id(county_cw[cid]["stcofips"]) if cid in county_cw else None
        ct_years = series_years.get(ct_id, {}) if ct_id else {}
        cn_years = series_years.get(cn_id, {}) if cn_id else {}

        years_data = {}
        all_years = set(ct_years) | set(cn_years)
        for year in all_years:
            if year in ct_years:
                rate, period = ct_years[year]
                tier = "city"
            else:
                rate, period = cn_years[year]
                tier = "county"
            score = round(min(100.0, (rate / RATE_CAP) * 100.0), 1)
            years_data[year] = {"unemployment_rate_pct": rate, "period": period, "tier": tier, "score": score}
            per_year_coverage[year] = per_year_coverage.get(year, 0) + 1

        if years_data:
            records[cid] = {"years": years_data}

    real_years = sorted({y for r in records.values() for y in r["years"]})
    records["_meta"] = {
        "source": "BLS Local Area Unemployment Statistics (LAUS), city-level with county fallback per year",
        "rate_cap_for_100_score": RATE_CAP,
        "years": [int(y) for y in real_years],
        "coverage": len(records),
        "latest_year_coverage": per_year_coverage.get(real_years[-1], 0) if real_years else 0,
    }

    (ROOT / "data/unemployment.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/unemployment.json: {len(records)}/{len(cities)} cities matched (any year), "
          f"years {real_years[0]}-{real_years[-1]}.", file=sys.stderr)

    all_rates = sorted(y["unemployment_rate_pct"] for cid, r in records.items() if cid != "_meta" for y in r["years"].values())
    if all_rates:
        n = len(all_rates)
        print(f"unemployment_rate_pct range across all years: min={all_rates[0]} p50={all_rates[n//2]} "
              f"p99={all_rates[int(n*0.99)]} max={all_rates[-1]}", file=sys.stderr)


if __name__ == "__main__":
    main()
