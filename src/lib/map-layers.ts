import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";
import { baseColorForIndex } from "@/lib/palette/ramps";

export interface MapLayerMeta {
  key: string;
  color: string;
  label: string;
  isCustom: boolean;
}

/** Every active layer's render state on the map, independent of whether
 * it's still part of `selected` (table/CSV/filter/sort always use every
 * selected layer regardless of this) -- explicit operator direction: being
 * able to turn a layer on/off on the map without adding/removing it from
 * the analysis. `inverted` flips the color direction for spotting "good on
 * this AND good on everything else" (dark = low/good instead of dark =
 * high/concerning) rather than only ever hunting for the lightest spot. */
export interface LayerRenderControl {
  visible: boolean;
  inverted: boolean;
  opacity: number; // 0-100
}

export const DEFAULT_LAYER_CONTROL: LayerRenderControl = { visible: true, inverted: false, opacity: 70 };

/** A non-real (not a (dataset, layer) pair) map layer -- e.g. the Formula
 * panel's live grass-weight recompute, or a user-defined custom blend
 * across 2+ active layers (see MultiLayerMap.tsx's CustomOverlay). Each
 * needs its own stable `key` (can't use activeLayerKey() since there's no
 * real ActiveLayer behind it) so 2+ custom overlays can be active on the
 * map at once without colliding. */
export interface CustomOverlayMeta {
  key: string;
  label: string;
}

/**
 * Stable color/label assignment for every active layer plus any custom
 * overlays, shared by MultiLayerMap (rendering) and MapLayerControls (the
 * per-layer strip) so the two never disagree on which color belongs to
 * which layer. Order and total COUNT -- not current visibility -- drive hue
 * spacing, so hiding one layer doesn't reshuffle every other layer's color.
 */
export function getMapLayerMeta(active: ActiveLayer[], customOverlays: CustomOverlayMeta[]): MapLayerMeta[] {
  const totalCount = active.length + customOverlays.length;
  const result: MapLayerMeta[] = active
    .map((item, index): MapLayerMeta | null => {
      const resolved = resolveActiveLayer(item);
      if (!resolved) return null;
      return {
        key: activeLayerKey(item),
        color: baseColorForIndex(index, totalCount),
        label: `${resolved.dataset.label}: ${resolved.layer.label}`,
        isCustom: false,
      };
    })
    .filter((l): l is MapLayerMeta => l !== null);

  customOverlays.forEach((overlay, i) => {
    result.push({
      key: overlay.key,
      color: baseColorForIndex(active.length + i, totalCount),
      label: overlay.label,
      isCustom: true,
    });
  });

  return result;
}
