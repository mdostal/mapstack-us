# Population change — methodology

The twenty-sixth real Mapstack dataset, and the **last of the original five
Census-cluster items** (`dataset-backlog.md` #1) to ship — population, broadband,
income, and housing-cost-burden were already live; property tax shipped earlier this
session. Unblocked by the same real, free, self-serve `CENSUS_API_KEY` that unblocked
property tax.

## What this measures

One layer, **Population growth/decline**, 0–100. Raw input is the percent change in
total population from the prior real year. Per the backlog's own explicit framing,
decline is the concerning pole — growth isn't automatically "good" either (real
housing/infrastructure strain from rapid growth is a genuine tension this project isn't
papering over, just not scoring here) — so any flat-or-growing year scores 0 concern,
and a declining year is directly rescaled by how steep that year's decline was, capped
at 3% (a data-informed ceiling — see the real observed range below).

Real multi-year history — **2001–2023, year over year** (`supportsTime: true`), per
explicit operator direction to get "as much data as possible" for real trends over
time. A genuine upgrade from the original build's single 2018-vs-2023 two-point
comparison.

## Data source — stitched from three real, distinct Census products

The backlog originally specified the Census Population Estimates Program (PEP), which
publishes annual place-level population figures — the ORIGINAL single-snapshot build
couldn't find a working place-level PEP path for its 2023 vintage and fell back to a
two-point ACS comparison instead. Extending to real annual data required re-investigating
PEP more carefully, which turned up the real, working path:

1. **2001–2009**: `2000/pep/int_population`, the real intercensal estimates product.
   Confirmed live: place-level geography exists (`geoLevelId 162`, state-only
   requirement), and its own `DATE_`/`DATE_DESC` fields label each code explicitly
   (`DATE_=2` → "7/1/2000 population estimate" through `DATE_=11` → "7/1/2009 population
   estimate"). One API call per state returns every one of these real years at once.
2. **2010–2019**: `2019/pep/population`, the real postcensal estimates product.
   Confirmed live: place-level geography exists, and `DATE_CODE` 3–12 map to real annual
   estimates 7/1/2010 through 7/1/2019 per the variable's own documented value labels.
   Again, one API call per state returns all ten years at once.
3. **2020–2023**: Census's PEP place-level product was confirmed live to have **no
   place-level geography for any post-2020 vintage** (`2021/pep/population/geography`
   lists only state-level geography; 2020/2022/2023 don't expose this exact API path at
   all). Falls back to [Census ACS 5-year estimates](https://www.census.gov/programs-surveys/acs/data/data-via-api.html),
   table `B01003` (total population), one point per vintage year. **A real, disclosed
   methodology seam**: these four years are each a rolling 5-year window average, not a
   true annual snapshot like the 23 PEP-sourced years before them — the transition year
   (2019→2020) can show a discontinuity that reflects the measurement-type change, not
   necessarily a real demographic event.

## Method

1. Reuses the exact same city → place-FIPS crosswalk already proven for
   `property-tax.ts`/`income.ts` (`scripts/gen_population_change_data.py`).
2. For each real year, `pct_change = (pop_this_year − pop_prior_year) / pop_prior_year ×
   100`, computed independently per year from whichever of the three sources above that
   year and its immediate predecessor come from.
3. `concern = 0` for any year with `pct_change >= 0`; otherwise
   `min(100, |pct_change| / 3 × 100)`.

## Known limitations (shown, not smoothed over)

- **~505–508/512 real coverage depending on year** — the same no-crosswalk gaps
  (Savannah GA, Kenosha WI, Sundance WY) `property-tax-methodology.md` already
  documents (both datasets share the identical crosswalk).
- **The 2019→2020 boundary mixes measurement types** (true annual PEP estimate vs. a
  rolling 5-year ACS window) — a real, disclosed seam, not a data error. Cross-boundary
  comparisons should be read cautiously.
- **Real, extreme single-year swings exist and are shown, not smoothed** — e.g. New
  Orleans, LA shows a real **-53.43%** population change for 2006, the actual, historically
  documented post-Hurricane-Katrina collapse (Katrina hit August 2005; the 7/1/2006
  estimate reflects the mass evacuation). Real fast-growing Phoenix-exurb boomtowns
  (Maricopa AZ +139% in 2001, Queen Creek AZ +53% in 2001, Buckeye AZ +47% in 2001) are
  equally real, not outliers to be filtered. Small-population spine towns (e.g.
  Monticello UT, Geraldine MT) can also show large percentage swings from small absolute
  changes — an honest small-N property, not a bug.
- **A fixed 3% annual-decline cap** means any year with a decline steeper than 3% clamps
  to 100 concern — chosen from this build's own real observed range (min -53.43%, median
  +0.79%, max +138.91% across all city-years; 84 of 11,584 real city-years, well under
  1%, clamp to 100).
- **Decline-only scoring is a deliberate, disclosed scope choice**, not an oversight —
  the backlog explicitly flags that extreme growth carries its own real costs
  (infrastructure strain) that this layer doesn't score, leaving that as a genuinely
  separate question for a future pass rather than inventing a two-sided penalty here.

## Reproducing this dataset

```
python3 scripts/gen_population_change_data.py
```

Requires a real `CENSUS_API_KEY` in `.env` and `data/raw/city-place-fips.json` to
already exist. Caches each real request under `data/raw/population-change-cache/`
(gitignored — pure fetch-scratch, safe to delete and re-fetch any time). Writes
`data/population-change.json` with every real year 2001–2023.
