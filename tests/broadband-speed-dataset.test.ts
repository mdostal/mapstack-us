import { describe, expect, it } from "vitest";
import { broadbandSpeedDataset } from "@/lib/datasets/broadband-speed";
import cities from "@data/cities.json";

describe("broadbandSpeedDataset (Dataset interface, thirty-eighth real implementation, real FCC National Broadband Map data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(broadbandSpeedDataset.id).toBe("broadband-speed");
    expect(broadbandSpeedDataset.layers.map((l) => l.id)).toEqual(["gigabit_availability"]);
    expect(broadbandSpeedDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a gigabit-availability detail for a covered city", () => {
    const result = broadbandSpeedDataset.getValue("new-york-ny", "gigabit_availability");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("gigabit (1000/100 Mbps) broadband access");
    expect(result!.detail).toContain("FCC National Broadband Map");
  });

  it("returns null for an unknown city id", () => {
    expect(broadbandSpeedDataset.getValue("not-a-real-city", "gigabit_availability")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(broadbandSpeedDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the overwhelming majority of the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (broadbandSpeedDataset.getValue(city.id, "gigabit_availability") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(cities.length * 0.1);
  });

  it("returns null for the known Connecticut geography-vintage gap, not a fabricated value", () => {
    expect(broadbandSpeedDataset.getValue("hartford-ct", "gigabit_availability")).toBeNull();
  });
});
