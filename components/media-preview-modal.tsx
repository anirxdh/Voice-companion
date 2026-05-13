"use client";



import { AnimatePresence, motion } from "framer-motion";

import { ExternalLink, Mail, Play, Pause, X, Volume2 } from "lucide-react";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {

  WeatherEnvironmentDock,

  ClockEnvironmentDock,

  NewsEnvironmentDock,

  NotesEnvironmentDock,

  MapEnvironmentDock,

  BrowseEnvironmentDock,

  ScoutEnvironmentDock,

  OrbitEnvironmentDock

} from "@/components/environment-docks";

import { Button } from "@/components/ui/button";

import { PlaybackWallVisualizer } from "@/components/playback-wall-visualizer";

import type { MediaPreview } from "@/types/supernova";

import { useSuperNovaStore } from "@/store/use-supernova-store";

import { playMusicPreview, reuseOrPlayPreview, stopMusicPlayback } from "@/lib/music-player";

import { toEmbedUrl, youtubeEmbedIframeSrc } from "@/lib/media-preview";





function fullscreenDockPlacement(): CSSProperties {

  return {

    position: "fixed",

    top: "50%",

    left: "50%",

    transform: "translate(-50%, -50%)",

    width: "min(96vw, 1100px)",

    maxHeight: "82vh",

    zIndex: 80,

  };

}





function fullscreenCoverPlacement(): CSSProperties {

  return {

    position: "fixed",

    bottom: "clamp(88px, 11vh, 130px)",

    left: "clamp(16px, 2vw, 28px)",

    width: "min(200px, calc(100vw - 32px))",

    zIndex: 80,

  };

}





function leftPanelPlacement(): CSSProperties {

  return {

    position: "fixed",

    top: "8px",

    left: "8px",

    bottom: "8px",

    width: "min(34vw, 400px)",

    zIndex: 80,

  };

}





function rightPanelPlacement(): CSSProperties {

  return {

    position: "fixed",

    top: "8px",

    right: "8px",

    bottom: "8px",

    width: "min(34vw, 400px)",

    zIndex: 80,

  };

}





function fullscreenYoutubePlacement(): CSSProperties {

  return {

    position: "fixed",

    top: "50%",

    left: "50%",

    transform: "translate(-50%, -50%)",

    width: "min(96vw, 1000px)",

    maxHeight: "82vh",

    zIndex: 80,

  };

}





const colonyCompactCoverPlacement  = fullscreenCoverPlacement;

const ambientCompactCoverPlacement = fullscreenCoverPlacement;

const colonyBrowserYoutubePlacement  = fullscreenYoutubePlacement;

const ambientBrowserYoutubePlacement = fullscreenYoutubePlacement;



const colonyWeatherPlacement        = leftPanelPlacement;

const ambientWeatherPlacement       = leftPanelPlacement;

const colonyAgentMessagePlacement   = rightPanelPlacement;

const ambientAgentMessagePlacement  = rightPanelPlacement;

const colonyClockDeskPlacement      = leftPanelPlacement;

const ambientClockDeskPlacement     = leftPanelPlacement;

const colonyNewsDeskPlacement       = rightPanelPlacement;

const ambientNewsDeskPlacement      = rightPanelPlacement;

const colonyNotesPlacement          = leftPanelPlacement;

const ambientNotesPlacement         = leftPanelPlacement;

const colonyMapsPlacement           = leftPanelPlacement;

const ambientMapsPlacement          = leftPanelPlacement;

const colonyBrowseStripPlacement    = rightPanelPlacement;

const ambientBrowseStripPlacement   = rightPanelPlacement;

const colonyScoutPlacement          = rightPanelPlacement;

const ambientScoutPlacement         = rightPanelPlacement;

const colonyOrbitPlacement          = rightPanelPlacement;

const ambientOrbitPlacement         = rightPanelPlacement;



type WallDockInnerProps = {

  preview: MediaPreview;

  sceneIsColony: boolean;

  embedUrl: string;

  placement: CSSProperties;

  compactCover: boolean;

  hasVideoEmbed: boolean;

  closePreview: () => void;

};



