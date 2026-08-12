# Severe weather frequency — methodology

The thirty-seventh real Mapstack dataset (ddr8-1, `data-drive-round-8` epic).
512/512 real coverage.

## What this measures

One layer, **Severe weather frequency**, 0–100. Raw input is the real count of
severe weather events (tornado, thunderstorm wind, hail, flood, and other real
NOAA-tracked event types) recorded in each city's county at a given real year.
A count has no natural 100-point ceiling, so this uses a direct rescale
capped at a FIXED count (70, the real p90 for the 2024 vintage) applied
identically across every year so a city's count stays honestly comparable
year to year, higher count = more concerning.

Real multi-year history — **1950–2026** (`supportsTime: true`), per explicit
operator direction to get "as much data as possible" for real trends over
time. NOAA's own public directory listing confirmed a real, contiguous range
with no gaps.

This is a genuinely new hazard signal for this project — `hazard.ts`'s FEMA
National Risk Index layers cover flood and wildfire; `earthquake.ts` covers
seismic risk. Neither covers storm/tornado/hail frequency.

## Data source

[NOAA Storm Events Database](https://www.ncdc.noaa.gov/stormevents/), via its
real public bulk-download directory (`ncei.noaa.gov/pub/data/swdi/stormevents/
csvfiles/`) — a real static gzipped CSV per real year, no API, no key.

## Method

1. **Real per-year file discovery**: every year's exact filename was read
   directly off NOAA's own live directory listing rather than guessed — each
   file is named `StormEvents_details-ftp_v1.0_d{YEAR}_c{PUBLISH_DATE}.csv.gz`,
   and the `c{PUBLISH_DATE}` "created/revised" suffix isn't predictable from
   the year alone (most years share one recent revision date, but 1984, 2017,
   2022, 2024, 2025, and 2026 each carry a real, different, more recent
   revision date).
2. Filter to `CZ_TYPE = 'C'` — county-based NWS zones, confirmed to join
   directly and reliably to real county FIPS via `STATE_FIPS` + `CZ_FIPS`
   (verified live against a real sample event: `STATE_FIPS=40` +
   `CZ_FIPS=141` → `40141`, Tillman County, OK, matching that event's own
   real location text). Events reported only against `CZ_TYPE = 'Z'` (NWS
   forecast zones) or `'M'` (marine zones) are excluded — those use a
   separate NWS zone code this project has no direct county crosswalk for.
3. Count real events per county per real year, join to the spine via the
   existing `city-county-fips.json` crosswalk — zero new geocoding.

## Known limitations (shown, not smoothed over)

- **NOAA's own tracked event-type taxonomy expanded significantly over
  time** — a real, disclosed methodology fact, not a data-quality gap on this
  project's end. The Storm Events Database began in 1950 tracking ONLY
  tornadoes, added thunderstorm wind and hail in 1955, and didn't reach its
  full modern ~50-category taxonomy until 1996. Real early-decade event
  counts are consequently far lower than recent decades' — the real 1950
  file is ~10KB versus the real 2024 file's ~13MB — reflecting NOAA's own
  historical reporting scope, the same class of caveat `crime.ts` already
  discloses for its own NIBRS-transition coverage jump.
- **`CZ_TYPE='C'` events only** — a real, deliberate scope decision that
  excludes events reported only against NWS forecast zones. This is a
  meaningful real subset of all storm reports, not the complete national
  total, consistently applied across every real year.
- **Raw event count, not severity-weighted** — a minor hail report and a
  fatal tornado both count as one event. The real source data has real
  `DEATHS_DIRECT`/`INJURIES_DIRECT`/`DAMAGE_PROPERTY` fields a future pass
  could weight by.
- **The current, in-progress year's real data is genuinely partial, and now
  explicitly disclosed** — a real bug found live by this project's own QA
  sweep: NOAA's current-year file is published incrementally, so at the time
  of a given build it can genuinely only cover the first few months (e.g.
  2026's real file, as of this build, has events only through April) —
  computed directly from the file's own real `BEGIN_YEARMONTH` values, not
  assumed from the calendar. An undisclosed 0-event result for a
  low-activity-so-far state/county in that partial year read as a confident
  "risk-free" score rather than "not yet reported" (this hit Arizona and
  Nevada hardest, since their real severe-weather season is
  monsoon-driven, June–September — squarely in the months NOT YET covered).
  Every completed real year has a full 12 months covered; only the
  in-progress year's detail string carries this note.

## Reproducing this dataset

```
python3 scripts/gen_severe_weather_data.py
```

No API key required. Requires `data/raw/city-county-fips.json` to already
exist. Caches each real year's bulk file under `data/raw/severe-weather-cache/`
(gitignored — pure fetch-scratch, safe to delete and re-fetch any time;
resumable on rerun). Writes `data/severe-weather.json` with every real year
1950-2026.
