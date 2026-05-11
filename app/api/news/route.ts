import { NextResponse } from "next/server";
import type { NewsHeadlineDto } from "@/lib/news-format";
import { formatNewsSpeech, formatNewsSummaryLines } from "@/lib/news-format";

export const runtime = "nodejs";

type HnItem = { title?: string; url?: string; score?: number; type?: string } | null;

async function hnItem(id: number): Promise<NewsHeadlineDto | null> {
  const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const data = (await res.json()) as HnItem;
  if (!data || data.type !== "story" || !data.title) return null;
  return {
    title: String(data.title),
    url: typeof data.url === "string" && data.url.startsWith("http") ? data.url : `https://news.ycombinator.com/item?id=${id}`,
    source: "HN",
    score: typeof data.score === "number" ? data.score : undefined
  };
}

export async function GET() {
  try {
    const topRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { next: { revalidate: 120 } });
    if (!topRes.ok) {
      return NextResponse.json({ error: "HN unreachable", items: [], speech: "Couldn’t reach Hacker News right now." }, { status: 502 });
    }

    const ids = (await topRes.json()) as number[];
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "bad payload", items: [], speech: "News index looks wrong — try soon." }, { status: 502 });
    }

    const slice = ids.slice(0, 18);
    const rows = await Promise.all(slice.map((id) => hnItem(id)));
    const items = rows.filter((x): x is NewsHeadlineDto => Boolean(x && x.title)).slice(0, 10);

    const speech = formatNewsSpeech(items, "Hacker News");
    const summary = formatNewsSummaryLines(items);

    return NextResponse.json({
      title: "Headlines · Hacker News",
      items,
      speech,
      summary
    });
  } catch {
    return NextResponse.json({ error: "unexpected", items: [], speech: "News request failed unexpectedly." }, { status: 500 });
  }
}
