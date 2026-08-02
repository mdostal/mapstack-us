# Mapstack

Open-source US map layers: pick datasets, overlay them, find what matters to you —
visiting, relocating, proving a point, spotting correlations. One map engine, any
number of pluggable data layers.

> ⚠️ **Directional, not authoritative.** Every layer documents its own sourcing and
> limitations. Nothing here replaces official records, professional advice, or your
> own research.

## Why this exists

This project generalizes [`allergy-locator`](https://github.com/mdostal/allergy-locator),
which shipped a real, working US severity map for allergens — city-level heatmaps,
per-allergen overlays, a composite personal score, and a saved-profile compare feature.
Once a **second** real dataset (healthcare access) was built the same way, the shared
shape between the two became clear enough to actually generalize, rather than guessing
at an abstraction from a single case. That's what this repo is: the generalized engine,
built from two real, working examples instead of upfront design.

## Principles (carried over from allergy-locator)

- **Fully open source (MIT).** Assume every file is public — no secrets, ever.
- **Cost ≈ $0.** Static site generation; no required backend, no required API key.
- **Transparent scoring.** Every layer decomposes into its components with a plain-
  language methodology doc. No black boxes, no claimed precision beyond what the
  underlying data supports.
- **Gradients, not buckets.** Continuous heatmaps on granular data with visible
  confidence — never state fills or a single scary headline number.
- **A dataset is a wrapper, not a rewrite.** Adding a new layer means implementing one
  small interface (points + a 0-100 value + a color ramp + a methodology doc), not
  building a new map from scratch.

## What's here so far

Early scaffold, ported from allergy-locator's proven Next.js/Tailwind/Vitest/Playwright
stack. The generalized dataset-layer interface itself is being designed now, informed by
allergy-locator's two real, shipped datasets (allergy severity, healthcare access) —
see that repo's `.pHive/planning/roadmap.md` (v5) for the design reasoning.

## Stack

Next.js (SSG), Tailwind CSS v4, Vitest + Playwright, zero required backend — same
foundation as allergy-locator.

## License

MIT — see [`LICENSE`](LICENSE).
