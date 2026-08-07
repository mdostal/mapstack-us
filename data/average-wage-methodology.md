# Average wage — methodology

The thirty-first real Mapstack dataset (tri-2, `tri-bulk-and-data-drive-2` epic,
`dataset-backlog.md` addendum 2 #31).

## What this measures

One layer, **Average wage**, 0–100. Raw input is real average annual wage per
employee, computed from Census Business Patterns' own `PAYANN` (total annual payroll,
in real thousands of dollars) divided by `EMP` (real employee count), both from the
same real county-level record. A dollar figure has no natural 100-point ceiling, so
this uses a percentile rank among covered cities, **inverted** (lower wage = higher
concern) — the same convention `income.ts` already uses for a related concept.

This is genuinely distinct from two datasets already shipped: `income.ts` measures
median **household** income (includes non-wage income, and multiple earners per
household); `business-density.ts` measures establishment **count**, not pay level.
This measures real average **pay per employee** at local businesses.

## Data source

[Census Business Patterns](https://www.census.gov/programs-surveys/cbp.html) via
`api.census.gov`, reusing the existing `CENSUS_API_KEY` and the exact same
county-level pipeline `business-density.ts` already proved out — zero new endpoint
risk, one additional real field (`PAYANN`) added to the same request shape.

## Method

One request per state: `.../cbp?get=NAME,EMP,PAYANN&for=county:*&in=state:{fips}`,
same batching pattern as `business-density.ts`. `average_wage = PAYANN * 1000 / EMP`
per county (CBP reports payroll in thousands of dollars). Join to the spine via the
existing `data/raw/city-county-fips.json` crosswalk — zero new geocoding.

## Known limitations (shown, not smoothed over)

- **512/512 real coverage, but county-level only** — same ceiling as
  `business-density.ts`; CBP has no place-level geography at all (confirmed live via
  `.../cbp/geography.json`).
- **A mean, not a median** — `PAYANN`/`EMP` is a real average, which a small number of
  very-high-earning employees can pull upward relative to a typical worker's real pay;
  a future pass could look for a median-wage product if the Census Bureau publishes one
  at this geography level.
- **2023 vintage** — the latest CBP has published at build time (2024 404s live, the
  same one-year release lag every CBP/ACS-sourced dataset in this repo has hit).

## Reproducing this dataset

```
python3 scripts/gen_average_wage_data.py
```

Requires a real `CENSUS_API_KEY` in `.env` and `data/raw/city-county-fips.json` to
already exist. Caches each state's CBP response under `data/raw/average-wage-cache/`
(gitignored — pure fetch-scratch, safe to delete and re-fetch any time). Writes
`data/average-wage.json`.
