import type { MediaPreview } from "@/types/supernova";
import { messageMcpEndpoint, musicMcpEndpoint, urlsMatch, youtubeVideoMcpEndpoint } from "@/lib/mcp-endpoints";
import { isVeilBuiltinServerUrl } from "@/lib/mcp-builtin";

type MCPToolOutput = {
  content?: Array<{ type?: string; text?: string }>;
  structuredContent?: {
    title?: string;
    artist?: string;
    album?: string;
    coverUrl?: string;
    previewUrl?: string;
    videoUrl?: string;
    embedUrl?: string;
    videoId?: string;   
    thumbnail?: string; 
    author?: string;    
    deezerUrl?: string;
    audiusUrl?: string;
    newsItems?: Array<{ title: string; url?: string; source?: string; score?: number }>;
    stickyNotes?: Array<{ id: string; text: string; createdAt?: string }>;
    summaryLines?: string;
    mapEmbedUrl?: string;
    mapLat?: number;
    mapLon?: number;
    mapLabel?: string;
    mapQuery?: string;
    scoutQuery?: string;
    scoutTitle?: string;
    scoutExtract?: string;
    scoutUrl?: string;
    scoutThumbUrl?: string;
    orbitTitle?: string;
    orbitExplanation?: string;
    orbitImageUrl?: string;
    orbitDate?: string;
    orbitCredit?: string;
    browseUrl?: string;
    browseMarkdown?: string;
    browseSource?: "firecrawl" | "plain";
    browseSummarySlice?: string;
  };
};

function shortToolDisplayName(toolName?: string): string | undefined {
  if (!toolName?.trim()) return undefined;
  const base = toolName.includes("__") ? toolName.slice(toolName.indexOf("__") + 2) : toolName;
  return base.replace(/-/gu, " ");
}


function messagePreviewTitle(toolName: string | undefined, structuredTitle: string | undefined, extractedTitle: string, body: string): string {
  const st = structuredTitle?.trim();
  if (st) return st;
  const slug = shortToolDisplayName(toolName)?.toLowerCase() ?? "";
  if (/\bread-inbox\b/u.test(slug)) return "Agent inbox";
  if (/\blist-agents\b/u.test(slug)) return "Registered agents";
  if (/\bsend-message\b/u.test(slug)) return "Message sent";
  if (/\bbroadcast\b/u.test(slug)) return "Broadcast";
  if (/\bregister\b/u.test(slug)) return "Agent registered";
  if (/\bunread-count\b/u.test(slug)) return "Unread count";
  if (/\bcheck-notifications\b/u.test(slug)) return "Notifications";
  if (/\bview-profile\b/u.test(slug)) return "Agent profile";
  if (/\bupdate-profile\b/u.test(slug)) return "Profile updated";
  const ex = extractedTitle?.trim();
  if (ex) return ex;
  const firstLine = body.split(/\r?\n/).find((l) => l.trim())?.trim();
  if (firstLine && firstLine.length <= 120) return firstLine;
  return "Agent messaging";
}

function hostnameKey(serverUrl?: string): string | undefined {
  if (!serverUrl) return undefined;
  try {
    return new URL(serverUrl).hostname.split(".")[0]?.toLowerCase();
  } catch {
    return undefined;
  }
}


export function inferPreviewKind(toolName: string, opts?: { serverUrl?: string }): MediaPreview["kind"] {
  const slug = toolName.toLowerCase();
  const msgUrl = messageMcpEndpoint();

  if (msgUrl && opts?.serverUrl && urlsMatch(opts.serverUrl, msgUrl)) {
    return "message";
  }

  if (
    /\b(register|send-message|read-inbox|list-agents|broadcast|unread-count|check-notifications|view-profile|update-profile)\b/.test(
      slug
    )
  ) {
    return "message";
  }

  const yt = youtubeVideoMcpEndpoint();
  const mu = musicMcpEndpoint();
  const srv = opts?.serverUrl ?? "";

  if (srv && yt && urlsMatch(srv, yt)) return "youtube";
  if (srv && mu && urlsMatch(srv, mu)) return "music";

  const hostFirst = hostnameKey(srv);
  if (hostFirst?.includes("still") && hostFirst.includes("thunder")) return "youtube";
  if (hostFirst?.includes("young") && hostFirst.includes("surf")) return "music";
  if (hostFirst?.includes("summer") && hostFirst.includes("poetry")) return "voice";

  if (isVeilBuiltinServerUrl(srv) && slug === "headlines") return "newsdesk";
  if (isVeilBuiltinServerUrl(srv) && slug === "sticky_note") return "notesdesk";
  if (isVeilBuiltinServerUrl(srv) && slug === "maps_place") return "mapdesk";
  if (isVeilBuiltinServerUrl(srv) && slug === "browse_page") return "browsedesk";
  if (isVeilBuiltinServerUrl(srv) && slug === "wiki_scout") return "scoutdesk";
  if (isVeilBuiltinServerUrl(srv) && slug === "orbit_apod") return "orbitdesk";

  if (/youtube|youtu|video|subtitle|playlist|shorts/i.test(slug)) return "video";
  if (/music|song|track|deezer|audius|spotify/i.test(slug)) return "music";
  
  return "video";
}

