// One-off audit script (not part of the app runtime). Runs the REAL
// DATASETS registry against every real city and reports, per dataset
// layer: the highest-concern city + detail, the lowest-concern city +
// detail, and the raw score spread. Used to eyeball whether "high
// concern" cities and "low concern" cities make real-world sense given
// each dataset's own documented direction -- catches a direction-
// inversion bug (a naturally "more=better" metric that wasn't inverted,
// or vice versa) that a UI screenshot alone can't reliably catch.
import { DATASETS } from "../src/lib/datasets/registry";
import cities from "../data/cities.json";

type CityRow = { id: string; city: string; state: string };

for (const dataset of DATASETS) {
  for (const layer of dataset.layers) {
    const results: { city: CityRow; value: number; detail: string }[] = [];
    for (const city of cities as CityRow[]) {
      const r = dataset.getValue(city.id, layer.id);
      if (r) results.push({ city, value: r.value, detail: r.detail });
    }
    if (results.length === 0) {
      console.log(`\n=== ${dataset.id} / ${layer.id} === NO DATA (0 covered)`);
      continue;
    }
    results.sort((a, b) => b.value - a.value);
    const highest = results.slice(0, 3);
    const lowest = results.slice(-3).reverse();
    const values = results.map((r) => r.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    console.log(`\n=== ${dataset.id} / ${layer.id} === (${results.length}/512 covered, min=${min} avg=${avg.toFixed(1)} max=${max})`);
    console.log("HIGH CONCERN (should look/sound WORSE in real life):");
    for (const h of highest) {
      console.log(`  ${h.city.city}, ${h.city.state} -- value=${h.value} -- ${h.detail}`);
    }
    console.log("LOW CONCERN (should look/sound BETTER in real life):");
    for (const l of lowest) {
      console.log(`  ${l.city.city}, ${l.city.state} -- value=${l.value} -- ${l.detail}`);
    }
  }
}