function CompactCoverChip({

  preview,

  playing,

  pauseAudio,

  playAudio,

  closePreview,

  showMicWallVisualizer

}: {

  preview: MediaPreview;

  playing: boolean;

  pauseAudio: () => void;

  playAudio: () => void;

  closePreview: () => void;

  showMicWallVisualizer: boolean;

}) {

  return (

    <>

      <div

        className="pointer-events-none absolute inset-0 rounded-xl opacity-95"

        style={{

          boxShadow:

            "inset 0 0 40px hsla(180,90%,52%,0.08), inset 0 0 1px hsla(200,96%,92%,0.35), 0 0 24px hsla(200,94%,54%,0.14)"

        }}

      />

      <div className="relative flex flex-col gap-1.5">

        {showMicWallVisualizer ? (

          <div className="relative rounded-lg border border-cyan-400/55 bg-black/55 px-1 py-[5px] shadow-[0_0_24px_rgba(34,211,238,.12),inset_0_0_20px_rgba(56,189,248,.06)] backdrop-blur-[2px]">

            <PlaybackWallVisualizer playing={playing && Boolean(preview.previewUrl)} barCount={42} className="h-[26px]" />

            <div className="pointer-events-none absolute inset-x-1 bottom-px h-px bg-gradient-to-r from-transparent via-cyan-200/65 to-transparent" />

          </div>

        ) : null}



        <div className="mx-auto w-[min(118px,32vw)]">

          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-cyan-400/35 bg-black/55 shadow-[inset_0_0_20px_rgba(34,211,238,.08)]">

            {preview.coverUrl ? (

              <img src={preview.coverUrl} alt="" title={preview.title} className="h-full w-full object-cover opacity-93" />

            ) : (

              <div className="flex h-full items-center justify-center text-cyan-300/52">

                <Volume2 className="h-9 w-9" />

              </div>

            )}

            {preview.previewUrl || preview.deezerUrl || preview.audiusUrl ? (

              <button

                type="button"

                onClick={() => (playing ? pauseAudio() : void playAudio())}

                className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"

                aria-label={playing ? "Pause" : "Play"}

              >

                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-200/40 bg-black/55 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,.25)]">

                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 pl-0.5" />}

                </span>

              </button>

            ) : null}

            <Button

              variant="ghost"

              size="icon"

              className="absolute right-0.5 top-0.5 h-7 w-7 rounded-md border border-white/18 bg-black/55 text-white/88 hover:bg-black/70"

              onClick={closePreview}

              aria-label="Close preview"

            >

              <X className="h-3.5 w-3.5" />

            </Button>

          </div>

          <p className="mt-1.5 line-clamp-2 text-center font-mono text-[9px] uppercase leading-tight tracking-[0.12em] text-cyan-100/78">

            {preview.title}

          </p>

        </div>

      </div>

    </>

  );

}





