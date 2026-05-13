

const rawGallery =
  process.env.NEXT_PUBLIC_ONE_PIECE_GALLERY_URL?.trim() ||
  process.env.NEXT_PUBLIC_ONE_PIECE_COLLECTION_URL?.trim();


export const ONE_PIECE_GALLERY_PAGE_URL =
  rawGallery && /^https?:\/\//i.test(rawGallery) ? rawGallery : "";


export type ColonyHotspotRoom =
  | "email"
  | "library"
  | "browser"
  | "voice"
  | "hub"
  | "clock"
  | "notes"
  | "archive"
  | "downloads"
  | "ambient";

export type OnePieceCrewEntry = {
  id: string;
  
  displayName: string;
  
  kind: "Figure" | "Creature";
  
  colonyHotspot: ColonyHotspotRoom;
  blurb: string;
  moods: string[];
  
  slug: string;
};


export const ONE_PIECE_UNIQUE_CREW: OnePieceCrewEntry[] = [
  {
    id: "luffy-grin",
    displayName: "Luffy · brave grin",
    kind: "Figure",
    colonyHotspot: "email",
    blurb: "Chibi rubber captain — sandals and a brave grin.",
    moods: ["#cheerful", "#heroic"],
    slug: "one-piece-luffy-brave-grin"
  },
  {
    id: "zoro",
    displayName: "Zoro",
    kind: "Figure",
    colonyHotspot: "library",
    blurb: "Three-sword swordsman chip — scarred grin, teal hair cues.",
    moods: ["#heroic", "#focused"],
    slug: "one-piece-zoro-three-blades"
  },
  {
    id: "robin",
    displayName: "Robin",
    kind: "Figure",
    colonyHotspot: "browser",
    blurb: "Robin-inspired Codex pet with blue-and-pink outfit cues.",
    moods: ["#calm", "#mystical"],
    slug: "one-piece-nico-robin"
  },
  {
    id: "chopper-cap",
    displayName: "Chopper · cap styling",
    kind: "Figure",
    colonyHotspot: "voice",
    blurb: "Tony Tony Chopper with blue cap, pink brim, antlers, striped vest.",
    moods: ["#playful", "#wholesome"],
    slug: "one-piece-chopper-blue-cap"
  },
  {
    id: "luffy-cheer",
    displayName: "Luffy · cheerful captain",
    kind: "Figure",
    colonyHotspot: "hub",
    blurb: "Rubber pirate captain pet — straw hat, red vest, blue shorts.",
    moods: ["#cheerful", "#heroic"],
    slug: "one-piece-luffy-cheerful"
  },
  {
    id: "sabo",
    displayName: "Sabo",
    kind: "Figure",
    colonyHotspot: "clock",
    blurb: "Revolutionary silhouette — goggles, flame touches.",
    moods: ["#heroic", "#edgy"],
    slug: "one-piece-sabo-flame-aide"
  },
  {
    id: "ace",
    displayName: "Ace",
    kind: "Figure",
    colonyHotspot: "notes",
    blurb: "Tiny chibi Fire Fist energy — flame fist, bead necklace, freckles.",
    moods: ["#heroic", "#playful"],
    slug: "one-piece-fire-fist-ace"
  },
  {
    id: "chopper-doctor",
    displayName: "Chopper · doctor",
    kind: "Figure",
    colonyHotspot: "archive",
    blurb: "Doctor reindeer mascot, soft orange accents.",
    moods: ["#wholesome", "#heroic"],
    slug: "one-piece-chopper-doctor"
  },
  {
    id: "nika",
    displayName: "Gear-five spirit",
    kind: "Creature",
    colonyHotspot: "downloads",
    blurb: "Gear-five white hair energy, meat belly reaction poses.",
    moods: ["#playful", "#heroic"],
    slug: "one-piece-gear-five-spirit"
  },
  {
    id: "smoke-kick",
    displayName: "Smoke Kick",
    kind: "Figure",
    colonyHotspot: "ambient",
    blurb: "Calm black-suited silhouette with smoke motifs — walkway crew.",
    moods: ["#calm", "#focused"],
    slug: "one-piece-smoke-kick"
  }
];

export const ONE_PIECE_SLUG_BY_HOTSPOT: Record<ColonyHotspotRoom, string> = ONE_PIECE_UNIQUE_CREW.reduce(
  (acc, row) => {
    acc[row.colonyHotspot] = row.slug;
    return acc;
  },
  {} as Record<ColonyHotspotRoom, string>
);

export function colonyTileLabel(room: ColonyHotspotRoom): string {
  const map: Record<ColonyHotspotRoom, string> = {
    email: "Mail",
    library: "Library",
    browser: "Browser",
    voice: "Voice",
    hub: "Hub",
    clock: "Clock",
    notes: "Notes",
    archive: "Archive",
    downloads: "Downloads",
    ambient: "Walkway"
  };
  return map[room];
}

export function colonySpriteAria(room: string, theme: "office" | "onepiece"): string {
  if (theme !== "onepiece") return `Colony mascot — ${room} station`;

  const crew = ONE_PIECE_UNIQUE_CREW.find((c) => c.colonyHotspot === (room as ColonyHotspotRoom));
  if (!crew) return `Colony crew slot — ${room} station`;

  return `${crew.displayName} · ${colonyTileLabel(room as ColonyHotspotRoom)} tile`;
}

export function orbOnePieceSlug(): string {
  return ONE_PIECE_SLUG_BY_HOTSPOT.hub;
}
