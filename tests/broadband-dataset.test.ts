import { describe, expect, it } from "vitest";
import { broadbandDataset } from "@/lib/datasets/broadband";
import cities from "@data/cities.json";

describe("broadbandDataset (Dataset interface, sixteenth real implementation, CHR/ACS county-level data, 2021-2025)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(broadbandDataset.id).toBe("broadband");
    expect(broadbandDataset.layers.map((l) => l.id)).toEqual(["broadband_access"]);
    expect(broadbandDataset.supportsTime).toBe(true);
    expect(broadbandDataset.availableYears).toEqual([2021, 2022, 2023, 2024, 2025]);
  });

  it("returns a 0-100 value with a subscription-labeled detail for a covered city, defaulting to the latest year", () => {
    const result = broadbandDataset.getValue("new-york-ny", "broadband_access");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("broadband subscription");
    expect(result!.detail).toContain("2025");
    expect(result!.detail).toContain("Census ACS");
  });

  it("an explicit earlier real year returns a real, different value than the default (latest year)", () => {
    const latest = broadbandDataset.getValue("new-york-ny", "broadband_access");
    const early = broadbandDataset.getValue("new-york-ny", "broadband_access", { year: 2021 });
    expect(latest).not.toBeNull();
    expect(early).not.toBeNull();
    expect(early!.detail).toContain("2021");
    expect(early!.value).not.toBe(latest!.value);
  });

  it("returns null for a year before the real 2021 floor (CHR's Broadband Access measure didn't exist yet)", () => {
    expect(broadbandDataset.getValue("new-york-ny", "broadband_access", { year: 2018 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(broadbandDataset.getValue("not-a-real-city", "broadband_access")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(broadbandDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine at the latest year -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (broadbandDataset.getValue(city.id, "broadband_access") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("a real Connecticut city falls back to the state-level rate, per Connecticut's real 2022 county-to-planning-region transition", () => {
    const result = broadbandDataset.getValue("hartford-ct", "broadband_access", { year: 2021 });
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("suppressed -- showing state average");
  });
});
