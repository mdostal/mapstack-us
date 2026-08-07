# Hate crime rate — methodology

The thirty-third real Mapstack dataset (ddr4-1, `data-drive-round-4` epic).
Resolves a lead deferred across **three prior research rounds** this session.

## What this measures

One layer, **Hate crime rate**, 0–100. Raw input is the real number of hate crime
incidents reported to the FBI, normalized to a rate per 100,000 residents. A rate
has no natural 100-point ceiling, so this uses a direct rescale capped at a
data-informed ceiling (15/100k — see the real observed distribution below), higher
rate = more concerning.

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

1. For each of the 509 cities in the existing `crime-agency-matches.json`
   crosswalk, find the real cached population `crime.ts`'s own build already
   fetched — preferring 2023, falling back through 2024/2025/2022/2021/2020 (an
   agency that joined NIBRS reporting after 2023 has no 2023 cache, the same real,
   documented "coverage grows over time" pattern `crime-methodology.md` already
   discloses).
2. Fetch `hate-crime/agency/{ori}/all` for that same year, sum every value in the
   response's `incident_section.bias` object — confirmed live for NYC 2023: 624
   real incidents, reproduced exactly by this dataset's own build.
3. `rate_per_100k = incidents / population * 100000`, direct rescale capped at 15.

## Known limitations (shown, not smoothed over)

- **471/512 real coverage** — 41 cities have a real ORI in the existing crosswalk
  but no real cached population data in any of the 6 years tried; 3 more
  (Monticello UT, Sundance WY, Geraldine MT) have no ORI match at all in the base
  crosswalk. Real, honest gaps, not fabricated values.
- **Voluntary reporting, real sparsity** — hate crime data submission is voluntary
  even for agencies that otherwise report NIBRS crime data; 104 of the 471 covered
  cities have a genuine zero-incident report for their year, which may reflect true
  zero incidents, under-reporting, or non-participation in this specific data
  collection — this dataset cannot distinguish between those, and says so plainly
  rather than implying certainty it doesn't have.
- **Different real years per city** — each record's own `year` field states which
  year that city's real number reflects; never silently blended or treated as
  directly comparable across a common year (`supportsTime: false`, matching the
  detail string's explicit per-city year).

## Reproducing this dataset

```
python3 scripts/gen_hate_crime_data.py
```

Requires a real `FBI_CRIME_API_KEY` in `.env` and both
`data/raw/crime-agency-matches.json` and `data/raw/crime-offense-cache/` (from
`crime.ts`'s own build) to already exist. Caches each agency's hate-crime response
under `data/raw/hate-crime-cache/` (gitignored — pure fetch-scratch, safe to delete
and re-fetch any time). Writes `data/hate-crime.json`.
