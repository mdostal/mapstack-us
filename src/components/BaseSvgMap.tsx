"use client";

import type { ReactNode } from "react";
import statePaths from "@data/us_state_paths.json";
import cities from "@data/cities.json";
import { projectLatLon } from "@/lib/geo/projection";
import { dodgePoints } from "@/lib/geo/dodge";

const { viewBox, paths } = statePaths as {
  viewBox: string;
  paths: Record<string, string>;
};

/** True geographic positions -- what HeatmapLayer interpolates from (UsMap/
 * CompositeMap import this directly). Never dodged: the gradient surface has
 * to reflect real geography, not decluttered marker placement. */
export const CITY_POINTS = cities
  .map((city) => {
    const xy = projectLatLon(city.lat, city.lon);
    if (!xy) return null;
    return { city, x: xy[0], y: xy[1] };
  })
  .filter((p): p is { city: (typeof cities)[number]; x: number; y: number } => p !== null);

export type CityPoint = (typeof CITY_POINTS)[number];

/** Marker/click-target positions only (task #23): dense metro clusters like
 * Phoenix/Mesa/Tempe/Scottsdale/Chandler/Glendale/Peoria, AZ sit as little as
 * 1.3 viewBox units apart -- well inside a marker's own radius, making
 * several cities effectively unclickable underneath their neighbors. Nudging
 * apart to a minimum separation keeps every city clickable without touching
 * the true positions used for severity color/interpolation. */
const MIN_MARKER_SEPARATION = 6;
const MARKER_POINTS = dodgePoints(CITY_POINTS, MIN_MARKER_SEPARATION);

interface Props {
  ariaLabel: string;
  /** Full control over how one city renders — a single dot (Mode 1 with one
   * allergen, Mode 2's composite) or a stack of rings (Mode 1 with several
   * allergens active at once, all on this same map). */
  renderMarker: (point: CityPoint, isSelected: boolean) => ReactNode;
  onSelectCity: (cityId: string) => void;
  selectedCityId: string | null;
  /** Additional cities to show a callout for at the same time as
   * `selectedCityId` -- the compare-cities feature (simple view only;
   * /advanced already has its own full comparison table and doesn't pass
   * this). Optional and defaults to none, so every existing consumer is
   * unaffected. */
  pinnedCityIds?: string[];
  /** A continuous gradient surface (HeatmapLayer), rendered behind the state
   * outlines in the same coordinate space. Optional: the 2+ active-allergen
   * case still uses concentric-ring markers instead (see UsMap), since
   * blending multiple continuous fields into one surface is a genuinely
   * harder follow-up, not attempted here. */
  heatmap?: ReactNode;
}

/**
 * The shared US map surface: state outlines + 168 city positions. Every mode
 * (Mode 1 single/multi-allergen, Mode 2 composite) renders through this one
 * component so the map geometry, projection, and click wiring live in exactly one
 * place — only the per-city marker (and optional heatmap layer) differs.
 */
/** Renders after every marker so it always draws on top -- a small pointer
 * (leader line + dot) plus a legible name-pill callout, so it's obvious at a
 * glance which city(ies) are selected/compared without having to spot a
 * subtly-larger dot among hundreds of others. One of these renders per
 * selected/pinned city (BaseSvgMap dedupes and calls this once each). Flips
 * below the marker near the top edge and clamps horizontally near the
 * left/right edges so it never gets cut off. */
function SelectedCityCallout({ point }: { point: CityPoint }) {
  const { city, x, y } = point;
  const label = `${city.city}, ${city.state}`;
  const charWidth = 4.6;
  const paddingX = 6;
  const boxWidth = Math.max(36, label.length * charWidth + paddingX * 2);
  const boxHeight = 14;
  const leaderLength = 14;
  const flipBelow = y < boxHeight + leaderLength + 4;
  const boxY = flipBelow ? y + leaderLength : y - leaderLength - boxHeight;
  const [viewMinX, , viewW] = viewBox.split(" ").map(Number);
  let boxX = x - boxWidth / 2;
  boxX = Math.max(viewMinX + 2, Math.min(boxX, viewMinX + viewW - boxWidth - 2));

  return (
    <g pointerEvents="none" aria-hidden="true">
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={flipBelow ? boxY : boxY + boxHeight}
        stroke="#111827"
        strokeWidth={1}
        className="dark:stroke-zinc-100"
      />
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx={3}
        fill="#111827"
        className="dark:fill-zinc-100"
      />
      <text
        x={boxX + boxWidth / 2}
        y={boxY + boxHeight / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={8}
        fill="white"
        className="dark:fill-zinc-900"
        style={{ fontWeight: 600 }}
      >
        {label}
      </text>
    </g>
  );
}

export function BaseSvgMap({ ariaLabel, renderMarker, onSelectCity, selectedCityId, pinnedCityIds, heatmap }: Props) {
  const calloutIds = new Set<string>(pinnedCityIds ?? []);
  if (selectedCityId) calloutIds.add(selectedCityId);
  const calloutPoints = MARKER_POINTS.filter((p) => calloutIds.has(p.city.id));

  return (
    <div className="relative aspect-[8/5] w-full overflow-hidden rounded-lg bg-white dark:bg-zinc-900">
      {heatmap}
      <svg viewBox={viewBox} role="img" aria-label={ariaLabel} className="relative h-full w-full">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={0.75}
          className="text-zinc-400 dark:text-zinc-500"
        >
          {Object.entries(paths).map(([code, d]) => (
            <path key={code} d={d} />
          ))}
        </g>
        <g>
          {MARKER_POINTS.map((point) => {
            const isSelected = calloutIds.has(point.city.id);
            return (
              <g
                key={point.city.id}
                onClick={() => onSelectCity(point.city.id)}
                className="cursor-pointer"
              >
                {renderMarker(point, isSelected)}
              </g>
            );
          })}
        </g>
        {calloutPoints.map((point) => (
          <SelectedCityCallout key={point.city.id} point={point} />
        ))}
      </svg>
    </div>
  );
}
