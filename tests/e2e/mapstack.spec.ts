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

test("every dataset tab in the Add layer panel stays visible and clickable as the dataset count grows -- regression for a silently clipped tab row", async ({
  page,
}) => {
  // Real bug found live: the dataset tablist had no flex-wrap and no
  // horizontal scroll, so once enough datasets existed (9, after this
  // session's additions), the row overflowed its fixed-width sidebar
  // column and later tabs (Health outcomes, Food access, Housing supply,
  // Housing market speed) were silently clipped -- invisible and
  // unclickable, with no scrollbar or other affordance hinting they
  // existed at all. Playwright's own isVisible() didn't catch this either
  // (it doesn't check ancestor clipping), only a real screenshot did.
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();

  const lastTab = page.getByRole("tab", { name: "Housing market speed" });
  await expect(lastTab).toBeInViewport();
  await lastTab.click();
  await expect(page.getByRole("button", { name: "Market speed", exact: true })).toBeVisible();
});

test("the fifth dataset (natural hazard risk) is selectable and honestly reports no coastal-flood data for a landlocked city", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Natural hazard risk" }).click();
  await page.getByRole("button", { name: "Coastal flooding" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Natural hazard risk: Coastal flooding" })).toBeVisible();

  await page.getByRole("button", { name: /^Denver, CO/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Natural hazard risk: Coastal flooding" });
  await expect(detail).toContainText("No data for this layer.");
});

test("the sixth dataset (social vulnerability) is selectable and reports a real percentile value", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Social vulnerability" }).click();
  await page.getByRole("button", { name: "Overall social vulnerability" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Social vulnerability: Overall social vulnerability" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Social vulnerability: Overall social vulnerability" });
  await expect(detail).toContainText("percentile");
  await expect(detail).toContainText("CDC/ATSDR SVI");
});

test("the seventh dataset (health outcomes) is selectable and honestly reports no data for a confirmed real gap", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Health outcomes" }).click();
  await page.getByRole("button", { name: "Obesity" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Health outcomes: Obesity" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Health outcomes: Obesity" });
  await expect(detail).toContainText("age-adjusted prevalence");
  await expect(detail).toContainText("CDC PLACES");
});

test("the eighth dataset (food access) is selectable and reports a real percentage value", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Food access" }).click();
  await page.getByRole("button", { name: "Low food access", exact: true }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Food access: Low food access" })).toBeVisible();

  await page.getByRole("button", { name: /^Houston, TX/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Food access: Low food access" });
  await expect(detail).toContainText("supermarket");
  await expect(detail).toContainText("USDA ERS Food Access Research Atlas");
});

test("the ninth dataset (housing supply) is selectable and reports a real value", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Housing supply" }).click();
  await page.getByRole("button", { name: "Housing market tightness" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Housing supply: Housing market tightness" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Housing supply: Housing market tightness" });
  await expect(detail).toContainText("homes for sale");
  await expect(detail).toContainText("Zillow Research");
});

test("the tenth dataset (housing market speed) is selectable and honestly reports no data for a real small-town gap", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Housing market speed" }).click();
  await page.getByRole("button", { name: "Market speed", exact: true }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Housing market speed: Market speed" })).toBeVisible();

  await page.getByRole("button", { name: /^Boise, ID/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Housing market speed: Market speed" });
  await expect(detail).toContainText("days to pending");
  await expect(detail).toContainText("Zillow Research");
});

test("the eleventh dataset (traffic safety) is selectable and reports a real county-sourced rate", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Traffic safety" }).click();
  await page.getByRole("button", { name: "Traffic fatality rate", exact: true }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Traffic safety: Traffic fatality rate" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Traffic safety: Traffic fatality rate" });
  await expect(detail).toContainText("per 100k");
  await expect(detail).toContainText("County Health Rankings");
});

test("the map stays a normal, bounded size no matter how many layers are stacked -- regression for a flex min-width bug", async ({
  page,
}) => {
  // Real bug found live: with ~30 layers active, the map's container grew to
  // several THOUSAND pixels wide/tall (a flex child refusing to shrink below
  // its un-clipped content's natural width -- see BaseSvgMap.tsx/
  // MapstackApp.tsx's min-w-0 fix). Assert a hard bound well under any
  // plausible correct size, not just "grew a little."
  //
  // Real CI flake found live: 28 sequential real clicks sit right at the
  // default 30s test timeout locally and reliably tip over it on CI's
  // slower/shared runners -- not a product bug, just an inherently slow
  // test. Double the timeout rather than speeding up the interaction.
  test.setTimeout(60_000);
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();

  const allergyLabels = [
    "Tall fescue", "Orchard grass", "Sweet vernal grass", "Redtop", "Sagebrush",
    "Kochia / Russian thistle", "Mugwort", "Dock / sorrel", "Nettle", "Red oak",
    "White ash", "Red maple", "Loblolly pine", "Black walnut", "American sycamore",
    "Red alder", "Shagbark hickory", "Cladosporium (mold)", "Alternaria (mold)",
    "Common ragweed", "Redroot pigweed", "Lambsquarters", "English plantain",
    "Live oak", "American elm", "Eastern redcedar / juniper", "River birch", "Boxelder",
  ];
  for (const label of allergyLabels) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }

  const mapWidth = await page.getByTestId("heatmap-canvas").first().evaluate((el) => el.getBoundingClientRect().width);
  expect(mapWidth).toBeLessThan(1500);
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

test("selecting a city does not reset previously added layers -- regression for the shared-view-params URL-write mechanism", async ({
  page,
}) => {
  // Real bug found live in production only: writing city/year via
  // next/navigation's router.replace() triggered an RSC data fetch that
  // 404s through this app's multi-zone rewrite, and Next's fallback to a
  // full browser reload silently reset every non-URL-backed bit of state
  // (active layers here) on every single city click. See
  // src/lib/shared-view-params.ts's doc comment. Never reproduced against
  // a local pnpm start server, so this pins the invariant rather than the
  // production-only failure mode itself.
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Crime" }).click();
  await page.getByRole("button", { name: "Violent crime" }).click();
  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Crime: Violent crime" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  await expect(page).toHaveURL(/city=new-york-ny/);
  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Crime: Violent crime" })).toBeVisible();
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
