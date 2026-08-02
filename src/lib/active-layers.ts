import { getDataset } from "@/lib/datasets/registry";
import type { Dataset, DatasetLayer } from "@/lib/datasets/types";

/**
 * One active (dataset, layer) pair on the map -- e.g. "allergy: grass" or
 * "crime: violent_crime". The map can have any number of these stacked at
 * once, each rendered as its own gradient layer (see palette/ramps.ts's
 * hueForIndex/intensityColor), per explicit user direction: "I should be
 * able to add an allergy layer, then add a crime layer... etc."
 */
export interface ActiveLayer {
  datasetId: string;
  layerId: string;
}

export interface ResolvedActiveLayer extends ActiveLayer {
  dataset: Dataset;
  layer: DatasetLayer;
}

export function resolveActiveLayer(active: ActiveLayer): ResolvedActiveLayer | null {
  const dataset = getDataset(active.datasetId);
  if (!dataset) return null;
  const layer = dataset.layers.find((l) => l.id === active.layerId);
  if (!layer) return null;
  return { ...active, dataset, layer };
}

export function isSameLayer(a: ActiveLayer, b: ActiveLayer): boolean {
  return a.datasetId === b.datasetId && a.layerId === b.layerId;
}

export function activeLayerKey(active: ActiveLayer): string {
  return `${active.datasetId}::${active.layerId}`;
}
