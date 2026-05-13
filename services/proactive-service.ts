import type { MemoryCard, ProactiveInsight } from "@/types/supernova";

export function generateProactiveInsights(memory: MemoryCard[], workDurationMinutes: number): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];

  if (memory.some((card) => card.signal === "communication")) {
    insights.push({
      id: "open-loop",
      title: "Unfinished communication",
      detail: "A conversation is waiting for closure.",
      mood: "calm"
    });
  }

  if (workDurationMinutes > 150) {
    insights.push({
      id: "recovery-window",
      title: "Recovery window",
      detail: "A short reset would protect the next focus block.",
      mood: "recovery"
    });
  }

  insights.push({
    id: "continuity",
    title: "Workflow continuity",
    detail: "Super Nova can restore context across apps without manual navigation.",
    mood: "focus"
  });

  return insights;
}
