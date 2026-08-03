import { describe, expect, it } from "vitest";
import { decodeView, encodeView } from "@/lib/url-state";

describe("url-state", () => {
  it("round-trips a view with a single sort key", () => {
    const view = {
      selections: [
        { datasetId: "allergy", layerId: "grass" },
        { datasetId: "crime", layerId: "violent_crime" },
      ],
      sortKeys: [{ layer: { datasetId: "crime", layerId: "violent_crime" }, direction: "desc" as const }],
    };
    expect(decodeView(encodeView(view))).toEqual(view);
  });

  it("round-trips a view with multiple (tie-break) sort keys, in order", () => {
    const view = {
      selections: [
        { datasetId: "allergy", layerId: "grass" },
        { datasetId: "crime", layerId: "violent_crime" },
      ],
      sortKeys: [
        { layer: { datasetId: "allergy", layerId: "grass" }, direction: "asc" as const },
        { layer: { datasetId: "crime", layerId: "violent_crime" }, direction: "desc" as const },
      ],
    };
    expect(decodeView(encodeView(view))).toEqual(view);
  });

  it("round-trips a view with no sort selected", () => {
    const view = { selections: [{ datasetId: "allergy", layerId: "grass" }], sortKeys: [] };
    expect(decodeView(encodeView(view))).toEqual(view);
  });

  it("fails open to null on garbage input, never throws", () => {
    expect(() => decodeView("not valid at all %%%")).not.toThrow();
    expect(decodeView("not valid at all %%%")).toBeNull();
  });

  it("fails open to null on well-formed JSON missing the required selections field", () => {
    expect(decodeView(encodeURIComponent(JSON.stringify({ foo: "bar" })))).toBeNull();
  });

  it("reads an older single sortBy/direction link into a single-entry sortKeys array", () => {
    const raw = encodeURIComponent(
      JSON.stringify({
        selections: [{ datasetId: "allergy", layerId: "grass" }],
        sortBy: { datasetId: "allergy", layerId: "grass" },
        direction: "desc",
      }),
    );
    expect(decodeView(raw)?.sortKeys).toEqual([
      { layer: { datasetId: "allergy", layerId: "grass" }, direction: "desc" },
    ]);
  });

  it("reads an older link with no sortBy into an empty sortKeys array, defaulting direction to asc if it were present", () => {
    const raw = encodeURIComponent(JSON.stringify({ selections: [], sortBy: null }));
    expect(decodeView(raw)?.sortKeys).toEqual([]);
  });
});
