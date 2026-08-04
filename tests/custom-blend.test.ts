import { describe, expect, it } from "vitest";
import { computeBlendValue, defaultBlendWeights, DEFAULT_BLEND_WEIGHT } from "@/lib/custom-blend";
import { activeLayerKey, type ActiveLayer } from "@/lib/active-layers";
import { allergyDataset } from "@/lib/datasets/allergy";
import { crimeDataset } from "@/lib/datasets/crime";

const GRASS: ActiveLayer = { datasetId: "allergy", layerId: "grass" };
const VIOLENT_CRIME: ActiveLayer = { datasetId: "crime", layerId: "violent_crime" };

describe("custom-blend", () => {
  it("defaultBlendWeights gives every layer the default weight of 1", () => {
    const weights = defaultBlendWeights([GRASS, VIOLENT_CRIME]);
    expect(weights[activeLayerKey(GRASS)]).toBe(DEFAULT_BLEND_WEIGHT);
    expect(weights[activeLayerKey(VIOLENT_CRIME)]).toBe(DEFAULT_BLEND_WEIGHT);
  });

  it("an equal-weight blend of two real layers is their real average, for a city with data on both", () => {
    const grass = allergyDataset.getValue("new-york-ny", "grass")!.value;
    const crime = crimeDataset.getValue("new-york-ny", "violent_crime", { year: 2024 })!.value;
    const blend = computeBlendValue("new-york-ny", [GRASS, VIOLENT_CRIME], defaultBlendWeights([GRASS, VIOLENT_CRIME]), { year: 2024 });
    expect(blend).toBeCloseTo((grass + crime) / 2, 5);
  });

  it("weighting one layer at 2x pulls the blend toward it, not a plain average", () => {
    const grass = allergyDataset.getValue("new-york-ny", "grass")!.value;
    const crime = crimeDataset.getValue("new-york-ny", "violent_crime", { year: 2024 })!.value;
    const weights = { [activeLayerKey(GRASS)]: 2, [activeLayerKey(VIOLENT_CRIME)]: 1 };
    const blend = computeBlendValue("new-york-ny", [GRASS, VIOLENT_CRIME], weights, { year: 2024 });
    expect(blend).toBeCloseTo((2 * grass + crime) / 3, 5);
  });

  it("a weight of 0 excludes that layer entirely -- the blend equals the other layer's own value", () => {
    const crime = crimeDataset.getValue("new-york-ny", "violent_crime", { year: 2024 })!.value;
    const weights = { [activeLayerKey(GRASS)]: 0, [activeLayerKey(VIOLENT_CRIME)]: 1 };
    const blend = computeBlendValue("new-york-ny", [GRASS, VIOLENT_CRIME], weights, { year: 2024 });
    expect(blend).toBeCloseTo(crime, 5);
  });

  it("renormalizes around a real honest gap -- a city with no crime data blends using only the layer that has data, not a fabricated 0", () => {
    // San Francisco is a real, documented NIBRS-non-participation gap (crime-methodology.md).
    const grass = allergyDataset.getValue("san-francisco-ca", "grass")!.value;
    expect(crimeDataset.getValue("san-francisco-ca", "violent_crime", { year: 2024 })).toBeNull();

    const blend = computeBlendValue("san-francisco-ca", [GRASS, VIOLENT_CRIME], defaultBlendWeights([GRASS, VIOLENT_CRIME]), { year: 2024 });
    expect(blend).toBeCloseTo(grass, 5);
  });

  it("returns null when every included layer lacks data for a city, not a fabricated value", () => {
    const weights = { [activeLayerKey(VIOLENT_CRIME)]: 1 };
    const blend = computeBlendValue("san-francisco-ca", [VIOLENT_CRIME], weights, { year: 2024 });
    expect(blend).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    const blend = computeBlendValue("not-a-real-city", [GRASS, VIOLENT_CRIME], defaultBlendWeights([GRASS, VIOLENT_CRIME]), { year: 2024 });
    expect(blend).toBeNull();
  });
});
