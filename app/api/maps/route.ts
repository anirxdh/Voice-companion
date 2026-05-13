import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UA = "Super Nova/1.0 (assistant demo; nominatim forward-geocode)";
const BASE = "https://nominatim.openstreetmap.org/search";

type NHit = { lat: string; lon: string; display_name?: string };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("query")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: "query_required", speech: "Name a postcode, suburb, landmark, or city for the atlas." },
      { status: 400 }
    );
  }

  const url = `${BASE}?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      "User-Agent": UA
    },
    cache: "no-store"
  });

  if (!res.ok) {
    return NextResponse.json({ error: "geocoder_unreachable", speech: "Atlas uplink stalled—retry shortly." }, { status: 502 });
  }

  const hits = (await res.json()) as NHit[];
  const hit = hits[0];
  if (!hit) {
    return NextResponse.json({
      speech: `No atlas match for “${q}”—try a tighter wording.`,
      title: `Atlas · ${q}`,
      label: "",
      embedUrl: "",
      summary: ""
    });
  }

  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "bad_hit", speech: "Received a malformed atlas fix." }, { status: 502 });
  }

  const label = hit.display_name ?? q;
  const lonPad = 0.016;
  const latPad = 0.011;
  const f = (n: number) => parseFloat(n.toFixed(6));
  const bbox = `${f(lon - lonPad)},${f(lat - latPad)},${f(lon + lonPad)},${f(lat + latPad)}`;
  const marker = `${f(lat)},${f(lon)}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
  const lead = label.split(",")[0]?.trim() ?? q;
  const speech = `${lead} is centered on the atlas frame — live OpenStreetMap.`;

  return NextResponse.json({
    title: `Atlas · ${q}`,
    query: q,
    label,
    lat,
    lon,
    embedUrl,
    summary: label,
    speech
  });
}

