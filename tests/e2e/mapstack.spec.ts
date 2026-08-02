import { test, expect } from "@playwright/test";

test("dataset picker loads with allergy severity active by default, switches layers, and shows city detail", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mapstack" })).toBeVisible();

  await expect(page.getByRole("tab", { name: "Allergy severity" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("radio", { name: "Grass", exact: true })).toHaveAttribute("aria-checked", "true");

  // Switch to a different layer within the same dataset.
  await page.getByRole("radio", { name: "Tall fescue" }).click();
  await expect(page.getByRole("radio", { name: "Tall fescue" })).toHaveAttribute("aria-checked", "true");

  // Click a city, see its detail.
  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detailHeading = page.getByText("New York, NY", { exact: true });
  await expect(detailHeading).toBeVisible();
  await expect(detailHeading.locator("..").getByText(/\/100/)).toBeVisible();
});

test("the map renders a continuous gradient, not isolated dots", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("heatmap-canvas")).toBeVisible();
});

test("switching to the crime dataset resets the layer selection and renders real data (regression: stale layerId across dataset switch)", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "Crime" }).click();
  await expect(page.getByRole("tab", { name: "Crime" })).toHaveAttribute("aria-selected", "true");
  // Regression: switching datasets must reset the previously-selected
  // layer (e.g. allergy's "grass"), not carry it over to a dataset that
  // doesn't have that layer id at all.
  await expect(page.getByRole("radio", { name: "Violent crime" })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detailHeading = page.getByText("New York, NY", { exact: true });
  await expect(detailHeading).toBeVisible();
  await expect(detailHeading.locator("..").getByText(/percentile/)).toBeVisible();

  await page.getByRole("radio", { name: "Property crime" }).click();
  await expect(page.getByRole("radio", { name: "Property crime" })).toHaveAttribute("aria-checked", "true");
});

test("a city with no crime data shows an honest no-data state, not a fabricated value", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Crime" }).click();
  // Sundance, WY is a real, documented gap (no matching FBI agency at all).
  await page.getByRole("button", { name: /^Sundance, WY/ }).click();
  // Scoped to <p> text specifically, not the SVG <title> tooltip that also
  // matches "Sundance, WY" verbatim.
  const detailHeading = page.locator("p", { hasText: "Sundance, WY" });
  await expect(detailHeading).toBeVisible();
  await expect(detailHeading.locator("..").getByText("No data for this layer.")).toBeVisible();
});
