"use client";

import { type SyntheticEvent, useEffect } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, PawPrint, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ONE_PIECE_GALLERY_PAGE_URL,
  ONE_PIECE_UNIQUE_CREW,
  colonyTileLabel,
  type OnePieceCrewEntry
} from "@/lib/one-piece-collection";
import { SPRITE_IMPORT_DOCS_URL } from "@/lib/sprite-docs-url";
import { useVeilStore } from "@/store/use-veil-store";

function PortraitFrame({ slug }: { slug: string }) {
  const src = `/assets/pets/${slug}/spritesheet.webp`;

  return (
    <div className="relative mx-auto mb-3 h-24 w-[88px] overflow-hidden rounded-lg border border-cyan-400/35 bg-black/50 shadow-[inset_0_0_22px_rgba(34,211,238,.08)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover opacity-93"
        loading="lazy"
        onError={(e: SyntheticEvent<HTMLImageElement>) => {
          const wrap = e.currentTarget.parentElement;
          if (!wrap) return;
          e.currentTarget.remove();
          if (wrap.querySelector("[data-pixel-fallback]")) return;
          const fb = document.createElement("div");
          fb.dataset.pixelFallback = "";
          fb.className = "flex h-full w-full flex-col items-center justify-center gap-1 text-center";
          fb.innerHTML =
            '<span class="font-mono text-[10px] uppercase tracking-widest text-cyan-200/62">sprite</span><span class="text-3xl grayscale opacity-92" aria-hidden="true">🏴‍☠️</span>';
          wrap.prepend(fb);
        }}
      />
    </div>
  );
}

