import { describe, expect, it } from "vitest";
import { concernColor, hueForIndex, baseColorForIndex, intensityColor } from "@/lib/palette/ramps";

describe("concernColor (single active layer)", () => {
  it("is green at 0 and red at 100", () => {
    expect(concernColor(0)).toContain("142");
    expect(concernColor(100)).toMatch(/hsl\(0(\.0)?/);
  });
});

describe("hueForIndex / baseColorForIndex (multi-layer stack)", () => {
  it("spaces every hue evenly around the full circle for a known count", () => {
    const hues = [0, 1, 2, 3].map((i) => hueForIndex(i, 4));
    expect(hues).toEqual([0, 90, 180, 270]);
  });

  it("every pair of hues is at least 360/N degrees apart", () => {
    const total = 6;
    const hues = Array.from({ length: total }, (_, i) => hueForIndex(i, total));
    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        const diff = Math.min(Math.abs(hues[i] - hues[j]), 360 - Math.abs(hues[i] - hues[j]));
        expect(diff).toBeGreaterThanOrEqual(360 / total - 0.01);
      }
    }
  });

  it("baseColorForIndex returns a valid hsl string", () => {
    expect(baseColorForIndex(0, 3)).toMatch(/^hsl\(/);
  });
});

describe("intensityColor (per-layer severity ramp)", () => {
  it("is lighter at low values and darker at high values, same hue throughout", () => {
    const base = baseColorForIndex(0, 3);
    const low = intensityColor(base, 0);
    const high = intensityColor(base, 100);
    const lightnessOf = (hsl: string) => parseFloat(hsl.match(/(\d+(\.\d+)?)%\)$/)![1]);
    expect(lightnessOf(low)).toBeGreaterThan(lightnessOf(high));
    const hueOf = (hsl: string) => hsl.match(/hsl\(([\d.]+)/)![1];
    expect(hueOf(low)).toBe(hueOf(high));
  });
});
