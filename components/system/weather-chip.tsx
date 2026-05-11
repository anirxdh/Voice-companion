"use client";

import { useEffect, useState } from "react";

type WeatherData = {
  city?: string;
  current?: {
    tempC?: number;
    label?: string;
    feelsC?: number;
    isDay?: boolean;
  };
  error?: string;
};

export function WeatherChip() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/weather")
      .then((response) => response.json())
      .then((data) => {
        if (alive) setWeather(data);
      })
      .catch(() => {
        if (alive) setWeather({ error: "Weather unavailable" });
      });
    return () => {
      alive = false;
    };
  }, []);

  const label = weather?.error
    ? "Weather unavailable"
    : weather?.current
      ? `${weather.city ? `${weather.city} · ` : ""}${weather.current.label || "Weather"} · ${Math.round(weather.current.tempC ?? 0)}°C`
      : "Weather syncing…";

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-30 rounded-full border border-white/12 bg-black/32 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/70 backdrop-blur-md">
      {label}
    </div>
  );
}
