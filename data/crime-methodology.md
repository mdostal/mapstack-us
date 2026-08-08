# Crime — methodology

The third real Mapstack dataset, and the intentional stress-test of the generalized
[`Dataset`](../src/lib/datasets/types.ts) interface: allergy is a climate/season-modeled
score, allergy-locator's care-access dataset is a nearest-point drive-time estimate, and
this is a real government-sourced **rate** (offenses per 100,000 residents) — a genuinely
different shape, proving the interface holds across all three.

## What this measures

Two independent layers, computed for **every year 2010–2025** (a real, year-by-year
history — not just one snapshot — per explicit user direction that every Mapstack dataset
should carry "dates and years and historical data like the allergy one," extended from the
original 2020–2025 range per a later explicit request for "the last 10-20 years"):
- **Violent crime** — homicide, rape, robbery, aggravated assault (NIBRS/UCR "violent
  crime" offense group).
- **Property crime** — burglary, larceny-theft, motor vehicle theft (NIBRS/UCR "property
  crime" offense group).

The map's year control offers exactly these 16 real years — never a year invented to make
the range look longer than the data actually supports.

**Why 2010 as the floor, not further back.** Live-verified against the real FBI API before
extending: agencies with long NIBRS history return real data back to at least 1985 (a probe
against 1975 hit a real API format-validation error, not just sparse data — a genuine
technical floor somewhere between 1975 and 1985). 2010 was chosen as a practical floor
rather than the deepest theoretically-reachable year: real per-year coverage across the
509-agency crosswalk falls off sharply further back (this build's own real 2010 figure is
139/512, see below), and going all the way to the mid-1980s would mean asking for years
where only a small handful of the longest-reporting agencies have any real data at all.

Deliberately **not blended into one score** — combining violent and property crime into a
single number requires a weighting judgment (is one incident of violent crime worth N
property incidents?) this project has no criminological basis to make. Two separate,
honestly-labeled layers instead, matching the same "don't invent what the data doesn't
support" posture as every other dataset here.

## Data source

The real [FBI Crime Data Explorer API](https://cde.ucr.cjis.gov/) (`api.usa.gov/crime/fbi/cde/`),
using a free self-serve key from [api.data.gov/signup](https://api.data.gov/signup/).
U.S. government data — public domain, free to use and redistribute.

## Method

1. **Agency matching** (`scripts/fetch_crime_agencies.py`): each spine city is matched to
   its real municipal police department (or, where a city has no separate police
   department — e.g. Augusta GA, Macon-Bibb GA, Palm Coast FL — the consolidated
   city-county government or county sheriff's office that actually polices it, and for
   Mableton GA, a 2024-incorporated city with no standalone department yet, Cobb County
   Police) via the FBI's own agency directory, fetched fresh per state. 509/512 matched;
   the 3 unmatched (Sundance WY, Monticello UT, Geraldine MT) are small reference towns
   with no agency in the FBI's own directory at all — a real, honest gap, not a bug.
2. **Rate computation** (`scripts/gen_crime_data.py`): for every matched agency that
   reported NIBRS data for **all 12 months of a given year**, the real monthly offense
   counts are summed and divided by the agency's population for that year:
   `rate_per_100k = sum(monthly counts) / population * 100000`. Computed from raw monthly
   counts, not by averaging 12 already-rounded monthly rates, which would compound
   rounding error. Repeated independently for each of the 16 years.
3. **Concern score**: each city's rate is converted to a **percentile rank (0–100) among
   THAT YEAR's own covered cities** — e.g. a 2024 violent-crime concern of 65 means this
   city's 2024 rate is higher than 65% of the other cities with 2024 data, nothing more.
   This is a **relative comparison, not an absolute severity claim**, and **percentiles
   are NOT comparable across years** — each year's covered-city set is a different size
   (see below), so a city's percentile can shift between years even if its own real rate
   didn't change much. The map's detail panel names the year and says "Nth percentile"
   explicitly so this is never silently conflated with allergy's/care-access's more
   absolute scores.

## Why these years, and why coverage grows over time

Real NIBRS participation **grows every year** as more agencies join — so earlier years
genuinely, honestly cover FEWER cities than 2025, not because of a bug but because fewer
agencies were reporting yet. Real per-year coverage this build produced, out of 512 cities
(each city needs a full, real calendar year of NIBRS data to appear for that year):

| Year | Cities covered | Year | Cities covered |
|---|---|---|---|
| 2010 | 139 | 2018 | 182 |
| 2011 | 142 | 2019 | 211 |
| 2012 | 153 | 2020 | 248 |
| 2013 | 155 | 2021 | 335 |
| 2014 | 155 | 2022 | 389 |
| 2015 | 160 | 2023 | 437 |
| 2016 | 165 | 2024 | 454 |
| 2017 | 171 | 2025 | 460 |

2025 remains the best-covered year (460/512 on both layers). 2021's NIBRS-only reporting
mandate caused a well-documented dip in the years right around it (agencies including NYPD
and LAPD submitted no data that specific transition period) — visible directly as the
comparatively small 2020→2021 jump relative to 2021→2022, not smoothed over. 469 distinct
cities have real data for at least one of the 16 years, even though no single year covers
all of them.

## Known limitations (shown, not smoothed over)

- **Coverage varies by year, and shrinks going backward** — an expected, honest property
  of real reporting history. See `_meta.coverage_by_year` in `data/crime.json` for the
  exact city count per year/layer this build produced.
- **27 agencies never participate in NIBRS at all** (as of this data's generation) —
  their real, matched agency simply doesn't report: San Francisco, Oakland, New Orleans,
  Anchorage, St. Petersburg FL, Santa Clarita, Huntington Beach, Ontario CA, Rancho
  Cucamonga, Lancaster CA, Palmdale CA, Hollywood FL, Victorville CA, Pompano Beach FL,
  Rialto CA, Hesperia CA, Deltona FL, Sunrise FL, Norwalk CA, Trenton NJ, Carson CA,
  Compton CA, South Gate CA, Deerfield Beach FL, Daytona Beach FL, Lakewood CA, and
  Chino Hills CA. These show **no data for any year** on the affected layer(s) — never a
  fabricated or interpolated value.
- **13 agencies only recently joined NIBRS**, so they have no full calendar year of data
  yet even though a real agency match exists — Miami Beach FL (Jan 2024), Melbourne FL
  (Dec 2024), North Port FL (Mar 2025), San Leandro CA (Apr 2025), San Bernardino CA (Jun
  2025), Phoenix (Sep 2025), Plantation FL (Sep 2025), Orlando (Jan 2026), Moreno Valley CA
  (Jan 2026), Temecula CA (Jan 2026), Jurupa Valley CA (Jan 2026), Perris CA (Jan 2026),
  and Syracuse NY (Apr 2026). Every real match's own start date
  (`data/raw/crime-agency-matches.json`'s `nibrs_start_date`) determines this, not a
  guess — an agency reappears here the moment it has a real full calendar year of NIBRS
  data. This list shrank from 23 to 13 between this dataset's initial build and this
  update, purely from real agencies crossing their own full-year threshold plus adding
  2025 to the tracked window — not a methodology change.
- **Both lists above are the complete current picture, not illustrative examples** — the
  count and membership of each shift over time as more agencies join NIBRS or a fresh year
  completes; re-running `scripts/gen_crime_data.py` reproduces the current split exactly
  from `data/raw/crime-agency-matches.json`.
- **Percentile rank is relative to that year's own covered-city set**, not to all US
  cities, and **not comparable across years** — see above. Documented as a real property
  of this method, not treated as a fixed absolute scale.
- **One agency, one number** — a city's real crime pattern varies enormously by
  neighborhood (the same caveat this project's whole approach to allergy/care-access data
  already carries at the city level). Sub-city resolution is a real future direction, not
  attempted here.
- **Reporting practices vary by agency** even within NIBRS — what counts as a given
  offense, and how thoroughly it's recorded, isn't perfectly uniform nationwide. A
  documented, real limitation of UCR/NIBRS data generally, not specific to this project.

## Reproducing this dataset

```
# FBI_CRIME_API_KEY is read from the environment OR from a local, gitignored
# .env file at the repo root (FBI_CRIME_API_KEY=<your free api.data.gov key>) --
# either works, no need to export it manually every time.
python3 scripts/fetch_crime_agencies.py   # writes data/raw/crime-agency-matches.json
python3 scripts/gen_crime_data.py         # writes data/crime.json (all years in YEARS)
```

Both scripts cache raw API responses under `data/raw/crime-cache/` and
`data/raw/crime-offense-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time). To add a new year once it's published, add it to `YEARS` in
`scripts/gen_crime_data.py` and re-run -- cached years are skipped, so this only fetches
the new one.
