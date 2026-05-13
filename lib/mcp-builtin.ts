

import type { MCPTool } from "@/types/supernova";

export const VEIL_BUILTIN_MCP_URL = "https://veil.builtin/mcp";

export const VEIL_BUILTIN_TOOLS: MCPTool[] = [
  {
    id: `${VEIL_BUILTIN_MCP_URL}:headlines`,
    serverUrl: VEIL_BUILTIN_MCP_URL,
    name: "headlines",
    description: "Hacker News headline stack for news/top stories/HN intents.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: true
    }
  },
  {
    id: `${VEIL_BUILTIN_MCP_URL}:maps_place`,
    serverUrl: VEIL_BUILTIN_MCP_URL,
    name: "maps_place",
    description:
      "Live atlas iframe via OpenStreetMap (Nominatim forward geocode). Trigger: map/where is/locate/directions/address intents. Requires query.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: true
    }
  },
  {
    id: `${VEIL_BUILTIN_MCP_URL}:browse_page`,
    serverUrl: VEIL_BUILTIN_MCP_URL,
    name: "browse_page",
    description:
      "Fetch a readable page snapshot from a public https URL — uses Firecrawl v2 scrape when FIRECRAWL_API_KEY is set, otherwise VEIL strips HTML server-side (browse/scrape/read this page intents). Requires url.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
      additionalProperties: true
    }
  },
  {
    id: `${VEIL_BUILTIN_MCP_URL}:wiki_scout`,
    serverUrl: VEIL_BUILTIN_MCP_URL,
    name: "wiki_scout",
    description:
      "Wikipedia synopsis via public search + page summary APIs. Trigger: wiki lookup/who is/tell me about/explain who intent. Requires query.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: true
    }
  },
  {
    id: `${VEIL_BUILTIN_MCP_URL}:orbit_apod`,
    serverUrl: VEIL_BUILTIN_MCP_URL,
    name: "orbit_apod",
    description:
      "NASA Astronomy Picture of the Day orbit deck — cool cosmos panel. Optional date YYYY-MM-DD in arguments.",
    inputSchema: {
      type: "object",
      properties: { date: { type: "string" } },
      additionalProperties: true
    }
  },
  {
    id: `${VEIL_BUILTIN_MCP_URL}:sticky_note`,
    serverUrl: VEIL_BUILTIN_MCP_URL,
    name: "sticky_note",
    description:
      "Colony sticky notes / scratch pad (.supernova-notes.json). Trigger: remember/jot/note/sticky/show my notes/clear notes. Args: action (append|list|clear|delete), text (append), id (delete one).",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["append", "list", "clear", "delete"] },
        text: { type: "string" },
        id: { type: "string" }
      },
      additionalProperties: true
    }
  }
];

export function isVeilBuiltinServerUrl(serverUrl: string): boolean {
  try {
    return new URL(serverUrl).hostname.endsWith("veil.builtin");
  } catch {
    return serverUrl.includes("veil.builtin");
  }
}
