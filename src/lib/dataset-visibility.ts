/**
 * Which datasets are hidden from the "add a layer" pickers -- client-side
 * only via localStorage, no accounts, no backend, same fail-open-on-
 * corrupt-JSON posture as saved-views.ts. Purely a DECLUTTERING
 * preference: hiding a dataset only removes it from AddLayerPanel's tab
 * row and LayerPicker's accordion list going forward. Any layer from that
 * dataset already active stays active -- ActiveLayersList/ComparisonTable/
 * the map all iterate the real `active`/`selected` arrays directly, never
 * `DATASETS` filtered by this preference, so hiding a dataset never
 * silently drops data you're already looking at.
 */
const STORAGE_KEY = "mapstack:hidden-datasets";

export function getHiddenDatasetIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return []; // corrupted/foreign data -- fail open to nothing hidden, never throw
  }
}

export function setHiddenDatasetIds(ids: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
