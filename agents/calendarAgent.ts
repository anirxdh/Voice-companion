import type { AgentExecutionContext } from "@/types/supernova";
import { runToolAgent } from "@/agents/base";

export async function calendarAgent(context: AgentExecutionContext) {
  return runToolAgent(context, "Calendar Agent", ["calendar", "schedule", "event", "meeting"], "Calendar context prepared.", {
    intent: context.intent
  });
}