const YOUTUBE_IN_TEXT =
  /https?:\/\/(?:www\.|m\.|music\.)?youtube\.com\/[^\s"'<>]+|https?:\/\/youtu\.be\/[^\s"'<>]+/iu;


export function extractYoutubeUrlFromText(text?: string): string | undefined {
  if (!text?.trim()) return undefined;
  const m = text.match(YOUTUBE_IN_TEXT);
  return m?.[0]?.replace(/[),.;]+$/u, "").replace(/[<>'"]+$/, "").trim();
}


export function youtubeEmbedIframeSrc(embedUrl: string): string {
  const t = embedUrl.trim();
  if (!/youtube(?:-nocookie)?\.com\/embed\//i.test(t)) return t;
  const sep = t.includes("?") ? "&" : "?";
  return `${t}${sep}rel=0&modestbranding=1&playsinline=1&autoplay=1`;

}
export function normalizeMediaPreview(
  output: unknown,
  kind: MediaPreview["kind"],
  spokenText?: string,
  mcpToolName?: string
): MediaPreview | null {
  const toolOutput = output as MCPToolOutput | undefined;
  const structured = toolOutput?.structuredContent;
  const text = extractText(toolOutput);
  if (/no results found/i.test(text)) {
    return null;
  }

  const body = text?.trim() ?? "";

  const title =
    kind === "message"
      ? messagePreviewTitle(mcpToolName, structured?.title, extractTitle(toolOutput), body)
      : structured?.title || extractTitle(toolOutput) || (kind === "voice" ? "Voice response" : "Media preview");

  // YouTube MCP returns videoId in structuredContent; build watch + embed from it
  const ytWatchFromId = structured?.videoId
    ? `https://www.youtube.com/watch?v=${structured.videoId}`
    : undefined;
  const ytEmbedFromId = structured?.videoId
    ? `https://www.youtube-nocookie.com/embed/${structured.videoId}`
    : undefined;

  const preview: MediaPreview = {
    kind,
    title,
    artist: structured?.artist ?? structured?.author,
    album: structured?.album,
    coverUrl: structured?.coverUrl ?? structured?.thumbnail,
    previewUrl: structured?.previewUrl,
    videoUrl: ytWatchFromId ?? structured?.videoUrl ?? structured?.deezerUrl ?? structured?.audiusUrl,
    embedUrl: ytEmbedFromId ?? structured?.embedUrl,
    deezerUrl: structured?.deezerUrl,
    audiusUrl: structured?.audiusUrl,
    summary: body || undefined,
    spokenText,
    ...(kind === "message" ? { mcpToolName } : {})
  };

  if (kind === "newsdesk") {
    const rawItems = structured?.newsItems;
    const items =
      Array.isArray(rawItems) && rawItems.length
        ? rawItems
            .filter((x) => x && typeof x.title === "string")
            .map((x) => ({
              title: x.title.trim(),
              url: typeof x.url === "string" ? x.url : undefined,
              source: typeof x.source === "string" ? x.source : undefined,
              score: typeof x.score === "number" ? x.score : undefined
            }))
        : [];
    preview.news = items;
    if (structured?.title?.trim()) preview.title = structured.title.trim();
    if (!preview.summary?.trim()) {
      preview.summary = items.length ? items.map((row, idx) => `${idx + 1}. ${row.title}`).slice(0, 10).join("\n") : body;
    }
    if (!items.length && !preview.summary?.trim()) return null;
    return preview;
  }

  if (kind === "notesdesk") {
    const raw = structured?.stickyNotes;
    const notes =
      Array.isArray(raw) && raw.length
        ? raw
            .filter((x) => x && typeof x.id === "string" && typeof x.text === "string")
            .map((x) => ({
              id: x.id,
              text: x.text.trim(),
              createdAt: typeof x.createdAt === "string" ? x.createdAt : ""
            }))
        : [];
    preview.stickyNotes = notes;
    if (structured?.title?.trim()) preview.title = structured.title.trim();
    const lines =
      typeof structured?.summaryLines === "string" && structured.summaryLines.trim().length ? structured.summaryLines : "";
    preview.summary = [body, lines, preview.summary].find((segment) => segment && segment.trim()) || undefined;

    const hasAnything = Boolean(notes.length || preview.summary?.trim());
    if (!hasAnything) return null;
    return preview;
  }

  if (kind === "mapdesk") {
    const iframe = structured?.mapEmbedUrl?.trim();
    if (!iframe) return null;
    preview.mapEmbedUrl = iframe;
    const labelPack = structured?.mapLabel ?? structured?.mapQuery ?? "";
    preview.summary = preview.summary ?? (typeof labelPack === "string" ? labelPack : undefined);
    if (structured?.title?.trim()) preview.title = structured.title.trim();
    return preview;
  }

  if (kind === "browsedesk") {
    const href = typeof structured?.browseUrl === "string" ? structured.browseUrl.trim() : "";
    const md = typeof structured?.browseMarkdown === "string" ? structured.browseMarkdown.trim() : "";
    const slice = typeof structured?.browseSummarySlice === "string" ? structured.browseSummarySlice.trim() : "";
    if (!href && !md) return null;
    const source = structured?.browseSource === "firecrawl" ? "firecrawl" : "plain";
    preview.browseBrief = {
      url: href || "",
      markdown: md || slice || body.trim(),
      source,
      title: typeof structured?.title === "string" ? structured.title : undefined
    };
    preview.summary = slice || preview.summary || md.slice(0, 800) || body || undefined;
    if (structured?.title?.trim()) preview.title = structured.title.trim();
    return preview;
  }

  if (kind === "scoutdesk") {
    const tit = structured?.scoutTitle?.trim();
    const ex = structured?.scoutExtract?.trim();
    if (!tit && !ex && !body.trim()) return null;
    preview.scoutBrief = {
      query: String(structured?.scoutQuery ?? "").trim(),
      title: tit ?? "Wikipedia scout",
      extract: ex || body.trim(),
      pageUrl: typeof structured?.scoutUrl === "string" ? structured.scoutUrl : undefined,
      thumbUrl: typeof structured?.scoutThumbUrl === "string" ? structured.scoutThumbUrl : undefined
    };
    if (preview.scoutBrief.thumbUrl) preview.coverUrl = preview.scoutBrief.thumbUrl;
    preview.summary = ex || body || undefined;
    if (structured?.title?.trim()) preview.title = structured.title.trim();
    return preview;
  }

  if (kind === "orbitdesk") {
    const tit = structured?.orbitTitle?.trim();
    const ex = structured?.orbitExplanation?.trim();
    const img = typeof structured?.orbitImageUrl === "string" ? structured.orbitImageUrl.trim() : "";
    if (!tit && !ex && !img) return null;
    preview.orbitBrief = {
      title: tit ?? "Orbit observatory",
      explanation: ex || body.trim(),
      imageUrl: img || undefined,
      date: typeof structured?.orbitDate === "string" ? structured.orbitDate : undefined,
      credit: typeof structured?.orbitCredit === "string" ? structured.orbitCredit : undefined
    };
    preview.coverUrl = img || preview.coverUrl;
    preview.summary = ex || body || undefined;
    if (structured?.title?.trim()) preview.title = structured.title.trim();
    return preview;
  }

  const fromTextYt = extractYoutubeUrlFromText(text);

  const rawYtCandidate = preview.embedUrl || preview.videoUrl || ((kind === "video" || kind === "youtube") ? fromTextYt : undefined);
  const ytEmb = rawYtCandidate ? toEmbedUrl(rawYtCandidate.trim()) : undefined;
  if (ytEmb && /youtube(?:-nocookie)?\.com\/embed\//i.test(ytEmb)) {
    preview.embedUrl = ytEmb;
    preview.videoUrl = preview.videoUrl || rawYtCandidate || ytEmb;
  } else if ((kind === "video" || kind === "youtube") && !preview.embedUrl && !toEmbedUrl(preview.videoUrl) && fromTextYt) {
    preview.videoUrl = fromTextYt;
    const bounced = toEmbedUrl(fromTextYt);
    if (bounced && /youtube(?:-nocookie)?\.com\/embed\//i.test(bounced)) {
      preview.embedUrl = bounced;
      preview.videoUrl = preview.videoUrl || fromTextYt;
    }
  }

  const hasAnyUrl = Boolean(
    preview.previewUrl || preview.videoUrl || preview.embedUrl || preview.deezerUrl || preview.audiusUrl
  );
  const hasSummary = Boolean(preview.summary && preview.summary.trim());

  if (kind === "message") {
    if (!hasSummary && !structured?.title && !extractTitle(toolOutput)) {
      return null;
    }
    return preview;
  }

  if (!hasAnyUrl && !hasSummary) {
    return null;
  }

  return preview;
}

function extractText(output?: MCPToolOutput) {
  return output?.content?.map((item) => item.text).filter(Boolean).join(" ").trim() || "";
}

function extractTitle(output?: MCPToolOutput) {
  const text = extractText(output);
  if (!text) return "";
  const match = text.match(/(?:Now playing|Playing|▶)\s*:\s*(.+?)(?:\s*\(|$)/i);
  return match?.[1]?.trim() ?? "";
}

export function toEmbedUrl(url?: string): string | undefined {
  if (!url?.trim()) return undefined;
  const raw = url.trim().replace(/^\/\//u, "https://");

  const embedBare = /^https?:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/iu.exec(raw);
  if (embedBare?.[1]) {
    const base = embedBare[0].split("?")[0];
    try {
      const u = new URL(raw.startsWith("http") ? raw : `https:${raw}`);
      const list = u.searchParams.get("list");
      if (list) return `${base}?list=${encodeURIComponent(list)}`;
    } catch {
      /* keep base */
    }
    return base;
  }

  let u: URL;
  try {
    u = new URL(raw.startsWith("http") ? raw : `https://${raw.replace(/^\/+/, "")}`);
  } catch {
    const fromQuery = raw.match(/[?&]v=([A-Za-z0-9_-]{11}|[A-Za-z0-9_-]{6,})/u)?.[1];
    if (fromQuery) return `https://www.youtube.com/embed/${fromQuery}`;
    return raw;
  }

  const host = u.hostname.replace(/^www\./iu, "").toLowerCase();
  const onYoutubeFamily =
    host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com" || host === "youtu.be";

  let videoId =
    u.searchParams.get("v") ??
    (/^\/embed\/([A-Za-z0-9_-]{6,})\/?$/iu.exec(u.pathname)?.[1]) ??
    (/^\/shorts\/([A-Za-z0-9_-]+)/iu.exec(u.pathname)?.[1]) ??
    (/^\/live\/([A-Za-z0-9_-]{6,})/iu.exec(u.pathname)?.[1]);

  if (!videoId && host === "youtu.be") {
    videoId = /^\/([A-Za-z0-9_-]{6,})/iu.exec(u.pathname)?.[1];
  }

  if (!videoId || !onYoutubeFamily) {
    const legacy =
      raw.match(/[?&]v=([A-Za-z0-9_-]{11}|[A-Za-z0-9_-]{6,})/u)?.[1] ??
      raw.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/iu)?.[1] ??
      raw.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/iu)?.[1];
    return legacy ? `https://www.youtube.com/embed/${legacy}` : raw;
  }

  const baseHost = host === "youtube-nocookie.com" ? "https://www.youtube-nocookie.com/embed/" : "https://www.youtube.com/embed/";
  const list = u.searchParams.get("list");
  const base = `${baseHost}${videoId}`;
  return list ? `${base}?list=${encodeURIComponent(list)}` : base;
}

export function pickBackdropForPreview(kind: MediaPreview["kind"]) {
  return kind === "video" || kind === "youtube"
    ? "/backgrounds/night-video-reference.png"
    : "/backgrounds/colony-office-3d.png";
}
