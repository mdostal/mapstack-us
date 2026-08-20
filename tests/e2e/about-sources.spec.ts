import { test, expect } from "@playwright/test";

// In-app transparency pages -- explicit operator direction after seeing
// medical-study-tracker's own About/Networks/Resources/Disclaimer tabs:
// "where it came from, how it is used ... how you can add to, support, or
// increase the dataset" needs to live in the app itself, not only in the
// repo/docs site. See src/components/AboutPage.tsx / SourcesPage.tsx.

test("the map view links to Sources and About, and they link back to the map", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sources" }).click();
  await expect(page).toHaveURL(/\/sources$/);
  await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();

  await page.getByRole("link", { name: "Map", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
});

test("Sources lists every real dataset with a named, linked source", async ({ page }) => {
  await page.goto("/sources");
  // Real spot checks, not just "some rows exist" -- confirms actual
  // attribution text, not an empty or placeholder state.
  const crimeRow = page.getByText("Crime", { exact: true }).locator("..");
  await expect(crimeRow.getByRole("link", { name: "FBI Crime Data Explorer" })).toBeVisible();
  await expect(crimeRow.getByRole("link", { name: "methodology" })).toBeVisible();

  const allergyRow = page.getByText("Allergy severity", { exact: true }).locator("..");
  await expect(allergyRow.getByText(/Allergy Locator's own validated grass model/)).toBeVisible();

  // Every dataset gets a row -- count matches the real registry size, not
  // a stale hardcoded number that would silently drift as datasets ship.
  const rows = page.locator("li.rounded-md.border").filter({ hasText: /methodology|source not yet documented/ });
  await expect(rows).toHaveCount(41);
});

test("About names the real license, origin project, and support links", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("link", { name: "Allergy Locator" })).toHaveAttribute(
    "href",
    "https://mdostal.github.io/allergy-locator/",
  );
  await expect(page.getByRole("link", { name: "Buy me a coffee" })).toHaveAttribute(
    "href",
    "https://www.buymeacoffee.com/mdostal",
  );
  await expect(page.getByRole("link", { name: "mdostal.com/contact" })).toHaveAttribute(
    "href",
    "https://mdostal.com/contact",
  );
  await expect(page.getByText("MIT licensed.")).toBeVisible();
});

test("Sources and About are also reachable from the advanced route", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByRole("link", { name: "Sources" }).click();
  await expect(page).toHaveURL(/\/sources$/);

  await page.goto("/advanced");
  await page.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
});
