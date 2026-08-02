# Crime — methodology

The third real Mapstack dataset, and the intentional stress-test of the generalized
[`Dataset`](../src/lib/datasets/types.ts) interface: allergy is a climate/season-modeled
score, allergy-locator's care-access dataset is a nearest-point drive-time estimate, and
this is a real government-sourced **rate** (offenses per 100,000 residents) — a genuinely
different shape, proving the interface holds across all three.

## What this measures

Two independent layers, computed for 2024:
- **Violent crime** — homicide, rape, robbery, aggravated assault (NIBRS/UCR "violent
  crime" offense group).
- **Property crime** — burglary, larceny-theft, motor vehicle theft (NIBRS/UCR "property
  crime" offense group).

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
   reported NIBRS data for **all 12 months of 2024**, the real monthly offense counts are
   summed and divided by the agency's population: `rate_per_100k = sum(monthly counts) /
   population * 100000`. Computed from raw monthly counts, not by averaging 12
   already-rounded monthly rates, which would compound rounding error.
3. **Concern score**: each city's rate is converted to a **percentile rank (0–100) among
   this dataset's own covered cities** — e.g. a violent-crime concern of 65 means this
   city's rate is higher than 65% of the other cities with data, nothing more. This is a
   **relative comparison, not an absolute severity claim** — a real, important distinction
   from allergy's and care-access's scores, which DO aim at something closer to absolute
   severity. The map's tooltip and detail panel say "Nth percentile" explicitly so this is
   never silently conflated with those.

## Why 2024

Per the FBI's own 2024 crime report, every city with population ≥1M provided a full year
of data that year, and overall population coverage exceeded 95% — the best-covered recent
year available. 2021's NIBRS-only reporting mandate caused a well-documented data gap
(~40% of agencies, including NYPD and LAPD, submitted no data that year); coverage has
since recovered substantially but is still real and worth naming.

## Known limitations (shown, not smoothed over)

- **16 of 165 matched cities have no crime data at all**, a real, current gap:
  - **9 cities' agencies don't participate in NIBRS at all**: San Francisco, Oakland, New
    Orleans, Anchorage, St. Petersburg FL, Santa Clarita, Huntington Beach, Ontario CA,
    and Rancho Cucamonga.
  - **7 cities' agencies began NIBRS reporting partway through 2024**, so no full-year
    rate can be computed honestly: Los Angeles, Phoenix, Jacksonville, Orlando, San
    Bernardino, Moreno Valley, and Port St. Lucie.
  - These cities show **no data** for the affected layer(s) on the map — never a
    fabricated or interpolated value.
- **Percentile rank is relative to the 146 cities actually covered here**, not to all US
  cities — adding or removing a covered city could shift every other city's percentile
  slightly. Documented as a real property of this method, not treated as a fixed absolute
  scale.
- **One agency, one number** — a city's real crime pattern varies enormously by
  neighborhood (the same caveat this project's whole approach to allergy/care-access data
  already carries at the city level). Sub-city resolution is a real future direction, not
  attempted here.
- **Reporting practices vary by agency** even within NIBRS — what counts as a given
  offense, and how thoroughly it's recorded, isn't perfectly uniform nationwide. A
  documented, real limitation of UCR/NIBRS data generally, not specific to this project.

## Reproducing this dataset

```
export FBI_CRIME_API_KEY=<your free api.data.gov key>
python3 scripts/fetch_crime_agencies.py   # writes data/raw/crime-agency-matches.json
python3 scripts/gen_crime_data.py         # writes data/crime.json
```

Both scripts cache raw API responses under `data/raw/crime-cache/` and
`data/raw/crime-offense-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time).
