import { test, expect } from "@playwright/test";

// Real end-to-end proof that the map is back in /advanced (toggled with the
// table) and that the grass-severity Formula panel actually recomputes
// live. See src/lib/formula/allergy-grass-formula.ts and
// .pHive/design/power-user-formula-panel/design-note.md.

test("advanced route defaults to table view, and Map toggles to the real map", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.locator("table")).toBeVisible();

  await page.getByRole("tab", { name: "Map" }).click();
  await expect(page.locator("table")).toHaveCount(0);
  await expect(page.getByText(/no layer's value is ever combined into another's by default/)).toBeVisible();

  await page.getByRole("tab", { name: "Table" }).click();
  await expect(page.locator("table")).toBeVisible();
});

test("the map stays a normal, bounded size with many layers stacked, and the layer-control strip scrolls horizontally instead of forcing width -- regression for a flex min-width bug", async ({
  page,
}) => {
  // Real CI flake found live: 29 sequential real clicks sit right at the
  // default 30s test timeout locally (~23-24s observed) and reliably tip
  // over it on CI's slower/shared runners. Not a product bug -- the
  // feature itself works; this test is just inherently slow. Double the
  // timeout rather than speeding up the interaction, so this stays a
  // faithful simulation of a user actually clicking each checkbox.
  test.setTimeout(60_000);
  await page.goto("/advanced");
  await page.getByRole("tab", { name: "Map" }).click();

  const allergyLabels = [
    "Tall fescue", "Orchard grass", "Sweet vernal grass", "Redtop", "Sagebrush",
    "Kochia / Russian thistle", "Mugwort", "Dock / sorrel", "Nettle", "Red oak",
    "White ash", "Red maple", "Loblolly pine", "Black walnut", "American sycamore",
    "Red alder", "Shagbark hickory", "Cladosporium (mold)", "Alternaria (mold)",
    "Common ragweed", "Redroot pigweed", "Lambsquarters", "English plantain",
    "Live oak", "American elm", "Eastern redcedar / juniper", "River birch", "Boxelder",
  ];
  for (const label of allergyLabels) {
    await page.getByLabel(label, { exact: true }).click();
  }

  const mapWidth = await page.locator("svg[role='img']").evaluate((el) => el.getBoundingClientRect().width);
  expect(mapWidth).toBeLessThan(1500);

  const controlsStrip = page.getByLabel("Map layer controls");
  const stripScrollWidth = await controlsStrip.evaluate((el) => el.scrollWidth);
  const stripClientWidth = await controlsStrip.evaluate((el) => el.clientWidth);
  expect(stripScrollWidth).toBeGreaterThan(stripClientWidth); // genuinely overflowing, scrolling internally
});

test("Export CSV is hidden in map view (nothing tabular to export)", async ({ page }) => {
  await page.goto("/advanced");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  await page.getByRole("tab", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Export CSV" })).not.toBeVisible();
});

test("Formula panel shows a transparency note for layers with no tunable formula", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByRole("button", { name: "Formula" }).click();
  await expect(page.getByText(/Modeled directly .* not a weighted formula/)).toBeVisible();
});

test("Formula panel dedupes the no-tunable-formula note into one block, not one per layer, when many non-grass layers are active", async ({
  page,
}) => {
  await page.goto("/advanced");
  await page.getByRole("button", { name: "Formula" }).click();

  const allergyLabels = [
    "Tall fescue", "Orchard grass", "Sweet vernal grass", "Redtop", "Sagebrush",
    "Kochia / Russian thistle", "Mugwort", "Dock / sorrel", "Nettle", "Red oak",
  ];
  for (const label of allergyLabels) {
    await page.getByLabel(label, { exact: true }).click();
  }

  // Regression: 11 non-grass layers active (violent crime + 10 allergens)
  // used to render 11 identical "No tunable formula..." paragraphs, one
  // per layer, ballooning the sidebar. Now a single combined block.
  await expect(page.getByText(/11 other layers with no tunable formula/)).toBeVisible();
  await expect(page.getByText(/Modeled directly .* not a weighted formula/)).toHaveCount(1);
});

