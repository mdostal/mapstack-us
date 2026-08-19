import careAccessData from "@data/care-access.json";
import { driveTimeToConcern } from "@/lib/formula/care-access-concern";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The third real Dataset, ported from allergy-locator's care-access.json --
 * the actual "second real dataset" the generalized Dataset interface was
 * designed against (see types.ts's header comment, which already used this
 * dataset's own facility/drive-time shape as one of its two founding
 * examples). A reduced port, same posture as allergy.ts: the drive-time
 * data itself is unchanged, but the 0-100 concern score is new work done
 * here -- allergy-locator's own /care-access page shows raw tiers only, no
 * score. See data/care-access-methodology.md.
 */
type CareAccessLayer = "general" | "pediatric_specialty" | "pediatric_cardiac";

interface FacilityEntry {
  nearest_facility: string;
  facility_city: string;
  distance_mi: number;
  est_drive_min: number;
  tier: string;
}

type CareAccessRecord = Partial<Record<CareAccessLayer, FacilityEntry>> & { city: string };

const DATA = careAccessData as unknown as Record<string, CareAccessRecord>;

const LAYER_LABELS: Record<CareAccessLayer, string> = {
  general: "General / acute care",
  pediatric_specialty: "Pediatric specialty",
  pediatric_cardiac: "Pediatric cardiac surgery",
};

// Past this, the haversine-based estimate is crossing open water (Hawaii,
// Alaska) rather than measuring a real driving route -- see the methodology
// doc's Honolulu/Anchorage findings. Flagged in the detail string rather
// than silently presented as a plausible drive time.
const IMPLAUSIBLE_OVER_WATER_MINUTES = 1000;

function formatDriveTime(minutes: number): string {
  if (minutes < 60) return `~${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return `~${hours.toFixed(1)} hr`;
}

function getCareAccessValue(cityId: string, layerId: string): DatasetLayerValue | null {
  const record = DATA[cityId];
  if (!record) return null;

  const entry = record[layerId as CareAccessLayer];
  if (!entry) return null;

  const concern = driveTimeToConcern(entry.est_drive_min);
  const driveTime = formatDriveTime(entry.est_drive_min);
  const caveat =
    entry.est_drive_min >= IMPLAUSIBLE_OVER_WATER_MINUTES
      ? " (straight-line estimate crosses open water -- not a real driving route)"
      : "";

  return {
    value: concern,
    tier: entry.tier,
    detail: `${entry.nearest_facility}, ${driveTime} drive${caveat}`,
  };
}

export const careAccessDataset: Dataset = {
  id: "care-access",
  label: "Care access",
  description:
    "Estimated drive time to the nearest hospital, ported from allergy-locator's facility data -- general, pediatric specialty, and pediatric cardiac surgery.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/care-access-methodology.md",
  supportsTime: false,
  layers: (Object.keys(LAYER_LABELS) as CareAccessLayer[]).map((id) => ({
    id,
    label: LAYER_LABELS[id],
    legendLow: "Nearby",
    legendHigh: "Far away",
  })),
  getValue: getCareAccessValue,
};
