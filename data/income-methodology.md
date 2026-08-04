# Median household income — methodology

The seventeenth real Mapstack dataset, and the second real progress on the "Census-cluster"
roadmap item (population, income, broadband, tax, housing) that sat blocked all session on
a missing `CENSUS_API_KEY` — joined at **county** level, reusing the same city→county
crosswalk `hazard-methodology.md`'s build already produced.

## What this measures

One layer, **Median household income**, 0–100. Raw input is the real dollar median
household income for each city's county, percentile-ranked and **inverted** among covered
cities — lower income is more concerning. Unlike `broadband-methodology.md`'s
already-bounded 0–100 percentage, a dollar figure has no natural ceiling to rescale
against directly, so this uses the same percentile convention
`housing-inventory-methodology.md`/`days-on-market-methodology.md` already use for their
own unbounded raw quantities.

## Data source

[County Health Rankings & Roadmaps](https://www.countyhealthrankings.org/), 2025 Annual
Data Release, "Median Household Income" measure (`v063`) — free direct CSV download, no
key, no login. CHR's own underlying source is the **Census Bureau's American Community
Survey (ACS) 5-year estimates** — the exact income figure the blocked Census-cluster
roadmap item was designed around, delivered here through CHR's own free republication
instead of a direct Census API call, the same discovery `broadband-methodology.md`'s build
made for its own measure.

## Method

1. **County crosswalk**: each spine city's county FIPS is read directly from
   `data/raw/city-county-fips.json`, already built by `geocode_city_counties.py` for the
   hazard dataset — no new network calls.
2. **Join** (`scripts/gen_income_data.py`): CHR's national CSV is parsed for the
   `v063_rawvalue` column (a real dollar figure), joined to each city's county FIPS. A
   state-level fallback (which CHR also ships) exists in the script for any county CHR
   suppresses, though it was not needed for any of the 512 spine cities in this build.
3. **Concern score**: each city's real income is converted to a percentile rank (0–100)
   among all covered cities, inverted (lower income = higher concern), computed once at
   generation time — same convention as `crime-methodology.md`/`housing-inventory-methodology.md`.

## Known limitations (shown, not smoothed over)

- **County-level, not city-level** — every spine city inherits its whole county's ACS
  5-year estimate, the same "one number, blurred geography" caveat every county-level
  dataset in this project carries. This is a real, material gap for income specifically: a
  city's own median income can differ substantially from its surrounding county's,
  especially for a smaller city inside a large, more affluent (or less affluent) county.
- **A 5-year rolling ACS estimate, not an annual snapshot** — the same real trade-off CHR
  makes for small-geography reliability that `broadband-methodology.md`/
  `traffic-fatalities-methodology.md` already document for their own measures.
- **Every one of the 512 spine cities had a real, non-suppressed county value** —
  genuinely full coverage, matching `broadband-methodology.md`'s own result. The
  state-level fallback path exists in the script for consistency but was not exercised.
- **Not adjusted for local cost of living** — a given dollar figure buys more in a low
  cost-of-living county than a high one; this measures raw nominal income, not
  purchasing-power-adjusted income, a real limitation this project has no free source to
  correct for at this resolution.
- **Percentile rank is relative to the 512-city spine**, not all US counties — the same
  "relative comparison, not an absolute claim" caveat `crime-methodology.md` already names
  for its own percentile scores.

## Reproducing this dataset

```
python3 scripts/gen_income_data.py
```

Requires `data/raw/city-county-fips.json` to already exist (built by
`geocode_city_counties.py` for the hazard dataset). Writes `data/income.json`. Caches the
raw CHR national CSV under `data/raw/income-cache/` (gitignored — pure fetch-scratch, safe
to delete and re-fetch any time).
