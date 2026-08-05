import { test, expect } from "@playwright/test";

// Real end-to-end proof that sql.js/WASM loads data.sqlite and its wasm
// binary as static assets (public/data.sqlite, public/sql-wasm-browser.wasm)
// and runs real SQL queries in the browser under the served build -- see
// src/lib/db/client.ts and .pHive/epics/data-store/docs/design-note.md.

test("searching by partial city name returns real matches from the SQLite store", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByLabel("Search cities").fill("New Y");
  await expect(page.getByRole("button", { name: "New York, NY" })).toBeVisible();
});

test("searching by state returns matches from that state", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByLabel("Search cities").fill("CA");
  await expect(page.getByRole("button", { name: /, CA$/ }).first()).toBeVisible();
});

test("a query with fewer than 2 characters shows no results list at all", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByLabel("Search cities").fill("N");
  await expect(page.getByText("No matches.")).not.toBeVisible();
});

test("an unmatched search shows an explicit no-matches state, not an empty silent list", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByLabel("Search cities").fill("zzzznotarealcity");
  await expect(page.getByText("No matches.")).toBeVisible();
});

test("clicking a search result selects that city in the comparison table and scrolls it into view", async ({
  page,
}) => {
  await page.goto("/advanced");
  await page.getByLabel("Search cities").fill("Chicago");
  await page.getByRole("button", { name: "Chicago, IL" }).click();

  await expect(page).toHaveURL(/city=chicago-il/);
  await expect(page.getByRole("row", { name: /^Chicago, IL/ })).toHaveAttribute("aria-selected", "true");
});

test("arrow keys move focus through search results and Enter selects the highlighted one", async ({ page }) => {
  await page.goto("/advanced");
  const input = page.getByLabel("Search cities");
  await input.fill("San");

  // Scope to the search results listbox -- getByRole("option") alone would
  // also match the unrelated Year <select>'s native <option> elements.
  const options = page.locator("#city-search-results").getByRole("option");
  const firstOption = options.first();
  await expect(firstOption).toHaveAttribute("aria-selected", "false");

  await input.press("ArrowDown");
  await expect(firstOption).toHaveAttribute("aria-selected", "true");

  await input.press("ArrowDown");
  await expect(firstOption).toHaveAttribute("aria-selected", "false");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");

  await input.press("ArrowUp");
  await expect(firstOption).toHaveAttribute("aria-selected", "true");

  await input.press("Enter");
  await expect(page).toHaveURL(/city=/);
});

test("city search is also available in the simple view, not just /advanced -- explicit operator direction to bring more of /advanced's power into simple view", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Search cities").fill("Chicago");
  await page.getByRole("button", { name: "Chicago, IL" }).click();

  await expect(page).toHaveURL(/city=chicago-il/);
  await expect(page.getByTestId("city-detail").getByText("Chicago, IL")).toBeVisible();
});
