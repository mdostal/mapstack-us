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
const nextConfig: NextConfig = {
  basePath: process.env.E2E_NO_BASE_PATH ? undefined : "/mapstack",
};

export default nextConfig;
