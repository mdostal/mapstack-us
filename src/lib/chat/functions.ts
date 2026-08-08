import cities from "@data/cities.json";
import { DATASETS, getDataset } from "@/lib/datasets/registry";
import { computeBlendValue } from "@/lib/custom-blend";
import type { DatasetTimeContext } from "@/lib/datasets/types";
import type { ActiveLayer } from "@/lib/active-layers";

/**
 * The plain, dependency-free functions behind every chat tool
 * (src/lib/chat/tools.ts wraps these as AI-SDK `tool()` definitions with
 * zod schemas). Kept separate from the tool wrappers so they're testable
 * with plain vitest, no model/agent involved -- these are ordinary reads
 * over the SAME bundled data/registry every map/panel component already
 * uses. No network calls, no secrets, no write access: the chat feature
 * can only ever see what a site visitor could already see by using the
 * map normally.
 */

type CityRecord = { id: string; city: string; state: string; lat: number; lon: number };
const CITY_LIST = cities as CityRecord[];

export interface CitySearchResult {
  id: string;
  city: string;
  state: string;
}

export function searchCities(query: string, limit = 10): CitySearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches = CITY_LIST.filter(
    (c) => c.city.toLowerCase().includes(q) || `${c.city}, ${c.state}`.toLowerCase().includes(q) || c.state.toLowerCase() === q,
  );
  return matches.slice(0, limit).map((c) => ({ id: c.id, city: c.city, state: c.state }));
}

export interface DatasetCatalogLayer {
  id: string;
  label: string;
}

export interface DatasetCatalogEntry {
  id: string;
  label: string;
  description: string;
  supportsTime: boolean;
  availableYears: number[] | null;
  layers: DatasetCatalogLayer[];
}

export function getDatasetCatalog(): DatasetCatalogEntry[] {
  return DATASETS.map((d) => ({
    id: d.id,
    label: d.label,
    description: d.description,
    supportsTime: d.supportsTime,
    availableYears: d.availableYears ?? null,
    layers: d.layers.map((l) => ({ id: l.id, label: l.label })),
  }));
}

export interface LayerValueResult {
  cityId: string;
  city: string;
  state: string;
  datasetId: string;
  layerId: string;
  year: number | null;
  found: boolean;
  value?: number;
  detail?: string;
}

export function getLayerValue(cityId: string, datasetId: string, layerId: string, year?: number): LayerValueResult {
  const city = CITY_LIST.find((c) => c.id === cityId);
  const base = { cityId, city: city?.city ?? cityId, state: city?.state ?? "", datasetId, layerId, year: year ?? null };

  const dataset = getDataset(datasetId);
  if (!dataset || !city) return { ...base, found: false };

  const context: DatasetTimeContext | undefined = year !== undefined ? { year } : undefined;
  const result = dataset.getValue(cityId, layerId, context);
  if (!result) return { ...base, found: false };

  return { ...base, found: true, value: result.value, detail: result.detail };
}

export interface RankedCity {
  cityId: string;
  city: string;
  state: string;
  score: number;
}

/**
 * Ranks cities by a weighted blend across the given layers -- the SAME
 * user-owned computeBlendValue() CityRankingPanel already uses, not a
 * separate/looser scoring path. `cityIds` scopes to a subset (e.g. a set
 * the visitor named); omit to rank all 512.
 */
export function rankCities(
  layers: Array<{ datasetId: string; layerId: string; weight?: number }>,
  options: { year?: number; cityIds?: string[]; ascending?: boolean; limit?: number } = {},
): RankedCity[] {
  const activeLayers: ActiveLayer[] = layers.map((l) => ({ datasetId: l.datasetId, layerId: l.layerId }));
  const weights = Object.fromEntries(layers.map((l) => [`${l.datasetId}::${l.layerId}`, l.weight ?? 1]));
  const context: DatasetTimeContext | undefined = options.year !== undefined ? { year: options.year } : undefined;
  const pool = options.cityIds ? CITY_LIST.filter((c) => options.cityIds!.includes(c.id)) : CITY_LIST;
  const ascending = options.ascending ?? true;
  const limit = options.limit ?? 25;

  return pool
    .map((city) => ({ city, score: computeBlendValue(city.id, activeLayers, weights, context) }))
    .filter((r): r is { city: CityRecord; score: number } => r.score !== null)
    .sort((a, b) => (ascending ? a.score - b.score : b.score - a.score))
    .slice(0, limit)
    .map((r) => ({ cityId: r.city.id, city: r.city.city, state: r.city.state, score: Math.round(r.score * 10) / 10 }));
}
