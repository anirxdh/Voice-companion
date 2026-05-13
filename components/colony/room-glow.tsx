"use client";

import { useSuperNovaStore } from "@/store/use-supernova-store";
import { ROOM_NPC_LIST } from "@/components/pets/colony-pet-registry";

const ROOM_COORDS: Record<string, { x: number; y: number }> = Object.fromEntries(
  ROOM_NPC_LIST.map((npc) => [npc.room, { x: parseFloat(npc.left), y: parseFloat(npc.top) }])
);

export function RoomGlow({ visible = true }: { visible?: boolean }) {
  const activeRoom = useSuperNovaStore((s) => s.activeRoom);

  if (!visible || !activeRoom) return null;

  const coords = ROOM_COORDS[activeRoom];
  if (!coords) return null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 6 }}>
      <div
        className="room-glow-pulse"
        style={{
          position: "absolute",
          left: `${coords.x}%`,
          top: `${coords.y}%`,
          transform: "translate(-50%, -50%)",
          width: "clamp(90px, 11vw, 160px)",
          height: "clamp(45px, 5.5vw, 80px)",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.1) 48%, transparent 100%)",
          filter: "blur(10px)",
        }}
      />
    </div>
  );
}
