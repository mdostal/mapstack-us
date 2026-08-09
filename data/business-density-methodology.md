# Business density — methodology

The twenty-ninth real Mapstack dataset (dvd-6, `dataset-verification-drive` epic).
Pivoted here after EPA TRI (the originally-planned #29 pick) turned out impractically
slow to bulk-fetch live — see the backlog addendum's "UPDATE (dvd-6 attempt)" note for
the real finding (a single-state query ran 16+ minutes and still returned truncated
JSON).

## What this measures

One layer, **Business density**, 0–100. Raw input is real Census Business Patterns
(CBP) establishment counts, normalized by real county population (Census ACS 5-year
estimates) into establishments per 1,000 residents. A rate has no natural 100-point
ceiling, so this uses a percentile rank among THAT YEAR's own covered cities,
**inverted** (lower density = higher concern) — the same convention
`income.ts`/`crime.ts`'s multi-year layers already use.

Real multi-year history — **2009–2023** (`supportsTime: true`), per explicit operator
direction to get "as much data as possible" for real trends over time. CBP's own
`ESTAB` field goes back to 1986, but the real floor here is bounded by the ACS5
population denominator: `B01003` at county level is confirmed live to work from the
2009 vintage (ACS5's first-ever window) — no real population figure exists before
that to normalize against.

## Data source

[Census Business Patterns](https://www.census.gov/programs-surveys/cbp.html) via
`api.census.gov`, reusing the existing `CENSUS_API_KEY` — no new credential needed.
Population normalization uses [Census ACS 5-year estimates](https://www.census.gov/programs-surveys/acs)
(`B01003_001E`), the same product `population-change.ts` already sources from.

## Method

1. One request per (year, state) to CBP for every county's real `ESTAB`
   (establishment count), `.../cbp?get=ESTAB&for=county:*&in=state:{fips}`, for every
   real year 2009–2023.
2. One request per (year, state) to ACS for every county's real population,
   `.../acs5?get=B01003_001E&for=county:*&in=state:{fips}` — the same
   one-request-per-state batching pattern `property-tax.ts`/`population-change.ts`
   already use. `NAME` is dropped from both requests (unused downstream, and confirmed
   live to not exist in CBP vintages before 2012).
3. `establishments_per_1000 = ESTAB / population * 1000` per county, computed
   independently per year.
4. Join to the spine via the existing `data/raw/city-county-fips.json` crosswalk — zero
   new geocoding.

## Known limitations (shown, not smoothed over)

- **Real coverage varies by year (505/512 through 2021, 512/512 for 2022-2023),
  county-level only, with no city-level tier at all.**
  Confirmed live via `.../cbp/geography.json`: CBP supports
  us/state/county/CBSA/CSA/congressional-district/zip geography, but **no place-level
  product exists**. Every city sharing a county shares one blended density number — a
  real, coarser-than-most precision gap, worse than `unemployment.ts`'s two-tier
  (city-then-county) fallback, since there's no city tier here to fall back FROM. See
  `data/business-density.json`'s `_meta` and each year's own printed count.
- **Establishment count, not economic output** — a county with many small businesses
  scores the same direction as one with fewer, larger, higher-revenue employers; this
  measures business density specifically, not economic output or wage levels.
- **Percentile rank is relative to that year's own covered-city set**, not comparable
  across years — the same real property `crime-methodology.md` already documents for
  its own percentile scores.

## Reproducing this dataset

```
python3 scripts/gen_business_density_data.py
```

Requires a real `CENSUS_API_KEY` in `.env` and `data/raw/city-county-fips.json` to
already exist. Caches each (year, state) CBP/ACS response under
`data/raw/business-density-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time; re-running after a transient network timeout resumes from cache).
Writes `data/business-density.json` with every real year 2009–2023.
