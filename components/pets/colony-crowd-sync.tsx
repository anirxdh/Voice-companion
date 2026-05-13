"use client";

import { useEffect } from "react";
import { subscribeMusicPlaybackState, isMusicGloballyPlaying } from "@/lib/music-player";
import { useSuperNovaStore } from "@/store/use-supernova-store";

function resolveCrowdMode(ambientPreview: ReturnType<typeof useSuperNovaStore.getState>["ambientPreview"]): "idle" | "pulse" | "theatre" {
  if (ambientPreview?.kind === "video" || ambientPreview?.kind === "youtube") return "theatre";
  if (ambientPreview?.kind === "music" && isMusicGloballyPlaying()) return "pulse";
  if (isMusicGloballyPlaying()) return "pulse";
  return "idle";
}


export function ColonyCrowdSync() {
  const setCrowd = useSuperNovaStore((s) => s.setColonyCrowdMode);
  const ambientPreview = useSuperNovaStore((s) => s.ambientPreview);

  
  useEffect(() => {
    setCrowd(resolveCrowdMode(ambientPreview));
  }, [ambientPreview, setCrowd]);

  
  useEffect(() => {
    
    let idleHang: number | undefined;

    const clearHang = () => {
      if (idleHang !== undefined) {
        window.clearTimeout(idleHang);
        idleHang = undefined;
      }
    };

    const unsub = subscribeMusicPlaybackState(() => {
      const snap = resolveCrowdMode(useSuperNovaStore.getState().ambientPreview);
      clearHang();

      if (snap === "idle") {
        idleHang = window.setTimeout(() => {
          const again = resolveCrowdMode(useSuperNovaStore.getState().ambientPreview);
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
