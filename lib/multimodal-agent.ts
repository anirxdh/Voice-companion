import { analyzeVisualContext, type PerceptionResult, type VisualInput } from "@/lib/perception-layer";

export type MultimodalContext = {
  visual?: VisualInput;
  text?: string;
  audioIntent?: string;
};

export async function enrichIntentWithPerception(intent: string, context: MultimodalContext): Promise<{
  intent: string;
  perception?: PerceptionResult;
}> {
  if (!context.visual) return { intent };
  const perception = await analyzeVisualContext(context.visual);
  return {
    intent: `${intent}\nPerception: ${perception.summary}`,
    perception
  };
}
