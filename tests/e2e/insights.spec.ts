import { test, expect } from "@playwright/test";

// Real end-to-end proof of SQL-aggregate insights (MIN/MAX/AVG, top/bottom
// ORDER BY ... LIMIT) against the served data.sqlite build -- see
// src/lib/db/insights.ts and .pHive/epics/data-store/docs/design-note.md.
// Insights now docks under the table (open by default, collapsible) rather
// than living in the sidebar -- see
// .pHive/design/power-user-advanced-layout/brief.md.

test("insights dock shows min/avg/max and city count for each selected layer, open by default", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.getByRole("button", { name: "Insights ▾ collapse" })).toBeVisible();
  await expect(page.getByText(/min \d+ · avg \d+ · max \d+ · \d+ cities/).first()).toBeVisible();
});

test("collapsing and re-expanding the insights dock hides and restores its content", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.getByText("Highest:").first()).toBeVisible();

  await page.getByRole("button", { name: "Insights ▾ collapse" }).click();
  await expect(page.getByText("Highest:").first()).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Insights ▸ expand" })).toBeVisible();

  await page.getByRole("button", { name: "Insights ▸ expand" }).click();
  await expect(page.getByText("Highest:").first()).toBeVisible();
});

test("insights dock lists top and bottom cities, and clicking one selects it", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.getByText("Highest:").first()).toBeVisible();
  await expect(page.getByText("Lowest:").first()).toBeVisible();

  // Click the first "Highest" city button under the Grass layer's insights
  // and confirm it becomes the selected city (shared city param + row highlight).
  const highestSection = page.getByText("Highest:").first().locator("..");
  const firstCityButton = highestSection.locator("button").first();
  const label = await firstCityButton.innerText();
  const cityName = label.split(" — ")[0];
  await firstCityButton.click();

  const escaped = cityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await expect(page.getByRole("row", { name: new RegExp(`^${escaped}`) })).toHaveAttribute("aria-selected", "true");
});

test("insights update when the selected layers change", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.getByText("Crime: Violent crime").first()).toBeVisible();

  await page.getByLabel("Violent crime", { exact: true }).uncheck();
  await expect(page.locator("text=Crime: Violent crime")).toHaveCount(0);
});

test("insights dock stays visible when switching to Map view, not just Table", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.getByText("Highest:").first()).toBeVisible();

  await page.getByRole("tab", { name: "Map" }).click();
  await expect(page.locator("table")).toHaveCount(0);
  await expect(page.getByText("Highest:").first()).toBeVisible();

  await page.getByRole("tab", { name: "Table" }).click();
  await expect(page.getByText("Highest:").first()).toBeVisible();
});

test("the insights dock is also available in the simple view, not just /advanced -- explicit operator direction to bring more of /advanced's power into simple view", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Allergy severity" }).click();
  await page.getByRole("button", { name: "Grass", exact: true }).click();
  await page.getByRole("button", { name: "Add Grass" }).click();

  await expect(page.getByRole("button", { name: "Insights ▾ collapse" })).toBeVisible();
  await expect(page.getByText(/min \d+ · avg \d+ · max \d+ · \d+ cities/).first()).toBeVisible();
});
