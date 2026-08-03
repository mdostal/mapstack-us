import { describe, expect, it } from "vitest";
import { transitAccessDataset } from "@/lib/datasets/transit-access";
import cities from "@data/cities.json";

describe("transitAccessDataset (Dataset interface, twelfth real implementation, ID-joined NTD/Urban Area data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(transitAccessDataset.id).toBe("transit-access");
    expect(transitAccessDataset.layers.map((l) => l.id)).toEqual(["service_level"]);
    expect(transitAccessDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a VRM-labeled detail for a covered city", () => {
    const result = transitAccessDataset.getValue("new-york-ny", "service_level");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("vehicle-revenue-miles");
    expect(result!.detail).toContain("National Transit Database");
  });

  it("scores a well-served city (New York) less concerning than a car-dependent one", () => {
    const nyc = transitAccessDataset.getValue("new-york-ny", "service_level");
    const carDependent = transitAccessDataset.getValue("plano-tx", "service_level");
    expect(nyc).not.toBeNull();
    expect(carDependent).not.toBeNull();
    expect(nyc!.value).toBeLessThan(carDependent!.value);
  });

  it("returns null for a real gap where NTD has no reporting agency, not a fabricated worst-case value", () => {
    expect(transitAccessDataset.getValue("provo-ut", "service_level")).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(transitAccessDataset.getValue("not-a-real-city", "service_level")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(transitAccessDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the large majority of cities in the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (transitAccessDataset.getValue(city.id, "service_level") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(40);
  });
});
