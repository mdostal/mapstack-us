import { FORMULA_COMPONENT_KEYS, type ComponentWeights } from "@/lib/formula/allergy-grass-formula";

/**
 * Named, saved formula weight-sets, saved PER LAYER (not globally) --
 * explicit operator direction: "save each layer separately". Same
 * fail-open-on-corrupt-JSON localStorage CRUD pattern as saved-views.ts
 * (itself ported from allergy-locator's profiles.ts).
 */
export interface FormulaPreset {
  id: string;
  layerKey: string;
  name: string;
  weights: ComponentWeights;
  savedAt: string;
}

const STORAGE_KEY = "mapstack:formula-presets";

function normalizePreset(raw: unknown): FormulaPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (
    typeof p.id !== "string" ||
    typeof p.layerKey !== "string" ||
    typeof p.name !== "string" ||
    typeof p.savedAt !== "string" ||
    !p.weights ||
    typeof p.weights !== "object"
  ) {
    return null;
  }
  const weights = p.weights as Record<string, unknown>;
  if (!FORMULA_COMPONENT_KEYS.every((key) => typeof weights[key] === "number" && Number.isFinite(weights[key]))) {
    return null;
  }
  return p as unknown as FormulaPreset;
}

function getAllFormulaPresets(): FormulaPreset[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizePreset).filter((p): p is FormulaPreset => p !== null);
  } catch {
    return []; // corrupted/foreign data -- fail open to an empty list, never throw
  }
}

export function getFormulaPresets(layerKey: string): FormulaPreset[] {
  return getAllFormulaPresets().filter((p) => p.layerKey === layerKey);
}

function writePresets(presets: FormulaPreset[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function saveFormulaPreset(layerKey: string, name: string, weights: ComponentWeights): FormulaPreset {
  const preset: FormulaPreset = {
    id: crypto.randomUUID(),
    layerKey,
    name,
    weights,
    savedAt: new Date().toISOString(),
  };
  writePresets([...getAllFormulaPresets(), preset]);
  return preset;
}

export function deleteFormulaPreset(id: string): void {
  writePresets(getAllFormulaPresets().filter((p) => p.id !== id));
}
