interface Props {
  label: string;
  colorForValue: (value: number) => string;
}

const STOPS = [0, 20, 40, 60, 80, 100];

/** A gradient's colors alone don't self-explain a scale -- this is the one
 * piece of interpretability the heatmap needs that a per-city dot didn't
 * (a dot's tooltip already spelled out its own tier/value in text). */
export function GradientLegend({ label, colorForValue }: Props) {
  const gradient = `linear-gradient(to right, ${STOPS.map((v) => colorForValue(v)).join(", ")})`;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <div className="h-3 w-full rounded" style={{ background: gradient }} />
      <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}
