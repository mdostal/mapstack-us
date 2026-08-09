# Air quality — methodology

The twenty-fifth real Mapstack dataset (`dataset-backlog.md` #6), extended to real
multi-year history **1980–2025** this session, replacing its original AirNow-based
real-time single-day build.

## What this measures

One layer, **Air Quality Index**, 0–100. Raw input is EPA's own real **90th Percentile
AQI** for a county-year — a real, already concern-oriented annual statistic (how bad do
the worse days get, without being dominated by a single outlier), direct rescale onto
0–100, FIXED cap per year (160 — the real ~p99 ceiling for the 2023/2024 vintage)
applied identically across every year so a city's score stays honestly comparable year
to year. Higher = more concerning.

## Why this replaced the original AirNow-based build

The original build used EPA AirNow's real-time current-conditions endpoint: it needed a
real, free `EPA_AIRNOW_API_KEY`, and its own hourly rate limit meant 53 of 512 cities
never got a real reading during the build (459/512 real coverage). It also had zero
historical depth — a single build-time snapshot, not a trend.

EPA's own bulk **"Annual AQI by County"** files
(https://aqs.epa.gov/aqsweb/airdata/download_files.html) are a real static CSV per real
year, going back to **1980**, with no API and no key. This is a strict real upgrade for
this project's stated priority on historical depth: 46 years of real official annual
statistics, better and more stable per-year coverage, no rate limit.

## Data source

[EPA AQS](https://aqs.epa.gov/aqsweb/airdata/download_files.html) — bulk
`annual_aqi_by_county_{YEAR}.zip` files, one real file per real year, 1980–2025,
confirmed live and contiguous with no gaps.

## Method

1. **Real per-year file fetch** (`scripts/gen_air_quality_data.py`): download and cache
   each year's real zip, extract the CSV.
2. **Join by county name**, since AQS's own file uses county NAMES (not FIPS codes),
   not this project's existing FIPS crosswalk directly:
   - Each city's real county name (`data/raw/city-county-fips.json`) + its real state
     abbreviation (`data/cities.json`) resolved to AQS's full state name.
   - **Virginia's real independent cities** appear in AQS as `"X City"` (e.g. `"Hampton
     City"`) — tried as a fallback suffix when the bare county name misses.
   - **New Mexico's "Doña Ana"** appears in AQS without the diacritic (`"Dona Ana"`) —
     normalized via NFKD diacritic-stripping before comparison, not a data error.
   - **Connecticut's real 2022 county-to-planning-region transition** (the same real
     transition already disclosed in `broadband-methodology.md`) means this project's
     own crosswalk stores CT cities under their new planning-region names, but AQS's own
     file still uses the old eight counties. CT cities fall back to a real state-level
     average across AQS's own eight CT counties for that year, honestly disclosed in the
     detail text as `"suppressed -- showing state average"`.
3. **Score**: `min(100, 90th_percentile_AQI / 160 * 100)`, rounded to one decimal.

## Known limitations (shown, not smoothed over)

- **499/512 real coverage across all years combined; 461–487/512 at any single real
  year** (461/512 at the latest real year, 2025 — see `data/air-quality.json`'s own
  `_meta.latest_year_coverage`). The remainder are genuine "no EPA AQI monitor operated
  in this county that year" gaps — a real, honest null, never defaulted to "Good."
  Coverage is naturally lower in the 1980s (as low as 399/512 in 1980, reflecting the
  real, growing EPA monitoring network of that era) and climbs through the 1990s–2000s
  as more counties gained monitors — this is a real historical fact about US air
  monitoring infrastructure, not a data-quality gap on this project's end.
- **2025's real coverage (461/512) is lower than 2023/2024's (481/512)** — 2025 is a
  real partial-year file as of this build; some counties' annual statistics aren't yet
  finalized. A real, honest reflection of the file's own vintage, not a regression.
- **A single annual statistic (90th percentile), not a full pollutant or seasonal
  breakdown** — a real simplification matching this project's established "one clean
  concern-oriented number" convention, at the cost of masking within-year seasonal
  variation (e.g. summer ozone spikes vs. winter PM2.5 spikes).
- **County-level, not station-level** — the same real granularity ceiling this
  project's other county-joined datasets (severe-weather, TRI facility density) already
  carry; a large county with one urban monitor represents the whole county.

## Reproducing this dataset

```
python3 scripts/gen_air_quality_data.py
```

No API key required (a real change from the original AirNow-based build). Requires
`data/raw/city-county-fips.json` to already exist. Caches each real year's CSV under
`data/raw/air-quality-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time; resumable on rerun). Writes `data/air-quality.json` with every real
year 1980–2025.
