"use client";

import { useEffect, useRef } from "react";
import statePaths from "@data/us_state_paths.json";
import { buildInterpolationGrid, type DataPoint } from "@/lib/heatmap/interpolate";

const { viewBox, paths } = statePaths as { viewBox: string; paths: Record<string, string> };
const [, , VB_WIDTH, VB_HEIGHT] = viewBox.split(" ").map(Number);

// One compound clip region covering every state's landmass -- concatenating
// the SVG path data works because Path2D treats consecutive M...Z subpaths as
// a single compound path, which is exactly how the 51 state outlines are
// structured already. This is what keeps the gradient from bleeding into the
// ocean/Canada/Mexico, the same way AccuWeather's pollen maps clip to land.
const CLIP_PATH_D = Object.values(paths).join(" ");

const COLS = 96;
const ROWS = 60;

interface Props {
  points: DataPoint[];
  colorForValue: (value: number) => string;
  /** 2+ active allergens (Mode 1) stack one of these per allergen at partial
   * opacity instead of a single blended surface -- each allergen keeps its
   * own color identity, and overlapping severity reads as a visually denser
   * blend where two allergens are both bad in the same place. */
  opacity?: number;
  /** Advanced mode (lib/model-settings.ts): IDW power passed straight to
   * buildInterpolationGrid. */
  power?: number;
}

/**
 * Renders story-level severity as a continuous gradient surface instead of
 * isolated per-city dots (explicit user direction: "the single dot on the
 * city is the biggest issue"). A canvas, not SVG rects, because redrawing a
 * ~5,760-cell grid on every allergen/timeframe change is far cheaper as
 * imperative canvas draws than as reconciled React elements.
 */
export function HeatmapLayer({ points, colorForValue, opacity = 1, power }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = VB_WIDTH;
    canvas.height = VB_HEIGHT;
    ctx.clearRect(0, 0, VB_WIDTH, VB_HEIGHT);
    if (points.length === 0) return;

    ctx.save();
    ctx.clip(new Path2D(CLIP_PATH_D));

    const grid = buildInterpolationGrid(points, {
      cols: COLS,
      rows: ROWS,
      width: VB_WIDTH,
      height: VB_HEIGHT,
      power,
    });
    const cellWidth = VB_WIDTH / COLS;
    const cellHeight = VB_HEIGHT / ROWS;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const value = grid[r][c].value;
        if (value === null) continue;
        ctx.fillStyle = colorForValue(value);
        // Cells overlap by 1 unit so adjacent-cell seams don't show through
        // the softening blur applied via CSS below.
        ctx.fillRect(c * cellWidth - 0.5, r * cellHeight - 0.5, cellWidth + 1, cellHeight + 1);
      }
    }

    ctx.restore();
  }, [points, colorForValue, power]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      data-testid="heatmap-canvas"
      style={{ opacity }}
      className="pointer-events-none absolute inset-0 h-full w-full rounded-lg [filter:blur(3px)]"
    />
  );
}
