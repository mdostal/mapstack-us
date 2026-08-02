import { test, expect } from "@playwright/test";

// Real end-to-end proof of the synthesized sidebar layout: accordion
// sections (Layers open, Saved views collapsed by default) -- see
// .pHive/design/power-user-advanced-layout/brief.md.

test("Layers accordion section is open by default", async ({ page }) => {
  await page.goto("/advanced");
  const layersToggle = page.getByRole("button", { name: "Layers" });
  await expect(layersToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Grass", { exact: true })).toBeVisible();
});

test("Saved views accordion section is collapsed by default", async ({ page }) => {
  await page.goto("/advanced");
  const savedToggle = page.getByRole("button", { name: "Saved views" });
  await expect(savedToggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Save current view" })).not.toBeVisible();

  await savedToggle.click();
  await expect(savedToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Save current view" })).toBeVisible();

  await savedToggle.click();
  await expect(page.getByRole("button", { name: "Save current view" })).not.toBeVisible();
});

test("search and filter sit in the toolbar above the table, independent of the sidebar accordion state", async ({
  page,
}) => {
  await page.goto("/advanced");
  await expect(page.getByLabel("Search cities")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Filter/ })).toBeVisible();

  // Collapsing Layers shouldn't affect the toolbar.
  await page.getByRole("button", { name: "Layers" }).click();
  await expect(page.getByLabel("Search cities")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Filter/ })).toBeVisible();
});
