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

test("changing the year on the advanced route and navigating to the simple view carries the year forward", async ({
  page,
}) => {
  await page.goto("/advanced");
  const yearSelect = page.getByLabel("Year");
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

test("clicking a column header sorts the city rows by that column, single criterion only", async ({ page }) => {
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
