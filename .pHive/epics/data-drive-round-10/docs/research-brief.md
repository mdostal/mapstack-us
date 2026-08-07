# Research Brief: data-drive-round-10 (historic-site-density, the 39th real dataset)

## §0 Prelude — solo-operator run posture

This is a lean `/plan --fast --skip-sign-off` run in a consumer repo with `.pHive/`
state but no vendored `hive/` library (`ls hive/` → not found) and
`planning.collaborative_review: false`. No H/V phase, no user-facing sign-off
gates, no subagent team spawn — this brief, the design discussion, and the
story YAML are authored directly by the orchestrator, consistent with all 9
prior epics shipped this session (dataset-verification-drive through
data-drive-round-9).

## Context: what's already shipped

38 real datasets are live in `src/lib/datasets/registry.ts`. This session (data-drive
rounds 1-9) has repeatedly proven two techniques:

1. **Prefer a real lat/lon radius join over a source's own city-name field.** City-name
   fields are administrative/mailing addresses, not real service areas. Proven costly
   when ignored (SDWA water systems), proven as the fix for tri-facility-density.ts and
   library-access.ts.
2. **Render a provider's own interactive API docs page via Playwright when endpoint
   guessing fails 3+ times.** Not needed this round — the NPS ArcGIS REST API is
   self-documenting via its own `?f=json` metadata endpoint, no guessing required.

## Candidate evaluated: EIA electricity retail-sales price

`api.eia.gov/v2/electricity/retail-sales/data/` with `api_key=DEMO_KEY` returned an
empty body on a live curl test — DEMO_KEY does not appear to grant real access to this
endpoint (same shape as the HUD Fair Market Rents block from an earlier round: needs a
real free-registration key not yet obtained). Deferred, not pursued further this round —
consistent with how HUD FMR was deferred (explicitly flagged as needing user-side
registration, not attempted with a placeholder key).

## Candidate selected: NPS National Register of Historic Places (NRHP)

Live-verified via direct `curl` against the real production endpoint, zero key required:

- Base: `https://mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer/0`
- Total records: `72,668` (verified via `returnCountOnly=true&where=1=1`)
- Real point geometry, WGS84 (`wkid: 4326`) — confirmed via the layer's own `?f=json` metadata
- **City-name field is unreliable** (same pattern as tri/library): `City='NEW YORK' AND State='NY'` →
  `{"count":0}`. Confirms the radius-join technique is required, not optional.
- **Server-side spatial radius query works directly** — no bulk download, no local
  haversine needed (a first for this session; every prior radius-join dataset did the
  haversine client-side against a downloaded file). Verified live:
  - `geometry=-74.0060,40.7128&geometryType=esriGeometryPoint&inSR=4326&distance=10&units=esriSRUnit_StatuteMile&spatialRel=esriSpatialRelIntersects&returnCountOnly=true`
    → New York NY: **815** sites within 10mi
  - Same query centered on Bozeman MT (45.6770,-111.0429) → **56** sites within 10mi
  - Real, plausible variation between a dense historic East-coast metro and a smaller
    Mountain West city.
- `maxRecordCount: 2000` on the service, but `returnCountOnly` queries don't hit that cap
  (they return a scalar count, not features) — one HTTP request per city, ~512 requests
  total, no pagination needed.

## Open question for the design discussion to resolve

Raw NRHP count within 10mi will vary hugely by city age/settlement history (colonial-era
East Coast cities vs. younger Sun Belt/Mountain West cities) independent of any
"concerning" framing. Before finalizing the metric, pull real counts for a representative
sample of `data/cities.json` and inspect the distribution (median, p90, p99) to decide
raw-count vs. population-normalized rate. This check happens during the build step
(`scripts/gen_historic_site_density_data.py`'s first exploratory run), consistent with
the session's established "check the real distribution before finalizing the cap/metric"
convention (used for TRI, Superfund, severe-weather, and the FCC broadband metric pivot).
