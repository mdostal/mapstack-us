import { test, expect } from "@playwright/test";

test("home page loads with no default layer -- an explicit empty state invites adding one", async ({ page }) => {
  // Explicit operator direction: ship blank rather than pre-loading a
  // specific dataset's opinion (previously always "Allergy severity:
  // Grass") -- "leave the site for people to figure out."
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mapstack" })).toBeVisible();
  await expect(page.getByTestId("active-layers-row")).toHaveCount(0);
  await expect(page.getByText("No layers on the map yet -- add one below to get started.")).toBeVisible();
  await expect(page.getByTestId("map-frame")).toBeVisible();
  await expect(page.getByRole("group", { name: "Map (no layers visible)" })).toBeVisible();
});

test("add layer flow: pick a dataset, add a layer, see it appear in the active list", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Crime", exact: true }).click();
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

  // An explicitly-added layer from a different dataset, to confirm hiding
  // Crime doesn't touch layers already active from unrelated datasets.
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Allergy severity" }).click();
  await page.getByRole("button", { name: "Grass", exact: true }).click();
  await page.getByRole("button", { name: "Add Grass" }).click();
  await page.getByRole("button", { name: "+ Add layer" }).click(); // collapse it again

  await page.getByRole("button", { name: "Manage datasets" }).click();
  await page.getByLabel("Crime", { exact: true }).click();

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await expect(page.getByRole("tab", { name: "Crime", exact: true })).not.toBeVisible();
  // The Grass layer (a different dataset) is unaffected.
  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Allergy severity: Grass" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await expect(page.getByRole("tab", { name: "Crime", exact: true })).not.toBeVisible();

  // Re-showing it brings the tab back.
  await page.getByRole("button", { name: "Manage datasets" }).click();
  await page.getByLabel("Crime", { exact: true }).click();
  await expect(page.getByRole("tab", { name: "Crime", exact: true })).toBeVisible();
});

test("every dataset tab in the Add layer panel stays reachable and clickable as the dataset count grows -- regression for a silently clipped tab row", async ({
  page,
}) => {
  // Real bug found live: the dataset tablist had no flex-wrap and no
  // horizontal scroll, so once enough datasets existed (9, after this
  // session's additions), the row overflowed its fixed-width sidebar
  // column and later tabs were silently clipped -- invisible and
  // unclickable, with no scrollbar or other affordance hinting they
  // existed at all. The tablist is now a deliberate fixed-height,
  // horizontally-scrolling strip (see AddLayerPanel.tsx's own comment: a
  // wrapping grid across 40+ datasets pushed the actual layer picker far
  // below the fold, a separate real usability bug) -- a tab further right
  // is legitimately off-screen until scrolled, but must still be reachable
  // via scroll, not clipped with no way to reach it at all.
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();

  const lastTab = page.getByRole("tab", { name: "Housing market speed" });
  await lastTab.scrollIntoViewIfNeeded();
  await expect(lastTab).toBeInViewport();
  await lastTab.click();
  await expect(page.getByRole("button", { name: "Market speed", exact: true })).toBeVisible();
});

test("the third dataset (care access) is selectable and reports a real facility+drive-time value -- regression for dvd-1's completeness audit, which found this dataset had no dedicated e2e coverage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Care access" }).click();
  await page.getByRole("button", { name: "General / acute care" }).click();
  await page.getByRole("button", { name: "Add General / acute care" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Care access: General / acute care" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Care access" });
  await expect(detail).toContainText("drive");
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
  await expect(detail).toContainText("CDC/ATSDR Social Vulnerability Index");
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

