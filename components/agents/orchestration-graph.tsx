"use client";

import { motion } from "framer-motion";
import { useVeilStore } from "@/store/use-veil-store";

export function OrchestrationGraph() {
  const nodes = useVeilStore((state) => state.nodes);
  const edges = useVeilStore((state) => state.edges);

  return (
    <div className="pointer-events-none absolute inset-x-[18%] bottom-[290px] top-[16%] hidden md:block">
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {edges.map((edge) => {
          const from = nodes.find((node) => node.id === edge.from);
          const to = nodes.find((node) => node.id === edge.to);
          if (!from || !to) return null;
          return (
            <motion.line
              key={edge.id}
              x1={`${from.x}%`}
              y1={`${from.y}%`}
              x2={`${to.x}%`}
              y2={`${to.y}%`}
              stroke={edge.status === "active" ? "rgba(103,232,249,.74)" : "rgba(255,255,255,.16)"}
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2 }}
            />
          );
        })}
      </svg>
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: node.status === "running" ? [1, 1.12, 1] : 1 }}
          transition={{ duration: 1.8, repeat: node.status === "running" ? Infinity : 0 }}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-cyan-200/20 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-cyan-100/22 bg-white/[0.045] text-center text-[10px] leading-3 text-white/72 backdrop-blur-md">
              {node.label}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
