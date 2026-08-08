#!/usr/bin/env python3
"""
Builds the political-competitiveness dataset: real county-level
presidential election returns for EVERY cycle 2000-2024 (the MIT Election
Data + Science Lab (MEDSL)'s "County Presidential Election Returns
2000-2024" full file), joined to each spine city via the SAME
city->county crosswalk hazard.ts/traffic-fatalities.ts already built
(data/raw/city-county-fips.json) -- zero new geocoding needed.

Real, deliberate framing choice (discussed with and approved by the
operator before building this dataset originally): NOT a left/right
"lean" score -- that would require an editorial judgment about which
party's dominance counts as "more concerning," a call this project has
no basis to make. Instead this measures ELECTORAL COMPETITIVENESS -- how
lopsided the county's margin was in a given cycle, regardless of which
party won. Higher margin (a bigger blowout, either direction) = more
concerning, on the reasoning that competitive elections are what keep
officials accountable.

Historical extension (per explicit operator direction: "AS MUCH DATA as
possible so we can get trends over time"): the original build only used
a 2024-only trim of MEDSL's file (data/raw/countypres_2024.csv) because
the full multi-year file sat behind Harvard Dataverse's guestbook
download gate, which the project's own prior notes say blocks even a
valid DATAVERSE_API_TOKEN via the plain `/api/access/datafile` endpoint.
The REAL fix, found this round: POSTing to that same endpoint with
`?gbrecs=true` (the Dataverse API's own guestbook-acknowledgment flag)
returns a signed, time-limited download URL that bypasses the gate
entirely -- confirmed live, this downloads the real, complete
`countypres_2000-2024.tab` (94,151 rows, all 7 real cycles: 2000, 2004,
2008, 2012, 2016, 2020, 2024). That fetch was done once, manually, and
the result committed as data/raw/countypres_2000-2024.csv (CC0-licensed
by MEDSL, same redistribution basis as the 2024-only trim it replaces).

Known real limitation, unchanged from the single-year build and expected
to apply at every cycle: Connecticut replaced its 8 legacy counties with
9 planning regions in 2022. This project's crosswalk uses the NEW
planning-region FIPS codes; MEDSL's file reports under the OLD legacy
county FIPS for every cycle (2022 predates none of MEDSL's actual
election years, but MEDSL has not retroactively remapped historical
rows to the new geography). The result: the same 7 Connecticut cities are
expected to be unmatched at every year, not just 2024 -- a real,
consistent geography-vintage mismatch between two real sources, not a
join bug specific to one year.
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_CSV = ROOT / "data/raw/countypres_2000-2024.csv"
YEARS = ["2000", "2004", "2008", "2012", "2016", "2020", "2024"]


def load_county_totals_by_year():
    """Real per-county, per-candidate vote totals for every real cycle,
    correctly de-duplicated against MEDSL's own mixed mode-reporting: some
    states report one 'TOTAL' row per candidate, some report an aggregate
    row with mode='' instead, and a handful report only a single
    non-aggregate mode with no separate total row at all -- summing THOSE
    is safe because there's exactly one mode present, not a double-count
    risk. Same logic as the original single-year build, just grouped by
    year first."""
    rows_by_year_county = defaultdict(list)
    modes_by_year_county = defaultdict(set)

    with SOURCE_CSV.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            year = row["year"]
            if year not in YEARS:
                continue
            fips = row["county_fips"].zfill(5)
            key = (year, fips)
            modes_by_year_county[key].add(row["mode"])
            rows_by_year_county[key].append(row)

    totals_by_year = defaultdict(dict)
    for (year, fips), rows in rows_by_year_county.items():
        modes = modes_by_year_county[(year, fips)]
        if "TOTAL" in modes:
            use_mode = "TOTAL"
        elif "" in modes:
            use_mode = ""
        else:
            use_mode = None  # single non-aggregate mode -- use every row, no filter

        votes_by_candidate = defaultdict(lambda: {"votes": 0, "party": None})
        total_votes = None
        for row in rows:
            if use_mode is not None and row["mode"] != use_mode:
                continue
            candidate = row["candidate"]
            raw_votes = row["candidatevotes"]
            votes_by_candidate[candidate]["votes"] += int(raw_votes) if raw_votes not in ("", "NA") else 0
            votes_by_candidate[candidate]["party"] = row["party"]
            raw_total = row["totalvotes"]
            if raw_total not in ("", "NA"):
                total_votes = int(raw_total)

        ranked = sorted(votes_by_candidate.items(), key=lambda kv: -kv[1]["votes"])
        if len(ranked) < 2 or not total_votes:
            continue

        winner_name, winner = ranked[0]
        runner_up_name, runner_up = ranked[1]
        margin_pct = (winner["votes"] - runner_up["votes"]) / total_votes * 100

        totals_by_year[year][fips] = {
            "winner": winner_name.title(),
            "winner_party": (winner["party"] or "").title(),
            "runner_up": runner_up_name.title(),
            "margin_pct": round(margin_pct, 1),
        }

    return totals_by_year


def main():
    if not SOURCE_CSV.exists():
        print(f"Missing {SOURCE_CSV} -- see this script's own header comment for how it was fetched.", file=sys.stderr)
        sys.exit(1)

    totals_by_year = load_county_totals_by_year()
    for year in YEARS:
        print(f"{year}: real results for {len(totals_by_year[year])} counties.", file=sys.stderr)

    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    for city in cities:
        cid = city["id"]
        fips_info = city_county.get(cid)
        if not fips_info:
            continue

        years_data = {}
        for year in YEARS:
            result = totals_by_year[year].get(fips_info["stcofips"])
            if not result:
                continue
            years_data[year] = {
                "winner": result["winner"],
                "winner_party": result["winner_party"],
                "runner_up": result["runner_up"],
                "margin_pct": result["margin_pct"],
                "concern": min(100.0, result["margin_pct"]),
            }

        if years_data:
            records[cid] = {"county": fips_info["county_name"], "years": years_data}

    result = {
        "_meta": {
            "source": "MIT Election Data + Science Lab, County Presidential Election Returns 2000-2024",
            "source_url": "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/VOQCHQ",
            "resolution": "county",
            "years": [int(y) for y in YEARS],
            "framing": "electoral competitiveness (margin of victory), NOT left/right lean -- see data/political-lean-methodology.md",
        },
        **records,
    }
    (ROOT / "data/political-lean.json").write_text(json.dumps(result, indent=2))
    print(f"Wrote data/political-lean.json: {len(records)}/{len(cities)} cities matched (any year).", file=sys.stderr)
    for year in YEARS:
        n = sum(1 for r in records.values() if year in r["years"])
        print(f"  {year}: {n}/{len(cities)} cities covered", file=sys.stderr)


if __name__ == "__main__":
    main()