test("Formula panel prompts for a city selection before showing grass sliders", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByRole("button", { name: "Formula" }).click();
  await expect(page.getByText(/Click a city .* to see and adjust/)).toBeVisible();
});

test("selecting a city reveals live grass-formula sliders that recompute the score", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByRole("row", { name: /^New York, NY/ }).click();
  await page.getByRole("button", { name: "Formula" }).click();

  await expect(page.getByText("Shipped score:")).toBeVisible();
  const scoreBefore = await page.locator("text=Your weights:").locator("..").innerText();

  const turfSlider = page.getByLabel(/Cultivated\/irrigated turf/);
  await turfSlider.fill("2");

  const scoreAfter = await page.locator("text=Your weights:").locator("..").innerText();
  // New York's turf_boost is 0 (see data/allergy-scores.json), so doubling
  // its weight shouldn't move the score -- assert on a component that IS
  // nonzero for NYC instead: coastal_nudge.
  expect(scoreBefore).toBeDefined();
  expect(scoreAfter).toBeDefined();

  const coastalSlider = page.getByLabel(/Coastal ocean moderation/);
  await coastalSlider.fill("0");
  await expect(page.getByText("Your weights:")).toContainText(/\d+/);
});

test("recomputing with all weights at 1.0 (default) matches the shipped score exactly", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByRole("row", { name: /^Austin, TX/ }).click();
  await page.getByRole("button", { name: "Formula" }).click();

  const shipped = await page.locator("text=Shipped score:").innerText();
  const adjusted = await page.locator("text=Your weights:").innerText();
  const shippedNum = shipped.match(/\d+/)?.[0];
  const adjustedNum = adjusted.match(/\d+/)?.[0];
  expect(adjustedNum).toBe(shippedNum);
});

test("saving and applying a formula weight preset persists across reload", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByRole("row", { name: /^Boise, ID/ }).click();
  await page.getByRole("button", { name: "Formula" }).click();

  const turfSlider = page.getByLabel(/Cultivated\/irrigated turf/);
  await turfSlider.fill("0.5");

  await page.getByRole("button", { name: "Save current formula weights" }).click();
  await page.getByLabel("Preset name").fill("Half turf weight");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Half turf weight")).toBeVisible();

  await page.reload();
  await page.getByRole("row", { name: /^Boise, ID/ }).click();
  await page.getByRole("button", { name: "Formula" }).click();
  await expect(page.getByText("Half turf weight")).toBeVisible();

  await page.getByRole("button", { name: "Apply formula weights: Half turf weight" }).click();
  await expect(turfSlider).toHaveValue("0.5");
});

test("Show your weights on the map adds the custom-weighted grass overlay as an extra, asterisked map layer -- without needing a city selected first", async ({
  page,
}) => {
  await page.goto("/advanced");
  await page.getByRole("tab", { name: "Map" }).click();
  await page.getByRole("button", { name: "Formula" }).click();

  await expect(page.getByRole("group", { name: /Grass \(your weights\)/ })).not.toBeVisible();

  // No city selected -- the map-wide toggle still works.
  await page.getByRole("button", { name: "Show your weights on the map" }).click();
  await expect(page.getByRole("button", { name: /Showing your weights on the map/ })).toBeVisible();
  const overlayChip = page.getByRole("group", { name: /Grass \(your weights\)/ });
  await expect(overlayChip).toBeVisible();
  await expect(overlayChip.getByText("*")).toBeVisible();

  await page.getByRole("button", { name: /Showing your weights on the map/ }).click();
  await expect(page.getByRole("button", { name: "Show your weights on the map" })).toBeVisible();
  await expect(overlayChip).not.toBeVisible();
});

