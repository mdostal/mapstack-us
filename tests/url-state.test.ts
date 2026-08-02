import { describe, expect, it } from "vitest";
import { decodeView, encodeView } from "@/lib/url-state";

describe("url-state", () => {
  it("round-trips a view through encode/decode", () => {
    const view = {
      selections: [
        { datasetId: "allergy", layerId: "grass" },
        { datasetId: "crime", layerId: "violent_crime" },
      ],
      sortBy: { datasetId: "crime", layerId: "violent_crime" },
      direction: "desc" as const,
    };
    expect(decodeView(encodeView(view))).toEqual(view);
  });

  it("round-trips a view with no sort selected", () => {
    const view = { selections: [{ datasetId: "allergy", layerId: "grass" }], sortBy: null, direction: "asc" as const };
    expect(decodeView(encodeView(view))).toEqual(view);
  });

  it("fails open to null on garbage input, never throws", () => {
    expect(() => decodeView("not valid at all %%%")).not.toThrow();
    expect(decodeView("not valid at all %%%")).toBeNull();
  });

  it("fails open to null on well-formed JSON missing the required selections field", () => {
    expect(decodeView(encodeURIComponent(JSON.stringify({ foo: "bar" })))).toBeNull();
  });

  it("defaults direction to asc when the encoded value is missing or invalid", () => {
    const raw = encodeURIComponent(JSON.stringify({ selections: [], sortBy: null }));
    expect(decodeView(raw)?.direction).toBe("asc");
  });
});
