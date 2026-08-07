# Design discussion — data-drive-round-9

## 0. Prelude

Same solo-operator process-fidelity note as the eight prior epics this session.

## 1. Goal

A ninth data-drive research round. Ships FCC broadband speed availability --
real, county-level, genuinely distinct from `broadband.ts`'s Census ACS
subscription-rate dataset (availability vs. adoption).

## 2. Proposed approach

`scripts/gen_broadband_speed_data.py` reads the real FCC National Broadband Map
county-level CSV (already downloaded this round; cached in
`data/raw/broadband-speed-cache/`), filters to `geography_type=County`,
`biz_res=R` (residential), `technology=Any Technology`, dedupes (confirmed
live: 4 identical duplicate rows per county, safe to take the first), and uses
`speed_100_20` (% of locations with real access to the FCC's current official
100/20 Mbps broadband standard). Direct rescale (already a real 0-1
percentage), inverted -- LOWER availability = MORE concerning (a digital-divide
framing), joined to the spine via the existing `city-county-fips.json`
crosswalk.

## 3. Risks

- **Risk**: the source file's download URL isn't a stable, guessable static
  path (unlike every other bulk file this session) -- it requires the FCC
  map site's own versioned filing/file-ID discovery.
  **Mitigation**: the real file is already downloaded and cached in the
  repo's raw-data cache (same posture as every other dataset); the
  methodology doc discloses this explicitly as a real reproducibility caveat
  with manual-refresh instructions, rather than silently presenting it as a
  simple curl-able URL like the rest.

## 4. Scale assessment

**Small** (one dataset, reuses the existing county crosswalk entirely).
SCALE DECISION: Small → proceeding directly to stories.
--skip-sign-off honored: presenting as a summary, auto-advancing.
