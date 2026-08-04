# Housing affordability — methodology

The eighteenth real Mapstack dataset, and the third real progress on the "Census-cluster"
roadmap item (population, income, broadband, tax, housing) that sat blocked all session on
a missing `CENSUS_API_KEY` — joined at **county** level, reusing the same city→county
crosswalk `hazard-methodology.md`'s build already produced.

## What this measures, and why it's not redundant with the other housing layers

One layer, **Severe housing cost burden**, 0–100. Raw input is the real percentage of
households spending **50% or more of their income on housing** — already a meaningful
0–100 quantity, used directly as the concern score (higher = more concerning, no
inversion needed).

This project already ships two other housing layers,
`housing-inventory-methodology.md` (market **tightness**/supply) and
`days-on-market-methodology.md` (market **speed**) — both sourced from Zillow listing
data. This is a genuinely different angle: **affordability stress for the people who
already live there**, not market conditions for buyers. A county can have a loose, slow
market (lots of homes sitting unsold) while still being unaffordable for existing
residents if incomes haven't kept pace with housing costs — these three layers measure
different real things, not the same thing three ways.

## Data source

[County Health Rankings & Roadmaps](https://www.countyhealthrankings.org/), 2025 Annual
Data Release, "Severe Housing Cost Burden" measure (`v154`) — free direct CSV download,
no key, no login. CHR's own underlying source is the **Census Bureau's American Community
Survey (ACS) 5-year estimates (2019–2023)** — the same free-republication route
`broadband-methodology.md`/`income-methodology.md` already used to unblock their own
Census-cluster items without the missing Census API key.

## Method

1. **County crosswalk**: each spine city's county FIPS is read directly from
   `data/raw/city-county-fips.json`, already built by `geocode_city_counties.py` for the
   hazard dataset — no new network calls.
2. **Join** (`scripts/gen_housing_cost_burden_data.py`): CHR's national CSV is parsed for
   the `v154_rawvalue` column (a 0–1 fraction, converted to a percentage), joined to each
   city's county FIPS. A state-level fallback (which CHR also ships) exists in the script
   for any county CHR suppresses, though it was not needed for any of the 512 spine cities
   in this build.

## Known limitations (shown, not smoothed over)

- **County-level, not city-level** — every spine city inherits its whole county's ACS
  5-year estimate, the same "one number, blurred geography" caveat every county-level
  dataset in this project carries.
- **A 5-year rolling ACS estimate (2019–2023), not an annual snapshot** — the same real
  trade-off CHR makes for small-geography reliability that `broadband-methodology.md`/
  `income-methodology.md` already document for their own measures. Notably, this window
  spans the pandemic-era housing-cost surge; a more recent single-year figure could look
  meaningfully different.
- **Every one of the 512 spine cities had a real, non-suppressed county value** —
  genuinely full coverage, matching `broadband-methodology.md`'s and
  `income-methodology.md`'s own results. The state-level fallback path exists in the
  script for consistency but was not exercised.
- **A cost-burden RATE, not a description of what "unaffordable" means for a specific
  household** — a county-wide percentage doesn't distinguish burden driven by high rents
  from burden driven by low incomes (see `income-methodology.md` for this project's
  separate income layer); the two interact but aren't combined into one number here,
  matching this project's "don't invent a weighting across different things" posture.

## Reproducing this dataset

```
python3 scripts/gen_housing_cost_burden_data.py
```

Requires `data/raw/city-county-fips.json` to already exist (built by
`geocode_city_counties.py` for the hazard dataset). Writes `data/housing-cost-burden.json`.
Caches the raw CHR national CSV under `data/raw/housing-cost-burden-cache/` (gitignored —
pure fetch-scratch, safe to delete and re-fetch any time).
