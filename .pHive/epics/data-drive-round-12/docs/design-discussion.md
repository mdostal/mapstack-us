# Design Discussion: winter-cold-burden (41st real dataset)

## §0 Prelude — solo-operator run posture

Lean `/plan --fast --skip-sign-off` run, consumer repo (no vendored `hive/` lib,
`planning.collaborative_review: false`). No team review gate, no H/V phase.

## Goal

Add a 41st real, verified dataset: average annual days with minimum temperature
at or below freezing (32°F), via NOAA NCEI's real 1991-2020 Climate Normals —
the direct winter-cold complement to `heat.ts`'s existing extreme-heat-days
concern.

## Proposed approach

- **Source**: NOAA NCEI Climate Normals (`ncei.noaa.gov/access/services/search/v1/data`
  for station discovery, `ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/{station}.csv`
  for values), real, live, keyless.
- **Join**: two real requests per city, no crosswalk file. A `bbox` search near
  each city's own `lat`/`lon` (±0.5°) finds the real nearest normals station and
  its lat/lon; that station's own per-station CSV is fetched for the actual
  `ANN-TMIN-AVGNDS-LSTH032` value. Rate-limit-tested at 60 cities / 8x
  concurrency with zero errors before committing to the full 512-city build — a
  deliberate check after round 11's undocumented EPA ECHO rate limit.
- **Metric**: `ANN-TMIN-AVGNDS-LSTH032` (average days/year with min temp ≤32°F).
  Real, live-verified variation: Boonton NJ → 123.9 days, San Jacinto CA → 14.9
  days, Alpine UT → 132.6 days.

## Metric framing

Same convention as `heat.ts` (`HEAT_DAYS_CAP=150`, direct rescale, no inversion):
a real days-per-year quantity, direct-rescaled onto 0-100 with a data-informed
cap, higher = more concerning (more days of winter-cold exposure: heating costs,
ice/snow safety risk). Real per-city cap will be set from the actual full-512-
city build's printed distribution (checked before finalizing, not guessed),
following this session's established convention.

This is a genuinely new hazard angle: `heat.ts` covers the opposite tail
(extreme heat), `drought.ts`/`severe-weather.ts`/`earthquake.ts`/`hazard.ts`
cover distinct hazard categories entirely. No existing dataset measures winter
cold burden.

## Risks / open questions

- **Nearest-station imprecision.** The bbox search returns the nearest station(s)
  within the box, not a guaranteed single closest match — the build script picks
  the closest by real haversine distance among returned candidates, and widens
  the box if the initial ±0.5° box returns zero results (sparse-station rural
  areas).
- **Coverage**: expect close to 512/512 given NOAA's dense station network, but
  not guaranteed 100% — some remote spine cities may have no nearby normals
  station within a reasonable search radius. Any gap is disclosed honestly
  (null, not fabricated) rather than smoothed over.
- **Scale**: Small. Follows the now-established radius-join-adjacent pattern (a
  station search + per-station fetch, distinct from both round 10's pure
  server-side radius query and round 11's bulk-file local join, but conceptually
  similar). No H/V planning needed.

## Scale assessment

**Small.** Proceeding directly to a single story.
