"use client";

import { useEffect, useRef, useState } from "react";
import { useVeilStore } from "@/store/use-veil-store";
import { ROOM_NPC_LIST, petSpriteUrl, COLONY_PET_THEME } from "@/components/pets/colony-pet-registry";
import { colonySpriteAria } from "@/lib/one-piece-collection";

type PetVisualState = "idle" | "rest" | "dance" | "voice" | "watch";
type PetPhase = "idle" | "wandering" | "returning";

type ArenaPet = {
  id: string;
  slug: string;
  room: string;
  deskX: number;
  deskY: number;
  x: number;
  y: number;
  facingLeft: boolean;
  phase: PetPhase;
};

const DESK_COORDS: Omit<ArenaPet, "x" | "y" | "facingLeft" | "phase">[] = ROOM_NPC_LIST.map((npc) => ({
  id: npc.id,
  slug: npc.slug,
  room: npc.room,
  deskX: parseFloat(npc.left),
  deskY: parseFloat(npc.top),
}));

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function wanderTarget(deskX: number, deskY: number) {
  const r = 9;
  return {
    x: clamp(deskX + (Math.random() * r * 2 - r), 6, 92),
    y: clamp(deskY + (Math.random() * r * 2 - r), 10, 88),
  };
}

const WANDER_INTERVALS = [3200, 4100, 2900, 3800, 5000, 3500, 4400, 2700, 3900];
const RETURN_DELAY_BASE = 2200;

