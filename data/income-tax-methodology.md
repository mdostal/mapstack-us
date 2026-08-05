# State income tax — methodology

The twenty-second real Mapstack dataset, the last of the three real tax candidates
`dataset-backlog.md` researched, after `sales-tax-methodology.md` (#23). Real, free,
keyless — reuses `sales-tax.ts`'s stdlib-only OOXML reader.

## What this measures

One layer, **State income tax**, 0–100. Raw input is the real state individual income
tax rate that applies at each city's own real median household income — not the top
marginal bracket, which the backlog's own research explicitly warns would overstate
burden for a typical resident (most filers never reach it). Already a meaningful,
bounded percentage, directly rescaled onto 0–100 (capped at 11% — the real observed
max across the spine, California cities' own real 9.3%, sits comfortably under it),
higher rate is more concerning.

## Data source

[Tax Foundation, State Individual Income Tax Rates and Brackets](https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/) —
free `.xlsx` download, no key, no login, current release "as of January 1, 2026,"
confirmed live at build time. The source file ships full marginal bracket schedules
(rate + income threshold) for every state, one state per row-block.

## Method

1. **Bracket parsing** (`scripts/gen_income_tax_data.py`): the raw sheet has real
   parsing quirks — a state's own footnote reference sometimes lands on its first
   bracket row's name cell, sometimes on a later continuation row instead; matched
   against a fixed, verified list of Tax Foundation's own AP-style state abbreviations
   (confirmed by listing every real non-footnote value in the live file) rather than
   guessed.
2. **Applicable-rate lookup**: for each city, income.ts's own already-shipped real
   median household income is walked through that state's real bracket schedule to
   find the rate that actually applies — not the top bracket.
3. **A real bug found and fixed during this build**: Washington's row doesn't carry a
   normal numeric rate at all — it reads "Capital gains income only" (Washington has no
   general wage income tax, only a narrow tax on investment gains above roughly
   $270,000). An early version of this script defaulted to the state's lowest parsed
   bracket rate for any income below the first real threshold, which would have wrongly
   applied 7% to every Washington city despite no city's real median income coming
   remotely close to $270k. Fixed by treating any non-numeric state-row rate (the
   literal string "none," Washington's capital-gains annotation, or any similar future
   case) as 0% at a realistic median income, matching real-world fact — confirmed
   correct by cross-checking the resulting no-income-tax state list (AK, FL, NH, NV,
   SD, TN, TX, WA, WY) against the well-known real list of 9 US states with no general
   income tax.

## Known limitations (shown, not smoothed over)

- **State-level only, not city-level** — every spine city in a state with a
  broad-based income tax gets the identical number, the same "reflects your state, not
  your city" gap `political-lean-methodology.md` and `sales-tax-methodology.md` already
  carry. A real minority of cities (New York City, Philadelphia, and a number of Ohio/
  Pennsylvania municipalities) levy their own local add-on income/wage tax on top of
  the state rate — not captured here; no unified free national dataset of local add-on
  rates was found.
- **512/512 real coverage** — every spine city resolved to a real state bracket
  (including a real, correct 0% for the 9 no-income-tax states).
- **Applies the SINGLE-filer bracket/threshold**, not married-filing-jointly — a
  simplifying choice matching the fact that income.ts's own Census ACS median-income
  figures don't distinguish by filing status either.
- **A snapshot of January 2026 law**, not a historical series — state legislatures
  change brackets/rates most years; this reflects one point in time, the same posture
  every other single-vintage dataset in this project takes.
- **Washington's real capital-gains tax exists but isn't represented** — a genuinely
  different tax (investment gains above ~$270k, not wage income) that no city's real
  median income comes close to triggering; correctly showing 0% for "the rate a typical
  resident pays," not a claim that Washington taxes nothing at all under any
  circumstance.

## Reproducing this dataset

```
python3 scripts/gen_income_tax_data.py
```

Requires `data/income.json` to already exist (built by `gen_income_data.py`). Requires
no API key or account. Caches the raw Tax Foundation `.xlsx` under
`data/raw/income-tax-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time). Writes `data/income-tax.json`.
