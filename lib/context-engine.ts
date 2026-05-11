import type { MemoryCard, ProactiveInsight, TimelineEvent } from "@/types/veil";

export type ContextSnapshot = {
  now: string;
  recentEvents: TimelineEvent[];
  memory: MemoryCard[];
  insights: ProactiveInsight[];
  workDurationMinutes: number;
};

export function buildContextSnapshot(input: Omit<ContextSnapshot, "now">): ContextSnapshot {
  return {
    ...input,
    now: new Date().toISOString()
  };
}

export function inferContinuity(snapshot: ContextSnapshot) {
  const openCommunication = snapshot.memory.find((card) => card.signal === "communication");
  const needsRecovery = snapshot.workDurationMinutes >= 150;

  return {
    shouldSurfaceReply: Boolean(openCommunication),
    shouldSuggestRecovery: needsRecovery,
    summary: [
      openCommunication ? "Open communication loop detected." : "No high-confidence reply loop.",
      needsRecovery ? "Long focus interval suggests recovery." : "Focus interval is within normal range."
    ].join(" ")
  };
}
