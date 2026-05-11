import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UA = "VEIL-Colony/1.0 (assistant; wikipedia scout)";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("query")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "query_required", speech: "Say what topic to scout on Wikipedia." }, { status: 400 });
  }

  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(
    q
  )}&srlimit=1`;

  const sRes = await fetch(searchUrl, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!sRes.ok) {
    return NextResponse.json({ error: "scout_search_failed", speech: "Wiki scout stalled—retry." }, { status: 502 });
  }

  const sJson = (await sRes.json()) as { query?: { search?: Array<{ title: string }> } };
  const title = sJson.query?.search?.[0]?.title;
  if (!title) {
    return NextResponse.json({
      speech: `No scout hit on Wikipedia for “${q}”.`,
      title: `Scout · ${q}`,
      scout: null,
      summary: ""
    });
  }

  const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
    headers: { "User-Agent": UA },
    cache: "no-store"
  });

  if (!summaryRes.ok) {
    return NextResponse.json({ error: "scout_detail_failed", speech: "Got a title but couldn't load the synopsis." }, { status: 502 });
  }

  const detail = (await summaryRes.json()) as {
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
    thumbnail?: { source?: string };
  };

  const extract = typeof detail.extract === "string" ? detail.extract.trim() : "";
  const speech = extract ? `${extract.slice(0, 520)}${extract.length > 520 ? " …" : ""}` : `Found ${detail.title ?? title} on Wikipedia.`;

  return NextResponse.json({
    title: `Scout · ${detail.title ?? title}`,
    speech,
    summary: extract || speech,
    scout: {
      query: q,
      title: detail.title ?? title,
      extract,
      pageUrl: detail.content_urls?.desktop?.page,
      thumbUrl: detail.thumbnail?.source
    }
  });
}
