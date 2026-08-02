# Design Note: Client-Side Data Store (Phase 1)

Lighter-weight than a full design-discussion — this is a fast-moving
architecture decision recorded for future reference, not a full planning
ceremony. Written after the operator confirmed direction (client-side
SQLite/WASM now, hosted Postgres + auth later, pending an OSS-longevity
deep-dive before committing to that stack).

## Goal

Move from "data baked into JS-imported JSON, queried via plain TS functions"
to "data compiled into one queryable SQLite file, queried with real SQL
entirely in the browser" — unlocking real search/filter/sort as the app
grows toward country-wide scale, while staying $0-cost, fully static, no
backend. This is explicitly **Phase 1** of a two-phase plan; Phase 2 (real
user accounts, write access, community data) is a deliberately separate,
much bigger pivot — see Deferred below.

## Decision: sql.js, not wa-sqlite / @sqlite.org/sqlite-wasm

Researched all three current options (see agent research, 2026-08).
**sql.js** was chosen because this is a **read-only** workload (the database
is rebuilt at build time, never mutated client-side): sql.js needs no
SharedArrayBuffer, no OPFS, no `Cross-Origin-Embedder-Policy`/
`Cross-Origin-Opener-Policy` headers — it just fetches the `.wasm` and the
`.sqlite` file as plain static assets and queries in memory. wa-sqlite and
the official sqlite-wasm build both exist primarily to support persistent,
*writable*, cross-origin-isolated storage (OPFS), which buys nothing here
and would require header configuration that's awkward through the Vercel
multi-zone rewrite this app is already mounted behind.

Growth path if the DB ever gets too large to ship eagerly:
[`sql.js-httpvfs`](https://github.com/phiresky/sql.js-httpvfs) (same sql.js
core + HTTP Range-request paging) — not needed at current scale (168
cities, ~1MB compiled).

## Build pipeline

- `src/lib/db/build-database.ts` — pure, testable: builds the schema and
  populates it by calling the **real** `DATASETS` registry's `getValue()`
  for every city/layer/(year), the same function every UI component calls.
  This is a queryable *projection* of the existing Dataset interface, never
  a second implementation of scoring logic (percentile ranks, tier lookups,
  etc. stay defined exactly once, in `src/lib/datasets/*.ts`).
- `scripts/build-sqlite.ts` — thin CLI wrapper (run via `tsx`, no native
  compilation): calls `buildDatabase()`, exports the bytes to
  `public/data.sqlite`, and copies sql.js's `sql-wasm-browser.wasm` into
  `public/` too (its default `locateFile` request target when bundled for
  the browser).
- `package.json` `dev`/`build` scripts now explicitly chain
  `pnpm build:sqlite &&` first — **not** npm-style `pre`/`post` hooks,
  because pnpm 8 (this project's pinned version) doesn't run those by
  default; explicit chaining works regardless of pnpm version/config, which
  matters for reproducing the same build on Vercel.
- `public/data.sqlite` and `public/sql-wasm-browser.wasm` are gitignored —
  deterministic build output, not source.

**Rejected: better-sqlite3** for the build step. Its native module failed to
compile locally (`node-gyp` → Python `distutils` missing, removed in modern
Python). sql.js itself builds the database just as well in Node (same
engine that later queries it in the browser), with zero native-compilation
risk on this or any other build machine — a strictly better fit here even
though better-sqlite3 is the more common choice for pure build-time-only
Node scripts.

## Schema

`cities`, `datasets`, `dataset_years`, `layers`, `layer_values` (the
per-city/dataset/layer/year value + tier + detail — the fact table).
Indexed on `(dataset_id, layer_id, year)` and on `cities.city`/`cities.state`
for search. No row is inserted for a null `getValue()` result — honest gaps
stay gaps, never a fabricated 0 (matches the existing app-wide convention).

## First feature built on it

`CitySearch.tsx` — real `LIKE`-based search across city/state name,
demonstrating the new capability directly (search wasn't practical to
hand-roll well over the old plain-array approach). Selecting a result reuses
the existing shared-city-selection plumbing from the power-user-tab epic
(`useSharedViewParams`), including scrolling the selected row into view in
`ComparisonTable`.

## Deferred (Phase 2 and beyond)

- **Write access / user accounts / community data** (ratings, comments,
  imported datasets, political-poll-style user-submitted data) — explicitly
  NOT this phase. Operator's stated direction: Vercel + Neon (Postgres) +
  Clerk, all on free tiers, but **only after a deep-dive on which of those
  actually stays free/maintained long-term for an OSS project** — that
  research is a prerequisite to starting Phase 2, not assumed here.
- **CSV/user data import** — still deferred from the power-user-tab epic;
  Phase 2's write-access work is the more natural home for it than bolting
  it onto the read-only SQLite file.
- Full-text ranking/relevance beyond simple `LIKE` — not needed at this
  city-name-search scale; revisit if search quality becomes a real
  complaint.
