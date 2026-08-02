import { beforeEach, describe, expect, it } from "vitest";
import { deleteFormulaPreset, getFormulaPresets, saveFormulaPreset } from "@/lib/formula-presets";
import { DEFAULT_WEIGHTS } from "@/lib/formula/allergy-grass-formula";

describe("formula-presets", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty array when nothing has been saved yet", () => {
    expect(getFormulaPresets("allergy::grass")).toEqual([]);
  });

  it("saves a preset and round-trips it, scoped to its layerKey", () => {
    const preset = saveFormulaPreset("allergy::grass", "Less turf weight", { ...DEFAULT_WEIGHTS, turf_boost: 0.5 });
    const all = getFormulaPresets("allergy::grass");
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(preset);
  });

  it("keeps presets for different layers separate", () => {
    saveFormulaPreset("allergy::grass", "Grass preset", DEFAULT_WEIGHTS);
    saveFormulaPreset("allergy::ragweed", "Ragweed preset", DEFAULT_WEIGHTS);

    expect(getFormulaPresets("allergy::grass")).toHaveLength(1);
    expect(getFormulaPresets("allergy::ragweed")).toHaveLength(1);
    expect(getFormulaPresets("allergy::grass")[0].name).toBe("Grass preset");
  });

  it("deletes a preset by id without affecting other layers' presets", () => {
    const a = saveFormulaPreset("allergy::grass", "A", DEFAULT_WEIGHTS);
    saveFormulaPreset("allergy::ragweed", "B", DEFAULT_WEIGHTS);

    deleteFormulaPreset(a.id);

    expect(getFormulaPresets("allergy::grass")).toHaveLength(0);
    expect(getFormulaPresets("allergy::ragweed")).toHaveLength(1);
  });

  it("fails open to an empty array on corrupted localStorage JSON, never throws", () => {
    window.localStorage.setItem("mapstack:formula-presets", "{not valid json");
    expect(() => getFormulaPresets("allergy::grass")).not.toThrow();
    expect(getFormulaPresets("allergy::grass")).toEqual([]);
  });

  it("returns an empty array during SSR (no window.localStorage) without throwing", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error -- simulating an SSR environment where window is undefined
    delete globalThis.window;
    try {
      expect(getFormulaPresets("allergy::grass")).toEqual([]);
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
