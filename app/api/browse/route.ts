import { NextRequest, NextResponse } from "next/server";
import { assertPublicHttpUrl } from "@/lib/public-http-url";
import { htmlToPlainDocument } from "@/lib/html-to-plain";

export const runtime = "nodejs";

const UA = "VEIL-Colony/1.0 (browse snapshot; +https://github.com/)";

type FirecrawlScrapeResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    metadata?: { title?: string; description?: string; sourceURL?: string };
  };
  error?: string;
};

function pickFirecrawlMarkdown(payload: unknown): { markdown: string; title?: string } {
  const p = payload as FirecrawlScrapeResponse;
  const md = typeof p?.data?.markdown === "string" ? p.data.markdown.trim() : "";
  const title =
    typeof p?.data?.metadata?.title === "string" && p.data.metadata.title.trim()
      ? p.data.metadata.title.trim()
      : undefined;
  return { markdown: md, title };
}

async function fetchViaFirecrawl(url: string, apiKey: string): Promise<{ markdown: string; title?: string }> {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true
    }),
    cache: "no-store"
  });

  const json = (await res.json().catch(() => ({}))) as FirecrawlScrapeResponse & { message?: string };

  if (!res.ok) {
    const msg = json.error || json.message || `Firecrawl HTTP ${res.status}`;
    throw new Error(msg);
  }

  const picked = pickFirecrawlMarkdown(json);
  if (!picked.markdown) {
    throw new Error("Firecrawl returned no markdown for that page");
  }

  return picked;
}

async function fetchPlain(url: string): Promise<{ text: string; title?: string }> {
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"
    },
    redirect: "follow",
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Direct fetch failed (${res.status})`);
  }

  const ct = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  if (!/html|text\/plain|xml/i.test(ct) && !/<\s*html[\s>]/iu.test(raw.slice(0, 400))) {
    throw new Error("That URL is not HTML or plain text — try a normal web article.");
  }

  const titleMatch = raw.match(/<title[^>]*>([^<]{1,200})<\/title>/iu);
  const title = titleMatch?.[1]?.replace(/\s+/g, " ")?.trim();

  return { text: htmlToPlainDocument(raw), title };
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "url_required", speech: "Pass a full https link to browse." }, { status: 400 });
  }

  let u: URL;
  try {
    u = assertPublicHttpUrl(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bad URL";
    return NextResponse.json({ error: "bad_url", speech: msg }, { status: 400 });
  }

  const href = u.toString();
  const key = process.env.FIRECRAWL_API_KEY?.trim();

  try {
    if (key) {
      const { markdown, title } = await fetchViaFirecrawl(href, key);
      const clipped = markdown.length > 14000 ? `${markdown.slice(0, 14000).trim()}…` : markdown;
      const speech = `${title ? `${title}. ` : ""}Pulled a clean markdown slice via Firecrawl — it’s on the browser strip.`.slice(0, 520);
      return NextResponse.json({
        title: title ?? u.hostname,
        url: href,
        markdown: clipped,
        source: "firecrawl" as const,
        speech,
        summary: clipped.slice(0, 1800)
      });
    }

    const { text, title } = await fetchPlain(href);
    const speech = `${title ? `${title}. ` : ""}Fetched the page without Firecrawl (add FIRECRAWL_API_KEY for richer cleaning).`.slice(0, 520);
    return NextResponse.json({
      title: title ?? u.hostname,
      url: href,
      markdown: text,
      source: "plain" as const,
      speech,
      summary: text.slice(0, 1800)
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Browse failed";
    return NextResponse.json({ error: "browse_failed", speech: msg, url: href }, { status: 502 });
  }
}
