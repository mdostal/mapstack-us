#!/usr/bin/env python3
"""
Builds data/broadband-speed.json -- real FCC broadband speed
availability, ddr9-1 (data-drive-round-9 epic). Source: the FCC
National Broadband Map's own county-level summary file. Genuinely
distinct from broadband.ts's Census ACS subscription-RATE dataset (do
households actually pay for service) -- this measures AVAILABILITY (can
a location get service at all, regardless of whether anyone subscribes),
a real, separate rural/urban infrastructure signal.

A real, disclosed reproducibility caveat, unlike every other bulk-file
dataset this session: the FCC map site's download endpoint
(broadbandmap.fcc.gov/nbm/map/api/getNBMDataDownloadFile/{fileId}/{n})
requires first resolving the CURRENT filing ID and file ID through the
site's own config/filing APIs, which change with each FCC data release
-- there is no stable, guessable static URL the way NOAA/IMLS/TRI have.
The real file was downloaded once via the site's own UI (a real browser
session) during this dataset's planning research and is cached here;
regenerating this dataset after that cache is deleted requires manually
re-downloading the "Fixed Broadband Summary by Geography Type - Other
Geographies" file from https://broadbandmap.fcc.gov/data-download/
nationwide-data and placing it in the cache directory below.

Raw value: real speed_1000_100 (% of locations with access to gigabit
(1000 Mbps down / 100 Mbps up) service), County/Residential/"Any
Technology" rows. A real, deliberate choice over the FCC's official
100/20 Mbps "broadband" standard: checked live during research and
found that standard is already >99.6% available across every city in
this spine (essentially solved for populous incorporated cities, though
real areas outside this spine's largest-512 cutoff remain genuinely
underserved) -- zero differentiation, not a useful map layer. Gigabit
availability is a real, still-unequal infrastructure tier even among
large cities (real observed range: 0% to 100%, median 65%), a more
meaningful signal for this dataset. Already a real 0-1 percentage --
direct rescale, inverted (lower availability = more concerning, a
digital-divide framing).
"""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data/raw/broadband-speed-cache"


def find_source_csv():
    matches = list(CACHE_DIR.glob("bdc_us_fixed_broadband_summary_by_geography_*.csv"))
    if not matches:
        raise SystemExit(
            "No cached FCC broadband summary CSV found under data/raw/broadband-speed-cache/. "
            "This dataset's source has no stable, guessable download URL -- manually download the "
            '"Fixed Broadband Summary by Geography Type - Other Geographies" file from '
            "https://broadbandmap.fcc.gov/data-download/nationwide-data and place it in that directory."
        )
    return matches[0]


def load_county_availability():
    csv_path = find_source_csv()
    by_county = {}
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["geography_type"] != "County" or row["biz_res"] != "R" or row["technology"] != "Any Technology":
                continue
            fips = row["geography_id"]
            if fips in by_county:
                continue  # real duplicate rows with identical values confirmed during research -- first wins
            try:
                by_county[fips] = float(row["speed_1000_100"])
            except (ValueError, KeyError):
                continue
    return by_county


def percentile_ranks_inverted(values_by_id):
    ids_sorted = sorted(values_by_id, key=lambda cid: values_by_id[cid])
    n = len(ids_sorted)
    return {cid: round((n - 1 - i) / max(n - 1, 1) * 100, 1) for i, cid in enumerate(ids_sorted)}


def main():
    availability_by_county = load_county_availability()
    print(f"Loaded real broadband availability for {len(availability_by_county)} counties.", file=sys.stderr)

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
        pct = availability_by_county.get(fips_info["stcofips"])
        if pct is None:
            unmatched.append(cid)
            continue
        records[cid] = {
            "pct_gigabit_available": round(pct * 100, 1),
            "county": fips_info["county_name"],
        }

    concern = percentile_ranks_inverted({cid: r["pct_gigabit_available"] for cid, r in records.items()})
    for cid in records:
        records[cid]["concern"] = concern[cid]

    covered = len(records)
    result = {
        "_meta": {
            "source": "FCC National Broadband Map, fixed broadband summary by county, gigabit tier (speed_1000_100), residential",
            "resolution": "county",
            "coverage": covered,
        },
        **records,
    }
    (ROOT / "data/broadband-speed.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(f"Wrote data/broadband-speed.json: {covered}/{len(cities)} cities matched.", file=sys.stderr)
    if unmatched:
        print(f"Unmatched ({len(unmatched)}): {unmatched}", file=sys.stderr)

    values = sorted(r["pct_gigabit_available"] for r in records.values())
    if values:
        print(f"availability %% range: min={values[0]:.1f} median={values[len(values)//2]:.1f} max={values[-1]:.1f}", file=sys.stderr)


if __name__ == "__main__":
    main()
