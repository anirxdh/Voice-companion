import type { AgentExecutionContext } from "@/types/supernova";
import { runToolAgent } from "@/agents/base";

export async function messageAgent(context: AgentExecutionContext) {
  return runToolAgent(context, "Message Agent", ["message", "chat", "send", "mail", "email"], "Communication loops inspected.", {
    intent: context.intent
  });
}
