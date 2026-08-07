import schoolSpendingData from "@data/school-spending.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The twenty-eighth real Dataset -- per-pupil school district spending,
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
 * One layer: real total-current-expenditure-per-enrolled-student,
 * percentile-ranked and INVERTED among covered cities -- LOWER spending
 * is MORE concerning, the same well-established-risk asymmetry income.ts
 * already encodes for a different dollar figure. A real, disclosed
 * tension (see methodology doc): spending-to-outcomes causality is
 * genuinely debated in education research, and very high spending can
 * also reflect high local labor/cost-of-living rather than better
 * schools -- this measures real investment level, not a quality score.
 */
interface SchoolSpendingRecord {
  per_pupil_spending: number;
  county: string;
  concern: number;
}

const DATA = schoolSpendingData as unknown as Record<string, SchoolSpendingRecord> & { _meta: unknown };

function getSchoolSpendingValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "per_pupil_spending") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `$${record.per_pupil_spending.toLocaleString()} per-pupil school spending (${record.county} County, enrollment-weighted) -- NCES / Urban Institute Education Data Portal`,
  };
}

export const schoolSpendingDataset: Dataset = {
  id: "school-spending",
  label: "School spending",
  description: "Real per-pupil school district spending -- NCES Common Core of Data, county-level, lower spending = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/school-spending-methodology.md",
  supportsTime: false,
  layers: [{ id: "per_pupil_spending", label: "Per-pupil spending" }],
  getValue: getSchoolSpendingValue,
};
