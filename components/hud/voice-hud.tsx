"use client";

import { useSuperNovaStore } from "@/store/use-supernova-store";
import type { AIPhase } from "@/types/supernova";

type PhaseInfo = { label: string; color: string; dot: string; pulse: boolean };

const PHASE_MAP: Record<AIPhase, PhaseInfo> = {
  startup:       { label: "booting",     color: "rgba(255,176,90,0.7)",   dot: "rgba(255,176,90,0.6)",   pulse: false },
  idle:          { label: "",            color: "rgba(255,255,255,0.28)", dot: "rgba(255,255,255,0.22)", pulse: false },
  listening:     { label: "",            color: "rgba(99,220,155,0.92)",  dot: "rgba(99,220,155,0.88)",  pulse: true  },
  thinking:      { label: "thinking",    color: "rgba(155,180,255,0.92)", dot: "rgba(155,180,255,0.88)", pulse: true  },
  orchestrating: { label: "working",     color: "rgba(255,176,90,0.92)",  dot: "rgba(255,176,90,0.88)",  pulse: true  },
  speaking:      { label: "speaking",    color: "rgba(255,220,100,0.92)", dot: "rgba(255,220,100,0.88)", pulse: true  },
  interrupted:   { label: "paused",      color: "rgba(255,90,90,0.78)",   dot: "rgba(255,90,90,0.72)",   pulse: false },
  error:         { label: "error",       color: "rgba(255,90,90,0.78)",   dot: "rgba(255,90,90,0.72)",   pulse: false },
};


type RoomInfo = { name: string; icon: string; accent: string };

export const ROOM_IDENTITY: Record<string, RoomInfo> = {
  hub:       { name: "NEXUS",   icon: "⬡",  accent: "rgba(200,200,255,0.88)" },
  browser:   { name: "SIGNAL",  icon: "📡", accent: "rgba(56,189,248,0.92)"  },
  voice:     { name: "WAVE",    icon: "〰", accent: "rgba(192,132,252,0.92)" },
  clock:     { name: "TICK",    icon: "⏳", accent: "rgba(251,191,36,0.92)"  },
  notes:     { name: "INK",     icon: "✒",  accent: "rgba(110,231,183,0.92)" },
  library:   { name: "LENS",    icon: "🔬", accent: "rgba(103,232,249,0.92)" },
  archive:   { name: "COSMOS",  icon: "🌌", accent: "rgba(129,140,248,0.92)" },
  email:     { name: "INBOX",   icon: "📬", accent: "rgba(167,139,250,0.92)" },
  downloads: { name: "NEWS",    icon: "📰", accent: "rgba(52,211,153,0.92)"  },
};

export function VoiceHud({ visible = true }: { visible?: boolean }) {
  const phase      = useSuperNovaStore((s) => s.phase);
  const activeRoom = useSuperNovaStore((s) => s.activeRoom);

  if (!visible) return null;

  const info  = PHASE_MAP[phase] ?? PHASE_MAP["idle"];
  const room  = activeRoom ? (ROOM_IDENTITY[activeRoom] ?? null) : null;

  const hasDot   = true;
  const hasPhase = Boolean(info.label);
  const hasRoom  = Boolean(room);

  if (!hasPhase && !hasRoom) {
    
    return (
      <div style={{ position: "fixed", bottom: "clamp(104px,12vh,150px)", left: "50%", transform: "translateX(-50%)", zIndex: 46, pointerEvents: "none" }}>
        <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: info.dot, opacity: 0.4 }} />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "clamp(104px, 12vh, 150px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 46,
        pointerEvents: "none",
      }}
    >
      <div
        className="flex items-center gap-2 rounded-full font-mono whitespace-nowrap"
        style={{
          padding: hasRoom ? "5px 14px 5px 10px" : "4px 12px",
          fontSize: 10,
          background: hasRoom ? `rgba(4,5,14,0.84)` : "rgba(4,5,14,0.72)",
          border: hasRoom
            ? `1px solid ${room!.accent}44`
            : `1px solid ${info.dot}38`,
          backdropFilter: "blur(16px)",
          boxShadow: hasRoom
            ? `0 0 18px ${room!.accent}18, inset 0 0 12px ${room!.accent}08`
            : `0 0 10px ${info.dot}14`,
          transition: "border-color 0.4s, box-shadow 0.4s",
        }}
      >
        {/* Status dot */}
        <span
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: info.dot,
            boxShadow: `0 0 6px ${info.dot}`,
            animation: info.pulse ? "hudDotPulse 1.1s ease-in-out infinite" : "none",
            flexShrink: 0,
          }}
        />

        {/* Phase label */}
        {hasPhase && (
          <span style={{ color: info.color, letterSpacing: "0.08em" }}>{info.label}</span>
        )}

        {/* Room badge */}
        {hasRoom && (
          <>
            {hasPhase && <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: room!.accent,
                letterSpacing: "0.14em",
                fontWeight: 600,
                fontSize: 10,
              }}
            >
              <span style={{ fontSize: 11 }}>{room!.icon}</span>
              {room!.name}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
