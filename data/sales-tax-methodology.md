# Sales tax — methodology

The twentieth real Mapstack dataset, picked from the project's own `dataset-backlog.md`
(#23, "Combined sales tax rate") as the second keyless candidate this session shipped
alongside `heat-methodology.md`, while the Census-cluster roadmap (population, property
tax) stays blocked on a missing `CENSUS_API_KEY`.

## What this measures

One layer, **Combined sales tax rate**, 0–100. Raw input is the real combined state +
local sales tax rate a resident actually pays at checkout — already a meaningful,
externally bounded percentage, so directly rescaled onto 0–100 rather than a percentile
rank among just the 512 spine cities — higher rate is more concerning.

## Data sources — two real tiers, at genuinely different vintages

Both are free Excel downloads from the [Tax Foundation](https://taxfoundation.org/), no
key, no login, both confirmed live by direct fetch during this build.

1. **City tier (primary, used when available)**: "State and Local Sales Tax Rates in
   Major Cities" — covers the ~123 incorporated places with population over 200,000 that
   have their own reported number. **Important, and not smoothed over**: the page this
   table is embedded in is dated 2024-08-22, but the table's own subtitle reads "as of
   July 1, 2021" — confirmed by direct download and inspection, not assumed. This
   project's own `dataset-backlog.md` research (based on the article's publish date, not
   the table's own internal "as of" date) described this as "the 2024 edition, the most
   recent found" — a real research gap this build's own verification caught. No newer
   city-level table exists on Tax Foundation's site as of this build (both `-2025-` and
   `-2026-` URL variants of the same article path 404). It's still the best real
   per-city number available, just genuinely ~4.5 years stale.
2. **State tier (fallback for every city not in tier 1)**: "State & Local Sales Tax
   Rates" — genuinely current, "as of January 1, 2026," a population-weighted average
   local rate per state, confirmed live.

## Method

1. **Parsing** (`scripts/gen_sales_tax_data.py`): both source files are `.xlsx`. Every
   existing script in this project uses only the Python standard library (no
   `requirements.txt` exists to declare a new dependency), so this reads the raw OOXML
   directly via `zipfile` + `xml.etree.ElementTree` rather than adding `openpyxl`/
   `pandas`.
2. **City-name matching**: the city-tier table's city names ("Seattle, Washington",
   "Long Beach, California (a)") are normalized (footnote markers stripped, "St." ↔
   "Saint" reconciled — this project's own `cities.json` isn't even internally
   consistent here, using "Saint Paul" but "St. Louis") and matched against each spine
   city's `city`/`state` fields.
3. **Fallback**: any spine city without its own city-tier row (the overwhelming
   majority — cities under 200k population, plus any city-tier row that didn't clear
   the name-matching bar) uses its state's January 2026 combined average rate instead,
   explicitly flagged as a state-level (not city-level) number in the detail string.
4. **Rescale**: `concern = min(100, rate / 0.11 × 100)` — the 11% cap comes from the
   real observed spine distribution (Seattle, the highest real rate found, sits at
   10.35%), the same data-informed-cap posture `heat-methodology.md` uses for its own
   150-day cap.

## Known limitations (shown, not smoothed over)

- **A ~4.5-year vintage gap between the two tiers** — city-tier numbers reflect July
  2021 rates; state-tier numbers reflect January 2026. A city that changed its local
  rate since 2021 (many have) will show a stale number under the city tier rather than
  the fresher state-level average, a real, non-obvious tradeoff worth naming
  prominently — this is the single most important caveat this dataset carries.
- **123/512 cities get a real city-specific number; the remaining 389 inherit their
  state's average** — every city in a state without its own city-tier row gets the
  identical rate as every other same-state spine city, the same "this reflects your
  state, not your city" gap `political-lean-methodology.md` already names for a
  different dataset.
- **512/512 real coverage** — no city was left unmatched; every spine city has either a
  real city-specific or real state-average combined rate.
- **A real, correct 0%** for cities/states with no sales tax at all (Oregon, Montana,
  New Hampshire, Delaware, Alaska's state rate) — not a data gap, a genuine feature of
  those states' tax codes.
- **Doesn't capture exemptions** — many states exempt groceries, medicine, or other
  categories from sales tax entirely; the headline combined rate is a real but imperfect
  proxy for actual household sales-tax burden, the same caveat `dataset-backlog.md`'s
  own research already named for this candidate.

## Reproducing this dataset

```
python3 scripts/gen_sales_tax_data.py
```

Requires no API key or account. Caches both raw `.xlsx` downloads under
`data/raw/sales-tax-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time). Writes `data/sales-tax.json`.
