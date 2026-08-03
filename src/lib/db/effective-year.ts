import { getDataset } from "@/lib/datasets/registry";

/**
 * Resolves the real year to bind against `layer_values.year` for one
 * layer: NULL for a dataset with no year-level variation (allergy,
 * care-access -- their rows are always stored with year = NULL), or the
 * requested year (defaulting to the dataset's own latest, same fallback
 * crime.ts's getCrimeValue uses) for a time-varying dataset. The app's one
 * shared `year` UI value is meaningless to a non-time-varying dataset --
 * binding it directly made cross-dataset insights/filter queries silently
 * mismatch on `year IS ?`.
 */
export function effectiveYearFor(datasetId: string, year: number | null): number | null {
  const years = getDataset(datasetId)?.availableYears;
  if (!years || years.length === 0) return null;
  return year ?? Math.max(...years);
}
