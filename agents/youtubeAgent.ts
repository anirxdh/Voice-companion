import type { AgentExecutionContext } from "@/types/supernova";
import { runToolAgent } from "@/agents/base";

export async function youtubeAgent(context: AgentExecutionContext) {
  return runToolAgent(context, "YouTube Agent", ["youtube", "video", "watch", "play"], "Video context is ready when intent requires media.", {
    query: context.intent
  });
}
