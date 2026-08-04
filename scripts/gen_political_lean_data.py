#!/usr/bin/env python3
"""
Builds the political-competitiveness dataset: real county-level 2024
presidential election returns from the MIT Election Data + Science Lab
(MEDSL)'s "County Presidential Election Returns 2000-2024" -- the
authoritative academic compilation of official county election results,
downloaded from Harvard Dataverse
(doi:10.7910/DVN/VOQCHQ), joined to each spine city via the SAME
city->county crosswalk hazard.ts/traffic-fatalities.ts already built
(data/raw/city-county-fips.json) -- zero new geocoding needed.

Real, deliberate framing choice (discussed with and approved by the
operator before building this): NOT a left/right "lean" score -- that
would require an editorial judgment about which party's dominance counts
as "more concerning," a call this project has no basis to make and that
risks the map itself reading as taking a side. Instead this measures
ELECTORAL COMPETITIVENESS -- how lopsided the county's 2024 margin was,
regardless of which party won. Higher margin (a bigger blowout, either
direction) = more concerning, on the reasoning that competitive
elections are what keeps officials accountable; genuinely uncontested
ones (in either direction) are the concerning case, not a specific
party's win.

Access note -- a real, confirmed limitation, not a guess: MEDSL's
Dataverse file requires a one-time "guestbook" response (name/email/
institution) before ANY download. The operator completed that via the
browser and it worked there -- but even WITH a valid Dataverse API token
(DATAVERSE_API_TOKEN) afterward, the programmatic `/api/access/datafile`
endpoint still rejects the request with the same guestbook error
(confirmed directly: HTTP 400, "You may not download this file without
the required Guestbook response for guestbookID 458"). The browser-side
guestbook completion doesn't appear to propagate to API/token-based
access on this Dataverse instance. So unlike every other dataset in this
project, this one cannot be reproduced by a fresh `API_KEY`-only script
run -- the source CSV (2024 rows only, trimmed from the full 2000-2024
file for size) is committed directly at data/raw/countypres_2024.csv
instead (CC0-licensed by MEDSL, so redistributing it is not a licensing
problem, only Harvard's own download gate was the obstacle).
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_CSV = ROOT / "data/raw/countypres_2024.csv"
YEAR = "2024"


def load_county_totals():
    """Real per-county, per-candidate vote totals for YEAR, correctly
    de-duplicated against MEDSL's own mixed mode-reporting: some states
    report one 'TOTAL' row per candidate, some report an aggregate row
    with mode='' instead, and a handful (all in one state, confirmed by
    inspection) report only a single non-aggregate mode with no separate
    total row at all -- summing THOSE is safe because there's exactly one
    mode present, not a double-count risk."""
    modes_by_county = defaultdict(set)
    rows_by_county = defaultdict(list)

    with SOURCE_CSV.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["year"] != YEAR:
                continue
            fips = row["county_fips"].zfill(5)
            modes_by_county[fips].add(row["mode"])
            rows_by_county[fips].append(row)

    totals = {}
    for fips, rows in rows_by_county.items():
        modes = modes_by_county[fips]
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

        totals[fips] = {
            "winner": winner_name.title(),
            "winner_party": (winner["party"] or "").title(),
            "runner_up": runner_up_name.title(),
            "margin_pct": round(margin_pct, 1),
        }

    return totals


def main():
    if not SOURCE_CSV.exists():
        print(f"Missing {SOURCE_CSV} -- this file is committed to the repo; see data/political-lean-methodology.md.", file=sys.stderr)
        sys.exit(1)

    county_totals = load_county_totals()
    print(f"Loaded real {YEAR} results for {len(county_totals)} counties.", file=sys.stderr)

    city_county = json.loads((ROOT / "data/raw/city-county-fips.json").read_text())
    cities = json.loads((ROOT / "data/cities.json").read_text())

    records = {}
    unmatched = []
    for city in cities:
        cid = city["id"]
        fips_info = city_county.get(cid)
        if not fips_info:
            unmatched.append(cid)
            continue

        result = county_totals.get(fips_info["stcofips"])
        if not result:
            unmatched.append(cid)
            continue

        records[cid] = {
            "county": fips_info["county_name"],
            "winner": result["winner"],
            "winner_party": result["winner_party"],
            "runner_up": result["runner_up"],
            "margin_pct": result["margin_pct"],
            "concern": min(100.0, result["margin_pct"]),
        }

    result = {
        "_meta": {
            "source": "MIT Election Data + Science Lab, County Presidential Election Returns 2000-2024 (2024 results)",
            "source_url": "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/VOQCHQ",
            "resolution": "county",
            "framing": "electoral competitiveness (margin of victory), NOT left/right lean -- see data/political-lean-methodology.md",
        },
        **records,
    }
    (ROOT / "data/political-lean.json").write_text(json.dumps(result, indent=2))
    print(f"Wrote data/political-lean.json: {len(records)}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched: {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
