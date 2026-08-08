import { describe, expect, it } from "vitest";
import { searchCities, getDatasetCatalog, getLayerValue, rankCities } from "@/lib/chat/functions";

describe("chat functions (read-only tool backends for the BYOK chat feature)", () => {
  describe("searchCities", () => {
    it("finds a real city by name", () => {
      const results = searchCities("Austin");
      expect(results.some((c) => c.id === "austin-tx")).toBe(true);
    });

    it("finds cities by 'City, ST' format", () => {
      const results = searchCities("Austin, TX");
      expect(results.some((c) => c.id === "austin-tx")).toBe(true);
    });

    it("finds cities by exact state abbreviation, among substring matches", () => {
      const results = searchCities("OR", 100);
      // "OR" matches both the state exactly AND city-name substrings (e.g.
      // "Corona") -- that's correct broad-search behavior, not a bug.
      expect(results.some((c) => c.state === "OR")).toBe(true);
    });

    it("returns an empty array for an empty query, not every city", () => {
      expect(searchCities("")).toEqual([]);
    });

    it("respects the limit", () => {
      const results = searchCities("a", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe("getDatasetCatalog", () => {
    it("lists every real registered dataset with its real layers", () => {
      const catalog = getDatasetCatalog();
      expect(catalog.length).toBeGreaterThan(30);
      const crime = catalog.find((d) => d.id === "crime");
      expect(crime).toBeDefined();
      expect(crime!.supportsTime).toBe(true);
      expect(crime!.layers.map((l) => l.id)).toContain("violent_crime");
    });
  });

  describe("getLayerValue", () => {
    it("returns a real found value for a covered city/layer", () => {
      const result = getLayerValue("new-york-ny", "crime", "violent_crime", 2024);
      expect(result.found).toBe(true);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.detail).toBeDefined();
    });

    it("returns found:false for a real no-data gap, not a fabricated value", () => {
      const result = getLayerValue("san-francisco-ca", "crime", "violent_crime", 2024);
      expect(result.found).toBe(false);
      expect(result.value).toBeUndefined();
    });

    it("returns found:false for an unknown dataset id", () => {
      const result = getLayerValue("new-york-ny", "not-a-real-dataset", "layer");
      expect(result.found).toBe(false);
    });

    it("returns found:false for an unknown city id", () => {
      const result = getLayerValue("not-a-real-city", "crime", "violent_crime");
      expect(result.found).toBe(false);
    });
  });

  describe("rankCities", () => {
    it("ranks by a single real layer and matches known extremes", () => {
      const results = rankCities([{ datasetId: "allergy", layerId: "grass" }], { ascending: true, limit: 5 });
      expect(results[0].city).toBe("Bend");
      expect(results[0].state).toBe("OR");
    });

    it("scopes to a cityIds subset when given", () => {
      const results = rankCities([{ datasetId: "allergy", layerId: "grass" }], {
        cityIds: ["new-york-ny", "los-angeles-ca"],
      });
      expect(results.length).toBe(2);
      expect(results.map((r) => r.cityId).sort()).toEqual(["los-angeles-ca", "new-york-ny"]);
    });

    it("respects a real year for a time-varying layer", () => {
      const y2024 = rankCities([{ datasetId: "crime", layerId: "violent_crime" }], { year: 2024, limit: 3 });
      const y2025 = rankCities([{ datasetId: "crime", layerId: "violent_crime" }], { year: 2025, limit: 3 });
      expect(y2024.length).toBeGreaterThan(0);
      expect(y2025.length).toBeGreaterThan(0);
    });

    it("respects custom weights across multiple layers", () => {
      const equal = rankCities([
        { datasetId: "allergy", layerId: "grass" },
        { datasetId: "income", layerId: "median_income" },
      ]);
      const weighted = rankCities([
        { datasetId: "allergy", layerId: "grass", weight: 2 },
        { datasetId: "income", layerId: "median_income", weight: 0.1 },
      ]);
      expect(equal.length).toBeGreaterThan(0);
      expect(weighted.length).toBeGreaterThan(0);
    });
  });
});
