"use client";

export interface TrendPoint {
  x: number;
  y: number;
}

export interface TrendSeries {
  label: string;
  color: string;
  points: TrendPoint[];
}

interface Props {
  series: TrendSeries[];
  years: number[];
  yLabel: string;
  /** y-axis domain -- defaults to the shared 0-100 "higher = more
   * concerning" scale every Dataset.getValue() returns. */
  yMin?: number;
  yMax?: number;
}

const WIDTH = 640;
const HEIGHT = 200;
const PAD_LEFT = 30;
const PAD_RIGHT = 12;
const PAD_TOP = 10;
const PAD_BOTTOM = 22;

/**
 * A generic, dependency-free SVG line chart. This project hand-rolls
 * every other visualization (BaseSvgMap, HeatmapLayer) rather than
 * pulling in a charting library (no recharts/visx/d3 in package.json,
 * only d3-geo for map projection) -- a trend chart follows the same
 * pattern instead of adding a new dependency for one feature.
 */
export function TrendChart({ series, years, yLabel, yMin = 0, yMax = 100 }: Props) {
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xMin = years[0] ?? 0;
  const xMax = years[years.length - 1] ?? 1;
  const xSpan = Math.max(xMax - xMin, 1);
  const ySpan = Math.max(yMax - yMin, 1);

  const px = (year: number) => PAD_LEFT + ((year - xMin) / xSpan) * plotW;
  const py = (value: number) => PAD_TOP + plotH - ((value - yMin) / ySpan) * plotH;

  const yTicks = [yMin, (yMin + yMax) / 2, yMax];
  const xTickStep = Math.max(Math.ceil(years.length / 8), 1);
  const xTicks = years.filter((_, i) => i % xTickStep === 0 || i === years.length - 1);
  const hasAnyData = series.some((s) => s.points.length > 0);

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full text-zinc-900 dark:text-zinc-100"
        role="img"
        aria-label={`Trend chart: ${yLabel}`}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={py(t)}
              y2={py(t)}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
            <text x={PAD_LEFT - 4} y={py(t)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="currentColor" fillOpacity={0.6}>
              {Math.round(t)}
            </text>
          </g>
        ))}
        {xTicks.map((year) => (
          <text key={year} x={px(year)} y={HEIGHT - 6} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.6}>
            {year}
          </text>
        ))}
        {!hasAnyData && (
          <text x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.5}>
            No data for the selected cities.
          </text>
        )}
        {series.map((s) =>
          s.points.length > 0 ? (
            <g key={s.label}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={1.75}
                points={s.points.map((p) => `${px(p.x)},${py(p.y)}`).join(" ")}
              />
              {s.points.map((p) => (
                <circle key={p.x} cx={px(p.x)} cy={py(p.y)} r={2.25} fill={s.color} />
              ))}
            </g>
          ) : null,
        )}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            <span className="text-zinc-600 dark:text-zinc-300">
              {s.label}
              {s.points.length === 0 && " (no data)"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
