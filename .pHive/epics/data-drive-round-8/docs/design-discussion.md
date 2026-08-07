# Design discussion — data-drive-round-8

## 0. Prelude

Same solo-operator process-fidelity note as the seven prior epics this session.

## 1. Goal

An eighth data-drive research round. Ships NOAA Storm Events severe-weather
event frequency -- a genuinely new hazard signal (storm/tornado/hail frequency)
distinct from `hazard.ts`'s FEMA flood/wildfire and `earthquake.ts`'s seismic
risk.

## 2. Proposed approach

`scripts/gen_severe_weather_data.py` downloads and caches the real NOAA Storm
Events 2024 bulk CSV (static file, no API/key). Filters to `CZ_TYPE='C'`
(county-zone events), counts real events per county via `STATE_FIPS`+`CZ_FIPS`,
joins to the spine via the existing `city-county-fips.json` crosswalk. Direct
rescale, higher event count = more concerning.

## 3. Risks

- **Risk**: a single year's event count is a real, but volatile, snapshot --
  severe weather frequency varies significantly year to year.
  **Mitigation**: disclosed explicitly in the methodology doc, same posture as
  `drought.ts`'s own "a real snapshot, not a stable characteristic" disclosure.
- **Risk**: `CZ_TYPE='C'` excludes real events reported only against NWS
  forecast zones (`CZ_TYPE='Z'`), a real, partial undercount for some events.
  **Mitigation**: disclosed explicitly -- county-zone reporting is the
  reliable, FIPS-joinable subset; forecast-zone events would need a separate,
  more complex zone-to-county crosswalk NOAA doesn't publish directly.

## 4. Scale assessment

**Small** (one dataset, reuses the existing county crosswalk entirely).
SCALE DECISION: Small → proceeding directly to stories.
--skip-sign-off honored: presenting as a summary, auto-advancing.