test("electoral competitiveness now carries real multi-cycle history (2000-2024), not just the latest election", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Electoral competitiveness" }).click();
  await page.getByRole("button", { name: "Electoral competitiveness", exact: true }).click();
  await page.getByRole("button", { name: "Add Electoral competitiveness" }).click();

  const yearSelect = page.getByLabel("Year", { exact: true });
  await expect(yearSelect).toBeVisible();
  await expect(yearSelect).toHaveValue("2024");

  await page.getByRole("button", { name: /^Chicago, IL/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Electoral competitiveness" });
  await expect(detail).toContainText("2024");

  await yearSelect.selectOption("2000");
  await expect(detail).toContainText("2000");
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
  await expect(minneapolisDetail).toContainText("real measured elevated-grass-pollen days");
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

test("the twenty-fifth dataset (air quality) is selectable and reports a real EPA-AQS-sourced annual AQI value", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Air quality" }).click();
  await page.getByRole("button", { name: "Air Quality Index", exact: true }).click();
  await page.getByRole("button", { name: "Add Air Quality Index" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Air quality: Air Quality Index" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Air quality" });
  await expect(detail).toContainText("90th percentile AQI");
  await expect(detail).toContainText("EPA AQS annual county summary");
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
  await expect(detail).toContainText("Census");
});

test("the twenty-seventh dataset (cost of living) is selectable and reports a real BEA-sourced value -- the last of the four newly-obtained API keys", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Cost of living" }).click();
  await page.getByRole("button", { name: "Cost of living", exact: true }).click();
  await page.getByRole("button", { name: "Add Cost of living" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Cost of living: Cost of living" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Cost of living" });
  await expect(detail).toContainText("RPP");
  await expect(detail).toContainText("BEA Regional Price Parities");
});

test("the twenty-eighth dataset (school spending) is selectable and reports a real NCES-sourced value -- upgrades the backlog's former weak proxy-only school-quality candidate", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "School spending" }).click();
  await page.getByRole("button", { name: "Per-pupil spending", exact: true }).click();
  await page.getByRole("button", { name: "Add Per-pupil spending" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "School spending: Per-pupil spending" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "School spending" });
  await expect(detail).toContainText("per-pupil school spending");
  await expect(detail).toContainText("NCES");
});

test("the twenty-ninth dataset (business density) is selectable and reports a real Census Business Patterns value -- pivoted from EPA TRI after a real live feasibility blocker", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Business density" }).click();
  await page.getByRole("button", { name: "Business density", exact: true }).click();
  await page.getByRole("button", { name: "Add Business density" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Business density: Business density" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Business density" });
  await expect(detail).toContainText("business establishments per 1,000 residents");
  await expect(detail).toContainText("Census Business Patterns");
});

test("the thirtieth dataset (industrial facility density) is selectable and reports a real EPA TRI-sourced value -- the real fix for a prior epic's slow-API blocker", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Industrial facility density" }).click();
  await page.getByRole("button", { name: "Industrial facility density", exact: true }).click();
  await page.getByRole("button", { name: "Add Industrial facility density" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Industrial facility density: Industrial facility density" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Industrial facility density" });
  await expect(detail).toContainText("TRI-reporting facilities within 10 miles");
  await expect(detail).toContainText("EPA Toxics Release Inventory");
});

test("the thirty-first dataset (average wage) is selectable and reports a real Census Business Patterns value -- reuses the business-density pipeline with zero new endpoint risk", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Average wage" }).click();
  await page.getByRole("button", { name: "Average wage", exact: true }).click();
  await page.getByRole("button", { name: "Add Average wage" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Average wage: Average wage" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Average wage" });
  await expect(detail).toContainText("average annual wage per employee");
  await expect(detail).toContainText("Census Business Patterns");
});

test("the thirty-second dataset (drought severity) is selectable and reports a real US Drought Monitor value", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Drought severity" }).click();
  await page.getByRole("button", { name: "Drought severity", exact: true }).click();
  await page.getByRole("button", { name: "Add Drought severity" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Drought severity: Drought severity" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Drought severity" });
  await expect(detail).toContainText("Severe Drought or worse");
  await expect(detail).toContainText("US Drought Monitor");
});

