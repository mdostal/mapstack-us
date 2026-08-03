#!/usr/bin/env python3
"""Regenerates data/allergens.json -- the 28 comprehensive (non-grass) allergen
layers -- from data/cities.json.

Ported verbatim from allergy-locator's scripts/source_allergens.py: every
entry here is confidence="modeled" (only grass, scored by
gen_allergy_scores.py against real ground-truth reactions, earns "validated").
Presence + baseline severity are derived from each city's Koppen climate zone
(a per-allergen severity table, grounded in real ecological/aerobiology
literature -- see data/allergens-scoring.md) plus, for the 9 original-panel
species, REAL per-state presence data (USDA PLANTS, data/species-ranges.json)
as a hard gate -- more accurate than the Koppen-only approach for those 9,
since real per-state data exists for them specifically.

This is deliberately simpler than grass's 5-component, ground-truth-fit
formula: these allergens don't have equivalent ground truth to fit against,
so a coarser, honestly-labeled model is the right level of confidence to
claim -- unchanged reasoning from the original script.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

with open(DATA_DIR / "cities.json") as f:
    CITIES = json.load(f)

ALLERGEN_DEFS = [
    ("tall-fescue", "Tall fescue", "grass", {
        "Cfa": 55, "Dfa": 40, "Dfb": 35, "Cfb": 45, "Csb": 30, "Csa": 25,
        "BSk": 20, "BSh": 20, "BWh": 10, "BWk": 8, "Aw": 35, "Dsb": 15, "Dfc": 10,
    }, 0),
    ("orchard-grass", "Orchard grass", "grass", {
        "Cfa": 30, "Dfa": 45, "Dfb": 50, "Cfb": 45, "Csb": 35, "Csa": 20,
        "BSk": 15, "BSh": 10, "BWh": 5, "BWk": 5, "Aw": 5, "Dsb": 20, "Dfc": 15,
    }, 0),
    ("sweet-vernal-grass", "Sweet vernal grass", "grass", {
        "Cfa": 35, "Dfa": 35, "Dfb": 35, "Cfb": 40, "Csb": 30, "Csa": 20,
        "BSk": 10, "BSh": 8, "BWh": 3, "BWk": 3, "Aw": 5, "Dsb": 15, "Dfc": 10,
    }, 0),
    ("redtop", "Redtop", "grass", {
        "Cfa": 40, "Dfa": 40, "Dfb": 40, "Cfb": 40, "Csb": 25, "Csa": 15,
        "BSk": 10, "BSh": 8, "BWh": 3, "BWk": 3, "Aw": 20, "Dsb": 12, "Dfc": 15,
    }, 0),
    ("sagebrush", "Sagebrush", "weed", {
        "Cfa": 0, "Dfa": 0, "Dfb": 2, "Cfb": 0, "Csb": 15, "Csa": 10,
        "BSk": 60, "BSh": 45, "BWh": 35, "BWk": 55, "Aw": 0, "Dsb": 40, "Dfc": 5,
    }, 0),
    ("kochia-russian-thistle", "Kochia / Russian thistle", "weed", {
        "Cfa": 5, "Dfa": 10, "Dfb": 15, "Cfb": 0, "Csb": 10, "Csa": 15,
        "BSk": 55, "BSh": 50, "BWh": 45, "BWk": 40, "Aw": 0, "Dsb": 20, "Dfc": 5,
    }, 0),
    ("mugwort", "Mugwort", "weed", {
        "Cfa": 40, "Dfa": 35, "Dfb": 30, "Cfb": 25, "Csb": 15, "Csa": 10,
        "BSk": 8, "BSh": 5, "BWh": 2, "BWk": 2, "Aw": 10, "Dsb": 10, "Dfc": 10,
    }, 0),
    ("dock-sorrel", "Dock / sorrel", "weed", {
        "Cfa": 30, "Dfa": 30, "Dfb": 30, "Cfb": 35, "Csb": 25, "Csa": 15,
        "BSk": 10, "BSh": 8, "BWh": 3, "BWk": 3, "Aw": 15, "Dsb": 12, "Dfc": 10,
    }, 0),
    ("nettle", "Nettle", "weed", {
        "Cfa": 30, "Dfa": 30, "Dfb": 30, "Cfb": 40, "Csb": 25, "Csa": 12,
        "BSk": 8, "BSh": 5, "BWh": 2, "BWk": 2, "Aw": 15, "Dsb": 10, "Dfc": 12,
    }, 0),
    ("red-oak", "Red oak", "tree", {
        "Cfa": 45, "Dfa": 45, "Dfb": 40, "Cfb": 10, "Csb": 5, "Csa": 5,
        "BSk": 5, "BSh": 2, "BWh": 0, "BWk": 0, "Aw": 5, "Dsb": 5, "Dfc": 15,
    }, 0),
    ("white-ash", "White ash", "tree", {
        "Cfa": 35, "Dfa": 40, "Dfb": 35, "Cfb": 8, "Csb": 3, "Csa": 2,
        "BSk": 3, "BSh": 2, "BWh": 0, "BWk": 0, "Aw": 2, "Dsb": 3, "Dfc": 10,
    }, 0),
    ("red-maple", "Red maple", "tree", {
        "Cfa": 40, "Dfa": 40, "Dfb": 35, "Cfb": 10, "Csb": 3, "Csa": 2,
        "BSk": 3, "BSh": 2, "BWh": 0, "BWk": 0, "Aw": 5, "Dsb": 3, "Dfc": 12,
    }, 0),
    ("loblolly-pine", "Loblolly pine", "tree", {
        "Cfa": 35, "Dfa": 5, "Dfb": 0, "Cfb": 0, "Csb": 0, "Csa": 0,
        "BSk": 0, "BSh": 5, "BWh": 0, "BWk": 0, "Aw": 10, "Dsb": 0, "Dfc": 0,
    }, 0),
    ("black-walnut", "Black walnut", "tree", {
        "Cfa": 25, "Dfa": 30, "Dfb": 25, "Cfb": 5, "Csb": 2, "Csa": 2,
        "BSk": 3, "BSh": 2, "BWh": 0, "BWk": 0, "Aw": 2, "Dsb": 2, "Dfc": 5,
    }, 0),
    ("american-sycamore", "American sycamore", "tree", {
        "Cfa": 30, "Dfa": 25, "Dfb": 20, "Cfb": 5, "Csb": 8, "Csa": 5,
        "BSk": 3, "BSh": 2, "BWh": 0, "BWk": 0, "Aw": 5, "Dsb": 3, "Dfc": 5,
    }, 0),
    ("red-alder", "Red alder", "tree", {
        "Cfa": 0, "Dfa": 0, "Dfb": 0, "Cfb": 35, "Csb": 30, "Csa": 5,
        "BSk": 0, "BSh": 0, "BWh": 0, "BWk": 0, "Aw": 0, "Dsb": 5, "Dfc": 0,
    }, 0),
    ("shagbark-hickory", "Shagbark hickory", "tree", {
        "Cfa": 25, "Dfa": 30, "Dfb": 25, "Cfb": 3, "Csb": 2, "Csa": 2,
        "BSk": 2, "BSh": 2, "BWh": 0, "BWk": 0, "Aw": 2, "Dsb": 2, "Dfc": 8,
    }, 0),
    ("cladosporium", "Cladosporium (mold)", "mold", {
        "Cfa": 60, "Aw": 65, "Dfa": 45, "Dfb": 35, "Cfb": 40, "Csb": 25, "Csa": 30,
        "BSk": 15, "BSh": 20, "BWh": 10, "BWk": 8, "Dsb": 20, "Dfc": 15,
    }, 5),
    ("alternaria", "Alternaria (mold)", "mold", {
        "Cfa": 40, "Aw": 35, "Dfa": 40, "Dfb": 38, "Cfb": 35, "Csb": 32, "Csa": 32,
        "BSk": 30, "BSh": 28, "BWh": 25, "BWk": 22, "Dsb": 30, "Dfc": 25,
    }, 0),
]

ORIGINAL_PANEL_NON_GRASS = [
    ("ragweed", "Common ragweed", "weed"),
    ("pigweed", "Redroot pigweed", "weed"),
    ("lambsquarters", "Lambsquarters", "weed"),
    ("plantain", "English plantain", "weed"),
    ("live-oak", "Live oak", "tree"),
    ("american-elm", "American elm", "tree"),
    ("cedar-juniper", "Eastern redcedar / juniper", "tree"),
    ("river-birch", "River birch", "tree"),
    ("boxelder", "Boxelder", "tree"),
]

SPECIES_RANGES_KEY = {
    "ragweed": "Common ragweed",
    "pigweed": "Redroot pigweed",
    "lambsquarters": "Lambsquarters",
    "plantain": "English plantain",
    "live-oak": "Live oak",
    "american-elm": "American elm",
    "cedar-juniper": "Eastern redcedar/juniper",
    "river-birch": "River birch",
    "boxelder": "Boxelder",
}

CATEGORY_BASELINE = {
    "weed": {
        "Cfa": 35, "Dfa": 32, "Dfb": 28, "Cfb": 30, "Csb": 20, "Csa": 15,
        "BSk": 15, "BSh": 12, "BWh": 5, "BWk": 5, "Aw": 20, "Dsb": 15, "Dfc": 12,
    },
    "tree": {
        "Cfa": 30, "Dfa": 32, "Dfb": 28, "Cfb": 12, "Csb": 8, "Csa": 6,
        "BSk": 6, "BSh": 4, "BWh": 0, "BWk": 0, "Aw": 8, "Dsb": 6, "Dfc": 12,
    },
}

TIER_THRESHOLDS = [(15, "near-zero"), (35, "low"), (65, "moderate"), (89, "high")]


def tier_for(score):
    for threshold, label in TIER_THRESHOLDS:
        if score < threshold:
            return label
    return "worst"


def build():
    allergens_meta = []
    scores = []

    for allergen_id, label, category, koppen_table, coastal_bonus in ALLERGEN_DEFS:
        allergens_meta.append({"id": allergen_id, "label": label, "category": category, "confidence": "modeled"})
        for city in CITIES:
            base = koppen_table.get(city["koppen"], 0)
            coastal_adj = coastal_bonus if city.get("coastal") else 0
            score = max(0, min(100, round(base + coastal_adj)))
            scores.append({
                "allergen_id": allergen_id,
                "city_id": city["id"],
                "score": score,
                "tier": tier_for(score),
                "why": (
                    f"{label}: modeled from {city['koppen']} climate zone"
                    + (" (coastal-adjusted)" if city.get("coastal") and coastal_bonus else "")
                ),
            })

    with open(DATA_DIR / "species-ranges.json") as f:
        species_ranges = json.load(f)["species"]

    for allergen_id, label, category in ORIGINAL_PANEL_NON_GRASS:
        allergens_meta.append({"id": allergen_id, "label": label, "category": category, "confidence": "modeled"})
        present_states = set(species_ranges[SPECIES_RANGES_KEY[allergen_id]])
        koppen_table = CATEGORY_BASELINE[category]
        for city in CITIES:
            if city["state"] not in present_states:
                score = 0
                why = f"{label}: not listed present in {city['state']} (USDA PLANTS)"
            else:
                score = max(0, min(100, round(koppen_table.get(city["koppen"], 0))))
                why = f"{label}: present in {city['state']} (USDA PLANTS), modeled from {city['koppen']} climate zone"
            scores.append({
                "allergen_id": allergen_id,
                "city_id": city["id"],
                "score": score,
                "tier": tier_for(score),
                "why": why,
            })

    (DATA_DIR / "allergens.json").write_text(json.dumps({"allergens": allergens_meta, "scores": scores}, indent=2) + "\n")
    print(f"Wrote {len(allergens_meta)} allergens x {len(CITIES)} cities = {len(scores)} scores")


if __name__ == "__main__":
    build()
