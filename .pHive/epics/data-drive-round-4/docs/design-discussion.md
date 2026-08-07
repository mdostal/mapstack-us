# Design discussion — data-drive-round-4

## 0. Prelude

Same solo-operator process-fidelity note as the prior three epics this session.

## 1. Goal

A fourth data-drive research round. FBI hate crime, EPA Superfund, DOT AADT, and
HUD Fair Market Rents are all real but deferred (docs-access, wrong-service-name,
or new-key blockers respectively). Ship the round's real, validated find: SDWA
drinking water violations at each city's primary municipal water system.

## 2. Proposed approach

`scripts/gen_drinking_water_data.py`, per city: query `WATER_SYSTEM` by
`city_name`+`state_code`+`pws_type_code=CWS`+`pws_activity_code=A`, take the
highest-`population_served_count` match as the city's real primary system (matches
this session's own live validation: Houston's top match is "CITY OF HOUSTON" at
2.97M served, correctly the real municipal utility). Then query `VIOLATION` for
that system's `pwsid`, count real health-based violations
(`is_health_based_ind=Y`) with `compl_per_begin_date` in the last 5 years -- the
same "recent, real years" recency window `crime.ts` already established as this
project's convention for time-bounded government data.

## 3. Risks

- **Risk**: the city-name text match could occasionally surface the wrong system
  for cities with ambiguous or duplicate names across states (mitigated by the
  `state_code` filter already being part of every query) or where the real
  municipal utility has a non-obvious name (e.g. a regional authority rather than
  "City of X").
  **Mitigation**: taking the highest-population match is a real, defensible
  heuristic (validated live against Houston); disclosed explicitly in the
  methodology doc as a real, non-FIPS join with an inherent small error rate,
  not silently presented as exact.
- **Risk**: ~1,024 requests (2 per city) at real network latency is a
  non-trivial fetch time.
  **Mitigation**: same per-city caching convention as every other script.

## 4. Scale assessment

**Small** (one dataset, reuses no existing crosswalk since this join is name-based,
but follows the exact same wrapper pattern as every other dataset).
SCALE DECISION: Small → proceeding directly to stories.
--skip-sign-off honored: presenting as a summary, auto-advancing.
