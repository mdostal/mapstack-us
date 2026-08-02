"use client";

import { useMemo } from "react";
import { BaseSvgMap, CITY_POINTS } from "@/components/BaseSvgMap";
import { CityMarker } from "@/components/CityMarker";
import { HeatmapLayer } from "@/components/HeatmapLayer";
import { baseColorForIndex, intensityColor, NO_DATA_COLOR, HEATMAP_MARKER_FILL } from "@/lib/palette/ramps";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";

interface Props {
  active: ActiveLayer[];
  year: number | null;
  onSelectCity: (cityId: string) => void;
  selectedCityId: string | null;
}

interface RenderedLayer {
  key: string;
  color: string;
  label: string;
  points: Array<{ x: number; y: number; value: number }>;
}

/**
 * The multi-layer map: every active (dataset, layer) pair renders as its
 * OWN continuous gradient, stacked at partial opacity when 2+ are active --
 * the exact pattern proven in allergy-locator's UsMap for stacking multiple
 * allergens, generalized here to stack layers from possibly DIFFERENT
 * datasets at once (explicit user direction: add an allergy layer, a crime
 * layer, a healthcare layer, all on one map). Replaces the earlier
 * DatasetMap (deleted), which rendered exactly one active layer at a time.
 */
export function MultiLayerMap({ active, year, onSelectCity, selectedCityId }: Props) {
  const layers = useMemo<RenderedLayer[]>(() => {
    const context = year !== null ? { year } : undefined;
    return active
      .map((item, index): RenderedLayer | null => {
        const resolved = resolveActiveLayer(item);
        if (!resolved) return null;
        const color = baseColorForIndex(index, active.length);
        const points = CITY_POINTS.map((point) => {
          const result = resolved.dataset.getValue(point.city.id, resolved.layer.id, context);
          return result ? { x: point.x, y: point.y, value: result.value } : null;
        }).filter((p): p is { x: number; y: number; value: number } => p !== null);
        return { key: activeLayerKey(item), color, label: `${resolved.dataset.label}: ${resolved.layer.label}`, points };
      })
      .filter((l): l is RenderedLayer => l !== null);
  }, [active, year]);

  return (
    <BaseSvgMap
      ariaLabel={
        layers.length === 0
          ? "Map (no layers active)"
          : `Map showing ${layers.map((l) => l.label).join(", ")}`
      }
      onSelectCity={onSelectCity}
      selectedCityId={selectedCityId}
      heatmap={
        layers.length > 0 ? (
          <>
            {layers.map((layer) => (
              <HeatmapLayer
                key={layer.key}
                points={layer.points}
                colorForValue={(value) => intensityColor(layer.color, value)}
                opacity={layers.length <= 1 ? 1 : 0.65}
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
          tooltip={layers.length > 0 ? `${layers.length} layer${layers.length === 1 ? "" : "s"} active` : undefined}
        />
      )}
    />
  );
}