function BrowserYoutubeDock({

  preview,

  sceneIsColony,

  iframeSrc,

  placement,

  closePreview

}: {

  preview: MediaPreview;

  sceneIsColony: boolean;

  iframeSrc: string;

  placement: CSSProperties;

  closePreview: () => void;

}) {

  useEffect(() => {

    const onKey = (e: KeyboardEvent) => {

      if (e.key === "Escape") closePreview();

    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);

  }, [closePreview]);



  const webWatchUrl = preview.videoUrl && /^https?:\/\//i.test(preview.videoUrl) ? preview.videoUrl : preview.embedUrl ?? "";



  return (

    <motion.div

      className="colony-wall-dock colony-panel pointer-events-auto relative z-[38] overflow-hidden rounded-xl p-2.5 shadow-[0_28px_60px_rgba(0,0,0,.45)]"

      style={placement}

      initial={{ opacity: 0, y: sceneIsColony ? 30 : 20, scale: 0.93 }}

      animate={{ opacity: 1, y: 0, scale: 1 }}

      exit={{ opacity: 0, y: sceneIsColony ? 22 : 12, scale: 0.95 }}

      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}

      role="dialog"

      aria-labelledby="youtube-preview-title"

      aria-modal={false}

    >

      <div

        className="pointer-events-none absolute inset-0 rounded-xl opacity-92"

        style={{

          boxShadow:

            "inset 0 0 72px hsla(200,94%,62%,0.07), inset 0 0 1px hsla(200,98%,94%,0.32), 0 0 36px hsla(210,94%,54%,0.14)"

        }}

      />

      <div className="relative flex items-start justify-between gap-2 border-b border-cyan-200/22 pb-2">

        <div className="min-w-0 pt-0.5">

          <div className="font-mono text-[8px] uppercase tracking-[0.34em] text-cyan-200/72">browser · youtube</div>

          <h2 id="youtube-preview-title" className="line-clamp-2 pt-1 text-[12px] font-medium leading-snug text-cyan-50">

            {preview.title}

          </h2>

        </div>

        <Button

          variant="ghost"

          size="icon"

          className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52"

          onClick={closePreview}

          aria-label="Close preview"

        >

          <X className="h-4 w-4" />

        </Button>

      </div>

      <div className="relative mt-2 overflow-hidden rounded-lg border border-cyan-400/40 bg-black/70 shadow-[inset_0_0_44px_rgba(34,211,238,.08)]">

        <iframe className="aspect-video w-full min-h-[min(46vw,200px)]" src={iframeSrc} title={preview.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />

      </div>

      <div className="relative mt-2 flex flex-wrap items-center gap-3">

        {webWatchUrl ? (

          <a

            href={webWatchUrl}

            target="_blank"

            rel="noreferrer"

            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-200/88 hover:text-cyan-50"

          >

            <ExternalLink className="h-3.5 w-3.5" />

            open youtube

          </a>

        ) : null}

        {preview.coverUrl ? (

          

          <img src={preview.coverUrl} alt="" className="h-10 w-[42px] rounded border border-white/14 object-cover" />

        ) : null}

      </div>

      {preview.summary ? <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-cyan-100/74">{preview.summary}</p> : null}

    </motion.div>

  );

}





function YoutubePlayerMcpDock({

  preview,

  sceneIsColony,

  iframeSrc,

  placement,

  closePreview

}: {

  preview: MediaPreview;

  sceneIsColony: boolean;

  iframeSrc: string;

  placement: CSSProperties;

  closePreview: () => void;

}) {

  useEffect(() => {

    const onKey = (e: KeyboardEvent) => {

      if (e.key === "Escape") closePreview();

    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);

  }, [closePreview]);



  const webWatchUrl = preview.videoUrl && /^https?:\/\//i.test(preview.videoUrl) ? preview.videoUrl : preview.embedUrl ?? "";



  return (

    <motion.div

      className="colony-wall-dock colony-panel pointer-events-auto relative z-[42] overflow-hidden rounded-xl border border-red-400/28 p-2.5 shadow-[0_28px_60px_rgba(0,0,0,.5)]"

      style={placement}

      initial={{ opacity: 0, y: sceneIsColony ? 30 : 20, scale: 0.93 }}

      animate={{ opacity: 1, y: 0, scale: 1 }}

      exit={{ opacity: 0, y: sceneIsColony ? 22 : 12, scale: 0.95 }}

      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}

      role="dialog"

      aria-labelledby="youtube-mcp-preview-title"

      aria-modal={false}

    >

      <div className="pointer-events-none absolute left-3 top-[11px] h-2 w-[3px] rounded-full bg-red-500/92" aria-hidden />

      <div

        className="pointer-events-none absolute inset-0 rounded-xl opacity-94"

        style={{

          boxShadow:

            "inset 0 0 76px hsla(0,94%,58%,0.05), inset 0 0 1px hsla(200,96%,92%,0.28), 0 0 32px hsla(210,94%,54%,0.12)"

        }}

      />

      <div className="relative flex items-start justify-between gap-2 border-b border-white/14 pb-2 pl-1">

        <div className="min-w-0 pt-0.5">

          <div className="font-mono text-[8px] uppercase tracking-[0.34em] text-red-100/74">youtube · MCP player</div>

          <h2 id="youtube-mcp-preview-title" className="line-clamp-2 pt-1 text-[12px] font-medium leading-snug text-cyan-50">

            {preview.title}

          </h2>

          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-cyan-200/48">video-yt · play · search · queue</p>

        </div>

        <Button

          variant="ghost"

          size="icon"

          className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52"

          onClick={closePreview}

          aria-label="Close preview"

        >

          <X className="h-4 w-4" />

        </Button>

      </div>

      <div className="relative mt-2 overflow-hidden rounded-lg border border-white/22 bg-black/75 shadow-[inset_0_0_36px_rgba(248,113,113,.06)]">

        <iframe className="aspect-video w-full min-h-[min(46vw,200px)]" src={iframeSrc} title={preview.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />

      </div>

      <div className="relative mt-2 flex flex-wrap items-center gap-3">

        {webWatchUrl ? (

          <a

            href={webWatchUrl}

            target="_blank"

            rel="noreferrer"

            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-red-100/82 hover:text-red-50"

          >

            <ExternalLink className="h-3.5 w-3.5" />

            open on youtube.com

          </a>

        ) : null}

        {preview.coverUrl ? (

          

          <img src={preview.coverUrl} alt="" className="h-10 w-[42px] rounded border border-white/14 object-cover" />

        ) : null}

      </div>

      {preview.summary ? <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-cyan-100/74">{preview.summary}</p> : null}

      <p className="mt-2 border-t border-white/10 pt-2 font-mono text-[8px] uppercase leading-snug tracking-[0.12em] text-cyan-200/45">

        Separate dock from music  point <span className="text-red-100/72">NEXT_PUBLIC_MCP_ENDPOINT_YOUTUBE_VIDEO</span> at your video-yt <span className="lowercase tracking-normal">&lt;host&gt;/mcp</span> URL.

      </p>

    </motion.div>

  );

}





function AgentMessageDock({

  preview,

  sceneIsColony,

  ambientQuiet,

  placement,

  closePreview

}: {

  preview: MediaPreview;

  sceneIsColony: boolean;

  

  ambientQuiet?: boolean;

  placement: CSSProperties;

  closePreview: () => void;

}) {

  useEffect(() => {

    const onKey = (e: KeyboardEvent) => {

      if (e.key === "Escape") closePreview();

    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);

  }, [closePreview]);



  const rawTool = preview.mcpToolName?.trim();

  const toolChip =

    rawTool && rawTool.includes("__") ? rawTool.slice(rawTool.indexOf("__") + 2).replace(/-/gu, " ") : rawTool;



  const bodyText = preview.summary?.trim();



  return (

    <motion.div

      className="colony-wall-dock colony-panel pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.45)]"

      style={placement}

      initial={{ opacity: 0, x: 20, scale: 0.97 }}

      animate={{ opacity: 1, x: 0, scale: 1 }}

      exit={{ opacity: 0, x: 12, scale: 0.98 }}

      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}

      role="dialog"

      aria-labelledby="agent-message-title"

      aria-modal={false}

    >

      <div

        className="pointer-events-none absolute inset-0 rounded-xl opacity-92"

        style={{

          boxShadow:

            "inset 0 0 72px hsla(250,94%,62%,0.06), inset 0 0 1px hsla(200,98%,94%,0.28), 0 0 32px hsla(210,94%,54%,0.14)"

        }}

      />

      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-violet-200/18 pb-2.5 px-2.5 pt-2">

        <div className="flex min-w-0 flex-1 items-start gap-2">

          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-300/35 bg-black/48 text-violet-200/90 shadow-[inset_0_0_12px_rgba(167,139,250,.08)]">

            <Mail className="h-4 w-4" aria-hidden />

          </div>

          <div className="min-w-0 pt-0.5">

            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-violet-200/72">

              {ambientQuiet ? "inbox · quiet" : "inbox · relay"}

            </div>

            <h2 id="agent-message-title" className="line-clamp-2 pt-1 text-[12px] font-medium leading-snug text-cyan-50">

              {preview.title}

            </h2>

            {toolChip ? (

              <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.14em] text-violet-200/55">{toolChip}</p>

            ) : null}

          </div>

        </div>

        <Button

          variant="ghost"

          size="icon"

          className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52"

          onClick={closePreview}

          aria-label="Close preview"

        >

          <X className="h-4 w-4" />

        </Button>

      </div>



      <div className="relative min-h-[120px] flex-1 overflow-y-auto px-2.5 py-3">

        {bodyText ? (

          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-cyan-50/92">{bodyText}</pre>

        ) : (

          <p className="text-[11px] leading-relaxed text-cyan-100/58">Structured result only  see title above.</p>

        )}

        {/\bnot registered\b/i.test(bodyText ?? "") ? (

          <p className="mt-3 rounded-md border border-amber-300/35 bg-black/52 px-2 py-1.5 text-[10px] leading-snug text-amber-100/88">

            Super Nova retries <span className="font-mono">register</span> with your configured relay handle. If `.env`

            mistakenly points that handle at an env-var name instead of the real relay id, fix it and rebuild.

            Ask again aloud if registration just succeeded but results were delayed.

          </p>

        ) : null}

      </div>



      <p className="shrink-0 border-t border-violet-200/14 px-2.5 py-2 text-[9px] leading-snug text-cyan-200/52">

        {ambientQuiet

          ? "Relay results appear here once Super Nova wakes  MCP path only."

          : "MCP relay inbox · not Gmail. Configure the messaging relay handle via .env  use the literal id your MCP expects, not placeholder text."}

      </p>

    </motion.div>

  );

}



