import { describe, expect, it } from "vitest";
import { trafficFatalitiesDataset } from "@/lib/datasets/traffic-fatalities";
import cities from "@data/cities.json";

describe("trafficFatalitiesDataset (Dataset interface, eleventh real implementation, county-level CHR/NVSS data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(trafficFatalitiesDataset.id).toBe("traffic-fatalities");
    expect(trafficFatalitiesDataset.layers.map((l) => l.id)).toEqual(["crash_death_rate"]);
    expect(trafficFatalitiesDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a rate-labeled detail for a covered city", () => {
    const result = trafficFatalitiesDataset.getValue("new-york-ny", "crash_death_rate");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("per 100k");
    expect(result!.detail).toContain("County Health Rankings");
  });

  it("returns null for an unknown city id", () => {
    expect(trafficFatalitiesDataset.getValue("not-a-real-city", "crash_death_rate")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(trafficFatalitiesDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the large majority of cities in the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (trafficFatalitiesDataset.getValue(city.id, "crash_death_rate") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(10);
  });
});
