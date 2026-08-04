# Broadband access — methodology

The sixteenth real Mapstack dataset, and the first real progress on the "Census-cluster"
roadmap item (population, income, broadband, tax, housing) that sat blocked all session on
a missing `CENSUS_API_KEY` — joined at **county** level, reusing the same city→county
crosswalk `hazard-methodology.md`'s build already produced.

## What this measures

One layer, **Broadband access**, 0–100. Raw input is the real percentage of households
with a broadband internet subscription of any type (cable, DSL, fiber-optic, cellular, or
satellite) — already a meaningful 0–100 quantity, directly rescaled
(`concern = 100 − pct_broadband`), lower access is more concerning.

## Data source

[County Health Rankings & Roadmaps](https://www.countyhealthrankings.org/), 2025 Annual
Data Release, "Broadband Access" measure (`v166`) — free direct CSV download, no key, no
login. CHR's own underlying source is the **Census Bureau's American Community Survey
(ACS) 5-year estimates** — the exact same broadband-subscription question the blocked
Census-cluster roadmap item was designed around, delivered here through CHR's own
free republication instead of a direct Census API call.

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
2. **Rate join** (`scripts/gen_broadband_data.py`): CHR's national CSV is parsed for the
   `v166_rawvalue` column (a 0–1 fraction, converted to a percentage), joined to each
   city's county FIPS. A state-level fallback (which CHR also ships) exists in the script
   for any county CHR suppresses, though it was not needed for any of the 512 spine cities
   in this build.

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
- **Every one of the 512 spine cities had a real, non-suppressed county value** — genuinely
  full coverage, the best of any dataset this project ships. The state-level fallback path
  exists in the script (for consistency with `traffic-fatalities-methodology.md`'s same
  pattern) but was not exercised by this build.
- **Doesn't distinguish availability from adoption** — a household without a subscription
  might have broadband available but unaffordable, or might have no service offered at
  all; this measure counts only actual subscriptions, not infrastructure presence.

## Reproducing this dataset

```
python3 scripts/gen_broadband_data.py
```

Requires `data/raw/city-county-fips.json` to already exist (built by
`geocode_city_counties.py` for the hazard dataset). Writes `data/broadband.json`. Caches
the raw CHR national CSV under `data/raw/broadband-cache/` (gitignored — pure
fetch-scratch, safe to delete and re-fetch any time).
