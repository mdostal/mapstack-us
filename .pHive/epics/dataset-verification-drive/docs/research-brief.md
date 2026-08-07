# Research brief — dataset-verification-drive

## Codebase state (verified by reading, not assumed)

- **27 real datasets** registered in `src/lib/datasets/registry.ts`, each implementing
  the `Dataset` interface (`src/lib/datasets/types.ts`): `id`, `label`, `description`,
  `methodologyUrl`, `supportsTime`, `layers[]`, `getValue(cityId, layerId)`.
- **Per-dataset convention, consistent across all 27**: one `src/lib/datasets/{id}.ts`
  wrapper, one `data/{id}.json` (or a real reason it's absent, e.g. computed inline),
  one `data/{id}-methodology.md`, one `tests/{id}-dataset.test.ts`, and one dedicated
  test block inside `tests/e2e/mapstack.spec.ts` (`"the Nth dataset (...) is
  selectable and reports a real ... value"`). Verified by grep — every existing
  dataset follows this shape with zero exceptions found.
- **48 unit test files, 305 passing tests** (`pnpm test`, vitest). **90 passing e2e
  tests** (`pnpm exec playwright test`).
- **No single command currently codifies the full ship ritual.** The actual sequence
  used every session (confirmed via this session's own repeated manual practice):
  `tsc --noEmit` → `lint` → `test` → `test:secrets` → clean `.next` rebuild → `build`
  → `playwright test` → live browser check (local + prod) → commit → push → `vercel
  --prod` → CI poll. `package.json` has each individual command as its own script but
  no single entrypoint runs them in order. This is real, load-bearing tribal knowledge
  that isn't enforced by tooling — a new contributor (or a future session without this
  conversation's context) could easily skip a step.
- **No automated check that a registered dataset actually has all its required
  artifacts.** A dataset could be added to `registry.ts` without a methodology doc, a
  unit test file, or an e2e spec entry, and nothing in `pnpm test` or CI would catch
  it. This has not happened yet (verified 27/27 have all four artifacts) but nothing
  currently prevents drift.

## Dataset backlog state (`.pHive/epics/data-store/docs/dataset-backlog.md`, 1056 lines)

Read in full. Of the 27 ranked candidates (#1-27), **every item ranked medium-or-higher
confidence has already been shipped**:

- #1-6, #8, #10-14, #16-19, #22-26 map directly to shipped datasets by name.
- #7 (FEMA NRI composite) and #9 (flood risk single-hazard) are **already covered** —
  not gaps. `hazard.ts` ships the FEMA National Risk Index as a composite plus
  inland-flood/coastal-flood/wildfire sub-layers, which is exactly what #7 and #9
  independently proposed. The backlog doc predates `hazard.ts` shipping all four
  layers at once.
- #15 (cost of living) shipped this session (`cost-of-living.ts`, BEA RPP).
- **Remaining, explicitly weak or ruled out**:
  - #20 Noise pollution — already investigated and ruled out this session (see memory
    `project_mapstack_ruled_out_candidates`), no usable free point/city-level source
    found (DOT National Transportation Noise Map is a raster GIS layer, not a
    per-city API or download).
  - #21 School quality — backlog's own confidence rating is "weak (proxy only,
    lowest confidence)". Not attempted yet this session.
  - #27 Household wealth/net worth — backlog's own confidence rating is "weak
    (modeled estimate, no city-level source, lowest confidence)".
  - **"Struck out: no usable free source found"** section (5 items: voter turnout,
    cost-of-living via C2ER/COLI [superseded by the real BEA RPP build], school-quality
    ratings via GreatSchools/Niche, total tax burden composite, sales tax via
    commercial API) — already investigated and rejected with reasons documented.

**Real implication for this epic's "data drive" half**: the existing backlog is
functionally exhausted for known, medium-confidence candidates. The honest next step
is a **fresh research sweep** for genuinely new candidates not yet in the backlog,
not "just build the next one on the list" — there isn't a good next one on the list.

## Existing verification patterns worth reusing

- `scripts/secret-scan.mjs` — a real, working example of a repo-wide static check
  wired into `pnpm test:secrets` and (per README) CI. Same shape (walk known dirs,
  assert an invariant per file, fail loud) is reusable for a dataset-completeness
  check.
- `tests/dataset-interface.test.ts` — proves the `Dataset` interface itself is
  usable via one hand-built mock dataset. It does **not** touch `registry.ts` or
  loop over the real 27 — there is currently no test that walks
  `DATASETS` (the actual registry array) and asserts each entry has its four
  required artifacts (methodology doc, unit test file, e2e spec entry, README
  bullet). That's the real gap this epic's testbed half closes.
