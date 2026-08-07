# Design discussion — data-drive-round-5

## 0. Prelude

Same solo-operator process-fidelity note as the four prior epics this session.

## 1. Goal

A fifth data-drive research round, resolving EPA Superfund/NPL -- deferred since
`dataset-verification-drive`'s addendum, confirmed real and working via the same
docs-rendering technique that just resolved FBI hate crime.

## 2. Proposed approach

`scripts/gen_superfund_data.py` fetches, per state, real Superfund site records
from `data.epa.gov/dmapservice/sems.envirofacts_site/fk_ref_state_code/equals/{state}`
(51 requests, confirmed ~1-5s each). Counts real `npl_status_code=F` (Final NPL,
the currently-active Superfund site status) sites per county via each record's
real `fips_code` field, joined to the spine via the existing
`city-county-fips.json` crosswalk. Direct rescale, higher count = more concerning.

## 3. Risks

- **Risk**: some records have null `fips_code` (a real, partial data-quality gap
  in the source, not this project's own join failing).
  **Mitigation**: skip records with no real fips_code rather than guessing;
  disclosed in the methodology doc.

## 4. Scale assessment

**Small** (one dataset, reuses the existing county crosswalk entirely).
SCALE DECISION: Small → proceeding directly to stories.
--skip-sign-off honored: presenting as a summary, auto-advancing.
