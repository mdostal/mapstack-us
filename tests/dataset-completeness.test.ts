import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DATASETS } from "@/lib/datasets/registry";
import type { Dataset } from "@/lib/datasets/types";

/**
 * dvd-1 (dataset-verification-drive epic): no test previously walked the
 * real DATASETS registry and asserted every entry has its four required
 * artifacts. tests/dataset-interface.test.ts only proves the interface
 * shape via one hand-built mock -- it never touches the registry. All 27
 * real datasets already satisfy the checks below; this is a regression
 * guard against future drift, not a fix for an existing gap.
 */
const ROOT = process.cwd();
const E2E_SPEC = readFileSync(`${ROOT}/tests/e2e/mapstack.spec.ts`, "utf-8");
const README = readFileSync(`${ROOT}/README.md`, "utf-8");

function methodologyDocPath(dataset: Dataset): string {
  // methodologyUrl points at a GitHub blob URL for a file under data/ --
  // e.g. ".../blob/main/data/cost-of-living-methodology.md". Extract the
  // real on-disk path rather than assuming a fixed {id}-methodology.md
  // name, since at least one real dataset (allergy) doesn't follow it.
  const marker = "/blob/main/";
  const idx = dataset.methodologyUrl.indexOf(marker);
  expect(idx, `${dataset.id}: methodologyUrl does not look like a github.com/.../blob/main/... link`).toBeGreaterThan(-1);
  return `${ROOT}/${dataset.methodologyUrl.slice(idx + marker.length)}`;
}

describe("dataset registry completeness (dvd-1) -- every dataset has its four required artifacts", () => {
  it.each(DATASETS.map((d) => [d.id, d] as const))("%s has a real methodology doc on disk", (_id, dataset) => {
    const path = methodologyDocPath(dataset);
    expect(existsSync(path), `${dataset.id}: expected methodology doc at ${path}`).toBe(true);
  });

  it.each(DATASETS.map((d) => [d.id, d] as const))("%s has a real unit test file", (_id, dataset) => {
    const path = `${ROOT}/tests/${dataset.id}-dataset.test.ts`;
    expect(existsSync(path), `${dataset.id}: expected unit test file at ${path}`).toBe(true);
  });

  it.each(DATASETS.map((d) => [d.id, d] as const))("%s's label is referenced in the e2e spec suite", (_id, dataset) => {
    expect(E2E_SPEC.includes(dataset.label), `${dataset.id}: expected "${dataset.label}" to appear somewhere in tests/e2e/mapstack.spec.ts`).toBe(true);
  });

  it.each(DATASETS.map((d) => [d.id, d] as const))("%s's label is referenced in README.md", (_id, dataset) => {
    expect(README.includes(dataset.label), `${dataset.id}: expected "${dataset.label}" to appear somewhere in README.md`).toBe(true);
  });

  it("proves the checks are real, not vacuous -- a mock dataset missing an artifact fails with a diagnosable message", () => {
    const fakeDataset: Dataset = {
      id: "not-a-real-dataset-id",
      label: "Definitely Not A Real Label String",
      description: "fixture only",
      methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/not-a-real-dataset-id-methodology.md",
      supportsTime: false,
      layers: [{ id: "x", label: "x" }],
      getValue: () => null,
    };

    expect(existsSync(methodologyDocPath(fakeDataset))).toBe(false);
    expect(existsSync(`${ROOT}/tests/${fakeDataset.id}-dataset.test.ts`)).toBe(false);
    expect(E2E_SPEC.includes(fakeDataset.label)).toBe(false);
    expect(README.includes(fakeDataset.label)).toBe(false);
  });
});
