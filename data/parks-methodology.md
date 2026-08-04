# Park access — methodology

The fourteenth real Mapstack dataset: real park-access statistics from the Trust for
Public Land's ParkServe database, queried directly at each spine city's reference
coordinate — no local GIS/shapefile processing needed.

## What this measures

One layer, **Park access**, 0–100. Raw input is the real percentage of a place's
population living within a 10-minute walk of a public park — **already computed by TPL
itself** (this project only divides TPL's own two published population sums, not raw
polygon/service-area math). Inverted onto the concern scale
(`concern = 100 − pct_served`) since percent-served is already a meaningful 0–100
quantity — lower access is more concerning.

## Data source

[Trust for Public Land ParkServe](https://parkserve.tpl.org) — free, keyless, queried
directly from TPL's own ArcGIS FeatureServer
(`server7.tplgis.org/.../ParkServe_ProdNew/FeatureServer/1`, the "ParkServe Place" layer).
ParkServe covers nearly 14,000 US places, reaching over 80% of the country's population —
real, full-spine coverage, unlike TPL's own headline **ParkScore** product, which ranks
only the 100 largest US cities and would have missed most of this spine's small towns
outright.

## Method

A single point query per city (`scripts/gen_parks_data.py`) against TPL's hosted
FeatureServer at that city's stored `(lat, lon)` — the same "hosted, queryable service
instead of local GDAL/shapefile GIS work" pattern `hazard-methodology.md`,
`transit-access-methodology.md`, and `walkability-methodology.md` all already use. This
candidate was previously assessed in the project's own research backlog as needing
Mapstack to derive its own walk-access metric from raw park-polygon and population-grid
geometry — "GIS work beyond anything crime.ts needed." That assumption turned out to be
avoidable: the ParkServe Place layer already publishes `total_pop` (a place's total
population) and `sum_totpopsvca` (population within a park's 10-minute walk service area)
as pre-aggregated sums — TPL has already done the population-weighted spatial overlay;
this project only divides the two.

A note on one field NOT used: the layer also exposes a `percserved2022` field that
appears, by name, to be the literal pre-computed percentage — but it returned `null` for
every city tested during this build (New York, Los Angeles, Denver, and others), an
apparently deprecated/unpopulated field in TPL's current service. `total_pop` and
`sum_totpopsvca` are both reliably populated, so the percentage is computed from those
instead.

**A real coordinate-precision gap, fixed the same way as `transit-access-methodology.md`'s
Urban Area crosswalk**: an exact point query missed several cities (confirmed: Santa
Monica CA, Charleston SC, Miami Beach FL, Kenosha WI) whose `data/cities.json`
2-decimal-place coordinate lands just outside their own narrow/coastal place polygon. A
3km search-buffer fallback, preferring whichever candidate place's name matches the spine
city's own name, resolves all of these correctly.

## Known limitations (shown, not smoothed over)

- **5 of 512 cities have no ParkServe place match at all**, even with the 3km buffer —
  Blanding UT, Monticello UT, Whitewright TX, Sundance WY, Geraldine MT — the same tiny
  reference towns that show up as honest, real gaps across nearly every dataset this
  project ships. Genuinely too small to have a ParkServe place record, not a fetch
  failure.
- **A place-level statistic, not sensitive to WHERE within a city someone lives** — a
  large city's percent-served figure blends dense, well-served neighborhoods with
  underserved ones into one number, the same "one place, one number" simplification every
  place/county/tract-level dataset in this project already carries.
- **A specific, dated release** (`supportsTime: false`) — ParkServe's underlying park
  inventory and service-area analysis is periodically refreshed by TPL; only the current
  snapshot is surfaced here.
- **Counts public park access only** — school playgrounds, private/HOA green space, and
  informal open space are not counted as "parks" here, matching TPL's own definitional
  scope, not a Mapstack simplification.

## Reproducing this dataset

```
python3 scripts/gen_parks_data.py
```

Writes `data/parks.json`. Caches each city's raw ParkServe FeatureServer response under
`data/raw/parks-cache/` (gitignored — pure fetch-scratch, safe to delete and re-fetch any
time).
