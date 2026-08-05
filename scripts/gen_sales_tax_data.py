#!/usr/bin/env python3
"""
Builds data/sales-tax.json -- the combined (state + local) sales tax rate
a resident actually pays at checkout, from the Tax Foundation's own free
xlsx downloads -- no API key, no login, matching this project's dataset-
backlog.md (#23) research.

Two real, live-verified source tables, at genuinely different vintages
(named explicitly, not smoothed over -- see data/sales-tax-methodology.md):

1. CITY-LEVEL (the primary tier when available): "State and Local Sales
   Tax Rates in Major Cities" -- covers incorporated places with
   population over 200,000 (~123 real rows after stripping footnotes),
   embedded in a page dated 2024-08-22 but the table's own subtitle
   reads "as of July 1, 2021" -- confirmed by direct download and
   inspection, a real staleness this project's own backlog research
   (based on the article's publish date, not the table's own "as of"
   date) didn't catch. Still the best real per-city number available.
   https://taxfoundation.org/wp-content/uploads/2024/08/Sales_Tax_Rates_in_Major_Cities_2024_Table_READY_FOR_POSTING.xlsx

2. STATE-LEVEL (fallback for every city not in tier 1): "State & Local
   Sales Tax Rates as of January 1, 2026" -- genuinely current,
   confirmed live, a population-weighted average local rate per state.
   https://taxfoundation.org/wp-content/uploads/2026/01/2026-Sales-Tax-Data.xlsx

Parses raw OOXML (zipfile + xml.etree, both stdlib) rather than adding a
new third-party dependency (openpyxl/pandas) -- every existing script in
this project uses only the Python standard library, and there's no
requirements.txt to declare a new one.

Raw direction / normalization: higher combined rate is more concerning --
already a meaningful, externally bounded quantity (a real percentage),
directly rescaled onto 0-100 (concern = min(100, rate / 0.11 * 100)) --
the observed real max (Seattle, 10.35%) sits comfortably under the
11%-cap denominator, same posture as heat.ts's data-informed cap.
"""
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/sales-tax-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

CITY_URL = "https://taxfoundation.org/wp-content/uploads/2024/08/Sales_Tax_Rates_in_Major_Cities_2024_Table_READY_FOR_POSTING.xlsx"
STATE_URL = "https://taxfoundation.org/wp-content/uploads/2026/01/2026-Sales-Tax-Data.xlsx"

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
RATE_CAP = 0.11

STATE_ABBREV = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
    "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
    "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
    "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO",
    "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH",
    "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
    "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
    "district of columbia": "DC",
}


def fetch_xlsx(url, cache_name):
    cache_path = CACHE_DIR / cache_name
    if not cache_path.exists():
        result = subprocess.run(["curl", "-sL", "--max-time", "60", url], capture_output=True, check=True)
        if len(result.stdout) < 5000:
            print(f"ERROR: {url} fetch looks wrong ({len(result.stdout)} bytes)", file=sys.stderr)
            sys.exit(1)
        cache_path.write_bytes(result.stdout)
    return cache_path


def read_xlsx_rows(path):
    """Minimal stdlib-only .xlsx reader: returns sheet1 as a list of rows,
    each row a list of cell values (str for text, float for numbers, None
    for blank), resolving shared strings. Good enough for a simple, flat
    single-sheet data table -- not a general xlsx parser."""
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall(f"{NS}si"):
                text = "".join(t.text or "" for t in si.findall(f".//{NS}t"))
                shared.append(text)

        sheet_root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row_el in sheet_root.findall(f".//{NS}sheetData/{NS}row"):
            cells_by_col = {}
            max_col_idx = -1
            for c in row_el.findall(f"{NS}c"):
                ref = c.get("r", "")
                col_letters = re.match(r"[A-Z]+", ref).group(0) if ref else ""
                col_idx = 0
                for ch in col_letters:
                    col_idx = col_idx * 26 + (ord(ch) - ord("A") + 1)
                col_idx -= 1
                max_col_idx = max(max_col_idx, col_idx)

                cell_type = c.get("t")
                v_el = c.find(f"{NS}v")
                if v_el is None or v_el.text is None:
                    value = None
                elif cell_type == "s":
                    value = shared[int(v_el.text)]
                elif cell_type == "str":
                    value = v_el.text
                else:
                    value = float(v_el.text)
                cells_by_col[col_idx] = value
            rows.append([cells_by_col.get(i) for i in range(max_col_idx + 1)])
        return rows


