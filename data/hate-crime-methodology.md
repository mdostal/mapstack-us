# Hate crime rate — methodology

The thirty-third real Mapstack dataset (ddr4-1, `data-drive-round-4` epic).
Resolves a lead deferred across **three prior research rounds** this session.

## What this measures

One layer, **Hate crime rate**, 0–100. Raw input is the real number of hate crime
incidents reported to the FBI in a given real year, normalized to a rate per
100,000 residents. A rate has no natural 100-point ceiling, so this uses a direct
rescale capped at a FIXED data-informed ceiling (15/100k, applied identically to
every real year so a city's rate stays honestly comparable year to year), higher
rate = more concerning.

Real multi-year history — **2010–2025** (`supportsTime: true`), per explicit
operator direction to get "as much data as possible" for real trends over time.
Deliberately scoped to match `crime.ts`'s own real range rather than the
hate-crime endpoint's theoretical 1991 floor — see Method below for why.

## Data source

[FBI Crime Data Explorer](https://cde.ucr.cjis.gov/), the same free, keyless
`FBI_CRIME_API_KEY` `crime.ts` already uses. Reuses `crime.ts`'s own existing
509-city ORI crosswalk (`data/raw/crime-agency-matches.json`) and its cached
per-agency population data — zero new crosswalk or population fetch.

## Method — a real detour worth documenting

This exact dataset was attempted and deferred **three separate times** earlier this
session (see `.pHive/epics/data-store/docs/dataset-backlog.md`'s addenda). Every
attempt guessed at an `offense` code (`hate-crime`, `hatecrime`, `bias`,
`bias-motivation`, ...) against the same URL shape `crime.ts` already uses
successfully for violent/property crime (`summarized/agency/{ori}/{offense}`) — and
every guess returned the FBI API's own real error, *"The requested offense is
missing or not a valid one."* The endpoint shape itself was simply wrong: hate
crime isn't an `offense` value on that resource at all.

The real fix came from reading the FBI CDE's own interactive API documentation page
(`cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi`) — but that page is a JavaScript
single-page app, invisible to plain `curl` (confirmed: a direct request returns an
empty shell), which is exactly why three rounds of endpoint-name guessing never
found it. Rendering it with a real browser (Playwright) revealed a genuinely
separate resource: `GET /hate-crime/agency/{ori}/{bias}`, with `bias` (not
`offense`) as the real path parameter, and `bias=all` a real, documented enum value
(confirmed via the docs page's own "Enum Info" panel) that returns every bias
category's incident count in one response.

The hate-crime endpoint itself carries no population field (confirmed live), so a
real denominator has to come from elsewhere. `crime.ts`'s own per-year population
cache (`data/raw/crime-offense-cache/{ori}_violent-crime_{year}.json`) covers
exactly 2010–2025 -- reusing it for the SAME real year (never a fallback to a
different year) means zero new population fetches, but does bound this dataset's
real range to match. Reaching further back (hate-crime data theoretically exists
to 1991) would require a genuinely separate population fetch for years `crime.ts`
itself doesn't cover, for what's likely much sparser voluntary reporting in the
1990s/2000s -- not attempted here.

1. For each of the 509 cities in the existing `crime-agency-matches.json`
   crosswalk, and each real year 2010–2025: look up that exact year's real cached
   population from `crime.ts`'s own build. No population for that city/year means
   no real record for that city/year (an honest gap, not a fabricated fallback).
2. Fetch `hate-crime/agency/{ori}/all` for that same year, sum every value in the
   response's `incident_section.bias` object — confirmed live for NYC 2023: 624
   real incidents, reproduced exactly by this dataset's own build.
3. `rate_per_100k = incidents / population * 100000`, direct rescale capped at 15,
   computed independently per year.

## Known limitations (shown, not smoothed over)

- **471/512 real coverage overall (any year)**, growing year over year the same
  way `crime.ts`'s own coverage does (139/512 in 2010 rising to 471/512 by 2025) —
  an honest reflection of real, growing NIBRS/hate-crime reporting participation,
  not a bug. See `data/hate-crime.json`'s `_meta` and each year's own printed
  count.
- **Voluntary reporting, real sparsity** — hate crime data submission is voluntary
  even for agencies that otherwise report NIBRS crime data; many covered
  city-years have a genuine zero-incident report, which may reflect true zero
  incidents, under-reporting, or non-participation in this specific data
  collection — this dataset cannot distinguish between those, and says so plainly
  rather than implying certainty it doesn't have.
- **Percentile-free, but still not comparable pre-/post- a reporting-mandate
  change** — 2021's real NIBRS-only reporting mandate caused the same well-
  documented agency-participation dip `crime-methodology.md` already discloses for
  violent/property crime; visible directly in this dataset's own coverage-by-year
  counts.

## Reproducing this dataset

```
python3 scripts/gen_hate_crime_data.py
```

Requires a real `FBI_CRIME_API_KEY` in `.env` and both
`data/raw/crime-agency-matches.json` and `data/raw/crime-offense-cache/` (from
`crime.ts`'s own build) to already exist. Caches each (agency, year) hate-crime
response under `data/raw/hate-crime-cache/` (gitignored — pure fetch-scratch, safe
to delete and re-fetch any time). Writes `data/hate-crime.json` with every real
year 2010–2025.
