import schoolSpendingData from "@data/school-spending.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The twenty-seventh real Dataset -- per-pupil school district spending,
 * dvd-5 (dataset-verification-drive epic). Upgrades
 * `.pHive/epics/data-store/docs/dataset-backlog.md` #21 (school quality)
 * from "weak, proxy-only" (rating services like GreatSchools/Niche aren't
 * real measured data) to a real, direct government-finance number: the
 * Urban Institute Education Data Portal API, built on NCES Common Core of
 * Data's F-33 school district finance survey. No API key required. See
 * scripts/gen_school_spending_data.py.
 *
 * District boundaries don't align with counties or cities one-to-one, so
 * this aggregates district-level finance to COUNTY level via a real
 * enrollment-weighted average -- reuses the existing city->county
 * crosswalk unchanged, same join unemployment.ts/cost-of-living.ts
 * already use.
 *
 * Real multi-year history (1994-2020), per explicit operator direction
 * to get "as much data as possible" for real trends over time. Both real
 * ends verified live: 1993 returns zero rows (a real floor, not a fetch
 * bug), 2021+ returns zero rows (the same ~5-year release lag the
 * original build already disclosed).
 *
 * One layer: real total-current-expenditure-per-enrolled-student,
 * percentile-ranked and INVERTED among THAT YEAR's own covered cities --
 * LOWER spending is MORE concerning, the same well-established-risk
 * asymmetry income.ts already encodes for a different dollar figure, now
 * per-year, the same convention crime.ts's multi-year layers use -- not
 * comparable across years. A real, disclosed tension (see methodology
 * doc): spending-to-outcomes causality is genuinely debated in education
 * research, and very high spending can also reflect high local
 * labor/cost-of-living rather than better schools -- this measures real
 * investment level, not a quality score.
 */
interface SchoolSpendingYear {
  per_pupil_spending: number;
  concern: number;
}

interface SchoolSpendingRecord {
  years: Record<string, SchoolSpendingYear>;
}

interface SchoolSpendingMeta {
  years: number[];
}

const DATA = schoolSpendingData as unknown as Record<string, SchoolSpendingRecord> & { _meta: SchoolSpendingMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getSchoolSpendingValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "per_pupil_spending") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `$${yearData.per_pupil_spending.toLocaleString()} per-pupil school spending in ${year} (enrollment-weighted) -- NCES / Urban Institute Education Data Portal`,
  };
}

export const schoolSpendingDataset: Dataset = {
  id: "school-spending",
  label: "School spending",
  description: "Real per-pupil school district spending, county-level, 1994-2020 -- lower spending = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/school-spending-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "per_pupil_spending", label: "Per-pupil spending" }],
  getValue: getSchoolSpendingValue,
};
