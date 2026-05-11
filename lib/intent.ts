import {
  wantsBrowseOrchestration,
  wantsClockDeskOrchestration,
  wantsMapsOrchestration,
  wantsNewsOrchestration,
  wantsOrbitOrchestration,
  wantsScoutOrchestration,
  wantsStickyNoteOrchestration,
  wantsWeatherOrchestration
} from "@/lib/environment-intents";

const GREETING_PATTERNS = [
  /\bhello\b/i,
  /\bhi\b/i,
  /\bhey\b/i,
  /\bgood morning\b/i,
  /\bgood afternoon\b/i,
  /\bgood evening\b/i,
  /\bhow are you\b/i,
  /\bwhat'?s up\b/i,
  /\bthank(s| you)\b/i,
  /\bwho are you\b/i,
  /\bwhat can you do\b/i,
  /\b(?:a)?joke\b/i,
  /\bstory\b/i,
  /\bpoem\b/i,
  /\briddle\b/i,
  /\badvice\b/i
];

/** Wall-clock questions — handled locally (weather API timezone), not via MCP or open-ended chat. */
export function isLocalTimeIntent(input: string) {
  const n = input.trim().toLowerCase();
  if (!n) return false;
  return (
    /\bwhat('?s)?\s+the\s+time\b/.test(n) ||
    /\bwhat\s+time\s+is\s+it\b/.test(n) ||
    /\bwhat\s+time\b/.test(n) ||
    /\bcurrent\s+time\b/.test(n) ||
    /\btell\s+me\s+the\s+time\b/.test(n) ||
    /\bdo\s+you\s+know\s+the\s+time\b/.test(n)
  );
}

/** Inbox / agent relay — voice must hit MCP orchestration, not conversational “chat” mode (which disables tools). */
export function isRelayMessagingIntent(input: string): boolean {
  const n = input.trim().toLowerCase();
  if (!n) return false;
  return (
    /\b(inbox|unread\s+counts?|relay|notifications?|read-inbox|send-message|broadcast|broadcasting)\b/.test(n) ||
    /\b(read|check|show|open|fetch|get)\b[^\n]{0,64}\b(inbox|messages?|relay|notifications?)\b/.test(n) ||
    /\b(send|text|compose|reply)\b[^\n]{0,48}\b(message|relay)\b/.test(n) ||
    /\b(list[-_\s]?agents|show\s+agents|registered\s+agents|agents\s+registered|which\s+agents|any\s+agents)\b/u.test(n) ||
    /\b(who'?s\s+online|who\s+is\s+online|agents?\s+online|online\s+agents)\b/u.test(n)
  );
}

const MUSIC_PATTERNS = [
  /^(play|start playing|queue|add|search)\b/i,
  /\b(play|pause|resume|next|previous|back|queue|volume|mute|unmute|now playing)\b/i,
  /\b(song|music|track|album|artist)\b/i
];

const ACTION_PATTERNS = [
  /\b(play|pause|resume|next|previous|back|queue|volume|mute|unmute|now playing)\b/i,
  /^(open|launch|search|check|show|set|create|add|delete|remind|message|email|call|text|book|schedule)\b/i,
  /\b(calenda?r|notes?|message(s)?|emails?|reminder(s)?|tasks?|files?|downloads?|browser|youtube|spotify)\b/i,
  /\binbox\b/i,
  /\b(notification|notifications)\b/i,
  /\b(headlines|breaking\s+news|hacker\s*news|^hn\b|\bHN\b)/i,
  /\b(top\s+(news|stories)|news\s+(today|update))\b/i,
  /\b(sticky\s*pad|sticky\s+note|scratch\s*(pad)?|jot\s+down|remember\s+(this|that|to))\b/i,
  /\b(map\b|maps\b|\batlas\b|coordinates\b|navigate\s+to)\b/i,
  /\bwiki(pedia)?\b|^lookup\b|^tell\s+me\s+about\b|\bscout\s+wiki\b/i,
  /\b(apod\b|orbit\s+deck|\bNASA\b.*\bpicture\b)/i
];

export function isConversationalIntent(input: string) {
  const normalized = input.trim();
  if (!normalized) return true;
  if (isLocalTimeIntent(normalized)) return false;
  const nLow = normalized.toLowerCase();
  if (/\b(register\s+(with\s+)?(the\s+)?relay|relay\s+registration)\b/u.test(nLow)) return false;
  if (isRelayMessagingIntent(normalized)) return false;
  if (wantsWeatherOrchestration(normalized)) return false;
  if (wantsNewsOrchestration(normalized)) return false;
  if (wantsClockDeskOrchestration(normalized)) return false;
  if (wantsStickyNoteOrchestration(normalized)) return false;
  if (wantsMapsOrchestration(normalized)) return false;
  if (wantsBrowseOrchestration(input.trim())) return false;
  if (wantsScoutOrchestration(normalized)) return false;
  if (wantsOrbitOrchestration(normalized)) return false;
  /** Action-shaped utterances need MCP orchestration; conversational Groq mode disables tools. */
  if (ACTION_PATTERNS.some((pattern) => pattern.test(normalized))) return false;

  return (
    GREETING_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    /^(tell me|say|share|give me|make me|write me|explain|define|summarize|summarise|help me)\b/i.test(normalized) ||
    /^(what|why|how|who|where|when)\b/i.test(normalized)
  );
}

export function isMusicIntent(input: string) {
  const normalized = input.trim();
  if (!normalized) return false;
  return MUSIC_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isActionIntent(input: string) {
  const normalized = input.trim();
  if (!normalized) return false;
  if (isMusicIntent(normalized)) return true;
  return ACTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function inferTaskRoom(input: string) {
  const raw = input.trim();
  const normalized = raw.toLowerCase();
  if (!normalized) return null;
  if (wantsBrowseOrchestration(raw)) return "browser";
  if (
    /\b(youtube|youtu\.be)\b|\b(shorts)\b|\b(find|watch|show|open|lookup|look\s+up|search\s+for?)\s+.{0,48}\b(video|videos|shorts)\b|\b(video|videos)\s+.{0,20}\b(about|for|on)\b|\b(play|watch)\s+.{0,20}\b(video|videos|youtube)\b/i.test(normalized)
  ) {
    return "browser";
  }
  if (/(play|song|music|track|album|artist|pause|resume|next|previous|queue|volume|mute|unmute|spotify)/i.test(normalized)) return "voice";
  if (/(time|clock|alarm|reminder|timer|schedule)/i.test(normalized)) return "clock";
  if (/(weather|temperature|forecast|rain|snow|cloud)/i.test(normalized)) return "browser";
  if (/(email|mail|inbox)/i.test(normalized)) return "email";
  if (/(download|desktop|file|scan)/i.test(normalized)) return "downloads";
  if (/\b(note|sticky|scratch|jot)\b/i.test(normalized)) return "notes";
  if (/\bwiki(pedia)?\b|^lookup\b|\bscout\b|\btell\s+me\s+about\b|\bwho\s+is\b/i.test(normalized)) return "library";
  if (/\b(apod|orbit\s+deck|nasa\b.*picture|galaxy|nebula)\b/i.test(normalized)) return "archive";
  if (/\b(map\b|atlas\b|coordinates)\b/i.test(normalized)) return "library";
  if (/(browser|open|search|google|website|site|summarize|news|headline)/i.test(normalized)) return "browser";
  if (/(archive|history|old|saved)/i.test(normalized)) return "archive";
  return null;
}

export function extractMusicQuery(input: string) {
  const normalized = input.trim();
  const stripped = normalized
    .replace(/^(hey\s+)?vee[,:\s-]*/i, "")
    .replace(/^(can you\s+|could you\s+|please\s+|hey\s+)?/i, "")
    .replace(/^(play|start playing|queue|add|search)\b[,:?\-\s]*/i, "")
    .replace(/^(a\s+)?song\s+by\s+/i, "")
    .replace(/^the\s+song\s+by\s+/i, "")
    .replace(/^music\s+by\s+/i, "")
    .replace(/^by\s+/i, "")
    .replace(/\b(?:for me|please|thanks|thank you)\b/gi, "")
    .trim()
    .replace(/^[,:\-\s]+|[,:\-\s]+$/g, "");

  if (!stripped) return "";

  // If the user says "play a song by Taylor Swift", preserve the artist as a useful search query.
  const artistMatch = normalized.match(/\b(?:song|music|track)\s+by\s+(.+)$/i);
  if (artistMatch?.[1]) {
    return artistMatch[1].replace(/[?.!]+$/g, "").trim();
  }

  return stripped;
}

/** Strip VO phrasing → YouTube MCP `query` (search / play URL / topic). */
export function extractYoutubeQuery(input: string): string {
  const normalized = input.trim();
  let s = normalized
    .replace(/^(hey\s+)?vee[,:\s-]*/i, "")
    .replace(/^(can you\s+|could you\s+|please\s+)?/i, "")
    .replace(/^search\s+youtube\s+for\s+/i, "")
    .replace(/^search\s+for\s+/i, "")
    .replace(/^(find|watch|show|open|lookup|look\s+up)(\s+(a\s+|the\s+)?(youtube\s+|yt\s+)?(video|videos))?(\s+about)?\s+/i, "")
    .replace(/^(play|start)(\s+(a\s+|the\s+)?(youtube\s+|yt\s+)?(video|videos))?\s+/i, "")
    .replace(/\b(for me|please|thanks|thank you)\b/gi, "")
    .trim();

  const aboutTail = normalized.match(/\b(?:video|videos)\s+about\s+(.+)$/i);
  if (aboutTail?.[1]) {
    s = aboutTail[1];
  }

  s = s.replace(/\b(?:on\s+)?youtube(?:\.com[^\s]*)?\s*$/i, "").trim();
  s = s.replace(/^[,:\-\s]+|[,.:?!;\-\s]+$/g, "");

  const urlInText = normalized.match(
    /https?:\/\/(?:www\.|music\.)?(?:youtube\.com\/[^\s]+|youtu\.be\/[^\s]+)/i
  );
  if ((!s || /\b(url|link)\b/i.test(normalized)) && urlInText?.[0]) {
    return urlInText[0].replace(/[),.;]+$/u, "");
  }

  return s.trim();
}

/**
 * Drops assistant / music-MCP error text that sometimes gets pasted into voice transcripts
 * and mistaken for a YouTube search query. Does not strip normal user queries like
 * songs titled "Couldn't Care Less".
 */
export function sanitizeYoutubeMcpQuery(raw: string): string {
  const collapsed = raw.trim().replace(/\s+/gu, " ");
  if (!collapsed) return "";
  // Direct watch links should pass through untouched.
  if (/^https?:\/\//iu.test(collapsed)) return collapsed.length > 2000 ? "" : collapsed;
  // Very long pasted monologues are never useful as a single MCP query.
  if (collapsed.length > 220) return "";

  const low = collapsed.toLowerCase();
  if (/\bcould\s*n'?t\s+find[^\n]{0,120}\bmatching\s+track\b/u.test(low)) return "";
  if (/\bmatching\s+track\b/u.test(low) && /\bcould\s*(not|n't)\s+find\b/u.test(low)) return "";
  if (/\btry\s+(a\s+)?different\s+search\s+(term)?\b/u.test(low)) return "";
  if (/\btry\s+the\s+song\s+title\b/u.test(low)) return "";
  if (/\bi\s+(could\s*(not|n't)|can'?t)\s+find\b/u.test(low) && /\byoutube\b/u.test(low) && /\bvideos?\b/u.test(low)) return "";

  return collapsed;
}
