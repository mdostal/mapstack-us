# Measured grass pollen — methodology

The twenty-first real Mapstack dataset, and a direct response to a repeated operator
request: `allergy-scoring.md`'s grass severity score is **climate-modeled**, not a real
measured pollen count, and that gap was raised more than once this session. Real
station-measured pollen data does exist — it's just scattered across individual state
and county health departments rather than published as one national feed, so it took a
targeted search (kicked off by an operator-supplied real source link) to find any of it.

## What this measures

One layer, **Measured grass pollen**, 0–100. Raw input is a REAL annual count: the
average number of "elevated grass pollen days" per year, straight from a real health
department's own pollen-counting station — not modeled, not estimated. Higher count is
more concerning, directly rescaled (capped at 90 days/year — the real observed max in
the source station's own multi-decade history), the same data-informed-cap posture
`heat-methodology.md` uses.

**This is deliberately a separate dataset from "Allergy severity," never blended into
it** — explicit operator direction ("another layer and option we can use — be
transparent on it and let us choose how it maps") matches this project's existing
"never invent a cross-dataset blend" principle (see `custom-blend.ts`'s own doc
comment). The modeled severity score and this real station count are both shown,
never merged into one number.

## Data source — and the real search that found it

Operator-supplied starting point: Vermont Department of Health's **EPHT Pollen** ArcGIS
FeatureServer (`https://www.arcgis.com/home/item.html?id=ecf4b3d2deb4462cab0131beebb175ac`)
— real, free, public, daily tree/grass/weed/ragweed pollen counts from 2009–2025,
collected by Timberlane Allergy & Asthma Associates as part of the CDC's national
Environmental Public Health Tracking (EPHT) program, confirmed live with real October
2025 data at the time of this research.

Since EPHT is a coordinated, multi-state CDC program, other states plausibly host
similar datasets — confirmed by searching ArcGIS Online's own public item catalog
(`arcgis.com/sharing/rest/search`, not a licensed data purchase, a public API anyone can
query) for sibling "pollen" Feature Services. That search surfaced:

- **Carver County, MN Environmental Services — "Elevated Pollen Days"** (USED HERE):
  real annual counts of elevated tree/grass/weed pollen days, 1993–2020 (not updated
  since — a real, dated snapshot, not a live feed). The only source found with any real
  match in the 512-city spine: the Twin Cities MN metro sits within real range of it.
- **Vermont's EPHT Pollen** (the operator's own link): the best single source found —
  real, daily, genuinely live-maintained through 2025 — but Vermont has **zero cities**
  in the 512-city spine (no VT city clears the spine's population threshold), so this
  real, verified data currently has nowhere to attach. Documented here, not silently
  dropped, so whoever extends this dataset next (a new small town, or a future
  finer-grained spine) doesn't have to re-find it.
- **Washington DOH's "Pollen Sense Data Summary"**: lists 36 real sensor site locations
  (a genuine automated pollen-sensor network across WA) but its public ArcGIS *view*
  ships every reading field (category, count, timestamp) as null — a real network
  exists, the public layer just doesn't expose its readings. Not usable as-is.
- **Nashville Open Data's "Air Quality and Pollen Count"**: real fields, real historical
  values, but its most recent real record is from **May 2010** — abandoned, not live.
  Not usable.

## Method

1. **Fetch** (`scripts/gen_measured_grass_pollen_data.py`): Carver County's real ArcGIS
   table, queried directly, no API key.
2. **Average the 5 most recent real years on file** (2016–2020) rather than the single
   latest year — a single year's count is a small, noisy number (Carver's own real
   history swings from 3 to 90 days/year); a 5-year average is more representative
   without pretending to a precision the data doesn't support.
3. **Nearest-city match**: every spine city within 65 km of Carver County's
   approximate centroid (Chaska, the county seat — the ArcGIS table itself is a
   non-spatial annual summary with no lat/lon, so this project's usual
   point-geocode-crosswalk pattern doesn't apply here) gets the real regional value.
   Real result: 7 of 512 cities (Minneapolis, Saint Paul, Bloomington, Brooklyn Park,
   Woodbury, Lakeville, Plymouth).

## Known limitations (shown, not smoothed over)

- **7/512 real coverage — intentionally, honestly tiny.** Every other spine city
  returns `null`, not a fabricated estimate. This dataset ships anyway because a real,
  if narrow, answer is worth more than continuing to offer only the modeled score, and
  because the real infrastructure this establishes (a nearest-real-station registry) is
  designed to grow as more real state/county sources are found — the same posture
  `dataset-backlog.md` already takes toward "ship the honest partial version now."
- **Every matched city currently shares the exact same regional number** — one county's
  station, applied uniformly across the whole Twin Cities metro, the same single-point
  limitation `political-lean-methodology.md` already names for its own county-level
  numbers.
- **Not updated since 2020** — Carver County's real feed appears to have stopped after
  the 2020 season; this is a real, dated multi-year average, not a live current reading.
- **"Elevated days," not a daily count or a NAB category** — this measures how many days
  per year crossed an "elevated" threshold, a coarser real signal than Vermont's own
  daily-count-plus-NAB-tier data (see above) would give if a spine city ever comes
  within its range.
- **A genuinely different real source than the modeled severity score** — the two
  numbers can and do disagree for the same city (this measures actual regional pollen
  events; the modeled score estimates typical seasonal severity from climate data). Both
  are shown, deliberately not reconciled into one number.

## Reproducing this dataset

```
python3 scripts/gen_measured_grass_pollen_data.py
```

Requires no API key or account. Caches the raw Carver County table under
`data/raw/measured-grass-pollen-cache/` (gitignored — pure fetch-scratch, safe to
delete and re-fetch any time). Writes `data/measured-grass-pollen.json`.
