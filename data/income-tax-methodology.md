# State income tax — methodology

The twenty-second real Mapstack dataset, the last of the three real tax candidates
`dataset-backlog.md` researched, after `sales-tax-methodology.md` (#23). Real, free,
keyless — reuses `sales-tax.ts`'s stdlib-only OOXML reader.

## What this measures

One layer, **State income tax**, 0–100. Raw input is the real state individual income
tax rate that applies at each city's own real median household income for a given real
year — not the top marginal bracket, which the backlog's own research explicitly warns
would overstate burden for a typical resident (most filers never reach it). Already a
meaningful, bounded percentage, directly rescaled onto 0–100 (capped at 11%, a FIXED cap
applied identically across every year so a city's rate stays honestly comparable year to
year — the real observed max across the spine sits comfortably under it), higher rate is
more concerning.

Real multi-year history — **2015–2023** (`supportsTime: true`), per explicit operator
direction to get "as much data as possible" for real trends over time.

## Data source

[Tax Foundation, State Individual Income Tax Rates and Brackets](https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/) —
free `.xlsx` download, no key, no login. The current (2026) release turns out to be a
real, single consolidated workbook with **one sheet per year, 2015 through 2026** (12
real years) — confirmed live by listing the workbook's own sheet names. The source file
ships full marginal bracket schedules (rate + income threshold) for every state, one
state per row-block, repeated per year's sheet.

## Method — a real architecture change for the extension

1. **Sheet-aware OOXML reader**: `sales-tax.ts`'s existing stdlib-only `.xlsx` parser
   (`read_xlsx_rows` in `gen_sales_tax_data.py`) originally always read the workbook's
   first declared sheet. Extended this session to resolve a NAMED sheet (e.g. `"2018"`)
   via the proper `workbook.xml` → `r:id` → `workbook.xml.rels` indirection, rather than
   assuming a sheet's declared position matches its internal `sheetN.xml` file number
   (confirmed live this particular workbook's numbering happens to line up, but that's
   not guaranteed by the OOXML format in general, so it's resolved properly rather than
   hardcoded).
2. **Bracket parsing** (`scripts/gen_income_tax_data.py`), per real year's sheet: the raw
   sheet has real parsing quirks — a state's own footnote reference sometimes lands on
   its first bracket row's name cell, sometimes on a later continuation row instead;
   matched against a fixed, verified list of Tax Foundation's own AP-style state
   abbreviations (confirmed by listing every real non-footnote value in the live file)
   rather than guessed.
3. **Real usable range**: this dataset's own real years are capped to the OVERLAP with
   `income.ts`'s own real median-income years (2009-2023) — **2015-2023** — since each
   year's tax bracket is matched against that SAME real year's real median household
   income, not always the latest of either series. The workbook's own 2024-2026 sheets
   exist but aren't used here, since `income.ts` doesn't yet have real median-income data
   for those years to pair them with.
4. **Applicable-rate lookup, per real year**: for each city and each real overlapping
   year, that year's real median household income is walked through that SAME year's
   real bracket schedule to find the rate that actually applies — not the top bracket.
5. **A real bug found and fixed during the original single-year build** (still applies
   per-year here): Washington's row doesn't carry a normal numeric rate at all — it reads
   "Capital gains income only" (Washington has no general wage income tax, only a narrow
   tax on investment gains above roughly $270,000). Treating any non-numeric state-row
   rate (the literal string "none," Washington's capital-gains annotation, or any similar
   case) as 0% at a realistic median income matches real-world fact — confirmed correct
   by cross-checking the resulting no-income-tax state list (AK, FL, NH, NV, SD, TN, TX,
   WA, WY) against the well-known real list of 9 US states with no general income tax.

## Known limitations (shown, not smoothed over)

- **State-level only, not city-level** — every spine city in a state with a
  broad-based income tax gets the identical number, the same "reflects your state, not
  your city" gap `political-lean-methodology.md` and `sales-tax-methodology.md` already
  carry. A real minority of cities (New York City, Philadelphia, and a number of Ohio/
  Pennsylvania municipalities) levy their own local add-on income/wage tax on top of
  the state rate — not captured here; no unified free national dataset of local add-on
  rates was found.
- **508/512 real coverage** (any year) — see `data/income-tax.json`'s own `_meta.coverage`.
  A handful of cities lack a real median-income figure for a given overlapping year
  (income.ts's own real, disclosed coverage gaps), so that city/year is honestly skipped
  rather than backfilled.
- **Applies the SINGLE-filer bracket/threshold**, not married-filing-jointly — a
  simplifying choice matching the fact that income.ts's own Census ACS median-income
  figures don't distinguish by filing status either.
- **2024-2026 are real, published tax-bracket years not shipped here** — this dataset's
  range is bounded by `income.ts`'s own real median-income coverage (through 2023), not
  by any gap in the tax-bracket source itself, which is current through 2026.
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
re-fetch any time). Writes `data/income-tax.json` with every real overlapping year
2015-2023.
