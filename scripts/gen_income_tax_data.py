#!/usr/bin/env python3
"""
Builds data/income-tax.json -- the state individual income tax rate that
actually applies at each city's real median household income, from the
Tax Foundation's free "State Individual Income Tax Rates and Brackets"
xlsx (dataset-backlog.md #24). No API key, no login.

State-level only -- the real, honest limit of this candidate. In every
state with a broad-based income tax, every spine city in that state gets
the identical number (the same "reflects your state, not your city" gap
political-lean.ts already carries). Nine states levy no income tax at
all (Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee,
Texas, Washington, Wyoming) and correctly report 0, not a missing value.

Reuses gen_sales_tax_data.py's stdlib-only OOXML reader (zipfile +
xml.etree, no openpyxl/pandas) -- same posture as every other script in
this project.

Method: the source file ships full marginal bracket schedules (rate +
income threshold), one state per row-block, continuation rows for
additional brackets. Rather than reporting the TOP marginal rate (which
overstates burden for a typical resident -- the source itself only a
small share of filers ever reach), this finds the rate that actually
applies at EACH city's real median household income (income.ts's own
already-shipped Census ACS data), the backlog's own explicit
recommendation.

Raw direction / normalization: higher applicable rate is more concerning
-- already a meaningful, bounded percentage (0 to roughly 11% at the
real observed max), directly rescaled onto 0-100, capped at 11% -- same
cap chosen sales-tax.ts's own real-observed-max posture.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_sales_tax_data import read_xlsx_rows  # noqa: E402 -- stdlib-only OOXML reader, no caching coupling

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/income-tax-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
INCOME_TAX_URL = "https://taxfoundation.org/wp-content/uploads/2026/02/2026-State-Individual-Income-Tax-Rates-Brackets.xlsx"
RATE_CAP = 0.11


def fetch_xlsx(url, cache_name):
    cache_path = CACHE_DIR / cache_name
    if not cache_path.exists():
        result = subprocess.run(["curl", "-sL", "--max-time", "60", url], capture_output=True, check=True)
        if len(result.stdout) < 5000:
            print(f"ERROR: {url} fetch looks wrong ({len(result.stdout)} bytes)", file=sys.stderr)
            sys.exit(1)
        cache_path.write_bytes(result.stdout)
    return cache_path

# Tax Foundation's own AP-style state abbreviations, exactly as they
# appear in column 0 of the source sheet -- confirmed by listing every
# real (non-footnote, non-blank) column-0 value in the live file, not
# assumed. Matched against a STRIPPED cell (trailing " (footnote codes)"
# removed, trailing whitespace removed) so "Ariz. (e, f, u, vv)" and
# "Kans. " both resolve correctly.
STATE_ABBREV = {
    "Ala.": "AL", "Alaska": "AK", "Ariz.": "AZ", "Ark.": "AR", "Calif.": "CA",
    "Colo.": "CO", "Conn.": "CT", "Del.": "DE", "Fla.": "FL", "Ga.": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Ill.": "IL", "Ind.": "IN", "Iowa": "IA",
    "Kans.": "KS", "Ky.": "KY", "La.": "LA", "Maine": "ME", "Md.": "MD",
    "Mass.": "MA", "Mich.": "MI", "Minn.": "MN", "Miss.": "MS", "Mo.": "MO",
    "Mont.": "MT", "Nebr.": "NE", "Nev.": "NV", "N.H.": "NH", "N.J.": "NJ",
    "N.M.": "NM", "N.Y.": "NY", "N.C.": "NC", "N.D.": "ND", "Ohio": "OH",
    "Okla.": "OK", "Ore.": "OR", "Pa.": "PA", "R.I.": "RI", "S.C.": "SC",
    "S.D.": "SD", "Tenn.": "TN", "Tex.": "TX", "Utah": "UT", "Vt.": "VT",
    "Va.": "VA", "Wash.": "WA", "W.Va.": "WV", "Wis.": "WI", "Wyo.": "WY",
    "D.C.": "DC",
}


def strip_footnote(cell):
    return re.sub(r"\s*\([a-z0-9, ]+\)\s*$", "", cell, flags=re.IGNORECASE).strip()


def parse_brackets(rows):
    """Returns {state_abbrev: [(threshold, rate), ...]} sorted ascending
    by threshold, using the SINGLE-FILER rate/bracket columns (index 1
    rate, index 3 threshold) -- the more common real-world filing status,
    and the same simplifying choice ACS's own income figures don't
    distinguish by filing status either."""
    brackets = {}
    current_abbrev = None
    for row in rows:
        if not row:
            continue
        cell0 = row[0].strip() if isinstance(row[0], str) else None
        stripped = strip_footnote(cell0) if cell0 else None

        if stripped and stripped in STATE_ABBREV:
            current_abbrev = STATE_ABBREV[stripped]
            brackets[current_abbrev] = []
            rate_cell = row[1] if len(row) > 1 else None
            if isinstance(rate_cell, (int, float)):
                threshold = row[3] if len(row) > 3 and isinstance(row[3], (int, float)) else 0.0
                brackets[current_abbrev].append((threshold, float(rate_cell)))
            else:
                # Not a real numeric general-income rate on this state's own
                # row -- either the literal string "none" (9 states), or a
                # narrow-tax annotation like Washington's "Capital gains
                # income only" (a real tax, but only on investment gains
                # above ~$270k, not a general wage income tax -- no city's
                # real median household income comes close). Real bug found
                # live: this row's own threshold/rate columns for Washington
                # don't follow the normal layout (a stray 0.07-at-$0 entry
                # would otherwise leak in from the continuation rows below),
                # so treat any non-numeric state-row rate as "0% at a
                # realistic median income" and stop absorbing further
                # continuation brackets for this state.
                brackets[current_abbrev].append((0.0, 0.0))
                current_abbrev = None
            continue

        if current_abbrev is None:
            continue

        rate_cell = row[1] if len(row) > 1 else None
        if isinstance(rate_cell, (int, float)):
            threshold = row[3] if len(row) > 3 and isinstance(row[3], (int, float)) else 0.0
            brackets[current_abbrev].append((threshold, float(rate_cell)))

    for abbrev in brackets:
        brackets[abbrev].sort(key=lambda pair: pair[0])
    return brackets


def rate_at_income(state_brackets, income):
    # Starts at 0, not the lowest bracket's rate -- a real bug found live:
    # Washington's tax is capital-gains-only starting at $278,000, so its
    # "lowest" parsed bracket has a nonzero threshold; defaulting to that
    # bracket's rate would wrongly apply 7% to every city's real median
    # income (nowhere near $278k). Only a real income at/above a
    # bracket's threshold picks up that bracket's rate.
    applicable = 0.0
    for threshold, rate in state_brackets:
        if income >= threshold:
            applicable = rate
        else:
            break
    return applicable


def main():
    xlsx_path = fetch_xlsx(INCOME_TAX_URL, "state-income-tax-2026.xlsx")
    rows = read_xlsx_rows(xlsx_path)
    brackets = parse_brackets(rows)
    print(f"Parsed brackets for {len(brackets)} states/DC.", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())
    income_data = json.loads((ROOT / "data/income.json").read_text())

    records = {}
    no_income_data = []
    for city in cities:
        state_brackets = brackets.get(city["state"])
        if state_brackets is None:
            continue

        income_record = income_data.get(city["id"])
        if not income_record or not income_record.get("median_income"):
            no_income_data.append(city["id"])
            continue

        rate = rate_at_income(state_brackets, income_record["median_income"])
        concern = round(min(100.0, (rate / RATE_CAP) * 100.0), 1)
        records[city["id"]] = {
            "applicable_rate_pct": round(rate * 100, 2),
            "at_median_income": income_record["median_income"],
            "concern": concern,
        }

    records["_meta"] = {
        "source": "Tax Foundation, State Individual Income Tax Rates and Brackets, 2026",
        "rate_cap_for_100_concern": RATE_CAP,
        "coverage": len(records),
        "no_income_data_count": len(no_income_data),
    }

    (ROOT / "data/income-tax.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")
    covered = len(records) - 1
    print(f"Wrote data/income-tax.json: {covered}/{len(cities)} covered.", file=sys.stderr)
    if no_income_data:
        print(f"{len(no_income_data)} cities with no median-income data to apply a bracket to: {no_income_data}", file=sys.stderr)

    no_tax_states = sorted(abbr for abbr, b in brackets.items() if b == [(0.0, 0.0)])
    print(f"No-income-tax states/DC found: {no_tax_states}", file=sys.stderr)


if __name__ == "__main__":
    main()
