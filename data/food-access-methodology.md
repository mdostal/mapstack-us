# Food access — methodology

The eighth real Mapstack dataset: USDA ERS's Food Access Research Atlas (FARA, now also
called the Large Retailer Access Map/LRAM), joined at census **tract** level.

## What this measures

Two separate layers, both percentages, higher = more concerning:

- **Low food access** — % of the WHOLE tract population living more than 0.5 mile (urban
  definition) from the nearest large supermarket/grocery store.
- **Low-income low food access** — % of the LOW-INCOME population specifically living that
  far away — a more targeted "food desert" equity measure, a real, distinct quantity from
  the tract-wide share above.

Kept SEPARATE, not blended — same "don't invent a weighting" principle every other
multi-layer dataset here uses. FARA reports several access-distance thresholds (0.5mi/1mi
urban, 10mi/20mi rural); the 0.5-mile urban definition was picked as FARA's own standard
"low access" headline measure, the one most food-access research and reporting cites.

## Data source

[USDA ERS Food Access Research Atlas](https://www.ers.usda.gov/data-products/food-access-research-atlas),
real published vintages **2010, 2015, and 2019** — confirmed live via ERS's own download
page (`ers.usda.gov/data-products/food-access-research-atlas/download-the-data`) that FARA
has only ever published these three vintages, not an annual series (a 2006 "food desert
locator" and a 2025 "SNAP Authorized Retailer Access Map" are real, different, incompatible
products, not FARA refreshes). U.S. government data — public domain, free direct
download, no API key or account required.

## Method

1. **2010-vintage tract crosswalk** (`scripts/geocode_city_tracts_2010.py`): each spine
   city's lat/lon is geocoded to its 2010-census-vintage tract GEOID via the Census
   Geocoder's `vintage=Census2010_Current` option — a SEPARATE crosswalk from the
   social-vulnerability dataset's (`svi-methodology.md`), which uses CURRENT (2020-vintage)
   tract boundaries. **Real mismatch found and fixed during this build**: FARA's tract
   boundaries are frozen at the 2010 census, and census tracts get split/merged/renumbered
   by the 2020 census in many places — e.g. Los Angeles' own map-marker coordinate resolves
   to tract `06037206202` under the current vintage but `06037211410` under the 2010
   vintage, and FARA only recognizes the latter. Reusing the SVI dataset's current-vintage
   crosswalk here silently looked like ~25% of the spine had no food-access data at all;
   it was a boundary-vintage join mismatch, not a real coverage gap.
2. **FARA fetch/join, per real vintage** (`scripts/gen_food_access_data.py`): downloads
   each real vintage's national tract-level file directly (2019 ships as CSV, 72,531
   tracts; 2010 and 2015 ship as `.xlsx`, 72,864 tracts each, parsed with `openpyxl`),
   then joins via the 2010-vintage tract GEOID from step 1. **Confirmed live**: all three
   vintages share the exact same `CensusTract` GEOID format and the exact same
   `lapophalfshare`/`lalowihalfshare` column names, so the same crosswalk serves every
   vintage with no extra geocoding pass. FARA's 2019 CSV export's `CensusTract` column
   is exported as a plain number (leading zeros stripped for state FIPS codes 01-09),
   re-padded to the real 11-digit GEOID before joining — the first fix attempted here,
   before the deeper vintage mismatch was found underneath it; the 2010/2015 `.xlsx`
   exports already carry the zero-padded GEOID as a string, defensively re-padded anyway.

## Known limitations (shown, not smoothed over)

- **2010-vintage tract boundaries, not current** — the whole reason for a separate
  crosswalk (see above); this dataset's geography doesn't line up with any other
  tract-level dataset here (SVI) at the boundary level, even though both are "tract-level."
- **512/512 real coverage** at the latest (2019) vintage — see `data/food-access.json`'s
  own `_meta.coverage`.
- **Tract-level, not city-level** — a real, documented resolution limitation, same "one
  number for a whole jurisdiction" shape as every other sub-city-resolution dataset here.
- **A real minority of tracts have FARA's own null** (no population base to compute a
  share) — preserved as an honest null, never coerced to 0.
- **Real, sparse three-point history (2010/2015/2019), not annual** — FARA simply doesn't
  publish more often than this; `supportsTime: true` with real gaps between points, same
  posture as `electoral-competitiveness.ts`'s real 4-year election-cycle gaps, not a
  fabricated interpolation between vintages.
- **Urban 0.5-mile threshold may not fit every spine town** — FARA's rural thresholds
  (10mi/20mi) are the more appropriate lens for the spine's smallest reference towns, not
  used here; a real, documented scope limitation, not a data gap.

## Reproducing this dataset

```
python3 scripts/geocode_city_tracts_2010.py   # writes data/raw/city-tract-fips-2010.json
python3 scripts/gen_food_access_data.py       # writes data/food-access.json
```

Caches raw responses under `data/raw/geocode-2010-cache/` and
`data/raw/food-access-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time).
