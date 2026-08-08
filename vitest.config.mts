import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["./tests/setup.ts"],
    // build-database.test.ts/insights.test.ts build a real in-memory sqlite
    // DB from every dataset's real data in a beforeAll hook -- as real
    // historical depth keeps growing (83,788 layer values and rising), that
    // build genuinely takes longer than vitest's 10s default hook timeout on
    // CI's weaker hardware (passes locally, timed out in CI once real data
    // volume grew this round). Raised with real headroom, not shaved to the
    // minimum that happened to pass once.
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@data": path.resolve(__dirname, "./data"),
    },
  },
});
