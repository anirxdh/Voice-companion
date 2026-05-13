import type { AgentExecutionContext } from "@/types/supernova";
import { runToolAgent } from "@/agents/base";

export async function reminderAgent(context: AgentExecutionContext) {
  return runToolAgent(context, "Reminder Agent", ["reminder", "todo", "task", "alert"], "Reminder layer updated.", {
    intent: context.intent
  });
}
