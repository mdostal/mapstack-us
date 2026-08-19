import type { CityPoint } from "@/components/BaseSvgMap";

interface Props {
  point: CityPoint;
  isSelected: boolean;
  fill: string;
  tooltip?: string;
  radius?: number;
  /** Selects this city -- optional so CityMarker still renders standalone
   * (e.g. a static preview) without wiring up interactivity. When present,
   * it's attached to this same element as both a click and a keyboard
   * (Enter/Space) handler, so the one element that carries `role="button"`
   * is also the one that's actually operable, not just labeled. */
  onSelect?: () => void;
}

/** A single colored dot for one city — the common case (Mode 2's composite, and
 * Mode 1 when exactly one allergen is active). */
export function CityMarker({ point, isSelected, fill, tooltip, radius, onSelect }: Props) {
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
      tabIndex={onSelect ? 0 : undefined}
      className={onSelect ? "cursor-pointer" : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <title>{label}</title>
    </circle>
  );
}
