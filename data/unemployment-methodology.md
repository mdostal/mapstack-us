# Unemployment — methodology

The twenty-fourth real Mapstack dataset (`dataset-backlog.md` #11), extended to real
multi-year history **1976–2026** this session (task 80), unblocked once BLS's own real
external maintenance window finally cleared.

## What this measures

One layer, **Unemployment rate**, 0–100. Raw input is the real local unemployment rate
from BLS's own Local Area Unemployment Statistics (LAUS) program for a given real year.
Already a meaningful, bounded percentage, directly rescaled onto 0–100, FIXED cap per
year (25% — the real observed range across 1976–2026 includes real COVID-era spikes
well above the prior single-snapshot dataset's 12% cap) applied identically across every
year so a city's rate stays honestly comparable year to year. Higher rate is more
concerning.

## Data source

[BLS Local Area Unemployment Statistics (LAUS)](https://www.bls.gov/lau/), free API v2,
free self-serve registration key.

## Method — a real detour worth documenting

BLS LAUS series IDs need an "area code" that isn't simply a FIPS code — BLS publishes
its own area-code reference file at `download.bls.gov`, but that specific endpoint
**explicitly blocks automated retrieval**: a direct request returned "Access Denied...
Automated retrieval programs (commonly called 'robots' or 'bots')... [is] prohibited,"
confirmed live, not assumed. That block was respected — no attempt was made to route
around it. Instead, the area-code format was reverse-engineered from a single known-good
example and confirmed against real live data: `LAU` + area type (`CT` for city/place,
`CN` for county) + FIPS code padded to 13 digits + measure code (`03` = unemployment
rate). This means the actual documented, intended-for-automation API (`api.bls.gov`,
what the free key is for) could be used exclusively.

1. **City-level series**: constructed from `data/raw/city-place-fips.json`.
2. **County-level fallback**: for any city with no real city-level LAUS series **in a
   given year**, constructed from `data/raw/city-county-fips.json` — applied PER YEAR
   (not once per city), since real city-tier series coverage has itself grown over the
   decades: a city can have a real city-level series in recent years but only a
   county-level one further back.
3. **Real 20-year API window limit**: a request for more than 20 years returns the
   message "Year range has been reduced to the system-allowed limit of 20 years,"
   confirmed live. The real 1976–2026 range needed three separate real fetches
   (1976–1995, 1996–2015, 2016–2026), each batched at BLS's real 50-series-per-request
   cap.
4. **1976 is the real start of the LAUS program itself** — confirmed live: a request for
   years before 1976 returns "No Data Available," then real monthly data starts exactly
   at 1976-01. Not a project-side limitation.
5. **Per-year value**: the latest real (non-placeholder) monthly reading within that
   calendar year — December when real, otherwise the latest real month that year. BLS
   marks some real months as unavailable rather than reporting a fabricated value (a
   real example found live: October 2025 carries a `-` placeholder with the footnote
   "Data unavailable due to the 2025 lapse in appropriations," a real federal government
   shutdown, not a data-quality gap on this project's end).

## Known limitations (shown, not smoothed over)

- **802/512 real coverage across all years combined** (802 real series fetched — 509
  city-level + 293 county-level fallback — some cities only ever needed the county
  fallback, so combined real coverage across the full 1976–2026 range is at or near
  512/512; see `data/unemployment.json`'s own `_meta.latest_year_coverage` for the real
  count at the most recent year).
- **A real, government-verified rate, not modeled** — the same "measured, not estimated"
  standard every other dataset here holds to.
- **Some readings carry a real BLS revision/preliminary flag** (`P` = preliminary,
  `R` = subject to later revision) not currently surfaced in the UI detail string — a
  real, minor precision gap, not a fabrication.
- **City-vs-county tier can change year to year for the same city** — disclosed
  explicitly in each year's own detail string, never silently blended.

## Reproducing this dataset

```
python3 scripts/gen_unemployment_data.py
```

Requires a real `BLS_API_KEY` in `.env` (free registration, see above) and both
`data/raw/city-place-fips.json` and `data/raw/city-county-fips.json` to already exist.
Caches each batch/window's raw API response under `data/raw/unemployment-cache/`
(gitignored — pure fetch-scratch, safe to delete and re-fetch any time; resumable on
rerun). Writes `data/unemployment.json` with every real year 1976–2026.
