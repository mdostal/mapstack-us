# Research Brief: data-drive-round-12 (winter-cold-burden, the 41st real dataset)

## §0 Prelude — solo-operator run posture

Lean `/plan --fast --skip-sign-off` run, consumer repo (no vendored `hive/` lib,
`planning.collaborative_review: false`). Authored directly by the orchestrator,
same shape as all 11 prior epics this session.

## Candidate selected: NOAA NCEI 1991-2020 Climate Normals

Live-verified via direct `curl` against NCEI's real, keyless services:

- **Search service** (`ncei.noaa.gov/access/services/search/v1/data?dataset=normals-annualseasonal&bbox={N},{W},{S},{E}`)
  — real, live, keyless. A `bbox` query centered on a city (±0.5°) returns real
  nearby stations with real lat/lon (`boundingPoints`) and a `filePath` pointing
  to that station's per-station CSV. Rate-limit tested: 60 concurrent (8x worker)
  requests, zero errors — a real, deliberate check this round after being burned
  by EPA ECHO's undocumented 300/hour rate limit in round 11.
- **Per-station data files** (`ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/{STATION_ID}.csv`)
  — real, self-describing CSVs with `LATITUDE`/`LONGITUDE` embedded in the header
  plus dozens of real climate-normal fields (temperature, precipitation, snow,
  degree-days).

## Metric selected: `ANN-TMIN-AVGNDS-LSTH032`

Average number of days per year with a minimum temperature at or below 32°F
(freezing) — real values confirmed live: Boonton, NJ → 123.9 days; San Jacinto,
CA → 14.9 days; Alpine, UT → 132.6 days. Real, plausible variation.

This is a genuinely new angle: `heat.ts` already covers extreme-heat concern;
this is the direct opposite-tail complement — winter cold burden (heating costs,
ice/snow safety exposure) — not covered by any existing dataset (`drought.ts`,
`severe-weather.ts`, `earthquake.ts`, and `hazard.ts`'s FEMA flood/wildfire
layers are all distinct hazard categories).

## Method (two real requests per city, no crosswalk file needed)

1. Bbox search near each city's own `lat`/`lon` (±0.5°) to find the nearest real
   normals station and its `filePath`.
2. Fetch that station's per-station CSV, read `ANN-TMIN-AVGNDS-LSTH032` directly
   from the header row.

## Deferred/rejected this round

- USDA NASS QuickStats — needs a real registration key (`DEMO_KEY` unauthorized,
  same posture as HUD FMR/EIA). Not re-attempted.
- EPA TSCA chemical inventory via Envirofacts — genuinely infeasible (table not
  available, metadata docs page broken client-side app). Not re-attempted.
- USGS Water Services (`waterservices.usgs.gov`) — returned an HTML error page on
  a first probe (params likely wrong); not pursued further once NOAA Climate
  Normals proved out as a strong, real, already-verified candidate.
- EPA FRS (Facility Registry Service) — real and live, but relies on the same
  unreliable `city_name` administrative field already proven problematic
  elsewhere this session, and isn't itself a "concern" metric (a facility
  registry, not a hazard/violation signal) without combining with another
  dataset. Not pursued as a standalone candidate.
