"use client";

import { motion } from "framer-motion";
import { AlarmClock, BookOpen, Car, CloudSun, Compass, ExternalLink, Globe, MapPin, Telescope, Trash2, X } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import type { AlarmEntry, MediaPreview } from "@/types/supernova";
import { Button } from "@/components/ui/button";
import { useSuperNovaStore } from "@/store/use-supernova-store";



function parseLabelToSec(label?: string): number {
  if (!label) return 300;
  const m = label.match(/^(\d+)m$/);
  if (m) return parseInt(m[1]) * 60;
  const h = label.match(/^(\d+)h$/);
  if (h) return parseInt(h[1]) * 3600;
  return 300;
}



function AnalogClockFace() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const sec = now.getSeconds();
  const min = now.getMinutes() + sec / 60;
  const hr = (now.getHours() % 12) + min / 12;

  const toXY = (deg: number, r: number) => ({
    x: 50 + r * Math.sin((deg * Math.PI) / 180),
    y: 50 - r * Math.cos((deg * Math.PI) / 180),
  });

  const sPt = toXY(sec * 6, 38);
  const mPt = toXY(min * 6, 32);
  const hPt = toXY(hr * 30, 22);
  const sTail = toXY(sec * 6 + 180, 9);

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" style={{ filter: "drop-shadow(0 0 14px rgba(251,191,36,0.28))" }}>
      <circle cx="50" cy="50" r="46" fill="rgba(0,0,0,0.62)" stroke="rgba(251,191,36,0.22)" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(251,191,36,0.07)" strokeWidth="0.5" />
      {}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={50 + 38 * Math.sin(a)} y1={50 - 38 * Math.cos(a)}
            x2={50 + 44 * Math.sin(a)} y2={50 - 44 * Math.cos(a)}
            stroke="rgba(251,191,36,0.55)" strokeWidth="2" strokeLinecap="round"
          />
        );
      })}
      {}
      {Array.from({ length: 60 }, (_, i) => {
        if (i % 5 === 0) return null;
        const a = (i * 6 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={50 + 41 * Math.sin(a)} y1={50 - 41 * Math.cos(a)}
            x2={50 + 44 * Math.sin(a)} y2={50 - 44 * Math.cos(a)}
            stroke="rgba(251,191,36,0.2)" strokeWidth="0.8" strokeLinecap="round"
          />
        );
      })}
      {}
      <line x1="50" y1="50" x2={hPt.x} y2={hPt.y} stroke="rgba(251,191,36,0.95)" strokeWidth="3.5" strokeLinecap="round" />
      {}
      <line x1="50" y1="50" x2={mPt.x} y2={mPt.y} stroke="rgba(251,191,36,0.82)" strokeWidth="2.5" strokeLinecap="round" />
      {}
      <line x1={sTail.x} y1={sTail.y} x2={sPt.x} y2={sPt.y} stroke="rgba(255,110,40,0.92)" strokeWidth="1.2" strokeLinecap="round" />
      {}
      <circle cx="50" cy="50" r="3.2" fill="rgba(251,191,36,1)" />
      <circle cx="50" cy="50" r="1.6" fill="rgba(255,110,40,1)" />
    </svg>
  );
}



