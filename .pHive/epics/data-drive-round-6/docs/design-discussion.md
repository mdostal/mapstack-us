# Design discussion — data-drive-round-6

## 0. Prelude

Same solo-operator process-fidelity note as the five prior epics this session.

## 1. Goal

A sixth data-drive research round. Ship USGS seismic design values (earthquake
risk) -- a genuinely new hazard category not represented anywhere in this
project's existing `hazard.ts` (FEMA flood/wildfire only).

## 2. Proposed approach

`scripts/gen_earthquake_data.py` fetches, per city, real seismic design
parameters from `earthquake.usgs.gov/ws/designmaps/asce7-22.json` using each
city's own real lat/lon already in `data/cities.json` -- no crosswalk at all.
Uses `sds` (Design Spectral Response Acceleration, short period) as the raw
value, direct rescale capped at a data-informed ceiling (see the real observed
distribution at build time), higher = more concerning. `siteClass=D` (stiff
soil) as the standard ASCE 7 default, `riskCategory=I` (standard occupancy).

## 3. Risks

- **Risk**: ~512 sequential requests at ~0.8s each is a real, non-trivial fetch
  time (~7 minutes).
  **Mitigation**: same per-city caching convention as every other script --
  resumable on interruption.
- **Risk**: `siteClass=D` is a real, standard default, but not every city's
  actual soil type -- a real precision gap for cities with unusual (very soft
  or very hard) local soil conditions.
  **Mitigation**: disclosed explicitly in the methodology doc as a real,
  named simplification, matching this project's `RADIUS_MILES`/`COUNT_CAP`-style
  constant-naming convention for similar judgment calls.

## 4. Scale assessment

**Small** (one dataset, zero crosswalk work, direct lat/lon join).
SCALE DECISION: Small → proceeding directly to stories.
--skip-sign-off honored: presenting as a summary, auto-advancing.
