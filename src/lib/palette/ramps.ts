/**
 * The shared, dataset-agnostic "concern" ramp: green (good/low) -> red
 * (bad/high), for a single continuous 0-100 value. Every Dataset (see
 * lib/datasets/types.ts) is REQUIRED to report values on this same
 * "higher = more concerning" scale specifically so this one ramp works for
 * every dataset unmodified -- no per-dataset inverted or hand-picked
 * palette. Ported from allergy-locator's compositeColor(), which served
 * exactly this role there for its personalized composite map.
 *
 * NOT ported (yet): allergy-locator's per-allergen multi-hue system
 * (hueForIndex/intensityColor), used there for simultaneously-stacked
 * multi-layer overlays with distinct per-layer colors. This repo's first
 * datasets (allergy, care-access-style single-layer pickers) render one
 * layer at a time, so that need hasn't arisen yet -- a real gap to revisit
 * if/when mapstack-us wants allergy-locator's stacked-opacity overlay UX
 * for 2+ simultaneously visible layers from the same dataset.
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
