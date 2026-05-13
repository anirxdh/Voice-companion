import { NextRequest, NextResponse } from "next/server";
import type { TravelMode } from "@/types/supernova";

export const runtime = "nodejs";

const UA = "VoiceOS/1.0 (assistant demo; nominatim geocode)";
const NOM = "https://nominatim.openstreetmap.org/search";
const OSRM = "https://router.project-osrm.org/route/v1";

type NomHit = { lat: string; lon: string; display_name?: string };
type OsrmResp = { code: string; routes?: Array<{ distance: number; duration: number }> };

async function geocode(q: string): Promise<{ lat: number; lon: number; label: string } | null> {
  if (!q || q.toLowerCase().includes("current location")) return null;
  const url = `${NOM}?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { Accept: "application/json", "Accept-Language": "en", "User-Agent": UA }, cache: "no-store" });
  if (!res.ok) return null;
  const hits = (await res.json()) as NomHit[];
  const h = hits[0];
  if (!h) return null;
  return { lat: Number(h.lat), lon: Number(h.lon), label: h.display_name?.split(",")[0]?.trim() ?? q };
}

async function osrmRoute(profile: string, o: { lat: number; lon: number }, d: { lat: number; lon: number }): Promise<{ distanceM: number; durationSec: number } | null> {
  try {
    const url = `${OSRM}/${profile}/${o.lon.toFixed(6)},${o.lat.toFixed(6)};${d.lon.toFixed(6)},${d.lat.toFixed(6)}?overview=false`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as OsrmResp;
    if (j.code !== "Ok" || !j.routes?.[0]) return null;
    return { distanceM: Math.round(j.routes[0].distance), durationSec: Math.round(j.routes[0].duration) };
  } catch {
    return null;
  }
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function fmtDist(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from")?.trim() ?? "";
  const to = req.nextUrl.searchParams.get("to")?.trim() ?? "";

  if (!from || !to) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }

  const [origin, dest] = await Promise.all([geocode(from), geocode(to)]);

  if (!dest) {
    return NextResponse.json({ error: "Could not locate destination.", speech: `I couldn't find "${to}" on the map.` }, { status: 404 });
  }

  const routes: TravelMode[] = [];
  let speech = "";

  if (origin) {
    const [drive, walk, bike] = await Promise.all([
      osrmRoute("driving", origin, dest),
      osrmRoute("foot", origin, dest),
      osrmRoute("bike", origin, dest),
    ]);

    if (drive) routes.push({ mode: "driving", distanceM: drive.distanceM, durationSec: drive.durationSec });

    
    const distForEst = drive?.distanceM ?? walk?.distanceM ?? bike?.distanceM;
    if (walk) {
      routes.push({ mode: "walking", distanceM: walk.distanceM, durationSec: walk.durationSec });
    } else if (distForEst) {
      
      routes.push({ mode: "walking", distanceM: distForEst, durationSec: Math.round(distForEst / 5000 * 3600) });
    }
    if (bike) {
      routes.push({ mode: "cycling", distanceM: bike.distanceM, durationSec: bike.durationSec });
    } else if (distForEst) {
      
      routes.push({ mode: "cycling", distanceM: distForEst, durationSec: Math.round(distForEst / 15000 * 3600) });
    }

    const driveStr = drive ? `${fmtDuration(drive.durationSec)} by car` : null;
    const walkStr = walk ? `${fmtDuration(walk.durationSec)} on foot` : null;
    const distStr = drive ? fmtDist(drive.distanceM) : "";
    speech = [driveStr, walkStr].filter(Boolean).join(", ") + (distStr ? ` — ${distStr}` : "") + ` from ${origin.label} to ${dest.label}.`;
  } else {
    speech = `${dest.label} located on the map. Add an origin to get travel times.`;
  }

  // Map embed: bounding box covering both points (or just destination)
  const latPad = 0.012;
  const lonPad = 0.016;
  const midLat = origin ? (origin.lat + dest.lat) / 2 : dest.lat;
  const midLon = origin ? (origin.lon + dest.lon) / 2 : dest.lon;
  const spreadLat = origin ? Math.abs(origin.lat - dest.lat) * 0.6 + latPad : latPad;
  const spreadLon = origin ? Math.abs(origin.lon - dest.lon) * 0.6 + lonPad : lonPad;
  const bbox = `${midLon - spreadLon},${midLat - spreadLat},${midLon + spreadLon},${midLat + spreadLat}`;
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${dest.lon}%2C${dest.lat}`;

  return NextResponse.json({
    origin: from,
    destination: to,
    originLabel: origin?.label,
    destLabel: dest.label,
    routes,
    mapEmbedUrl,
    speech,
    title: `${origin?.label ?? from} → ${dest.label}`,
  });
}
