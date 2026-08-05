import { describe, expect, it } from "vitest";
import { unemploymentDataset } from "@/lib/datasets/unemployment";
import cities from "@data/cities.json";

describe("unemploymentDataset (Dataset interface, twenty-fourth real implementation, real BLS LAUS data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(unemploymentDataset.id).toBe("unemployment");
    expect(unemploymentDataset.layers.map((l) => l.id)).toEqual(["unemployment_rate"]);
    expect(unemploymentDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a rate-labeled detail for a city-tier city", () => {
    const result = unemploymentDataset.getValue("new-york-ny", "unemployment_rate");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("unemployment rate");
    expect(result!.detail).toContain("city rate");
    expect(result!.detail).toContain("BLS LAUS");
  });

  it("labels a county-tier fallback city's detail as a county rate, not city-specific", () => {
    const result = unemploymentDataset.getValue("arlington-va", "unemployment_rate");
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("county rate");
    expect(result!.detail).toContain("no city-specific LAUS series");
  });

  it("returns null for an unknown city id", () => {
    expect(unemploymentDataset.getValue("not-a-real-city", "unemployment_rate")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(unemploymentDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (unemploymentDataset.getValue(city.id, "unemployment_rate") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("Flint, MI (a well-known high-unemployment city) scores at or near maximum concern", () => {
    const result = unemploymentDataset.getValue("flint-mi", "unemployment_rate");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(90);
  });
});
