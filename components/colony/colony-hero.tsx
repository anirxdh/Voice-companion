"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSuperNovaStore } from "@/store/use-supernova-store";
import { petSpriteUrl, mainOrbPetSlug, ROOM_NPC_LIST } from "@/components/pets/colony-pet-registry";
import type { AIPhase } from "@/types/supernova";

const ROOM_COORDS: Record<string, { x: number; y: number }> = Object.fromEntries(
  ROOM_NPC_LIST.map((npc) => [npc.room, { x: parseFloat(npc.left), y: parseFloat(npc.top) }])
);
const HUB = ROOM_COORDS["hub"] ?? { x: 50, y: 49 };

import { ROOM_IDENTITY } from "@/components/hud/voice-hud";
const ROOM_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ROOM_IDENTITY).map(([id, r]) => [id, r.name])
);

function phaseToVisual(phase: AIPhase): "rest" | "idle" | "voice" | "dance" | "watch" {
  if (phase === "listening" || phase === "thinking" || phase === "orchestrating") return "voice";
  if (phase === "speaking") return "dance";
  return "idle";
}

export function ColonyHero({ sceneMuted = false }: { sceneMuted?: boolean }) {
  const activeRoom = useSuperNovaStore((s) => s.activeRoom);
  const phase = useSuperNovaStore((s) => s.phase);
  const slug = mainOrbPetSlug();

  const [pos, setPos] = useState({ x: HUB.x, y: HUB.y });
  const [facingLeft, setFacingLeft] = useState(false);
  const [moving, setMoving] = useState(false);

  const posRef = useRef({ x: HUB.x, y: HUB.y });
  const cancelRef = useRef(false);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moveTo = useCallback((target: { x: number; y: number }) => {
    setFacingLeft(target.x < posRef.current.x);
    posRef.current = target;
    setMoving(true);
    setPos(target);
    if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
    moveTimerRef.current = setTimeout(() => setMoving(false), 1500);
  }, []);

  
  useEffect(() => {
    if (sceneMuted) {
      moveTo(HUB);
      return;
    }
    moveTo(activeRoom ? (ROOM_COORDS[activeRoom] ?? HUB) : HUB);
  }, [activeRoom, sceneMuted, moveTo]);

  
  useEffect(() => {
    if (sceneMuted || activeRoom) return;
    cancelRef.current = false;

    const loop = async () => {
      while (!cancelRef.current) {
        await new Promise<void>((r) => setTimeout(r, 3800 + Math.random() * 2800));
        if (cancelRef.current) break;
        const target = {
          x: Math.max(45, Math.min(55, HUB.x + (Math.random() * 7 - 3.5))),
          y: Math.max(44, Math.min(54, HUB.y + (Math.random() * 6 - 3))),
        };
        moveTo(target);
        await new Promise<void>((r) => setTimeout(r, 1600));
        if (cancelRef.current) break;
        moveTo(HUB);
      }
    };
    loop();
    return () => { cancelRef.current = true; };
  }, [sceneMuted, activeRoom, moveTo]);

  useEffect(() => () => {
    cancelRef.current = true;
    if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
  }, []);

  const isActive = !sceneMuted && activeRoom !== null;
  const roomLabel = activeRoom ? (ROOM_LABELS[activeRoom] ?? activeRoom) : null;
  const visualState = sceneMuted ? "rest" : phaseToVisual(phase);

  return (
    <div
      className={`room-pet-shell${isActive ? " colony-npc-shell--focus" : ""}${sceneMuted ? " colony-npc-shell--sleep" : ""}`}
      style={{
        position: "absolute",
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: `translate(-50%,-50%) scaleX(${facingLeft ? -1 : 1})`,
        transition: "left 1.5s ease-in-out, top 1.5s ease-in-out",
        zIndex: 20,
        width: "clamp(52px, 5.5vw, 74px)",
        height: "clamp(58px, 6vw, 82px)",
      }}
    >
      {/* Room label badge */}
      {isActive && roomLabel && (
        <div
          className="absolute bottom-full left-1/2 mb-2 whitespace-nowrap pointer-events-none z-10"
          style={{ transform: `translateX(-50%) scaleX(${facingLeft ? -1 : 1})` }}
        >
          <span
            className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-mono leading-tight"
            style={{
              background: "rgba(99,102,241,0.18)",
              border: "1px solid rgba(99,102,241,0.38)",
              color: "rgba(180,183,255,0.9)",
              boxShadow: "0 0 14px rgba(99,102,241,0.3)",
            }}
          >
            <span
              className="inline-block w-1 h-1 rounded-full"
              style={{ background: "rgba(99,102,241,0.85)" }}
            />
            {roomLabel}
          </span>
        </div>
      )}

      <div className="room-pet-motion" data-sway={!moving && isActive ? "on" : "off"}>
        <span
          className="room-pet"
          data-state={moving ? "idle" : visualState}
          aria-hidden="true"
          style={{
            backgroundImage: `url(${petSpriteUrl(slug)})`,
            animationDuration: moving ? "0.48s" : undefined,
            ...(isActive
              ? {
                  filter:
                    "drop-shadow(0 4px 0 rgba(0,0,0,0.72)) drop-shadow(0 0 20px rgba(99,102,241,0.62))",
                }
              : !sceneMuted
                ? { filter: "drop-shadow(0 3px 0 rgba(0,0,0,0.55))" }
                : undefined),
          }}
        />
      </div>
    </div>
  );
}
