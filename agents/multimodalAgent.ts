import type { AgentExecutionContext } from "@/types/supernova";
import { enrichIntentWithPerception } from "@/lib/multimodal-agent";
import { runToolAgent } from "@/agents/base";

export async function multimodalAgent(context: AgentExecutionContext) {
  const enriched = await enrichIntentWithPerception(context.intent, {});
  return runToolAgent(context, "Multimodal Agent", ["image", "screenshot", "vision", "camera", "visual"], "Perception architecture is active.", {
    intent: enriched.intent
  });
}
