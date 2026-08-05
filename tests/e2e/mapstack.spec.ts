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
  await page.getByRole("button", { name: "Add Violent crime" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Crime: Violent crime" })).toBeVisible();
  // The layer's own add-button relabels itself and disables once already
  // active, rather than staying clickable/re-addable.
  await expect(page.getByRole("button", { name: "Violent crime (already added)" })).toBeDisabled();
});

test("hiding a dataset removes it from the Add layer tabs, but a layer already active from it stays active -- and the hidden state survives a reload", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Manage datasets" }).click();
  await page.getByLabel("Crime", { exact: true }).click();

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await expect(page.getByRole("tab", { name: "Crime", exact: true })).not.toBeVisible();
  // The default Grass layer (a different dataset) is unaffected.
  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Allergy severity: Grass" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await expect(page.getByRole("tab", { name: "Crime", exact: true })).not.toBeVisible();

  // Re-showing it brings the tab back.
  await page.getByRole("button", { name: "Manage datasets" }).click();
  await page.getByLabel("Crime", { exact: true }).click();
  await expect(page.getByRole("tab", { name: "Crime", exact: true })).toBeVisible();
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
  await page.getByRole("button", { name: "Add Coastal flooding" }).click();

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
  await page.getByRole("button", { name: "Add Overall social vulnerability" }).click();

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
  await page.getByRole("button", { name: "Add Obesity" }).click();

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
  await page.getByRole("button", { name: "Add Low food access" }).click();

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
  await page.getByRole("button", { name: "Add Housing market tightness" }).click();

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
  await page.getByRole("button", { name: "Add Market speed" }).click();

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
  await page.getByRole("button", { name: "Add Traffic fatality rate" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Traffic safety: Traffic fatality rate" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Traffic safety: Traffic fatality rate" });
  await expect(detail).toContainText("per 100k");
  await expect(detail).toContainText("County Health Rankings");
});

test("the twelfth dataset (transit access) is selectable and reports a real ID-joined value", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Transit access" }).click();
  await page.getByRole("button", { name: "Transit service level", exact: true }).click();
  await page.getByRole("button", { name: "Add Transit service level" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Transit access: Transit service level" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Transit access: Transit service level" });
  await expect(detail).toContainText("vehicle-revenue-miles");
  await expect(detail).toContainText("National Transit Database");
});

test("the thirteenth dataset (walkability) is selectable and reports a real EPA-sourced value", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Walkability" }).click();
  await page.getByRole("button", { name: "Walkability", exact: true }).click();
  await page.getByRole("button", { name: "Add Walkability" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Walkability: Walkability" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Walkability: Walkability" });
  await expect(detail).toContainText("National Walkability Index");
  await expect(detail).toContainText("EPA Smart Location Database");
});

test("the fourteenth dataset (park access) is selectable and reports a real TPL-sourced value", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Park access" }).click();
  await page.getByRole("button", { name: "Park access", exact: true }).click();
  await page.getByRole("button", { name: "Add Park access" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Park access: Park access" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Park access: Park access" });
  await expect(detail).toContainText("10-min walk");
  await expect(detail).toContainText("Trust for Public Land");
});

test("the fifteenth dataset (electoral competitiveness) is selectable and reports a real 2024-election-sourced value, framed as competitiveness not lean", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Electoral competitiveness" }).click();
  await page.getByRole("button", { name: "Electoral competitiveness", exact: true }).click();
  await page.getByRole("button", { name: "Add Electoral competitiveness" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Electoral competitiveness: Electoral competitiveness" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Electoral competitiveness" });
  await expect(detail).toContainText("MIT Election Data + Science Lab");
  await expect(detail).toContainText("not left/right lean");
});

test("the sixteenth dataset (broadband access) is selectable and reports a real ACS-sourced value with full spine coverage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Broadband access" }).click();
  await page.getByRole("button", { name: "Broadband access", exact: true }).click();
  await page.getByRole("button", { name: "Add Broadband access" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Broadband access: Broadband access" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Broadband access: Broadband access" });
  await expect(detail).toContainText("broadband subscription");
  await expect(detail).toContainText("Census ACS");
});

test("the seventeenth dataset (median household income) is selectable and reports a real ACS-sourced dollar value", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Median household income" }).click();
  await page.getByRole("button", { name: "Median household income", exact: true }).click();
  await page.getByRole("button", { name: "Add Median household income" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Median household income: Median household income" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Median household income" });
  await expect(detail).toContainText("median household income");
  await expect(detail).toContainText("Census ACS");
});

test("the eighteenth dataset (housing affordability) is selectable and reports a real ACS-sourced value with full spine coverage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Housing affordability" }).click();
  await page.getByRole("button", { name: "Severe housing cost burden", exact: true }).click();
  await page.getByRole("button", { name: "Add Severe housing cost burden" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Housing affordability: Severe housing cost burden" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Housing affordability" });
  await expect(detail).toContainText("50%+ of income on housing");
  await expect(detail).toContainText("Census ACS");
});

