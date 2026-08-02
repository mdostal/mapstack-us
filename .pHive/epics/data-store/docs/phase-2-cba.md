# Phase 2 Cost-Benefit Analysis: Hosted Postgres + Auth

**Status:** Research complete, decision NOT yet made. Phase 1 (client-side
SQLite, see `design-note.md`) is live and unaffected by this document.
This CBA is what unlocks Phase 2 — write access, user accounts, saved
data across devices, community contributions — when it's actually needed.

Researched 2026-08-02 via three parallel deep-dives: Neon (database),
Clerk (auth), Vercel hosting + general security practices. Full source
citations are in each research pass; this document synthesizes the
decision, not the raw research.

## TL;DR recommendation

**Database:** Neon is a reasonably safe bet, but budget for its usage-based
paid tier (no free-tier price floor guaranteed) rather than assuming Free
stays viable forever — the sector has a track record of free tiers dying
(PlanetScale, Railway, Fly.io all cut theirs 2023-2024). **Turso is worth a
real prototype** before committing to Neon, given mapstack-us already
speaks SQLite client-side (Phase 1) — reusing that dialect server-side
would mean one query language across the whole stack instead of two.

**Auth:** Skip Clerk. Given this project's OSS/$0-forever ethos, **Better-
Auth** (MIT-licensed, actively maintained, absorbed the Auth.js team in
2025, 28k+ GitHub stars) eliminates vendor-billing risk permanently for a
small amount of self-maintenance — a better fit than a proprietary SaaS
with a pricing model that's already changed once (Feb 2026). Do not use
Lucia (dead, maintainer-deprecated March 2025) or new Auth.js adoption
(maintenance-mode only now).

**Hosting:** Vercel Hobby stays viable for the backend work itself (1M
function invocations/mo is generous for hobby traffic) — but the moment
this project takes donations/sponsorships, Vercel's own Fair Use terms
classify that as commercial use, forcing Pro ($20/mo). Decide the
donations question *before* Phase 2 starts, since it changes the cost
floor regardless of database/auth choice.

## Database: Neon vs. alternatives

| Vendor | Free tier (2026) | Stability signal | Verdict |
|---|---|---|---|
| **Neon** | 0.5 GB storage, 100 CU-hrs/mo compute, 5 GB egress, 10 branches/project | Acquired by Databricks (May 2025); post-acquisition prices *dropped* (storage -80%, compute effectively +100%), but no explicit long-term free-tier commitment | Safe **for now**; open-source storage engine gives a real (if effortful) exit path via `pg_dump` |
| **Supabase** | 500 MB DB, 1 GB storage, 5 GB egress, 50k MAU | More genuinely OSS-committed, real self-host path | Best fallback if Neon's free tier is ever cut |
| **Turso (libSQL)** | ~500 DBs / 9 GB storage / 1B row reads/mo | SQLite-dialect at the edge | **Worth prototyping first** — reuses the SQLite skills/schema this project already has from Phase 1; verify libSQL/SQLite feature parity before committing |
| **PlanetScale** | **None** — killed April 2024 | Proof this class of free tier isn't durable | Skip |
| **Railway / Fly.io** | **None** — trial credits only, both cut 2023-24 | Same pattern | Skip |

Storage (0.5 GB), not compute, is the realistic first ceiling on Neon's
free tier for a small OSS project — plan the schema with that in mind.
Neon's paid Launch tier has no monthly minimum: $0.106/CU-hr + $0.35/GB-mo,
which is a genuinely low-stakes overflow if/when Free is exceeded.

## Auth: Clerk vs. alternatives

| Option | Cost model | Maturity | Verdict |
|---|---|---|---|
| **Clerk** | Free to 50k MRU, then $25/mo Pro baseline | Mature, SOC 2 Type II, but pricing model already changed once (Feb 2026) and had a public 90-min outage (Feb 2026) | Comfortably covers this project's real scale, but is a proprietary dependency with recurring pricing risk |
| **Better-Auth** | $0 forever (MIT core) | Production-ready, 28k+ stars, YC-backed, absorbed the Auth.js team | **Recommended** — matches the project's OSS/no-recurring-bill posture |
| **Supabase Auth** | Free to 50k MAU, bundled with DB | Mature | Reasonable if Supabase is also chosen for the database (one vendor, not two) |
| Auth.js/NextAuth | $0, self-hosted | Now maintenance-mode only (team moved to Better-Auth) | Don't adopt fresh in 2026 |
| Lucia | — | **Dead** (deprecated March 2025) | Do not use |

Clerk's real risk isn't hitting the free-tier cap (50k MRU is very
unlikely to matter at this project's scale) — it's recurring dependency on
a vendor whose pricing model has already shifted once and whose auth
engine is entirely closed-source. Better-Auth avoids that risk category
entirely, at the cost of owning session/patch maintenance directly.

## Hosting + security must-dos (apply regardless of DB/auth choice)

**Must-do before adding any backend:**
- Decide the donations/sponsorship question first — it determines whether
  Vercel Hobby stays viable or Pro ($20/mo) is required from day one.
- Parameterized queries only, everywhere — no string-built SQL.
- Keep all backend secrets server-only, never `NEXT_PUBLIC_`-prefixed,
  scoped per Vercel environment; keep the existing `pnpm test:secrets`
  gate running (it's a real, working check, but pattern-based — pair it
  with code-review discipline, it won't catch every leak shape).
- CSRF defense (Origin/Referer check + `SameSite` cookies) on any Route
  Handler that mutates state — Server Actions get this for free, plain API
  routes do not.
- A plain-language privacy policy + an account/data-deletion path, the
  moment real accounts/emails exist (GDPR Art. 17, ~1 month to honor).

**Can wait:**
- Distributed rate limiting (Upstash) — once public write traffic is
  non-trivial, not before.
- Postgres Row-Level Security — valuable defense-in-depth once a client
  can query the DB directly (Supabase-style); lower priority if the DB is
  only ever reached through this app's own server code.
- Cookie-consent banner — only once non-essential (analytics/ads) cookies
  are added; the auth session cookie itself doesn't need it.
- Formal DPO / Art. 30 processing register — enterprise-scale overkill
  here.

## What would trigger starting Phase 2

Per the operator's own framing: Phase 1 can keep expanding (more datasets,
richer search/filter, more of the "country-wide metrics" vision) without
touching any of this. Phase 2 becomes worth starting when there's an
actual, concrete need for **write access** — e.g., real users wanting to
save a view across devices (not just localStorage), or the first genuine
community-contributed dataset/rating. Until then, this document is the
reference to return to, not a queue of pending work.
