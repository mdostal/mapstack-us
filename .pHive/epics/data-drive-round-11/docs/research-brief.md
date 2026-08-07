# Research Brief: data-drive-round-11 (environmental-violations, the 40th real dataset)

## §0 Prelude — solo-operator run posture

Lean `/plan --fast --skip-sign-off` run, consumer repo (no vendored `hive/` lib,
`planning.collaborative_review: false`). Authored directly by the orchestrator,
same shape as all 10 prior epics this session.

## Candidates evaluated and deferred/rejected

- **USDA NASS QuickStats** (agricultural data): live-tested with `api_key=DEMO_KEY`
  → `{"error":["unauthorized"]}` (HTTP 401). Needs a real free-registration key, same
  posture as HUD FMR and EIA electricity pricing from earlier rounds — deferred, not
  pursued further this round (requires user-side registration).
- **EPA TSCA (Toxic Substances Control Act) chemical inventory via Envirofacts**:
  guessed table name `tsca_active_inventory` → real live 404 ("table is not
  available"). Tried the docs-rendering technique (rendering
  `epa.gov/enviro/envirofacts-data-service-api` and
  `enviro.epa.gov/envirofacts/metadata/search` via Playwright) — the metadata search
  page is a broken client-side app (2 console errors, empty body, no search form
  rendered). A second attempt to render `echo.epa.gov/tools/web-services/facility-
  search-all` for reference also timed out (60s), consistent with the elevated system
  load already observed earlier this session. Abandoned as genuinely infeasible this
  round rather than continuing to guess table names.

## Candidate selected: EPA ECHO (Enforcement and Compliance History Online)

Live-verified via direct `curl` against `echodata.epa.gov/echo/echo_rest_services.get_facilities`,
zero key required, genuinely distinct API from the `data.epa.gov/dmapservice`/
`efservice` Envirofacts APIs already used for TRI/Superfund this session:

- `?output=JSON&p_lat={lat}&p_long={lon}&p_radius=10` — a real, live, keyless
  server-side radius query (same pattern proven this session by NRHP in round 10: the
  server computes the geo-intersection, one HTTP request per city, no bulk download).
- Verified live: New York NY → `SVRows: 69` (Significant Violations), `CVRows: 471`
  (Current Violations), `QueryRows: 63030` (all regulated facilities); Bozeman MT →
  `SVRows: 2`; Taos NM → `SVRows: 0`. Real, plausible variation.
- **SVRows** ("Significant Violations") is standard EPA ECHO terminology for
  facilities in serious/chronic regulatory noncompliance across the Clean Air Act,
  Clean Water Act, and RCRA hazardous-waste programs combined — a genuinely distinct
  signal from `tri-facility-density.ts` (toxic release reporting volume, not
  violations) and `superfund.ts` (contaminated-site remediation status, not active
  compliance). This measures active regulatory noncompliance.
- Field-name confirmation: attempted to render the ECHO REST API's own Swagger docs
  page (`echo.epa.gov/tools/web-services/facility-search-all`) for a formal field
  glossary; the page timed out loading (60s) under the same elevated system load
  observed earlier this session. Proceeded instead on the strength of thorough live
  empirical verification — 63+ real live requests across this research phase, zero
  failures, coherent `"Message":"Success"` responses, and SVRows/CVRows are
  well-established public EPA ECHO terminology (used throughout echo.epa.gov's own
  public compliance reports).

## Real distribution check (60-city sample, before finalizing the metric)

```
n=60, all succeeded
p50: 7
p75: 15
p90: 41
p95: 91
p99: 184
max (sample): 184
7/60 cities with zero significant violations
```

**Decision: raw SVRows count, direct-rescale-with-observed-cap, higher = more
concerning** (NOT inverted — unlike round 10's historic-site-density, more nearby
active violations is straightforwardly more concerning, matching the
TRI/Superfund/severe-weather convention). `COUNT_CAP = 41` (real p90).
