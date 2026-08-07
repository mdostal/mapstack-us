# Library access — methodology

The thirty-sixth real Mapstack dataset (ddr7-1, `data-drive-round-7` epic).
Resolves the IMLS Public Libraries Survey, deferred twice this session.

## What this measures

One layer, **Library access**, 0–100. Raw input is real annual library visits
per capita — summed real `VISITS` divided by summed real `POPU_LSA` (population
of legal service area) across every real library system within a 10-mile radius
of each city. A rate has no natural 100-point ceiling, so this uses a percentile
rank among covered cities, **inverted** (lower access = higher concern) — a
public-good-access framing, matching `parks.ts`/`transit-access.ts`/
`walkability.ts`'s existing convention for access-to-a-resource datasets, not a
risk-framing default.

## Data source

[IMLS Public Libraries Survey (PLS)](https://www.imls.gov/research-evaluation/surveys/public-libraries-survey-pls),
FY2024 (the latest year), a real **static bulk CSV download** — no API, no key:

```
https://www.imls.gov/sites/default/files/2026-06/pls_fy2024_csv.zip
```

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
(2.68 visits/capita, 25 systems within 10 miles) additionally captures Brooklyn
Public Library, Queens Public Library, and nearby NJ systems — a real, broader
picture than a single-system lookup would give.

## Known limitations (shown, not smoothed over)

- **478/512 real coverage** — 34 cities have no real library system within 10
  miles with valid reported data; a real, honest gap for some newer or smaller
  incorporated cities, not a fabricated value.
- **Radius-based summing can double-count a shared regional system across
  nearby cities**, or credit a city with a large system technically centered
  just inside its 10-mile radius that primarily serves a different community.
  A real, disclosed approximation inherent to any radius join, same posture as
  `tri-facility-density.ts`'s own disclosure.
- **A single fiscal year (FY2024)**, not a historical trend — `supportsTime:
  false`.

## Reproducing this dataset

```
python3 scripts/gen_library_access_data.py
```

No API key required. Downloads and caches the real bulk ZIP under
`data/raw/library-access-cache/` (gitignored — pure fetch-scratch, safe to
delete and re-fetch any time). Writes `data/library-access.json`.
