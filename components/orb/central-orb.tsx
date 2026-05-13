"use client";

import { motion } from "framer-motion";
import { Mic, Pause, Radio, Sparkles } from "lucide-react";
import { useSuperNovaStore } from "@/store/use-supernova-store";
import { Waveform } from "@/components/voice/waveform";

export function CentralOrb() {
  const phase = useSuperNovaStore((state) => state.phase);

  const Icon = phase === "listening" ? Mic : phase === "speaking" ? Radio : phase === "interrupted" ? Pause : Sparkles;

  return (
    <section className="pointer-events-none absolute left-[clamp(14px,1.6vw,28px)] top-[50%] z-20 -translate-y-1/2">
      <div className="relative flex h-[min(34vw,360px)] w-[min(34vw,360px)] items-center justify-center">
        <motion.div
          className="absolute inset-10 rounded-full border border-cyan-100/12"
          animate={{ rotate: 360 }}
          transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-16 rounded-full border border-rose-200/10"
          animate={{ rotate: -360 }}
          transition={{ duration: 52, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute h-40 w-40 rounded-full bg-amber-300/12 blur-3xl"
          animate={{ scale: [1, 1.35, 1], opacity: [0.24, 0.62, 0.24] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="h-32 w-32 rounded-full border border-white/18 bg-white/[0.035] shadow-veil-glow backdrop-blur-md"
          animate={{ scale: phase === "orchestrating" ? [1, 1.08, 1] : [1, 1.035, 1] }}
          transition={{ duration: phase === "listening" ? 2.2 : 4.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Icon className="h-8 w-8 text-amber-100" strokeWidth={1.4} />
            <Waveform compact />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
