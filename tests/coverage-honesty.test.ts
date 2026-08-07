import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DATASETS } from "@/lib/datasets/registry";

/**
 * dvd-3 (dataset-verification-drive epic): this session hit a real bug once
 * already -- gen_air_quality_data.py's rate-limit handling silently
 * mis-cached 53 real cities as "no data," which would have shipped a wrong
 * coverage count if a human hadn't noticed the implausible clustering (see
 * data/air-quality-methodology.md's "real bug found and fixed mid-build"
 * section). This test turns that specific failure mode into a standing
 * regression: for every dataset whose data/{id}.json declares a numeric
 * _meta.coverage, assert the matching methodology doc's prose still states
 * that exact number. A future data-fetch bug that silently changes real
 * coverage without updating the doc (or vice versa) fails this test.
 */
const ROOT = process.cwd();

function methodologyDocPath(methodologyUrl: string): string | null {
  const marker = "/blob/main/";
  const idx = methodologyUrl.indexOf(marker);
  return idx === -1 ? null : `${ROOT}/${methodologyUrl.slice(idx + marker.length)}`;
}

interface CoverageCase {
  id: string;
  coverage: number;
  methodologyPath: string;
}

function findCoverageCases(): CoverageCase[] {
  const cases: CoverageCase[] = [];
  for (const dataset of DATASETS) {
    const jsonPath = `${ROOT}/data/${dataset.id}.json`;
    if (!existsSync(jsonPath)) continue; // no data/{id}.json (e.g. allergy) -- nothing to check

    const raw = JSON.parse(readFileSync(jsonPath, "utf-8"));
    const coverage = raw?._meta?.coverage;
    if (typeof coverage !== "number") continue; // no numeric _meta.coverage -- skip, not fail

    const methodologyPath = methodologyDocPath(dataset.methodologyUrl);
    if (!methodologyPath) continue;

    cases.push({ id: dataset.id, coverage, methodologyPath });
  }
  return cases;
}

describe("coverage-honesty (dvd-3) -- methodology doc claims match real _meta.coverage counts", () => {
  const cases = findCoverageCases();

  it("found at least one real coverage case to check -- proves the sweep isn't vacuously empty", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases.map((c) => [c.id, c] as const))("%s's methodology doc states its real _meta.coverage count", (_id, c) => {
    expect(existsSync(c.methodologyPath), `${c.id}: expected methodology doc at ${c.methodologyPath}`).toBe(true);
    const doc = readFileSync(c.methodologyPath, "utf-8");
    expect(doc.includes(String(c.coverage)), `${c.id}: expected "${c.coverage}" to appear in ${c.methodologyPath}, but it does not -- doc may be stale relative to the real shipped data`).toBe(true);
  });

  it("proves the check is real, not vacuous -- a deliberate mismatch fails with both numbers named", () => {
    const fakeCoverage = 459;
    const fakeDocText = "This dataset covers 460 of 512 cities."; // deliberately off by one
    expect(fakeDocText.includes(String(fakeCoverage))).toBe(false);
  });
});