test("the thirty-third dataset (hate crime rate) is selectable and reports a real FBI-sourced value -- resolves a lead deferred across three prior research rounds", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Hate crime rate" }).click();
  await page.getByRole("button", { name: "Hate crime rate", exact: true }).click();
  await page.getByRole("button", { name: "Add Hate crime rate" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Hate crime rate: Hate crime rate" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Hate crime rate" });
  await expect(detail).toContainText("reported hate crime incidents");
  await expect(detail).toContainText("FBI Crime Data Explorer");
});

test("the thirty-fourth dataset (Superfund site density) is selectable and reports a real EPA-sourced value -- resolves a lead deferred since the addendum to dataset-verification-drive", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Superfund site density" }).click();
  await page.getByRole("button", { name: "Superfund site density", exact: true }).click();
  await page.getByRole("button", { name: "Add Superfund site density" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Superfund site density: Superfund site density" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Superfund site density" });
  await expect(detail).toContainText("active Superfund (Final NPL)");
  await expect(detail).toContainText("EPA Envirofacts SEMS");
});

test("the thirty-fifth dataset (seismic risk) is selectable and reports a real USGS-sourced value -- a genuinely new hazard category for this project", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Seismic risk" }).click();
  await page.getByRole("button", { name: "Seismic risk", exact: true }).click();
  await page.getByRole("button", { name: "Add Seismic risk" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Seismic risk: Seismic risk" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Seismic risk" });
  await expect(detail).toContainText("g design spectral acceleration");
  await expect(detail).toContainText("USGS ASCE 7-22");
});

test("the thirty-sixth dataset (library access) is selectable and reports a real IMLS-sourced value -- resolves a lead deferred twice this session", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Library access" }).click();
  await page.getByRole("button", { name: "Library access", exact: true }).click();
  await page.getByRole("button", { name: "Add Library access" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Library access: Library access" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Library access" });
  await expect(detail).toContainText("library visits per resident per year");
  await expect(detail).toContainText("IMLS Public Libraries Survey");
});

test("the thirty-seventh dataset (severe weather frequency) is selectable and reports a real NOAA-sourced value -- a genuinely new hazard signal for this project", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Severe weather frequency" }).click();
  await page.getByRole("button", { name: "Severe weather frequency", exact: true }).click();
  await page.getByRole("button", { name: "Add Severe weather frequency" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Severe weather frequency: Severe weather frequency" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Severe weather frequency" });
  await expect(detail).toContainText("severe weather event");
  await expect(detail).toContainText("NOAA Storm Events Database");
});

test("the thirty-eighth dataset (gigabit availability) is selectable and reports a real FCC-sourced value -- distinct from the ACS broadband-subscription dataset", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Gigabit availability" }).click();
  await page.getByRole("button", { name: "Gigabit availability", exact: true }).click();
  await page.getByRole("button", { name: "Add Gigabit availability" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Gigabit availability: Gigabit availability" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Gigabit availability" });
  await expect(detail).toContainText("gigabit (1000/100 Mbps) broadband access");
  await expect(detail).toContainText("FCC National Broadband Map");
});

test("the thirty-ninth dataset (historic site access) is selectable and reports a real NPS-sourced value via a live server-side radius query", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Historic site access" }).click();
  await page.getByRole("button", { name: "Historic site access", exact: true }).click();
  await page.getByRole("button", { name: "Add Historic site access" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Historic site access: Historic site access" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Historic site access" });
  await expect(detail).toContainText("National Register of Historic Places");
  await expect(detail).toContainText("within 10 miles");
});

test("the fortieth dataset (environmental violations) is selectable and reports a real EPA ECHO-sourced value", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Environmental violations" }).click();
  await page.getByRole("button", { name: "Environmental violations", exact: true }).click();
  await page.getByRole("button", { name: "Add Environmental violations" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Environmental violations: Environmental violations" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Environmental violations" });
  await expect(detail).toContainText("significant violation");
  await expect(detail).toContainText("EPA ECHO");
});