function WallPreviewDockInner({ preview, sceneIsColony, embedUrl, placement, compactCover, hasVideoEmbed, closePreview }: WallDockInnerProps) {

  const [playing, setPlaying] = useState(false);
  const phase = useSuperNovaStore((s) => s.phase);
  const prevPhaseRef = useRef(phase);



  useEffect(() => () => stopMusicPlayback(), []);



  useEffect(() => {

    const onKey = (e: KeyboardEvent) => {

      if (e.key === "Escape") closePreview();

    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);

  }, [closePreview]);



  const playAudio = useCallback(async () => {

    const audioUrl = preview.previewUrl?.trim() || preview.deezerUrl?.trim() || preview.audiusUrl?.trim();
    if (!audioUrl) return;

    try {

      const audio = await playMusicPreview(audioUrl);

      setPlaying(true);

      audio.onended = () => setPlaying(false);

      audio.onerror = () => setPlaying(false);

    } catch {

      setPlaying(false);

    }

  }, [preview.previewUrl, preview.deezerUrl, preview.audiusUrl]);



  useEffect(() => {

    const url = preview.previewUrl?.trim() || preview.deezerUrl?.trim() || preview.audiusUrl?.trim();

    if (!url) return;

    let cancelled = false;

    void reuseOrPlayPreview(url)

      .then((audio) => {

        audio.onended = () => setPlaying(false);

        audio.onerror = () => setPlaying(false);

        if (cancelled) return;

        setPlaying(true);

      })

      .catch(() => {

        if (!cancelled) setPlaying(false);

      });

    return () => {

      cancelled = true;

    };

  }, [preview.previewUrl, preview.deezerUrl, preview.audiusUrl]);



  // Post-speech retry: when TTS finishes (speaking → idle) the ElevenLabs
  // AudioContext is warm, so audio.play() succeeds even if browser autoplay
  // is normally blocked. Only fires if not already playing.
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (prev !== "speaking" || phase !== "idle") return;
    if (playing) return;
    const url = preview.previewUrl?.trim() || preview.deezerUrl?.trim() || preview.audiusUrl?.trim();
    if (!url) return;
    void reuseOrPlayPreview(url)
      .then((audio) => {
        audio.onended = () => setPlaying(false);
        audio.onerror = () => setPlaying(false);
        setPlaying(true);
      })
      .catch(() => { /* still blocked — user can tap play */ });
  }, [phase, playing, preview.previewUrl, preview.deezerUrl, preview.audiusUrl]);



  const pauseAudio = () => {

    stopMusicPlayback();

    setPlaying(false);

  };



  if (compactCover) {

  return (

      <motion.div

        className="colony-wall-dock colony-panel pointer-events-auto relative z-[38] rounded-xl p-2"

        style={placement}

        initial={{ opacity: 0, x: sceneIsColony ? -16 : -8, scale: 0.94 }}

        animate={{ opacity: 1, x: 0, scale: 1 }}

        exit={{ opacity: 0, x: sceneIsColony ? -12 : -6, scale: 0.96 }}

        transition={{ duration: 0.24, ease: [0.22, 0.94, 0.36, 1] }}

        role="dialog"

        aria-label={preview.title}

        aria-modal={false}

      >

        <CompactCoverChip

          preview={preview}

          playing={playing}

          pauseAudio={pauseAudio}

          playAudio={playAudio}

          closePreview={closePreview}

          showMicWallVisualizer={compactCover}

        />

      </motion.div>

    );

  }



  return (

        <motion.div

      className="colony-wall-dock colony-panel pointer-events-auto relative z-[38] max-h-[min(72vh,520px)] overflow-y-auto rounded-xl"

      style={placement}

      initial={{ opacity: 0, y: sceneIsColony ? 16 : 8, scale: 0.95 }}

      animate={{ opacity: 1, y: 0, scale: 1 }}

      exit={{ opacity: 0, y: 12, scale: 0.97 }}

      transition={{ duration: 0.24, ease: [0.22, 0.94, 0.36, 1] }}

      role="dialog"

      aria-labelledby="preview-title-v"

      aria-modal={false}

        >

          <div

        className="pointer-events-none absolute inset-0 rounded-xl opacity-90"

            style={{

          boxShadow:

            "inset 0 0 60px hsla(180,90%,62%,0.06), inset 0 0 1px hsla(200,96%,92%,0.28), 0 0 32px hsla(200,94%,54%,0.12)"

        }}

      />

      <div className="relative flex items-start justify-between gap-2 border-b border-cyan-200/12 px-3 py-2">

        <div className="min-w-0">

          <h2 id="preview-title-v" className="truncate text-sm font-medium text-cyan-50">

            {preview.title}

          </h2>

          <p className="truncate text-[10px] text-cyan-100/65">{[preview.artist, preview.album].filter(Boolean).join("  ") || preview.kind}</p>

              </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-white/14" onClick={closePreview} aria-label="Close preview">

              <X className="h-4 w-4" />

            </Button>

          </div>



      <div className="relative space-y-2 p-3">

        {hasVideoEmbed && embedUrl ? (

          <div className="overflow-hidden rounded-lg border border-white/12 bg-black/75">

                  <iframe

              className="aspect-video w-full max-h-[min(42vh,240px)]"

                    src={youtubeEmbedIframeLike(embedUrl) ? youtubeEmbedIframeSrc(embedUrl) : embedUrl}

                    title={preview.title}

                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"

                    allowFullScreen

                  />

                </div>

        ) : null}



        <div className="flex gap-2">

          <div className="h-14 w-14 shrink-0 overflow-hidden rounded border border-white/12 bg-black/45">

            {preview.coverUrl ? (

              <img src={preview.coverUrl} alt="" className="h-full w-full object-cover" />

            ) : (

              <div className="flex h-full w-full items-center justify-center">

                <Volume2 className="h-6 w-6 text-cyan-300/35" />

                </div>

              )}

                  </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">

            {(preview.previewUrl || preview.deezerUrl || preview.audiusUrl) && (

              <Button variant="veil" size="sm" className="h-8 w-fit text-xs" onClick={playing ? pauseAudio : () => void playAudio()}>

                {playing ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}

                {playing ? "Pause" : "Play"}

                  </Button>

            )}

                </div>

              </div>



        {preview.summary ? <p className="rounded-md border border-white/10 bg-black/35 p-2 text-[11px] leading-snug text-cyan-50/88">{preview.summary}</p> : null}

          </div>

        </motion.div>

  );

}



