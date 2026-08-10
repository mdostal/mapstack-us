/**
 * A local MCP (Model Context Protocol) server exposing Mapstack's real
 * data as read-only tools for any MCP-compatible agent (Claude Desktop,
 * Claude Code, etc.) to call directly -- run entirely on the caller's own
 * machine, over stdio, no network hosting, no secrets, no server this
 * project runs or pays for.
 *
 * This is the SAME closed, read-only tool set the in-app BYOK chat
 * exposes to a model (see src/lib/chat/tools.ts's doc comment) --
 * src/lib/chat/functions.ts's plain functions are reused directly here,
 * not reimplemented, so both surfaces stay in lockstep with the site's
 * real data. There is no upload/write path anywhere in this file: an
 * agent that wants to reason over a user's own documents (an allergy
 * test, a pay stub, personal preferences) does that entirely in its own
 * conversation and calls these tools only for the real, public per-city
 * numbers it needs -- Mapstack never sees or stores the user's own data.
 *
 * Run directly: `pnpm mcp` (tsx scripts/mcp-server.ts). Configure in an
 * MCP client (e.g. Claude Desktop's claude_desktop_config.json) by
 * pointing at this repo -- see README.md's "MCP server" section for the
 * exact config snippet.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchCities, getDatasetCatalog, getLayerValue, rankCities, compareCities, getMethodology } from "@/lib/chat/functions";

const server = new McpServer({
  name: "mapstack-us",
  version: "0.1.0",
});

function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

server.registerTool(
  "search_cities",
  {
    description: "Search the 512-city spine by name, 'City, ST' format, or exact state abbreviation. Returns city ids to use in other tools.",
    inputSchema: {
      query: z.string().describe("A city name, 'City, ST', or a 2-letter state abbreviation."),
    },
  },
  async ({ query }) => jsonResult(searchCities(query)),
);

server.registerTool(
  "list_datasets",
  {
    description: "List every real dataset and layer available on this site, including whether it supports a year dimension and which real years are available.",
    inputSchema: {},
  },
  async () => jsonResult(getDatasetCatalog()),
);

server.registerTool(
  "get_layer_value",
  {
    description: "Get the real value for one city, one dataset layer, and (if the layer supports it) one year. Returns found:false for a real data gap -- never a fabricated value.",
    inputSchema: {
      cityId: z.string().describe("A city id, e.g. 'austin-tx' -- use search_cities first if unsure."),
      datasetId: z.string().describe("A dataset id from list_datasets."),
      layerId: z.string().describe("A layer id from that dataset's layers list."),
      year: z.number().optional().describe("A real year from that layer's availableYears, if it supports time."),
    },
  },
  async ({ cityId, datasetId, layerId, year }) => jsonResult(getLayerValue(cityId, datasetId, layerId, year)),
);

server.registerTool(
  "rank_cities",
  {
    description: "Rank cities by a weighted blend of one or more dataset layers -- the SAME real computation the site's own ranking panel uses. Optionally scope to a specific set of city ids, and/or a specific year.",
    inputSchema: {
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
    },
  },
  async ({ layers, year, cityIds, ascending, limit }) => jsonResult(rankCities(layers, { year, cityIds, ascending, limit })),
);

server.registerTool(
  "compare_cities",
  {
    description: "Get real values for multiple specific cities across one or more dataset layers side by side, e.g. to compare 2-4 candidate cities on the same criteria.",
    inputSchema: {
      cityIds: z.array(z.string()).min(1).max(10).describe("City ids to compare, e.g. from search_cities."),
      layers: z
        .array(z.object({ datasetId: z.string(), layerId: z.string() }))
        .min(1)
        .describe("Which dataset layers to fetch for each city."),
      year: z.number().optional(),
    },
  },
  async ({ cityIds, layers, year }) => jsonResult(compareCities(cityIds, layers, year)),
);

server.registerTool(
  "get_methodology",
  {
    description: "Get the real methodology writeup for a dataset -- source, method, and known limitations, in the dataset's own words. Use this to explain to a user what a value does and doesn't mean before recommending a decision based on it.",
    inputSchema: {
      datasetId: z.string().describe("A dataset id from list_datasets."),
    },
  },
  async ({ datasetId }) => jsonResult(getMethodology(datasetId)),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("mapstack-us MCP server failed to start:", err);
  process.exit(1);
});
