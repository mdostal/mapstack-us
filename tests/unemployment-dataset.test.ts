import { describe, expect, it } from "vitest";
import { unemploymentDataset } from "@/lib/datasets/unemployment";
import cities from "@data/cities.json";

describe("unemploymentDataset (Dataset interface, twenty-fourth real implementation, real BLS LAUS data, 1976-2026)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(unemploymentDataset.id).toBe("unemployment");
    expect(unemploymentDataset.layers.map((l) => l.id)).toEqual(["unemployment_rate"]);
    expect(unemploymentDataset.supportsTime).toBe(true);
    expect(unemploymentDataset.availableYears![0]).toBe(1976);
    expect(unemploymentDataset.availableYears![unemploymentDataset.availableYears!.length - 1]).toBe(2026);
  });

  it("returns a 0-100 value with a rate-labeled detail for a city-tier city, defaulting to the latest year", () => {
    const result = unemploymentDataset.getValue("new-york-ny", "unemployment_rate");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("unemployment rate");
    expect(result!.detail).toContain("city rate");
    expect(result!.detail).toContain("2026");
    expect(result!.detail).toContain("BLS LAUS");
  });

  it("an explicit earlier real year returns a real, different value than the default (latest year)", () => {
    const latest = unemploymentDataset.getValue("new-york-ny", "unemployment_rate");
    const early = unemploymentDataset.getValue("new-york-ny", "unemployment_rate", { year: 1976 });
    expect(latest).not.toBeNull();
    expect(early).not.toBeNull();
    expect(early!.detail).toContain("1976");
    expect(early!.value).not.toBe(latest!.value);
  });

  it("returns null for a year before the real 1976 floor -- LAUS's own real program start", () => {
    expect(unemploymentDataset.getValue("new-york-ny", "unemployment_rate", { year: 1975 })).toBeNull();
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

  it("has a real value for every city in the spine at the latest year -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (unemploymentDataset.getValue(city.id, "unemployment_rate") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("Pharr, TX's real 1990 rate (27.9%, a real historical peak) scores at maximum concern", () => {
    const result = unemploymentDataset.getValue("pharr-tx", "unemployment_rate", { year: 1990 });
    expect(result).not.toBeNull();
    expect(result!.value).toBe(100);
  });
});
