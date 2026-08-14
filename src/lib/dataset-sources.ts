/**
 * Real source attribution for every dataset in the registry -- name + a
 * link to the actual, live, public agency/API/dataset each one is fetched
 * from. Single source of truth for the in-app /sources page; kept in sync
 * by hand with docs/index.html's own "every dataset, every real source"
 * list (a static GitHub Pages file that can't import this module directly).
 *
 * Deliberately separate from `Dataset` itself (src/lib/datasets/types.ts) --
 * a dataset's `getValue()`/`layers` shape doesn't carry attribution, and
 * bolting a `source` field onto all 41 dataset files would be a much larger
 * change than this page needs. Full sourcing detail, real coverage numbers,
 * and known gaps for each one live in this repo's own
 * `data/<id>-methodology.md` files -- this is a summary, not a replacement.
 */
export interface DatasetSource {
  /** Real agency/organization/product name, as it names itself. */
  name: string;
  /** Direct link to the real, live, public source. */
  url: string;
  /** Short real note when the sourcing route is non-obvious (e.g. a
   * republication route, a stitched multi-vintage source). Omitted when the
   * name+url alone is self-explanatory. */
  note?: string;
}

/**
 * Every dataset's own real methodology doc lives at
 * `data/<id>-methodology.md`, except where noted here -- e.g. allergy
 * predates that convention (`data/allergy-scoring.md` +
 * `data/allergens-scoring.md`, ported from Allergy Locator's own file
 * layout, never renamed since).
 */
const METHODOLOGY_PATH_OVERRIDES: Record<string, string> = {
  allergy: "data/allergy-scoring.md",
};

const REPO_BLOB_BASE = "https://github.com/mdostal/mapstack-us/blob/main/";

export function methodologyDocUrl(datasetId: string): string {
  const path = METHODOLOGY_PATH_OVERRIDES[datasetId] ?? `data/${datasetId}-methodology.md`;
  return `${REPO_BLOB_BASE}${path}`;
}

export const DATASET_SOURCES: Record<string, DatasetSource> = {
  allergy: {
    name: "Allergy Locator's own validated grass model",
    url: "https://github.com/mdostal/allergy-locator",
    note: "plus Köppen-zone climate modeling for 28 more allergens",
  },
  crime: { name: "FBI Crime Data Explorer", url: "https://cde.ucr.cjis.gov/" },
  "care-access": {
    name: "Curated hospital facility lists",
    url: "https://github.com/mdostal/allergy-locator",
    note: "ported from Allergy Locator",
  },
  hazard: { name: "FEMA National Risk Index", url: "https://hazards.fema.gov/nri/data-resources" },
  svi: {
    name: "CDC/ATSDR Social Vulnerability Index",
    url: "https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html",
  },
  health: { name: "CDC PLACES", url: "https://www.cdc.gov/places/" },
  "food-access": {
    name: "USDA ERS Food Access Research Atlas",
    url: "https://www.ers.usda.gov/data-products/food-access-research-atlas",
  },
  "housing-inventory": { name: "Zillow Research Data", url: "https://www.zillow.com/research/data/" },
  "days-on-market": { name: "Zillow Research Data", url: "https://www.zillow.com/research/data/" },
  "traffic-fatalities": {
    name: "County Health Rankings & Roadmaps",
    url: "https://www.countyhealthrankings.org/",
  },
  "transit-access": { name: "FTA National Transit Database", url: "https://www.transit.dot.gov/ntd" },
  walkability: {
    name: "EPA National Walkability Index",
    url: "https://www.epa.gov/smartgrowth/smart-location-mapping",
  },
  parks: { name: "Trust for Public Land ParkServe", url: "https://parkserve.tpl.org" },
  "political-lean": {
    name: "MIT Election Data + Science Lab",
    url: "https://electionlab.mit.edu/",
  },
  broadband: {
    name: "County Health Rankings",
    url: "https://www.countyhealthrankings.org/",
    note: "Census ACS republication",
  },
  income: {
    name: "County Health Rankings",
    url: "https://www.countyhealthrankings.org/",
    note: "Census ACS republication",
  },
  "housing-cost-burden": {
    name: "County Health Rankings",
    url: "https://www.countyhealthrankings.org/",
    note: "Census ACS republication",
  },
  heat: {
    name: "NOAA NCEI Climate Normals",
    url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals",
  },
  "winter-cold-burden": {
    name: "NOAA NCEI Climate Normals",
    url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals",
  },
  "sales-tax": { name: "Tax Foundation", url: "https://taxfoundation.org/" },
  "income-tax": {
    name: "Tax Foundation",
    url: "https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/",
  },
  "property-tax": {
    name: "Census ACS 5-year estimates",
    url: "https://www.census.gov/programs-surveys/acs/data/data-via-api.html",
  },
  "population-change": {
    name: "Census PEP + ACS",
    url: "https://www.census.gov/programs-surveys/acs/data/data-via-api.html",
    note: "stitched across 3 real vintages",
  },
  "measured-grass-pollen": {
    name: "Vermont Dept. of Health EPHT Pollen",
    url: "https://www.arcgis.com/home/item.html?id=ecf4b3d2deb4462cab0131beebb175ac",
    note: "ArcGIS FeatureServer",
  },
  "historic-site-density": {
    name: "NPS National Register of Historic Places",
    url: "https://www.nps.gov/subjects/nationalregister/index.htm",
  },
  superfund: {
    name: "EPA Envirofacts (SEMS)",
    url: "https://www.epa.gov/enviro/envirofacts-data-service-api",
  },
  "environmental-violations": { name: "EPA ECHO", url: "https://echo.epa.gov/" },
  "tri-facility-density": {
    name: "EPA Toxics Release Inventory",
    url: "https://www.epa.gov/toxics-release-inventory-tri-program",
  },
  "air-quality": {
    name: "EPA Air Quality System",
    url: "https://aqs.epa.gov/aqsweb/airdata/download_files.html",
  },
  "severe-weather": { name: "NOAA Storm Events Database", url: "https://www.ncdc.noaa.gov/stormevents/" },
  drought: {
    name: "US Drought Monitor",
    url: "https://droughtmonitor.unl.edu/",
    note: "NOAA/USDA/UNL",
  },
  earthquake: { name: "USGS ASCE 7-22 Web Service", url: "https://earthquake.usgs.gov/ws/designmaps/" },
  "hate-crime": { name: "FBI Crime Data Explorer", url: "https://cde.ucr.cjis.gov/" },
  unemployment: {
    name: "BLS Local Area Unemployment Statistics",
    url: "https://www.bls.gov/lau/",
  },
  "average-wage": {
    name: "Census Business Patterns",
    url: "https://www.census.gov/programs-surveys/cbp.html",
  },
  "business-density": {
    name: "Census Business Patterns",
    url: "https://www.census.gov/programs-surveys/cbp.html",
  },
  "cost-of-living": {
    name: "BEA Regional Price Parities",
    url: "https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area",
  },
  "school-spending": {
    name: "Urban Institute Education Data Portal",
    url: "https://educationdata.urban.org/documentation/",
    note: "NCES CCD",
  },
  "library-access": {
    name: "IMLS Public Libraries Survey",
    url: "https://www.imls.gov/research-evaluation/surveys/public-libraries-survey-pls",
  },
  "broadband-speed": { name: "FCC National Broadband Map", url: "https://broadbandmap.fcc.gov/" },
  "electricity-cost": {
    name: "EIA (Energy Information Administration) API",
    url: "https://www.eia.gov/opendata/",
  },
};