function CrewTileCard({
  entry,
  active,
  onSelect,
  galleryUrl
}: {
  entry: OnePieceCrewEntry;
  active: boolean;
  onSelect: () => void;
  galleryUrl: string | undefined;
}) {
  const tile = colonyTileLabel(entry.colonyHotspot);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left outline-none ring-offset-2 ring-offset-transparent transition-shadow focus-visible:ring-2 focus-visible:ring-cyan-400/60"
    >
      <Card className={`h-full bg-black/52 ${active ? "ring-2 ring-cyan-300/42" : "border-white/14 hover:border-cyan-300/38"}`}>
        <CardHeader className="space-y-0 pb-1 pt-4">
          <PortraitFrame slug={entry.slug} />
          <div className="flex items-start justify-between gap-2 px-3">
            <div className="min-w-0">
              <div className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/65">{tile} tile</div>
              <div className="truncate text-[13px] font-medium text-cyan-50">{entry.displayName}</div>
              <div className="truncate font-mono text-[9px] text-violet-200/72">{entry.kind}</div>
            </div>
            {galleryUrl ? (
              <a
                href={galleryUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="pointer-events-auto shrink-0 rounded border border-white/16 bg-black/45 p-1.5 text-cyan-100/76 hover:bg-black/62 hover:text-cyan-50"
                title="Community gallery reference"
                aria-label="Open community gallery in new tab"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span
                className="inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded border border-white/10 font-mono text-[10px] text-cyan-200/52"
                title="Set NEXT_PUBLIC_ONE_PIECE_GALLERY_URL (or NEXT_PUBLIC_ONE_PIECE_COLLECTION_URL)"
                aria-hidden
              >
                ···
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pb-4">
          <p className="line-clamp-3 text-[10px] leading-snug text-cyan-50/74">{entry.blurb}</p>
          <div className="flex flex-wrap gap-1">
            {entry.moods.map((tag) => (
              <Badge key={tag} className="border-white/22 bg-transparent px-1.5 py-0 font-mono normal-case tracking-normal text-[8px] text-cyan-100/76">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="break-all font-mono text-[8px] text-violet-200/72">Folder slug: {entry.slug}</p>
        </CardContent>
      </Card>
    </button>
  );
}

export function CrewDeckModal() {
  const open = useVeilStore((s) => s.crewDeckOpen);
  const closeCrewDeck = useVeilStore((s) => s.closeCrewDeck);
  const selectedId = useVeilStore((s) => s.selectedCrewEntryId);
  const setSelectedCrewEntryId = useVeilStore((s) => s.setSelectedCrewEntryId);

  const selected =
    ONE_PIECE_UNIQUE_CREW.find((item) => item.id === selectedId) ??
    ONE_PIECE_UNIQUE_CREW.find((c) => c.id === "luffy-grin") ??
    ONE_PIECE_UNIQUE_CREW[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCrewDeck();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeCrewDeck]);

  const installSnippet = `#Spritesheet placement\npublic/assets/pets/${selected.slug}/spritesheet.webp`;

  const galleryHintEnv = `NEXT_PUBLIC_ONE_PIECE_GALLERY_URL (or NEXT_PUBLIC_ONE_PIECE_COLLECTION_URL)`;

  const addressBarCue = ONE_PIECE_GALLERY_PAGE_URL
    ? ONE_PIECE_GALLERY_PAGE_URL.replace(/^https:\/\//, "").slice(0, 56)
    : `local • ${galleryHintEnv}`;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[130] bg-[#060810]/74 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeCrewDeck}
            aria-hidden
          />
          <motion.div
            key="surface"
            className="pointer-events-none fixed inset-0 z-[131] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
          >
            <div
              className="colony-panel pointer-events-auto relative flex max-h-[min(88vh,720px)] w-full max-w-[min(940px,calc(100vw-28px))] flex-col overflow-hidden rounded-2xl border border-cyan-400/32 shadow-[0_40px_100px_rgba(0,0,0,.64),inset_0_1px_hsla(200,94%,94%,0.08)]"
              role="dialog"
              aria-labelledby="crew-deck-title"
              aria-modal={true}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-90"
                style={{
                  boxShadow: "inset 0 0 96px hsla(200,94%,52%,0.06), inset 0 0 1px hsla(200,98%,94%,0.22)"
                }}
              />
              <div className="relative flex shrink-0 items-center gap-3 border-b border-cyan-200/22 bg-black/52 px-3 py-2.5 md:px-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/35 bg-black/52 text-cyan-200">
                  <PawPrint className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="crew-deck-title" className="text-sm font-semibold leading-tight text-cyan-50">
                    Crew deck
                  </h2>
                  <p className="truncate font-mono text-[10px] text-cyan-100/72">Unique sprite per colony tile · ten crew slots</p>
                  <div className="mt-2 flex cursor-default flex-wrap gap-1 rounded-md border border-white/14 bg-black/55 px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-200/78">
                    <Sparkles className="mr-1 inline h-3 w-3 text-amber-200/74" aria-hidden />
                    <span className="truncate">{addressBarCue}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 border border-white/16 bg-black/45 text-white/88 hover:bg-black/62"
                  onClick={closeCrewDeck}
                  aria-label="Close crew deck"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="relative flex flex-1 flex-col overflow-hidden md:flex-row md:divide-x md:divide-cyan-900/52">
                <div className="min-h-[min(260px,40vh)] flex-1 overflow-y-auto px-3 py-3 md:max-w-[520px]">
                  <div className="mx-auto mb-4 max-w-xl rounded-xl border border-cyan-900/52 bg-black/38 px-3 py-2 text-[11px] leading-snug text-cyan-50/74">
                    {SPRITE_IMPORT_DOCS_URL ? (
                      <>
                        See{" "}
                        <a href={SPRITE_IMPORT_DOCS_URL} className="underline decoration-cyan-400/52 underline-offset-2" target="_blank" rel="noreferrer">
                          sprite import docs
                        </a>{" "}
                        if you use them —
                      </>
                    ) : (
                      <>Add sprites via your own pipeline — </>
                    )}
                    folders live under <span className="font-mono text-cyan-200/92">public/assets/pets/</span>. Hotspot mappings are defined once in{" "}
                    <span className="font-mono text-cyan-200/92">lib/one-piece-collection.ts</span>.
                  </div>
                  <div className="mx-auto grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                    {ONE_PIECE_UNIQUE_CREW.map((entry) => (
                      <CrewTileCard
                        key={entry.id}
                        entry={entry}
                        active={entry.id === selected.id}
                        onSelect={() => setSelectedCrewEntryId(entry.id)}
                        galleryUrl={ONE_PIECE_GALLERY_PAGE_URL || undefined}
                      />
                    ))}
                  </div>
                  <div className="mx-auto mt-4 flex max-w-xl flex-wrap gap-2">
                    {ONE_PIECE_GALLERY_PAGE_URL ? (
                      <Button type="button" variant="outline" size="sm" className="border-cyan-400/42 text-xs" asChild>
                        <a href={ONE_PIECE_GALLERY_PAGE_URL} target="_blank" rel="noreferrer" className="inline-flex gap-2">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open gallery
                        </a>
                      </Button>
                    ) : (
                      <p className="text-[10px] text-cyan-200/58">
                        External gallery links stay off until <span className="font-mono">{galleryHintEnv}</span> points to an HTTPS listing in{" "}
                        <span className="font-mono">.env.local</span>.
                      </p>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-[0.92] border-t border-cyan-900/52 bg-gradient-to-br from-black/68 to-black/82 p-5 md:border-t-0 md:border-l-0">
                  <div className="space-y-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-violet-200/68 md:sticky md:top-3">selected crewmate</p>
                  </div>
                  <PortraitFrame slug={selected.slug} />
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/72">{colonyTileLabel(selected.colonyHotspot)} tile</p>
                    <h3 className="text-lg font-medium text-cyan-50">{selected.displayName}</h3>
                    <p className="text-[11px] text-violet-200/84">{selected.kind}</p>
                    <p className="mt-2 text-[12px] leading-relaxed text-cyan-50/82">{selected.blurb}</p>
                  </div>
                  <pre className="mt-4 whitespace-pre-wrap break-all rounded-lg border border-white/12 bg-black/55 p-3 font-mono text-[10px] leading-relaxed text-cyan-100/74">
                    {installSnippet}
                  </pre>
                  {ONE_PIECE_GALLERY_PAGE_URL ? (
                    <Button type="button" variant="outline" size="sm" className="mt-3 border-cyan-400/42 text-[11px]" asChild>
                      <a href={ONE_PIECE_GALLERY_PAGE_URL} target="_blank" rel="noreferrer">
                        Reference gallery online
                      </a>
                    </Button>
                  ) : (
                    <p className="mt-3 text-[10px] text-cyan-200/54">Set gallery env var to unlock online reference links.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
