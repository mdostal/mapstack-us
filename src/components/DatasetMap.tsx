"use client";

import { useMemo } from "react";
import { BaseSvgMap, CITY_POINTS } from "@/components/BaseSvgMap";
import { CityMarker } from "@/components/CityMarker";
import { HeatmapLayer } from "@/components/HeatmapLayer";
import { concernColor, NO_DATA_COLOR, HEATMAP_MARKER_FILL } from "@/lib/palette/ramps";
import type { Dataset, DatasetTimeContext } from "@/lib/datasets/types";

interface Props {
  dataset: Dataset;
  layerId: string;
  context?: DatasetTimeContext;
  onSelectCity: (cityId: string) => void;
  selectedCityId: string | null;
}

/**
 * The generalized map engine: renders ANY Dataset's single active layer as a
 * continuous gradient across the 168-city spine + click-to-select markers.
 * This is the concrete proof of mapstack's whole premise -- the exact same
 * component drives allergy severity and care-access (and any future
 * dataset) with zero dataset-specific code, because every Dataset already
 * speaks the same getValue(cityId, layerId, context) -> 0-100 contract
 * (lib/datasets/types.ts).
 */
export function DatasetMap({ dataset, layerId, context, onSelectCity, selectedCityId }: Props) {
  const heatmapPoints = useMemo(() => {
    return CITY_POINTS.map((point) => {
      const result = dataset.getValue(point.city.id, layerId, context);
      return result ? { x: point.x, y: point.y, value: result.value } : null;
    }).filter((p): p is { x: number; y: number; value: number } => p !== null);
  }, [dataset, layerId, context]);

  return (
    <BaseSvgMap
      ariaLabel={`${dataset.label} map`}
      onSelectCity={onSelectCity}
      selectedCityId={selectedCityId}
      heatmap={<HeatmapLayer points={heatmapPoints} colorForValue={concernColor} />}
      renderMarker={(point, isSelected) => {
        const result = dataset.getValue(point.city.id, layerId, context);
        return (
          <CityMarker
            point={point}
            isSelected={isSelected}
            fill={result ? HEATMAP_MARKER_FILL : NO_DATA_COLOR}
            radius={isSelected ? 4 : 2.5}
            tooltip={result?.detail}
          />
        );
      }}
    />
  );
}
