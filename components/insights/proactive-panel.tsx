"use client";

import { motion } from "framer-motion";
import { Activity, Moon, Radar, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useVeilStore } from "@/store/use-veil-store";

const iconMap = {
  calm: Radar,
  urgent: Zap,
  focus: Activity,
  recovery: Moon
};

export function ProactivePanel() {
  const insights = useVeilStore((state) => state.insights);

  return (
    <aside className="pointer-events-auto absolute right-5 top-24 hidden w-[310px] space-y-3 xl:block">
      <div className="flex items-center justify-end gap-2 text-white/74">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em]">Proactive intelligence</span>
        <Radar className="h-4 w-4 text-amber-100" />
      </div>
      {insights.map((insight, index) => {
        const Icon = iconMap[insight.mood];
        return (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.28 + index * 0.14 }}
          >
            <Card className="rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-100/14 bg-amber-100/8">
                  <Icon className="h-4 w-4 text-amber-100" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-white/88">{insight.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-white/54">{insight.detail}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </aside>
  );
}
