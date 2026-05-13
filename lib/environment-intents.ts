

export function wantsWeatherOrchestration(text: string): boolean {
  return /\b(weather|temperature|forecast|humidity|\brain\b|\bsnow\b|wind chill)\b/i.test(text.trim());
}


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
  if (
    /\bclear\b.{0,24}\bnotes?\b/u.test(n) ||
    /\b(delete|erase|wipe|remove|trash)\b.{0,28}\b(my\s+|all\s+|the\s+)?(sticky\s+)?notes?\b/u.test(n) ||
    /\b(scratch|sticky)\s+pad\s+clear\b/u.test(n) ||
    /\b(blank|empty)\s+(the\s+)?(sticky\s+)?notes?\b/u.test(n)
  ) return "clear";
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
  // Strip trailing punctuation so "Venice Beach, Los Angeles" commas don't break matching
  const n = text.trim().toLowerCase().replace(/[.,!?]+$/, "");
  if (!n) return false;

  const definiteMap =
    /\b(map\b|maps\b|coordinates\b|\blatitude\b|\blocate\b|\broute\b|\bnavi(gate)?\s+to\b)/u.test(n) ||
    /\b(show|plot|bring\s+up|pin)\s+.{0,18}\batlas\b/u.test(n) ||
    /\bwhere\s+(?:is|'s)\b[^\n]{4,}(?!\b(?:the\s+)?(?:time|forecast|temperature)\b)/u.test(n);

  if (definiteMap) return true;

  const nonMapKw = /\b(news|headlines|weather|forecast|video|youtube|music|notes?|alarm|timer|inbox|email|message|wiki|wikipedia|spotify|netflix|github|twitter|reddit|instagram|twitch|discord|photos?|pictures?|images?|update|settings?)\b/u;
  if (nonMapKw.test(n)) return false;

  // Allow commas in place names like "Venice Beach, Los Angeles"
  return /\b(show|find|locate|display|open)\s+(me\s+)?(the\s+|a\s+)?[a-z][a-z',\s-]{2,}$/u.test(n);
}


export function extractMapsPlaceQuery(raw: string): string {
  let s = raw
    .trim()
    .replace(/^(hey\s+)?vee[,:\s-]*/gi, "")
    .replace(/\b(can you|please|could you)\s+/gi, "")
    .replace(/\b(plot|pin|bring\s+up|pull\s+up|show(?:\s+me)?|find|locate|display|open)\s+(a\s+|the\s+)?(map\s+|atlas\s+|location\s+)?(of\s+|for\s+)?/gi, "")
    .replace(/\b(map\s+)?(for|of)\s+/gi, " ")
    .replace(/\b(where\s+(is|'s))\s+/gi, "")
    .replace(/\b(atlas|navigator)\s+/gi, "")
    .replace(/^[,.:\s\-]+/, "")
    .replace(/[,.?!]+$/gu, "")
    // Normalize mid-query commas: "Venice Beach, Los Angeles" → "Venice Beach Los Angeles"
    .replace(/,\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const q = s.slice(0, 180).trim();
  return q.length >= 2 ? q : "";
}


export function wantsDirectionsOrchestration(text: string): boolean {
  const n = text.trim().toLowerCase();
  if (!n) return false;
  return (
    /\b(how\s+long|travel\s+time|commute|how\s+far)\b.{0,60}\b(from|to)\b/u.test(n) ||
    /\b(directions?|route|get\s+there|navigate)\s+(from|to)\b/u.test(n) ||
    /\bfrom\b.{1,60}\bto\b.{1,60}\b(cab|taxi|car|drive|walk|bike|cycling|transit|bus|train|by\s+foot)\b/u.test(n) ||
    /\bhow\s+(do\s+i\s+)?get\s+(from|to)\b/u.test(n) ||
    /\b(cab|taxi|uber|lyft)\s+(from|to|ride)\b.{1,60}/u.test(n)
  );
}


export function extractDirectionsFromTo(text: string): { from: string; to: string } | undefined {
  const clean = text
    .trim()
    .replace(/^(hey\s+)?vee[,:\s-]*/gi, "")
    .replace(/\b(can you|please|could you|tell me|show me)\s+/gi, "")
    .replace(/\b(directions?|route|navigate|get\s+there|travel\s+time|how\s+long)\b[:\s]*/gi, "");

  
  const ft = clean.match(/\bfrom\b\s+(.+?)\s+\bto\b\s+(.+?)(?:\s+by\s+\w+|\s*[?.]|$)/iu);
  if (ft?.[1] && ft?.[2]) return { from: ft[1].trim(), to: ft[2].trim() };

  
  const xt = clean.match(/^(.{3,40}?)\s+to\s+(.{3,60}?)(?:\s+by\s+\w+|\s*[?.]|$)/iu);
  if (xt?.[1] && xt?.[2]) return { from: xt[1].trim(), to: xt[2].trim() };

  
  const dt = text.match(/\bdirections?\s+to\b\s+(.+?)(?:[?.]|$)/iu);
  if (dt?.[1]) return { from: "current location", to: dt[1].trim() };

  
  const ht = text.match(/\bget\s+to\b\s+(.+?)(?:[?.]|$)/iu);
  if (ht?.[1]) return { from: "current location", to: ht[1].trim() };

  return undefined;
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

/** Detects page-level browser interaction commands — only meaningful when a browser page is already open. */
export function wantsBrowserPageAction(text: string): boolean {
  const n = text.trim().toLowerCase();
  if (!n) return false;
  return (
    /\b(add|put)\s+.{1,60}\b(to\s+cart|in\s+cart|into\s+cart)\b/u.test(n) ||
    /\b(click|tap|press)\s+(on\s+)?\b(the\s+)?.{1,60}/u.test(n) ||
    /\b(type|enter|fill\s+in?|write)\s+.{1,60}/u.test(n) ||
    /\bscroll\s+(up|down|to\s+(top|bottom|end))\b/u.test(n) ||
    /\b(go\s+back|go\s+forward|browser\s+back|navigate\s+back)\b/u.test(n) ||
    /\b(press\s+enter|hit\s+enter|submit(\s+the\s+form)?)\b/u.test(n) ||
    /\b(refresh|reload)(\s+the\s+page)?\b/u.test(n) ||
    /\bselect\s+.{1,60}/u.test(n)
  );
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

const KNOWN_SITES: Record<string, string> = {
  google: "https://www.google.com",
  youtube: "https://www.youtube.com",
  github: "https://github.com",
  amazon: "https://www.amazon.com",
  twitter: "https://twitter.com",
  reddit: "https://www.reddit.com",
  wikipedia: "https://www.wikipedia.org",
  gmail: "https://mail.google.com",
  netflix: "https://www.netflix.com",
  spotify: "https://open.spotify.com",
  stackoverflow: "https://stackoverflow.com",
  linkedin: "https://www.linkedin.com",
  instagram: "https://www.instagram.com",
  twitch: "https://www.twitch.tv",
  discord: "https://discord.com",
  notion: "https://www.notion.so",
  figma: "https://www.figma.com",
};

/** Matches voice navigation intents — "open google", "go to github", "search for X on the web". */
export function wantsOpenBrowser(text: string): boolean {
  const n = text.replace(/\s+/g, " ").trim();
  return (
    /\b(open|go\s+to|navigate\s+to|visit|show\s+me|pull\s+up)\b.{0,60}\b[\w-]+\.(com|org|io|net|dev|app|co|gov|edu)\b/i.test(n) ||
    /\b(open|go\s+to|navigate\s+to|visit|show\s+me|pull\s+up|launch)\s+(google|youtube|github|amazon|twitter|reddit|wikipedia|gmail|netflix|spotify|stackoverflow|linkedin|instagram|twitch|discord|notion|figma)\b/i.test(n) ||
    /\b(search|find|look)\s+.{1,60}\s+on\s+(google|the\s+web|internet|browser)\b/i.test(n) ||
    /\b(open|launch|start)\s+(a\s+)?(web\s+)?browser\b/i.test(n)
  );
}

export function extractOpenBrowserUrl(text: string): string {
  const n = text.replace(/\s+/g, " ").trim();

  // Direct https URL
  const urlMatch = n.match(/https?:\/\/[^\s<>"')]+/i);
  if (urlMatch) return urlMatch[0].replace(/[),.;]+$/, "");

  // Domain pattern (e.g. "github.com/user")
  const domainMatch = n.match(/\b([\w-]+\.(?:com|org|io|net|dev|app|co|gov|edu)(?:\/[\w/?=&#.-]*)?)\b/i);
  if (domainMatch) return `https://${domainMatch[1]}`;

  
  const lower = n.toLowerCase();
  for (const [name, url] of Object.entries(KNOWN_SITES)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(lower)) return url;
  }

  // Web search: "search for X on google"
  const searchMatch = n.match(/\b(?:search|find|look)\s+(?:for\s+)?(.+?)\s+on\s+(?:google|the\s+web|internet|browser)\b/i);
  if (searchMatch?.[1]) {
    return `https://www.google.com/search?q=${encodeURIComponent(searchMatch[1].trim())}`;
  }

  
  const openMatch = n.match(/\b(?:open|go\s+to|navigate\s+to|visit|show\s+me|pull\s+up|launch)\s+(?:the\s+)?(.+?)(?:\s+(?:website|site|page|browser))?\.?\s*$/i);
  if (openMatch?.[1]) {
    const target = openMatch[1].trim();
    const knownUrl = KNOWN_SITES[target.toLowerCase()];
    if (knownUrl) return knownUrl;
    return `https://www.google.com/search?q=${encodeURIComponent(target)}`;
  }

  return "https://www.google.com";
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
