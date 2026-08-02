/**
 * The shared, dataset-agnostic "concern" ramp: green (good/low) -> red
 * (bad/high), for a single continuous 0-100 value. Every Dataset (see
 * lib/datasets/types.ts) is REQUIRED to report values on this same
 * "higher = more concerning" scale specifically so this one ramp works for
 * every dataset unmodified -- no per-dataset inverted or hand-picked
 * palette. Ported from allergy-locator's compositeColor(), which served
 * exactly this role there for its personalized composite map. Used for
 * exactly ONE active layer at a time -- see hueForIndex/intensityColor
 * below for the multi-layer-stack case, where every layer needs its own
 * distinguishable hue instead of sharing one green->red scale.
 */
const HUE_GOOD = 142; // green
const HUE_BAD = 0; // red

export function concernColor(value: number): string {
  const clamped = Math.max(0, Math.min(100, value));
  const hue = HUE_GOOD + (HUE_BAD - HUE_GOOD) * (clamped / 100);
  const lightness = 90 - (clamped / 100) * 55;
  return `hsl(${hue.toFixed(1)} 72% ${lightness.toFixed(1)}%)`;
}

export const NO_DATA_COLOR = "hsl(0 0% 88%)";

/** Subtle, translucent click-target fill for city markers once a continuous
 * gradient (not the dot) carries the color signal. */
export const HEATMAP_MARKER_FILL = "rgba(17, 24, 39, 0.5)";

const LAYER_BASE_SATURATION = 68;
const LAYER_BASE_LIGHTNESS = 45;

/**
 * Multi-layer-stack palette, ported from allergy-locator's per-allergen
 * system (lib/severity/palette.ts there): when 2+ layers from possibly
 * different datasets are stacked on the same map at once, each needs its
 * OWN distinguishable hue -- concernColor's single green->red ramp only
 * disambiguates ONE layer's severity, not which of several overlapping
 * layers is driving the color at a given point. Hues are spaced EVENLY
 * around the full circle for a known, fixed count (strictly better
 * worst-case separation than a golden-angle walk at small N -- verified in
 * allergy-locator). Adding/removing an active layer reshuffles every
 * layer's hue rather than only appending one; acceptable since no layer's
 * color is a memorized identity -- the dataset/layer id and label are.
 */
export function hueForIndex(index: number, total: number): number {
  const step = 360 / Math.max(total, 1);
  return (step * index) % 360;
}

export function baseColorForIndex(index: number, total: number): string {
  const hue = hueForIndex(index, total);
  return `hsl(${hue.toFixed(1)} ${LAYER_BASE_SATURATION}% ${LAYER_BASE_LIGHTNESS}%)`;
}

function parseHslHue(hslString: string): number {
  const match = hslString.match(/hsl\(([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * value: 0-100 concern. Low = a light tint of the layer's own base hue,
 * high = fully saturated and darker -- a single-hue sequential ramp per
 * layer, so overlapping layers both reading "high" in the same spot
 * visually compounds instead of one washing out the other.
 */
export function intensityColor(baseColor: string, value: number): string {
  const hue = parseHslHue(baseColor);
  const clamped = Math.max(0, Math.min(100, value));
  const lightness = 92 - (clamped / 100) * 60;
  return `hsl(${hue.toFixed(1)} ${LAYER_BASE_SATURATION}% ${lightness.toFixed(1)}%)`;
}
