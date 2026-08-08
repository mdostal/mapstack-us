# Research Brief: data-drive-round-13 (electricity-cost, the 42nd real dataset)

## §0 Prelude — solo-operator run posture

Lean `/plan --fast --skip-sign-off` run, consumer repo (no vendored `hive/` lib,
`planning.collaborative_review: false`). Authored directly by the orchestrator.

## Context

The user obtained three new real API keys this session (NASS, EIA, HUD) and
asked to keep shipping with them. All three are now also stored in GCP Secret
Manager (project `personalsites-487021`) as the source of truth, with
`scripts/load-secrets-from-gcp.sh` refreshing the local gitignored `.env`.

## Candidate selected: EIA residential electricity retail price

Live-verified via direct `curl --globoff` against `api.eia.gov/v2/electricity/retail-sales/data/`
with the real `EIA_API_KEY`. (Note: an earlier session probe with `DEMO_KEY`
appeared to return an empty response and was wrongly recorded as inconclusive —
the real cause was a `curl` URL-globbing bug with the `[0]`/`[]` bracket query
params, fixed with `--globoff`. Worth correcting for the record.)

Real 2025 residential price (`sectorid=RES`) across all 51 states+DC: Hawaii
highest at 40.59¢/kWh, North Dakota lowest at 11.81¢/kWh — real, plausible
variation matching well-known regional electricity cost patterns.

## Method

State-level only, like `income-tax.ts`/`sales-tax.ts`/`property-tax.ts` — every
spine city in a state gets that state's real residential price, joined directly
against `data/cities.json`'s own existing `state` field (2-letter abbreviation),
no crosswalk needed. A single API request returns all 51 states+DC at once.

## Metric framing

Higher price is more concerning (cost of living), direct rescale, cap near the
real observed max (40.59, Hawaii) — same "cap at real observed max" convention
already used by `sales-tax.ts`/`income-tax.ts`.
