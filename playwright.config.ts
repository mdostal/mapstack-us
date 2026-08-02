import { defineConfig } from "@playwright/test";

// The production app is mounted at basePath "/mapstack" (next.config.ts),
// but existing specs navigate with a LEADING slash (page.goto("/")), which
// resolves against the origin only per the WHATWG URL spec -- see
// allergy-locator's identical comment/fix. The E2E server runs with
// basePath disabled instead.
export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { E2E_NO_BASE_PATH: "1" },
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
