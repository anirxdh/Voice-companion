import type { AgentExecutionContext } from "@/types/veil";
import { runToolAgent } from "@/agents/base";

export async function notesAgent(context: AgentExecutionContext) {
  return runToolAgent(context, "Notes Agent", ["note", "notes", "memory", "document"], "Notes context indexed for continuity.", {
    text: context.intent
  });
}
