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
| **Turso (libSQL)** | ~500 DBs / 9 GB storage / 1B row reads/mo | SQLite-dialect | Prototyped locally 2026-08-02, no account needed — see below |
| **PlanetScale** | **None** — killed April 2024 | Proof this class of free tier isn't durable | Skip |
| **Railway / Fly.io** | **None** — trial credits only, both cut 2023-24 | Same pattern | Skip |

Storage (0.5 GB), not compute, is the realistic first ceiling on Neon's
free tier for a small OSS project — plan the schema with that in mind.
Neon's paid Launch tier has no monthly minimum: $0.106/CU-hr + $0.35/GB-mo,
which is a genuinely low-stakes overflow if/when Free is exceeded.

### Turso prototype findings (local-only, no account created)

Actually ran `@libsql/client` against `file:local-test.db` — schema create,
batched inserts, a `LIKE` query — entirely offline, zero signup, using only
`npm install @libsql/client` in a scratch directory (never touched this
repo's `package.json`). It works exactly like a local SQLite file. Two
things this corrects from the initial (desk-research-only) read:

- **`@libsql/client` is a Node-native client** (a compiled `libsql` binary
  under the hood), not a browser/WASM client. It is **not** a candidate to
  replace `sql.js` in Phase 1 (the browser-side query engine) — it would
  only ever be a Phase 2 **server-side** database accessed from Next.js API
  routes, the same role Neon would play.
- `@tursodatabase/serverless` (the zero-native-dependency, `fetch()`-only
  variant, better suited to Vercel's serverless functions) does **not**
  have a local/offline mode — it requires a live Turso Cloud
  `TURSO_DATABASE_URL` + `authToken`. The local-file prototype above used
  `@libsql/client`, not this package.
- "Embedded Replicas" (a local file kept in sync with a remote Turso DB,
  giving local-file read latency without giving up a shared/multi-reader
  database) is the actually-relevant Turso feature for a low-latency Phase
  2 setup — worth a second prototype (this one needs a real account) before
  a final Neon-vs-Turso call, but that's future work, not done here.

Net effect on the recommendation: Turso remains a real, viable Neon
alternative for Phase 2's server-side database, and the "one SQL dialect
across the stack" argument still holds (same SQL syntax/mental model as
Phase 1's `data.sqlite` queries) — but it was never going to let Phase 1's
client-side query layer be swapped out, and it doesn't remove the need for
a real account eventually if this path is chosen.

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

## Public multi-tenant affordability (revisited, 2026)

Researched 2026-08-02 via live web search + direct fetches of vendor
pricing/docs pages (not training-data recall — these plans change often
enough that stale numbers would be actively misleading). The question
this section answers is sharper than the original TL;DR: **assuming Phase
2 gets real strangers-on-the-internet usage, not just the maintainer, at
what point does Neon + Clerk + Vercel stop being effectively free?**

### Current numbers (verified 2026-08-02)

**Neon** ([neon.com/pricing](https://neon.com/pricing)):

| Tier | Terms |
|---|---|
| Free | 0.5 GB storage, **100 CU-hours/mo compute** (doubled from 50 in Oct 2025), 5 GB public egress/mo, 10 branches/project, 6-hour/1 GB point-in-time-restore window |
| Launch (first paid tier) | **No base fee, no monthly minimum** — pure usage: $0.106/CU-hour + $0.35/GB-month storage; 500 GB egress included, then $0.10/GB; extra branches $1.50/branch-month |
| Scale | $0.222/CU-hour, higher autoscale ceiling (up to 16 CU, or fixed up to 56 CU), private networking |

1 CU = 1 vCPU + 4 GB RAM. Compute **autosuspends after 5 minutes of
inactivity** on Free, and CU-hours are only metered while the compute is
awake — this mechanic matters a lot for the scenarios below.

**Clerk** ([clerk.com/pricing](https://clerk.com/pricing)):

| Tier | Terms |
|---|---|
| Free (Hobby) | **50,000 MRU/app** (Monthly *Retained* Users — people who actually sign up and keep an account, not raw site visitors), unlimited apps |
| Pro | $25/mo month-to-month ($20/mo billed annually) base, includes the same 50,000 MRU, then **$0.02/MRU overage** (volume discount down to $0.012/MRU past 10M) |

Clerk raised its free cap from 10k to 50k MRU on Feb 5, 2026 — a
materially more generous change than the original CBA assumed.

**Vercel** ([vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby), [fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)):

| Hobby (free) resource | Included |
|---|---|
| Function invocations | 1,000,000/mo |
| Active CPU (billed only while code is *executing*, not waiting on I/O) | 4 CPU-hours/mo |
| Provisioned memory | 360 GB-hours/mo |
| Edge requests | 1,000,000/mo |
| Deployments / projects | 100/day, 200 projects |

Pro is **$20/user/month** (seat-based) plus a $20 usage credit, 10M edge
requests, 1 TB fast data transfer; overages beyond the credit run
$0.128–$0.221/Active-CPU-hour (region-dependent) and ~$0.18/GB-hour
provisioned memory.

**Critical ToS finding:** Vercel's Fair Use Guidelines state plainly —
*"the Hobby plan restricts users to non-commercial, personal use
only,"* and defines commercial usage as *"any Deployment that is used
for the purpose of financial gain of anyone involved in any part of the
production of the project... including but not limited to any method of
requesting or processing payment from visitors of the site."* This
confirms and sharpens the original CBA's donations finding: it is
specifically about **financial gain** (payments, ads, paid
employees/consultants working on it), not raw traffic volume. A
donation-free, ad-free OSS project with thousands of real public users
is not automatically a ToS violation on Hobby — but it will very likely
hit the *technical* caps (Active CPU especially, see below) well before
that becomes purely academic.

### Three usage scenarios, modeled

The dominant, easy-to-miss cost driver isn't raw request volume — it's
Neon's scale-to-zero mechanic. Every time the database wakes from
suspend, it stays billably awake until 5 idle minutes pass. If user
sessions arrive more than 5 minutes apart (true for almost any
low-to-moderate-traffic public app spread across a day), **the number of
distinct "wake events" drives CU-hour consumption far more than actual
query execution time does.** The figures below are order-of-magnitude
estimates from that mechanic plus the published rates — not a quoted
bill — but the direction of the finding is the important part.

| Scenario | Assumptions | Neon | Clerk | Vercel | **Realistic total/mo** |
|---|---|---|---|---|---|
| **A. 500 MAU** | Light community tool use: browsing (reads) + occasional write (save a view, submit a data point), sessions spread through the day, no read-caching | Likely tips past the 100 CU-hr free cap purely from wake events, even though actual query time is trivial; overage is small at this scale | Free (500 ≪ 50k MRU) | Free (well under all Hobby caps) | **$0–$20** — right on the free-tier boundary already |
| **B. 5,000 MAU** | Real public traffic; some fraction contribute writes | Past free tier on both storage and compute; Launch-tier usage-based billing | Free (5,000 ≪ 50k MRU) | Active-CPU's 4-hr/mo Hobby cap is the realistic binding constraint (not invocations) — pushes to Pro | **~$55–$110** ($20 Vercel Pro seat + ~$35–90 Neon usage) |
| **C. 50,000 MAU** | Genuine public-scale traffic, meaningful write volume, growing dataset | Solidly in Launch/Scale usage-based territory on compute, storage, and egress | Sitting right at/over the 50k free ceiling — Pro base + overage | Real Active-CPU and data-transfer overages beyond the Pro credit | **~$200–$500+** — a genuine recurring budget line |

### Bottom line

The free-tier ceiling for this stack is **lower and fuzzier than
intuition suggests** — Clerk's 50k MRU is genuinely generous and Vercel
Hobby's request/invocation caps are generous too, but **Neon's
scale-to-zero wake-tax means the *database* can slip out of "fully free"
at only a few hundred real MAU** if reads hit Postgres directly on every
page view with no caching. That said, the *dollar* consequence of
slipping out of free stays small (single-digit to ~$20/mo) until
somewhere in the **low thousands of MAU**, where Vercel's Active-CPU cap
(not its invocation cap — that's the counterintuitive part) forces a
$20/mo Pro seat and Neon's overage compounds into a real number. Past
roughly **5,000–10,000 MAU**, budget **$50–150/mo** combined; past
**~50,000 MAU**, budget **$200–500+/mo**. Clerk is very unlikely to be
the cost driver at any of these levels given the Feb 2026 cap increase —
Neon (compute wake-tax) and Vercel (Active CPU, then seat count) are.

**Yes, there is a real structural way to keep this cheap well past
"personal project" scale**, and it's the same shape the original CBA's
"can wait" list already gestures at:

- **Read-heavy/write-light by design**: serve dataset reads from
  Vercel's edge/ISR cache or periodically-regenerated static snapshots
  instead of querying Postgres on every page view. This directly
  attacks the wake-tax mechanic, since Neon only needs to wake for
  actual writes or scheduled cache refreshes, not every visitor.
- **Auth only on the write path**: Clerk bills *retained* users who
  create accounts, not anonymous readers. If browsing/search stays
  unauthenticated and only contributors (adding/editing data) need an
  account, the MRU count — and therefore Clerk's cost — stays tied to
  the much smaller "people who contribute" population, not total
  traffic. This fits Mapstack's community-data vision well: most
  visitors would only ever read.
- **Rate limits on writes** (already flagged "can wait" above, but
  becomes "do it" once public write traffic is non-trivial): bounds both
  abuse risk and the number of Neon wake events any single bad actor can
  trigger.
- **Batch/consolidate DB access**: a scheduled job that batches
  writes/reads instead of triggering a wake on every individual user
  action reduces the count of billable wake windows directly.
- **Keep the ToS question decided early** (per the original TL;DR): as
  long as there's no payment processing, ads, or paid contributor
  compensation tied to the project, Hobby's "non-commercial" clause
  itself is not the forcing function — the Active-CPU technical cap is.
  That's a lower bar to stay under than "no real usage," and worth
  knowing precisely, but it will still eventually be crossed by success,
  not by a ToS technicality.

**Net effect on Phase 2 timing:** the original recommendation — build it
when there's concrete demand for write access, not before — still holds,
and this deeper dive doesn't change that. What it adds is a concrete
number: Phase 2 can credibly stay near-$0 through low-thousands of MAU
*if* the read-heavy/auth-on-write-only pattern is used from day one, and
even unoptimized, the "oh no it's not free anymore" moment tops out
around $20–100/mo at moderate scale, not a cliff. There isn't a
plausible near-term Mapstack usage level where this stack becomes
unaffordable outright — the real risk this section surfaces is
architectural (an unbatched, cache-less design burning Neon compute
early), not financial.
