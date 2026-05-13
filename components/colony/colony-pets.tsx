"use client";

import { useEffect, useRef, useState } from "react";
import { useSuperNovaStore } from "@/store/use-supernova-store";
import { ROOM_NPC_LIST, petSpriteUrl, COLONY_PET_THEME } from "@/components/pets/colony-pet-registry";
import { colonySpriteAria } from "@/lib/one-piece-collection";


const HUMAN_OVERRIDE: Record<string, string> = {
  "vault-boy": "maddie",   
  "boba": "nezuko",        
};

type PetPhase = "idle" | "wandering" | "returning";

type ColonyPet = {
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


const DESK_COORDS = ROOM_NPC_LIST.map((npc) => ({
  id: npc.id,
  slug: HUMAN_OVERRIDE[npc.slug] ?? npc.slug,
  room: npc.room,
  deskX: parseFloat(npc.left),
  deskY: parseFloat(npc.top),
}));


const WANDER_CADENCE = [4100, 5700, 3500, 5000, 6600, 3800, 5300, 3000, 4600];

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function wanderTarget(deskX: number, deskY: number, radius: number) {
  return {
    x: clamp(deskX + (Math.random() * radius * 2 - radius), 4, 94),
    y: clamp(deskY + (Math.random() * radius * 2 - radius), 6, 90),
  };
}

export function ColonyPets({ sceneMuted = false }: { sceneMuted?: boolean }) {
  const crowd = useSuperNovaStore((s) => s.colonyCrowdMode);
  const activeRoom = useSuperNovaStore((s) => s.activeRoom);

  const [pets, setPets] = useState<ColonyPet[]>(() =>
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
    
    if (sceneMuted) {
      clearAll();
      setPets((prev) =>
        prev.map((p) => ({ ...p, x: p.deskX, y: p.deskY, facingLeft: false, phase: "idle" }))
      );
      return;
    }

    
    if (crowd !== "idle") {
      clearAll();
      setPets((prev) =>
        prev.map((p) => ({ ...p, x: p.deskX, y: p.deskY, facingLeft: false, phase: "idle" }))
      );
      return;
    }

    const wanderRadius = 7;
    const wanderChance = 0.45;
    const returnDelayBase = 2000;

    DESK_COORDS.forEach((desk, i) => {
      const initKey = `${desk.id}-init`;
      // Stagger startup so pets don't all move together
      timers.current.set(
        initKey,
        setTimeout(() => {
          clearKey(initKey);

          const loopKey = `${desk.id}-loop`;
          const cadence = WANDER_CADENCE[i % WANDER_CADENCE.length];

          timers.current.set(
            loopKey,
            setInterval(() => {
              if (Math.random() > wanderChance) return;

              setPets((prev) => {
                const pet = prev.find((p) => p.id === desk.id);
                if (!pet || pet.phase !== "idle") return prev;

                const target = wanderTarget(pet.deskX, pet.deskY, wanderRadius);
                const next = prev.map((p) =>
                  p.id === desk.id
                    ? {
                        ...p,
                        x: target.x,
                        y: target.y,
                        facingLeft: target.x < p.x,
                        phase: "wandering" as PetPhase,
                      }
                    : p
                );

                // Schedule return to desk
                const retKey = `${desk.id}-return`;
                clearKey(retKey);
                timers.current.set(
                  retKey,
                  setTimeout(() => {
                    clearKey(retKey);
                    setPets((inner) =>
                      inner.map((p) =>
                        p.id === desk.id && p.phase === "wandering"
                          ? {
                              ...p,
                              x: p.deskX,
                              y: p.deskY,
                              facingLeft: p.deskX < p.x,
                              phase: "returning" as PetPhase,
                            }
                          : p
                      )
                    );

                    // Reset phase after CSS transition finishes
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
                  }, returnDelayBase + Math.random() * 1800)
                );

                return next;
              });
            }, cadence) as unknown as ReturnType<typeof setTimeout>
          );
        }, i * 350 + Math.random() * 700)
      );
    });

    return clearAll;
  }, [sceneMuted, crowd]);

  // Snap active-room pet back to its desk immediately
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
    <div className="pointer-events-none absolute inset-0 z-10 isolate">
      {pets.map((pet) => {
        const isMoving = pet.phase === "wandering" || pet.phase === "returning";
        const isFocus = !sceneMuted && activeRoom === pet.room;
        const isDim = !isFocus && activeRoom !== null && !sceneMuted && crowd === "idle";
        const swayOn = !isMoving && !sceneMuted && (crowd === "pulse" || isFocus);

        let visualState: "idle" | "rest" | "dance" | "voice" | "watch" = "idle";
        if (sceneMuted) visualState = "rest";
        else if (crowd === "theatre") visualState = "watch";
        else if (crowd === "pulse") visualState = "dance";
        else if (isFocus) visualState = "voice";

        const moveDuration = pet.phase === "wandering" ? 1.3 : 1.5;

        return (
          <div
            key={pet.id}
            className={`room-pet-shell${isFocus ? " colony-npc-shell--focus" : ""}${isDim ? " colony-npc-shell--dim" : ""}${sceneMuted ? " colony-npc-shell--sleep" : ""}`}
            aria-label={colonySpriteAria(pet.room, COLONY_PET_THEME)}
            style={{
              left: `${pet.x}%`,
              top: `${pet.y}%`,
              transform: `translate(-50%,-50%) scaleX(${pet.facingLeft ? -1 : 1})`,
              transition: `left ${moveDuration}s ${isMoving ? "linear" : "ease-in-out"}, top ${moveDuration}s ${isMoving ? "linear" : "ease-in-out"}`,
              zIndex: isFocus ? 20 : 10,
            }}
          >
            {/* Speech bubble — counter-flipped so text is always readable */}
            {isFocus && (
              <div
                className="absolute bottom-full left-1/2 mb-1.5 whitespace-nowrap pointer-events-none z-10"
                style={{ transform: `translateX(-50%) scaleX(${pet.facingLeft ? -1 : 1})` }}
              >
                <span
                  className="inline-block text-[10px] px-2 py-0.5 rounded-full font-mono leading-tight"
                  style={{
                    background: "rgba(155,220,255,0.18)",
                    border: "1px solid rgba(155,220,255,0.32)",
                    color: "rgba(200,240,255,0.92)",
                    boxShadow: "0 0 8px rgba(155,220,255,0.18)",
                  }}
                >
                  {crowd === "pulse" ? "♪ vibing" : crowd === "theatre" ? "▶ watching" : "● active"}
                </span>
              </div>
            )}

            <div className="room-pet-motion" data-sway={swayOn ? "on" : "off"}>
              <span
                className="room-pet"
                data-state={isMoving ? "idle" : visualState}
                aria-hidden="true"
                style={{
                  backgroundImage: `url(${petSpriteUrl(pet.slug)})`,
                  animationDuration: isMoving ? "0.5s" : undefined,
                  ...(isFocus && {
                    filter:
                      "drop-shadow(0 4px 0 rgba(0,0,0,0.7)) drop-shadow(0 0 14px rgba(155,220,255,0.55))",
                  }),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
