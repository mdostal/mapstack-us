# Gigabit availability — methodology

The thirty-eighth real Mapstack dataset (ddr9-1, `data-drive-round-9` epic).
505/512 real coverage.

## What this measures

One layer, **Gigabit availability**, 0–100. Raw input is the real percentage of
locations in each city's county with access to gigabit (1000 Mbps down / 100
Mbps up) fixed broadband service, from the FCC's own National Broadband Map.
Already a real percentage, percentile-ranked and **inverted** among covered
cities — lower availability is more concerning (a digital-divide framing).

This is genuinely distinct from the already-shipped `broadband.ts` (Census ACS
broadband **subscription rate** — do households actually pay for service).
This measures **availability** — can a location get gigabit service at all,
regardless of whether anyone there subscribes to it.

## Data source

[FCC National Broadband Map](https://broadbandmap.fcc.gov/), the "Fixed
Broadband Summary by Geography Type" county-level file.

## Method — a real detour and a real metric-choice reversal, both worth documenting

**Access is not a simple, stable URL.** Unlike every other bulk-file dataset
this session, the FCC map site's real download endpoint
(`broadbandmap.fcc.gov/nbm/map/api/getNBMDataDownloadFile/{fileId}/{n}`)
requires first resolving the *current* filing ID and file ID through the
site's own config/filing APIs — these change with every FCC data release, so
there's no stable, guessable static path the way NOAA/IMLS/TRI/USGS have. The
real file was downloaded once via the site's own UI (a real browser session)
during this dataset's research and is cached in this repo; regenerating this
dataset from scratch after that cache is cleared requires a real, manual
re-download (see "Reproducing" below) — disclosed explicitly rather than
presented as a simple `curl`-able source like the rest.

**The metric itself changed mid-build, based on real data.** The FCC's own
official "broadband" standard is 100 Mbps down / 20 Mbps up — checked live
first, since that's the government's own definition. But across every city in
this 512-city spine, that standard is already **>99.6% available everywhere**
(median 100.0%, p1 through p99 all exactly 100.0%) — real, but useless as a
map layer with zero differentiation. This makes real sense: this spine is the
512 *largest incorporated* US cities, and standard broadband has become
essentially universal at that population scale (the real remaining gaps are
concentrated in truly rural, unincorporated areas outside this spine's
cutoff). Checked the gigabit (1000/100 Mbps) tier instead — a real, still
unequal infrastructure tier even among large cities (real observed range:
1.8%–99.6%, median 74.4%) — and used that instead.

Joins to the spine via the existing `city-county-fips.json` crosswalk — the
source file's own `geography_id` field for `geography_type=County` rows is
already the real 5-digit county FIPS.

## Known limitations (shown, not smoothed over)

- **505/512 real coverage** — the same real Connecticut county/planning-region
  vintage mismatch several other county-joined datasets this session already
  disclose (Connecticut replaced its legacy counties with new Census planning
  regions in 2022; this repo's crosswalk uses the new codes, this FCC data
  vintage uses the old ones).
- **County-level, not neighborhood-level** — real intra-county variation in
  gigabit access (a well-served downtown core vs. an underserved outer
  neighborhood) is real and can be large, not captured here.
- **A snapshot, not a trend** — `supportsTime: false`; ISP buildout changes
  over time, this reflects one real data release.

## Reproducing this dataset

```
python3 scripts/gen_broadband_speed_data.py
```

Requires a real cached copy of the FCC's "Fixed Broadband Summary by Geography
Type - Other Geographies" file under `data/raw/broadband-speed-cache/`
(gitignored — pure fetch-scratch). Unlike other datasets, there is **no stable
URL** to auto-fetch this from — download it manually from
[broadbandmap.fcc.gov/data-download/nationwide-data](https://broadbandmap.fcc.gov/data-download/nationwide-data)
(the "Fixed Broadband Summary by Geography Type" row, "Other Geographies"
column) and place the extracted CSV in that directory before running the
script. Writes `data/broadband-speed.json`.
