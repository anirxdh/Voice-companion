import type { AgentExecutionContext } from "@/types/veil";
import { runToolAgent } from "@/agents/base";

export async function musicAgent(context: AgentExecutionContext) {
  return runToolAgent(context, "Music Agent", ["music", "song", "queue", "play"], "Music context prepared for orchestration.", {
    query: context.intent
  });
}
