import { allergyDataset } from "@/lib/datasets/allergy";
import { crimeDataset } from "@/lib/datasets/crime";
import { careAccessDataset } from "@/lib/datasets/care-access";
import { hazardDataset } from "@/lib/datasets/hazard";
import { sviDataset } from "@/lib/datasets/svi";
import { healthDataset } from "@/lib/datasets/health";
import { foodAccessDataset } from "@/lib/datasets/food-access";
import { housingInventoryDataset } from "@/lib/datasets/housing-inventory";
import { daysOnMarketDataset } from "@/lib/datasets/days-on-market";
import { trafficFatalitiesDataset } from "@/lib/datasets/traffic-fatalities";
import { transitAccessDataset } from "@/lib/datasets/transit-access";
import { walkabilityDataset } from "@/lib/datasets/walkability";
import type { Dataset } from "@/lib/datasets/types";

/**
 * The full list of datasets this app knows about. Adding a new dataset
 * means implementing the Dataset interface (lib/datasets/types.ts) and
 * adding it here -- no other file needs to change, since MultiLayerMap/
 * ActiveLayersList/AddLayerPanel are already generic over any Dataset.
 */
export const DATASETS: Dataset[] = [
  allergyDataset,
  crimeDataset,
  careAccessDataset,
  hazardDataset,
  sviDataset,
  healthDataset,
  foodAccessDataset,
  housingInventoryDataset,
  daysOnMarketDataset,
  trafficFatalitiesDataset,
  transitAccessDataset,
  walkabilityDataset,
];

export function getDataset(id: string): Dataset | undefined {
  return DATASETS.find((d) => d.id === id);
}
