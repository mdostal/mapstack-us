# Design Discussion: electricity-cost (42nd real dataset)

## §0 Prelude — solo-operator run posture

Lean `/plan --fast --skip-sign-off` run, consumer repo, no team review gate.

## Goal

Add a 42nd real dataset: state-level residential electricity retail price
(¢/kWh), via the real EIA (Energy Information Administration) API v2, now
unlocked by a real `EIA_API_KEY` the user obtained this session.

## Proposed approach

- **Source**: `api.eia.gov/v2/electricity/retail-sales/data/`, real, one request
  for all 51 states+DC (`sectorid=RES`, most recent year).
- **Join**: direct state-abbreviation match against `data/cities.json`'s
  existing `state` field — no crosswalk, same shape as `income-tax.ts`.
- **Metric**: real 2025 residential price, direct rescale, cap at 41 (real
  observed max 40.59, Hawaii), higher = more concerning.

## Risks / open questions

- **State-level only**, the same honest limitation `income-tax.ts`/
  `sales-tax.ts`/`property-tax.ts` already carry — every city in a state gets
  the identical number. Disclosed, not hidden.
- **`--globoff` requirement**: EIA's bracket-style query params
  (`facets[stateid][]=NY`) trip a real `curl` URL-globbing bug without
  `--globoff` — documented in the build script so this doesn't get
  re-discovered as a false "API doesn't work" signal later.
- **Scale**: Small. Single API call, direct join, no radius/crosswalk
  complexity. No H/V planning needed.

## Scale assessment

**Small.** Proceeding directly to a single story.
