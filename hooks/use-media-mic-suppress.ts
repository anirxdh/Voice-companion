"use client";

import { useEffect, useRef } from "react";
import { subscribeMusicPlaybackState } from "@/lib/music-player";
import { useSuperNovaStore } from "@/store/use-supernova-store";

const YT_PATTERN = /youtube(?:-nocookie)?\.com|youtu\.be/i;

function isYouTubeUrl(url: string | null): boolean {
  return Boolean(url && YT_PATTERN.test(url));
}

/**
 * Suppresses the microphone while Deezer music or a YouTube video is playing,
 * so audio from speakers doesn't trigger accidental voice commands.
 * Re-enables the mic as soon as playback stops or the browser closes.
 */
export function useMediaMicSuppress() {
  const browserModalUrl  = useSuperNovaStore((s) => s.browserModalUrl);
  const setMicSuppressed = useSuperNovaStore((s) => s.setMicSuppressed);

  // Track both sources independently so either one keeps the mic suppressed.
  const musicPlayingRef = useRef(false);
  const ytOpenRef       = useRef(false);

  function sync() {
    setMicSuppressed(musicPlayingRef.current || ytOpenRef.current);
  }

  // ── Music (Deezer 30s preview) ────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeMusicPlaybackState((playing) => {
      musicPlayingRef.current = playing;
      sync();
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── YouTube in browser widget ─────────────────────────────────────────────
  useEffect(() => {
    ytOpenRef.current = isYouTubeUrl(browserModalUrl);
    sync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserModalUrl]);
}
