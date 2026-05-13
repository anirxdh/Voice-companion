"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getPlaybackAnalyser } from "@/lib/music-player";

function downsample(freq: ArrayLike<number>, bins: number): number[] {
  const chunk = freq.length / bins;
  const out: number[] = [];
  for (let i = 0; i < bins; i++) {
    let sum = 0;
    const start = Math.floor(i * chunk);
    const end = Math.floor((i + 1) * chunk);
    for (let j = start; j < end; j++) sum += freq[j] ?? 0;
    const avg = sum / Math.max(end - start, 1);
    out.push(Math.min(1, (avg / 255) * 2.1));
  }
  return out;
}

function fakeLevels(t: number, playing: boolean, bins: number): number[] {
  const base = playing ? 0.28 : 0.08;
  const amp = playing ? 0.55 : 0.14;
  return Array.from({ length: bins }, (_, i) => {
    const phase = (i / bins) * Math.PI * 2;
    const mid = Math.exp(-Math.pow((i - bins / 2) / (bins * 0.38), 2));
    const wave =
      0.5 +
      0.5 * Math.sin(t * (playing ? 0.0085 : 0.004) + phase * 1.72) * (0.6 + 0.4 * Math.sin(t * 0.003 + phase * 2.3));
    let v = base + amp * wave * (0.55 + mid * 0.55);
    if (playing) v = Math.min(1, Math.max(0.05, v + Math.random() * 0.08));
    else v = Math.min(0.45, Math.max(0.05, v * 0.7));
    return v;
  });
}

type PlaybackWallVisualizerProps = {
  playing: boolean;
  
  barCount?: number;
  className?: string;
};


export function PlaybackWallVisualizer({ playing, barCount = 36, className }: PlaybackWallVisualizerProps) {
  const [levels, setLevels] = useState<number[]>(() => Array(barCount).fill(0.1));
  const barKeys = useMemo(() => Array.from({ length: barCount }, (_, i) => i), [barCount]);

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const analyser = getPlaybackAnalyser();
      let next: number[];

      if (playing && analyser) {
        const tmp = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(tmp);
        next = downsample(tmp, barCount);
      } else {
        next = fakeLevels(performance.now(), playing, barCount);
      }

      setLevels(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, barCount]);

  return (
    <div
      className={cn("flex w-full items-end justify-center gap-px sm:gap-[2px]", className)}
      aria-hidden
    >
      {barKeys.map((i) => {
        const v = Math.max(0.05, Math.min(levels[i] ?? 0.1, 1));
        const hue = i < barCount / 3 ? 186 : i < (barCount * 2) / 3 ? 198 : 205;
        return (
          <span
            key={i}
            className="min-w-[2px] flex-1 rounded-[1px] sm:min-w-[3px]"
            style={{
              height: `${Math.round(22 + v * 52)}%`,
              minHeight: "4px",
              background: `linear-gradient(180deg, hsla(${hue}, 100%, 72%, ${0.35 + v * 0.45}), hsla(${hue}, 92%, 48%, ${0.15 + v * 0.42}))`,
              boxShadow:
                playing && v > 0.22
                  ? `0 0 ${4 + v * 10}px hsla(${hue}, 96%, 58%, ${0.35 + v * 0.28}), inset 0 0 ${1 + v * 4}px hsla(190, 100%, 88%, .12)`
                  : `0 0 3px hsla(${hue}, 90%, 48%, ${0.12 + v * 0.18})`
            }}
          />
        );
      })}
    </div>
  );
}
