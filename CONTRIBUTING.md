# Contributing

Mapstack is MIT-licensed and genuinely open to contributions — the most
useful one by far is a new real dataset. This doc is the walkthrough the
[in-app About page](https://tools.mdostal.com/mapstack/about) and README
both point to but never spelled out.

## Ground rules

- **Real data only.** Every layer here is sourced from a real government,
  academic, or otherwise verifiable dataset — never a placeholder, a guess,
  or synthetic filler. The one exception (allergy severity) is a modeled
  *score*, not modeled *data*, and says so explicitly in its own
  methodology doc. If your dataset is directional or has real coverage
  gaps, document that honestly rather than smoothing it over — see any
  existing `data/*-methodology.md` for the tone.
- **Keyless preferred, keyed is fine.** About a third of datasets need a
  free, self-serve API key (Census, FBI, BLS, BEA, EIA — see
  `.env.example`). A keyless source is a nicer contributor experience but
  isn't a hard requirement.
- **No secrets, ever.** `.env` is gitignored and `pnpm test:secrets` scans
  for known key shapes landing in the repo or the built client bundle —
  this is a real CI gate, not a suggestion.

## Adding a new dataset

1. **Implement the `Dataset` interface** — one new file at
   `src/lib/datasets/{id}.ts`. Read
   [`src/lib/datasets/types.ts`](src/lib/datasets/types.ts) in full first;
   the hard contract is `getValue()` returning a 0-100 value on a
   **"higher = more concerning"** scale (so the shared color ramp works
   unmodified) plus a short human-readable `detail` string. Return `null`
   for a real "no data for this city" gap — never a fabricated value.
   Pick an existing simple dataset (`src/lib/datasets/heat.ts` is a good
   template) to see the shape in practice.

   If your dataset's own name reads positively (e.g. "Electoral
   competitiveness", "Housing supply") but a high score is the *bad* end,
   set `legendLow`/`legendHigh` on the layer so the map legend doesn't
   read backwards at a glance — see `income.ts` or `political-lean.ts`
   for the pattern. Both must be set together, or neither.

2. **Write the methodology doc** — `data/{id}-methodology.md`, plain
   language: what the raw source is, exactly how the 0-100 score is
   derived, real coverage numbers, and known gaps. This is the single most
   important file for keeping the project honest — see any existing one
   for the expected depth.

3. **Register it** — add the import and one line to the `DATASETS` array
   in [`src/lib/datasets/registry.ts`](src/lib/datasets/registry.ts). That
   array is the single source of truth; the map, legend, detail panel,
   `/advanced` table, and dataset picker all render any entry in it with
   zero additional wiring.

4. **Add its real source to the Sources page** — one entry in
   `DATASET_SOURCES` in
   [`src/lib/dataset-sources.ts`](src/lib/dataset-sources.ts) (name + URL
   + an optional note), so `/sources` links to the real upstream data
   provider, not just your own methodology doc.

5. **Write the unit test** — `tests/{id}-dataset.test.ts`. At minimum:
   the dataset conforms to the interface shape, a real covered city
   returns a real value in `[0, 100]`, and a real gap (if one exists)
   returns `null` rather than a fabricated fallback.

6. **Make sure your dataset's `label` shows up in two more places**: the
   e2e spec (`tests/e2e/mapstack.spec.ts` — following the existing "the
   Nth dataset ... is selectable and reports a real value" pattern is the
   easiest way) and `README.md`'s dataset list.

   Steps 2–6 are not just style guidance — `tests/dataset-completeness.test.ts`
   walks the real `DATASETS` registry and fails on any entry missing one
   of these four artifacts. `pnpm test` will tell you exactly what's
   missing.

7. **Run the full check before opening a PR**:

   ```
   pnpm verify
   ```

   (typecheck, lint, unit tests, secret scan, build, and the full
   Playwright e2e suite — the same gate CI runs on every push).

8. **Open a pull request.** Small and self-contained is easiest to
   review — one dataset per PR.

## Reproducing or adding a keyed dataset's data pipeline

If your dataset needs a live API pull, add a one-off script under
`scripts/` (Python, matching the existing `gen_*.py` convention) that
writes `data/{id}.json` from the real source, committed alongside your
code so `pnpm dev`/`pnpm build` never need to hit a live API. See
`.env.example` for the real keys already in use and where to get one.

## Anything else

Bug reports, accessibility fixes, and doc corrections are just as welcome
as new datasets — [open an issue](https://github.com/mdostal/mapstack-us/issues)
or send a PR directly.
