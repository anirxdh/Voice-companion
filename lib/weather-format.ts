/** Build spoken line + summary text from `/api/weather` JSON shape. */

import type { WeatherPreviewPayload } from "@/types/veil";

export type WeatherDto = {
  city?: string;
  fetchedAt?: string;
  error?: string;
  current?: { tempC?: number; feelsC?: number; label?: string; wind?: number; humidity?: number };
  today?: { max?: number; min?: number; precipChance?: number; sunrise?: string; sunset?: string };
};

export function formatWeatherSpeech(w: WeatherDto): string {
  if (w.error) return `Weather isn’t available: ${w.error}`;
  const place = w.city ? ` ${w.city}` : "";
  const cur = w.current;
  if (!cur) return `Checking${place.trimEnd()} weather — no readings yet.`;
  const hi = w.today?.max != null ? ` High near ${Math.round(w.today.max)} Celsius.` : "";
  const lo = w.today?.min != null ? ` Overnight low ${Math.round(w.today.min)}.` : "";
  const feels = cur.feelsC != null ? `${Math.round(cur.feelsC)}` : "similar";
  return `${cur.label || "Forecast"}${place}.${cur.tempC != null ? ` ${Math.round(cur.tempC)} degrees now, feels like ${feels}.` : " "}${hi}${lo}`
    .replace(/\s+\./g, ".")
    .replace(/\.\./g, ".");
}

export function formatWeatherPreviewSummary(w: WeatherDto): string {
  if (w.error) return w.error;
  const cur = w.current;
  if (!cur) return "Awaiting telemetry…";
  return [
    cur.label,
    typeof cur.tempC === "number" ? `Now ${Math.round(cur.tempC)}°C · feels ${cur.feelsC != null ? Math.round(cur.feelsC) : "—"}°C` : "",
    w.today?.max != null && w.today.min != null
      ? `Hi ${Math.round(w.today.max)}° / Lo ${Math.round(w.today.min)}°C`
      : "",
    (w.today?.precipChance ?? 0) > 10 ? `Rain chance ~${Math.round(w.today!.precipChance!)}%` : "",
    typeof cur.wind === "number" ? `Wind ${Math.round(cur.wind)} km/h` : "",
    typeof cur.humidity === "number" ? `${Math.round(cur.humidity)}% humidity` : "",
    w.today?.sunrise ? `Sunrise ${String(w.today.sunrise).slice(11, 16)} local` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function dtoToWeatherPayload(w: WeatherDto): WeatherPreviewPayload {
  return {
    city: w.city ?? "Forecast",
    tempC: w.current?.tempC,
    feelsC: w.current?.feelsC,
    label: w.current?.label,
    highC: w.today?.max,
    lowC: w.today?.min,
    precipChance: w.today?.precipChance,
    wind: w.current?.wind,
    humidity: w.current?.humidity,
    sunrise: w.today?.sunrise,
    sunset: w.today?.sunset,
    fetchedAt: w.fetchedAt
  };
}
