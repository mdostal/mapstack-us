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
(capped at 2.5% — the real observed spine max, Trenton NJ at 3.43%, sits just above it,
so a handful of the highest-burden cities clamp to 100, an honest "most burdened" read,
not a data gap). Higher effective rate is more concerning.

## Data source

[Census American Community Survey (ACS) 5-year estimates](https://www.census.gov/programs-surveys/acs/data/data-via-api.html),
2023 vintage, tables `B25103` (median real estate taxes paid, all owner-occupied units,
not just those with a mortgage) and `B25077` (median home value) — free direct API call,
one real request per state (`place:*` wildcard), 46 real requests total for the whole
spine.

## Method

1. **City → place FIPS**: reuses the existing crosswalk (`data/raw/city-place-fips.json`)
   already built for `health.ts` — no new geocoding needed. 509/512 cities have a real
   crosswalk entry (savannah-ga, kenosha-wi, sundance-wy do not — a real, pre-existing
   gap, not introduced here).
2. **Fetch** (`scripts/gen_property_tax_data.py`): one ACS5 API call per state
   (`get=NAME,B25103_001E,B25077_001E&for=place:*&in=state:XX`), not 512 individual
   calls.
3. **Rate = taxes ÷ value**, directly rescaled with the cap above.

## Known limitations (shown, not smoothed over)

- **508/512 real coverage.** Savannah GA, Kenosha WI, and Sundance WY have no
  place-FIPS crosswalk entry at all. Louisville, KY has a real crosswalk entry but no
  matching ACS row in the fetched data — Louisville-Jefferson County's real consolidated
  city-county government appears to have been reclassified out of the standard ACS
  place table in this vintage, the same kind of consolidated-government quirk this
  project's own crime/broadband methodology docs already name for Augusta GA and
  Macon-Bibb GA. A real, honest null, not a fabricated value.
- **A survey-based approximation, not the assessed-value calculation** a true "effective
  tax rate" study (e.g. the Lincoln Institute's own 50-State Property Tax Comparison
  Study) would compute — the two will diverge, sometimes sharply, in states with large
  assessment-vs-market-value gaps (California's Prop 13, Michigan's assessment caps).
  `dataset-backlog.md`'s own research on this candidate names this exact tension.
- **`B25103` measures only owner-occupied households** — renters (who pay property tax
  indirectly via rent) aren't represented, the same conflation `broadband-methodology.md`
  already names for its own "any type of subscription" measure.
- **A 5-year rolling ACS estimate, not a single-year snapshot** — the same real
  trade-off every other ACS-sourced dataset here documents.
- **The 8 cities clamping to 100 concern** (Trenton NJ, Paterson NJ, Waterbury CT,
  Rockford IL, Bridgeport CT, Waukegan IL, Rochester NY, Elizabeth NJ) are real,
  well-known high-property-tax-burden cities — the clamp reflects genuine extremity, not
  an arbitrary cutoff.

## Reproducing this dataset

```
python3 scripts/gen_property_tax_data.py
```

Requires a real `CENSUS_API_KEY` in `.env` (free signup, see above) and
`data/raw/city-place-fips.json` to already exist (built for the health dataset). Caches
each state's raw ACS response under `data/raw/property-tax-cache/` (gitignored — pure
fetch-scratch, safe to delete and re-fetch any time). Writes `data/property-tax.json`.
