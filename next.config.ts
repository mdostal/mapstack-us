import type { NextConfig } from "next";

/**
 * Mounted at tools.mdostal.com/mapstack via a multi-zone rewrite in the
 * mdostal-tools-hub repo (see that repo's README). basePath makes every
 * internal link/redirect and /_next/* asset request this app emits already
 * carry the /mapstack prefix, so the hub's rewrite (which forwards that
 * same prefixed path straight through) just works -- Vercel's own
 * documented mechanism for this exact multi-zone setup.
 *
 * E2E_NO_BASE_PATH (set only by playwright.config.ts's webServer) disables
 * basePath for the local E2E test server -- see next.config.ts's identical
 * comment in allergy-locator for the full WHATWG-URL-leading-slash reason
 * this is necessary rather than editing every spec's page.goto("/...") call.
 */
const BASE_PATH = process.env.E2E_NO_BASE_PATH ? "" : "/mapstack";

const nextConfig: NextConfig = {
  basePath: BASE_PATH || undefined,
  // Client code that fetches static assets directly (e.g. src/lib/db/client.ts
  // loading data.sqlite + the sql.js WASM binary from public/) can't rely on
  // Next's automatic basePath rewriting -- that only covers <Link>/<Image>/
  // router navigation. NEXT_PUBLIC_* vars are inlined at build time, so this
  // stays in sync with the real basePath decision above instead of a second
  // hardcoded "/mapstack" string.
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

export default nextConfig;
