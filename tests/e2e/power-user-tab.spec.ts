import { test, expect } from "@playwright/test";

test("advanced route renders a comparison table for the default 2 selected layers", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.getByRole("heading", { name: "Mapstack — Advanced" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Allergy severity: Grass/ })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Crime: Violent crime/ })).toBeVisible();
  // Methodology note is in the column header, not hidden -- see design-discussion.md §3.2.
  await expect(page.getByRole("columnheader", { name: /Allergy severity: Grass/ })).toContainText(
    "See methodology",
  );
});

test("unchecking down to fewer than 2 layers shows the empty-state prompt, not an empty table", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByLabel("Grass", { exact: true }).uncheck();
  await expect(page.getByText("Select 2+ layers on the left to compare cities.")).toBeVisible();
});

test("a city with no crime data shows an explicit no-data cell, not a blank or fabricated value", async ({
  page,
}) => {
  await page.goto("/advanced");
  const row = page.getByRole("row", { name: /^San Francisco, CA/ });
  await expect(row.getByText("No data")).toBeVisible();
});

test("simple view and advanced route link to each other", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Advanced" }).click();
  await expect(page).toHaveURL(/\/advanced$/);
  await page.getByRole("link", { name: "Simple view" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("selecting a city on the advanced route and navigating to the simple view preserves the selection", async ({
  page,
}) => {
  await page.goto("/advanced");
  await page.getByRole("row", { name: /^New York, NY/ }).click();
  await expect(page).toHaveURL(/city=new-york-ny/);

  await page.getByRole("link", { name: "Simple view" }).click();
  await expect(page).toHaveURL(/city=new-york-ny/);
  await expect(page.getByTestId("city-detail")).toContainText("New York, NY");
});

test("selecting a city does not reset the active layers -- regression for the shared-view-params URL-write mechanism", async ({
  page,
}) => {
  // Real bug found live in production only (never reproduced against a
  // local pnpm start server): the OLD implementation wrote city/year via
  // next/navigation's router.replace(), which triggers an RSC data fetch
  // that 404s through this app's multi-zone rewrite -- Next's fallback to
  // a full browser reload on that failure silently reset every bit of
  // non-URL-backed state (active layers, filters, ...) on every city
  // click. See src/lib/shared-view-params.ts's doc comment. This test
  // can't reproduce the production-only 404 itself, but it does pin the
  // invariant the fix restores: selecting a city must never touch the
  // active layer selection.
  await page.goto("/advanced");
  await page.getByRole("button", { name: "Care access", exact: true }).click();
  await page.getByLabel("General / acute care", { exact: true }).click();
  await expect(page.locator("thead th").filter({ hasText: "Care access" })).toBeVisible();

  await page.getByRole("row", { name: /^New York, NY/ }).click();
  await expect(page).toHaveURL(/city=new-york-ny/);
  await expect(page.locator("thead th").filter({ hasText: "Care access" })).toBeVisible();
  await expect(page.getByLabel("Grass", { exact: true })).toBeChecked();
});

test("changing the year on the advanced route and navigating to the simple view carries the year forward", async ({
  page,
}) => {
  await page.goto("/advanced");
  const yearSelect = page.getByLabel("Year", { exact: true });
  await expect(yearSelect).toBeVisible();
  const options = await yearSelect.locator("option").allTextContents();
  const currentYear = await yearSelect.inputValue();
  const earlierYear = options.find((y) => y !== currentYear);
  if (earlierYear) {
    await yearSelect.selectOption(earlierYear);
    await expect(page).toHaveURL(new RegExp(`year=${earlierYear}`));

    await page.getByRole("link", { name: "Simple view" }).click();
    await expect(page).toHaveURL(new RegExp(`year=${earlierYear}`));
  }
});

test("clicking a column header (no shift key) sorts the city rows by that column alone", async ({ page }) => {
  await page.goto("/advanced");
  const grassHeader = page.getByRole("columnheader", { name: /Allergy severity: Grass/ });
  const firstRowBefore = page.locator("tbody tr").first();
  const nameBefore = await firstRowBefore.locator("th").innerText();

  await grassHeader.getByRole("button").click();
  await expect(grassHeader).toHaveAttribute("aria-sort", "ascending");
  const firstRowAfterAsc = await page.locator("tbody tr").first().locator("th").innerText();
  expect(firstRowAfterAsc).not.toBe(nameBefore);

  // Click again -- same column toggles to descending, not a different sort.
  await grassHeader.getByRole("button").click();
  await expect(grassHeader).toHaveAttribute("aria-sort", "descending");
});

test("shift-clicking a second column header adds it as a tie-break key, without disturbing the primary sort", async ({ page }) => {
  await page.goto("/advanced");
  const grassHeader = page.getByRole("columnheader", { name: /Allergy severity: Grass/ });
  const crimeHeader = page.getByRole("columnheader", { name: /Crime: Violent crime/ });

  await grassHeader.getByRole("button").click();
  await expect(grassHeader).toHaveAttribute("aria-sort", "ascending");

  await crimeHeader.getByRole("button").click({ modifiers: ["Shift"] });
  // Primary key untouched by the shift-click; the second column becomes an
  // additional, independently-compared sort key -- never combined into one
  // number with the first (see src/lib/power-user/sort.ts).
  await expect(grassHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(crimeHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(crimeHeader.getByText("2", { exact: true })).toBeVisible();

  // A plain click on the secondary column resets to sorting solely by it.
  await crimeHeader.getByRole("button").click();
  await expect(grassHeader).toHaveAttribute("aria-sort", "none");
  await expect(crimeHeader).toHaveAttribute("aria-sort", "ascending");
});

test("saving, restoring, renaming, and deleting a view, and it survives a reload", async ({ page }) => {
  await page.goto("/advanced");

  // Saved views lives in a collapsed-by-default accordion section -- see
  // .pHive/design/power-user-advanced-layout/brief.md.
  await page.getByRole("button", { name: "Saved views" }).click();

  // Save the current (default) view.
  await page.getByRole("button", { name: "Save current view" }).click();
  await page.getByLabel("View name").fill("My Comparison");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("My Comparison")).toBeVisible();

  // Survives a full reload (localStorage-backed). Accordion state does not
  // persist across reload, so re-expand it.
  await page.reload();
  await page.getByRole("button", { name: "Saved views" }).click();
  await expect(page.getByText("My Comparison")).toBeVisible();

  // Change the selection, then restore the saved view to prove restore
  // actually re-applies the saved selections/sort, not just re-displays them.
  await page.getByLabel("Grass", { exact: true }).uncheck();
  await expect(page.getByText("Select 2+ layers on the left to compare cities.")).toBeVisible();
  await page.getByRole("button", { name: "Restore saved view: My Comparison" }).click();
  await expect(page.getByRole("columnheader", { name: /Allergy severity: Grass/ })).toBeVisible();

  // Rename.
  await page.getByRole("button", { name: "Rename saved view: My Comparison" }).click();
  await page.locator('input[id^="rename-"]').fill("Renamed View");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Renamed View")).toBeVisible();
  await expect(page.getByText("My Comparison")).not.toBeVisible();

  // Delete.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete saved view: Renamed View" }).click();
  await expect(page.getByText("No saved views yet.")).toBeVisible();
});

test("restoring a saved view expands every dataset group it activated, not just the ones already open -- regression for a collapsed-group bug", async ({
  page,
}) => {
  // Real bug found live: LayerPicker's accordion groups compute their
  // open/closed state ONCE at mount (by design, so a group the user
  // deliberately collapses doesn't silently reopen on unrelated selection
  // changes -- see LayerPicker.tsx's doc comment). Restoring a saved view
  // is a legitimate exception: a group that just gained a selection from
  // it should visibly open, not stay collapsed with no sign anything
  // changed underneath. Fixed by remounting LayerPicker (via a `key` that
  // bumps only on restore) so it recomputes.
  await page.goto("/advanced");
  await page.getByRole("button", { name: "Care access", exact: true }).click();
  await page.getByLabel("General / acute care", { exact: true }).click();

  await page.getByRole("button", { name: "Saved views" }).click();
  await page.getByRole("button", { name: "Save current view" }).click();
  await page.getByLabel("View name").fill("Care access check");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // Switch to a selection that doesn't include Care access, then collapse
  // its group (while it's still open, before the checkbox disappears).
  await page.getByLabel("General / acute care", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Care access", exact: true }).click();
  await expect(page.getByRole("button", { name: "Care access", exact: true })).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("button", { name: "Restore saved view: Care access check" }).click();
  await expect(page.getByRole("button", { name: "Care access", exact: true })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("General / acute care", { exact: true })).toBeChecked();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete saved view: Care access check" }).click();
});
