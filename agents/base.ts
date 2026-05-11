import type { AgentExecutionContext, AgentExecutionResult, MCPTool } from "@/types/veil";
import { executeMCPTool } from "@/lib/mcp-client";
import { uid } from "@/lib/utils";

export type ToolMatch = {
  tool: MCPTool;
  score: number;
};

export function findTool(tools: MCPTool[], keywords: string[]): MCPTool | undefined {
  return tools
    .map((tool): ToolMatch => {
      const haystack = `${tool.name} ${tool.description ?? ""}`.toLowerCase();
      const score = keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
      return { tool, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.score
    ? tools
        .map((tool): ToolMatch => {
          const haystack = `${tool.name} ${tool.description ?? ""}`.toLowerCase();
          const score = keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
          return { tool, score };
        })
        .sort((a, b) => b.score - a.score)[0].tool
    : undefined;
}

export async function runToolAgent(
  context: AgentExecutionContext,
  agentId: string,
  keywords: string[],
  fallbackSummary: string,
  input: Record<string, unknown>
): Promise<AgentExecutionResult> {
  const tool = findTool(context.tools, keywords);
  const nodeId = uid(agentId);

  context.emit({
    type: "node",
    node: {
      id: nodeId,
      label: agentId,
      status: tool ? "running" : "complete",
      toolName: tool?.name,
      serverUrl: tool?.serverUrl,
      x: 24 + Math.random() * 52,
      y: 24 + Math.random() * 48
    }
  });

  if (!tool) {
    return { agentId, status: "complete", summary: fallbackSummary };
  }

  const result = await executeMCPTool(tool.name, input, tool.serverUrl);
  context.emit({ type: "tool-result", tool: result });
  return {
    agentId,
    status: result.status,
    summary: `${agentId} completed through ${tool.name}`,
    data: result.output
  };
}
