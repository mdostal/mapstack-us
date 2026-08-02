import { describe, expect, it } from "vitest";
import { buildInterpolationGrid } from "@/lib/heatmap/interpolate";

describe("IDW interpolation grid (continuous gradient rendering)", () => {
  it("returns an all-null grid for zero points, without throwing", () => {
    const grid = buildInterpolationGrid([], { cols: 10, rows: 6, width: 100, height: 60 });
    expect(grid.length).toBe(6);
    expect(grid[0].length).toBe(10);
    expect(grid.flat().every((cell) => cell.value === null)).toBe(true);
  });

  it("a single point makes the entire grid equal to that point's value", () => {
    const grid = buildInterpolationGrid([{ x: 50, y: 30, value: 77 }], {
      cols: 10,
      rows: 6,
      width: 100,
      height: 60,
    });
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.value).toBeCloseTo(77, 5);
      }
    }
  });

  it("a cell exactly on a sample point returns that point's value (no singularity)", () => {
    // cols=100, rows=60 over a 100x60 area -> 1-unit cells, centers at *.5.
    // A point placed at a cell center (10.5, 10.5) should read back its own
    // value exactly, not NaN/Infinity from a 1/distance division by zero.
    const points = [
      { x: 10.5, y: 10.5, value: 42 },
      { x: 90, y: 50, value: 100 },
    ];
    const grid = buildInterpolationGrid(points, { cols: 100, rows: 60, width: 100, height: 60 });
    expect(grid[10][10].value).toBeCloseTo(42, 5);
  });

  it("interpolated values stay within the bounds of the input values (no overshoot)", () => {
    const points = [
      { x: 0, y: 0, value: 10 },
      { x: 100, y: 0, value: 90 },
      { x: 0, y: 60, value: 40 },
      { x: 100, y: 60, value: 60 },
    ];
    const grid = buildInterpolationGrid(points, { cols: 40, rows: 24, width: 100, height: 60 });
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.value).toBeGreaterThanOrEqual(10);
        expect(cell.value).toBeLessThanOrEqual(90);
      }
    }
  });

  it("a point closer to a cell has more influence than a distant one", () => {
    const near = { x: 20, y: 20, value: 0 };
    const far = { x: 90, y: 55, value: 100 };
    const grid = buildInterpolationGrid([near, far], { cols: 20, rows: 12, width: 100, height: 60 });
    // The cell right next to the "near" (low-value) point should read much closer
    // to 0 than to 100.
    const cellNearFirstPoint = grid[4][4];
    expect(cellNearFirstPoint.value!).toBeLessThan(50);
  });

  it("computes a realistic 168-point grid (the actual city spine scale) fast enough for interactive re-renders", () => {
    const points = Array.from({ length: 168 }, (_, i) => ({
      x: (i * 37) % 960,
      y: (i * 53) % 600,
      value: (i * 7) % 100,
    }));
    const start = performance.now();
    buildInterpolationGrid(points, { cols: 96, rows: 60, width: 960, height: 600 });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it("computes the FULL production scale (168 cities + 3,143 counties) fast enough for interactive re-renders", () => {
    // Regression guard: brute-force IDW over this many points measured ~800ms
    // for a full grid (well past interactive) before the spatial index was
    // added -- this is the actual point count HeatmapLayer combines every
    // time a single allergen or the composite score is toggled.
    const points = Array.from({ length: 168 + 3143 }, (_, i) => ({
      x: (i * 37) % 960,
      y: (i * 53) % 600,
      value: (i * 7) % 100,
    }));
    const start = performance.now();
    buildInterpolationGrid(points, { cols: 96, rows: 60, width: 960, height: 600 });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(150);
  });
});
