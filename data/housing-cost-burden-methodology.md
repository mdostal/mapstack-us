# Housing affordability — methodology

The eighteenth real Mapstack dataset, and the third real progress on the "Census-cluster"
roadmap item (population, income, broadband, tax, housing).

## What this measures, and why it's not redundant with the other housing layers

One layer, **Severe housing cost burden**, 0–100. Raw input is the real percentage of
households spending **50% or more of their income on housing** — already a meaningful
0–100 quantity, used directly as the concern score (higher = more concerning, no
inversion needed). Unlike `income.ts`'s unbounded dollar figure, this IS comparable
across years (a real percentage, not a relative-to-that-year's-cohort rank).

This project already ships two other housing layers,
`housing-inventory-methodology.md` (market **tightness**/supply) and
`days-on-market-methodology.md` (market **speed**) — both sourced from Zillow listing
data. This is a genuinely different angle: **affordability stress for the people who
already live there**, not market conditions for buyers. A place can have a loose, slow
market (lots of homes sitting unsold) while still being unaffordable for existing
residents if incomes haven't kept pace with housing costs — these three layers measure
different real things, not the same thing three ways.

Real multi-year history — **2009–2023** (`supportsTime: true`), per explicit operator
direction to get "as much data as possible" for real trends over time.

## Data source — and a real, deliberate switch mid-session

The original build sourced this from [County Health
Rankings](https://www.countyhealthrankings.org/)'s free republication of a single
current-release ACS window, joined at **county** level. CHR has no real historical
archive, so extending to real multi-year history required a **direct pull from the
Census API itself**, combining real severe-burden brackets from two tables the same way
CHR's own `v154` measure does:

- `B25070_010E` / `B25070_001E` — renters paying 50.0%+ of income on gross rent, and the
  real total renter-occupied units.
- `B25091_011E` (mortgaged) + `B25091_022E` (not mortgaged) / `B25091_001E` — owners
  paying 50.0%+, and the real total owner-occupied units.

All 5 bracket codes were fetched live from the Census API's own `B25070`/`B25091` group
definitions, not guessed. 2009 is a REAL, verified floor: confirmed live that every one
of these variables exists in the ACS5 2009 vintage (the first-ever ACS5 window).

Also a real, deliberate geography change alongside the year extension: this is now
place-level (city→place-FIPS crosswalk, the same `property-tax.ts`/`income.ts` already
use), a tighter fit than the original county-level build.

## Method

1. **City → place FIPS**: reuses the same crosswalk `property-tax.ts`/`income.ts` use —
   no new geocoding.
2. **Fetch** (`scripts/gen_housing_cost_burden_data.py`): one Census ACS5 API call per
   (year, state) pair, for every real year 2009–2023.
3. **Severe burden % = (renters ≥50% + owners ≥50%) / (total renters + total
   owner-occupied units)**, computed independently per year.

## Known limitations (shown, not smoothed over)

- **508/512 real coverage (any year)**, varying slightly by year, and no longer carries
  the old state-level fallback for suppressed geographies — a real place with no
  estimate in a given year now shows an honest gap for that year. See
  `data/housing-cost-burden.json`'s `_meta` and each year's own printed count.
- **A 5-year rolling ACS estimate at every year**, not an annual snapshot — consecutive
  years' figures overlap heavily in their underlying survey window, the same real
  trade-off every ACS-sourced dataset here documents. The 2019–2023-window years in
  particular span the pandemic-era housing-cost surge.
- **A cost-burden RATE, not a description of what "unaffordable" means for a specific
  household** — a place-wide percentage doesn't distinguish burden driven by high rents
  from burden driven by low incomes (see `income-methodology.md` for this project's
  separate income layer); the two interact but aren't combined into one number here,
  matching this project's "don't invent a weighting across different things" posture.

## Reproducing this dataset

```
python3 scripts/gen_housing_cost_burden_data.py
```

Requires a real `CENSUS_API_KEY` in `.env` and `data/raw/city-place-fips.json` to
already exist. Writes `data/housing-cost-burden.json` with every real year 2009–2023.
Caches each (year, state) response under `data/raw/housing-cost-burden-cache/`
(gitignored — pure fetch-scratch, safe to delete and re-fetch any time).
