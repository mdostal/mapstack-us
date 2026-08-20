import { defineConfig, devices } from "@playwright/test";

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
  /**
   * chromium is CI's own default project (ci.yml only installs chromium
   * via `playwright install --with-deps chromium`, and its own
   * `pnpm test:e2e` step is unaffected by this array's other entries --
   * `playwright test` with no --project flag runs ALL configured
   * projects, so a bare CI run would now try firefox/webkit and fail on
   * missing browser binaries; ci.yml deliberately keeps CI scoped to
   * chromium only, both to avoid installing 2 more browsers on every
   * push and because this project's e2e suite already has real recurring
   * runner-infra flakiness on the chromium download step alone -- 3x'ing
   * that surface area isn't worth it for every push).
   *
   * firefox/webkit/mobile-chrome are real, available locally and for a
   * manual/scheduled cross-browser run:
   *   pnpm exec playwright test --project=webkit
   *   pnpm exec playwright test --project=firefox
   *   pnpm exec playwright test --project="Mobile Chrome"
   */
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 7"] } },
  ],
});
