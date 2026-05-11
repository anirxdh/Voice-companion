import type { MCPTool } from "@/types/veil";

/** Sanitize bare tool ids (legacy fallback in MCP resolution — prefer {@link groqSlugForMcpTool}). */
export function groqSlugForToolName(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
}

function endpointSlugPrefix(serverUrl: string): string {
  try {
    const label = new URL(serverUrl).hostname.split(".")[0] || "mcp";
    return label.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 56);
  } catch {
    return "mcp";
  }
}

/**
 * Stable, unique slug per MCP tool across servers — YouTube vs music MCP both expose `play`, etc.
 * Format: `{hostSlug}__{toolName}` (mirrored in MCP resolution).
 */
export function groqSlugForMcpTool(tool: MCPTool): string {
  const prefixed = `${endpointSlugPrefix(tool.serverUrl)}__${tool.name}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  return prefixed.slice(0, 112);
}

export function toGroqTools(tools: MCPTool[]) {
  const cap = Math.min(tools.length, 80);
  return tools.slice(0, cap).map((tool) => ({
    type: "function" as const,
    function: {
      name: groqSlugForMcpTool(tool),
      description: tool.description || `Execute MCP tool ${tool.name} on ${endpointSlugPrefix(tool.serverUrl)}.`,
      parameters: tool.inputSchema || {
        type: "object",
        properties: {},
        additionalProperties: true
      }
    }
  }));
}
