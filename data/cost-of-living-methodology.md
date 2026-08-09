# Cost of living — methodology

The twenty-seventh real Mapstack dataset, unblocked by a real, free, self-serve
`BEA_API_KEY` (https://apps.bea.gov/API/signup/).

## What this measures

One layer, **Cost of living**, 0–100. Raw input is the real Regional Price Parity
(RPP) index from the U.S. Bureau of Economic Analysis — a single number combining the
relative cost of goods, rents, and services, where **100.0 is the national average**.
A city at 112.6 costs about 12.6% more than the national average to live in; a city at
84.8 costs about 15.2% less. Directly rescaled onto 0–100 against a real observed range
across all years and the 512-city spine (82–118, padded slightly beyond the true
min/max so no real city sits exactly at 0 or 100) — a FIXED range applied identically
to every real year so a city's score stays honestly comparable year to year.

Real multi-year history — **2008–2024** (`supportsTime: true`), per explicit operator
direction to get "as much data as possible" for real trends over time. 2008 is RPP's
own real floor (the program didn't exist earlier); `Year=ALL` on a single BEA API call
returns every real year at once.

A real data-quality issue found and fixed while extending to multi-year: BEA's own
`MARPP` table returns a literal `"0"` (not `"(NA)"`) for a handful of metro/year
combinations with no real data — confirmed live for Enid, OK and
Kiryas Joel-Poughkeepsie-Newburgh, NY, both 2008–2012. RPP can never legitimately be
near 0 (100 is the national baseline), so `"0"` is treated identically to a real
`"(NA)"` gap: excluded, not a real value.

## Data source

[BEA Regional Price Parities](https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area),
free API, free self-serve registration key. Table `MARPP` (Metro RPP), LineCode 1
("RPPs: All items"), every real year 2008–2024.

## Method — a real detour worth documenting

BEA only publishes RPP at the **national, state, and MSA (Metropolitan Statistical
Area)** level — there's no county- or place-level product, unlike every other Census-
cluster dataset in this repo. That meant this project needed something it didn't
already have: a real city → CBSA (metro) crosswalk.

1. **Built the crosswalk from scratch**: downloaded the Census Bureau's own [2023 CBSA
   delineation file](https://www.census.gov/geographies/reference-files/time-series/demo/metro-micro/delineation-files.html)
   (`list1_2023.xlsx`), which lists every U.S. county's CBSA membership and area type.
   Filtered to `Metropolitan Statistical Area` rows only (BEA's `MARPP` table doesn't
   cover Micropolitan areas) to build `data/raw/bea-cache/county-to-cbsa.json`
   (county FIPS → CBSA code + title, 1,252 counties).
2. **Joined against the existing county crosswalk**: `data/raw/city-county-fips.json`
   (the same one `hazard.ts`/`broadband.ts`/`unemployment.ts`'s county tier already
   use) maps each of the 512 spine cities to its real county FIPS.
3. **Two real tiers, same honest-fallback shape as `unemployment.ts`**: 502/512 cities
   land in a real Metropolitan Statistical Area and get that metro's real RPP. The
   other 10 (Blanding UT, Carlsbad NM, Durango CO, Geraldine MT, Kalispell MT,
   Los Alamos NM, Monticello UT, Sandpoint ID, Sundance WY, Taos NM — real, mostly
   small/rural cities whose counties aren't part of any Metro area) fall back to their
   real state-level RPP (BEA table `SARPP`) instead of a fabricated metro estimate,
   explicitly flagged in the detail string.

## Known limitations (shown, not smoothed over)

- **512/512 real coverage at every real year**, but some cities are state-level, not
  metro-level (a real, visible precision gap for genuinely rural cities, not a
  fabrication) — a city's tier can only be checked for its most recent covered year in
  `_meta`; earlier years use whichever tier had real data that year.
- **A single blended index, not decomposed** — RPP's own sub-components (rents, goods,
  other services) are published separately by BEA but not surfaced here; a future pass
  could add them as sub-layers the way `hazard.ts`'s inland-flood/coastal-flood/
  wildfire split does.
- **Metro-wide, not neighborhood-level** — every city in the same metro (e.g. all nine
  East Bay cities inside "San Francisco-Oakland-Fremont, CA") shares one RPP number,
  even though real intra-metro cost variation is much wider than the metro-to-metro
  spread this dataset measures.
- **Annual, not real-time** — RPP updates roughly once a year, lagging current
  rents/prices by a real amount, at every year in the real 2008–2024 range.

## Reproducing this dataset

```
python3 scripts/gen_cost_of_living_data.py
```

Requires a real `BEA_API_KEY` in `.env` (free registration, see above),
`data/raw/city-county-fips.json`, and `data/raw/bea-cache/county-to-cbsa.json` (built
once from the Census CBSA delineation file, see Method above) to already exist. Caches
each BEA API response under `data/raw/bea-cache/` (gitignored — pure fetch-scratch,
safe to delete and re-fetch any time). Writes `data/cost-of-living.json` with every
real year 2008–2024.
