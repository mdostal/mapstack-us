# Crime — methodology

The third real Mapstack dataset, and the intentional stress-test of the generalized
[`Dataset`](../src/lib/datasets/types.ts) interface: allergy is a climate/season-modeled
score, allergy-locator's care-access dataset is a nearest-point drive-time estimate, and
this is a real government-sourced **rate** (offenses per 100,000 residents) — a genuinely
different shape, proving the interface holds across all three.

## What this measures

Two independent layers, computed for **every year 2020–2024** (a real, year-by-year
history — not just one snapshot — per explicit user direction that every Mapstack dataset
should carry "dates and years and historical data like the allergy one"):
- **Violent crime** — homicide, rape, robbery, aggravated assault (NIBRS/UCR "violent
  crime" offense group).
- **Property crime** — burglary, larceny-theft, motor vehicle theft (NIBRS/UCR "property
  crime" offense group).

The map's year control offers exactly these 5 real years — never a year invented to make
the range look longer than the data actually supports.

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

1. **Agency matching** (`scripts/fetch_crime_agencies.py`): each of the 168 spine cities
   is matched to its real municipal police department (or, where a city has no separate
   police department — e.g. Augusta, GA — the consolidated city-county sheriff's office
   that actually polices it) via the FBI's own agency directory, fetched fresh per state.
   165/168 matched; the 3 unmatched (Sundance WY, Monticello UT, Geraldine MT) are small
   reference towns with no agency in the FBI's own directory at all — a real, honest gap,
   not a bug.
2. **Rate computation** (`scripts/gen_crime_data.py`): for every matched agency that
   reported NIBRS data for **all 12 months of a given year**, the real monthly offense
   counts are summed and divided by the agency's population for that year:
   `rate_per_100k = sum(monthly counts) / population * 100000`. Computed from raw monthly
   counts, not by averaging 12 already-rounded monthly rates, which would compound
   rounding error. Repeated independently for each of the 5 years.
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

2020–2024 chosen as the most recent 5 full years with real NIBRS data available. Real
NIBRS participation **grows every year** as more agencies join — so earlier years
genuinely, honestly cover FEWER cities than 2024, not because of a bug but because fewer
agencies were reporting yet. Per the FBI's own 2024 crime report, every city with
population ≥1M provided a full year of data that year, and overall population coverage
exceeded 95% — the best-covered year in this range. 2021's NIBRS-only reporting mandate
caused a well-documented dip (~40% of agencies, including NYPD and LAPD, submitted no
data that specific year) — visible directly in this dataset's own year-over-year coverage
counts, not smoothed over.

## Known limitations (shown, not smoothed over)

- **Coverage varies by year, and shrinks going backward** — an expected, honest property
  of real reporting history. See `_meta.coverage_by_year` in `data/crime.json` for the
  exact city count per year/layer this build produced.
- **Some agencies never participate in NIBRS at all** (as of this data's generation):
  San Francisco, Oakland, New Orleans, Anchorage, St. Petersburg FL, Santa Clarita,
  Huntington Beach, Ontario CA, and Rancho Cucamonga. These show **no data for any year**
  on the affected layer(s) — never a fabricated or interpolated value.
- **Some large agencies only recently joined NIBRS**, so their earliest covered year is
  later than 2020: Los Angeles (2024 only, mid-year start), Phoenix, Jacksonville,
  Orlando, San Bernardino, Moreno Valley, and Port St. Lucie all have limited or no
  historical depth in this range for the same real reason.
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