function youtubeEmbedIframeLike(embedSrc: string): boolean {

  return /youtube(?:-nocookie)?\.com\/embed\//i.test(embedSrc);

}



function buildDockLayout(

  preview: MediaPreview,

  sceneIsColony: boolean

): {

  dockKey: string;

  youtubeWallMode: boolean;

  youtubeMcpDockMode: boolean;

  messageDockMode: boolean;

  compactCover: boolean;

  placement?: CSSProperties;

  baseEmbed?: string;

  embedForIframe: string;

  hasVideoEmbed: boolean;

} {

  const baseEmbed = toEmbedUrl(preview.embedUrl || preview.videoUrl);

  const embedForIframe = baseEmbed ? youtubeEmbedIframeSrc(baseEmbed) : "";

  const hasYoutubeIframe = Boolean(baseEmbed && youtubeEmbedIframeLike(embedForIframe));

  const youtubeMcpDockMode = Boolean(preview.kind === "youtube" && hasYoutubeIframe);

  const youtubeWallMode = Boolean(preview.kind === "video" && hasYoutubeIframe);

  const messageDockMode = preview.kind === "message";

  const youtubeBrowserDock = youtubeWallMode || youtubeMcpDockMode;

  let placement: CSSProperties | undefined;

  if (youtubeBrowserDock) placement = sceneIsColony ? colonyBrowserYoutubePlacement() : ambientBrowserYoutubePlacement();

  else if (messageDockMode) placement = sceneIsColony ? colonyAgentMessagePlacement() : ambientAgentMessagePlacement();

  else placement = sceneIsColony ? colonyCompactCoverPlacement() : ambientCompactCoverPlacement();

  const compactCover = Boolean(

    !youtubeBrowserDock &&

      !messageDockMode &&

      !hasYoutubeIframe &&

      (preview.kind === "music" ||

        preview.kind === "voice" ||

        (preview.kind !== "youtube" && !baseEmbed))

  );

  const dockKey = [

    preview.kind,

    preview.title,

    preview.previewUrl ?? preview.deezerUrl ?? preview.audiusUrl ?? "",

    preview.videoUrl ?? "",

    preview.coverUrl ?? "",

    preview.summary?.slice(0, 120) ?? ""

  ].join("|");



  const hasVideoEmbed = Boolean(baseEmbed) && !youtubeBrowserDock;



  return {

    dockKey,

    youtubeWallMode,

    youtubeMcpDockMode,

    messageDockMode,

    compactCover,

    placement,

    baseEmbed,

    embedForIframe,

    hasVideoEmbed

  };

}



