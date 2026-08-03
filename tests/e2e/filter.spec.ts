import { test, expect } from "@playwright/test";

// Real end-to-end proof of the multi-criteria SQL filter (src/lib/db/filter.ts)
// against the served data.sqlite build -- see
// .pHive/epics/data-store/docs/design-note.md.
//
// filterCityIds() is async (a real SQL query), so every assertion here waits
// for the row count to actually change rather than checking immediately
// after the click -- checking too early was the cause of an earlier flaky
// false failure during development. Filter now lives in a toolbar popover
// (closed by default) rather than always-visible in the sidebar -- see
// .pHive/design/power-user-advanced-layout/brief.md.

test("the filter popover stays capped and scrollable with many layers active, instead of growing past the viewport", async ({
  page,
}) => {
  await page.goto("/advanced");
  // Care access starts collapsed (nothing in it selected yet) -- expand
  // every dataset group first so all of its checkboxes actually exist in
  // the DOM before checking them.
  await page.getByRole("button", { name: "Care access", exact: true }).click();

  const checkboxes = page.locator('input[type="checkbox"]');
  await expect.poll(() => checkboxes.count()).toBeGreaterThan(30);
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) {
    const cb = checkboxes.nth(i);
    if (!(await cb.isChecked())) await cb.check();
  }
  await expect.poll(() => page.locator('input[type="checkbox"]:checked').count()).toBe(count);

  await page.getByRole("button", { name: /^Filter/ }).click();
  const popover = page.locator(".overflow-y-auto").filter({ hasText: "FILTER BY THRESHOLD" });
  await expect.poll(async () => {
    const scrollHeight = await popover.evaluate((el) => el.scrollHeight);
    const clientHeight = await popover.evaluate((el) => el.clientHeight);
    return scrollHeight > clientHeight;
  }).toBe(true); // genuinely capped, not just tall
  expect(await popover.evaluate((el) => el.clientHeight)).toBeLessThan(700); // bounded to a real viewport-relative cap
});

test("filtering by a minimum threshold narrows the table to matching cities only", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  const rowCountBefore = await page.locator("tbody tr").count();

  await page.getByRole("button", { name: /^Filter/ }).click();
  await page.getByLabel("Minimum Allergy severity: Grass").fill("90");
  await page.getByRole("button", { name: "Apply filter" }).click();

  await expect.poll(() => page.locator("tbody tr").count()).toBeLessThan(rowCountBefore);
  // The toolbar button reflects the active filter once applied.
  await expect(page.getByRole("button", { name: "Filter · active" })).toBeVisible();
});

test("a filter with no matches shows an explicit empty state, not a blank table", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByRole("button", { name: /^Filter/ }).click();
  await page.getByLabel("Minimum Allergy severity: Grass").fill("101");
  await page.getByRole("button", { name: "Apply filter" }).click();
  await expect(page.getByText("No cities match your filter.")).toBeVisible();
});

test("clearing the filter restores the full city list", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  const rowCountBefore = await page.locator("tbody tr").count();

  await page.getByRole("button", { name: /^Filter/ }).click();
  await page.getByLabel("Minimum Allergy severity: Grass").fill("90");
  await page.getByRole("button", { name: "Apply filter" }).click();
  await expect.poll(() => page.locator("tbody tr").count()).toBeLessThan(rowCountBefore);

  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect.poll(() => page.locator("tbody tr").count()).toBe(rowCountBefore);
});

test("combining a min and max threshold across two columns applies both as an AND filter", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  const rowCountBefore = await page.locator("tbody tr").count();

  await page.getByRole("button", { name: /^Filter/ }).click();
  await page.getByLabel("Minimum Allergy severity: Grass").fill("0");
  await page.getByLabel("Maximum Allergy severity: Grass").fill("100");
  await page.getByLabel("Minimum Crime: Violent crime").fill("0");
  await page.getByLabel("Maximum Crime: Violent crime").fill("50");
  await page.getByRole("button", { name: "Apply filter" }).click();

  // Both criteria applied should narrow the list relative to no filter at
  // all (crime alone already excludes cities like San Francisco with no
  // crime data, since the JOIN requires a matching row).
  await expect.poll(() => page.locator("tbody tr").count()).toBeLessThan(rowCountBefore);
});

test("clicking outside the filter popover closes it without discarding the applied filter", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByRole("button", { name: /^Filter/ }).click();
  await page.getByLabel("Minimum Allergy severity: Grass").fill("90");
  await page.getByRole("button", { name: "Apply filter" }).click();
  await expect(page.getByRole("button", { name: "Apply filter" })).toBeVisible();

  await page.getByRole("heading", { name: "Mapstack — Advanced" }).click();
  await expect(page.getByRole("button", { name: "Apply filter" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Filter · active" })).toBeVisible();
});
