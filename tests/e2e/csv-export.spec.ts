import { test, expect } from "@playwright/test";

test("exporting the comparison table downloads a CSV with a header row and one row per visible city", async ({
  page,
}) => {
  await page.goto("/advanced");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^mapstack-comparison-\d{4}-\d{2}-\d{2}\.csv$/);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const csv = Buffer.concat(chunks).toString("utf-8");

  const lines = csv.trim().split("\n");
  expect(lines[0]).toBe("City,Allergy severity: Grass,Crime: Violent crime");
  // 168 cities + 1 header row.
  expect(lines).toHaveLength(169);
  // The city label itself contains a comma ("New York, NY"), so a correct
  // CSV writer quotes it -- this also doubles as an escaping sanity check.
  expect(lines.some((l) => l.startsWith('"New York, NY",'))).toBe(true);
});

test("exported CSV reflects the currently applied filter, not the full unfiltered list", async ({ page }) => {
  await page.goto("/advanced");
  await page.getByLabel("Minimum Allergy severity: Grass").fill("90");
  await page.getByRole("button", { name: "Apply filter" }).click();
  await expect.poll(() => page.locator("tbody tr").count()).toBeLessThan(168);
  const filteredRowCount = await page.locator("tbody tr").count();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const csv = Buffer.concat(chunks).toString("utf-8");
  const dataLines = csv.trim().split("\n").slice(1);

  expect(dataLines).toHaveLength(filteredRowCount);
});
