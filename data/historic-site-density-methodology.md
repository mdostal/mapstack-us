# Historic site access — methodology

The thirty-ninth real Mapstack dataset (ddr10-1, `data-drive-round-10` epic).
512/512 real coverage.

## What this measures

One layer, **Historic site access**, 0–100. Raw input is the real count of
National Register of Historic Places (NRHP)-listed sites within 10 miles of
each city, at a given real year. A count has no natural 100-point ceiling, so
this uses a direct rescale capped at a data-informed ceiling (the real
p90-derived 290, a FIXED cap across every year), **inverted**: fewer nearby
historic sites is more concerning (a weaker connection to protected/
recognized built heritage), matching the "access" framing already used by
`parks.ts`, `library-access.ts`, and `transit-access.ts`.

Real multi-year history — **1966–2025** (`supportsTime: true`), per explicit
operator direction to get "as much data as possible" for real trends over
time. 1966 is the National Register's own real founding year (the National
Historic Preservation Act of 1966).

## Data source

The [NPS National Register of Historic Places](https://www.nps.gov/subjects/nationalregister/index.htm),
via its real, live, keyless ArcGIS FeatureServer
(`mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer/0`).
72,668 real listed resources nationally, real point geometry (WGS84).

## Method

1. For each of the 512 spine cities, issue a real server-side ArcGIS spatial
   distance query centered on the city's own `lat`/`lon`
   (`geometryType=esriGeometryPoint&distance=10&units=esriSRUnit_StatuteMile&
   spatialRel=esriSpatialRelIntersects`), requesting each real site's
   `CertDate` (Certification Date, its real NRHP listing date) rather than
   just a count — one real fetch per city (confirmed live: no pagination
   needed even for New York City's 823 real sites within 10mi, well under
   the service's own page-size limit).
2. The source's own `City`/`State` fields are administrative and unreliable
   for this purpose — confirmed live: `City='NEW YORK' AND State='NY'`
   returns `{"count":0}` even though 800+ real NRHP sites exist within a
   real 10-mile radius of New York City. This is the same real pattern
   already documented for `tri-facility-density.ts` and `library-access.ts`
   this session, which is why the radius join (not the name field) is used
   here.
3. `CertDate` is a real string field, format `MM/DD/YY` (confirmed live via
   the server's own field metadata) — parsed into a real 4-digit year
   locally (`YY >= 66` → `19YY`, else `20YY`; unambiguous since the NRHP
   itself has only existed since 1966). For every real year 1966–2025,
   `count(year) = ` the number of a city's real sites whose `CertDate` year
   is `<= year` — a real reconstruction from real per-site listing dates,
   not an estimate or a fabricated backfill.
4. Rescale, independently per year: `concern = 100 * (1 - min(count, 290) /
   290)`. A city with 0 nearby NRHP sites scores concern 100 (least
   connection to preserved heritage); a city at or above the real
   p90-derived count (290) scores concern 0. The cap was chosen from a real
   60-city random-sample percentile check performed before the original
   single-year build shipped (p50=57, p75=110, p90=289, p95=585, p99=637)
   and kept FIXED across every year so a city's score stays honestly
   comparable year to year.

## Known limitations (shown, not smoothed over)

- **Raw density, not a quality or significance weighting.** A city with many
  small NRHP-listed sites and a city with one enormous historic district both
  count sites, not acreage or historical importance.
- **10-mile radius crosses city boundaries.** A city's real count can be
  boosted by a nearby, older urban core it is not part of — confirmed live:
  Ankeny, IA (a 78k-person Des Moines suburb) scores 96 sites within 10mi, a
  real reflection of proximity to Des Moines' historic core, not Ankeny's own
  settlement history. This is disclosed, not corrected, since the metric is
  intentionally about real regional access to preserved heritage, not a
  strictly within-city-limits count.
- **Not population-normalized.** A real 60-city sample check (see the epic's
  design-discussion.md) showed raw count does not correlate with city
  population — younger Sun Belt/suburban cities score near zero regardless of
  population, so a per-capita rate would not add real signal here; the
  10-mile radius is already the normalizing unit.

## Reproducing this dataset

```
python3 scripts/gen_historic_site_density_data.py
```

No API key required. Caches each city's real list of site `CertDate`s under
`data/raw/historic-site-density-cache/` (gitignored — pure fetch-scratch,
safe to delete and re-fetch any time; resumable on rerun). Writes
`data/historic-site-density.json` with every real year 1966–2025.
