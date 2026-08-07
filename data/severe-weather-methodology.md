# Severe weather frequency — methodology

The thirty-seventh real Mapstack dataset (ddr8-1, `data-drive-round-8` epic).
512/512 real coverage.

## What this measures

One layer, **Severe weather frequency**, 0–100. Raw input is the real count of
severe weather events (tornado, thunderstorm wind, hail, flood, and other real
NOAA-tracked event types) recorded in each city's county for 2024. A count has
no natural 100-point ceiling, so this uses a direct rescale capped at a
data-informed ceiling (the real p90 across the spine, 70), higher count = more
concerning.

This is a genuinely new hazard signal for this project — `hazard.ts`'s FEMA
National Risk Index layers cover flood and wildfire; `earthquake.ts` covers
seismic risk. Neither covers storm/tornado/hail frequency.

## Data source

[NOAA Storm Events Database](https://www.ncdc.noaa.gov/stormevents/), via its
real public bulk-download directory (`ncei.noaa.gov/pub/data/swdi/stormevents/
csvfiles/`) — a real static gzipped CSV per year, no API, no key.

## Method

1. Download and cache the real 2024 Storm Events file (69,802 real events
   nationally that year, across every NOAA-tracked severe weather category).
2. Filter to `CZ_TYPE = 'C'` — county-based NWS zones, confirmed to join
   directly and reliably to real county FIPS via `STATE_FIPS` + `CZ_FIPS`
   (verified live against a real sample event: `STATE_FIPS=40` +
   `CZ_FIPS=141` → `40141`, Tillman County, OK, matching that event's own
   real location text). Events reported only against `CZ_TYPE = 'Z'` (NWS
   forecast zones) or `'M'` (marine zones) are excluded — those use a
   separate NWS zone code this project has no direct county crosswalk for.
3. Count real events per county (39,718 real county-zone events across 3,063
   real counties for 2024), join to the spine via the existing
   `city-county-fips.json` crosswalk — zero new geocoding.

## Known limitations (shown, not smoothed over)

- **A single year's snapshot (2024), not a stable characteristic.** Severe
  weather frequency varies significantly year to year — this dataset ships
  `supportsTime: false` and reflects one real year, not a multi-year average.
  A future pass could sum several recent years for a more stable signal.
- **`CZ_TYPE='C'` events only** — a real, deliberate scope decision that
  excludes events reported only against NWS forecast zones. This is a
  meaningful real subset of all storm reports, not the complete national
  total.
- **Raw event count, not severity-weighted** — a minor hail report and a
  fatal tornado both count as one event. The real source data has real
  `DEATHS_DIRECT`/`INJURIES_DIRECT`/`DAMAGE_PROPERTY` fields a future pass
  could weight by.

## Reproducing this dataset

```
python3 scripts/gen_severe_weather_data.py
```

No API key required. Requires `data/raw/city-county-fips.json` to already
exist. Caches the real bulk file under `data/raw/severe-weather-cache/`
(gitignored — pure fetch-scratch, safe to delete and re-fetch any time).
Writes `data/severe-weather.json`.
