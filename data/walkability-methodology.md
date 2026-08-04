# Walkability — methodology

The thirteenth real Mapstack dataset: EPA's official National Walkability Index, queried
directly at each spine city's reference coordinate — no local GIS/shapefile processing
needed, just a point query against EPA's own hosted service.

## Read this before trusting a specific number

**This measures ONE census block group — the one containing each city's single stored map
coordinate — not the city as a whole.** It is not a population-weighted city-wide average.
Confirmed directly, and worth stating plainly rather than leaving as an abstract caveat:
**this dataset scores Los Angeles as MORE walkable than New York City.** That is not a bug.
Los Angeles's stored coordinate (34.05, -118.24) lands in Downtown LA's dense historic
core — a genuinely walkable pocket — while New York City's own broader, famously higher
walkability isn't what a single-point sample measures at all. Read this layer as "how
walkable is the specific block this city's map pin sits on," never as "how walkable is
this city overall."

## What this measures

One layer, **Walkability**, 0–100. Raw input is EPA's own already-computed **National
Walkability Index (NatWalkInd)** — a fixed, official 1–20 scale (1 = least walkable,
20 = most walkable), combining four components: land-use mix, employment-and-household
entropy, street-intersection density, and distance to the nearest transit stop. Linearly
rescaled onto 0–100 and inverted (`concern = (20 − NatWalkInd) / 19 × 100`) — lower
walkability is more concerning — using EPA's own fixed range directly, the same posture
`hazard-methodology.md` takes with FEMA's own 0–100 Risk Index Score, rather than a
percentile among just the 512 spine cities (used elsewhere when no externally meaningful
scale exists).

## Data source

[EPA National Walkability Index](https://www.epa.gov/smartgrowth/smart-location-mapping)
(Smart Location Database), 2021 release — free, keyless, queried directly from EPA's own
ArcGIS FeatureServer (`geodata.epa.gov/arcgis/rest/services/OA/WalkabilityIndex/MapServer/0`).
U.S. government data — public domain.

## Method

A single point query per city (`scripts/gen_walkability_data.py`) against EPA's hosted
FeatureServer at that city's stored `(lat, lon)` — the SAME "hosted, queryable service
instead of local GDAL/shapefile GIS work" pattern `hazard-methodology.md`'s FEMA NRI fetch
and `transit-access-methodology.md`'s Urban Area crosswalk both already use. No separate
crosswalk step is needed: the value comes back directly in the same call that resolves the
block group. This dataset was previously assessed in the project's own research backlog as
requiring "real GIS work... a meaningfully heavier lift" via local block-group aggregation
against TIGER shapefiles — that assumption turned out to be avoidable once a hosted,
point-queryable version of the same official data was confirmed to exist.

## Known limitations (shown, not smoothed over)

- **Single block-group sample, not a city-wide average** — stated prominently above, the
  single most important caveat for this dataset. A city's real walkability varies hugely
  block to block; this reads the ONE block group at the city's own stored reference
  coordinate, the same "one point, one number" simplification `hazard-methodology.md`
  takes at county level, here at finer but still single-point granularity.
- **Every one of the 512 spine cities matched a real block group** — genuinely full
  coverage, better than most datasets this project ships, since EPA's Smart Location
  Database covers all block groups nationally including rural ones.
- **2021 publish, ~2019 source data** — a static snapshot (`supportsTime: false`), no
  confirmed update cadence found, same "ships once, stays static" posture as care-access.
- **A composite of four sub-scores**, each itself a quantile rank across all US block
  groups (not raw units) — EPA's own methodology choice, not something this project
  re-derives or re-weights.

## Reproducing this dataset

```
python3 scripts/gen_walkability_data.py
```

Writes `data/walkability.json`. Caches each city's raw EPA FeatureServer response under
`data/raw/walkability-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time).
