# Library access — methodology

The thirty-sixth real Mapstack dataset (ddr7-1, `data-drive-round-7` epic).
Resolves the IMLS Public Libraries Survey, deferred twice this session.
Extended to real multi-year history 2007–2024 (`ddr-library-extend`, this session).

## What this measures

One layer, **Library access**, 0–100. Raw input is real annual library visits
per capita — summed real `VISITS` divided by summed real `POPU_LSA` (population
of legal service area) across every real library system within a 10-mile radius
of each city, at a given real fiscal year. A rate has no natural 100-point
ceiling, so this uses a percentile rank among covered cities, **inverted**
(lower access = higher concern) — a public-good-access framing, matching
`parks.ts`/`transit-access.ts`/`walkability.ts`'s existing convention for
access-to-a-resource datasets, not a risk-framing default. Percentile-ranked
independently PER YEAR (same convention as `income.ts`/`crime.ts` for
unbounded raw quantities) — not comparable across years, only within a year.

Real multi-year history — **2007–2024** (`supportsTime: true`), per explicit
operator direction to get "as much data as possible" for real trends over
time.

## Data source

[IMLS Public Libraries Survey (PLS)](https://www.imls.gov/research-evaluation/surveys/public-libraries-survey-pls),
a real **static bulk CSV download per fiscal year** — no API, no key. Every
real year's URL was read directly off IMLS's own survey page rather than
guessed (see Method below); the naming convention changes across three real
eras with no predictable pattern (`pupld{YY}{suffix}_csv.zip` for 2007-2013,
`pls_fy{YEAR}_data_files_csv.zip` for 2014-2018, a date-prefixed
`{upload-date}/pls_fy{YEAR}_csv.zip` for 2019-2024).

## Method — a real detour worth documenting

This exact dataset was deferred **twice** earlier this session — a direct URL
guess against IMLS's site returned a real 404. Resolved this round by browsing
IMLS's own site structure instead of guessing a URL: `imls.gov/research-
evaluation/data` → "Library Search & Compare" → the real PLS survey page, which
links the real bulk download directly.

**A real join-strategy lesson learned for the second time this session**: the
file's own `CITY`/`STABR` fields are administrative address fields, not real
service-area fields — the exact same class of problem that sank this round's
earlier, abandoned SDWA drinking-water attempt. Confirmed live: an exact
`CITY="MINNEAPOLIS"` + `STABR="MN"` match returns **zero** rows (real
Minneapolis, MN's library system is registered under a different administrative
city name) — and 114 of the 512 spine cities have no matching row at all by
name.

**The real fix, applying a pattern already proven by `tri-facility-density.ts`/
`drought.ts` earlier this session**: the same file also carries real
`LATITUDE`/`LONGITUD` per library system — confirmed live, **100%** of the
file's 9,249 rows have valid, non-zero coordinates (9,168 also have valid real
`VISITS`/`POPU_LSA`). This uses a 10-mile radius join against each city's own
real lat/lon (already in `data/cities.json`) instead of the file's own name
field — real coverage jumped from 395/512 (77%, name-based) to 478/512 (93%,
radius-based) on the same underlying data.

Confirmed live: New York City's own real NYPL branch-library figures (12,325,494
visits, 3,662,652 population served for FY2024) were reproduced exactly during
research before the radius join was added; the shipped radius-based number
additionally captures Brooklyn Public Library, Queens Public Library, and
nearby NJ systems — a real, broader picture than a single-system lookup would
give.

**Real floor for the extension to multi-year history**: FY2007. A live
per-year column check found FY2006 and every earlier year's file (back to the
real 1992 survey start) has NO `LATITUDE`/`LONGITUD` columns at all — only the
same administrative `CITY`/`STABR` fields already shown above to fail for
114/512 spine cities by exact name match. Rather than fall back to that worse
join for 1992-2006, those years are honestly out of scope for this dataset.
Each year's zip also contains multiple CSVs (an outlet-level file, a
state-summary file, an "outlying areas" file) with drifting inner filenames
year to year — rather than hardcode a name per year, the build finds whichever
file's header contains all four required columns (`VISITS`, `POPU_LSA`,
`LATITUDE`, `LONGITUD`) together, confirmed live to uniquely identify the
right file every year.

## Known limitations (shown, not smoothed over)

- **482/512 real coverage** (any year) — see `data/library-access.json`'s own
  `_meta.coverage`. Real coverage varies year to year (roughly 475-483/512, see each year's
  own printed count in `data/library-access.json`'s per-year data) — cities
  with no real library system within 10 miles with valid reported data that
  year are honestly excluded, not fabricated.
- **Radius-based summing can double-count a shared regional system across
  nearby cities**, or credit a city with a large system technically centered
  just inside its 10-mile radius that primarily serves a different community.
  A real, disclosed approximation inherent to any radius join, same posture as
  `tri-facility-density.ts`'s own disclosure.
- **Real range is 2007-2024, not the survey's full 1992-2024 history** — see
  the FY2007 floor explanation above; 1992-2006 lack the coordinate data this
  join method needs.

## Reproducing this dataset

```
python3 scripts/gen_library_access_data.py
```

No API key required. Downloads and caches each real year's bulk ZIP under
`data/raw/library-access-cache/` (gitignored — pure fetch-scratch, safe to
delete and re-fetch any time; resumable on rerun). Writes
`data/library-access.json` with every real year 2007-2024.
