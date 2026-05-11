"use client";

import { motion } from "framer-motion";
import { AlarmClock, BookOpen, CloudSun, Compass, ExternalLink, Gauge, Globe, MapPin, Newspaper, StickyNote, Telescope, Trash2, X } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import type { AlarmEntry, MediaPreview, WeatherPreviewPayload } from "@/types/veil";
import { Button } from "@/components/ui/button";
import { useVeilStore } from "@/store/use-veil-store";

export function WeatherEnvironmentDock({
  preview,
  sceneIsColony,
  placement,
  closePreview,
  ambientQuiet = false
}: {
  preview: MediaPreview;
  sceneIsColony: boolean;
  placement: CSSProperties;
  closePreview: () => void;
  ambientQuiet?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const w = preview.weather;

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative z-[38] flex max-h-[min(58vh,480px)] w-full max-w-[min(300px,calc(100vw-36px))] flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.45)]"
      style={placement}
      initial={{ opacity: 0, y: sceneIsColony ? 18 : 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: sceneIsColony ? 12 : 8, scale: 0.97 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="weather-dock-title"
      aria-modal={false}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-90"
        style={{
          boxShadow:
            "inset 0 0 72px hsla(200,94%,62%,0.06), inset 0 0 1px hsla(200,98%,94%,0.28), 0 0 32px hsla(210,94%,54%,0.14)"
        }}
      />
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-cyan-200/18 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/38 bg-black/46 text-cyan-200">
            <CloudSun className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-cyan-200/74">
              {ambientQuiet ? "browser · outlook (quiet)" : "browser · outlook"}
            </div>
            <h2 id="weather-dock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">
              {preview.title}
            </h2>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52"
          onClick={closePreview}
          aria-label="Close weather panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative flex-1 space-y-3 overflow-y-auto px-3 py-3 font-mono text-[11px] text-cyan-50/94">
        {w ? (
          <>
            <p className="text-[42px] font-semibold tabular-nums leading-none tracking-tight text-cyan-50">
              {w.tempC != null ? `${Math.round(w.tempC)}°` : "—"}
              <span className="align-top text-[13px] font-medium text-cyan-200/70"> C</span>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/68">{w.label}</p>
            <div className="grid gap-2 rounded-lg border border-cyan-400/26 bg-black/48 px-2.5 py-2">
              <div className="flex justify-between gap-2 text-[10px] text-cyan-100/76">
                <span>Feels</span>
                <span>{w.feelsC != null ? `${Math.round(w.feelsC)}°C` : "—"}</span>
              </div>
              <div className="flex justify-between gap-2 text-[10px] text-cyan-100/76">
                <span>Hi / Lo</span>
                <span>
                  {w.highC != null ? Math.round(w.highC) : "—"}° / {w.lowC != null ? Math.round(w.lowC) : "—"}°
                </span>
              </div>
              {(w.precipChance ?? 0) >= 12 ? (
                <div className="flex justify-between gap-2 text-[10px] text-cyan-100/76">
                  <span>Rain</span>
                  <span>{Math.round(w.precipChance ?? 0)}%</span>
                </div>
              ) : null}
              {typeof w.wind === "number" ? (
                <div className="flex justify-between gap-2 text-[10px] text-cyan-100/76">
                  <span>Wind</span>
                  <span>{Math.round(w.wind)} km/h</span>
                </div>
              ) : null}
              {typeof w.humidity === "number" ? (
                <div className="flex justify-between gap-2 text-[10px] text-cyan-100/76">
                  <span>Humidity</span>
                  <span>{Math.round(w.humidity)}%</span>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-cyan-100/72">Forecast payload unavailable.</p>
        )}
        {preview.summary ? (
          <pre className="whitespace-pre-wrap break-words text-[10px] leading-snug text-cyan-100/84">{preview.summary}</pre>
        ) : null}
      </div>
      <p className="shrink-0 border-t border-cyan-200/14 px-2.5 py-2 text-[9px] leading-snug text-cyan-200/52">
        Open-Meteo forecast · City queries also pin miniature cards on the browser tile.
      </p>
    </motion.div>
  );
}

export function ClockEnvironmentDock({
  preview,
  sceneIsColony,
  placement,
  closePreview,
  ambientQuiet = false
}: {
  preview: MediaPreview;
  sceneIsColony: boolean;
  placement: CSSProperties;
  closePreview: () => void;
  ambientQuiet?: boolean;
}) {
  const alarmEntries = useVeilStore((s) => s.alarmEntries);
  const activeTimers = useVeilStore((s) => s.activeTimers);
  const removeAlarm = useVeilStore((s) => s.removeAlarmEntry);
  const removeTimer = useVeilStore((s) => s.removeActiveTimer);
  const startPresetTimer = useVeilStore((s) => s.startActiveTimer);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const nowClock = new Date().toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative z-[38] flex max-h-[min(62vh,520px)] w-full max-w-[min(320px,calc(100vw-36px))] flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.45)]"
      style={placement}
      initial={{ opacity: 0, x: sceneIsColony ? -12 : -8, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: sceneIsColony ? -8 : -5, scale: 0.97 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="clockdesk-title"
      aria-modal={false}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-90"
        style={{
          boxShadow:
            "inset 0 0 60px hsla(180,82%,62%,0.05), inset 0 0 1px hsla(200,96%,92%,0.28), 0 0 32px hsla(260,94%,62%,0.12)"
        }}
      />
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-violet-200/22 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-300/36 bg-black/46 text-violet-200">
            <Gauge className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-violet-200/74">
              {ambientQuiet ? "clock · timers (quiet)" : "clock · timers · alarms"}
            </div>
            <h2 id="clockdesk-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">
              {preview.title}
            </h2>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52"
          onClick={closePreview}
          aria-label="Close clock workspace"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <div className="rounded-xl border border-cyan-400/30 bg-black/48 px-3 py-3 text-center shadow-[inset_0_0_30px_rgba(34,211,238,.05)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/66">live clock</p>
          <p className="mt-2 font-mono text-[28px] font-semibold tabular-nums tracking-tight text-cyan-50">{nowClock}</p>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-200/66">Timers</p>
          <div className="flex flex-wrap gap-1.5">
            {[180, 300, 600, 900].map((sec) => (
              <Button
                key={sec}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 border-white/22 bg-black/38 px-2 text-[10px] text-cyan-100 hover:bg-black/54"
                onClick={() =>
                  startPresetTimer({
                    durationSec: sec,
                    label: sec >= 3600 ? `${sec / 3600}h` : `${sec / 60}m`
                  })
                }
              >
                +{sec < 3600 ? `${sec / 60}m` : `${sec / 3600}h`}
              </Button>
            ))}
          </div>
          <ul className="space-y-2">
            {activeTimers.map((t) => {
              const remaining = Math.max(0, Math.ceil((t.endsAtMs - Date.now()) / 1000));
              const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
              const ss = String(remaining % 60).padStart(2, "0");
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-cyan-400/22 bg-black/44 px-2 py-1.5 text-[11px] text-cyan-50"
                >
                  <span className="font-mono tabular-nums text-cyan-100">
                    {t.label ?? "timer"} · {mm}:{ss}
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeTimer(t.id)} aria-label="Cancel timer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
            {activeTimers.length === 0 ? <li className="text-[10px] text-cyan-100/55">Say “ten minute timer” or tap a preset.</li> : null}
          </ul>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <AlarmClock className="h-3.5 w-3.5 text-violet-200/80" />
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-violet-200/66">alarms set</p>
          </div>
          <ul className="space-y-1.5">
            {alarmEntries.map((a) => (
              <AlarmRow key={a.id} alarm={a} onRemove={() => removeAlarm(a.id)} />
            ))}
            {alarmEntries.length === 0 ? <li className="text-[10px] text-cyan-100/55">Say “Set alarm seven AM”.</li> : null}
          </ul>
        </div>

        {preview.summary ? <p className="text-[10px] leading-snug text-cyan-100/72">{preview.summary}</p> : null}
      </div>
      <p className="shrink-0 border-t border-violet-200/14 px-2.5 py-2 text-[9px] leading-snug text-cyan-200/52">
        Wall clock mirrors your locale. Alarms repeat daily until removed · timers chime once at zero · sounds need this tab awake (pinned best).
      </p>
    </motion.div>
  );
}

export function NewsEnvironmentDock({
  preview,
  sceneIsColony,
  placement,
  closePreview,
  ambientQuiet = false
}: {
  preview: MediaPreview;
  sceneIsColony: boolean;
  placement: CSSProperties;
  closePreview: () => void;
  ambientQuiet?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const items = preview.news ?? [];

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative z-[41] flex max-h-[min(44vh,440px)] w-full max-w-[min(432px,calc(100vw-28px))] flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.48)]"
      style={placement}
      initial={{ opacity: 0, y: sceneIsColony ? 26 : 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: sceneIsColony ? 16 : 12, scale: 0.97 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="newsdesk-dock-title"
      aria-modal={false}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-90"
        style={{
          boxShadow:
            "inset 0 0 60px hsla(38,90%,62%,0.05), inset 0 0 1px hsla(48,96%,92%,0.26), 0 0 32px hsla(32,94%,54%,0.12)"
        }}
      />
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-amber-200/22 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-300/38 bg-black/46 text-amber-200">
            <Newspaper className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-amber-200/72">
              {ambientQuiet ? "news desk · HN (quiet)" : "news desk · headlines"}
            </div>
            <h2 id="newsdesk-dock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">
              {preview.title}
            </h2>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52"
          onClick={closePreview}
          aria-label="Close headlines panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative flex-1 space-y-2 overflow-y-auto px-3 py-3 font-mono text-[11px] text-cyan-50/94">
        {items.length === 0 ? (
          <p className="text-[11px] text-cyan-100/72">{preview.summary?.trim() || "No headline rows returned yet."}</p>
        ) : (
          <ol className="list-decimal space-y-2.5 pl-4 marker:text-amber-200/72">
            {items.map((row, idx) => (
              <li key={`${idx}-${row.title.slice(0, 24)}`} className="leading-snug">
                <span className="text-cyan-50/94">{row.title}</span>
                <span className="ml-2 text-[9px] uppercase tracking-wide text-cyan-200/50">
                  {row.source ?? ""}
                  {row.score != null ? ` · ${row.score}` : ""}
                </span>
                {row.url ? (
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="ml-2 inline-flex items-center gap-1 text-[9px] text-amber-200/82 underline underline-offset-2 hover:text-amber-100"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden />
                    open
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        {!items.length && preview.summary ? (
          <pre className="whitespace-pre-wrap break-words rounded-md border border-white/12 bg-black/35 p-2 text-[10px] leading-snug text-cyan-100/80">
            {preview.summary}
          </pre>
        ) : null}
      </div>
      <p className="shrink-0 border-t border-amber-200/14 px-2.5 py-2 text-[9px] leading-snug text-cyan-200/52">
        Hacker News public API · VEIL reads the lead three aloud in casual VO; say you want “more headlines” anytime.
      </p>
    </motion.div>
  );
}

export function NotesEnvironmentDock({
  preview,
  sceneIsColony,
  placement,
  closePreview,
  ambientQuiet = false
}: {
  preview: MediaPreview;
  sceneIsColony: boolean;
  placement: CSSProperties;
  closePreview: () => void;
  ambientQuiet?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const notes = preview.stickyNotes ?? [];

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative z-[43] flex max-h-[min(48vh,480px)] w-full max-w-[min(320px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.48)]"
      style={placement}
      initial={{ opacity: 0, y: sceneIsColony ? 22 : 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: sceneIsColony ? 12 : 8, scale: 0.97 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="notes-dock-title"
      aria-modal={false}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-92" />
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-emerald-200/24 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-300/36 bg-black/46 text-emerald-200">
            <StickyNote className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-emerald-200/74">
              {ambientQuiet ? "notes · colony pad (quiet)" : "notes · colony pad"}
            </div>
            <h2 id="notes-dock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">
              {preview.title}
            </h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52" onClick={closePreview} aria-label="Close notes">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative flex-1 space-y-3 overflow-y-auto px-3 py-3 font-mono text-[11px] text-cyan-50/92">
        {notes.length === 0 ? (
          <p className="text-[11px] text-cyan-100/72">{preview.summary?.trim() ?? "Scratch notes land here whenever you jot them via voice."}</p>
        ) : (
          <ul className="space-y-2.5">
            {notes.map((row) => (
              <li key={row.id} className="rounded-lg border border-emerald-300/26 bg-black/44 px-2.5 py-2 shadow-[inset_0_0_18px_rgba(16,185,129,.04)]">
                <p className="text-[12px] leading-snug text-cyan-50/96">{row.text}</p>
                {row.createdAt ? (
                  <p className="mt-2 text-[9px] uppercase tracking-wide text-emerald-200/50">{new Date(row.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="shrink-0 border-t border-emerald-200/16 px-2.5 py-2 text-[9px] leading-snug text-cyan-200/52">
        Stored locally in <span className="text-emerald-200/74">`.veil-notes.json`</span> via the MCP tool <span className="font-mono text-cyan-100/78">sticky_note</span>.
      </p>
    </motion.div>
  );
}

export function MapEnvironmentDock({
  preview,
  sceneIsColony,
  placement,
  closePreview,
  ambientQuiet = false
}: {
  preview: MediaPreview;
  sceneIsColony: boolean;
  placement: CSSProperties;
  closePreview: () => void;
  ambientQuiet?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const src = preview.mapEmbedUrl ?? "";

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative z-[44] flex max-h-[min(54vh,520px)] w-full max-w-[min(392px,calc(100vw-28px))] flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.5)]"
      style={placement}
      initial={{ opacity: 0, y: sceneIsColony ? 16 : 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: sceneIsColony ? 10 : 8, scale: 0.97 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="mapdock-title"
      aria-modal={false}
    >
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-teal-200/24 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-300/38 bg-black/46 text-teal-200">
            <MapPin className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-teal-200/72">{ambientQuiet ? "atlas · OSM (quiet)" : "atlas · openstreetmap"}</div>
            <h2 id="mapdock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">
              {preview.title}
            </h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52" onClick={closePreview} aria-label="Close map">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {preview.summary ? <p className="px-3 pt-3 text-[10px] leading-snug text-cyan-100/78">{preview.summary}</p> : null}
      {src ? (
        <div className="relative mx-3 mt-3 flex-1 min-h-[200px] overflow-hidden rounded-xl border border-teal-400/35 bg-black/55">
          <iframe title="Atlas map preview" loading="lazy" className="h-[min(40vh,360px)] w-full" referrerPolicy="no-referrer-when-downgrade" src={src} />
          <Compass className="pointer-events-none absolute right-2 top-2 h-5 w-5 text-teal-200/45" aria-hidden />
        </div>
      ) : (
        <p className="px-3 py-4 text-[11px] text-cyan-100/76">Atlas frame unavailable—nothing to embed.</p>
      )}
      <p className="shrink-0 border-t border-teal-200/16 px-2.5 py-2 text-[9px] leading-snug text-cyan-200/52">
        Geocoder © OpenStreetMap contributors · tool <span className="font-mono text-teal-200/74">maps_place</span>.
      </p>
    </motion.div>
  );
}

export function BrowseEnvironmentDock({
  preview,
  sceneIsColony,
  placement,
  closePreview,
  ambientQuiet = false
}: {
  preview: MediaPreview;
  sceneIsColony: boolean;
  placement: CSSProperties;
  closePreview: () => void;
  ambientQuiet?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const b = preview.browseBrief;
  const body = (b?.markdown ?? preview.summary ?? "").trim();
  const source = b?.source === "firecrawl" ? "firecrawl" : "plain";
  const openUrl = b?.url?.trim();

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative z-[42] flex max-h-[min(52vh,520px)] w-full max-w-[min(318px,calc(100vw-28px))] flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.48)]"
      style={placement}
      initial={{ opacity: 0, y: sceneIsColony ? 20 : 14, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: sceneIsColony ? 12 : 8, scale: 0.97 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="browse-dock-title"
      aria-modal={false}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-92"
        style={{
          boxShadow:
            "inset 0 0 64px hsla(190,94%,54%,0.05), inset 0 0 1px hsla(200,98%,94%,0.28), 0 0 30px hsla(195,94%,54%,0.12)"
        }}
      />
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-cyan-200/22 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/42 bg-black/46 text-cyan-200">
            <Globe className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-cyan-200/72">
              {ambientQuiet ? "browser · scrape (quiet)" : "browser · page strip"}
            </div>
            <h2 id="browse-dock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">
              {preview.title}
            </h2>
            <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-200/48">{source}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52" onClick={closePreview} aria-label="Close browse panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-y-auto px-3 py-3">
        {body ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-cyan-50/92">{body}</pre>
        ) : (
          <p className="text-[11px] text-cyan-100/72">No body text returned.</p>
        )}
        {openUrl ? (
          <a href={openUrl} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-2 text-[11px] text-cyan-200 underline underline-offset-2 hover:text-cyan-50">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open original URL
          </a>
        ) : null}
      </div>
      <p className="shrink-0 border-t border-cyan-200/16 px-2.5 py-2 text-[9px] leading-snug text-cyan-200/52">
        Add <span className="font-mono text-cyan-100/70">FIRECRAWL_API_KEY</span> server-side for Firecrawl v2 scrape; otherwise VEIL pulls HTML and strips tags. Built-in{' '}
        <span className="font-mono text-cyan-100/78">browse_page</span>.
      </p>
    </motion.div>
  );
}

export function ScoutEnvironmentDock({
  preview,
  sceneIsColony,
  placement,
  closePreview,
  ambientQuiet = false
}: {
  preview: MediaPreview;
  sceneIsColony: boolean;
  placement: CSSProperties;
  closePreview: () => void;
  ambientQuiet?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const s = preview.scoutBrief;

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative z-[43] flex max-h-[min(54vh,520px)] w-full max-w-[min(392px,calc(100vw-28px))] flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.48)]"
      style={placement}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="scoutdock-title"
      aria-modal={false}
    >
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-sky-200/24 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-300/38 bg-black/46 text-sky-200">
            <BookOpen className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-sky-200/72">{ambientQuiet ? "scout · wiki (quiet)" : "scout · wikipedia dossier"}</div>
            <h2 id="scoutdock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">
              {preview.title}
            </h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52" onClick={closePreview} aria-label="Close scout">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <div className="flex gap-3">
          {s?.thumbUrl ? (
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-sky-300/38 bg-black/55">
              <img src={s.thumbUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-semibold leading-snug text-cyan-50">{s?.title ?? "No scout rows"}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-sky-200/62">{s?.query ? `Asked · ${s.query}` : preview.summary}</p>
          </div>
        </div>
        <p className="text-[12px] leading-relaxed text-cyan-50/93">{s?.extract?.trim() || preview.summary}</p>
        {s?.pageUrl ? (
          <a href={s.pageUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-[11px] text-sky-200 underline underline-offset-2 hover:text-sky-50">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open encyclopedia shard
          </a>
        ) : null}
      </div>
      <p className="shrink-0 border-t border-sky-200/16 px-2.5 py-2 text-[9px] leading-snug text-cyan-200/52">
        English Wikipedia summaries are CC BY-SA when expanded on site · tool <span className="font-mono text-sky-100/74">wiki_scout</span>.
      </p>
    </motion.div>
  );
}

export function OrbitEnvironmentDock({
  preview,
  sceneIsColony,
  placement,
  closePreview,
  ambientQuiet = false
}: {
  preview: MediaPreview;
  sceneIsColony: boolean;
  placement: CSSProperties;
  closePreview: () => void;
  ambientQuiet?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const o = preview.orbitBrief;

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative z-[45] flex max-h-[min(58vh,560px)] w-full max-w-[min(396px,calc(100vw-26px))] flex-col overflow-hidden rounded-xl shadow-[0_34px_70px_rgba(0,0,0,.55)]"
      style={placement}
      initial={{ opacity: 0, y: sceneIsColony ? 18 : 12, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: sceneIsColony ? 12 : 8, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="orbitdock-title"
      aria-modal={false}
    >
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-fuchsia-200/22 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-fuchsia-300/42 bg-black/52 text-fuchsia-200">
            <Telescope className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-fuchsia-200/72">{ambientQuiet ? "orbit · APOD (quiet)" : "orbit · NASA snapshot"}</div>
            <h2 id="orbitdock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">
              {preview.title}
            </h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52" onClick={closePreview} aria-label="Close orbit deck">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fuchsia-200/65">{o?.date ?? ""}</p>
        {o?.imageUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-fuchsia-300/42 bg-black/75">
            <img src={o.imageUrl} alt="" className="max-h-[min(48vh,320px)] w-full object-cover" loading="lazy" />
          </div>
        ) : null}
        <p className="text-[13px] font-medium leading-snug text-cyan-50">{o?.title ?? preview.title}</p>
        <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-cyan-50/92">{o?.explanation ?? preview.summary}</p>
        {o?.credit ? <p className="text-[9px] text-fuchsia-200/55">Imagery credits · {o.credit}</p> : null}
      </div>
      <p className="shrink-0 border-t border-fuchsia-200/16 px-2.5 py-2 text-[9px] leading-snug text-cyan-200/52">
        NASA Astronomy Picture of the Day feeds the archive deck · MCP tool <span className="font-mono text-fuchsia-100/78">orbit_apod</span>.
      </p>
    </motion.div>
  );
}

function AlarmRow({ alarm, onRemove }: { alarm: AlarmEntry; onRemove: () => void }) {
  const clockDigits = `${String(alarm.hour24).padStart(2, "0")}:${String(alarm.minute).padStart(2, "0")}`;
  const suffix =
    alarm.hour24 === 0 ? " midnight" : alarm.hour24 === 12 ? " noon" : alarm.hour24 < 12 ? "" : "";
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-violet-300/26 bg-black/44 px-2 py-1.5 font-mono text-[11px] text-cyan-50">
      <span>
        <span className="tabular-nums text-cyan-100">{clockDigits}</span>
        <span className="text-[9px] uppercase tracking-[0.14em] text-cyan-200/54">{suffix}</span>
        {alarm.label ? <span className="ml-1.5 text-cyan-200/74"> · {alarm.label}</span> : null}
      </span>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onRemove} aria-label="Remove alarm">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}