export function MediaPreviewModal({

  sceneIsColony = false,

  ambientQuiet = false

}: {

  sceneIsColony?: boolean;

  

  ambientQuiet?: boolean;

}) {

  const ambientPreview = useSuperNovaStore((state) => state.ambientPreview);

  const relayPreview = useSuperNovaStore((state) => state.relayPreview);

  const closeAmbientPreview = useSuperNovaStore((state) => state.closeAmbientPreview);

  const closeRelayPreview = useSuperNovaStore((state) => state.closeRelayPreview);



  const ambientLayout = useMemo(

    () =>

      ambientPreview &&

      ambientPreview.kind !== "message" &&

      ambientPreview.kind !== "weather" &&

      ambientPreview.kind !== "clockdesk" &&

      ambientPreview.kind !== "newsdesk" &&

      ambientPreview.kind !== "notesdesk" &&

      ambientPreview.kind !== "mapdesk" &&

      ambientPreview.kind !== "browsedesk" &&

      ambientPreview.kind !== "scoutdesk" &&

      ambientPreview.kind !== "orbitdesk"

        ? buildDockLayout(ambientPreview, sceneIsColony)

        : null,

    [ambientPreview, sceneIsColony]

  );

  const relayLayout = useMemo(

    () => (relayPreview && relayPreview.kind === "message" ? buildDockLayout(relayPreview, sceneIsColony) : null),

    [relayPreview, sceneIsColony]

  );



  useEffect(() => {

    if (!ambientPreview) stopMusicPlayback();

    else if (ambientPreview.kind === "video" || ambientPreview.kind === "youtube") stopMusicPlayback();

  }, [ambientPreview]);



  const weatherPlacement = sceneIsColony ? colonyWeatherPlacement() : ambientWeatherPlacement();

  const clockPlacement = sceneIsColony ? colonyClockDeskPlacement() : ambientClockDeskPlacement();

  const newsPlacement = sceneIsColony ? colonyNewsDeskPlacement() : ambientNewsDeskPlacement();

  const notesPlacement = sceneIsColony ? colonyNotesPlacement() : ambientNotesPlacement();

  const mapsPlacement = sceneIsColony ? colonyMapsPlacement() : ambientMapsPlacement();

  const browsePlacement = sceneIsColony ? colonyBrowseStripPlacement() : ambientBrowseStripPlacement();

  const scoutPlacement = sceneIsColony ? colonyScoutPlacement() : ambientScoutPlacement();

  const orbitPlacement = sceneIsColony ? colonyOrbitPlacement() : ambientOrbitPlacement();



  return (

    <AnimatePresence mode="sync">

      {ambientPreview && ambientPreview.kind === "weather" ? (

        <WeatherEnvironmentDock

          key={`ambient-weather-${ambientPreview.title}`}

          preview={ambientPreview}

          sceneIsColony={sceneIsColony}

          placement={weatherPlacement}

          closePreview={closeAmbientPreview}

          ambientQuiet={ambientQuiet}

        />

      ) : ambientPreview && ambientPreview.kind === "clockdesk" ? (

        <ClockEnvironmentDock

          key={`ambient-clock-${ambientPreview.title}`}

          preview={ambientPreview}

          sceneIsColony={sceneIsColony}

          placement={clockPlacement}

          closePreview={closeAmbientPreview}

          ambientQuiet={ambientQuiet}

        />

      ) : ambientPreview && ambientPreview.kind === "newsdesk" ? (

        <NewsEnvironmentDock

          key={`ambient-news-${ambientPreview.title}`}

          preview={ambientPreview}

          sceneIsColony={sceneIsColony}

          placement={newsPlacement}

          closePreview={closeAmbientPreview}

          ambientQuiet={ambientQuiet}

        />

      ) : ambientPreview && ambientPreview.kind === "notesdesk" ? (

        <NotesEnvironmentDock

          key={`ambient-notes-${ambientPreview.title}`}

          preview={ambientPreview}

          sceneIsColony={sceneIsColony}

          placement={notesPlacement}

          closePreview={closeAmbientPreview}

          ambientQuiet={ambientQuiet}

        />

      ) : ambientPreview && ambientPreview.kind === "mapdesk" ? (

        <MapEnvironmentDock

          key={`ambient-map-${ambientPreview.title}`}

          preview={ambientPreview}

          sceneIsColony={sceneIsColony}

          placement={mapsPlacement}

          closePreview={closeAmbientPreview}

          ambientQuiet={ambientQuiet}

        />

      ) : ambientPreview && ambientPreview.kind === "browsedesk" ? (

        <BrowseEnvironmentDock

          key={`ambient-browse-${ambientPreview.browseBrief?.url ?? ambientPreview.title}`}

          preview={ambientPreview}

          sceneIsColony={sceneIsColony}

          placement={browsePlacement}

          closePreview={closeAmbientPreview}

          ambientQuiet={ambientQuiet}

        />

      ) : ambientPreview && ambientPreview.kind === "scoutdesk" ? (

        <ScoutEnvironmentDock

          key={`ambient-scout-${ambientPreview.title}`}

          preview={ambientPreview}

          sceneIsColony={sceneIsColony}

          placement={scoutPlacement}

          closePreview={closeAmbientPreview}

          ambientQuiet={ambientQuiet}

        />

      ) : ambientPreview && ambientPreview.kind === "orbitdesk" ? (

        <OrbitEnvironmentDock

          key={`ambient-orbit-${ambientPreview.title}`}

          preview={ambientPreview}

          sceneIsColony={sceneIsColony}

          placement={orbitPlacement}

          closePreview={closeAmbientPreview}

          ambientQuiet={ambientQuiet}

        />

      ) : ambientPreview && ambientLayout?.placement ? (

        ambientLayout.youtubeMcpDockMode ? (

          <YoutubePlayerMcpDock

            key={`ambient-${ambientLayout.dockKey}`}

            preview={ambientPreview}

            sceneIsColony={sceneIsColony}

            iframeSrc={ambientLayout.embedForIframe}

            placement={ambientLayout.placement}

            closePreview={closeAmbientPreview}

          />

        ) : ambientLayout.youtubeWallMode ? (

          <BrowserYoutubeDock

            key={`ambient-${ambientLayout.dockKey}`}

            preview={ambientPreview}

            sceneIsColony={sceneIsColony}

            iframeSrc={ambientLayout.embedForIframe}

            placement={ambientLayout.placement}

            closePreview={closeAmbientPreview}

          />

        ) : (

          <WallPreviewDockInner

            key={`ambient-${ambientLayout.dockKey}`}

            preview={ambientPreview}

            sceneIsColony={sceneIsColony}

            embedUrl={ambientLayout.baseEmbed ?? ""}

            placement={ambientLayout.placement}

            compactCover={ambientLayout.compactCover}

            hasVideoEmbed={ambientLayout.hasVideoEmbed}

            closePreview={closeAmbientPreview}

          />

        )

      ) : null}

      {relayPreview && relayLayout?.placement ? (

        <AgentMessageDock

          key={`relay-${relayLayout.dockKey}`}

          preview={relayPreview}

          sceneIsColony={sceneIsColony}

          ambientQuiet={ambientQuiet}

          placement={relayLayout.placement}

          closePreview={closeRelayPreview}

        />

      ) : null}

    </AnimatePresence>

  );

}

