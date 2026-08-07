# Design Discussion: environmental-violations (40th real dataset)

## §0 Prelude — solo-operator run posture

Lean `/plan --fast --skip-sign-off` run, consumer repo (no vendored `hive/` lib,
`planning.collaborative_review: false`). No team review gate, no H/V phase.

## Goal

Add a 40th real, verified dataset: density of facilities in EPA-tracked
"Significant Violation" status (active, serious regulatory noncompliance across
Clean Air Act, Clean Water Act, and RCRA hazardous-waste programs) within 10 miles
of each city, via EPA's ECHO (Enforcement and Compliance History Online) REST API.

## Proposed approach

- **Source**: `echodata.epa.gov/echo/echo_rest_services.get_facilities`, a real,
  live, keyless EPA REST API, genuinely distinct from the `data.epa.gov`
  Envirofacts APIs already used for `tri-facility-density.ts` and `superfund.ts`.
- **Join**: server-side spatial radius query (`p_lat`/`p_long`/`p_radius=10`),
  the second dataset this session (after round 10's NRHP) to use a pure
  server-side radius query with zero bulk download and zero local haversine —
  one HTTP request per city returns an exact aggregate count.
- **Metric**: `SVRows` (Significant Violations) from the response — real,
  live-verified variation (NYC: 69, Bozeman MT: 2, Taos NM: 0). Standard EPA ECHO
  terminology for facilities in serious/chronic noncompliance, aggregated across
  CAA/CWA/RCRA. Distinct signal from TRI (release-reporting volume) and Superfund
  (contaminated-site status) — this is active regulatory violations.

## Metric decision (real distribution checked before finalizing)

60-city random sample (seed 42, same sample as round 10 for direct comparability):

```
p50: 7
p75: 15
p90: 41
p95: 91
p99: 184
7/60 cities with zero significant violations
```

**Decision: raw count, direct-rescale-with-observed-cap, higher = more concerning**
(the TRI/Superfund/severe-weather convention, NOT the inverted "access" convention
used for round 10's historic-site-density). `COUNT_CAP = 41` (real p90). Formula:
`concern = min(100, (count / 41) * 100)`.

## Risks / open questions

- **No formal API docs available.** Attempted to render ECHO's Swagger docs page
  via Playwright for a formal SVRows/CVRows field glossary; it timed out (60s)
  under the elevated system load already observed earlier this session. Proceeded
  on live empirical verification instead (63+ successful live requests, zero
  failures, coherent responses) plus SVRows/CVRows being well-established public
  EPA ECHO terminology used throughout echo.epa.gov's own public compliance
  reports. Documented as a real limitation in the methodology doc rather than
  smoothed over.
- **Cross-program aggregate, not single-statute.** SVRows combines CAA + CWA +
  RCRA significant violations into one number — a city could be high because of
  one dominant program's violations. A future pass could break this into
  per-program layers if the underlying per-program fields are confirmed.
- **10-mile radius crosses city boundaries**, same disclosed limitation as
  round 10's historic-site-density (a real reflection of regional facility density,
  not strictly within-city-limits).
- **Coverage**: expect 512/512 (every city has lat/lon, and a 0-violation response
  is a valid real value, not a missing-data signal).
- **Scale**: Small. Follows the now twice-proven server-side-radius-query pattern
  (round 10). No H/V planning needed.

## Scale assessment

**Small.** Proceeding directly to a single story.