test("the forty-first dataset (winter cold burden) is selectable and reports a real NOAA-sourced value with full spine coverage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Winter cold burden" }).click();
  await page.getByRole("button", { name: "Winter cold burden", exact: true }).click();
  await page.getByRole("button", { name: "Add Winter cold burden" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Winter cold burden: Winter cold burden" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Winter cold burden" });
  await expect(detail).toContainText("days/year at or below 32");
  await expect(detail).toContainText("nearest station");
});

test("the forty-second dataset (electricity cost) is selectable and reports a real EIA-sourced value with full spine coverage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Electricity cost" }).click();
  await page.getByRole("button", { name: "Electricity cost", exact: true }).click();
  await page.getByRole("button", { name: "Add Electricity cost" }).click();

  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Electricity cost: Electricity cost" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Electricity cost" });
  await expect(detail).toContainText("¢/kWh");
  await expect(detail).toContainText("EIA");
});

test("selecting a city shows a visible name callout with a pointer directly on the map, not just in the detail panel below", async ({ page }) => {
  await page.goto("/");

  // map-frame (not heatmap-canvas) is the right anchor here -- heatmap-canvas
  // only exists once a real layer is active, but the callout itself is a
  // pure map-selection affordance, independent of whether any layer is on.
  const map = page.getByTestId("map-frame").locator("svg");
  await expect(map.locator("text")).toHaveCount(0);

  await page.getByRole("button", { name: /^New York, NY/ }).click();

  const calloutText = map.locator("text", { hasText: "New York, NY" });
  await expect(calloutText).toBeVisible();
  // A leader line connects the callout to the actual marker -- not just a
  // floating label with no clear anchor to which city it belongs to.
  await expect(map.locator("line")).toHaveCount(1);

  // Selecting a different city moves the callout, it doesn't add a second one.
  await page.getByRole("button", { name: /^Seattle, WA/ }).click();
  await expect(map.locator("text", { hasText: "Seattle, WA" })).toBeVisible();
  await expect(map.locator("text", { hasText: "New York, NY" })).not.toBeVisible();
  await expect(map.locator("text")).toHaveCount(1);
});

test("the concern-color legend uses clear, dataset-specific endpoint labels for positively-framed access layers, not the generic Low/High concern", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Care access" }).click();
  await page.getByRole("button", { name: "Pediatric cardiac surgery" }).click();
  await page.getByRole("button", { name: "Add Pediatric cardiac surgery" }).click();

  const legend = page.getByText("Care access: Pediatric cardiac surgery concern").locator("..");
  await expect(legend.getByText("Nearby")).toBeVisible();
  await expect(legend.getByText("Far away")).toBeVisible();
  await expect(legend.getByText("Low concern")).not.toBeVisible();
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
  await expect(page.getByTestId("map-frame").getByRole("group")).toHaveAttribute("aria-label", "Map showing 1 visible layer(s)");

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

  await page.getByRole("tab", { name: "Allergy severity" }).click();
  await page.getByRole("button", { name: "Grass", exact: true }).click();
  await page.getByRole("button", { name: "Add Grass" }).click();

  await page.getByRole("tab", { name: "Crime", exact: true }).click();
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
  await page.getByRole("tab", { name: "Allergy severity" }).click();
  await page.getByRole("button", { name: "Grass", exact: true }).click();
  await page.getByRole("button", { name: "Add Grass" }).click();

  await page.getByRole("tab", { name: "Crime", exact: true }).click();
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
  await page.getByRole("tab", { name: "Crime", exact: true }).click();
  await page.getByRole("button", { name: "Violent crime" }).click();
  await page.getByRole("button", { name: "Add Violent crime" }).click();
  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Crime: Violent crime" })).toBeVisible();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  await expect(page).toHaveURL(/city=new-york-ny/);
  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Crime: Violent crime" })).toBeVisible();
});

