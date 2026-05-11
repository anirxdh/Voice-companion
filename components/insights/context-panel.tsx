"use client";

import { motion } from "framer-motion";
import { Brain, History, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useVeilStore } from "@/store/use-veil-store";

export function ContextPanel() {
  const memoryCards = useVeilStore((state) => state.memoryCards);

  return (
    <aside className="pointer-events-auto absolute left-5 top-24 hidden w-[310px] space-y-3 xl:block">
      <div className="flex items-center gap-2 text-white/74">
        <History className="h-4 w-4 text-amber-100" />
        <span className="font-mono text-[10px] uppercase tracking-[0.28em]">Context memory</span>
      </div>
      {memoryCards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, x: -24, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.2 + index * 0.12 }}
        >
          <Card className="rounded-lg">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-white/88">{card.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-white/54">{card.detail}</p>
                </div>
                <Brain className="mt-0.5 h-4 w-4 text-amber-100/70" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-center justify-between">
                <Badge>{card.signal}</Badge>
                <span className="font-mono text-[10px] text-white/42">{Math.round(card.confidence * 100)}%</span>
              </div>
              <Progress value={card.confidence * 100} />
            </CardContent>
          </Card>
        </motion.div>
      ))}
      <motion.div
        className="hologram rounded-lg p-4"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-100" />
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/60">Suggested action</p>
        </div>
        <p className="mt-3 text-sm leading-5 text-white/76">Prepare tomorrow workspace from calendar, notes, and open threads.</p>
      </motion.div>
    </aside>
  );
}
