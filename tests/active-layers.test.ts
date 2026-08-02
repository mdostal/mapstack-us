import { describe, expect, it } from "vitest";
import { resolveActiveLayer, isSameLayer, activeLayerKey } from "@/lib/active-layers";

describe("active-layers", () => {
  it("resolves a real (dataset, layer) pair to its full Dataset + DatasetLayer", () => {
    const resolved = resolveActiveLayer({ datasetId: "allergy", layerId: "grass" });
    expect(resolved).not.toBeNull();
    expect(resolved!.dataset.id).toBe("allergy");
    expect(resolved!.layer.id).toBe("grass");
  });

  it("returns null for an unknown dataset id", () => {
    expect(resolveActiveLayer({ datasetId: "not-a-real-dataset", layerId: "x" })).toBeNull();
  });

  it("returns null for an unknown layer id within a real dataset", () => {
    expect(resolveActiveLayer({ datasetId: "allergy", layerId: "not-a-real-layer" })).toBeNull();
  });

  it("isSameLayer compares by dataset+layer id, not object identity", () => {
    expect(isSameLayer({ datasetId: "allergy", layerId: "grass" }, { datasetId: "allergy", layerId: "grass" })).toBe(
      true,
    );
    expect(isSameLayer({ datasetId: "allergy", layerId: "grass" }, { datasetId: "crime", layerId: "grass" })).toBe(
      false,
    );
  });

  it("activeLayerKey produces a unique, stable string per (dataset, layer) pair", () => {
    expect(activeLayerKey({ datasetId: "allergy", layerId: "grass" })).toBe("allergy::grass");
    expect(activeLayerKey({ datasetId: "crime", layerId: "violent_crime" })).toBe("crime::violent_crime");
  });
});
