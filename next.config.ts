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

/**
 * BYOK chat keys (Anthropic/OpenAI/Google) sit in the browser's localStorage
 * (see ChatPanel.tsx) and are read only by src/lib/chat/agent.ts, which
 * calls each provider's own default API host directly from the client --
 * no Mapstack server ever sees them. A CSP is real defense-in-depth for
 * that specific risk: even if some future XSS got script execution, a
 * locked-down connect-src stops it from fetching a key to an attacker
 * origin, and frame-ancestors stops clickjacking outright rather than
 * relying on the legacy X-Frame-Options header alone.
 *
 * 'unsafe-inline' in script-src is required for next-themes' pre-hydration
 * theme-flash-prevention script; a nonce-based CSP isn't practical here
 * since every route in this app is statically generated (no per-request
 * server to mint a fresh nonce). 'unsafe-inline' in style-src covers this
 * app's own React inline styles. 'wasm-unsafe-eval' (not the broader
 * 'unsafe-eval') is scoped narrowly to let sql.js compile its WASM binary
 * (src/lib/db/client.ts) without allowing eval()/Function().
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
