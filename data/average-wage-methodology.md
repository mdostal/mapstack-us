# Average wage — methodology

The thirty-first real Mapstack dataset (tri-2, `tri-bulk-and-data-drive-2` epic,
`dataset-backlog.md` addendum 2 #31).

## What this measures

One layer, **Average wage**, 0–100. Raw input is real average annual wage per
employee, computed from Census Business Patterns' own `PAYANN` (total annual payroll,
in real thousands of dollars) divided by `EMP` (real employee count), both from the
same real county-level record. A dollar figure has no natural 100-point ceiling, so
this uses a percentile rank among THAT YEAR's own covered cities, **inverted** (lower
wage = higher concern) — the same convention `income.ts`/`crime.ts`'s multi-year
layers already use.

This is genuinely distinct from two datasets already shipped: `income.ts` measures
median **household** income (includes non-wage income, and multiple earners per
household); `business-density.ts` measures establishment **count**, not pay level.
This measures real average **pay per employee** at local businesses.

Real multi-year history — **1986–2023** (`supportsTime: true`), per explicit operator
direction to get "as much data as possible" for real trends over time. 1986 is CBP's
own real floor; 2024 isn't published yet (a real, confirmed-live HTTP 404, a genuine
release-lag gap, not a bug).

## Data source

[Census Business Patterns](https://www.census.gov/programs-surveys/cbp.html) via
`api.census.gov`, reusing the existing `CENSUS_API_KEY` and the exact same
county-level pipeline `business-density.ts` already proved out — zero new endpoint
risk, one additional real field (`PAYANN`) added to the same request shape.

## Method

One request per (year, state): `.../cbp?get=EMP,PAYANN&for=county:*&in=state:{fips}`,
for every real year 1986–2023, same batching pattern as `business-density.ts`. The
`NAME` field is deliberately dropped — unused downstream, and confirmed live to not
exist in CBP vintages before 2012 (would 400 the whole request for earlier years).
`average_wage = PAYANN * 1000 / EMP` per county (CBP reports payroll in thousands of
dollars), computed independently per year. Join to the spine via the existing
`data/raw/city-county-fips.json` crosswalk — zero new geocoding.

## A real bug found and fixed while extending to multi-year

Some CBP vintages return UN-padded FIPS digits (`"6"`/`"1"` instead of `"06"`/`"001"`)
while most vintages return them zero-padded — 1991's `state` field and 1995's `county`
field were both affected, confirmed live by inspecting the raw cached responses. This
silently broke the join for every leading-zero state/county in those specific years,
producing an implausible single-year coverage dip (1991: 334/512, 1995: 128/512, vs.
~497/512 in every neighboring year) that stood out immediately against the otherwise
smooth year-over-year trend. Fixed by `zfill`-padding both the state and county code
defensively on every row, regardless of which vintage's format happened to apply;
re-running against the same cached raw responses (no new API calls needed) recovered
497/512 for both years.

## Known limitations (shown, not smoothed over)

- **Real coverage varies by year, county-level only** — same geography ceiling as
  `business-density.ts`; CBP has no place-level geography at all (confirmed live via
  `.../cbp/geography.json`). See `data/average-wage.json`'s `_meta` and each year's own
  printed count.
- **A mean, not a median** — `PAYANN`/`EMP` is a real average, which a small number of
  very-high-earning employees can pull upward relative to a typical worker's real pay;
  a future pass could look for a median-wage product if the Census Bureau publishes one
  at this geography level.
- **Percentile rank is relative to that year's own covered-city set**, not comparable
  across years — the same real property `crime-methodology.md` already documents for
  its own percentile scores.

## Reproducing this dataset

```
python3 scripts/gen_average_wage_data.py
```

Requires a real `CENSUS_API_KEY` in `.env` and `data/raw/city-county-fips.json` to
already exist. Caches each (year, state) CBP response under
`data/raw/average-wage-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time). Writes `data/average-wage.json` with every real year 1986–2023.