test("removing a layer takes it off the map and the active list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Allergy severity" }).click();
  await page.getByRole("button", { name: "Grass", exact: true }).click();
  await page.getByRole("button", { name: "Add Grass" }).click();
  await expect(page.getByTestId("active-layers-row").filter({ hasText: "Allergy severity: Grass" })).toBeVisible();

  await page.getByRole("button", { name: "Remove Allergy severity: Grass" }).click();
  await expect(page.getByTestId("active-layers-row")).toHaveCount(0);
  await expect(page.getByText("No layers on the map yet")).toBeVisible();
});

test("toggling a layer's visibility eye button hides it from the map without removing it from the active list or detail panel", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Allergy severity" }).click();
  await page.getByRole("button", { name: "Grass", exact: true }).click();
  await page.getByRole("button", { name: "Add Grass" }).click();
  await page.getByRole("button", { name: "+ Add layer" }).click(); // collapse it again

  const grassRow = page.getByTestId("active-layers-row").filter({ hasText: "Allergy severity: Grass" });
  await expect(grassRow).toBeVisible();
  await expect(page.getByRole("group", { name: "Map showing 1 visible layer(s)" })).toBeVisible();

  const eyeButton = grassRow.getByRole("button", { name: "Hide Allergy severity: Grass on the map" });
  await eyeButton.click();

  // Hidden on the map -- the aria-label reflects zero visible layers --
  // but the row stays in the list (just dimmed) rather than disappearing.
  await expect(page.getByRole("group", { name: "Map (no layers visible)" })).toBeVisible();
  await expect(grassRow).toBeVisible();
  await expect(grassRow.getByRole("button", { name: "Show Allergy severity: Grass on the map" })).toBeVisible();

  // The click-to-detail panel still uses the real active selection,
  // unaffected by map-only visibility -- explicit operator direction: a
  // display-only toggle should never touch the underlying analysis.
  await page.getByRole("button", { name: /^New York, NY/ }).click();
  await expect(page.getByTestId("city-detail-row").filter({ hasText: "Allergy severity" })).toBeVisible();

  await grassRow.getByRole("button", { name: "Show Allergy severity: Grass on the map" }).click();
  await expect(page.getByRole("group", { name: "Map showing 1 visible layer(s)" })).toBeVisible();
});

test("a year control appears once a time-varying layer (crime) is active, and switching years changes the detail", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Year", { exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Crime", exact: true }).click();
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
  await page.getByRole("tab", { name: "Crime", exact: true }).click();
  await page.getByRole("button", { name: "Violent crime" }).click();
  await page.getByRole("button", { name: "Add Violent crime" }).click();

  // San Francisco is a real, documented NIBRS-non-participation gap.
  await page.getByRole("button", { name: /^San Francisco, CA/ }).click();
  const crimeDetail = page.getByTestId("city-detail-row").filter({ hasText: "Crime: Violent crime" });
  await expect(crimeDetail).toContainText("No data for this layer.");
});

test("comparing a few cities: + Compare adds a city, the comparison table shows every active layer for each, and cities can be removed individually or all at once", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Allergy severity" }).click();
  await page.getByRole("button", { name: "Grass", exact: true }).click();
  await page.getByRole("button", { name: "Add Grass" }).click();
  await page.getByRole("button", { name: "+ Add layer" }).click(); // collapse it again

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  await page.getByRole("button", { name: "+ Compare" }).click();
  await expect(page.getByTestId("city-comparison-panel")).toContainText("Comparing 1 city");
  // Already-compared city no longer offers + Compare -- it shows a status instead.
  await expect(page.getByRole("button", { name: "+ Compare" })).not.toBeVisible();
  await expect(page.getByText("In comparison")).toBeVisible();

  await page.getByRole("button", { name: /^Los Angeles, CA/ }).click();
  await page.getByRole("button", { name: "+ Compare" }).click();
  await expect(page.getByTestId("city-comparison-panel")).toContainText("Comparing 2 cities");

  const comparisonPanel = page.getByTestId("city-comparison-panel");
  await expect(comparisonPanel.getByText("New York, NY")).toBeVisible();
  await expect(comparisonPanel.getByText("Los Angeles, CA")).toBeVisible();
  await expect(comparisonPanel.getByTestId("city-comparison-row")).toHaveCount(1); // one active layer (Grass)

  // Both compared cities get their own callout on the map at the same time.
  const map = page.getByTestId("map-frame").locator("svg");
  await expect(map.locator("text", { hasText: "New York, NY" })).toBeVisible();
  await expect(map.locator("text", { hasText: "Los Angeles, CA" })).toBeVisible();

  await comparisonPanel.getByRole("button", { name: /Remove New York, NY/ }).click();
  await expect(comparisonPanel).toContainText("Comparing 1 city");
  await expect(comparisonPanel.getByText("New York, NY")).not.toBeVisible();

  await comparisonPanel.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByTestId("city-comparison-panel")).not.toBeVisible();
});

