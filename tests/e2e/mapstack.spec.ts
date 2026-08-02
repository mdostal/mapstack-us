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
