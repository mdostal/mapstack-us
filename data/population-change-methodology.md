# Population change — methodology

The twenty-sixth real Mapstack dataset, and the **last of the original five
Census-cluster items** (`dataset-backlog.md` #1) to ship — population, broadband,
income, and housing-cost-burden were already live; property tax shipped earlier this
session. Unblocked by the same real, free, self-serve `CENSUS_API_KEY` that unblocked
property tax.

## What this measures

One layer, **Population growth/decline**, 0–100. Raw input is the percent change in
total population between two real Census measurements. Per the backlog's own explicit
framing, decline is the concerning pole — growth isn't automatically "good" either (real
housing/infrastructure strain from rapid growth is a genuine tension this project isn't
papering over, just not scoring here) — so any flat-or-growing city scores 0 concern,
and declining cities are directly rescaled by how steep the decline is, capped at 10%
(a handful of real, steep-decline cities clamp to 100).

## Data source — a real detour worth documenting

The backlog originally specified the Census Population Estimates Program (PEP), which
publishes annual place-level population figures. That product appears to have moved or
been restructured for recent vintages: `api.census.gov/data/2023/pep/population`
returns a real HTTP 404 (the dataset doesn't exist under that path for 2023), and the
2021 vintage — the most recent one this project's own catalog probe (`api.census.gov/data.json`)
still lists — has a real `/geography.json` that supports only US/region/division/state
geography, no place at all, confirmed live. Rather than keep hunting for wherever PEP's
place-level product went, this uses [Census ACS 5-year estimates](https://www.census.gov/programs-surveys/acs/data/data-via-api.html)
instead, table `B01003` (total population), compared across two real, **non-overlapping**
5-year windows: the 2018 vintage (2014–2018) and the 2023 vintage (2019–2023). Still
real Census data, still a genuine multi-year population comparison — just a 5-year
cadence instead of PEP's annual one.

## Method

1. Reuses the exact same city → place-FIPS crosswalk and one-request-per-state batching
   pattern already proven for `property-tax.ts` (`scripts/gen_population_change_data.py`).
2. `pct_change = (pop_2023 − pop_2018) / pop_2018 × 100`.
3. `concern = 0` for any city with `pct_change >= 0`; otherwise
   `min(100, |pct_change| / 10 × 100)`.

## Known limitations (shown, not smoothed over)

- **508/512 real coverage** — the same three no-crosswalk gaps (Savannah GA, Kenosha
  WI, Sundance WY) and the same Louisville KY consolidated-government ACS gap that
  `property-tax-methodology.md` already documents (both datasets share the identical
  crosswalk).
- **A 5-year window comparison, not an annual trend** — real, well-known fast-growing
  cities (Queen Creek AZ +84%, Buckeye AZ +52%, Leander TX +46%, Apex NC +40%) and real,
  well-known declining cities (Flint MI −17%, Jackson MS −11%) both check out against
  public knowledge, but this can't show a smooth year-by-year trajectory the way PEP's
  annual cadence would have.
- **Decline-only scoring is a deliberate, disclosed scope choice**, not an oversight —
  the backlog explicitly flags that extreme growth carries its own real costs
  (infrastructure strain) that this layer doesn't score, leaving that as a genuinely
  separate question for a future pass rather than inventing a two-sided penalty here.
- **Two rolling 5-year ACS averages, not point-in-time snapshots** — each vintage
  smooths over its own 5-year window, the same real trade-off every other ACS-sourced
  dataset here documents.

## Reproducing this dataset

```
python3 scripts/gen_population_change_data.py
```

Requires a real `CENSUS_API_KEY` in `.env` and `data/raw/city-place-fips.json` to
already exist. Caches each state/vintage's raw ACS response under
`data/raw/population-change-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time). Writes `data/population-change.json`.
