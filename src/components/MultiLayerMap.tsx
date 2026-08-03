"use client";

import { useMemo } from "react";
import { BaseSvgMap, CITY_POINTS } from "@/components/BaseSvgMap";
import { CityMarker } from "@/components/CityMarker";
import { HeatmapLayer } from "@/components/HeatmapLayer";
import { intensityColor, NO_DATA_COLOR, HEATMAP_MARKER_FILL } from "@/lib/palette/ramps";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";
import { getMapLayerMeta, DEFAULT_LAYER_CONTROL, type LayerRenderControl } from "@/lib/map-layers";

/**
 * An extra rendered layer that isn't a real Dataset/layer pair -- currently
 * only the Formula panel's live-recomputed grass overlay (see
 * FormulaPanel.tsx). Deliberately generic (a label + a getValue function),
 * not a "formula" concept, so MultiLayerMap stays agnostic to WHERE an
 * overlay's values come from -- it only needs to render one more stacked
 * layer.
 */
export interface CustomOverlay {
  label: string;
  getValue: (cityId: string) => number | null;
}

interface Props {
  active: ActiveLayer[];
  year: number | null;
  onSelectCity: (cityId: string) => void;
  selectedCityId: string | null;
  customOverlay?: CustomOverlay | null;
  /** Per-layer visibility/invert/opacity, keyed by the same key
   * getMapLayerMeta() assigns -- see MapLayerControls.tsx, the strip
   * rendered above this map that edits these. Defaults to
   * DEFAULT_LAYER_CONTROL for any layer with no explicit entry. */
  getLayerControl?: (key: string) => LayerRenderControl;
}

interface RenderedLayer {
  key: string;
  color: string;
  points: Array<{ x: number; y: number; value: number }>;
  control: LayerRenderControl;
}

/**
 * The multi-layer map: every active (dataset, layer) pair renders as its
 * OWN continuous gradient, stacked at partial opacity when 2+ are visible --
 * the exact pattern proven in allergy-locator's UsMap for stacking multiple
 * allergens, generalized here to stack layers from possibly DIFFERENT
 * datasets at once. Replaces the earlier DatasetMap (deleted), which
 * rendered exactly one active layer at a time.
 *
 * `customOverlay`, when present, renders as one more stacked layer -- real
 * (shipped, validated) data stays primary and visible, a custom-weighted
 * reading is an ADDITIONAL layer, never a silent replacement.
 *
 * Visibility/invert/opacity are per-layer render controls, independent of
 * `active` (the analysis selection) -- explicit operator direction: turning
 * a layer on/off on the map shouldn't require removing it from the
 * comparison entirely. `inverted` flips a layer's color direction (dark =
 * low/good instead of dark = high/concerning), so a layer you want to
 * MAXIMIZE (e.g. "good care access") can be hunted for as the darkest spot
 * alongside other layers you want to minimize, rather than only ever
 * reading "dark = bad" for every layer uniformly.
 */
export function MultiLayerMap({
  active,
  year,
  onSelectCity,
  selectedCityId,
  customOverlay = null,
  getLayerControl = () => DEFAULT_LAYER_CONTROL,
}: Props) {
  const layers = useMemo<RenderedLayer[]>(() => {
    const context = year !== null ? { year } : undefined;
    const meta = getMapLayerMeta(active, customOverlay?.label ?? null);

    return meta
      .map((m): RenderedLayer | null => {
        const control = getLayerControl(m.key);
        if (!control.visible) return null;

        let points: Array<{ x: number; y: number; value: number }>;
        if (m.isCustom) {
          points = CITY_POINTS.map((point) => {
            const value = customOverlay?.getValue(point.city.id) ?? null;
            return value !== null ? { x: point.x, y: point.y, value } : null;
          }).filter((p): p is { x: number; y: number; value: number } => p !== null);
        } else {
          const activeItem = active.find((a) => activeLayerKey(a) === m.key);
          const resolvedLayer = activeItem ? resolveActiveLayer(activeItem) : null;
          if (!resolvedLayer) return null;
          points = CITY_POINTS.map((point) => {
            const result = resolvedLayer.dataset.getValue(point.city.id, resolvedLayer.layer.id, context);
            return result ? { x: point.x, y: point.y, value: result.value } : null;
          }).filter((p): p is { x: number; y: number; value: number } => p !== null);
        }

        return { key: m.key, color: m.color, points, control };
      })
      .filter((l): l is RenderedLayer => l !== null);
  }, [active, year, customOverlay, getLayerControl]);

  return (
    <BaseSvgMap
      ariaLabel={layers.length === 0 ? "Map (no layers visible)" : `Map showing ${layers.length} visible layer(s)`}
      onSelectCity={onSelectCity}
      selectedCityId={selectedCityId}
      heatmap={
        layers.length > 0 ? (
          <>
            {layers.map((layer) => (
              <HeatmapLayer
                key={layer.key}
                points={layer.points}
                colorForValue={(value) => intensityColor(layer.color, layer.control.inverted ? 100 - value : value)}
                opacity={layer.control.opacity / 100}
              />
            ))}
          </>
        ) : undefined
      }
      renderMarker={(point, isSelected) => (
        <CityMarker
          point={point}
          isSelected={isSelected}
          fill={layers.length > 0 ? HEATMAP_MARKER_FILL : NO_DATA_COLOR}
          radius={isSelected ? 4 : 2.5}
          tooltip={layers.length > 0 ? `${layers.length} layer${layers.length === 1 ? "" : "s"} visible` : undefined}
        />
      )}
    />
  );
}
