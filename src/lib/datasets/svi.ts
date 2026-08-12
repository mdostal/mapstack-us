import sviData from "@data/svi.json";
import { toOrdinal } from "@/lib/datasets/format";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import cities from "@data/cities.json";

/**
 * The sixth real Dataset -- CDC/ATSDR's Social Vulnerability Index (SVI),
 * a composite of 16 socioeconomic/demographic variables into a single
 * "how exposed is this community to disaster/crisis broadly" signal.
 * Extended to real multi-vintage history (ddr-svi-extend, this session)
 * -- CDC has published SVI seven times: 2000, 2010, 2014, 2016, 2018,
 * 2020, 2022, not an annual series. This ships six of the seven real
 * vintages -- **2000 is a real, disclosed gap**: it uses its own unique
 * 2000-census tract boundaries, and the Census Geocoder (this project's
 * only tract-crosswalk tool) has no `Census2000_*` vintage option
 * (confirmed live against its own `/geocoder/vintages` endpoint), so no
 * crosswalk could be built for it the same way the other two boundary
 * generations were. See scripts/gen_svi_data.py.
 *
 * Five SEPARATE layers, not one blend -- same "don't invent a weighting"
 * principle as crime.ts/hazard.ts: the overall composite, plus its 4
 * sub-themes (socioeconomic, household, minority/language,
 * housing/transportation) kept distinct.
 *
 * SVI's own percentile values are already a 0-1 "higher = more
 * vulnerable" fraction -- no inversion needed, just rescaled to 0-100.
 * SVI's own suppressed/unreliable-small-population signal is preserved
 * as a real null, never coerced to 0 (see gen_svi_data.py). Percentiles
 * are computed by CDC independently per real release year (CDC's own
 * documentation explicitly warns against comparing percentiles across
 * releases), so a value is only meaningful within its own year.
 *
 * Tract-level, not city-level -- an even finer resolution than hazard.ts's
 * county-level join, but still one number for a whole tract, the same
 * "one number for a whole jurisdiction" caveat as crime's one-agency and
 * hazard's one-county limitations.
 */
type SviLayer = "overall" | "socioeconomic" | "household" | "minority_language" | "housing_transport";

interface SviYear {
  tract: string;
  overall: number | null;
  socioeconomic: number | null;
  household: number | null;
  minority_language: number | null;
  housing_transport: number | null;
}

interface SviRecord {
  years: Record<string, SviYear>;
}

interface SviMeta {
  years: number[];
}

const DATA = sviData as unknown as Record<string, SviRecord> & { _meta: SviMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);
const CITY_LABELS = new Map(cities.map((c) => [c.id, `${c.city}, ${c.state}`]));

const LAYER_LABELS: Record<SviLayer, string> = {
  overall: "Overall social vulnerability",
  socioeconomic: "Socioeconomic status",
  household: "Household characteristics",
  minority_language: "Minority status / language",
  housing_transport: "Housing type / transportation",
};

function getSviValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  const layer = layerId as SviLayer;
  if (!(layer in LAYER_LABELS)) return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  const value = yearData[layer];
  if (value === null || value === undefined) return null;

  const cityLabel = CITY_LABELS.get(cityId) ?? cityId;
  return {
    value,
    // Real ordinal-suffix bug found live by this project's own QA sweep,
    // fixed: this previously always hardcoded "th" (e.g. "82.1th
    // percentile" for a value not ending in a bare 4-9).
    detail: `${toOrdinal(value)} percentile, ${yearData.tract}, near ${cityLabel}, ${year} -- CDC/ATSDR Social Vulnerability Index`,
  };
}

export const sviDataset: Dataset = {
  id: "svi",
  label: "Social vulnerability",
  description: "CDC/ATSDR Social Vulnerability Index, 2010-2022 -- how exposed a community is to disaster/crisis broadly, higher = more vulnerable.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/svi-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: (Object.keys(LAYER_LABELS) as SviLayer[]).map((id) => ({ id, label: LAYER_LABELS[id] })),
  getValue: getSviValue,
};