function TimerRing({
  remainingSec, totalSec, label, onCancel,
}: { remainingSec: number; totalSec: number; label?: string; onCancel: () => void }) {
  const r = 27;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - (totalSec > 0 ? remainingSec / totalSec : 0));
  const urgent = remainingSec < 30;
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");

  return (
    <button
      type="button"
      onClick={onCancel}
      title="Tap to cancel"
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
    >
      <div className="group flex flex-col items-center gap-1">
        <div className="relative" style={{ width: 76, height: 76 }}>
          <svg viewBox="0 0 76 76" style={{ width: 76, height: 76 }}>
            <circle cx="38" cy="38" r={r} fill="rgba(0,0,0,0.55)" stroke="rgba(99,102,241,0.12)" strokeWidth="6" />
            <circle
              cx="38" cy="38" r={r}
              fill="none"
              stroke={urgent ? "rgba(255,80,40,0.88)" : "rgba(251,191,36,0.82)"}
              strokeWidth="6"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "38px 38px", transition: "stroke-dashoffset 0.5s linear, stroke 0.3s" }}
            />
            <text x="38" y="35" textAnchor="middle" dominantBaseline="middle" fill={urgent ? "rgba(255,100,60,0.95)" : "rgba(251,191,36,0.95)"} fontSize="11" fontFamily="monospace" fontWeight="600">{mm}:{ss}</text>
            {label && <text x="38" y="49" textAnchor="middle" dominantBaseline="middle" fill="rgba(251,191,36,0.42)" fontSize="7" fontFamily="monospace">{label}</text>}
          </svg>
        </div>
        <span className="font-mono text-[8px] text-amber-200/30 group-hover:text-red-400/65 transition-colors">cancel</span>
      </div>
    </button>
  );
}



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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePreview(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const w = preview.weather;

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.45)]"
      style={placement}
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -12, scale: 0.98 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="weather-dock-title"
      aria-modal={false}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-90" style={{ boxShadow: "inset 0 0 72px hsla(200,94%,62%,0.06), inset 0 0 1px hsla(200,98%,94%,0.28), 0 0 32px hsla(210,94%,54%,0.14)" }} />
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-cyan-200/18 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/38 bg-black/46 text-cyan-200">
            <CloudSun className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-cyan-200/74">{ambientQuiet ? "browser · outlook (quiet)" : "browser · outlook"}</div>
            <h2 id="weather-dock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">{preview.title}</h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52" onClick={closePreview} aria-label="Close weather panel">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative flex-1 space-y-3 overflow-y-auto px-3 py-3 font-mono text-[11px] text-cyan-50/94">
        {w ? (
          <>
            <p className="text-[42px] font-semibold tabular-nums leading-none tracking-tight text-cyan-50">
              {w.tempC != null ? `${Math.round(w.tempC)}°` : "—"}<span className="align-top text-[13px] font-medium text-cyan-200/70"> C</span>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/68">{w.label}</p>
            <div className="grid gap-2 rounded-lg border border-cyan-400/26 bg-black/48 px-2.5 py-2">
              <div className="flex justify-between gap-2 text-[10px] text-cyan-100/76"><span>Feels</span><span>{w.feelsC != null ? `${Math.round(w.feelsC)}°C` : "—"}</span></div>
              <div className="flex justify-between gap-2 text-[10px] text-cyan-100/76"><span>Hi / Lo</span><span>{w.highC != null ? Math.round(w.highC) : "—"}° / {w.lowC != null ? Math.round(w.lowC) : "—"}°</span></div>
              {(w.precipChance ?? 0) >= 12 ? <div className="flex justify-between gap-2 text-[10px] text-cyan-100/76"><span>Rain</span><span>{Math.round(w.precipChance ?? 0)}%</span></div> : null}
              {typeof w.wind === "number" ? <div className="flex justify-between gap-2 text-[10px] text-cyan-100/76"><span>Wind</span><span>{Math.round(w.wind)} km/h</span></div> : null}
              {typeof w.humidity === "number" ? <div className="flex justify-between gap-2 text-[10px] text-cyan-100/76"><span>Humidity</span><span>{Math.round(w.humidity)}%</span></div> : null}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-cyan-100/72">Forecast payload unavailable.</p>
        )}
        {preview.summary ? <pre className="whitespace-pre-wrap break-words text-[10px] leading-snug text-cyan-100/84">{preview.summary}</pre> : null}
      </div>
      <p className="shrink-0 border-t border-cyan-200/14 px-2.5 py-2 text-[9px] leading-snug text-cyan-200/52">Open-Meteo forecast · City queries also pin miniature cards on the browser tile.</p>
    </motion.div>
  );
}

