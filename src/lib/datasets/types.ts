/**
 * The generalized dataset-layer interface: this is mapstack's whole reason
 * for existing as a separate repo from allergy-locator. Designed by diffing
 * allergy-locator's TWO real, shipped datasets (allergy severity and
 * healthcare access) rather than guessed from a blank page -- see
 * allergy-locator's `.pHive/planning/roadmap.md` (v5) for that reasoning.
 *
 * What both of those datasets already had in common, once compared side by
 * side:
 *   - A fixed set of "layers" (allergy: 29 allergens; care-access: general/
 *     pediatric-specialty/pediatric-cardiac) the user picks from.
 *   - A per-city, per-layer lookup returning a 0-100 value on a SHARED
 *     "higher = more concerning" convention (so one color ramp,
 *     lib/palette/ramps.ts's concernColor, works for every dataset
 *     unmodified -- no per-dataset inverted palette).
 *   - A human-readable one-line summary for the click-to-detail panel
 *     (allergy: "grass: 72/100, high"; care-access: "Bellevue Hospital
 *     Center, 4 min").
 *   - An optional time dimension (allergy: month/day via season curves;
 *     care-access: none -- the interface makes this OPTIONAL, not required,
 *     rather than forcing every dataset to fake a time axis it doesn't have).
 *
 * What is NOT generalized here (real, deliberately deferred gaps):
 *   - allergy-locator's stacked-opacity multi-layer overlay (2+ layers
 *     visible at once with per-layer color identity) -- every dataset here
 *     renders exactly one layer at a time, matching care-access's simpler
 *     picker UX. Revisit if/when a real use case needs simultaneous layers
 *     FROM THE SAME dataset (cross-dataset combination is a separate,
 *     likely later concept -- see combineDatasetValues below for the
 *     narrow slice of that already built).
 *   - County/raster granularity, confidence-surface distinction (measured
 *     vs. interpolated) -- allergy-locator has both; this interface doesn't
 *     require them, so a simpler dataset (crime, at city-level only) isn't
 *     forced to fake sub-city granularity it doesn't have.
 */

export interface DatasetLayerValue {
  /** 0-100. MUST be on the "higher = more concerning" scale for every
   * dataset -- this is the one hard contract every implementation must
   * honor so lib/palette/ramps.ts's single concernColor ramp works
   * unmodified across all datasets. */
  value: number;
  /** Optional coarse label (e.g. "high", "<=30 min") for a tier-style
   * summary, when the source data naturally buckets this way. Not every
   * dataset has one -- purely continuous data can omit it. */
  tier?: string;
  /** A short, human-readable one-line detail for the click-to-select
   * panel, e.g. "Bellevue Hospital Center, ~4 min" or "72/100, high". */
  detail: string;
}

export interface DatasetTimeContext {
  /** 1-12. Only meaningful for datasets whose values vary by month
   * (`supportsTime: true`) -- datasets without time variation ignore this. */
  month?: number;
  /** 1-31, day of the given month, for datasets with real day-level
   * resolution. Optional even when supportsTime is true. */
  day?: number;
}

export interface DatasetLayer {
  id: string;
  label: string;
}

export interface Dataset {
  id: string;
  label: string;
  /** One-line description shown on the dataset picker. */
  description: string;
  /** Relative or absolute URL to this dataset's methodology doc -- every
   * dataset MUST document its sourcing/method/limitations, per the
   * transparent-scoring principle carried over from allergy-locator. */
  methodologyUrl: string;
  layers: DatasetLayer[];
  /** Whether getValue's `context.month`/`context.day` affect this
   * dataset's values at all. A dataset with supportsTime: false is free to
   * ignore the context argument entirely. */
  supportsTime: boolean;
  /** Returns null for a real "no data for this city/layer" gap -- never a
   * fabricated placeholder value. */
  getValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null;
}
