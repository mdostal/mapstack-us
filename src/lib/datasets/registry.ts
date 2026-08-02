import { allergyDataset } from "@/lib/datasets/allergy";
import { crimeDataset } from "@/lib/datasets/crime";
import type { Dataset } from "@/lib/datasets/types";

/**
 * The full list of datasets this app knows about. Adding a new dataset
 * means implementing the Dataset interface (lib/datasets/types.ts) and
 * adding it here -- no other file needs to change, since DatasetMap/
 * DatasetView are already generic over any Dataset.
 */
export const DATASETS: Dataset[] = [allergyDataset, crimeDataset];

export function getDataset(id: string): Dataset | undefined {
  return DATASETS.find((d) => d.id === id);
}
