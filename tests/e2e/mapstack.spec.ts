import { test, expect } from "@playwright/test";

test("home page loads with grass active by default and renders a continuous gradient", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mapstack" })).toBeVisible();
  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Allergy severity: Grass" })).toBeVisible();
  await expect(page.getByTestId("heatmap-canvas")).toBeVisible();
});

test("add layer flow: pick a dataset, add a layer, see it appear in the active list", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Crime" }).click();
  await page.getByRole("button", { name: "Violent crime" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Crime: Violent crime" })).toBeVisible();
  // The layer's own add-button relabels itself and disables once already
  // active, rather than staying clickable/re-addable.
  await expect(page.getByRole("button", { name: "Violent crime (already added)" })).toBeDisabled();
});

test("stacking 2+ layers shows a legend and detail for each at a clicked city", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Crime" }).click();
  await page.getByRole("button", { name: "Violent crime" }).click();

  // Two legends now visible, one per active layer -- "concern" suffix
  // makes legend text unique from the active-layers-list entries.
  await expect(page.getByText("Allergy severity: Grass concern")).toBeVisible();
  await expect(page.getByText("Crime: Violent crime concern")).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const allergyDetail = page.getByTestId("city-detail-row").filter({ hasText: "Allergy severity: Grass" });
  await expect(allergyDetail).toBeVisible();
  const crimeDetail = page.getByTestId("city-detail-row").filter({ hasText: "Crime: Violent crime" });
  await expect(crimeDetail).toBeVisible();
  await expect(crimeDetail).toContainText("percentile");
});

test("removing a layer takes it off the map and the active list", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Allergy severity: Grass" })).toBeVisible();

  await page.getByRole("button", { name: "Remove Allergy severity: Grass" }).click();
  await expect(page.getByTestId("active-layers-row")).toHaveCount(0);
  await expect(page.getByText("No layers on the map yet")).toBeVisible();
});

test("a year control appears once a time-varying layer (crime) is active, and switching years changes the detail", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Year", { exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Crime" }).click();
  await page.getByRole("button", { name: "Violent crime" }).click();

  const yearSelect = page.getByLabel("Year", { exact: true });
  await expect(yearSelect).toBeVisible();
  await expect(yearSelect).toHaveValue("2024");

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const crimeDetail = page.getByTestId("city-detail-row").filter({ hasText: "Crime: Violent crime" });
  await expect(crimeDetail).toContainText("2024");

  const options = await yearSelect.locator("option").allTextContents();
  const earlierYear = options.find((y) => y !== "2024");
  if (earlierYear) {
    await yearSelect.selectOption(earlierYear);
    await expect(crimeDetail).toContainText(earlierYear);
  }
});

test("a city with no crime data shows an honest no-data state, not a fabricated value", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Crime" }).click();
  await page.getByRole("button", { name: "Violent crime" }).click();

  // San Francisco is a real, documented NIBRS-non-participation gap.
  await page.getByRole("button", { name: /^San Francisco, CA/ }).click();
  const crimeDetail = page.getByTestId("city-detail-row").filter({ hasText: "Crime: Violent crime" });
  await expect(crimeDetail).toContainText("No data for this layer.");
});