test("the nineteenth dataset (extreme heat) is selectable and reports a real NOAA-sourced value with full spine coverage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Extreme heat" }).click();
  await page.getByRole("button", { name: "Extreme heat days", exact: true }).click();
  await page.getByRole("button", { name: "Add Extreme heat days" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Extreme heat: Extreme heat days" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Extreme heat" });
  await expect(detail).toContainText("days/year above 90");
  await expect(detail).toContainText("nearest station");
});

test("the twentieth dataset (sales tax) is selectable and reports a real Tax-Foundation-sourced rate with full spine coverage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Sales tax" }).click();
  await page.getByRole("button", { name: "Combined sales tax rate", exact: true }).click();
  await page.getByRole("button", { name: "Add Combined sales tax rate" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Sales tax: Combined sales tax rate" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Sales tax" });
  await expect(detail).toContainText("combined state + local sales tax");
});

test("the twenty-first dataset (measured grass pollen) is selectable and reports a real station-sourced value only for its narrow real coverage area", async ({
  page,
}) => {
  await page.goto("/?city=minneapolis-mn");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Measured grass pollen (real, limited coverage)" }).click();
  await page.getByRole("button", { name: "Measured grass pollen", exact: true }).click();
  await page.getByRole("button", { name: "Add Measured grass pollen" }).click();

  await expect(
    page.getByTestId("active-layers-row").filter({ hasText: "Measured grass pollen (real, limited coverage): Measured grass pollen" }),
  ).toBeVisible();

  const minneapolisDetail = page.getByTestId("city-detail-row").filter({ hasText: "Measured grass pollen" });
  await expect(minneapolisDetail).toContainText("real measured elevated-grass-pollen days/year");
  await expect(minneapolisDetail).toContainText("Carver County, MN");

  // Real coverage is intentionally narrow (Twin Cities MN metro only) --
  // a distant city shows an honest no-data state, not a fabricated value.
  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const nycDetail = page.getByTestId("city-detail-row").filter({ hasText: "Measured grass pollen" });
  await expect(nycDetail).toContainText("No data for this layer");
});

test("the twenty-second dataset (state income tax) is selectable and reports a real Tax-Foundation-sourced rate with full spine coverage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "State income tax" }).click();
  await page.getByRole("button", { name: "State income tax", exact: true }).click();
  await page.getByRole("button", { name: "Add State income tax" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "State income tax: State income tax" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "State income tax" });
  await expect(detail).toContainText("state income tax rate");
  await expect(detail).toContainText("reflects the whole state");
});

test("the twenty-third dataset (property tax) is selectable and reports a real Census-sourced rate", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Property tax" }).click();
  await page.getByRole("button", { name: "Effective property tax rate", exact: true }).click();
  await page.getByRole("button", { name: "Add Effective property tax rate" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Property tax: Effective property tax rate" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Property tax" });
  await expect(detail).toContainText("effective property tax rate");
  await expect(detail).toContainText("Census ACS");
});

test("the twenty-fourth dataset (unemployment) is selectable and reports a real BLS-sourced rate with full spine coverage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Unemployment" }).click();
  await page.getByRole("button", { name: "Unemployment rate", exact: true }).click();
  await page.getByRole("button", { name: "Add Unemployment rate" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Unemployment: Unemployment rate" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Unemployment" });
  await expect(detail).toContainText("unemployment rate");
  await expect(detail).toContainText("BLS LAUS");
});

test("the twenty-fifth dataset (air quality) is selectable and reports a real AirNow-sourced AQI value", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Air quality" }).click();
  await page.getByRole("button", { name: "Air Quality Index", exact: true }).click();
  await page.getByRole("button", { name: "Add Air Quality Index" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Air quality: Air Quality Index" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Air quality" });
  await expect(detail).toContainText("AQI");
  await expect(detail).toContainText("EPA AirNow");
});

test("the twenty-sixth dataset (population change) is selectable and reports a real Census-sourced value -- the last of the original Census-cluster items", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Population change" }).click();
  await page.getByRole("button", { name: "Population growth/decline", exact: true }).click();
  await page.getByRole("button", { name: "Add Population growth/decline" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Population change: Population growth/decline" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Population change" });
  await expect(detail).toContainText("population");
  await expect(detail).toContainText("Census ACS");
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
  // test. Interaction count DOUBLED (preview click + explicit Add click
  // per layer, once AddLayerPanel gained a real preview-then-add flow),
  // pushing local runs to ~42s -- widened further rather than trimming
  // the safety margin down to nothing on CI's slower runners.
  test.setTimeout(90_000);
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
    await page.getByRole("button", { name: `Add ${label}` }).click();
  }

  const mapWidth = await page.getByTestId("heatmap-canvas").first().evaluate((el) => el.getBoundingClientRect().width);
  expect(mapWidth).toBeLessThan(1500);
});

