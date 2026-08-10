import { tool } from "ai";
import { z } from "zod";
import { searchCities, getDatasetCatalog, getLayerValue, rankCities, compareCities, getMethodology } from "@/lib/chat/functions";

/**
 * The exact, closed set of tools the BYOK chat assistant can call --
 * every one is read-only and backed by src/lib/chat/functions.ts's plain
 * functions over the SAME bundled data every map/panel component already
 * reads. This is the entire attack surface: the model has no other
 * channel to reach anything on this site (no shell, no file access, no
 * write path, no secrets) -- it can only look up what a site visitor
 * could already see by using the map normally. See ChatPanel.tsx for the
 * disclosure text shown to visitors before they enter a key.
 */
export const chatTools = {
  search_cities: tool({
    description:
      "Search the 512-city spine by name, 'City, ST' format, or exact state abbreviation. Returns city ids to use in other tools.",
    inputSchema: z.object({
      query: z.string().describe("A city name, 'City, ST', or a 2-letter state abbreviation."),
    }),
    execute: async ({ query }) => searchCities(query),
  }),

  list_datasets: tool({
    description:
      "List every real dataset and layer available on this site, including whether it supports a year dimension and which real years are available.",
    inputSchema: z.object({}),
    execute: async () => getDatasetCatalog(),
  }),

  get_layer_value: tool({
    description:
      "Get the real value for one city, one dataset layer, and (if the layer supports it) one year. Returns found:false for a real data gap -- never a fabricated value.",
    inputSchema: z.object({
      cityId: z.string().describe("A city id, e.g. 'austin-tx' -- use search_cities first if unsure."),
      datasetId: z.string().describe("A dataset id from list_datasets."),
      layerId: z.string().describe("A layer id from that dataset's layers list."),
      year: z.number().optional().describe("A real year from that layer's availableYears, if it supports time."),
    }),
    execute: async ({ cityId, datasetId, layerId, year }) => getLayerValue(cityId, datasetId, layerId, year),
  }),

  rank_cities: tool({
    description:
      "Rank cities by a weighted blend of one or more dataset layers -- the SAME real computation the site's own ranking panel uses. Optionally scope to a specific set of city ids, and/or a specific year.",
    inputSchema: z.object({
      layers: z
        .array(
          z.object({
            datasetId: z.string(),
            layerId: z.string(),
            weight: z.number().min(0).max(2).optional().describe("0-2, default 1. 0 excludes the layer."),
          }),
        )
        .min(1),
      year: z.number().optional(),
      cityIds: z.array(z.string()).optional().describe("Restrict ranking to these city ids only. Omit to rank all 512."),
      ascending: z.boolean().optional().describe("true (default) = best/lowest-concern first, false = worst first."),
      limit: z.number().min(1).max(50).optional().describe("Max results to return, default 25."),
    }),
    execute: async ({ layers, year, cityIds, ascending, limit }) => rankCities(layers, { year, cityIds, ascending, limit }),
  }),

  compare_cities: tool({
    description: "Get real values for multiple specific cities across one or more dataset layers side by side, e.g. to compare 2-4 candidate cities on the same criteria.",
    inputSchema: z.object({
      cityIds: z.array(z.string()).min(1).max(10).describe("City ids to compare, e.g. from search_cities."),
      layers: z
        .array(z.object({ datasetId: z.string(), layerId: z.string() }))
        .min(1)
        .describe("Which dataset layers to fetch for each city."),
      year: z.number().optional(),
    }),
    execute: async ({ cityIds, layers, year }) => compareCities(cityIds, layers, year),
  }),

  get_methodology: tool({
    description: "Get the real methodology writeup for a dataset -- source, method, and known limitations, in the dataset's own words. Use this to explain what a value does and doesn't mean before recommending a decision based on it.",
    inputSchema: z.object({
      datasetId: z.string().describe("A dataset id from list_datasets."),
    }),
    execute: async ({ datasetId }) => getMethodology(datasetId),
  }),
};
