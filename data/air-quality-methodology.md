# Air quality — methodology

The twenty-fifth real Mapstack dataset (`dataset-backlog.md` #6), unblocked by a real,
free, self-serve `EPA_AIRNOW_API_KEY` (https://docs.airnowapi.org).

## What this measures

One layer, **Air Quality Index**, 0–100. Raw input is the real current-conditions AQI
from EPA AirNow — the worse (higher) of PM2.5 and ozone sub-indices, matching AQI's own
official convention of reporting a single number per location/day driven by whichever
pollutant is worst. Already a meaningful, concern-oriented 0–500+ scale, directly
rescaled onto 0–100 (capped at 150 — the real observed spine range clusters well under
this), higher AQI is more concerning.

## Data source

[EPA AirNow](https://docs.airnowapi.org), current-conditions observation by lat/lon —
free API, self-serve key, no paid tier. Chosen over the historical AQS Data Mart API
the backlog originally scoped: AirNow resolves the nearest real reporting area given a
lat/lon and search radius server-side, with no separate monitor-crosswalk step needed.

## Method

1. **Fetch** (`scripts/gen_air_quality_data.py`): one request per city, lat/lon +
   50-mile search radius, both PM2.5 and ozone pulled when both are reported; the worse
   (higher-AQI) of the two is kept.
2. **A real rate-limit bug found and fixed mid-build**: a fresh API key appears to start
   with a lower hourly request quota than a mature one. An early version of this script
   treated ANY non-list API response as "no monitor nearby" and permanently cached it —
   which silently mislabeled 53 real, rate-limited requests (including dense-monitor-
   network cities like Irvine and Santa Ana in the LA basin, and Oklahoma City, Tulsa,
   and Boise) as genuine coverage gaps. Fixed by explicitly detecting AirNow's
   `WebServiceError` / "request limit exceeded" response shape, retrying with backoff,
   and never caching an error response as if it were real data.

## Known limitations (shown, not smoothed over)

- **459/512 real coverage as of this build — with 53 more real, recoverable, NOT
  genuine gaps.** Those 53 cities hit the same-day rate limit before this build
  finished; `data/air-quality.json`'s own `_meta.known_gap_cities_rate_limited_at_build`
  lists them by name. Re-running `scripts/gen_air_quality_data.py` after the quota
  resets (the cache only holds real successes, so a rerun only re-fetches the gaps)
  should recover most or all of them — this is an honest "not yet fetched," not a
  "no monitor exists here" claim, and should not be confused with the genuine
  no-monitor-nearby gaps other sparse-coverage datasets in this project carry.
- **A single build-time snapshot of "current conditions," not a trend** — AirNow's own
  data changes hour to hour in reality; this dataset bakes in whatever conditions were
  reported at build time, the same static-snapshot posture every dataset in this
  $0-cost, no-required-backend project takes.
- **The worse of PM2.5/ozone, not a full pollutant breakdown** — a location with
  moderate PM2.5 and moderate ozone reads identically to one with a single severe
  pollutant, if the peak AQI value happens to match; a real simplification, matching
  AQI's own official single-number convention rather than inventing a blended index.
- **A 50-mile search radius** — genuinely sparse in the rural West and Great Plains,
  the same monitor-sparsity caveat `dataset-backlog.md`'s own research on this
  candidate already names.

## Reproducing this dataset

```
python3 scripts/gen_air_quality_data.py
```

Requires a real `EPA_AIRNOW_API_KEY` in `.env` (free signup, see above). Caches each
city's raw AirNow response under `data/raw/air-quality-cache/` (gitignored — pure
fetch-scratch; a rerun only re-fetches cities without a cached success, so it's safe to
retry after a rate-limit window resets). Writes `data/air-quality.json`.
