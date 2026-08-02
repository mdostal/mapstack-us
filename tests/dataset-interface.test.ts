import { describe, expect, it } from "vitest";
import type { Dataset } from "@/lib/datasets/types";

/**
 * Proves the generalized Dataset interface is actually usable by a
 * genuinely different, minimal fake dataset -- not just the one real
 * (allergy) implementation, which alone couldn't prove the abstraction
 * generalizes.
 */
const mockDataset: Dataset = {
  id: "mock",
  label: "Mock dataset",
  description: "A fake dataset for interface-contract testing.",
  methodologyUrl: "https://example.com/methodology",
  supportsTime: true,
  layers: [
    { id: "layer-a", label: "Layer A" },
    { id: "layer-b", label: "Layer B" },
  ],
  getValue(cityId, layerId, context) {
    if (cityId === "unknown-city") return null;
    const base = layerId === "layer-a" ? 20 : 80;
    const monthBoost = context?.month ? context.month : 0;
    return { value: Math.min(100, base + monthBoost), tier: base > 50 ? "high" : "low", detail: `${base}` };
  },
};

describe("Dataset interface contract", () => {
  it("a dataset exposes its layers as a fixed list", () => {
    expect(mockDataset.layers.map((l) => l.id)).toEqual(["layer-a", "layer-b"]);
  });

  it("getValue returns null for a real gap, not a fabricated value", () => {
    expect(mockDataset.getValue("unknown-city", "layer-a")).toBeNull();
  });

  it("getValue returns a 0-100 value with a detail string for a known city/layer", () => {
    const result = mockDataset.getValue("new-york-ny", "layer-a");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toBeTruthy();
  });

  it("a supportsTime: true dataset can vary its value by the optional time context", () => {
    const noMonth = mockDataset.getValue("new-york-ny", "layer-a");
    const withMonth = mockDataset.getValue("new-york-ny", "layer-a", { month: 6 });
    expect(withMonth!.value).toBeGreaterThan(noMonth!.value);
  });

  it("a supportsTime: false dataset is free to ignore the time context entirely", () => {
    const noTimeDataset: Dataset = { ...mockDataset, supportsTime: false, getValue: () => ({ value: 50, detail: "fixed" }) };
    expect(noTimeDataset.getValue("x", "layer-a", { month: 6 })!.value).toBe(50);
  });
});
