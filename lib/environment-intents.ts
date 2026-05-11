/** Voice / intent helpers for colony weather docks and clock workspace. */

export function wantsWeatherOrchestration(text: string): boolean {
  return /\b(weather|temperature|forecast|humidity|\brain\b|\bsnow\b|wind chill)\b/i.test(text.trim());
}

/** Local news / headline stack (built-in Hacker News API). */
export function wantsNewsOrchestration(text: string): boolean {
  const n = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (!n) return false;
  return (
    /\b(headlines|breaking\s+news|hacker\s*news|(^|\s)hn(\s|$))\b/u.test(n) ||
    /\b(top\s+(news|stories)|latest\s+news|news\s+today|news\s+update)\b/u.test(n) ||
    /\b(show|tell|give|fetch|get)\b.{0,32}\b(the\s+)?news\b/u.test(n) ||
    /\bread\s+(aloud\s+)?((me\s+)?(the\s+)?)((top\s+three|three|latest)\s+)?(news|headlines)\b/u.test(n) ||
    /\bread\s+(the\s+)?news\b|\bnews\s+(read|out\s+loud)\b/u.test(n) ||
    /\bwhat'?s\s+happening\b/u.test(n)
  );
}

export function extractWeatherCityQuery(text: string): string | undefined {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!wantsWeatherOrchestration(trimmed)) return undefined;
  const raw =
    trimmed.match(/\b(?:in|for|at)\s+([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s.'-]{1,52})(?:\s*[?.]|$|,)/iu)?.[1] ??
    trimmed.match(/\bweather\s+(?:for|at)\s+([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s.'-]{1,52})/iu)?.[1];

  const city = raw?.replace(/\s+weather$/iu, "").trim();
  return city?.length ? city : undefined;
}

export function wantsClockDeskOrchestration(text: string): boolean {
  const n = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (!n) return false;

  /* Spoken confirmations / echoes (e.g. TTS “Alarm saved for 07:00”) must NOT re-enter clock mode or stack duplicate alarms. */
  if (
    /\balarm\s+saved\b|\bsaved\s+for\b|\balarm\s+ring(?:s|ing)\b|\balarm\s+sounding\b|\bring(?:ing|\s+a)?\s+alarm\b/.test(text) ||
    /\b(timer|minute|second|hour)\s+timer\s+armed\b|\btimer\s+(?:done|finished)\b|\bcountdown\s+finished\b/.test(text)
  ) {
    return false;
  }

  return (
    /\b(?:set|create|schedule|add)\s+(?:an?\s+)?alarm\b/.test(n) ||
    /\b(?:wake\s+me(?:\s+up)?|remind\s+me\s+(?:at|in))\b/.test(n) ||
    /\balarm\b[^\n]{0,28}\b(?:for|at)\b/.test(n) ||
    /\b(stopwatch\b|countdown\b|\btimer\b)/.test(n)
  );
}

export function stickyNoteVoiceAction(text: string): "append" | "list" | "clear" {
  const n = text.trim().toLowerCase();
  if (/\bclear\b.{0,20}\bnote|\b(scratch|sticky)\s+pad\s+clear\b|\bdelet(e|ed)\s+all\s+(my\s+)?notes\b|\b(blank)\s+(the\s+)?notes\b/u.test(n)) return "clear";
  if (
    /\b(show|read|pull\s+up|open|preview|give\s+me)\b[^\n]{0,40}\b(sticky\s+notes?|scratch\s+(pad|notes))\b|\bwhat\s+did\s+i\s+jot\b/u.test(n) ||
    /\blist\b.{0,20}\b(note|sticky)\b/u.test(n)
  ) {
    return "list";
  }
  return "append";
}

export function wantsStickyNoteOrchestration(text: string): boolean {
  const n = text.replace(/\s+/gu, " ").trim().toLowerCase();
  if (!n) return false;
  if (stickyNoteVoiceAction(text) !== "append") return true;
  return (
    /\b(sticky\s+note|sticky\s+pad|scratch\s+pad)\b/u.test(n) ||
    /\bjot\s+down\b/u.test(n) ||
    /\bremember\s+(this|that|to)\b/u.test(n) ||
    /\btake\s+(a\s+)?note\b/u.test(n) ||
    /\bremind\s+me\s+(?:that|not\s+to)\b/u.test(n) ||
    /^note[:\s]/iu.test(text.trim())
  );
}

/** Text after jot/remember/note prefix for append flow. */
export function extractStickyNoteAppendBody(raw: string): string {
  const t = raw.trim();
  return t
    .replace(/^(vee[,:\s-]*)/gi, "")
    .replace(/\b(remind\s+me\s+(?:that|to))\s+[,:]?\s*/gi, "")
    .replace(/\b(jot\s+down|sticky\s+note|take\s+a\s+note|remember\s+this)[,:]\s*/gi, "")
    .replace(/^note[:\s]+/iu, "")
    .trim()
    .slice(0, 620);
}

export function wantsMapsOrchestration(text: string): boolean {
  const n = text.trim().toLowerCase();
  if (!n) return false;
  return (
    /\b(map\b|maps\b|coordinates\b|\blatitude\b|\blocate\b|\broute\b|\bnavi(gate)?\s+to\b)/u.test(n) ||
    /\b(show|plot|bring\s+up|pin)\s+.{0,18}\batlas\b/u.test(n) ||
    /\bwhere\s+(?:is|'s)\b[^\n]{4,}(?!\b(?:the\s+)?(?:time|forecast|temperature)\b)/u.test(n)
  );
}

/** Human place string for atlas (skip leading “show me a map”). */
export function extractMapsPlaceQuery(raw: string): string {
  let s = raw
    .trim()
    .replace(/^(hey\s+)?vee[,:\s-]*/gi, "")
    .replace(/\b(can you|please|could you)\s+/gi, "")
    .replace(/\b(plot|pin|bring\s+up|pull\s+up|show\s+me|open)\s+(a\s+|the\s+)?(map\s+)?(of\s+)?/gi, "")
    .replace(/\b(map\s+)?(for|of)\s+/gi, " ")
    .replace(/\b(where\s+(is|'s))\s+/gi, "")
    .replace(/\b(atlas|navigator)\s+/gi, "")
    .replace(/^[,.:\s\-]+/, "")
    .replace(/[.?]+$/gu, "")
    .trim();

  const q = s.slice(0, 180).trim();
  return q.length >= 2 ? q : "";
}

export function wantsScoutOrchestration(text: string): boolean {
  const n = text.trim().toLowerCase();
  if (
    /\b(inbox|relay|notifications?|agents?\s+online|registered\s+agents|read\s+me\s+(my\s+)?mail)\b/u.test(n) ||
    /\b(send|broadcast)\b[^\n]{0,24}\b(message|relay)\b/u.test(n)
  ) {
    return false;
  }
  return (
    /^tell\s+me\s+about\b/u.test(n) ||
    /^who\s+(is|'s)\b/u.test(n) ||
    /\bwiki(pedia)?\b|\bscout\s+wiki\b|^lookup\b/u.test(n)
  );
}

/** Topic string for encyclopedia synopsis. */
/** Public page snapshot · built-in browse_page (+ optional Firecrawl key). Requires explicit scrape/read/browse phrasing unless a bare https URL is present. */
export function wantsBrowseOrchestration(text: string): boolean {
  return Boolean(extractBrowseUrl(text));
}

export function extractBrowseUrl(raw: string): string | undefined {
  const spaced = raw.replace(/\s+/g, " ").trim();

  const direct = spaced.match(/https?:\/\/[^\s<>"')\]]+/i);
  if (direct?.[0]) {
    const u = direct[0].replace(/[),.;]+$/, "").replace(/[<>'"]+$/, "").trim();
    const cues =
      /\b(browse|scrape|snapshot|firecrawl|summari[sz]e|read\b|peek|pull\b|grab\b|capture|open\b|preview|page|article|link|url)\b/i.test(
        spaced
      );
    if (cues) return u;

    /* Standalone pasted article links still route here when they're clearly editorial paths. */
    if (/\/[^\s]+\.(html?|php|md)(?:\s|$|[?])/i.test(u) || /\b(?:\/news\/|\/article\/|\/blog\/|medium\.com|substack\.com|nytimes\.com|theguardian\.com|arstechnica\.com)/i.test(u)) {
      return u;
    }
    return undefined;
  }

  if (
    !/\b(browse|scrape|snapshot|firecrawl|summari[sz]e|read\s+(?:the\s+|this\s+|that\s+|me\s+)?(?:page|article|site)|pull\s+(?:down\s+)?(?:the\s+)?page|open\s+(?:the\s+|this\s+|that\s+)?(?:page|link|article))\b/ui.test(
      spaced.toLowerCase()
    )
  ) {
    return undefined;
  }

  const host = spaced.match(/\b(?:https?:\/\/)?([\w.-]+\.[a-z]{2,})(?:\/|\s|,|[?]|$)/i)?.[1];
  if (!host) return undefined;
  return `https://${host.replace(/^www\./i, "")}`;
}

export function extractWikiScoutQuery(raw: string): string {
  let s = raw
    .trim()
    .replace(/^(hey\s+)?vee[,:\s-]*/gi, "")
    .replace(/\b(can you|please|could you|just)\s+/gi, "")
    .replace(/\wikipedia\s+tell\s+me\s+about\b/gi, " ")
    .replace(/\b(tell\s+me\s+about|look\s*(?:ing)?\s*up|wiki\s*pedia|wiki)\b[:\s]+/gi, "")
    .replace(/^who\s+(is|'s)\s+/i, "")
    .replace(/^scout\s+/i, "")
    .replace(/^[,.:\s\-]+/, "")
    .replace(/[?]+$/gu, "")
    .trim();

  const q = s.slice(0, 220).trim();
  return q.length >= 2 ? q : "";
}

export function wantsOrbitOrchestration(text: string): boolean {
  const n = text.trim().toLowerCase();
  return (
    /\b(apod|astronomy\s+picture\s+of\s+the\s+day|picture\s+of\s+the\s+day)\b/u.test(n) ||
    /\b(telescope\s+feed|orbit\s+(deck|rig)|space\s+(photo|snapshot|picture)|cosmic\s+vista)\b/u.test(n) ||
    /\b(andromeda|orion\b|milky\s+way|galaxy|nebula|black\s+hole|supernova|quasar)\b/u.test(n) ||
    /\b(show|today'?s)\s+nasa\b|\bnasa\b.{0,40}\bpicture\b/u.test(n)
  );
}

export function extractApodCalendarDate(text: string): string | undefined {
  const iso = /\b(19|20)\d{2}-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01])\b/.exec(text);
  return iso?.[0];
}

export function extractTimerDurationSec(text: string): number | undefined {
  const n = text.trim().toLowerCase();
  let sec = 0;
  const hMatch = /\b(\d+)\s*(?:hours?|hrs?)\b/.exec(n);
  const mMatch = /\b(\d+)\s*(?:minutes?|mins?)\b/.exec(n);
  const sMatch = /\b(\d+)\s*(?:seconds?|secs?)\b/.exec(n);
  if (hMatch) sec += Number(hMatch[1]) * 3600;
  if (mMatch) sec += Number(mMatch[1]) * 60;
  if (sMatch) sec += Number(sMatch[1]);
  if (sec === 0) {
    const bare = /\b(\d+)\s*(?:minute|min)\b(?![a-z])/i.exec(n);
    if (bare) sec = Number(bare[1]) * 60;
  }
  return sec > 0 && sec <= 86400 ? sec : undefined;
}

/** Naive HH:MM with optional am/pm when utterance mentions alarm/remind/at. */
export function extractAlarmHm(text: string): { hour24: number; minute: number } | undefined {
  if (!/\b(alarm|remind|wake|at\b)/i.test(text)) return undefined;
  if (
    /\balarm\s+saved\b|\bsaved\s+for\b|\bopened\s+(?:timers|the\s+clock)\b|\balarm\s+ring(?:s|ing)\b|\bclock\s+[·.]?\s*alarms\b/i.test(text)
  ) {
    return undefined;
  }

  const m = /\b(\d{1,2})\s*:?\s*(\d{2})?\s*(am|pm)?\b/i.exec(text.trim().toLowerCase());
  if (!m) return undefined;
  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;
  if (hour > 23 || minute > 59) return undefined;
  const suffix = (m[3] as string | undefined)?.toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (!suffix && hour <= 23) {
    /* keep 24h as spoken if no am/pm */
  }
  return { hour24: hour % 24, minute: minute % 60 };
}
