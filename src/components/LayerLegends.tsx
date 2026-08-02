"use client";

import { GradientLegend } from "@/components/GradientLegend";
import { baseColorForIndex, intensityColor } from "@/lib/palette/ramps";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";

interface Props {
  active: ActiveLayer[];
}

/** One small gradient legend per active layer -- a gradient's colors don't
 * self-explain a scale, and with 2+ layers stacked, each needs its own
 * legend since they're on different hues (see palette/ramps.ts). */
export function LayerLegends({ active }: Props) {
  if (active.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {active.map((item, index) => {
        const resolved = resolveActiveLayer(item);
        if (!resolved) return null;
        const color = baseColorForIndex(index, active.length);
        return (
          <GradientLegend
            key={activeLayerKey(item)}
            label={`${resolved.dataset.label}: ${resolved.layer.label} concern`}
            colorForValue={(value) => intensityColor(color, value)}
          />
        );
      })}
    </div>
  );
}
