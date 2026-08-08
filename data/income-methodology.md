# Median household income — methodology

The seventeenth real Mapstack dataset, and the second real progress on the "Census-cluster"
roadmap item (population, income, broadband, tax, housing).

## What this measures

One layer, **Median household income**, 0–100. Raw input is the real dollar median
household income for each city's own **place** geography, percentile-ranked and
**inverted** among THAT YEAR's own covered cities — lower income is more concerning. A
dollar figure has no natural ceiling to rescale against directly, so this uses the same
per-year percentile convention `crime-methodology.md`'s multi-year layers use — a
relative comparison, not an absolute claim, and **not comparable across years** since
each year's covered-city set can differ slightly.

Real multi-year history — **2009–2023** (`supportsTime: true`), per explicit operator
direction to get "as much data as possible" for real trends over time. 2009 is a REAL,
verified floor, not a guess: it's the first-ever ACS5 vintage (the 2005–2009 window);
table `B19013_001E` (median household income) doesn't exist before it.

## Data source — and a real, deliberate switch mid-session

The original build sourced this from [County Health
Rankings](https://www.countyhealthrankings.org/)'s free republication of Census ACS
data, joined at **county** level. CHR only republishes its CURRENT annual release, with
no real historical archive — so extending this to real multi-year history required
switching to a **direct pull from the Census API itself**, table `B19013_001E`, the same
place-level pattern `property-tax.ts`'s script already proved (city→place-FIPS
crosswalk, `data/raw/city-place-fips.json`). This is a real, deliberate geography
improvement alongside the year extension: place-level is a city's own boundary, a
tighter fit than a whole county.

## Method

1. **City → place FIPS**: reuses the same crosswalk `property-tax.ts`/
   `housing-cost-burden.ts` use — no new geocoding.
2. **Fetch** (`scripts/gen_income_data.py`): one Census ACS5 API call per (year, state)
   pair (`get=NAME,B19013_001E&for=place:*&in=state:XX`), for every real year 2009–2023.
3. **Concern score**: each city's real income is converted to a percentile rank (0–100)
   among that YEAR's own covered cities, inverted (lower income = higher concern),
   computed independently per year.

## Known limitations (shown, not smoothed over)

- **508/512 real coverage (any year)**, smaller than the prior county-level build's
  512/512 and varying slightly year to year — place-level ACS5 estimates are suppressed
  for some very small places in some years, a real trade-off for the tighter geography.
  See `data/income.json`'s `_meta` and each year's own printed count.
- **No longer carries the old state-level fallback** for suppressed geographies — a real
  city with no place-level estimate in a given year now shows an honest gap for that
  year, rather than substituting a broader state average.
- **A 5-year rolling ACS estimate at every year**, not an annual snapshot — consecutive
  years' figures overlap heavily in their underlying survey window, the same real
  trade-off every ACS-sourced dataset here documents.
- **Not adjusted for local cost of living** — a given dollar figure buys more in a low
  cost-of-living place than a high one; this measures raw nominal income, not
  purchasing-power-adjusted income (see `cost-of-living-methodology.md` for a separate,
  dedicated layer on that).
- **Percentile rank is relative to that year's own covered-city set**, not all US
  places, and not comparable across years — the same real property
  `crime-methodology.md` already documents for its own percentile scores.

## Reproducing this dataset

```
python3 scripts/gen_income_data.py
```

Requires a real `CENSUS_API_KEY` in `.env` and `data/raw/city-place-fips.json` to
already exist (built for the health dataset). Writes `data/income.json` with every real
year 2009–2023. Caches each (year, state) response under `data/raw/income-cache/`
(gitignored — pure fetch-scratch, safe to delete and re-fetch any time).
