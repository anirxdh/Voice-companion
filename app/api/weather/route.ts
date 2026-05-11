import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type WeatherPayload = {
  city: string;
  lat: number;
  lon: number;
  timezone?: string;
  current?: {
    tempC?: number;
    feelsC?: number;
    humidity?: number;
    precip?: number;
    rain?: number;
    snow?: number;
    cloud?: number;
    wind?: number;
    isDay?: boolean;
    code?: number;
    label?: string;
  };
  today?: {
    max?: number;
    min?: number;
    precipChance?: number;
    code?: number;
    sunrise?: string;
    sunset?: string;
  };
  fetchedAt: string;
  error?: string;
};

export async function GET(request: NextRequest) {
  try {
    const cityParam = request.nextUrl.searchParams.get("city")?.trim();
    const payload = await fetchWeather(typeof cityParam === "string" && cityParam.length > 0 ? cityParam : undefined);
    return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Weather unavailable" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}

async function geocodeCity(query: string): Promise<{ lat: number; lon: number; city: string } | null> {
  const q = encodeURIComponent(query.slice(0, 96));
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=4&language=en&format=json`, {
    headers: { "user-agent": "VEIL/1.0" },
    signal: AbortSignal.timeout(9000)
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string; country?: string }>;
  };
  const hit = data.results?.[0];
  if (!hit) return null;
  const parts = [hit.name, hit.admin1].filter(Boolean);
  const city = parts.join(", ");
  return { lat: hit.latitude, lon: hit.longitude, city: city || hit.name };
}

async function fetchWeather(cityHint?: string): Promise<WeatherPayload> {
  let lat: number | undefined;
  let lon: number | undefined;
  let city = process.env.WEATHER_CITY || "";

  const geo = cityHint ? await geocodeCity(cityHint) : undefined;
  if (geo) {
    lat = geo.lat;
    lon = geo.lon;
    city = geo.city || cityHint || "";
  } else if (cityHint) {
    return {
      city: cityHint,
      lat: NaN,
      lon: NaN,
      fetchedAt: new Date().toISOString(),
      error: `Could not locate “${cityHint}”. Try a clearer city name or spelling.`
    };
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    lat = Number(process.env.WEATHER_LAT);
    lon = Number(process.env.WEATHER_LON);
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    try {
      const ipRes = await fetch("https://ipapi.co/json/", { headers: { "user-agent": "VEIL/1.0" } });
      if (ipRes.ok) {
        const ip = await ipRes.json();
        lat = Number(ip.latitude);
        lon = Number(ip.longitude);
        city = city || ip.city || ip.region || "";
      }
    } catch {
      /* fall through */
    }
  }

  if (!Number.isFinite(lat!) || !Number.isFinite(lon!)) {
    lat = 47.6062;
    lon = -122.3321;
    city = city || "Seattle";
  }

  const latN = lat as number;
  const lonN = lon as number;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latN}&longitude=${lonN}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset&timezone=auto`;
  const wres = await fetch(url);
  if (!wres.ok) throw new Error(`Weather error ${wres.status}`);
  const data = await wres.json();
  const current = data.current || {};
  const daily = data.daily || {};

  return {
    city,
    lat: latN,
    lon: lonN,
    timezone: data.timezone,
    current: {
      tempC: current.temperature_2m,
      feelsC: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      precip: current.precipitation,
      rain: current.rain,
      snow: current.snowfall,
      cloud: current.cloud_cover,
      wind: current.wind_speed_10m,
      isDay: Boolean(current.is_day),
      code: current.weather_code,
      label: weatherLabel(current.weather_code, current.is_day)
    },
    today: {
      max: daily.temperature_2m_max?.[0],
      min: daily.temperature_2m_min?.[0],
      precipChance: daily.precipitation_probability_max?.[0],
      code: daily.weather_code?.[0],
      sunrise: daily.sunrise?.[0],
      sunset: daily.sunset?.[0]
    },
    fetchedAt: new Date().toISOString()
  };
}

function weatherLabel(code: number, isDay = 1) {
  const map: Record<number, string> = {
    0: isDay ? "Clear sky" : "Clear night",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Frosty fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Showers",
    81: "Heavy showers",
    82: "Violent showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Storm with hail",
    99: "Severe storm"
  };
  return map[code] || "Unknown";
}