def normalize_city_name(name):
    name = re.sub(r"\s*\([a-z]\)\s*$", "", name.strip(), flags=re.IGNORECASE)
    name = name.replace("St.", "Saint").replace("st.", "saint")
    name = re.sub(r"[^a-z0-9 ]", "", name.lower())
    return re.sub(r"\s+", " ", name).strip()


def parse_city_table(rows):
    """Returns {(normalized_city_name, state_abbrev): combined_rate}."""
    result = {}
    for row in rows:
        if not row or not isinstance(row[0], str) or "," not in row[0]:
            continue
        city_state, state_rate, local_rate, total, rank = (row + [None] * 5)[:5]
        if not isinstance(total, (int, float)):
            continue
        city_part, _, state_part = city_state.rpartition(",")
        state_part_clean = re.sub(r"\s*\([a-z]\)\s*$", "", state_part.strip(), flags=re.IGNORECASE).lower()
        abbrev = STATE_ABBREV.get(state_part_clean)
        if not abbrev:
            continue
        key = (normalize_city_name(city_part), abbrev)
        result[key] = round(total, 5)
    return result


def parse_state_table(rows):
    """Returns {state_abbrev: combined_rate}."""
    result = {}
    for row in rows:
        if not row or not isinstance(row[0], str):
            continue
        state_name = re.sub(r"\s*\([a-z]\)\s*$", "", row[0].strip(), flags=re.IGNORECASE).lower()
        abbrev = STATE_ABBREV.get(state_name)
        if not abbrev or len(row) < 6 or not isinstance(row[5], (int, float)):
            continue
        result[abbrev] = round(row[5], 5)
    return result


def main():
    city_path = fetch_xlsx(CITY_URL, "city-sales-tax-2021.xlsx")
    state_path = fetch_xlsx(STATE_URL, "state-sales-tax-2026-01.xlsx")

    city_rates = parse_city_table(read_xlsx_rows(city_path))
    state_rates = parse_state_table(read_xlsx_rows(state_path))
    print(f"Parsed {len(city_rates)} city-level rows, {len(state_rates)} state-level rows.", file=sys.stderr)

    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    city_tier_count = 0
    state_tier_count = 0
    for city in cities:
        key = (normalize_city_name(city["city"]), city["state"])
        if key in city_rates:
            rate = city_rates[key]
            tier = "city"
            city_tier_count += 1
        elif city["state"] in state_rates:
            rate = state_rates[city["state"]]
            tier = "state"
            state_tier_count += 1
        else:
            continue

        concern = round(min(100.0, (rate / RATE_CAP) * 100.0), 1)
        records[city["id"]] = {
            "combined_rate_pct": round(rate * 100, 2),
            "tier": tier,
            "concern": concern,
        }

    records["_meta"] = {
        "city_tier_source": "Tax Foundation, State and Local Sales Tax Rates in Major Cities, as of July 1 2021",
        "state_tier_source": "Tax Foundation, State & Local Sales Tax Rates, as of January 1 2026",
        "rate_cap_for_100_concern": RATE_CAP,
        "coverage": len(records),
    }

    (ROOT / "data/sales-tax.json").write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")

    missing = [c["id"] for c in cities if c["id"] not in records]
    covered = len(records) - 1  # exclude _meta
    print(f"Wrote data/sales-tax.json: {covered}/{len(cities)} covered ({city_tier_count} city-tier, {state_tier_count} state-tier fallback).", file=sys.stderr)
    if missing:
        print(f"{len(missing)} cities with no match at all: {missing}", file=sys.stderr)


if __name__ == "__main__":
    main()
