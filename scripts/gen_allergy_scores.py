#!/usr/bin/env python3
"""
Regenerates data/allergy-scores.json (the grass-severity layer) from
data/cities.json.

The scoring model itself -- base_from_climate/elevation_raw/compress/
score_components/tier_of/why_of, the SEED_VALLEY set, and the shipped
variant B weights -- is ported VERBATIM from allergy-locator's
scripts/gen_spine.py, which fits it against a real grass-dominant person's
logged reactions (see data/allergy-scoring.md, and
data/real-pollen-data-research.md for why this stays a model rather than
becoming measured data). Nothing about the model changes here -- only the
input city list changes, from allergy-locator's own hardcoded 168-city
spine to this repo's data/cities.json (currently 512).

SEED_VALLEY is NOT extended to any of the new cities -- membership there
requires the same real-world judgment call (irrigated grass-seed
agriculture, specifically) the original author applied by hand to the
original spine, and guessing at that for 344 new cities would be exactly
the kind of fabricated precision this project's methodology docs
explicitly reject. New cities that plausibly belong get the correct
climate/turf/elevation/coastal treatment regardless -- they just don't get
the seed-valley floor bonus until someone verifies they belong on that
list, the same way the original 17 were verified.

The ANCHORS/MAE check is a regression guard: if the ported formula stops
reproducing the same fit against the original ground-truth anchors, that's
a real transcription bug, not a intentional recalibration -- the script
asserts on it rather than silently drifting.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SEED_VALLEY = {
    "boise-id", "salt-lake-city-ut", "colorado-springs-co", "denver-co", "aurora-co",
    "salem-or", "portland-or", "vancouver-wa", "spokane-wa", "reno-nv", "albuquerque-nm",
    "sacramento-ca", "fresno-ca", "bakersfield-ca", "stockton-ca", "modesto-ca", "elk-grove-ca",
}

VARIANTS = {
    "A": dict(turf_mult=1.05, seed_bonus=14, arid_w=12, coastal_w=4, irrig_supp=0.5),
    "B": dict(turf_mult=1.82, seed_bonus=41, arid_w=19, coastal_w=4, irrig_supp=0.9),
}
SHIP = "B"

ANCHORS = {
    "flagstaff-az": 8, "sundance-wy": 8, "rapid-city-sd": 8, "durango-co": 13,
    "omaha-ne": 25, "kalispell-mt": 30, "san-jose-ca": 50, "fremont-ca": 50,
    "salt-lake-city-ut": 58, "washington-dc": 60, "colorado-springs-co": 60,
    "austin-tx": 78, "carlsbad-nm": 78, "whitewright-tx": 80, "yuma-az": 82,
    "phoenix-az": 83, "mesa-az": 83, "boise-id": 88, "orlando-fl": 92, "cape-coral-fl": 92,
}


def base_from_climate(k, lat):
    """base_season_climate = grass-pollen SEASON LENGTH x climate load."""
    if k in ("Af", "Am", "Aw"):
        return 91
    if k == "Cfa":
        return round(85 - (lat - 28) * 2.2)
    if k == "Cfb":
        return 46
    if k == "Csa":
        return 40
    if k == "Csb":
        return 44
    if k == "Dfa":
        return 18
    if k == "Dfb":
        return 25
    if k == "Dfc":
        return 12
    if k in ("Dsb", "Dsc"):
        return 24
    if k == "BSh":
        return 44
    if k == "BSk":
        return 7
    if k == "BWh":
        return 51
    if k == "BWk":
        return 57
    return 38


def elevation_raw(elev):
    if elev > 6500: return -20
    if elev > 5500: return -15
    if elev > 4500: return -12
    if elev > 3500: return -7
    if elev > 2500: return -3
    if elev > 1800: return -1
    return 0


def compress(x):
    return x if x <= 92 else 92 + (x - 92) * 0.4


def score_components(c, P):
    k = c["koppen"]; lat = c["lat"]; elev = c["elevation_ft"]
    coastal = c["coastal"]; flags = c.get("flags", {}); cid = c["id"]
    tf = flags.get("turf", 0)

    base = base_from_climate(k, lat)

    turf = min(tf, 24) * P["turf_mult"]
    seed = P["seed_bonus"] if cid in SEED_VALLEY else 0
    turf_boost = round(turf + seed)

    arid = P["arid_w"] if (flags.get("aridsw") and cid not in SEED_VALLEY) else 0

    irrig = 1.0 if (cid in SEED_VALLEY or tf >= 8) else 0.0
    elevation_discount = round(elevation_raw(elev) * (1 - P["irrig_supp"] * irrig))

    coastal_nudge = -P["coastal_w"] if coastal else 0

    raw = base + turf_boost + arid + elevation_discount + coastal_nudge
    score = max(2, min(97, round(compress(raw))))
    return {
        "base_season_climate": base,
        "turf_boost": turf_boost,
        "arid_weed": arid,
        "elevation_discount": elevation_discount,
        "coastal_nudge": coastal_nudge,
        "score": score,
    }


def tier_of(s):
    if s < 15: return "near-zero"
    if s < 35: return "low"
    if s < 65: return "moderate"
    if s <= 88: return "high"
    return "worst"


def why_of(c, comp):
    k = c["koppen"]; flags = c.get("flags", {}); cid = c["id"]
    coastal = c["coastal"]; s = comp["score"]
    if cid in SEED_VALLEY and comp["turf_boost"] >= 45:
        return "irrigated grass-seed valley — cultivated turf drives grass pollen high"
    if k in ("Af", "Am", "Aw"):
        return "year-round subtropical grass, no winter reset"
    if k == "Cfa" and s >= 65:
        return "long warm-humid grass season, no winter reset"
    if comp["arid_weed"] and s >= 55:
        return "hot desert — irrigated lawns plus arid weed/dust load"
    if comp["elevation_discount"] <= -8 and s < 20:
        return "high dry elevation, very short grass season"
    if k in ("Dfb", "Dfc") and s < 35:
        return "hard cold-winter reset, short grass season"
    if k in ("Dfa",) and s < 35:
        return "hot grassy summer tempered by hard winter reset"
    if comp["arid_weed"]:
        return "light grass but arid desert weed/dust load"
    if coastal and s < 60:
        return "ocean-moderated coastal grass season"
    if k == "Cfa":
        return "moderate humid-subtropical grass season"
    return "moderate mixed grass exposure"


def mae(variant, city_by_id):
    P = VARIANTS[variant]
    errs = []
    for cid, tgt in ANCHORS.items():
        c = city_by_id[cid]
        errs.append(abs(score_components(c, P)["score"] - tgt))
    return sum(errs) / len(errs)


def main():
    cities = json.loads((ROOT / "data/cities.json").read_text())
    city_by_id = {c["id"]: c for c in cities}

    missing_anchors = [cid for cid in ANCHORS if cid not in city_by_id]
    assert not missing_anchors, f"ground-truth anchor cities missing from spine: {missing_anchors}"

    mae_a, mae_b = mae("A", city_by_id), mae("B", city_by_id)
    ship = "A" if mae_a < mae_b else "B"
    assert ship == SHIP, f"expected {SHIP} to win (MAE {mae_a if SHIP=='A' else mae_b:.2f}), got {ship} -- possible transcription bug in the ported formula"
    P = VARIANTS[SHIP]

    scores = []
    for c in cities:
        comp = score_components(c, P)
        scores.append({
            "id": c["id"],
            "base_season_climate": comp["base_season_climate"],
            "turf_boost": comp["turf_boost"],
            "arid_weed": comp["arid_weed"],
            "elevation_discount": comp["elevation_discount"],
            "coastal_nudge": comp["coastal_nudge"],
            "score": comp["score"],
            "tier": tier_of(comp["score"]),
            "why": why_of(c, comp),
        })

    (ROOT / "data/allergy-scores.json").write_text(json.dumps(scores, indent=2) + "\n")
    print(f"Wrote data/allergy-scores.json for {len(scores)} cities.")
    print(f"MAE(A)={mae_a:.2f}  MAE(B, shipped)={mae_b:.2f}")


if __name__ == "__main__":
    main()
