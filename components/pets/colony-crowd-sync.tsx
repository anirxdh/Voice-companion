"use client";

import { useEffect } from "react";
import { subscribeMusicPlaybackState, isMusicGloballyPlaying } from "@/lib/music-player";
import { useVeilStore } from "@/store/use-veil-store";

function resolveCrowdMode(ambientPreview: ReturnType<typeof useVeilStore.getState>["ambientPreview"]): "idle" | "pulse" | "theatre" {
  if (ambientPreview?.kind === "video" || ambientPreview?.kind === "youtube") return "theatre";
  if (ambientPreview?.kind === "music" && isMusicGloballyPlaying()) return "pulse";
  if (isMusicGloballyPlaying()) return "pulse";
  return "idle";
}

/** Keeps MCP / media UI untouched; only updates ambient colony crowd reactively. */
export function ColonyCrowdSync() {
  const setCrowd = useVeilStore((s) => s.setColonyCrowdMode);
  const ambientPreview = useVeilStore((s) => s.ambientPreview);

  /** Preview open/close commits immediately — no shimmer when docks change. */
  useEffect(() => {
    setCrowd(resolveCrowdMode(ambientPreview));
  }, [ambientPreview, setCrowd]);

  /** Music telemetry is noisy; brief hysteresis stops idle ↔ pulse row strobing on pets. */
  useEffect(() => {
    /** Browser returns `number`; avoid `ReturnType` Node `Timeout` mismatch. */
    let idleHang: number | undefined;

    const clearHang = () => {
      if (idleHang !== undefined) {
        window.clearTimeout(idleHang);
        idleHang = undefined;
      }
    };

    const unsub = subscribeMusicPlaybackState(() => {
      const snap = resolveCrowdMode(useVeilStore.getState().ambientPreview);
      clearHang();

      if (snap === "idle") {
        idleHang = window.setTimeout(() => {
          const again = resolveCrowdMode(useVeilStore.getState().ambientPreview);
          if (again === "idle") setCrowd("idle");
        }, 720);
      } else {
        setCrowd(snap);
      }
    });

    return () => {
      clearHang();
      unsub();
    };
  }, [setCrowd]);

  return null;
}
