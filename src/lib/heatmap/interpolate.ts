/**
 * Inverse Distance Weighting (IDW) interpolation over the city + county
 * point spine, producing a continuous grid so the map can render a real
 * gradient surface (docs/ROADMAP.md's "Phase 2" ask, now pulled forward per
 * explicit user direction: "the single dot on the city is the biggest
 * issue"). This is a value SURFACE derived from the same city-level scores
 * every other part of the app already uses, densified by data/county-grid.json
 * (data/county-grid-methodology.md) -- not a new data source, and not the
 * eventual county/raster-granularity engine ROADMAP.md describes long-term.
 *
 * IDW is the standard, simplest spatial interpolator for scattered point
 * data. At city-only scale (168 points) a brute-force O(cells * points) pass
 * is trivially fast; once the county grid adds ~3,143 more points, brute
 * force measured ~800ms for a full grid (verified directly, well past
 * interactive) -- SPATIAL_BUCKET_COUNT below indexes points into a coarse
 * grid so each cell only sums nearby points, cutting that to a few ms
 * without materially changing the result (IDW's own distance falloff
 * already makes far points nearly weightless).
 */

export interface DataPoint {
  x: number;
  y: number;
  value: number;
}

export interface GridCell {
  value: number | null;
}

export interface GridOptions {
  cols: number;
  rows: number;
  width: number;
  height: number;
  /** IDW power parameter -- higher values make the surface hug closer to
   * each sample point (more distinct regional "blobs"); lower values blend
   * more smoothly across the whole map. */
  power?: number;
}

const DEFAULT_POWER = 2.5;

// Coarse spatial index: the map's coordinate space is divided into this many
// buckets per axis. Each interpolation cell only sums points from its own
// bucket plus an expanding ring of neighbors (until enough are found), never
// the full point set.
const SPATIAL_BUCKET_COUNT = 20;
const MIN_NEARBY_POINTS = 12;

class SpatialIndex {
  private buckets = new Map<string, DataPoint[]>();
  private bucketWidth: number;
  private bucketHeight: number;
  private bucketCols: number;
  private bucketRows: number;

  constructor(points: DataPoint[], width: number, height: number) {
    this.bucketCols = SPATIAL_BUCKET_COUNT;
    this.bucketRows = SPATIAL_BUCKET_COUNT;
    this.bucketWidth = width / this.bucketCols;
    this.bucketHeight = height / this.bucketRows;

    for (const point of points) {
      const key = this.keyFor(point.x, point.y);
      const bucket = this.buckets.get(key);
      if (bucket) bucket.push(point);
      else this.buckets.set(key, [point]);
    }
  }

  private cellIndices(x: number, y: number): [number, number] {
    const bx = Math.min(this.bucketCols - 1, Math.max(0, Math.floor(x / this.bucketWidth)));
    const by = Math.min(this.bucketRows - 1, Math.max(0, Math.floor(y / this.bucketHeight)));
    return [bx, by];
  }

  private keyFor(x: number, y: number): string {
    const [bx, by] = this.cellIndices(x, y);
    return `${bx},${by}`;
  }

  /** Points from an expanding ring of buckets around (x,y), until at least
   * MIN_NEARBY_POINTS are found or the whole grid has been searched. */
  nearby(x: number, y: number): DataPoint[] {
    const [bx, by] = this.cellIndices(x, y);
    const maxRadius = Math.max(this.bucketCols, this.bucketRows);
    let radius = 1;
    let found: DataPoint[] = [];

    while (radius <= maxRadius) {
      found = [];
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const bucket = this.buckets.get(`${bx + dx},${by + dy}`);
          if (bucket) found.push(...bucket);
        }
      }
      if (found.length >= MIN_NEARBY_POINTS) break;
      radius++;
    }

    return found;
  }
}

/**
 * Returns a `rows`-by-`cols` matrix of interpolated values across the
 * `width`x`height` coordinate space. A cell exactly on (or extremely close
 * to) a sample point returns that point's value directly, avoiding IDW's
 * 1/distance singularity. An empty `points` array returns an all-null grid
 * rather than throwing -- there is nothing to interpolate from.
 */
export function buildInterpolationGrid(points: DataPoint[], options: GridOptions): GridCell[][] {
  const { cols, rows, width, height, power = DEFAULT_POWER } = options;
  const grid: GridCell[][] = [];

  if (points.length === 0) {
    for (let r = 0; r < rows; r++) {
      grid.push(Array.from({ length: cols }, () => ({ value: null })));
    }
    return grid;
  }

  // Fewer points than the index would ever require anyway -- skip it
  // entirely rather than let `nearby()` expand its search ring all the way
  // out on every single cell looking for a MIN_NEARBY_POINTS count that
  // doesn't exist (a real, measured pathological case at small point counts).
  const index = points.length > MIN_NEARBY_POINTS ? new SpatialIndex(points, width, height) : null;
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  for (let r = 0; r < rows; r++) {
    const row: GridCell[] = [];
    const cy = (r + 0.5) * cellHeight;
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * cellWidth;
      const nearbyPoints = index ? index.nearby(cx, cy) : points;
      row.push({ value: interpolateAt(cx, cy, nearbyPoints, power) });
    }
    grid.push(row);
  }

  return grid;
}

function interpolateAt(x: number, y: number, points: DataPoint[], power: number): number {
  let weightedSum = 0;
  let weightSum = 0;

  for (const point of points) {
    const dx = x - point.x;
    const dy = y - point.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared < 0.01) {
      return point.value; // effectively on top of a sample point
    }

    const weight = 1 / Math.pow(distanceSquared, power / 2);
    weightedSum += weight * point.value;
    weightSum += weight;
  }

  return weightedSum / weightSum;
}
