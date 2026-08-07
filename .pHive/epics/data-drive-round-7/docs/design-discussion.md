# Design discussion — data-drive-round-7

## 0. Prelude

Same solo-operator process-fidelity note as the six prior epics this session.

## 1. Goal

A seventh data-drive research round. Resolves the IMLS Public Libraries Survey,
deferred twice this session, using a radius-based join instead of the file's own
unreliable city-name field -- the same lesson `tri-facility-density.ts` and
`drought.ts` already established: prefer real lat/lon over administrative city
names whenever both are available.

## 2. Proposed approach

`scripts/gen_library_access_data.py` downloads and caches the real IMLS PLS
FY2024 bulk CSV (a static file, not a query API), then for each spine city sums
real `VISITS` and `POPU_LSA` (population of legal service area, a real field
already in the same file -- no separate population fetch needed) across every
library system within a 10-mile radius of the city's own lat/lon. Computes
visits per capita, direct rescale or percentile rank, LOWER visits per capita =
more concerning (library access is a public-good-access framing, matching parks/
transit/walkability's existing "more access = better" convention rather than a
risk-framing dataset).

## 3. Risks

- **Risk**: a city near a metro-area boundary could double-count a
  neighboring city's library system within its own 10-mile radius, or a large
  regional library system serving many cities could inflate the per-capita
  denominator inconsistently.
  **Mitigation**: disclosed explicitly in the methodology doc as a real,
  inherent limitation of radius-based joins (the same disclosure
  `tri-facility-density.ts` already makes for its own radius approach) --
  library "service area" population is a real reported field, not invented, but
  summing overlapping service areas within a radius is an approximation.

## 4. Scale assessment

**Small** (one dataset, zero crosswalk needed -- direct lat/lon join, static
bulk file).
SCALE DECISION: Small → proceeding directly to stories.
--skip-sign-off honored: presenting as a summary, auto-advancing.
