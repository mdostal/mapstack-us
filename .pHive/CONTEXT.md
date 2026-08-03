# Project CONTEXT

Mapstack is an open-source, static-first Next.js app: pick datasets, overlay them
as heatmaps on a US map, and find what matters to you. One map engine, any number
of pluggable data layers — generalized from allergy-locator's two real datasets.

## Terminology

- **Dataset (layer)** — A pluggable data source implementing the `Dataset` interface
  (`src/lib/datasets/types.ts`): a fixed set of `layers`, a per-city/per-layer
  `getValue()` returning a 0-100 "higher = more concerning" value, and a methodology
  doc. Current datasets: allergy severity, crime (violent + property), care access
  (drive time to nearest hospital — general/pediatric specialty/pediatric cardiac).
- **Concern value** — The shared 0-100 scale every dataset's `getValue()` returns.
  Always "higher = more concerning" so one color ramp (`concernColor`) works
  unmodified across every dataset — no per-dataset inverted palette.
- **Layer** — A sub-choice within a dataset (e.g. a specific allergen, or a crime
  category). A dataset declares its `layers: DatasetLayer[]`.
- **Time context** — Optional `year`/`month`/`day` a dataset's `getValue()` can use
  when `supportsTime: true`. Datasets only ever expose years they have real data
  for (`availableYears`) — never a fabricated/interpolated year.
- **Multi-layer stacking** — Rendering 2+ dataset layers simultaneously with
  per-layer color identity (see `MultiLayerMap.tsx`), generalized on top of the
  single-layer-at-a-time picker UX. Purely visual: 2+ active layers alpha-composite
  at a fixed 65% opacity, no data-level blending or computed coefficients exist —
  stated explicitly in the transparency note shown under the map in
  `/mapstack/advanced`'s Map view (`PowerUserPanel.tsx`).
- **Comparison table** — The power-user tab's (`/mapstack/advanced`,
  `ComparisonTable.tsx`) tabular, side-by-side view of 2+ (dataset, layer)
  values per city, each column headed by its own methodology note. Distinct
  from "multi-layer stacking": stacking renders layers together on the map,
  the comparison table renders them as columns for direct comparison/sort —
  and deliberately computes no cross-dataset combined score (the underlying
  scores aren't on a common statistical basis; see
  `.pHive/epics/power-user-tab/docs/design-discussion.md` §3.3).
- **Methodology doc** — Every dataset's plain-language sourcing/scoring writeup
  (e.g. `data/crime-methodology.md`, `data/allergy-scoring.md`). Required per the
  transparent-scoring principle — no black-box heuristics.
- **Data store** — The compiled, queryable SQLite projection of `DATASETS`
  (`public/data.sqlite`, built by `src/lib/db/build-database.ts` /
  `scripts/build-sqlite.ts`), queried entirely client-side via sql.js/WASM
  (`src/lib/db/client.ts`). Read-only Phase 1 of a two-phase plan — see
  `.pHive/epics/data-store/docs/design-note.md`. Never a second
  implementation of scoring logic: it renders through the real `Dataset`
  interface's `getValue()`, the same one every UI component calls.
- **Formula panel** — The power-user tab's tunable-weights sandbox
  (`FormulaPanel.tsx`, `src/lib/formula/allergy-grass-formula.ts`) for
  layers with a real, documented, decomposable formula (currently only
  allergy's grass layer — see `data/allergy-scoring.md`). A **preview
  only**: recomputed scores here never change the map, table, CSV export,
  or saved views, which always show the shipped model. Layers without a
  decomposed formula (crime, the other 27 allergens) get an explanatory
  note instead of a fake slider. See
  `.pHive/design/power-user-formula-panel/design-note.md`.

## Key paths

- `src/lib/datasets/types.ts` — the generalized Dataset interface; the reason this
  repo exists separately from allergy-locator.
- `src/lib/datasets/{allergy,crime,care-access}.ts`, `registry.ts` — per-dataset
  implementations and the registry that lists them for the picker.
- `src/lib/formula/care-access-concern.ts` — piecewise-linear drive-time-to-concern
  conversion for care access, anchored on the source data's own tier boundaries
  (see `data/care-access-methodology.md`).
- `src/lib/palette/` — the shared concern-value color ramp.
- `src/lib/heatmap/` — IDW interpolation grid for continuous (not bucketed) rendering.
- `src/lib/geo/` — state path data + city-marker dodge logic for overlapping cities.
- `src/components/MapstackApp.tsx` — top-level app shell.
- `src/components/MultiLayerMap.tsx`, `HeatmapLayer.tsx` — map + heatmap rendering.
- `data/` — committed, build-time-baked datasets + their methodology docs.
- `scripts/gen_crime_data.py`, `fetch_crime_agencies.py` — data-generation pipeline
  for the crime dataset (raw fetch caches are gitignored; derived JSON is committed).
- `scripts/secret-scan.mjs` — the required CI gate (`pnpm test:secrets`) that blocks
  any secret from landing in the repo or client bundle.
- `src/lib/db/build-database.ts`, `scripts/build-sqlite.ts` — compiles
  `public/data.sqlite` at build time (chained into `pnpm build`/`pnpm dev`,
  not an npm-style pre/post hook — see design-note.md for why).
- `src/lib/db/client.ts` — lazy client-side sql.js loader + `query()` helper;
  the only place that fetches `data.sqlite`/the wasm binary.

## Conventions

- Fully open source (MIT) — assume every file is public, no secrets, ever.
- Cost ≈ $0 — static site generation, no required backend or API key.
- Transparent scoring — every layer decomposes into components with a
  plain-language methodology doc; no claimed precision beyond what the source
  data supports.
- Gradients, not buckets — continuous heatmaps with visible confidence, never
  state fills or a single scary headline number.
- A dataset is a wrapper, not a rewrite — new layers implement the `Dataset`
  interface rather than a bespoke rendering path.

## Canonical references

- `README.md` — project pitch, principles, origin story.
- `src/lib/datasets/types.ts` — canonical Dataset interface + design rationale
  (comments cite allergy-locator's `.pHive/planning/roadmap.md` v5).
- `data/*-methodology.md`, `data/*-scoring.md` — per-dataset methodology.
- `~/Code/allergy-locator` — sibling/predecessor project; already Hive-enabled,
  shares `developer` preferences and the secret-scan gate convention.