export function PetsArena({ sceneMuted = false }: { sceneMuted?: boolean }) {
  const crowd = useVeilStore((s) => s.colonyCrowdMode);
  const activeRoom = useVeilStore((s) => s.activeRoom);

  const [pets, setPets] = useState<ArenaPet[]>(() =>
    DESK_COORDS.map((d) => ({
      ...d,
      x: d.deskX,
      y: d.deskY,
      facingLeft: false,
      phase: "idle" as PetPhase,
    }))
  );

  const timers = useRef<Map<string, ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>>(
    new Map()
  );

  function clearKey(key: string) {
    const t = timers.current.get(key);
    if (t !== undefined) {
      clearTimeout(t as ReturnType<typeof setTimeout>);
      clearInterval(t as ReturnType<typeof setInterval>);
      timers.current.delete(key);
    }
  }

  function clearAll() {
    timers.current.forEach((t) => {
      clearTimeout(t as ReturnType<typeof setTimeout>);
      clearInterval(t as ReturnType<typeof setInterval>);
    });
    timers.current.clear();
  }

  
  useEffect(() => {
    if (sceneMuted || crowd !== "idle") {
      clearAll();
      setPets((prev) =>
        prev.map((p) => ({ ...p, x: p.deskX, y: p.deskY, facingLeft: false, phase: "idle" }))
      );
      return;
    }

    DESK_COORDS.forEach((desk, i) => {
      const intervalMs = WANDER_INTERVALS[i % WANDER_INTERVALS.length];

      
      const initKey = `${desk.id}-init`;
      timers.current.set(
        initKey,
        setTimeout(() => {
          clearKey(initKey);

          const loopKey = `${desk.id}-loop`;
          timers.current.set(
            loopKey,
            setInterval(() => {
              if (Math.random() > 0.45) return;

              setPets((prev) => {
                const pet = prev.find((p) => p.id === desk.id);
                if (!pet || pet.phase !== "idle") return prev;

                const target = wanderTarget(pet.deskX, pet.deskY);
                const updatedPets = prev.map((p) =>
                  p.id === desk.id
                    ? { ...p, x: target.x, y: target.y, facingLeft: target.x < p.x, phase: "wandering" as PetPhase }
                    : p
                );

                // Schedule return-to-desk
                const returnDelay = RETURN_DELAY_BASE + Math.random() * 1800;
                const returnKey = `${desk.id}-return`;
                clearKey(returnKey);
                timers.current.set(
                  returnKey,
                  setTimeout(() => {
                    clearKey(returnKey);
                    setPets((inner) => {
                      const current = inner.find((p) => p.id === desk.id);
                      if (!current || current.phase !== "wandering") return inner;
                      return inner.map((p) =>
                        p.id === desk.id
                          ? { ...p, x: p.deskX, y: p.deskY, facingLeft: p.deskX < p.x, phase: "returning" as PetPhase }
                          : p
                      );
                    });
                    // Reset phase after CSS transition completes
                    const idleKey = `${desk.id}-idle`;
                    timers.current.set(
                      idleKey,
                      setTimeout(() => {
                        clearKey(idleKey);
                        setPets((inner) =>
                          inner.map((p) =>
                            p.id === desk.id && p.phase === "returning"
                              ? { ...p, facingLeft: false, phase: "idle" as PetPhase }
                              : p
                          )
                        );
                      }, 1500)
                    );
                  }, returnDelay)
                );

                return updatedPets;
              });
            }, intervalMs) as unknown as ReturnType<typeof setTimeout>
          );
        }, i * 420 + Math.random() * 600)
      );
    });

    return clearAll;
  }, [sceneMuted, crowd]);

  // Active room: snap matching pet back to desk immediately
  useEffect(() => {
    if (!activeRoom) return;
    clearKey(`${activeRoom}-return`);
    clearKey(`${activeRoom}-idle`);
    setPets((prev) =>
      prev.map((p) =>
        p.room === activeRoom
          ? { ...p, x: p.deskX, y: p.deskY, facingLeft: false, phase: "idle" }
          : p
      )
    );
  }, [activeRoom]);

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-lg"
      style={{
        background: "linear-gradient(180deg,rgba(4,5,12,0.97) 0%,rgba(7,9,18,0.95) 100%)",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)",
        backgroundSize: "56px 56px",
      }}
    >
      {/* Top label */}
      <div className="absolute top-2 left-3 z-30 pointer-events-none select-none font-mono text-[10px] tracking-widest uppercase text-white/18">
        Colony Arena
      </div>

      {/* Crowd mode badge */}
      {crowd !== "idle" && (
        <div className="absolute top-2 right-3 z-30 pointer-events-none select-none">
          <span
            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono"
            style={{
              background: crowd === "pulse" ? "rgba(255,168,90,0.16)" : "rgba(96,140,255,0.16)",
              border: `1px solid ${crowd === "pulse" ? "rgba(255,168,90,0.3)" : "rgba(96,140,255,0.3)"}`,
              color: crowd === "pulse" ? "rgba(255,210,140,0.9)" : "rgba(160,200,255,0.9)",
            }}
          >
            {crowd === "pulse" ? "♪ pulse" : "▶ theatre"}
          </span>
        </div>
      )}

      {/* Desk floor markers */}
      {DESK_COORDS.map((d) => (
        <div
          key={`floor-${d.id}`}
          className="absolute pointer-events-none"
          style={{
            left: `${d.deskX}%`,
            top: `${d.deskY + 2.8}%`,
            transform: "translateX(-50%)",
            width: "clamp(34px,3.4vw,46px)",
            height: "3px",
            borderRadius: "2px",
            background:
              activeRoom === d.room
                ? "rgba(155,220,255,0.28)"
                : "rgba(255,176,90,0.13)",
            boxShadow:
              activeRoom === d.room
                ? "0 0 8px rgba(155,220,255,0.2)"
                : "none",
            transition: "background 0.4s, box-shadow 0.4s",
          }}
        />
      ))}

      {/* Pets */}
      {pets.map((pet) => {
        const isMoving = pet.phase === "wandering" || pet.phase === "returning";
        const isFocus = !sceneMuted && activeRoom === pet.room;
        const swayOn = !isMoving && !sceneMuted && (crowd === "pulse" || crowd === "theatre" || isFocus);

        let visualState: PetVisualState = "idle";
        if (sceneMuted) visualState = "rest";
        else if (crowd === "theatre") visualState = "watch";
        else if (crowd === "pulse") visualState = "dance";
        else if (isFocus) visualState = "voice";

        // When walking, use the default walk strip (idle data-state) but faster
        const spriteDataState: string = isMoving ? "idle" : visualState;
        const moveDuration = pet.phase === "wandering" ? 1.25 : 1.45;

        return (
          <div
            key={pet.id}
            className="room-pet-shell"
            aria-label={colonySpriteAria(pet.room, COLONY_PET_THEME)}
            style={{
              left: `${pet.x}%`,
              top: `${pet.y}%`,
              transform: `translate(-50%,-50%) scaleX(${pet.facingLeft ? -1 : 1})`,
              transition: `left ${moveDuration}s ${isMoving ? "linear" : "ease-in-out"}, top ${moveDuration}s ${isMoving ? "linear" : "ease-in-out"}`,
              zIndex: isFocus ? 20 : 10,
              filter: isFocus ? undefined : "none",
            }}
          >
            {/* Speech bubble — counter-flip so text is always readable */}
            {isFocus && (
              <div
                className="absolute bottom-full left-1/2 mb-1.5 whitespace-nowrap pointer-events-none z-10"
                style={{ transform: `translateX(-50%) scaleX(${pet.facingLeft ? -1 : 1})` }}
              >
                <span
                  className="inline-block text-[10px] px-2 py-0.5 rounded-full font-mono leading-tight"
                  style={{
                    background: "rgba(155,220,255,0.16)",
                    border: "1px solid rgba(155,220,255,0.32)",
                    color: "rgba(200,240,255,0.92)",
                    boxShadow: "0 0 8px rgba(155,220,255,0.18)",
                  }}
                >
                  {crowd === "pulse" ? "♪ vibing" : crowd === "theatre" ? "▶ watching" : "● active"}
                </span>
              </div>
            )}

            <div
              className="room-pet-motion"
              data-sway={swayOn ? "on" : "off"}
            >
              <span
                className="room-pet"
                data-state={spriteDataState}
                aria-hidden="true"
                style={{
                  backgroundImage: `url(${petSpriteUrl(pet.slug)})`,
                  animationDuration: isMoving ? "0.52s" : undefined,
                  filter: isFocus
                    ? "drop-shadow(0 3px 0 rgba(0,0,0,0.55)) drop-shadow(0 0 14px rgba(155,220,255,0.52))"
                    : "drop-shadow(0 3px 0 rgba(0,0,0,0.55))",
                  opacity: sceneMuted ? 0.5 : 1,
                  transition: "opacity 0.4s",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
