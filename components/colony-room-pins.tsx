"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CloudSun, X } from "lucide-react";
import { ROOM_NPC_LIST } from "@/components/pets/colony-pet-registry";
import { Button } from "@/components/ui/button";
import { useVeilStore } from "@/store/use-veil-store";

function anchorPctForRoom(room: string): { left: string; top: string } | null {
  const hit = ROOM_NPC_LIST.find((n) => n.room === room && n.id !== "ambiance-strip");
  if (!hit) return null;
  return { left: hit.left, top: hit.top };
}

export function ColonyRoomPins({ visible }: { visible: boolean }) {
  const pins = useVeilStore((state) => state.weatherPins);
  const removeWeatherPin = useVeilStore((state) => state.removeWeatherPin);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[39] overflow-visible">
      <AnimatePresence initial={false} mode="popLayout">
        {pins.map((pin, idx) => {
          const anchor = anchorPctForRoom(pin.room);
          const stackBefore = pins.slice(0, idx).filter((p) => p.room === pin.room).length;
          const stackOffsetPx = stackBefore * 78;
          if (!anchor) return null;

          return (
            <motion.div
              key={pin.id}
              layout="position"
              className="pointer-events-auto absolute w-[min(152px,calc(24vw))] max-w-[160px]"
              style={{
                left: anchor.left,
                top: anchor.top,
                transform: `translate(-50%, calc(-118% + ${stackOffsetPx}px))`
              }}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 0.94, 0.36, 1] }}
            >
              <div className="relative overflow-hidden rounded-lg border border-cyan-400/35 bg-black/62 px-2 py-1.5 font-mono text-[9px] text-cyan-50 shadow-[0_18px_40px_rgba(0,0,0,.42),inset_0_0_24px_hsla(200,94%,54%,0.06)] backdrop-blur-[3px]">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Dismiss weather card for ${pin.city}`}
                  className="absolute right-0 top-0 h-7 w-7 shrink-0 rounded-md border border-white/12 bg-black/45 text-cyan-100 hover:bg-black/56"
                  onClick={() => removeWeatherPin(pin.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="flex items-start gap-1.5 pr-8">
                  <CloudSun className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300/92" aria-hidden />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[9px] font-medium uppercase tracking-[0.12em] text-cyan-200/88">{pin.title}</p>
                    <p className="mt-0.5 text-[21px] font-semibold tabular-nums leading-none tracking-tight text-cyan-50">
                      {pin.tempC != null ? `${Math.round(pin.tempC)}°` : "—"}
                      <span className="align-top text-[9px] font-medium text-cyan-300/74"> C</span>
                    </p>
                    {pin.label ? <p className="mt-1 line-clamp-2 text-[8px] uppercase tracking-[0.12em] text-cyan-200/62">{pin.label}</p> : null}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
