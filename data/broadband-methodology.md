# Broadband access — methodology

The sixteenth real Mapstack dataset, and the first real progress on the "Census-cluster"
roadmap item (population, income, broadband, tax, housing) that sat blocked all session on
a missing `CENSUS_API_KEY` — joined at **county** level, reusing the same city→county
crosswalk `hazard-methodology.md`'s build already produced.

## What this measures

One layer, **Broadband access**, 0–100. Raw input is the real percentage of households
with a broadband internet subscription of any type (cable, DSL, fiber-optic, cellular, or
satellite) at a given real year — already a meaningful 0–100 quantity, directly rescaled
(`concern = 100 − pct_broadband`), lower access is more concerning.

Real multi-year history — **2021–2025** (`supportsTime: true`), per explicit operator
direction to get "as much data as possible" for real trends over time.

## Data source

[County Health Rankings & Roadmaps](https://www.countyhealthrankings.org/), real annual
releases 2021–2025, "Broadband Access" measure (`v166`) — free direct CSV download, no
key, no login. CHR's own underlying source is the **Census Bureau's American Community
Survey (ACS) 5-year estimates** — the exact same broadband-subscription question the
blocked Census-cluster roadmap item was designed around, delivered here through CHR's own
free republication instead of a direct Census API call.

**Real floor for this dataset**: 2021. CHR has published a real annual release back to
2010, but confirmed live by checking every year's own real column headers directly, the
Broadband Access measure itself doesn't exist in CHR's 2010, 2013, 2016, 2018, or 2020
releases — 2021 is the real first year it appears, and its internal variable code
(`v166`) stays stable in every release from 2021 through 2025.

**Why CHR and not the Census API directly**: this project's Census-cluster datasets
(population, income, broadband, tax, housing at full ~19,500-place resolution) have sat
blocked all session on a missing, self-serve `CENSUS_API_KEY` the project cannot generate
on its own. CHR happens to already re-publish this specific ACS question as part of its
own free national CSV — the same file `traffic-fatalities-methodology.md`'s build already
uses for a different measure — so this one Census-cluster item became unblocked without
needing the key at all. This does NOT unblock the rest of the Census-cluster roadmap
(population, income, tax, and full ~19,500-place resolution genuinely still need direct
Census API access); it's a real, if partial, win found by re-reading CHR's own full
measure list rather than a general workaround.

## Method

1. **County crosswalk**: each spine city's county FIPS is read directly from
   `data/raw/city-county-fips.json`, already built by `geocode_city_counties.py` for the
   hazard dataset — no new network calls.
2. **Rate join, per real year** (`scripts/gen_broadband_data.py`): each real year's CHR
   national CSV is parsed for the `v166_rawvalue` column (a 0–1 fraction, converted to a
   percentage), joined to each city's county FIPS. A state-level fallback (which CHR also
   ships) exists in the script for any county CHR suppresses or can't resolve for that
   year.

## Known limitations (shown, not smoothed over)

- **County-level, not city-level** — every spine city inherits its whole county's ACS
  5-year estimate, the same "one number, blurred geography" caveat every county-level
  dataset in this project carries.
- **"Any type" of broadband, not a speed threshold** — a household counted here might
  have a subscription too slow to meet modern needs (video calls, remote work, streaming);
  CHR's own methodology explicitly names this limitation, not smoothed over here either.
- **A 5-year rolling ACS estimate, not an annual snapshot** — the same real trade-off CHR
  makes for small-geography reliability that `traffic-fatalities-methodology.md` already
  documents for its own measure.
- **512/512 real coverage in every real year** — genuinely full coverage, the best of any
  dataset this project ships, though not every city resolves via the county tier every
  year: **7 real Connecticut spine cities** (Bridgeport, Danbury, Hartford, New Haven,
  Norwalk, Stamford, Waterbury) fall back to the state-level rate in some real years —
  confirmed live, this lines up with Connecticut's real 2022 transition from traditional
  counties to planning regions, which appears to have disrupted county-FIPS matching for
  CT specifically in CHR's own data for some releases. A real, disclosed administrative
  quirk, not a bug in this dataset's own join logic.
- **Doesn't distinguish availability from adoption** — a household without a subscription
  might have broadband available but unaffordable, or might have no service offered at
  all; this measure counts only actual subscriptions, not infrastructure presence.

## Reproducing this dataset

```
python3 scripts/gen_broadband_data.py
```

Requires `data/raw/city-county-fips.json` to already exist (built by
`geocode_city_counties.py` for the hazard dataset). Writes `data/broadband.json` with
every real year 2021-2025. Caches each real year's raw CHR national CSV under
`data/raw/broadband-cache/` (gitignored — pure fetch-scratch, safe to delete and re-fetch
any time).
