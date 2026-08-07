# Winter cold burden — methodology

The forty-first real Mapstack dataset (ddr12-1, `data-drive-round-12` epic).
512/512 real coverage.

## What this measures

One layer, **Winter cold burden**, 0–100. Raw input is NOAA's own 30-year climate
normal: the average number of days per year with a minimum temperature at or
below 32°F/freezing (`ANN-TMIN-AVGNDS-LSTH032`). Already a meaningful,
externally bounded quantity (days per year), so it's directly rescaled onto
0–100 rather than a percentile rank among just the 512 spine cities — more
freezing days is more concerning (heating costs, ice/snow safety exposure).

This is the direct winter-cold complement to `heat.ts`'s existing extreme-heat
days dataset — the opposite tail of the same real climate signal, reusing the
exact same real NOAA station-inventory and nearest-match pipeline shape.

## Data source

[NOAA NCEI 1991–2020 U.S. Climate Normals](https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals),
fetched live via NOAA's NCEI Data Service API
(`https://www.ncei.noaa.gov/access/services/data/v1`, dataset
`normals-annualseasonal`) — free, no API key, no signup, confirmed live during
this build. Same real station inventory `heat.ts` already uses
(`https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/inventory_30yr.txt`,
15,615 rows).

A round-12 lesson applied here: after round 11's EPA ECHO build hit an
undocumented rate limit mid-run, this build's per-station-batch fetch pattern
(100 stations/request, ~157 requests total) was checked against NOAA's real
service before committing to the full run — the batched approach (proven
already by `heat.ts`) completed cleanly with zero errors.

## Method

1. **Station inventory + value fetch** (`scripts/fetch_winter_cold_stations.py`):
   the raw 15,615-station inventory includes thousands of precip/snow-only
   volunteer stations that report no temperature normal at all — the same real
   issue already documented in `heat-methodology.md`. Fixed the same way: fetch
   the real `ANN-TMIN-AVGNDS-LSTH032` value for every inventoried station first
   (one-time, cached under `data/raw/winter-cold-burden-cache/`, gitignored),
   keeping only the 6,740 stations that actually report it.
2. **Nearest-station match**: each of the 512 spine cities is matched to its
   closest freezing-days-reporting station by great-circle (haversine) distance.
   Real result: median distance 6.4 km, max 26.8 km — every city within a tight
   local match, matching heat.ts's own real distance spread.
3. **Rescale** (`scripts/gen_winter_cold_burden_data.py`): NOAA's API returns
   the value in *tenths* of a day (same convention already confirmed for
   `heat.ts`'s temperature normal). `concern = min(100, days / 180 × 100)` — the
   180-day cap comes from the real observed spine distribution (p50=44.3,
   p75=112.8, p90=144.4, p95=155.9, p99=182.9, max=196.9) — checked live before
   finalizing, not guessed.

## Known limitations (shown, not smoothed over)

- **8 cities clamp to 100 concern** — Flagstaff AZ (196.9 days/year, the
  coldest spine city by this measure), Longmont CO, Anchorage AK, Taos NM,
  Bismarck ND, and 3 more exceed the 180-day cap. An honest "these are the
  coldest places in the spine" read, not a data gap — each has a real, distinct
  underlying day count, compressed to the same maximum-concern score the same
  way `heat.ts`'s own cap treats its hottest tail.
- **30-year climate normal, not a live yearly reading** — reflects the
  1991–2020 climatological average, not this year's actual freezing-day count;
  `supportsTime: false`, the same single-snapshot posture as `heat.ts`.
- **Nearest-station, not on-site measurement** — a city's real winter exposure
  can differ from its matched station's, especially for cities with real
  microclimate variation (elevation, coastal moderation). Median match distance
  (6.4 km) is tight; worst case (26.8 km) is still a strong real match.
- **A single threshold (32°F), not a wind-chill or "feels like" measure** —
  NOAA's normal counts raw dry-bulb minimum temperature days, not a wind-chill-
  adjusted measure; two cities with the same freezing-day count can have
  meaningfully different real cold-weather severity depending on typical wind
  conditions, a conflation worth naming the same way `heat.ts`'s methodology
  names its own dry-bulb-vs-heat-index limitation.

## Reproducing this dataset

```
python3 scripts/fetch_winter_cold_stations.py
python3 scripts/gen_winter_cold_burden_data.py
```

Both scripts require no API key or account. Caches the raw station inventory
and every station's freezing-days fetch under
`data/raw/winter-cold-burden-cache/` (gitignored — pure fetch-scratch, safe to
delete and re-fetch any time) and commits the final city→station match table at
`data/raw/winter-cold-burden-station-matches.json` (same posture as
`data/raw/heat-station-matches.json`). Writes `data/winter-cold-burden.json`.
