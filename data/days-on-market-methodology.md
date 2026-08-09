# Housing market speed — methodology

The tenth real Mapstack dataset, and a near-free follow-on to `housing-inventory-methodology.md`:
same Zillow Research portal, same direct city/state name join, same name-normalization
quirks — this is one more column from the same fetch/join shape, not a new pipeline.

## What this measures

One layer, **Market speed**, 0–100. Raw input is Zillow's own "Mean Days to Pending" —
the average number of days a for-sale listing sits active before going under contract, at
a given real year (December's real reading, or the latest real reading within that year
where December itself is a real reporting-lag gap).

Real multi-year history — **2018–2026** (`supportsTime: true`), per explicit operator
direction to get "as much data as possible" for real trends over time.

## A real, deliberate framing choice — not an objective fact

Unlike housing-inventory's unambiguous "lower supply = more concerning" direction, there is
**no single obvious "more concerning" pole** for market speed. This dataset frames it as:
**fewer days to pending (a faster market) = higher concern**, on the reasoning that a fast
market reads as "hard to compete for a home here" from a prospective mover's perspective —
pairing conceptually with `housing-inventory-methodology.md` as a shared "market tightness"
pair (both invert toward "fast/tight = more concerning").

This is a **deliberate editorial choice, not a neutral fact the data supplies on its own**.
A fast market is *also* a legitimate positive signal — a place everyone wants to live, not
a distressed one. Anyone using this layer should read "high score" as "homes here sell
fast" and draw their own conclusion about whether that's good or bad for their purposes,
the same both-directions caveat this project already names for housing-inventory and
for population-growth-style metrics generally.

## Data source

[Zillow Research Data](https://www.zillow.com/research/data/), "Mean Days to Pending"
(City, single-family + condo, smoothed, monthly) — free, direct CSV, no API key, login, or
account. Fetched from
`files.zillowstatic.com/research/public_csvs/mean_doz_pending/City_mean_doz_pending_uc_sfrcondo_sm_month.csv`.

## Method

Same direct name join as housing-inventory, including the same "Saint" vs "St." and
apostrophe-handling quirks and the same `O'Fallon` → `O Fallon` named override (see
`scripts/gen_days_on_market_data.py`). Percentile rank (inverted, per the framing above) is
computed independently PER YEAR at generation time, matching crime's own
precomputed-`concern` convention.

**Real multi-year extension** (this session): the same Zillow CSV already fetched for the
original single-snapshot build turns out to be a full monthly time series back to
2018-03 — confirmed live, no new source or fetch needed, using the same per-year
December-or-latest-available-month approach as `housing-inventory-methodology.md`'s own
extension.

## Known limitations (shown, not smoothed over)

- **The direction is a real framing choice**, stated above — not hidden in ordinary
  caveat language, since this is a materially different kind of limitation than a data gap.
- **488/512 real coverage in the latest year (2026), growing from a real 349/512 in 2018**
  — a real, honest reflection of Zillow adding market coverage over time, not a bug (see
  each year's own count in `data/days-on-market.json`'s per-year data). Zillow needs an
  actual flow of pending sales, not just active listings, to compute this — a real, higher
  bar than housing-inventory's listing-count threshold, so smaller/newer markets take
  longer to qualify.
- **Zillow reports a MEAN, not a median** — more sensitive to a handful of stale outlier
  listings dragging the average up than a median would be, the same kind of caveat
  housing-inventory's own ZHVI-adjacent sourcing already carries.

## Reproducing this dataset

```
python3 scripts/gen_days_on_market_data.py
```

Writes `data/days-on-market.json` with every real year 2018-2026. Caches the raw Zillow CSV
under `data/raw/days-on-market-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time).
