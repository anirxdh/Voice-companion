import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ApodResp = {
  title?: string;
  explanation?: string;
  hdurl?: string;
  url?: string;
  date?: string;
  copyright?: string;
  msg?: string;
};

export async function GET(req: NextRequest) {
  const dateRaw = req.nextUrl.searchParams.get("date")?.trim();
  const base = dateRaw?.match(/^\d{4}-\d{2}-\d{2}$/) ? dateRaw : undefined;

  const endpoint =
    base != null
      ? `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=${encodeURIComponent(base)}`
      : "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY";

  const res = await fetch(endpoint, { cache: "no-store" });

  if (!res.ok) {
    return NextResponse.json({ error: "apod_http", speech: "NASA feed didn't answer—orbit desk dimmed." }, { status: 502 });
  }

  const payload = (await res.json()) as ApodResp;
  if (!payload.title || payload.msg) {
    const msg = payload.msg ?? "no APOD payload";
    return NextResponse.json({ error: payload.msg ?? "apod_blank", speech: `Orbit uplink terse: ${msg}.` }, { status: 502 });
  }

  const imageUrl = payload.hdurl || payload.url || "";
  const expl = typeof payload.explanation === "string" ? payload.explanation.trim() : "";
  const speech = `${payload.title}. ${expl.slice(0, 420)}${expl.length > 420 ? " …" : ""}`;

  return NextResponse.json({
    title: `Orbit · ${payload.title}`,
    speech,
    summary: expl || speech,
    orbit: {
      title: payload.title,
      explanation: expl,
      imageUrl: imageUrl || undefined,
      date: payload.date ?? base ?? "",
      credit: payload.copyright
    }
  });
}