test("comparison caps at 4 cities -- the 5th city's + Compare button is disabled rather than silently doing nothing", async ({ page }) => {
  await page.goto("/");
  const someCities = ["New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ"];
  for (const name of someCities) {
    await page.getByRole("button", { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }).click();
    const compareButton = page.getByRole("button", { name: "+ Compare" });
    if (await compareButton.isVisible()) {
      if (await compareButton.isEnabled()) {
        await compareButton.click();
      } else {
        await expect(compareButton).toHaveAttribute("title", "Comparison is full -- remove a city first");
      }
    }
  }
  await expect(page.getByTestId("city-comparison-panel")).toContainText("Comparing 4 cities");
  // Phoenix (the 5th) never made it in -- its own button should read "In comparison"
  // only if it happened to be added, which it must not have been.
  await expect(page.getByTestId("city-comparison-panel").getByText("Phoenix, AZ")).not.toBeVisible();
});

test("ranking cities by your active layers: the 'rank all 512 cities' panel sorts correctly and matches real known extremes for grass allergy", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Allergy severity" }).click();
  await page.getByRole("button", { name: "Grass", exact: true }).click();
  await page.getByRole("button", { name: "Add Grass" }).click();
  await page.getByRole("button", { name: "+ Add layer" }).click(); // collapse it again

  await page.getByRole("button", { name: "Custom blend & ranking" }).click();

  const rankAllList = page.getByTestId("city-ranking-list").first();
  await expect(rankAllList).toBeVisible();
  // Bend, OR is grass allergy's real lowest-concern city (verified live
  // earlier this session) -- "Best first" is the default direction.
  await expect(rankAllList.locator("li").first()).toContainText("Bend, OR");

  await page.getByRole("button", { name: "Best first" }).first().click();
  await expect(rankAllList.locator("li").first()).toContainText("Salem, OR");
});

test("regression: the simple view marks the custom-blend overlay with an asterisk once shown on the map, matching /advanced's own convention", async ({ page }) => {
  // Real gap found live by this project's own QA sweep: /advanced's
  // MapLayerControls already asterisks a custom overlay, but this simple
  // root view had no equivalent marker anywhere -- the blend silently
  // colored the map with no visible sign it wasn't a real, shipped layer.
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Allergy severity" }).click();
  await page.getByRole("button", { name: "Grass", exact: true }).click();
  await page.getByRole("button", { name: "Add Grass" }).click();

  await page.getByRole("tab", { name: "Crime", exact: true }).click();
  await page.getByRole("button", { name: "Violent crime", exact: true }).click();
  await page.getByRole("button", { name: "Add Violent crime" }).click();

  await page.getByRole("button", { name: "Custom blend & ranking" }).click();
  await expect(page.getByTestId("custom-blend-asterisk")).not.toBeVisible();

  await page.getByRole("button", { name: "Show your blend on the map" }).click();
  await expect(page.getByTestId("custom-blend-asterisk")).toBeVisible();

  await page.getByRole("button", { name: /Showing your blend on the map/ }).click();
  await expect(page.getByTestId("custom-blend-asterisk")).not.toBeVisible();
});

