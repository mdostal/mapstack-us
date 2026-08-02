import type { CityPoint } from "@/components/BaseSvgMap";

interface Props {
  point: CityPoint;
  isSelected: boolean;
  fill: string;
  tooltip?: string;
  radius?: number;
}

/** A single colored dot for one city — the common case (Mode 2's composite, and
 * Mode 1 when exactly one allergen is active). */
export function CityMarker({ point, isSelected, fill, tooltip, radius }: Props) {
  const { city, x, y } = point;
  const r = radius ?? (isSelected ? 6 : 4);
  const label = `${city.city}, ${city.state}${tooltip ? ` — ${tooltip}` : ""}`;

  return (
    <circle
      cx={x.toFixed(2)}
      cy={y.toFixed(2)}
      r={r}
      fill={fill}
      stroke={isSelected ? "#111827" : "white"}
      strokeWidth={isSelected ? 1.5 : 0.6}
      role="button"
      aria-label={label}
    >
      <title>{label}</title>
    </circle>
  );
}
