# Design discussion — tri-bulk-and-data-drive-2

## 0. Prelude

Same solo-operator process-fidelity note as `dataset-verification-drive`: this consumer
repo has `.pHive/` state but no vendored `hive/` library, so this plan runs the real
decomposition (research, design, stories) and skips infrastructure-dependent mechanics
(kg emit, scope-drift telemetry, tracker publishing) that need modules not present here.

## 1. Goal

Two stories, continuing directly from `dataset-verification-drive`'s addendum:

1. **Ship EPA TRI facility density** using the real bulk-download endpoint discovered
   in research (a completely different, fast access path from the one that blocked
   dvd-6) — the strongest candidate from the prior epic's research that never got
   built.
2. **Run a genuinely new round of dataset-candidate research** beyond both prior
   sweeps, and build/ship the best finding.

## 2. Proposed approach

**TRI facility density:**
- `scripts/gen_tri_facility_density_data.py` downloads the real 2024 national Basic
  Data File (one request, ~60s, confirmed live), dedups to 3,525 unique facilities by
  `TRIFD`, then computes each city's facility count within a fixed radius (10 miles,
  haversine) against its own real lat/lon already in `data/cities.json` — no crosswalk
  needed at all, since both sides already carry real coordinates.
- Direct rescale, capped at a data-informed ceiling from the real observed
  distribution, higher count = more concerning (proximity to more reporting industrial
  facilities).
- Same wrapper pattern as all 29 existing datasets: script → JSON → `.ts` wrapper →
  methodology doc → unit test → e2e test → registry → README.

**Data-drive round 2:**
- Fresh research pass, live-checking real candidates genuinely not touched by either
  prior sweep (the original `dataset-backlog.md` or `dataset-verification-drive`'s
  addendum).
- Build the single best candidate found, following the same wrapper pattern.

## 3. Risks

- **Risk**: the 2024 Basic Data File could itself be slow/unavailable at build time
  (transient EPA outage).
  **Mitigation**: cache the raw CSV the first time it's fetched (same posture as every
  other dataset script's `data/raw/*-cache/` convention) so a re-run never re-downloads
  unnecessarily.
- **Risk**: 10-mile radius is an arbitrary choice.
  **Mitigation**: same posture as `air-quality.ts`'s existing `DISTANCE_MILES = 50`
  constant — a named, documented, easily-adjustable constant, not a hidden magic
  number, with the real observed distribution printed at build time to sanity-check
  the choice.

## 4. Scale assessment

**Medium** (two independent multi-file dataset builds, no shared code beyond both
following the existing wrapper pattern).

SCALE DECISION: Medium + --fast → skipping H/V planning, proceeding directly to
stories. --skip-sign-off honored: presenting as a summary, auto-advancing.