test("ranking just the compared cities is scoped to that set, not all 512", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Allergy severity" }).click();
  await page.getByRole("button", { name: "Grass", exact: true }).click();
  await page.getByRole("button", { name: "Add Grass" }).click();
  await page.getByRole("button", { name: "+ Add layer" }).click(); // collapse it again

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  await page.getByRole("button", { name: "+ Compare" }).click();
  await page.getByRole("button", { name: /^Los Angeles, CA/ }).click();
  await page.getByRole("button", { name: "+ Compare" }).click();

  await expect(page.getByText("Rank the 2 compared cities")).toBeVisible();
  const scopedList = page.getByTestId("city-ranking-list").last();
  await expect(scopedList.locator("li")).toHaveCount(2);
  const text = await scopedList.textContent();
  expect(text).toContain("New York, NY");
  expect(text).toContain("Los Angeles, CA");
});

test("comparing cities with only a current-snapshot layer active shows an honest 'no historical trend' message, not a fabricated chart", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^New York, NY/ }).click();
  await page.getByRole("button", { name: "+ Compare" }).click();

  const trendPanel = page.getByText("Historical trend").locator("..");
  await expect(trendPanel).toContainText("No historical trend to show yet");
  await expect(trendPanel).toContainText("crime, income, unemployment");
  await expect(trendPanel.locator("svg")).not.toBeVisible();
});

test("comparing cities with Crime active shows a real multi-year trend chart, one line per city", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Crime", exact: true }).click();
  await page.getByRole("button", { name: "Violent crime" }).click();
  await page.getByRole("button", { name: "Add Violent crime" }).click();

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  await page.getByRole("button", { name: "+ Compare" }).click();
  await page.getByRole("button", { name: /^Los Angeles, CA/ }).click();
  await page.getByRole("button", { name: "+ Compare" }).click();

  const trendPanel = page.getByText("Historical trend").locator("..");
  await expect(trendPanel).toContainText("Crime: Violent crime -- real data,");
  await expect(trendPanel.locator("svg")).toBeVisible();
  await expect(trendPanel.getByText("New York, NY")).toBeVisible();
  await expect(trendPanel.getByText("Los Angeles, CA")).toBeVisible();
});

test("chat panel: discloses exactly what the key is used for, requires a key before chatting, and can be forgotten -- cannot test real model calls without a real key", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Chat with the data (experimental, bring your own key)" }).click();

  const disclosure = page.getByText("How this works, in full:").locator("..");
  await expect(disclosure).toContainText("never touches Mapstack's servers, because Mapstack has none");
  await expect(disclosure).toContainText("visible in this browser's network/dev tools");
  await expect(disclosure).toContainText("no access to site code, secrets, or anything else");
  await expect(disclosure).toContainText("billed by Anthropic directly to your own account");

  const startButton = page.getByRole("button", { name: "Start chatting" });
  await expect(startButton).toBeDisabled();

  await page.getByPlaceholder("sk-ant-...").fill("sk-ant-fake-test-key-not-real");
  await expect(startButton).toBeEnabled();
  await startButton.click();

  await expect(page.getByTestId("chat-messages")).toBeVisible();
  await expect(page.getByText("Chatting with your own key.")).toBeVisible();
  await expect(page.getByPlaceholder("Ask about the data…")).toBeVisible();

  await page.getByRole("button", { name: "Forget key" }).click();
  await expect(page.getByPlaceholder("sk-ant-...")).toBeVisible();
  await expect(page.getByTestId("chat-messages")).not.toBeVisible();
});

test("chat panel: remembering a key persists it in localStorage across reload, forgetting it clears that storage", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Chat with the data (experimental, bring your own key)" }).click();
  await page.getByPlaceholder("sk-ant-...").fill("sk-ant-fake-test-key-not-real");
  await page.getByRole("button", { name: "Start chatting" }).click();
  await expect(page.getByTestId("chat-messages")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Chat with the data (experimental, bring your own key)" }).click();
  await expect(page.getByTestId("chat-messages")).toBeVisible();

  await page.getByRole("button", { name: "Forget key" }).click();
  const stored = await page.evaluate(() => window.localStorage.getItem("mapstack_byok_anthropic_key"));
  expect(stored).toBeNull();
});

