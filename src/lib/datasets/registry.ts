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
import { parksDataset } from "@/lib/datasets/parks";
import { politicalLeanDataset } from "@/lib/datasets/political-lean";
import { broadbandDataset } from "@/lib/datasets/broadband";
import { incomeDataset } from "@/lib/datasets/income";
import { housingCostBurdenDataset } from "@/lib/datasets/housing-cost-burden";
import { heatDataset } from "@/lib/datasets/heat";
import { salesTaxDataset } from "@/lib/datasets/sales-tax";
import { measuredGrassPollenDataset } from "@/lib/datasets/measured-grass-pollen";
import { incomeTaxDataset } from "@/lib/datasets/income-tax";
import { propertyTaxDataset } from "@/lib/datasets/property-tax";
import { unemploymentDataset } from "@/lib/datasets/unemployment";
import { airQualityDataset } from "@/lib/datasets/air-quality";
import { populationChangeDataset } from "@/lib/datasets/population-change";
import { costOfLivingDataset } from "@/lib/datasets/cost-of-living";
import { schoolSpendingDataset } from "@/lib/datasets/school-spending";
import { businessDensityDataset } from "@/lib/datasets/business-density";
import { triFacilityDensityDataset } from "@/lib/datasets/tri-facility-density";
import { averageWageDataset } from "@/lib/datasets/average-wage";
import { droughtDataset } from "@/lib/datasets/drought";
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
  parksDataset,
  politicalLeanDataset,
  broadbandDataset,
  incomeDataset,
  housingCostBurdenDataset,
  heatDataset,
  salesTaxDataset,
  measuredGrassPollenDataset,
  incomeTaxDataset,
  propertyTaxDataset,
  unemploymentDataset,
  airQualityDataset,
  populationChangeDataset,
  costOfLivingDataset,
  schoolSpendingDataset,
  businessDensityDataset,
  triFacilityDensityDataset,
  averageWageDataset,
  droughtDataset,
];

export function getDataset(id: string): Dataset | undefined {
  return DATASETS.find((d) => d.id === id);
}
