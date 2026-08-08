# Property tax — methodology

The twenty-third real Mapstack dataset, the last of the three real tax candidates
`dataset-backlog.md` researched (#22), and the **first dataset in this project pulled
directly from the Census API** rather than via County Health Rankings' free
republication route — unblocked by a real, free, self-serve `CENSUS_API_KEY`
(https://api.census.gov/data/key_signup.html), the single biggest blocker named all
session.

## What this measures

One layer, **Effective property tax rate**, 0–100. Raw input is median annual real
estate taxes paid divided by median home value — a real, computed effective rate, not a
statutory rate. Already a meaningful, bounded percentage, directly rescaled onto 0–100
(capped at 2.5% — a FIXED cap applied identically to every real year, so a city's rate
stays honestly comparable year to year). Higher effective rate is more concerning.

Real multi-year history — **2010–2023** (`supportsTime: true`), per explicit operator
direction to get "as much data as possible" for real trends over time. 2010 is a REAL,
verified floor, not a guess: table `B25103` does not exist in the ACS5 2009 vintage at
all (confirmed live — that request 400s with "unknown variable 'B25103_001E'"), one
vintage later than income.ts/housing-cost-burden.ts's own real floor.

## Data source

[Census American Community Survey (ACS) 5-year estimates](https://www.census.gov/programs-surveys/acs/data/data-via-api.html),
tables `B25103` (median real estate taxes paid, all owner-occupied units, not just those
with a mortgage) and `B25077` (median home value), one vintage per real year 2010–2023 —
free direct API calls, one real request per (year, state) pair, 644 real requests total
for the whole spine.

## Method

1. **City → place FIPS**: reuses the existing crosswalk (`data/raw/city-place-fips.json`)
   already built for `health.ts` — no new geocoding needed. 509/512 cities have a real
   crosswalk entry (savannah-ga, kenosha-wi, sundance-wy do not — a real, pre-existing
   gap, not introduced here).
2. **Fetch** (`scripts/gen_property_tax_data.py`): one ACS5 API call per (year, state)
   pair (`get=NAME,B25103_001E,B25077_001E&for=place:*&in=state:XX`), not 512 individual
   calls per year.
3. **Rate = taxes ÷ value**, directly rescaled with the cap above, independently per real
   year.

## Known limitations (shown, not smoothed over)

- **~505-508/512 real coverage, varying slightly by year** (see `_meta.coverage` and each
  year's own count in `data/property-tax.json`) — real ACS place-level publication grows
  slightly more complete in later vintages, an honest property of the source, not a bug.
  Savannah GA, Kenosha WI, and Sundance WY have no place-FIPS crosswalk entry at all, at
  any year.
- **A survey-based approximation, not the assessed-value calculation** a true "effective
  tax rate" study (e.g. the Lincoln Institute's own 50-State Property Tax Comparison
  Study) would compute — the two will diverge, sometimes sharply, in states with large
  assessment-vs-market-value gaps (California's Prop 13, Michigan's assessment caps).
  `dataset-backlog.md`'s own research on this candidate names this exact tension.
- **`B25103` measures only owner-occupied households** — renters (who pay property tax
  indirectly via rent) aren't represented, the same conflation `broadband-methodology.md`
  already names for its own "any type of subscription" measure.
- **A 5-year rolling ACS estimate, not a single-year snapshot** — the same real
  trade-off every other ACS-sourced dataset here documents; this applies at EVERY year in
  the 2010–2023 range, so consecutive years' rates overlap heavily and shouldn't be read
  as fully independent annual measurements.
- **The fixed 2.5% cap** means the highest-burden cities in any given year clamp to 100
  concern — a real, disclosed cutoff (see `data/property-tax.json` for each year's own
  real rates), not an arbitrary one; real high-burden cities like Trenton NJ have
  historically sat at or above this cap.

## Reproducing this dataset

```
python3 scripts/gen_property_tax_data.py
```

Requires a real `CENSUS_API_KEY` in `.env` (free signup, see above) and
`data/raw/city-place-fips.json` to already exist (built for the health dataset). Caches
each (year, state) raw ACS response under `data/raw/property-tax-cache/` (gitignored —
pure fetch-scratch, safe to delete and re-fetch any time). Writes `data/property-tax.json`
with all years in `YEARS`.
