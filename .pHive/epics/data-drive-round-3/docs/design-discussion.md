# Design discussion — data-drive-round-3

## 0. Prelude

Same solo-operator process-fidelity note as the two prior epics this session.

## 1. Goal

A third fresh dataset-candidate research round, per the user's explicit "keep going,
execute the next set of hive stuff" direction. Ship the strongest real finding:
county-level drought severity from the real US Drought Monitor API.

## 2. Proposed approach

`scripts/gen_drought_data.py` fetches, per unique county in the existing
`city-county-fips.json` crosswalk, the most recent week's real drought-severity
percentages from `usdmdataservices.unl.edu`. Uses the `D2` column (% of county area
in Severe Drought or worse) as the raw value -- already a real, natively-bounded
0-100 percentage, direct mapping (no rescale needed), higher = more concerning.
Caches each county's response (real fetch-scratch convention, same as every other
dataset script this session).

## 3. Risks

- **Risk**: ~480 sequential requests at ~0.6s each is a real, non-trivial fetch time
  (~5 minutes).
  **Mitigation**: same caching convention as every other script -- a re-run after an
  interruption resumes from cache, doesn't restart.
- **Risk**: drought severity is inherently seasonal/volatile (a real snapshot, not a
  stable characteristic like property tax rate).
  **Mitigation**: disclosed explicitly in the methodology doc as a real limitation,
  same posture as `air-quality.ts`'s own "a snapshot, not a trend" disclosure.

## 4. Scale assessment

**Small** (one dataset, one new keyless endpoint, reuses an existing crosswalk).
SCALE DECISION: Small → proceeding directly to stories.
--skip-sign-off honored: presenting as a summary, auto-advancing.
