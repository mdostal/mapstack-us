# School spending — methodology

The twenty-eighth real Mapstack dataset (dvd-5, `dataset-verification-drive` epic).
Upgrades `.pHive/epics/data-store/docs/dataset-backlog.md` #21 (school quality) from
"weak, proxy-only" to a real, direct government-finance number — no API key required.

## What this measures

One layer, **Per-pupil spending**, 0–100. Raw input is real total current expenditure
per enrolled student, from NCES's own Common Core of Data (CCD) F-33 school district
finance survey (2020, the latest year with real data). A dollar figure has no natural
100-point ceiling, so this uses a percentile rank among covered cities, **inverted**
(lower spending = higher concern) — the same convention `income.ts`/`housing-
inventory.ts`/`days-on-market.ts` already use for their own unbounded raw quantities,
and the same well-established direction `income.ts` already picked for a different
dollar figure (real education-finance research broadly treats underfunding, not
overfunding, as the well-supported risk to outcomes).

## Data source

[Urban Institute Education Data Portal API](https://educationdata.urban.org/documentation/),
built on NCES's Common Core of Data (CCD) F-33 finance survey. Free, no API key,
no registration — confirmed live.

## Method

School district boundaries don't align with county or city boundaries one-to-one — a
county can contain several small districts, and a city can be served by more than one.
Rather than picking a single "representative" district per city (an arbitrary
shortcut), this aggregates every district to **county level** via a real
**enrollment-weighted average**:

1. Fetch every district's real `county_code` from the CCD directory endpoint
   (`.../school-districts/ccd/directory/{year}/?fips={state}`) — one real request per
   state, all districts returned in a single page (no pagination needed, confirmed
   live up to New York's 1,096-district state result).
2. Fetch every district's real `exp_total` (total current expenditure) and
   `enrollment_fall_responsible` (real fall enrollment) from the finance endpoint
   (`.../school-districts/ccd/finance/{year}/?fips={state}`).
3. For every county, sum `exp_total` across every district whose directory record
   maps to that county, sum `enrollment_fall_responsible` the same way, then divide —
   a real enrollment-weighted per-pupil figure, not a naive district-count average.
4. Join to the spine via the existing `data/raw/city-county-fips.json` crosswalk
   (the same one `hazard.ts`/`unemployment.ts`/`cost-of-living.ts` already use) — zero
   new geocoding.

## Known limitations (shown, not smoothed over)

- **504/512 real coverage.** A real bug was caught and fixed mid-build: NCES's own
  `county_code` field is a plain integer-as-string, NOT zero-padded (Los Angeles comes
  back as `"6037"`, not `"06037"`) — this silently broke the join for every state whose
  FIPS code starts with a leading zero (CA, AZ, CO, CT, AR, AL...) on the first run,
  producing an implausible 341/512 match rate. Fixed by `zfill(5)`-padding before the
  join; re-running against the same cached API responses recovered 504/512.
- **The remaining 8 gaps are a real geography-vintage mismatch, not a bug**: all 7
  Connecticut spine cities (Hartford, Bridgeport, New Haven, Stamford, Waterbury,
  Norwalk, Danbury) plus Broomfield, CO. Connecticut abolished its legacy counties in
  favor of 9 new Census planning regions in 2022 — this repo's own
  `data/raw/city-county-fips.json` crosswalk already uses the new codes (e.g. Hartford
  → `09110` "Capitol"), but NCES's 2020-vintage CCD data still reports the old legacy
  county FIPS (Hartford → `09003`), so the join has no shared key for any CT city.
  Broomfield, CO is a real consolidated city-county (est. 2001) that NCES's data
  apparently still assigns to a predecessor county in a way this join doesn't resolve.
  Both are named here rather than papered over with a fabricated value.
- **2020 is the latest year with real data** — a real, live-confirmed ~5-year release
  lag (a 2021 query returns zero rows), worse than most datasets in this repo.
- **County-level, not district- or city-level** — every city sharing a county shares
  one blended per-pupil number, even though real district-to-district variation within
  a county can be large.
- **Spending is not a quality score** — this measures real investment level, not
  outcomes. The relationship between per-pupil spending and student outcomes is
  genuinely, actively debated in education-policy research (context, cost-of-living,
  and how funds are spent all matter); very high spending can also reflect high local
  labor costs rather than "better" schools. This dataset makes no outcome claim.
- **A single blended figure**, not decomposed into instruction vs. administration vs.
  facilities spending, even though the source data has that breakdown — a future pass
  could add it as sub-layers.

## Reproducing this dataset

```
python3 scripts/gen_school_spending_data.py
```

No API key required. Requires `data/raw/city-county-fips.json` to already exist.
Caches each state's directory/finance response under
`data/raw/school-spending-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time). Writes `data/school-spending.json`.
