import { test, expect } from "@playwright/test";

// Real end-to-end proof of SQL-aggregate insights (MIN/MAX/AVG, top/bottom
// ORDER BY ... LIMIT) against the served data.sqlite build -- see
// src/lib/db/insights.ts and .pHive/epics/data-store/docs/design-note.md.

test("insights panel shows min/avg/max and city count for each selected layer", async ({ page }) => {
  await page.goto("/advanced");
  const insights = page.getByRole("heading", { name: "Insights" }).locator("..");
  await expect(insights.getByText(/min \d+ · avg \d+ · max \d+ · \d+ cities/).first()).toBeVisible();
});

test("insights panel lists top and bottom cities, and clicking one selects it", async ({ page }) => {
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
