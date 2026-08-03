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

test("each dataset within Layers is its own collapsible group -- open by default only if it has an active selection", async ({
  page,
}) => {
  await page.goto("/advanced");
  // Default selection is allergy:grass + crime:violent_crime, so those two
  // dataset groups start open; care-access (nothing selected) starts closed.
  const allergyToggle = page.getByRole("button", { name: "Allergy severity", exact: true });
  const crimeToggle = page.getByRole("button", { name: "Crime", exact: true });
  const careAccessToggle = page.getByRole("button", { name: "Care access", exact: true });

  await expect(allergyToggle).toHaveAttribute("aria-expanded", "true");
  await expect(crimeToggle).toHaveAttribute("aria-expanded", "true");
  await expect(careAccessToggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("General / acute care")).not.toBeVisible();

  await careAccessToggle.click();
  await expect(careAccessToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("General / acute care")).toBeVisible();

  await careAccessToggle.click();
  await expect(page.getByLabel("General / acute care")).not.toBeVisible();
});

test("Clear all removes every selected layer, and the button hides itself once nothing is selected", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.getByLabel("Grass", { exact: true })).toBeChecked();

  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByLabel("Grass", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Violent crime", { exact: true })).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Clear all" })).not.toBeVisible();
  await expect(page.getByText("Select 2+ layers on the left to compare cities.")).toBeVisible();
});
