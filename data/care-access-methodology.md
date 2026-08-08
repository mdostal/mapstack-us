# Care access — methodology

The fourth real Mapstack dataset, ported from
[`allergy-locator`](https://github.com/mdostal/allergy-locator)'s `data/care-access.json` —
the actual "second real dataset" the generalized [`Dataset`](../src/lib/datasets/types.ts)
interface was designed against (see that file's own header comment). A reduced port, same
posture as `allergy.ts`: the underlying drive-time data is unchanged, but this project adds
its own 0-100 concern-score conversion, documented here rather than assumed.

## What this measures

For every spine city (`data/cities.json`), the nearest facility and estimated drive time
across 3 layers:
- **`general`** — nearest adequate acute-care / major medical center, for everyone (168
  facilities — effectively one within reach of every spine city).
- **`pediatric_specialty`** — broader pediatric subspecialty children's hospitals (92
  facilities).
- **`pediatric_cardiac`** — congenital heart surgery programs (64 facilities, the sparsest
  layer, so the largest drive times).

Drive time (`est_drive_min`) is a **straight-line (haversine) distance estimate, not real
routing** — `distance_mi * 1.25 road-factor / 55 mph`. Unchanged from allergy-locator's
original method. This is NOT source-limited the way allergy/crime are — the hospital
facility lists (`data/hospitals-*.json`, copied unchanged from allergy-locator) and the
scoring math work for any `(lat, lon)`, so this dataset covers the **entire spine**, not
just the original 168 — `scripts/gen_care_access.py` (ported into this repo, not just
referenced) is re-run against the current `data/cities.json` every time the spine grows.

## Concern score (new to this project)

allergy-locator's `/care-access` page shows raw drive times and tiers only — no 0-100
score, since Mapstack's shared `concernColor` ramp didn't exist yet. This project adds a
score, since every Mapstack dataset must return one
(`src/lib/datasets/types.ts`'s `DatasetLayerValue.value`).

Rather than a percentile rank (crime's approach — appropriate for a rate with no natural
absolute scale) or a claimed-precise linear scale across the full data range, this uses
piecewise-linear interpolation anchored on the source data's own defined tiers, so the
score at each tier boundary is a round, checkable number:

| Drive time  | Concern |
|-------------|---------|
| 0 min       | 0       |
| 30 min      | 25      |
| 60 min      | 50      |
| 120 min     | 75      |
| 240+ min    | 100 (capped) |

Values between anchors interpolate linearly. The 240-minute cap is a deliberate choice, not
derived from the data: beyond a 4-hour one-way drive, finer distinctions in "how much
farther" stop being practically meaningful for the concern this layer is trying to convey,
so every city past that point reads as maximally concerning rather than the raw minutes
implying false precision. See `src/lib/formula/care-access-concern.ts` for the
implementation.

## Known limitations (shown, not smoothed over)

- **Straight-line distance underestimates real drive time** in mountainous/rural terrain
  (Rocky Mountain West especially) — the 1.25 road-factor is a single national fudge
  factor, not terrain-aware. Carried over unchanged from allergy-locator.
- **Haversine distance breaks down entirely across non-contiguous geography.** Found while
  porting this dataset: `honolulu-hi`'s nearest pediatric-cardiac program resolves to
  UCSF (San Francisco) at a straight-line-implied 3,262 minutes (54 hours) — physically
  meaningless as a "drive time" since the actual route is a flight over open ocean.
  `anchorage-ak` has the same issue at 1,954 minutes for the same reason. Both are real,
  not bugs — Hawaii and Alaska have no land connection to the nearest facility, and the
  underlying method has no concept of that. The concern-score cap above absorbs this
  honestly (both correctly read as "100, maximally concerning" either way), and the
  `detail` string for any value past 1,000 minutes says explicitly that the estimate
  crosses water and isn't a real driving route, rather than presenting an implausible
  54-hour "drive" as if it were a normal number.
- **The `pediatric_specialty` and `pediatric_cardiac` hospital facility lists have no
  single authoritative source documented** — see allergy-locator's own methodology doc for
  this caveat; unchanged here since those source lists weren't touched (with one exception
  noted below). `general` was rebuilt against a real, authoritative source — see "A real
  fix" below.

## A real fix: the `general` facility list was missing dozens of real hospitals

A live audit this session (prompted by a user noticing Rochester, NY showing a ~4.7-hour
drive for general care access — implausible for a 200,000-person city) found the original
168-facility `general` list, ported unchanged from allergy-locator, was missing real,
well-known, major hospitals in dozens of real mid-size US cities: Rochester NY (Strong
Memorial/URMC), Syracuse NY (Upstate University Hospital), Fargo ND (Sanford Medical
Center Fargo), Buffalo NY (Erie County Medical Center), Albany NY (Albany Medical Center),
Columbia SC (Prisma Health Richland), the entire Northwest Arkansas metro
(Fayetteville/Springdale/Rogers, each routed to the same distant out-of-state facility
instead of their own real local hospitals), and more. Every one of these cities was showing
a multi-hour drive to a distant "nearest" facility that was never actually the nearest —
the real local hospital simply wasn't in the curated list.

**Real fix**: cross-referenced all 512 spine cities against the real, live, keyless [CMS
Hospital General Information dataset](https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0)
(5,432 Medicare-certified hospitals nationally) for a direct city-name match on a real
"Acute Care Hospitals" facility with emergency services. 409/512 spine cities (80%) have
one. `scripts/fix_hospitals_general.py` merges those real facilities into
`data/hospitals-general.json` (168 → 561 facilities), using each spine city's own
coordinates as the facility location (the CMS dataset has no lat/lon, but the facility is
confirmed to be *in* that city by its own real address). The remaining 103 unmatched
cities — mostly real suburbs of a larger metro (Irvine CA, Sunnyvale CA, Tempe AZ, Surprise
AZ) — keep the original curated-list-based nearest-neighbor result, since a suburb
genuinely relying on a nearby city's hospital is often the honest real answer, not a bug.

Two further real issues were caught and fixed during this pass:
- **A dedup bug in the fix script itself**: an early version deduped by hospital name
  alone, which incorrectly skipped real hospitals that share a common name with a
  different real hospital in a different city (e.g. "Memorial Medical Center" is a real,
  distinct hospital in both Modesto CA and Springfield IL; "St Joseph Medical Center" is
  real in both Tacoma WA and Bloomington IL). Fixed by deduping on (name, city, state).
- **Twin-city CMS registration mismatches**: some real hospitals are CMS-registered under
  a legally distinct but practically-adjacent twin city rather than the spine city they
  actually serve — Carle Foundation Hospital serves Champaign but is registered under
  Urbana IL; PeaceHealth Sacred Heart Medical Center (RiverBend campus) serves Eugene but
  is registered under Springfield OR. Both added as manual overrides with the real
  discrepancy documented inline in `data/hospitals-general.json`.

Real effect on the data: `general` concern dropped from an average of 23.3 to 2.3 across
the spine, and the maximum dropped from 100 (a false 4.7-hour drive) to 76 (a real 2.1-hour
drive for Blanding, UT — population 3,600, a genuine rural healthcare access case, not a
bug). One `pediatric_cardiac` gap was also caught and fixed the same way: Oklahoma City's
real OU Health / Oklahoma Children's Hospital Heart Center (Newsweek-recognized for
pediatric cardiac surgery, verified live against the hospital's own site) was missing from
the 64-facility curated list, showing a false 4.3-hour drive to Dallas. `pediatric_specialty`
was audited and not found to have the same class of error — its remaining high-concern
cities (Lubbock TX, Amarillo TX, Fargo ND, Billings MT, Rapid City SD) reflect a genuinely
rare, centralized specialty with real, well-documented access gaps in the rural Mountain
West/Great Plains, not missing local facilities.

To reproduce: `python3 scripts/fix_hospitals_general.py && python3 scripts/gen_care_access.py`.
`scripts/audit-dataset-directions.ts` (run via `pnpm exec tsx scripts/audit-dataset-directions.ts`)
is the general-purpose tool that caught this — it runs every shipped dataset's real
`getValue()` against every real city and prints the highest/lowest-concern cities per
layer, for a real-world plausibility check against real-world knowledge.
- **Nearest-facility only, not "reachable for planned care."** An established care team
  often stays the anchor for ongoing care even after a move — not modeled here, same
  documented gap as allergy-locator's original.
- **Single snapshot, no time dimension** (`supportsTime: false`) — hospital networks and
  road access change over time, but this dataset doesn't track that; a future direction if
  a real second snapshot is ever generated, not attempted here.

## Reproducing this dataset

```
python3 scripts/gen_care_access.py
```

Regenerates `data/care-access.json` from `data/cities.json` + the 3
`data/hospitals-*.json` facility lists. Re-run any time the spine grows or the facility
lists change. The facility lists themselves are copied unchanged from allergy-locator (not
re-sourced here) — update them there first if a facility list correction is needed.
