"use client";

import { useVeilStore } from "@/store/use-veil-store";
import { petSpriteUrl, ROOM_NPC_LIST, COLONY_PET_THEME } from "@/components/pets/colony-pet-registry";
import { colonySpriteAria } from "@/lib/one-piece-collection";

type PetVisualState = "idle" | "rest" | "dance" | "voice" | "watch";

function npcVisualState(
  sceneMuted: boolean,
  crowd: "idle" | "pulse" | "theatre",
  npcRoom: string,
  activeRoom: string | null
): PetVisualState {
  if (sceneMuted) return "rest";
  if (crowd === "theatre") return "watch";
  if (crowd === "pulse") return "dance";
  if (activeRoom && npcRoom === activeRoom) return "voice";
  return "idle";
}

type RoomPetsProps = {
  /** Night / dormant backdrop: everyone sleeps — static rest sprites, no crowd dancing. */
  sceneMuted?: boolean;
};

export function RoomPets({ sceneMuted = false }: RoomPetsProps) {
  const activeRoom = useVeilStore((s) => s.activeRoom);
  const crowd = useVeilStore((s) => s.colonyCrowdMode);

  /** Night / dormant scene: no colony tile mascots — only the orb and backdrop stay visible. */
  if (sceneMuted) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 isolate">
      {ROOM_NPC_LIST.map((npc) => {
        const isFocus = !sceneMuted && activeRoom != null && npc.room === activeRoom;
        const dim = activeRoom && !isFocus && crowd === "idle";
        const visual = npcVisualState(sceneMuted, crowd, npc.room, activeRoom);
        const swayOn = visual === "dance" || visual === "voice" || visual === "watch";

        return (
          <div
            key={npc.id}
            className={`room-pet-shell colony-npc-shell${isFocus ? " colony-npc-shell--focus" : ""}${dim ? " colony-npc-shell--dim" : ""}${sceneMuted ? " colony-npc-shell--sleep" : ""}`}
            aria-label={colonySpriteAria(npc.room, COLONY_PET_THEME)}
            style={{
              left: npc.left,
              top: npc.top,
              transform: `translate(-50%, -50%) scale(${npc.scale * (isFocus ? 1.08 : 1)})`
            }}
          >
            <div
              className="room-pet-motion"
              data-sway={swayOn ? "on" : "off"}
              style={swayOn ? { animationDelay: `${npc.delay}s` } : undefined}
            >
              <span
                className="room-pet"
                data-state={visual}
                style={{
                  backgroundImage: `url(${petSpriteUrl(npc.slug)})`,
                  animationDelay: `${npc.delay}s`
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