test("chat panel: switching provider swaps the key field and stores each provider's key separately", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Chat with the data (experimental, bring your own key)" }).click();

  await expect(page.getByPlaceholder("sk-ant-...")).toBeVisible();
  await page.getByRole("radio", { name: "OpenAI (GPT)" }).click();
  await expect(page.getByPlaceholder("sk-...")).toBeVisible();
  await page.getByPlaceholder("sk-...").fill("sk-fake-openai-test-key-not-real");
  await page.getByRole("button", { name: "Start chatting" }).click();
  await expect(page.getByTestId("chat-messages")).toBeVisible();
  await expect(page.getByText("(OpenAI)")).toBeVisible();

  const openaiStored = await page.evaluate(() => window.localStorage.getItem("mapstack_byok_openai_key"));
  expect(openaiStored).toBe("sk-fake-openai-test-key-not-real");
  const anthropicStored = await page.evaluate(() => window.localStorage.getItem("mapstack_byok_anthropic_key"));
  expect(anthropicStored).toBeNull();

  await page.getByRole("button", { name: "Forget key" }).click();
  await page.getByRole("radio", { name: "Google (Gemini)" }).click();
  await expect(page.getByPlaceholder("AIza...")).toBeVisible();
});

test("regression: chat provider radiogroup supports real roving-tabindex arrow-key navigation, matching the WAI-ARIA APG pattern", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Chat with the data (experimental, bring your own key)" }).click();

  const anthropicRadio = page.getByRole("radio", { name: "Anthropic (Claude)" });
  const openaiRadio = page.getByRole("radio", { name: "OpenAI (GPT)" });
  const googleRadio = page.getByRole("radio", { name: "Google (Gemini)" });

  // Only the checked radio is a real Tab stop (roving tabindex) -- the
  // other two are skipped entirely when tabbing through the page.
  await expect(anthropicRadio).toHaveAttribute("tabindex", "0");
  await expect(openaiRadio).toHaveAttribute("tabindex", "-1");
  await expect(googleRadio).toHaveAttribute("tabindex", "-1");

  await anthropicRadio.focus();
  await page.keyboard.press("ArrowRight");
  await expect(openaiRadio).toBeFocused();
  await expect(openaiRadio).toHaveAttribute("aria-checked", "true");
  await expect(anthropicRadio).toHaveAttribute("tabindex", "-1");
  await expect(page.getByPlaceholder("sk-...")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(googleRadio).toBeFocused();
  await expect(page.getByPlaceholder("AIza...")).toBeVisible();

  // Wraps around from the last option back to the first.
  await page.keyboard.press("ArrowRight");
  await expect(anthropicRadio).toBeFocused();
  await expect(page.getByPlaceholder("sk-ant-...")).toBeVisible();

  // ArrowLeft wraps the other direction, to the last option.
  await page.keyboard.press("ArrowLeft");
  await expect(googleRadio).toBeFocused();
});

test("the ACS5-cluster datasets (income, housing affordability, property tax, population change) now carry real multi-year history, not just a current snapshot", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add layer" }).click();
  await page.getByRole("tab", { name: "Median household income" }).click();
  await page.getByRole("button", { name: "Median household income", exact: true }).click();
  await page.getByRole("button", { name: "Add Median household income" }).click();

  const yearSelect = page.getByLabel("Year", { exact: true });
  await expect(yearSelect).toBeVisible();
  await expect(yearSelect).toHaveValue("2023");

  await page.getByRole("button", { name: /^New York, NY/ }).click();
  const detail = page.getByTestId("city-detail-row").filter({ hasText: "Median household income" });
  await expect(detail).toContainText("2023");

  await yearSelect.selectOption("2009");
  await expect(detail).toContainText("2009");
});