// ─── ClockEnvironmentDock ─────────────────────────────────────────────────────

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
  const alarmEntries  = useSuperNovaStore((s) => s.alarmEntries);
  const activeTimers  = useSuperNovaStore((s) => s.activeTimers);
  const removeAlarm   = useSuperNovaStore((s) => s.removeAlarmEntry);
  const removeTimer   = useSuperNovaStore((s) => s.removeActiveTimer);
  const startPreset   = useSuperNovaStore((s) => s.startActiveTimer);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  const nowClock = new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
  const nowDate  = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.45)]"
      style={placement}
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -12, scale: 0.98 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="clockdesk-title"
      aria-modal={false}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-90" style={{ boxShadow: "inset 0 0 60px hsla(43,96%,60%,0.06), inset 0 0 1px hsla(43,96%,92%,0.22), 0 0 32px hsla(43,96%,54%,0.14)" }} />

      {/* Header */}
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-amber-300/18 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/36 bg-black/46 text-amber-200">
            <span style={{ fontSize: 18 }}>⏳</span>
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-amber-200/68">{ambientQuiet ? "tick · timers (quiet)" : "tick · timers · alarms"}</div>
            <h2 id="clockdesk-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-amber-50">{preview.title}</h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52" onClick={closePreview} aria-label="Close clock workspace">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body — two-column layout */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="flex min-h-full gap-0">

          {/* Left — analog clock */}
          <div
            className="flex shrink-0 flex-col items-center justify-center gap-3 border-r border-amber-300/12 px-6 py-6"
            style={{ minWidth: 200, background: "rgba(0,0,0,0.28)" }}
          >
            <div style={{ width: 160, height: 160 }}>
              <AnalogClockFace />
            </div>
            <div className="text-center">
              <p className="font-mono text-[22px] font-semibold tabular-nums tracking-tight text-amber-50">{nowClock}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-200/50">{nowDate}</p>
            </div>
          </div>

          {/* Right — timers + alarms */}
          <div className="flex-1 min-w-0 space-y-5 overflow-y-auto px-4 py-4">

            {/* Timer presets */}
            <div className="space-y-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-200/60">Quick Timers</p>
              <div className="flex flex-wrap gap-2">
                {[180, 300, 600, 900].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => startPreset({ durationSec: sec, label: sec < 3600 ? `${sec / 60}m` : `${sec / 3600}h` })}
                    className="rounded-lg border border-amber-400/28 bg-black/40 px-3 py-1.5 font-mono text-[11px] text-amber-100 hover:bg-amber-400/10 hover:border-amber-400/48 transition-colors"
                  >
                    +{sec < 3600 ? `${sec / 60}m` : `${sec / 3600}h`}
                  </button>
                ))}
              </div>
            </div>

            {/* Active timer rings */}
            {activeTimers.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-200/60">Running</p>
                <div className="flex flex-wrap gap-4">
                  {activeTimers.map((t) => {
                    const remaining = Math.max(0, Math.ceil((t.endsAtMs - Date.now()) / 1000));
                    const total = parseLabelToSec(t.label);
                    return (
                      <TimerRing
                        key={t.id}
                        remainingSec={remaining}
                        totalSec={total}
                        label={t.label}
                        onCancel={() => removeTimer(t.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {activeTimers.length === 0 && (
              <p className="font-mono text-[10px] text-amber-200/38">Say "ten minute timer" to start a countdown.</p>
            )}

            {/* Alarms */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <AlarmClock className="h-3.5 w-3.5 text-amber-300/70" />
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-200/60">Alarms Set</p>
              </div>
              <ul className="space-y-1.5">
                {alarmEntries.map((a) => (
                  <AlarmRow key={a.id} alarm={a} onRemove={() => removeAlarm(a.id)} />
                ))}
                {alarmEntries.length === 0 ? <li className="font-mono text-[10px] text-amber-200/38">Say "Set alarm seven AM".</li> : null}
              </ul>
            </div>

            {preview.summary ? <p className="text-[10px] leading-snug text-amber-100/65">{preview.summary}</p> : null}
          </div>
        </div>
      </div>

      <p className="shrink-0 border-t border-amber-300/14 px-2.5 py-2 text-[9px] leading-snug text-amber-200/45">
        Wall clock mirrors your locale · timers chime once at zero · alarms repeat daily until removed.
      </p>
    </motion.div>
  );
}

// ─── NewsEnvironmentDock ──────────────────────────────────────────────────────

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePreview(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const items = preview.news ?? [];

  const rankColor = (i: number) =>
    i === 0 ? "rgba(52,211,153,0.95)" : i === 1 ? "rgba(52,211,153,0.65)" : i === 2 ? "rgba(52,211,153,0.42)" : "rgba(52,211,153,0.22)";

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.48)]"
      style={placement}
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12, scale: 0.98 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="newsdesk-dock-title"
      aria-modal={false}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-90" style={{ boxShadow: "inset 0 0 60px hsla(160,82%,54%,0.06), inset 0 0 1px hsla(160,86%,92%,0.22), 0 0 32px hsla(160,82%,50%,0.12)" }} />

      {/* Header */}
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-emerald-300/20 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-400/36 bg-black/46 text-emerald-300">
            <span style={{ fontSize: 16 }}>📰</span>
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-emerald-300/68">{ambientQuiet ? "news · headlines (quiet)" : "news · live headlines"}</div>
            <h2 id="newsdesk-dock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">{preview.title}</h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52" onClick={closePreview} aria-label="Close headlines panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Headlines */}
      <div className="relative flex-1 overflow-y-auto px-3 py-3">
        {items.length === 0 ? (
          <div className="space-y-2">
            <p className="font-mono text-[11px] text-emerald-100/65">{preview.summary?.trim() || "No headlines loaded yet."}</p>
            {preview.summary && (
              <pre className="whitespace-pre-wrap break-words rounded-md border border-white/10 bg-black/35 p-2 font-mono text-[10px] leading-snug text-cyan-100/75">{preview.summary}</pre>
            )}
          </div>
        ) : (
          <ol className="space-y-2">
            {items.map((row, idx) => (
              <li
                key={`${idx}-${row.title.slice(0, 24)}`}
                className="flex gap-3 rounded-xl border bg-black/44 p-3 transition-colors hover:bg-black/58"
                style={{ borderColor: idx === 0 ? "rgba(52,211,153,0.28)" : "rgba(52,211,153,0.12)" }}
              >
                {/* Rank */}
                <div
                  className="shrink-0 font-mono text-[28px] font-black tabular-nums leading-none select-none"
                  style={{ color: rankColor(idx), lineHeight: 1, paddingTop: 2 }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-medium leading-snug text-cyan-50/96">{row.title}</p>
                    {row.score != null && (
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
                        style={{ background: "rgba(52,211,153,0.14)", color: "rgba(52,211,153,0.9)", border: "1px solid rgba(52,211,153,0.22)" }}
                      >
                        ▲ {row.score}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    {row.source ? (
                      <span className="font-mono text-[9px] uppercase tracking-wide text-cyan-200/42">{row.source}</span>
                    ) : null}
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 font-mono text-[9px] text-emerald-400/75 hover:text-emerald-300 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden /> open
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="shrink-0 border-t border-emerald-300/14 px-2.5 py-2 text-[9px] leading-snug text-emerald-200/42">
        Hacker News public API · Super Nova reads the top three aloud · say "more headlines" anytime.
      </p>
    </motion.div>
  );
}

// ─── NotesEnvironmentDock ─────────────────────────────────────────────────────

const NOTE_PALETTE = [
  { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.26)", accent: "rgba(52,211,153,0.72)" },
  { bg: "rgba(6,182,212,0.08)",  border: "rgba(6,182,212,0.22)",  accent: "rgba(34,211,238,0.65)" },
  { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.20)", accent: "rgba(167,139,250,0.62)" },
  { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.20)", accent: "rgba(251,191,36,0.60)" },
  { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.20)", accent: "rgba(129,140,248,0.62)" },
];

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePreview(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const notes = preview.stickyNotes ?? [];

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.48)]"
      style={placement}
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -12, scale: 0.98 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="notes-dock-title"
      aria-modal={false}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-92" style={{ boxShadow: "inset 0 0 64px hsla(152,82%,54%,0.05), inset 0 0 1px hsla(152,82%,92%,0.20), 0 0 28px hsla(152,82%,48%,0.10)" }} />

      {/* Header */}
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-emerald-300/20 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-400/36 bg-black/46 text-emerald-300">
            <span style={{ fontSize: 16 }}>✒</span>
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-emerald-300/68">{ambientQuiet ? "ink · Super Nova pad (quiet)" : "ink · Super Nova pad"}</div>
            <h2 id="notes-dock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">{preview.title}</h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52" onClick={closePreview} aria-label="Close notes">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes grid */}
      <div className="relative flex-1 overflow-y-auto px-3 py-3">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <span style={{ fontSize: 36, opacity: 0.3 }}>✒</span>
            <p className="font-mono text-[11px] text-emerald-200/52">Scratch notes land here whenever you jot them via voice.</p>
            <p className="font-mono text-[10px] text-emerald-200/35">Try: "Jot down pick up groceries"</p>
          </div>
        ) : (
          <div
            className="gap-3"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
          >
            {notes.map((row, idx) => {
              const pal = NOTE_PALETTE[idx % NOTE_PALETTE.length];
              const chars = row.text.length;
              return (
                <div
                  key={row.id}
                  className="relative flex flex-col gap-2 overflow-hidden rounded-xl p-3"
                  style={{
                    background: pal.bg,
                    border: `1px solid ${pal.border}`,
                    boxShadow: `0 4px 18px rgba(0,0,0,0.28), inset 0 0 20px rgba(0,0,0,0.12)`,
                  }}
                >
                  {/* Accent bar at top */}
                  <div
                    className="absolute left-0 top-0 h-0.5 rounded-t-xl"
                    style={{ width: "100%", background: `linear-gradient(90deg, ${pal.accent}, transparent)` }}
                  />
                  {/* Note index badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono text-[8px] uppercase tracking-[0.2em]"
                      style={{ color: pal.accent }}
                    >
                      note {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[8px]" style={{ color: pal.accent, opacity: 0.5 }}>
                      {chars}c
                    </span>
                  </div>
                  {/* Note text */}
                  <p
                    className="flex-1 font-mono text-[12px] leading-relaxed"
                    style={{ color: "rgba(220,240,235,0.94)" }}
                  >
                    {row.text}
                  </p>
                  {/* Timestamp */}
                  {row.createdAt ? (
                    <p
                      className="font-mono text-[8px] uppercase tracking-wide"
                      style={{ color: pal.accent, opacity: 0.55 }}
                    >
                      {new Date(row.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="shrink-0 border-t border-emerald-300/14 px-2.5 py-2 text-[9px] leading-snug text-emerald-200/40">
        Stored in <span className="text-emerald-300/65">.super-nova-notes.json</span> via MCP tool <span className="font-mono text-cyan-100/72">sticky_note</span>.
      </p>
    </motion.div>
  );
}

// ─── MapEnvironmentDock ───────────────────────────────────────────────────────

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePreview(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const src = preview.directions?.mapEmbedUrl ?? preview.mapEmbedUrl ?? "";
  const dir = preview.directions;

  function fmtDuration(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    if (h === 0) return `${m} ${m === 1 ? "minute" : "minutes"}`;
    if (m === 0) return `${h} ${h === 1 ? "hour" : "hours"}`;
    return `${h} ${h === 1 ? "hour" : "hours"} ${m} ${m === 1 ? "minute" : "minutes"}`;
  }
  function fmtDist(m: number): string {
    return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
  }

  const MODE_META: Record<string, { icon: React.ReactNode; label: string; color: string; border: string }> = {
    driving: { icon: <Car className="h-4 w-4" />, label: "Drive / Cab", color: "rgba(56,189,248,0.92)", border: "rgba(56,189,248,0.22)" },
    walking: { icon: <span style={{ fontSize: 16 }}>🚶</span>, label: "Walk", color: "rgba(52,211,153,0.92)", border: "rgba(52,211,153,0.22)" },
    cycling: { icon: <span style={{ fontSize: 16 }}>🚲</span>, label: "Bike", color: "rgba(251,191,36,0.92)", border: "rgba(251,191,36,0.22)" },
  };

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.5)]"
      style={placement}
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -12, scale: 0.98 }}
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
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-teal-200/72">
              {dir ? (ambientQuiet ? "atlas · route (quiet)" : "atlas · directions") : (ambientQuiet ? "atlas · OSM (quiet)" : "atlas · openstreetmap")}
            </div>
            <h2 id="mapdock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">{preview.title}</h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-white/16 bg-black/40 text-white/88 hover:bg-black/52" onClick={closePreview} aria-label="Close map">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-y-auto">
        {/* Travel mode cards */}
        {dir && dir.routes.length > 0 && (
          <div className="px-3 pt-3 space-y-2">
            {/* Route header */}
            <div className="rounded-lg border border-teal-400/18 bg-black/40 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-teal-300/60">From</p>
              <p className="font-mono text-[12px] text-cyan-50/90 truncate">{dir.originLabel ?? dir.origin}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-teal-300/60">To</p>
              <p className="font-mono text-[12px] text-cyan-50/90 truncate">{dir.destLabel ?? dir.destination}</p>
            </div>
            {/* Mode cards */}
            {dir.routes.map((r) => {
              const meta = MODE_META[r.mode];
              if (!meta) return null;
              return (
                <div
                  key={r.mode}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(0,0,0,0.44)", border: `1px solid ${meta.border}` }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${meta.color}12`, border: `1px solid ${meta.border}`, color: meta.color }}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: meta.color }}>{meta.label}</p>
                    <p className="font-mono text-[22px] font-bold tabular-nums leading-none" style={{ color: meta.color }}>
                      {fmtDuration(r.durationSec)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>{fmtDist(r.distanceM)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Place summary */}
        {preview.summary && !dir && (
          <p className="px-3 pt-3 text-[10px] leading-snug text-cyan-100/78">{preview.summary}</p>
        )}

        {/* Map embed */}
        {src ? (
          <div className="relative mx-3 mt-3 mb-3 min-h-[160px] overflow-hidden rounded-xl border border-teal-400/35 bg-black/55">
            <iframe title="Atlas map preview" loading="lazy" className="h-[min(36vh,280px)] w-full" referrerPolicy="no-referrer-when-downgrade" src={src} />
            <Compass className="pointer-events-none absolute right-2 top-2 h-5 w-5 text-teal-200/45" aria-hidden />
          </div>
        ) : !dir ? (
          <p className="px-3 py-4 text-[11px] text-cyan-100/76">Atlas frame unavailable—nothing to embed.</p>
        ) : null}
      </div>

      <p className="shrink-0 border-t border-teal-200/16 px-2.5 py-2 text-[9px] leading-snug text-cyan-200/52">
        {dir ? "OSRM routing · OpenStreetMap · live travel estimates" : "Geocoder © OpenStreetMap contributors · tool maps_place"}
      </p>
    </motion.div>
  );
}

// ─── BrowseEnvironmentDock ────────────────────────────────────────────────────

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePreview(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const b    = preview.browseBrief;
  const body = (b?.markdown ?? preview.summary ?? "").trim();
  const source = b?.source === "firecrawl" ? "firecrawl" : "plain";
  const openUrl = b?.url?.trim();

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.48)]"
      style={placement}
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12, scale: 0.98 }}
      transition={{ duration: 0.26, ease: [0.22, 0.94, 0.36, 1] }}
      role="dialog"
      aria-labelledby="browse-dock-title"
      aria-modal={false}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-92" style={{ boxShadow: "inset 0 0 64px hsla(190,94%,54%,0.05), inset 0 0 1px hsla(200,98%,94%,0.28), 0 0 30px hsla(195,94%,54%,0.12)" }} />
      <div className="relative flex shrink-0 items-start justify-between gap-2 border-b border-cyan-200/22 pb-2.5 px-2.5 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/42 bg-black/46 text-cyan-200">
            <Globe className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-cyan-200/72">{ambientQuiet ? "browser · scrape (quiet)" : "browser · page strip"}</div>
            <h2 id="browse-dock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">{preview.title}</h2>
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
        Add <span className="font-mono text-cyan-100/70">FIRECRAWL_API_KEY</span> server-side for Firecrawl v2 scrape; otherwise Super Nova strips HTML. Built-in{' '}
        <span className="font-mono text-cyan-100/78">browse_page</span>.
      </p>
    </motion.div>
  );
}

// ─── ScoutEnvironmentDock ─────────────────────────────────────────────────────

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePreview(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const s = preview.scoutBrief;

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-xl shadow-[0_28px_60px_rgba(0,0,0,.48)]"
      style={placement}
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12, scale: 0.98 }}
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
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-sky-200/72">{ambientQuiet ? "lens · wiki (quiet)" : "lens · wikipedia dossier"}</div>
            <h2 id="scoutdock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">{preview.title}</h2>
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

// ─── OrbitEnvironmentDock ─────────────────────────────────────────────────────

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePreview(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  const o = preview.orbitBrief;

  return (
    <motion.div
      className="colony-wall-dock colony-panel pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-xl shadow-[0_34px_70px_rgba(0,0,0,.55)]"
      style={placement}
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12, scale: 0.98 }}
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
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-fuchsia-200/72">{ambientQuiet ? "cosmos · APOD (quiet)" : "cosmos · NASA snapshot"}</div>
            <h2 id="orbitdock-title" className="line-clamp-2 pt-1 text-[13px] font-medium leading-snug text-cyan-50">{preview.title}</h2>
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
        NASA Astronomy Picture of the Day · MCP tool <span className="font-mono text-fuchsia-100/78">orbit_apod</span>.
      </p>
    </motion.div>
  );
}

// ─── AlarmRow ─────────────────────────────────────────────────────────────────

function AlarmRow({ alarm, onRemove }: { alarm: AlarmEntry; onRemove: () => void }) {
  const clockDigits = `${String(alarm.hour24).padStart(2, "0")}:${String(alarm.minute).padStart(2, "0")}`;
  const suffix = alarm.hour24 === 0 ? " midnight" : alarm.hour24 === 12 ? " noon" : alarm.hour24 < 12 ? "" : "";
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-amber-400/22 bg-black/44 px-2 py-1.5 font-mono text-[11px] text-cyan-50">
      <span>
        <span className="tabular-nums text-amber-100">{clockDigits}</span>
        <span className="text-[9px] uppercase tracking-[0.14em] text-amber-200/54">{suffix}</span>
        {alarm.label ? <span className="ml-1.5 text-amber-200/74"> · {alarm.label}</span> : null}
      </span>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onRemove} aria-label="Remove alarm">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

