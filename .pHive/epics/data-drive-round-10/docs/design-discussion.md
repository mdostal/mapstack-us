# Design Discussion: historic-site-density (39th real dataset)

## §0 Prelude — solo-operator run posture

Lean `/plan --fast --skip-sign-off` run, consumer repo (no vendored `hive/` lib,
`planning.collaborative_review: false`). No team review gate, no H/V phase. This
document is authored directly by the orchestrator following the same shape used for
all 9 prior epics this session.

## Goal

Add a 39th real, verified dataset: density of NPS National Register of Historic
Places (NRHP)-listed sites within 10 miles of each city, as a proxy for connection
to protected/recognized built heritage. Follows the "access" framing convention
already established by `parks.ts`, `library-access.ts`, and `transit-access.ts`.

## Proposed approach

- **Source**: `mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer/0`,
  a real, live, keyless NPS ArcGIS FeatureServer. 72,668 total listed resources
  nationally, real point geometry (WGS84).
- **Join**: server-side spatial radius query (`geometryType=esriGeometryPoint&distance=10&units=esriSRUnit_StatuteMile&spatialRel=esriSpatialRelIntersects&returnCountOnly=true`)
  centered on each city's own `lat`/`lon` from `data/cities.json`. This is a genuine
  first for the session — every prior radius-join dataset (tri-facility-density,
  library-access) downloaded a bulk file and did the haversine join client-side in
  Python; here the ArcGIS server does the spatial math and returns an exact scalar
  count per request. One HTTP request per city, 512 total, no bulk download, no
  pagination (the query returns a count, not features, so `maxRecordCount: 2000`
  never applies).
- **Why not the source's own City/State field**: confirmed live and unreliable, same
  pattern as tri-facility-density and library-access this session — `City='NEW YORK'
  AND State='NY'` returns `{"count":0}` even though 800+ real NRHP sites exist within
  NYC's real metro radius. The radius join is not optional here.

## Metric decision (real distribution checked before finalizing)

Pulled real per-city counts for a random sample of 60 cities (seed 42, `data/cities.json`)
via the live server-side radius query:

```
n=60, all succeeded
p50: 57
p75: 110
p90: 289
p95: 585
p99: 637
max (sample): 637   (NYC itself, checked separately: 802-815 depending on exact coords)
```

**Finding: raw count does NOT correlate with city population.** Younger Sun Belt/
suburban cities (Lewisville TX: 1, Manteca CA: 1, Pearland TX: 1, O'Fallon MO: 4) score
near zero regardless of current population, while older or metro-adjacent cities score
high independent of their own population (Ankeny IA, a 78k-person Des Moines suburb,
scores 96 -- the radius pulls in Des Moines' historic urban core). This means a
population-normalized rate would not "fix" anything here -- the 10-mile radius is
already the normalizing unit (a fixed-radius sample of the built landscape around each
city), not a per-capita quantity. **Decision: raw count, direct-rescale-with-observed-cap**
-- the same convention already used for `tri-facility-density.ts` (COUNT_CAP),
`superfund.ts` (COUNT_CAP), and `severe-weather.ts` (COUNT_CAP), NOT the
percentile-rank-inverted convention used for CBP-derived datasets like
`average-wage.ts`/`business-density.ts`.

**COUNT_CAP = 290** (rounded real p90 from the 60-city sample). Formula:
`concern = 100 * (1 - min(count, CAP) / CAP)`, so a city with 0 nearby NRHP sites
scores concern=100 (max concerning -- weakest connection to protected heritage) and a
city at or above the p90 count (≈290+) scores concern=0 (least concerning -- richest
nearby historic-preservation density). This intentionally lets the top ~10% of cities
by real historic density (Alexandria VA: 619, New York NY: ~810) all floor out at
concern=0 rather than stretching the scale to accommodate NYC's outlier count, matching
the same calibration logic used for TRI/Superfund/severe-weather.

## Risks / open questions

- **Coverage**: expect ~512/512 (every city has a lat/lon, and the radius query never
  404s on a city with zero nearby sites -- it correctly returns `{"count":0}`, which
  is a real, valid value, not a missing-data signal). Confirmed no known geography-
  vintage gap here (unlike the Connecticut county-FIPS gap affecting several other
  datasets) since this is a pure point-radius query with no county/FIPS join at all.
- **Rate limiting**: 512 sequential/lightly-parallel requests against a public NPS
  ArcGIS service. No documented rate limit found; the research-phase 60-request batch
  at 8x concurrency completed cleanly with zero errors. Build script will use modest
  concurrency (similar to the 8x tested) and simple retry-with-backoff on any
  transient failure, consistent with `gen_superfund_data.py`'s established pattern.
- **Scale**: Small (single new dataset, follows an already-proven repeatable pattern
  used 12 times this session -- one new source file, one dataset module, standard
  test/methodology/registry/README/e2e additions). No H/V planning needed.

## Scale assessment

**Small.** Proceeding directly to a single story.