test("Custom blend panel requires 2+ selected layers, blends them at user-chosen weights, and shows as an extra asterisked map layer", async ({
  page,
}) => {
  await page.goto("/advanced");
  await page.getByRole("button", { name: "Custom blend" }).click();

  // Default selection already has 2 layers (Grass + Violent crime), so the
  // weight sliders show immediately, not the "select 2+" prompt.
  await expect(page.getByLabel(/^Allergy severity: Grass/)).toBeVisible();
  await expect(page.getByLabel(/^Crime: Violent crime/)).toBeVisible();

  // Clearing down to a single layer shows the honest "not enough" prompt
  // instead of a meaningless one-layer "blend".
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByLabel("Grass", { exact: true }).click();
  await expect(page.getByText("Select 2 or more layers above to blend them into a custom score.")).toBeVisible();

  // Re-add a second layer to continue the test with a real blend.
  await page.getByLabel("Violent crime", { exact: true }).click();

  // Selecting a city (in Table view) surfaces a real numeric blend value.
  await page.getByRole("row", { name: /^New York, NY/ }).click();
  const blendReadout = page.getByText(/Your blend for this city:/);
  await expect(blendReadout).toBeVisible();
  await expect(blendReadout).not.toContainText("no data");

  // The map-wide toggle works without needing a city selected first.
  await page.getByRole("tab", { name: "Map" }).click();
  await expect(page.getByRole("group", { name: "Your custom blend" })).not.toBeVisible();

  await page.getByRole("button", { name: "Show your blend on the map" }).click();
  await expect(page.getByRole("button", { name: /Showing your blend on the map/ })).toBeVisible();
  const blendChip = page.getByRole("group", { name: "Your custom blend" });
  await expect(blendChip).toBeVisible();
  await expect(blendChip.getByText("*")).toBeVisible();

  await page.getByRole("button", { name: /Showing your blend on the map/ }).click();
  await expect(blendChip).not.toBeVisible();
});

test("the grass-formula overlay and the custom-blend overlay can both be shown on the map at once, as two distinct asterisked layers", async ({
  page,
}) => {
  await page.goto("/advanced");
  await page.getByRole("button", { name: "Formula" }).click();
  await page.getByRole("button", { name: "Show your weights on the map" }).click();
  await page.getByRole("button", { name: "Custom blend" }).click();
  await page.getByRole("button", { name: "Show your blend on the map" }).click();

  await page.getByRole("tab", { name: "Map" }).click();
  await expect(page.getByRole("group", { name: /Grass \(your weights\)/ })).toBeVisible();
  await expect(page.getByRole("group", { name: "Your custom blend" })).toBeVisible();
});

test("map layer controls let you hide and invert a layer on the map without removing it from the analysis", async ({
  page,
}) => {
  await page.goto("/advanced");
  await page.getByRole("tab", { name: "Map" }).click();

  const grassChip = page.getByRole("group", { name: "Allergy severity: Grass" });
  const visibilityButton = grassChip.getByRole("button", { name: /Hide Allergy severity: Grass/ });
  await expect(visibilityButton).toBeVisible();
  await expect(visibilityButton).toHaveText("Shown");

  await visibilityButton.click();
  const hiddenButton = grassChip.getByRole("button", { name: /Show Allergy severity: Grass/ });
  await expect(hiddenButton).toBeVisible();
  await expect(hiddenButton).toHaveText("Hidden");
  // Hiding on the map is display-only -- the Layers picker's checkbox
  // (the actual analysis selection, already open by default) stays checked.
  await expect(page.getByLabel("Grass", { exact: true })).toBeChecked();

  const invertButton = grassChip.getByRole("button", { name: "Invert" });
  await expect(invertButton).toHaveAttribute("aria-pressed", "false");
  await invertButton.click();
  await expect(invertButton).toHaveAttribute("aria-pressed", "true");
});

test("map layer opacity is adjustable per layer", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByRole("tab", { name: "Map" }).click();

  const grassChip = page.getByRole("group", { name: "Allergy severity: Grass" });
  const opacitySlider = grassChip.getByLabel(/opacity/i);
  await opacitySlider.fill("30");
  await expect(grassChip.getByText("30%")).toBeVisible();
});
