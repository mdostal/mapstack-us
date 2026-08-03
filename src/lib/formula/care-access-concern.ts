/**
 * Converts a care-access drive-time estimate (minutes) to Mapstack's shared
 * 0-100 "higher = more concerning" scale. Piecewise-linear, anchored on the
 * source data's own tier boundaries (<=30/<=60/<=120 min) plus a 240-minute
 * cap -- see data/care-access-methodology.md for why these specific anchors
 * were chosen over a percentile rank or a raw linear scale across the full
 * (haversine-distorted, up to 3200+ min for Hawaii/Alaska) data range.
 */
const ANCHORS: [minutes: number, concern: number][] = [
  [0, 0],
  [30, 25],
  [60, 50],
  [120, 75],
  [240, 100],
];

export function driveTimeToConcern(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes >= 240) return 100;

  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [x0, y0] = ANCHORS[i];
    const [x1, y1] = ANCHORS[i + 1];
    if (minutes <= x1) {
      const t = (minutes - x0) / (x1 - x0);
      return Math.round(y0 + t * (y1 - y0));
    }
  }
  return 100;
}
