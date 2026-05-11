"use client";

import { motion } from "framer-motion";
import { useVeilStore } from "@/store/use-veil-store";

export function Waveform({ compact = false }: { compact?: boolean }) {
  const audioLevel = useVeilStore((state) => state.audioLevel);
  const phase = useVeilStore((state) => state.phase);
  const bars = compact ? 14 : 48;

  return (
    <div className={compact ? "flex h-5 items-center gap-0.5" : "flex h-16 items-center gap-1.5"}>
      {Array.from({ length: bars }).map((_, index) => {
        const distance = Math.abs(index - bars / 2) / (bars / 2);
        const height = 8 + (1 - distance) * 14 + audioLevel * 14;
        return (
          <motion.span
            key={index}
            className="w-0.5 rounded-full bg-amber-100/70 shadow-[0_0_8px_rgba(255,176,90,.34)]"
            animate={{
              height: phase === "idle" ? [4, 9 + Math.random() * 6, 4] : [height * 0.5, height, height * 0.65],
              opacity: phase === "idle" ? 0.26 : 0.72
            }}
            transition={{ duration: 0.95 + index * 0.01, repeat: Infinity, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}