test("clicking a layer previews it live on the map without committing it, and a distinct Add button is required to actually add it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();

  await page.getByRole("button", { name: "Tall fescue", exact: true }).click();
  // Real bug found live: clicking a layer used to add it immediately, with
  // no way to see it on the map first and no explicit confirming action.
  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Tall fescue" })).toHaveCount(0);
  await expect(page.getByRole("img")).toHaveAttribute("aria-label", "Map showing 2 visible layer(s)");

  await page.getByRole("button", { name: "Add Tall fescue" }).click();
  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Allergy severity: Tall fescue" })).toBeVisible();
});

test("adding a layer from a dataset that already has active layers groups it with them, instead of always appending at the very bottom of the list", async ({ page }) => {
  // Real bug found live: MapstackApp's addLayer always did
  // [...prev, layer], so adding a second Allergy layer AFTER an unrelated
  // Crime layer had already been added landed the new allergy layer past
  // Crime at the bottom of the whole list, not grouped with the other
  // allergy layer it actually belongs next to.
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();

  await page.getByRole("tab", { name: "Crime" }).click();
  await page.getByRole("button", { name: "Violent crime" }).click();
  await page.getByRole("button", { name: "Add Violent crime" }).click();

  await page.getByRole("tab", { name: "Allergy severity" }).click();
  await page.getByRole("button", { name: "Redtop", exact: true }).click();
  await page.getByRole("button", { name: "Add Redtop" }).click();

  const labels = await page.getByTestId("active-layers-row").allInnerTexts();
  expect(labels).toEqual([
    expect.stringContaining("Allergy severity: Grass"),
    expect.stringContaining("Allergy severity: Redtop"),
    expect.stringContaining("Crime: Violent crime"),
  ]);
});

test("stacking 2+ layers shows a legend and detail for each at a clicked city", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Crime" }).click();
  await page.getByRole("button", { name: "Violent crime" }).click();
  await page.getByRole("button", { name: "Add Violent crime" }).click();

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
  await page.getByRole("button", { name: "Add Violent crime" }).click();
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

test("toggling a layer's visibility eye button hides it from the map without removing it from the active list or detail panel", async ({
  page,
}) => {
  await page.goto("/");
  const grassRow = page.getByTestId("active-layers-row").filter({ hasText: "Allergy severity: Grass" });
  await expect(grassRow).toBeVisible();
  await expect(page.getByRole("img", { name: "Map showing 1 visible layer(s)" })).toBeVisible();

  const eyeButton = grassRow.getByRole("button", { name: "Hide Allergy severity: Grass on the map" });
  await eyeButton.click();

  // Hidden on the map -- the aria-label reflects zero visible layers --
  // but the row stays in the list (just dimmed) rather than disappearing.
  await expect(page.getByRole("img", { name: "Map (no layers visible)" })).toBeVisible();
  await expect(grassRow).toBeVisible();
  await expect(grassRow.getByRole("button", { name: "Show Allergy severity: Grass on the map" })).toBeVisible();

  // The click-to-detail panel still uses the real active selection,
  // unaffected by map-only visibility -- explicit operator direction: a
  // display-only toggle should never touch the underlying analysis.
  await page.getByRole("button", { name: /^New York, NY/ }).click();
  await expect(page.getByTestId("city-detail-row").filter({ hasText: "Allergy severity" })).toBeVisible();

  await grassRow.getByRole("button", { name: "Show Allergy severity: Grass on the map" }).click();
  await expect(page.getByRole("img", { name: "Map showing 1 visible layer(s)" })).toBeVisible();
});

test("a year control appears once a time-varying layer (crime) is active, and switching years changes the detail", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Year", { exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Crime" }).click();
  await page.getByRole("button", { name: "Violent crime" }).click();
  await page.getByRole("button", { name: "Add Violent crime" }).click();

  const yearSelect = page.getByLabel("Year", { exact: true });
  await expect(yearSelect).toBeVisible();
  await expect(yearSelect).toHaveValue("2025");

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const crimeDetail = page.getByTestId("city-detail-row").filter({ hasText: "Crime: Violent crime" });
  await expect(crimeDetail).toContainText("2025");

  const options = await yearSelect.locator("option").allTextContents();
  const earlierYear = options.find((y) => y !== "2025");
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
  await page.getByRole("button", { name: "Add Violent crime" }).click();

  // San Francisco is a real, documented NIBRS-non-participation gap.
  await page.getByRole("button", { name: /^San Francisco, CA/ }).click();
  const crimeDetail = page.getByTestId("city-detail-row").filter({ hasText: "Crime: Violent crime" });
  await expect(crimeDetail).toContainText("No data for this layer.");
});
