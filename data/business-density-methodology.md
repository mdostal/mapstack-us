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
ceiling, so this uses a percentile rank among covered cities, **inverted** (lower
density = higher concern) — the same convention `income.ts`/`housing-inventory.ts`
already use for their own unbounded raw quantities.

## Data source

[Census Business Patterns](https://www.census.gov/programs-surveys/cbp.html) via
`api.census.gov`, reusing the existing `CENSUS_API_KEY` — no new credential needed.
Population normalization uses [Census ACS 5-year estimates](https://www.census.gov/programs-surveys/acs)
(`B01003_001E`), the same product `population-change.ts` already sources from, same
2023 vintage.

## Method

1. One request per state to CBP for every county's real `ESTAB` (establishment count),
   `.../cbp?get=NAME,ESTAB&for=county:*&in=state:{fips}`.
2. One request per state to ACS for every county's real population,
   `.../acs5?get=NAME,B01003_001E&for=county:*&in=state:{fips}` — the same
   one-request-per-state batching pattern `property-tax.ts`/`population-change.ts`
   already use.
3. `establishments_per_1000 = ESTAB / population * 1000` per county.
4. Join to the spine via the existing `data/raw/city-county-fips.json` crosswalk — zero
   new geocoding.

## Known limitations (shown, not smoothed over)

- **512/512 real coverage, but county-level only, with no city-level tier at all.** Confirmed live via
  `.../cbp/geography.json`: CBP supports us/state/county/CBSA/CSA/congressional-
  district/zip geography, but **no place-level product exists**. Every city sharing a
  county shares one blended density number — a real, coarser-than-most precision gap,
  worse than `unemployment.ts`'s two-tier (city-then-county) fallback, since there's no
  city tier here to fall back FROM.
- **Establishment count, not economic output** — a county with many small businesses
  scores the same direction as one with fewer, larger, higher-revenue employers; this
  measures business density specifically, not economic output or wage levels.
- **2023 vintage for both CBP and ACS** — the latest available for each at build time;
  CBP's 2024 vintage 404s live (a real, expected one-year release lag, same pattern
  every Census-sourced dataset in this repo has hit).

## Reproducing this dataset

```
python3 scripts/gen_business_density_data.py
```

Requires a real `CENSUS_API_KEY` in `.env` and `data/raw/city-county-fips.json` to
already exist. Caches each state's CBP/ACS responses under
`data/raw/business-density-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time; re-running after a transient network timeout resumes from cache).
Writes `data/business-density.json`.
