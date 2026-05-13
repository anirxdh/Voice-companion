import { ONE_PIECE_SLUG_BY_HOTSPOT, orbOnePieceSlug } from "@/lib/one-piece-collection";


export const MAIN_ORB_PET_SLUG = "colony-agent";

export type ColonyNpc = {
  id: string;
  room: string;
  slug: string;
  left: string;
  top: string;
  delay: number;
  scale: number;
};

const COLONY_THEME_RAW = process.env.NEXT_PUBLIC_COLONY_PET_THEME?.toLowerCase()?.trim() ?? "";
export const COLONY_PET_THEME = (COLONY_THEME_RAW === "onepiece" ? "onepiece" : "office") as "office" | "onepiece";

const OFFICE_MAP = {
  email: "dwight",
  library: "vault-boy",
  browser: "friday",
  voice: "cortana",
  hub: "colony-agent",
  clock: "kurisu",
  notes: "qgirl",
  archive: "panam",
  downloads: "boba",
  
  ambient: "maddie"
} as const;

const ONEPIECE_MAP = ONE_PIECE_SLUG_BY_HOTSPOT;

function roomSlugEntries(): typeof OFFICE_MAP {
  if (COLONY_PET_THEME !== "onepiece") return OFFICE_MAP;
  return ONEPIECE_MAP as typeof OFFICE_MAP;
}

const R = roomSlugEntries();


export function mainOrbPetSlug(): string {
  return COLONY_PET_THEME === "onepiece" ? orbOnePieceSlug() : MAIN_ORB_PET_SLUG;
}


export const ROOM_NPC_LIST: ColonyNpc[] = [
  { id: "email", room: "email", slug: R.email, left: "22%", top: "25%", delay: 0, scale: 1 },
  { id: "library", room: "library", slug: R.library, left: "50%", top: "24%", delay: 0.2, scale: 1.03 },
  { id: "browser", room: "browser", slug: R.browser, left: "78%", top: "25%", delay: 0.4, scale: 1.02 },
  { id: "voice", room: "voice", slug: R.voice, left: "21%", top: "48%", delay: 0.12, scale: 1.02 },
  { id: "hub", room: "hub", slug: R.hub, left: "50%", top: "49%", delay: 0.35, scale: 1.06 },
  { id: "clock", room: "clock", slug: R.clock, left: "79%", top: "48%", delay: 0.25, scale: 1.02 },
  { id: "notes", room: "notes", slug: R.notes, left: "20%", top: "73%", delay: 0.15, scale: 1 },
  { id: "archive", room: "archive", slug: R.archive, left: "50%", top: "74%", delay: 0.45, scale: 1.02 },
  { id: "downloads", room: "downloads", slug: R.downloads, left: "79%", top: "73%", delay: 0.3, scale: 1.02 }
];

export function petSpriteUrl(slug: string): string {
  return `/assets/pets/${slug}/spritesheet.webp`;
}
