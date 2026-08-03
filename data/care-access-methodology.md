# Care access — methodology

The fourth real Mapstack dataset, ported from
[`allergy-locator`](https://github.com/mdostal/allergy-locator)'s `data/care-access.json` —
the actual "second real dataset" the generalized [`Dataset`](../src/lib/datasets/types.ts)
interface was designed against (see that file's own header comment). A reduced port, same
posture as `allergy.ts`: the underlying drive-time data is unchanged, but this project adds
its own 0-100 concern-score conversion, documented here rather than assumed.

## What this measures

For each of the 168 spine cities (`data/cities.json`), the nearest facility and estimated
drive time across 3 layers:
- **`general`** — nearest adequate acute-care / major medical center, for everyone (168
  facilities — effectively one within reach of every spine city).
- **`pediatric_specialty`** — broader pediatric subspecialty children's hospitals (92
  facilities).
- **`pediatric_cardiac`** — congenital heart surgery programs (64 facilities, the sparsest
  layer, so the largest drive times).

Drive time (`est_drive_min`) is a **straight-line (haversine) distance estimate, not real
routing** — `distance_mi * 1.25 road-factor / 55 mph`. Unchanged from allergy-locator's
original method; see that repo's `data/care-access-methodology.md` and
`scripts/gen_care_access.py` for the full generation pipeline (hospital facility lists,
agency matching) — not re-run here, this dataset is a direct copy of that repo's committed
output.

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
- **The hospital facility lists have no single authoritative source documented** — see
  allergy-locator's own methodology doc for this caveat; unchanged here since the source
  lists weren't touched.
- **Nearest-facility only, not "reachable for planned care."** An established care team
  often stays the anchor for ongoing care even after a move — not modeled here, same
  documented gap as allergy-locator's original.
- **Single snapshot, no time dimension** (`supportsTime: false`) — hospital networks and
  road access change over time, but this dataset doesn't track that; a future direction if
  a real second snapshot is ever generated, not attempted here.

## Reproducing this dataset

This file is a direct copy of allergy-locator's `data/care-access.json` as of the date it
was ported. To regenerate the underlying drive-time data (e.g. after the hospital facility
lists change), run allergy-locator's own `scripts/gen_care_access.py` and re-copy its
output — the generation pipeline itself is not duplicated in this repo.
