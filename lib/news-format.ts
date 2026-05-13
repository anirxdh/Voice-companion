export type NewsHeadlineDto = {
  title: string;
  url?: string;
  source?: string;
  score?: number;
};

const MAX_VOICE_TITLE = 116;


function titleForSpeech(raw: string, maxLen = MAX_VOICE_TITLE): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(40, maxLen - 1)).trim()}…`;
}

/** Conversational narrator: reads the top stories aloud plus a gentle “want more?” close. */
export function formatNewsSpeech(items: NewsHeadlineDto[], sourceLabel = "Hacker News"): string {
  const top = items.slice(0, 3);
  if (!top.length) {
    return "I couldn’t grab any headlines just now—the feed blinked empty. Shall we retry in a moment?";
  }

  const t1 = titleForSpeech(top[0]?.title ?? "");
  const t2 = top[1] ? titleForSpeech(top[1].title) : "";
  const t3 = top[2] ? titleForSpeech(top[2].title) : "";

  let body: string;
  if (top.length === 1) {
    body = `Here’s the lead from ${sourceLabel}: ${t1}`;
  } else if (top.length === 2) {
    body = `Alright—the top two from ${sourceLabel}. First: ${t1}. Next: ${t2}`;
  } else {
    body = `Here are three fresh ones from ${sourceLabel}. Coming in first: ${t1}. Second: ${t2}. And third: ${t3}`;
  }

  const hasMoreDeck = items.length > 3;
  const closing = hasMoreDeck
    ? "The rest are on your news ribbon when you glance down—want another batch read out, or pause here?"
    : "They’re queued on-screen if you want the links—feel like deeper context on any of those, or are we good for now?";

  return `${body}. ${closing}`;
}

/** Compact multi-line slab for previews / MCP detail (still shows more rows than voice reads). */
export function formatNewsSummaryLines(items: NewsHeadlineDto[]): string {
  return items.map((h, i) => `${i + 1}. ${h.title}${h.url ? ` · ${h.url}` : ""}`).join("\n");
}
