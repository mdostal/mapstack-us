# Industrial facility density — methodology

The thirtieth real Mapstack dataset (tri-1, `tri-bulk-and-data-drive-2` epic),
extended to real multi-year history 1987–2024 (`ddr-tri-extend`, this session).

## What this measures

One layer, **Industrial facility density**, 0–100. Raw input is the real count of
EPA Toxics Release Inventory (TRI) reporting facilities within a 10-mile radius of
each city, at a given real year. Direct rescale, capped at a FIXED count (70, from
the real 2024 90th-percentile count across the spine) applied identically to every
year so a city's density stays honestly comparable year to year — higher density is
more concerning.

Real multi-year history — **1987–2024** (`supportsTime: true`), per explicit
operator direction to get "as much data as possible" for real trends over time.
1987 is TRI's own real reporting floor; 2025 isn't published yet (a real
reporting-deadline lag for the prior year's data).

## Data source

[EPA Toxics Release Inventory (TRI)](https://www.epa.gov/toxics-release-inventory-tri-program),
via the [Envirofacts REST API](https://www.epa.gov/enviro/envirofacts-data-service-api-v1)
(`data.epa.gov/efservice`), specifically the `tri_facility` and `tri_reporting_form`
tables. Free, no API key.

## Method — a real architecture change mid-extension

The original single-year build (see git history for the pre-extension version of
this doc) used EPA's purpose-built bulk CSV download — one pre-generated national
file per reporting year (`mv_tri_basic_download/{year}_US/csv`). Extending that
approach across 1987–2024 worked for smaller-file years, but hit a real, then-current
problem for many mid-range years: every download attempt (including several manual
retries at increasingly generous timeouts, up to 1500 seconds, and a 25-minute and a
60-minute cooldown to rule out simple rate-limiting) was cut off at a consistent
**~950–1070 second wall time**, regardless of the client-side timeout setting. A
diagnostic single-*state* request (California only, a tiny fraction of the national
file's size) hit the exact same wall — ruling out "file too big" as the sole cause,
and pointing to a real, broad constraint on EPA's serving infrastructure for that
specific bulk-download endpoint at the time.

The real fix: EPA's Envirofacts REST API exposes the same underlying data as two much
smaller, independently-parallelizable queries, instead of one giant generated file:

1. **`tri_facility`** — the cumulative facility registry (TRIFD, name, and real
   `pref_latitude`/`pref_longitude` or DMS-packed `fac_latitude`/`fac_longitude`
   coordinates). Facility locations don't change year to year, so this is fetched
   **once** (not per year) and cached.
2. **`tri_reporting_form`** filtered by `reporting_year` — one row per
   (facility, chemical) report for that year, telling us *which* facilities reported.

Both are fetched via many **concurrent row-window requests** (e.g. ten simultaneous
~8,000-row CSV chunks) rather than one serial connection. Confirmed live: three
concurrent 10,000-row chunks (30,000 rows total) completed in ~105 seconds, versus
the old single-connection approach's ~950–1070 second wall for a comparable file —
and this approach successfully recovered every year the old one couldn't, including
several confirmed-live-broken years (1997, 1998, 1999, 2000, 2005, 2015).

Two real bugs found and fixed while validating this approach:

- **Longitude sign convention** — `pref_longitude`/`fac_longitude` store an *unsigned
  magnitude*, not standard signed WGS84 (confirmed live against a Massachusetts
  facility: `pref_longitude: 72.6244`, but MA's real longitude is ≈ −72.6). Negated
  to standard WGS84 for all 50-state TRI facilities (which are entirely in the
  Western hemisphere).
- **A small number of malformed source coordinates** — 106 of ~65,000 registry
  facilities (0.16%) carry genuinely invalid raw values (e.g. a literal `"1111111"`
  placeholder in `fac_latitude`/`fac_longitude`) that convert to impossible lat/lon.
  Bounded out via a real US-territory box (15–72°N, −180 to −65°W) rather than
  trusted blindly.

1. Fetch `tri_facility` once via parallel pagination; build a TRIFD → (lat, lon) map
   using `pref_latitude`/`pref_longitude` when present, falling back to the
   DMS-converted `fac_latitude`/`fac_longitude` fields, filtered to plausible bounds.
2. For each real year 1987–2024: fetch `tri_reporting_form` filtered to that year via
   parallel pagination, and take the distinct set of reporting `tri_facility_id`s.
3. For each of the 512 spine cities (real lat/lon already in `data/cities.json` — no
   crosswalk needed), count real facilities within a 10-mile haversine radius whose
   TRIFD is in that year's reporting set AND has a known coordinate.
4. Direct rescale, capped at 70 (the real p90 across the spine for the 2024 vintage,
   with a small pad), applied identically across every year.

## Known limitations (shown, not smoothed over)

- **512/512 real coverage** for city matching, since this joins by geographic
  proximity rather than a FIPS crosswalk that could have real gaps.
- **A real, confirmed decline in per-facility coordinate coverage for more recent
  years** — roughly 99% of reporting facilities have a known coordinate in
  1987–1996, declining to roughly 60–68% by 2015–2024. This was investigated and
  confirmed to be a genuine characteristic of EPA's own `tri_facility` registry, not
  a bug in the join logic: a live spot-check of a specific facility missing from the
  coordinate map (one actively reporting in 2017) showed `pref_latitude: null` AND
  `fac_latitude: 0` directly from EPA's own API response — EPA itself has never
  geocoded that facility. Older, often-closed facilities appear to have been
  geocoded thoroughly in an earlier era; more recently-active facilities lag behind
  in EPA's own enrichment pipeline. A facility with no known coordinate is simply
  excluded from that year's radius count (an honest exclusion, not a fabricated
  location).
- **Facility count, not release volume or chemical toxicity** — a real, deliberate
  simplification. TRI's own data includes real release-quantity and chemical-hazard
  fields (carcinogen/PBT/PFAS flags) that a future pass could weight by, rather than
  treating every reporting facility equally.
- **10-mile radius is a chosen constant**, not derived from any exposure-science
  standard — named and documented (`RADIUS_MILES` in the generation script), same
  posture as `air-quality.ts`'s own `DISTANCE_MILES = 50` constant.
- **Registry snapshot, not point-in-time** — `tri_facility` reflects EPA's *current*
  known state of each facility (including its most recently updated coordinates),
  not a historical snapshot of what was known in a given past year. A facility's
  location itself is treated as static across its reporting history, which is a
  reasonable real-world assumption (industrial facilities don't move), but the
  *coordinate data quality* for a given facility reflects today's registry, not the
  registry as it existed in, say, 1995.

## Reproducing this dataset

```
python3 scripts/gen_tri_facility_density_data.py
```

No API key required. Caches the one-time facility registry under
`data/raw/tri-facility-registry-cache/` and each real year's reporting-facility list
under `data/raw/tri-reporting-form-cache/` (both gitignored — pure fetch-scratch,
safe to delete and re-fetch any time; resumable on rerun). Writes
`data/tri-facility-density.json` with every real year 1987–2024.
