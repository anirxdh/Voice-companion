"use client";

import { motion } from "framer-motion";
import { CircleDot, Terminal } from "lucide-react";
import { formatClock } from "@/lib/utils";
import { useSuperNovaStore } from "@/store/use-supernova-store";

export function OrchestrationTimeline() {
  const timeline = useSuperNovaStore((state) => state.timeline);
  const thoughtStream = useSuperNovaStore((state) => state.thoughtStream);
  const activeTools = useSuperNovaStore((state) => state.activeTools);

  const thoughts = thoughtStream
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(-6);

  return (
    <section className="pointer-events-auto absolute inset-x-5 bottom-5 h-[230px]">
      <div className="hologram h-full overflow-hidden rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-amber-100" />
          <h2 className="font-mono text-[10px] uppercase tracking-[0.26em] text-white/62">Runtime logs</h2>
        </div>
        <div className="no-scrollbar h-[178px] space-y-2 overflow-auto pr-2 font-mono text-[11px] leading-5 text-white/68">
          <div className="rounded-md border border-white/8 bg-black/20 px-3 py-2">
            <span className="text-amber-100/80">&gt;</span> {thoughts.length > 0 ? thoughts.join(" ") : "Waiting for intent to become orchestration."}
          </div>
          {[...activeTools.map((tool) => ({
            id: tool.id,
            title: tool.toolName,
            detail: tool.status,
            timestamp: tool.startedAt
          })), ...timeline].slice(0, 8).map((event) => (
            <motion.div
              key={event.id}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CircleDot className="mt-0.5 h-3.5 w-3.5 text-amber-100/70" />
              <div>
                <p className="text-xs text-white/78">{event.title}</p>
                <p className="line-clamp-1 text-[11px] text-white/42">{event.detail}</p>
              </div>
              <span className="font-mono text-[10px] text-white/34">{formatClock(event.timestamp)}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
