import type { ActiveTool, MCPTool, OrchestrationUpdate } from "@/types/veil";
import { uid } from "@/lib/utils";
import { wantsBrowseOrchestration } from "@/lib/environment-intents";
import {
  extractMusicQuery,
  extractYoutubeQuery,
  isConversationalIntent,
  isMusicIntent,
  isRelayMessagingIntent,
  sanitizeYoutubeMcpQuery
} from "@/lib/intent";
import { groqSlugForMcpTool, groqSlugForToolName } from "@/lib/groq-slugs";
import { playMusicPreview } from "@/lib/music-player";
import {
  getMcpDiscoverUrls,
  messageMcpEndpoint,
  musicMcpEndpoint,
  urlsMatch,
  youtubeVideoMcpEndpoint
} from "@/lib/mcp-endpoints";
import { VEIL_BUILTIN_TOOLS, isVeilBuiltinServerUrl } from "@/lib/mcp-builtin";

const endpoints = getMcpDiscoverUrls();

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: string;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
};

type ToolsListResult = {
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }>;
};

type InitializeResult = {
  protocolVersion?: string;
  capabilities?: Record<string, unknown>;
  serverInfo?: {
    name?: string;
    version?: string;
    description?: string;
    title?: string;
  };
};

type MCPConnection = {
  serverUrl: string;
  serverName?: string;
  serverTitle?: string;
  sessionId?: string;
  connected: boolean;
  tools: MCPTool[];
  lastSeen: number;
};

const connections = new Map<string, MCPConnection>();
const sessions = new Map<string, string>();
const activeTools = new Map<string, ActiveTool>();

function extractMessagingOutputText(output: unknown): string {
  if (output == null || output === "") return "";
  if (typeof output === "string") return output.trim();

  const o = output as {
    message?: unknown;
    error?: unknown;
    content?: Array<{ type?: string; text?: string }>;
    structuredContent?: unknown;
  };

  let parts: string[] = [];
  if (typeof o.message === "string") parts.push(o.message);
  const err = o.error;
  if (typeof err === "string") parts.push(err);
  if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    parts.push((err as { message: string }).message);
  }
  const texts = (o.content ?? []).map((item) => (item?.text != null ? String(item.text) : "")).join(" ").trim();
  if (texts) parts.push(texts);
  if (o.structuredContent != null) {
    try {
      parts.push(JSON.stringify(o.structuredContent));
    } catch {
      /* ignore */
    }
  }
  const joined = parts.join(" ").trim();
  if (joined) return joined;
  try {
    return typeof output === "object" ? JSON.stringify(output) : String(output);
  } catch {
    return "";
  }
}

function extractMcpResultText(output: unknown): string {
  return extractMessagingOutputText(output).toLowerCase();
}

const orchestrationQueue: Array<() => Promise<void>> = [];
let queueRunning = false;

async function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs = 18000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await work(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function rpc<T>(serverUrl: string, method: string, params?: unknown, timeoutMs?: number): Promise<T> {
  return withTimeout(async (signal) => {
    const sessionId = getSessionId(serverUrl);
    const response = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...(sessionId ? { "mcp-session-id": sessionId } : {})
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: uid("rpc"),
        method,
        params
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`MCP ${method} failed at ${serverUrl}: ${response.status}`);
    }
    return parseMcpPayload<T>(response);
  }, timeoutMs);
}

async function retry<T>(fn: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 450 * (index + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("MCP retry failed");
}

async function parseMcpPayload<T>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (contentType.includes("application/json") || contentType.includes("application/jsonrpc") || text.trim().startsWith("{")) {
    const payload = JSON.parse(text) as JsonRpcResponse<T>;
    if (payload.error) {
      throw new Error(payload.error.message);
    }
    return payload.result as T;
  }

  const jsonLine = text
    .split("\n")
    .map((line) => line.replace(/^data:\s*/, "").trim())
    .filter((line) => line && line !== "[DONE]")
    .at(-1);

  const payload = JSON.parse(jsonLine ?? text) as JsonRpcResponse<T>;
  if (payload.error) {
    throw new Error(payload.error.message);
  }
  return payload.result as T;
}

async function initializeServer(serverUrl: string) {
  const response = await fetch(serverUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: uid("rpc"),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        clientInfo: {
          name: "veil",
          version: "1.0.0"
        },
        capabilities: {}
      }
    })
  });

  if (!response.ok) {
    throw new Error(`MCP initialize failed at ${serverUrl}: ${response.status}`);
  }

  const sessionId = response.headers.get("mcp-session-id") ?? undefined;
  if (sessionId) {
    sessions.set(serverUrl, sessionId);
  }

  return {
    sessionId,
    result: await parseMcpPayload<InitializeResult>(response)
  };
}

export async function connectToMCPServers() {
  const results = await Promise.allSettled(
    endpoints.map(async (serverUrl) => {
      const { sessionId, result: initResult } = await retry(() => initializeServer(serverUrl), 2);
      const toolsResult = await retry(() => rpc<ToolsListResult>(serverUrl, "tools/list", undefined, 14000), 2);
      const tools = (toolsResult.tools ?? []).map((tool) => ({
        id: `${serverUrl}:${tool.name}`,
        serverUrl,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
      const connection = {
        serverUrl,
        serverName: initResult.serverInfo?.name,
        serverTitle: initResult.serverInfo?.title,
        sessionId,
        connected: true,
        tools,
        lastSeen: Date.now()
      };
      connections.set(serverUrl, connection);
      return connection;
    })
  );

  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      connections.set(endpoints[index], {
        serverUrl: endpoints[index],
        connected: false,
        tools: [],
        lastSeen: Date.now()
      });
    }
  }

  return Array.from(connections.values());
}

/** MCP tools advertised by configured remote `/mcp` servers only (used for connectivity / timelines). */
export function getRemoteMcpTools(): MCPTool[] {
  return Array.from(connections.values()).flatMap((connection) => connection.tools);
}

/** Remote MCP tools plus local synthetic builtins (headlines API, etc.) for Groq + execution. */
export function getAvailableTools(): MCPTool[] {
  return [...VEIL_BUILTIN_TOOLS, ...getRemoteMcpTools()];
}

function builtinVeilArguments(input: unknown): Record<string, unknown> {
  const n = normalizeToolArguments(input) as Record<string, unknown>;
  return typeof n === "object" && n && !Array.isArray(n) ? n : {};
}

async function runVeilBuiltinToolOutput(toolName: string, input: unknown): Promise<unknown> {
  const name = toolName.trim().toLowerCase();
  const jsonHdr = { accept: "application/json", "content-type": "application/json" };

  if (name === "headlines") {
    const res = await fetch("/api/news", { headers: { accept: "application/json" } });
    const json = (await res.json()) as {
      title?: string;
      summary?: string;
      speech?: string;
      items?: Array<{ title: string; url?: string; source?: string; score?: number }>;
    };
    const spoken =
      typeof json.speech === "string" && json.speech.trim()
        ? json.speech.trim()
        : typeof json.summary === "string"
          ? json.summary
          : "";
    return {
      content: [{ type: "text", text: spoken }],
      structuredContent: {
        title: json.title ?? "Headlines",
        newsItems: Array.isArray(json.items) ? json.items : []
      }
    };
  }

  if (name === "sticky_note") {
    const p = builtinVeilArguments(input);
    const action = String(p.action ?? "list").toLowerCase();
    const body: Record<string, unknown> = { action };
    if (typeof p.text === "string") body.text = p.text;
    if (typeof p.id === "string") body.id = p.id;

    const res = await fetch("/api/colony-notes", { method: "POST", headers: jsonHdr, body: JSON.stringify(body) });
    const json = (await res.json()) as {
      speech?: string;
      notes?: Array<{ id: string; text: string; createdAt: string }>;
      summaryLines?: string;
    };

    const text =
      typeof json.speech === "string"
        ? json.speech
        : typeof json.summaryLines === "string"
          ? json.summaryLines.slice(0, 600)
          : "";

    return {
      content: [{ type: "text", text }],
      structuredContent: {
        title: "Sticky notes · colony pad",
        stickyNotes: Array.isArray(json.notes) ? json.notes : [],
        summaryLines: json.summaryLines
      }
    };
  }

  if (name === "browse_page") {
    const url = String(builtinVeilArguments(input).url ?? "").trim();
    if (!url) throw new Error("browse_page requires url");
    const res = await fetch(`/api/browse?url=${encodeURIComponent(url)}`, {
      headers: { accept: "application/json" }
    });
    const json = (await res.json()) as {
      title?: string;
      url?: string;
      markdown?: string;
      summary?: string;
      speech?: string;
      source?: "firecrawl" | "plain";
      error?: string;
    };
    if (!res.ok) {
      const msg = typeof json.speech === "string" ? json.speech : typeof json.error === "string" ? json.error : "Browse failed.";
      throw new Error(msg);
    }
    const speech =
      typeof json.speech === "string"
        ? json.speech.trim()
        : typeof json.summary === "string"
          ? json.summary.slice(0, 520).trim()
          : "Snapshotted that page.";
    const md = typeof json.markdown === "string" ? json.markdown : "";
    const href = typeof json.url === "string" ? json.url : url;
    const source = json.source === "firecrawl" || json.source === "plain" ? json.source : "plain";
    let titleChip = typeof json.title === "string" ? json.title.trim() : "";
    if (!titleChip) {
      try {
        const normalized = /^https?:\/\//iu.test(href) ? href : `https://${href.replace(/^\/+/u, "")}`;
        titleChip = new URL(normalized).hostname;
      } catch {
        titleChip = "Browse snapshot";
      }
    }

    const summarySlice =
      typeof json.summary === "string" ? json.summary.slice(0, 2400).trim() : md.slice(0, 2400).trim();

    return {
      content: [{ type: "text", text: speech }],
      structuredContent: {
        title: titleChip,
        browseUrl: href,
        browseMarkdown: md,
        browseSource: source,
        speech,
        browseSummarySlice: summarySlice || undefined
      }
    };
  }

  if (name === "maps_place") {
    const query = String(builtinVeilArguments(input).query ?? "").trim();
    if (!query) throw new Error("maps_place requires query");
    const res = await fetch(`/api/maps?query=${encodeURIComponent(query)}`, { headers: { accept: "application/json" } });
    const json = (await res.json()) as {
      title?: string;
      speech?: string;
      summary?: string;
      label?: string;
      embedUrl?: string;
      lat?: number;
      lon?: number;
      query?: string;
    };
    const summary = typeof json.summary === "string" ? json.summary : "";
    const speech =
      typeof json.speech === "string" ? json.speech : summary.slice(0, 240) || "Atlas framed that place.";
    return {
      content: [{ type: "text", text: speech }],
      structuredContent: {
        title: json.title ?? `Atlas · ${query}`,
        mapEmbedUrl: json.embedUrl,
        mapLat: typeof json.lat === "number" ? json.lat : undefined,
        mapLon: typeof json.lon === "number" ? json.lon : undefined,
        mapLabel: json.label ?? summary,
        mapQuery: json.query ?? query,
        speech
      }
    };
  }

  if (name === "wiki_scout") {
    const query = String(builtinVeilArguments(input).query ?? "").trim();
    if (!query) throw new Error("wiki_scout requires query");
    const res = await fetch(`/api/scout?query=${encodeURIComponent(query)}`, { headers: { accept: "application/json" } });
    const json = (await res.json()) as {
      title?: string;
      speech?: string;
      summary?: string;
      scout?: {
        query: string;
        title: string;
        extract: string;
        pageUrl?: string;
        thumbUrl?: string;
      };
    };

    const speech = typeof json.speech === "string" ? json.speech : json.summary ?? "Scouted Wikipedia.";
    return {
      content: [{ type: "text", text: speech }],
      structuredContent: {
        title: json.title ?? `Scout · ${query}`,
        scoutQuery: json.scout?.query ?? query,
        scoutTitle: json.scout?.title,
        scoutExtract: json.scout?.extract,
        scoutUrl: json.scout?.pageUrl,
        scoutThumbUrl: json.scout?.thumbUrl,
        speech
      }
    };
  }

  if (name === "orbit_apod") {
    const p = builtinVeilArguments(input);
    const ds = typeof p.date === "string" ? p.date.trim().match(/^\d{4}-\d{2}-\d{2}$/)?.[0] : undefined;

    const res = await fetch(ds ? `/api/orbit?date=${encodeURIComponent(ds)}` : "/api/orbit", {
      headers: { accept: "application/json" }
    });

    const json = (await res.json()) as {
      title?: string;
      speech?: string;
      summary?: string;
      orbit?: {
        title: string;
        explanation: string;
        imageUrl?: string;
        date?: string;
        credit?: string;
      };
    };

    const speech = typeof json.speech === "string" ? json.speech : json.summary ?? "Incoming orbit deck.";
    return {
      content: [{ type: "text", text: speech }],
      structuredContent: {
        title: json.title ?? "Orbit · APOD",
        orbitTitle: json.orbit?.title,
        orbitExplanation: json.orbit?.explanation,
        orbitImageUrl: json.orbit?.imageUrl,
        orbitDate: json.orbit?.date,
        orbitCredit: json.orbit?.credit,
        speech
      }
    };
  }

  throw new Error(`Unknown built-in MCP tool: ${toolName}`);
}

function resolveMcpToolFromGroqSlug(slugFromModel: string): MCPTool | undefined {
  const tools = getAvailableTools();
  const strict = tools.find((t) => groqSlugForMcpTool(t) === slugFromModel);
  if (strict) return strict;
  const bare = tools.filter((t) => groqSlugForToolName(t.name) === slugFromModel || t.name === slugFromModel);
  if (bare.length === 1) return bare[0];
  return undefined;
}

/** Route "play youtube…" intent to Groq+video MCP, not Deezer/play. */
function isLikelyYoutubeVideoIntent(intent: string) {
  const n = intent.trim().toLowerCase();
  if (!n) return false;
  return (
    /\b(youtube|youtu\.be)\b/.test(n) ||
    /\b(shorts)\b/u.test(n) ||
    /\b(trailers?|music\s+videos?)\b/u.test(n) ||
    /\bvideos?\s+about\b/u.test(n) ||
    /\b(play|listen to|watch)\b[^\n]{0,48}\b(video|videos|shorts)\b/u.test(n) ||
    /\b(video|videos|youtube)\b.*\b(about|on|for|find|watch|show|open|clips?|trailers?|shorts)\b/.test(n) ||
    /\b(find|watch|show|open|lookup|look\s+up|search\s+(for\s+)?a?)\s+.{0,40}\b(video|videos|youtube|trailers?|shorts)\b/.test(n)
  );
}

function getYoutubeVideoConnection(): MCPConnection | undefined {
  const connectionsList = Array.from(connections.values()).filter((c) => c.connected && c.tools.length > 0);
  const ytUrl = youtubeVideoMcpEndpoint();

  const byEnv = ytUrl !== undefined ? connectionsList.find((c) => urlsMatch(c.serverUrl, ytUrl)) : undefined;
  const byMeta = connectionsList.find(
    (c) => /\byoutube\b/i.test(c.serverName ?? "") || /\byoutube\b/i.test(c.serverTitle ?? "")
  );

  return byEnv ?? byMeta;
}

function getMusicConnection() {
  const connectionsList = Array.from(connections.values());
  const musicUrl = musicMcpEndpoint();

  const byEnv =
    musicUrl !== undefined ? connectionsList.find((c) => urlsMatch(c.serverUrl, musicUrl)) : undefined;

  return (
    byEnv ??
    connectionsList.find((connection) => connection.serverName === "music-player-mcp") ??
    connectionsList.find((connection) => connection.serverTitle?.toLowerCase().includes("music")) ??
    connectionsList.find((connection) =>
      /\.run\.mcp-use\.com\/mcp$/i.test(connection.serverUrl) && connection.tools.some((t) => t.name === "pause-resume")
    ) ??
    connectionsList[0]
  );
}

function buildYoutubeInput(intent: string, toolName: string): Record<string, unknown> | null {
  const normalized = intent.toLowerCase();

  const noQueryTools = ["play-next", "show-queue", "now-playing", "history"];
  if (noQueryTools.includes(toolName)) return {};

  let query = sanitizeYoutubeMcpQuery(extractYoutubeQuery(intent));
  if (!query.length) return null;

  if (toolName === "search") {
    const maxRaw =
      normalized.match(/\b(?:top|first)\s+(\d{1,2})\b/i)?.[1] ?? normalized.match(/\b(\d{1,2})\s*(results?|videos?)\b/i)?.[1];
    const n = maxRaw !== undefined ? Number(maxRaw) : NaN;
    if (Number.isFinite(n) && n >= 1 && n <= 10) return { query, max_results: n };
    return { query };
  }

  return { query };
}

async function runYoutubeVideoCommand(intent: string, emit: (update: OrchestrationUpdate) => void) {
  let connection = getYoutubeVideoConnection();
  if (!connection) {
    await connectToMCPServers();
    connection = getYoutubeVideoConnection();
  }

  if (!connection || connection.tools.length === 0) {
    emit({
      type: "complete",
      response:
        "The YouTube MCP server is offline or unreachable. Reload the page, verify NEXT_PUBLIC_MCP_ENDPOINT_YOUTUBE_VIDEO (or localhost video-yt /mcp), and check MCP fabric in the colony timeline."
    });
    return;
  }

  const normalized = intent.toLowerCase().trim();

  let toolName = "play";
  if (/\b(play\s+next|next\s+video)\b/u.test(normalized)) toolName = "play-next";
  else if (/\b(show|see)\s+(the\s+)?queue\b/u.test(normalized)) toolName = "show-queue";
  else if (/\b(now\s+playing|what(?:'|\s+s)?(?:s\s+)?playing)\b/u.test(normalized)) toolName = "now-playing";
  else if (/\b(play\s+history|recent\s+videos?\s+hits|recently\s+watched)\b/u.test(normalized) || /\bhistory\b/u.test(normalized))
    toolName = "history";
  else if (/\b(add\s+(to\s+)?(the\s+)?queue|enqueue)\b/u.test(normalized)) toolName = "add-to-queue";
  else if (/\bsearch\b/u.test(normalized) || /\bsearch\s+youtube\b/u.test(normalized)) toolName = "search";

  const noopTools = ["play-next", "show-queue", "now-playing", "history"];
  let execTool = connection.tools.find((t) => t.name === toolName);

  if (!execTool) {
    if (noopTools.includes(toolName)) {
      emit({
        type: "complete",
        response: `This YouTube MCP didn’t advertise “${toolName}”. Say play … on YouTube, or update your video-yt server.`
      });
      return;
    }
    if (toolName === "search") execTool = connection.tools.find((t) => t.name === "search");
    if (!execTool) execTool = connection.tools.find((t) => t.name === "play");
  }

  if (!execTool) {
    emit({ type: "complete", response: "YouTube MCP is connected but exposes no playable tool." });
    return;
  }

  let execArgs: Record<string, unknown>;

  if (noopTools.includes(execTool.name)) {
    execArgs = {};
  } else if (execTool.name === "search") {
    const built = buildYoutubeInput(intent, "search");
    if (!built || typeof built.query !== "string" || !built.query.trim()) {
      emit({
        type: "complete",
        response: "What should I search on YouTube? For example: search YouTube for lo-fi playlists."
      });
      return;
    }
    execArgs = built;
  } else {
    const built = buildYoutubeInput(intent, "play");
    let query = typeof built?.query === "string" ? sanitizeYoutubeMcpQuery(built.query) : "";
    if (!query) query = sanitizeYoutubeMcpQuery(extractYoutubeQuery(intent));
    const urlInIntent =
      intent.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/[^\s]+|youtu\.be\/[^\s]+)/i)?.[0]?.replace(/[.),;]+$/u, "") ?? "";
    if (!query && urlInIntent) query = urlInIntent;
    if (!query) {
      emit({
        type: "complete",
        response: "Tell me what to find on YouTube—say a topic, video title, or paste a watch link—and I’ll run the player MCP."
      });
      return;
    }
    execArgs = { query };
  }

  emit({
    type: "timeline",
    event: {
      id: uid("event"),
      kind: "tool",
      title: `YouTube MCP: ${execTool.name}`,
      detail: intent,
      timestamp: Date.now()
    }
  });

  const result = await executeMCPTool(execTool.name, execArgs, connection.serverUrl);
  emit({
    type: "tool-result",
    tool: result
  });

  const output = result.output as {
    structuredContent?: { previewUrl?: string; title?: string; embedUrl?: string; videoUrl?: string };
    content?: Array<{ type?: string; text?: string }>;
  } | undefined;
  const text = output?.content?.map((item) => item.text).filter(Boolean).join(" ").trim() ?? "";
  if (/no results found/i.test(text)) {
    emit({ type: "complete", response: "No YouTube hits for that phrase—try a shorter search or paste a video link." });
    return;
  }

  const verb =
    execTool.name === "search"
      ? "Here’s what matched on YouTube—details are in the dock."
      : execTool.name === "add-to-queue"
        ? "Queued that clip."
        : execTool.name === "play-next"
          ? "Playing the next item in queue."
          : friendlyPostToolSpeech(intent);

  emit({ type: "complete", response: verb });
}

function isMusicCommand(intent: string) {
  return isMusicIntent(intent) && !isLikelyYoutubeVideoIntent(intent);
}

function buildMusicInput(intent: string, toolName: string) {
  const query = extractMusicQuery(intent);
  switch (toolName) {
    case "play":
    case "search":
    case "add-to-queue":
      return query ? { query } : null;
    case "volume": {
      const levelMatch = intent.match(/\b(\d{1,3})\b/);
      const level = levelMatch ? Number(levelMatch[1]) : NaN;
      return Number.isFinite(level) ? { level: Math.max(0, Math.min(100, level)) } : null;
    }
    case "pause-resume":
    case "next-track":
    case "previous-track":
    case "show-queue":
    case "now-playing":
      return {};
    default:
      return query ? { query } : null;
  }
}

async function runMusicCommand(intent: string, emit: (update: OrchestrationUpdate) => void) {
  const connection = getMusicConnection();
  if (!connection || connection.tools.length === 0) {
    emit({ type: "complete", response: "The music server is not ready yet." });
    return;
  }

  const normalized = intent.toLowerCase();
  let toolName = "play";

  if (/\b(pause|resume)\b/.test(normalized)) toolName = "pause-resume";
  else if (/\bnext\b/.test(normalized)) toolName = "next-track";
  else if (/\b(previous|back)\b/.test(normalized)) toolName = "previous-track";
  else if (/\bnow playing\b|\bwhat('?s)? playing\b/.test(normalized)) toolName = "now-playing";
  else if (/\bqueue\b/.test(normalized) && !/\badd\b/.test(normalized)) toolName = "show-queue";
  else if (/\bvolume\b/.test(normalized)) toolName = "volume";
  else if (/\bsearch\b/.test(normalized)) toolName = "search";
  else if (/\badd\b/.test(normalized)) toolName = "add-to-queue";

  const input = buildMusicInput(intent, toolName);
  if (input === null) {
    emit({ type: "complete", response: "Name the song or artist and I’ll play it." });
    return;
  }

  emit({
    type: "timeline",
    event: {
      id: uid("event"),
      kind: "tool",
      title: `Music command: ${toolName}`,
      detail: intent,
      timestamp: Date.now()
    }
  });

  const tool = connection.tools.find((candidate) => candidate.name === toolName);
  if (!tool) {
    emit({ type: "complete", response: "That music action is unavailable on the connected server." });
    return;
  }

  const result = await executeMCPTool(tool.name, input, connection.serverUrl);
  emit({
    type: "tool-result",
    tool: result
  });

  const output = result.output as {
    structuredContent?: { previewUrl?: string; title?: string; artist?: string };
    content?: Array<{ type?: string; text?: string }>;
  } | undefined;
  const text = output?.content?.map((item) => item.text).filter(Boolean).join(" ").trim() ?? "";
  const noResults = /no results found/i.test(text);

  if (noResults) {
    emit({
      type: "complete",
      response: "I couldn’t find a matching track. Try the song title plus the artist."
    });
    return;
  }

  const previewUrl = output?.structuredContent?.previewUrl;

  if (toolName === "play") {
    if (previewUrl) {
      try {
        await playMusicPreview(previewUrl);
      } catch {
        // Playback can fail if the browser blocks autoplay or the URL expires.
      }
    }
  }

  const detail =
    toolName === "play"
      ? `Playing ${input && typeof input === "object" && "query" in input ? String((input as { query: string }).query) : "music"}`
      : toolName === "pause-resume"
        ? "Toggled playback."
        : toolName === "next-track"
          ? "Skipped to the next track."
          : toolName === "previous-track"
            ? "Went back to the previous track."
            : toolName === "volume"
              ? "Adjusted volume."
              : "Updated the music queue.";

  emit({ type: "complete", response: detail, skipSpeech: toolName === "play" && Boolean(previewUrl) });
}

function toolBareName(tool: MCPTool): string {
  const n = tool.name;
  return n.includes("__") ? n.slice(n.indexOf("__") + 2) : n;
}

/** Stable handle for MCP agent-chat tools (`read-inbox`, `send-message`, etc.). Override with `NEXT_PUBLIC_VEIL_RELAY_AGENT_NAME`. */
export function defaultRelayAgentName(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_VEIL_RELAY_AGENT_NAME?.trim() || process.env.NEXT_PUBLIC_MCP_AGENT_NAME?.trim() || "";
  if (
    fromEnv &&
    !/^NEXT_PUBLIC_/i.test(fromEnv) &&
    !/\bVEIL_RELAY_AGENT_NAME\b/i.test(fromEnv) &&
    !/^your_agent/i.test(fromEnv)
  ) {
    return fromEnv;
  }
  return "veil";
}

function isMessagingMcpTool(tool: MCPTool): boolean {
  const ep = messageMcpEndpoint();
  if (ep && urlsMatch(tool.serverUrl, ep)) return true;
  const slug = toolBareName(tool).toLowerCase();
  return /\b(register|read-inbox|send-message|list-agents|broadcast|unread-count|check-notifications|view-profile|update-profile)\b/.test(
    slug
  );
}

function messagingToolLikelyUsesAgent(tool: MCPTool): boolean {
  const slug = toolBareName(tool).toLowerCase();
  return (
    slug === "register" ||
    /\b(read-inbox|send-message|unread-count|check-notifications|view-profile|update-profile)\b/.test(slug)
  );
}

function looksLikeRelayNeedsRegistration(output: unknown): boolean {
  const t = extractMcpResultText(output);
  if (!t) return false;
  return (
    t.includes("not registered") ||
    t.includes('call "register"') ||
    t.includes("call 'register'") ||
    (t.includes("call") && t.includes("register") && t.includes("first")) ||
    (t.includes("register") && t.includes("first")) ||
    t.includes("your_agent_name")
  );
}

function extractJsonSchemaPropertyKeys(schema: Record<string, unknown> | undefined): string[] {
  if (!schema || typeof schema !== "object") return [];
  const props = schema.properties as Record<string, unknown> | undefined;
  if (!props || typeof props !== "object") return [];
  return Object.keys(props);
}

function extractJsonSchemaRequiredKeys(schema: Record<string, unknown> | undefined): string[] {
  if (!schema || typeof schema !== "object") return [];
  const req = schema.required;
  return Array.isArray(req) ? req.filter((x): x is string => typeof x === "string") : [];
}

/** Prefer schema keys so we don’t send unknown fields to strict MCP servers. */
function buildRegisterArguments(registerTool: MCPTool): Record<string, unknown> {
  const agent = defaultRelayAgentName();
  const base = coerceMessagingToolArguments(registerTool, {});
  const schema = registerTool.inputSchema as Record<string, unknown> | undefined;
  const schemaKeys = extractJsonSchemaPropertyKeys(schema);
  const requiredKeys = extractJsonSchemaRequiredKeys(schema);

  const fillValue: Record<string, string> = {
    agent_name: agent,
    agentName: agent,
    agent: agent,
    name: agent,
    agent_id: agent,
    agentId: agent,
    id: agent,
    display_name: agent,
    displayName: agent,
    handle: agent,
    username: agent
  };

  const out: Record<string, unknown> = { ...base };

  if (schemaKeys.length === 0) {
    out.agent_name = agent;
    out.agentName = agent;
    out.agent = agent;
    out.name = agent;
    return out;
  }

  for (const k of schemaKeys) {
    if (fillValue[k] !== undefined && (out[k] == null || out[k] === "")) {
      out[k] = fillValue[k];
    }
  }
  for (const k of requiredKeys) {
    if (out[k] == null || out[k] === "") {
      out[k] = fillValue[k] ?? agent;
    }
  }
  return out;
}

function mcpToolResultLooksFailed(output: unknown): boolean {
  if (output && typeof output === "object" && "isError" in output) {
    return Boolean((output as { isError?: boolean }).isError);
  }
  const text = extractMessagingOutputText(output).trim();
  if (!text) return false;
  const low = text.toLowerCase();
  return looksLikeRelayNeedsRegistration(output) || /^error\b/.test(low) || /\bis not registered\b/.test(low);
}

function findRegisterTool(forTool: MCPTool): MCPTool | undefined {
  const pool = getAvailableTools().filter((c) => c.serverUrl === forTool.serverUrl);
  return pool.find((c) => {
    const slug = toolBareName(c).toLowerCase();
    return slug === "register" || slug.endsWith("_register") || slug.endsWith("-register");
  });
}

function coerceMessagingToolArguments(tool: MCPTool, input: Record<string, unknown>): Record<string, unknown> {
  if (!isMessagingMcpTool(tool) || !messagingToolLikelyUsesAgent(tool)) return { ...input };
  const agent = defaultRelayAgentName();
  const next = { ...input };
  const raw = next.agent_name ?? next.agentName;
  const current = typeof raw === "string" ? raw.trim() : "";
  const bogus =
    !current ||
    /^your_agent/i.test(current) ||
    current === "your_agent_name" ||
    /^NEXT_PUBLIC_/i.test(current) ||
    /\bVEIL_RELAY_AGENT_NAME\b/i.test(current);
  if (bogus) {
    next.agent_name = agent;
    next.agentName = agent;
    next.agent = agent;
  }
  return next;
}

async function callMcpToolRaw(tool: MCPTool, arguments_: Record<string, unknown>): Promise<unknown> {
  return retry(
    () =>
      rpc<unknown>(
        tool.serverUrl,
        "tools/call",
        {
          name: tool.name,
          arguments: arguments_
        },
        30000
      ),
    2
  );
}

async function invokeRelayRegister(forTool: MCPTool): Promise<boolean> {
  const registerTool = findRegisterTool(forTool);
  if (!registerTool) return false;
  const args = buildRegisterArguments(registerTool);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const out = await callMcpToolRaw(registerTool, args);
      if (!mcpToolResultLooksFailed(out)) return true;
    } catch {
      /* retry after delay */
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return false;
}

export async function executeMCPTool(toolName: string, input: unknown, serverUrl?: string) {
  const pool = getAvailableTools();
  let tool =
    pool.find((candidate) => candidate.name === toolName && (!serverUrl || candidate.serverUrl === serverUrl)) ?? undefined;

  if (!tool) {
    const nameMatches = pool.filter((c) => c.name === toolName);
    if (nameMatches.length === 1) tool = nameMatches[0];
  }

  if (!tool && serverUrl) {
    tool =
      pool.find(
        (candidate) =>
          candidate.serverUrl === serverUrl &&
          candidate.name.toLowerCase() === String(toolName).toLowerCase()
      ) ?? undefined;
  }

  if (!tool) {
    throw new Error(`MCP tool unavailable: ${toolName}`);
  }

  const normalizedInput = coerceMessagingToolArguments(tool, normalizeToolArguments(input) as Record<string, unknown>);
  const bareSlug = toolBareName(tool).toLowerCase();

  if (isVeilBuiltinServerUrl(tool.serverUrl)) {
    const active: ActiveTool = {
      id: uid("tool"),
      toolName: tool.name,
      serverUrl: tool.serverUrl,
      status: "running",
      startedAt: Date.now(),
      input: normalizedInput
    };
    activeTools.set(active.id, active);
    try {
      const output = await runVeilBuiltinToolOutput(tool.name, normalizedInput);
      const completed = { ...active, status: "complete" as const, completedAt: Date.now(), output };
      activeTools.set(active.id, completed);
      return completed;
    } catch (error) {
      const failed = {
        ...active,
        status: "error" as const,
        completedAt: Date.now(),
        error: error instanceof Error ? error.message : "Built-in tool error"
      };
      activeTools.set(active.id, failed);
      throw error;
    }
  }

  if (bareSlug !== "register" && isMessagingMcpTool(tool) && messagingToolLikelyUsesAgent(tool)) {
    await invokeRelayRegister(tool);
  }

  const active: ActiveTool = {
    id: uid("tool"),
    toolName: tool.name,
    serverUrl: tool.serverUrl,
    status: "running",
    startedAt: Date.now(),
    input: normalizedInput
  };
  activeTools.set(active.id, active);

  try {
    let output = await callMcpToolRaw(tool, normalizedInput);

    if (bareSlug !== "register" && isMessagingMcpTool(tool) && looksLikeRelayNeedsRegistration(output)) {
      const registered = await invokeRelayRegister(tool);
      if (registered) {
        await new Promise((r) => setTimeout(r, 520));
        output = await callMcpToolRaw(tool, normalizedInput);
      }
    }

    const completed = { ...active, status: "complete" as const, completedAt: Date.now(), output };
    activeTools.set(active.id, completed);
    return completed;
  } catch (error) {
    const failed = {
      ...active,
      status: "error" as const,
      completedAt: Date.now(),
      error: error instanceof Error ? error.message : "Unknown MCP error"
    };
    activeTools.set(active.id, failed);
    throw error;
  }
}

export async function* streamToolExecution(toolName: string, input: unknown, serverUrl?: string): AsyncGenerator<OrchestrationUpdate> {
  const tool = getAvailableTools().find((candidate) => candidate.name === toolName && (!serverUrl || candidate.serverUrl === serverUrl));
  if (!tool) {
    yield { type: "error", error: `Tool ${toolName} is unavailable` };
    return;
  }

  const active: ActiveTool = {
    id: uid("tool"),
    toolName: tool.name,
    serverUrl: tool.serverUrl,
    status: "running",
    startedAt: Date.now(),
    input
  };

  yield { type: "tool-start", tool: active };
  yield {
    type: "node",
    node: {
      id: active.id,
      label: tool.name,
      status: "running",
      toolName: tool.name,
      serverUrl: tool.serverUrl,
      x: 32 + Math.random() * 36,
      y: 30 + Math.random() * 38
    }
  };

  try {
    const result = await executeMCPTool(tool.name, input, tool.serverUrl);
    yield { type: "tool-result", tool: result };
    yield {
      type: "timeline",
      event: {
        id: uid("event"),
        kind: "tool",
        title: `Executed ${tool.name}`,
        detail: `Completed through ${new URL(tool.serverUrl).hostname}`,
        timestamp: Date.now()
      }
    };
  } catch (error) {
    yield { type: "error", error: error instanceof Error ? error.message : "Tool execution failed" };
  }
}

function friendlyPostToolSpeech(intent: string): string {
  const n = intent.trim().toLowerCase();
  if (isRelayMessagingIntent(intent)) {
    return "I've checked your relay inbox—anything new is spelled out on the inbox panel.";
  }
  if (/\b(?:youtube|youtu\.be|shorts|videos?|trailers?)\b/u.test(n)) {
    return "That's lined up—you'll see it in the colony browser dock.";
  }
  if (isMusicIntent(intent)) {
    return "Audio is underway—playback lives on the music wall.";
  }
  if (/\b(headlines|breaking news|hacker\s*news|^hn\b|top\s+stories|latest\s+news)\b/u.test(n)) {
    return "Top three snapshots were read aloud; the ribbon below still holds the fuller stack.";
  }
  if (/\b(note|sticky|scratch|remember|jot)\b/u.test(n)) {
    return "Notes live on the lower-left colony pad.";
  }
  if (/\b(map|maps|where is|located|coordinates|navigation|street)\b/u.test(n)) {
    return "The atlas iframe is hovering over the stack grid near the stacks tile.";
  }
  if (wantsBrowseOrchestration(intent)) {
    return "A browse strip floated up beside the hive browser screen.";
  }
  if (/\b(wikipedia|scout|tell me about|who is\b|looking up\b)\b/u.test(n)) {
    return "The scout dossier is centred on your hub hologram.";
  }
  if (/\b(orbit|apod|NASA\s+picture|astronomy|galaxy|cosmos)\b/u.test(n)) {
    return "Orbital telemetry is etched over the colony archive alcove.";
  }
  return "All set—you should see the details on screen.";
}

export async function orchestrateIntent(intent: string, emit: (update: OrchestrationUpdate) => void) {
  orchestrationQueue.push(async () => {
    emit({
      type: "timeline",
      event: {
        id: uid("event"),
        kind: "voice",
        title: "Intent received",
        detail: intent,
        timestamp: Date.now()
      }
    });

    if (getRemoteMcpTools().length === 0) {
      await connectToMCPServers();
    }

    emit({ type: "token", content: "Understanding intent. " });
    const mode = isConversationalIntent(intent) ? "conversation" : "orchestrate";

    if (isLikelyYoutubeVideoIntent(intent)) {
      await runYoutubeVideoCommand(intent, emit);
      return;
    }

    if (isMusicCommand(intent)) {
      await runMusicCommand(intent, emit);
      return;
    }

    const tools = getAvailableTools();
    if (getRemoteMcpTools().length === 0) {
      emit({
        type: "timeline",
        event: {
          id: uid("event"),
          kind: "system",
          title: "Remote MCP unreachable",
          detail:
            "No live /mcp tools yet—VEIL still exposes built-in headlines; fix NEXT_PUBLIC_MCP_ENDPOINT_* and reload for music, YouTube, and relay.",
          timestamp: Date.now()
        }
      });
    }

    const response = await fetch("/api/groq", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intent, tools, mode })
    });

    if (!response.ok || !response.body) {
      throw new Error("Groq orchestration stream failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let finalText = "";
    let buffer = "";
    let toolCallCount = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        const event = JSON.parse(payload) as {
          type: string;
          content?: string;
          toolCall?: { name: string; arguments: unknown };
        };
        if (event.type === "error" && event.content) {
          emit({
            type: "timeline",
            event: {
              id: uid("evt-groq"),
              kind: "error",
              title: "Groq orchestration error",
              detail: event.content,
              timestamp: Date.now()
            }
          });
          emit({ type: "error", error: event.content });
        }
        if (event.type === "token" && event.content) {
          finalText += event.content;
          emit({ type: "token", content: event.content });
        }
        if (event.type === "tool_call" && event.toolCall) {
          const mcpResolved = resolveMcpToolFromGroqSlug(event.toolCall.name);
          if (!mcpResolved) {
            emit({
              type: "error",
              error: `Unknown tool slug "${event.toolCall.name}". Servers may have refreshed — try again.`
            });
            continue;
          }
          toolCallCount += 1;
          for await (const update of streamToolExecution(mcpResolved.name, event.toolCall.arguments, mcpResolved.serverUrl)) {
            emit(update);
          }
        }
      }
    }

    const fallback = isConversationalIntent(intent)
      ? "I didn’t catch a clear next step—say one thing to play, check, or open."
      : "Nothing matched a live MCP tool yet—try rephrasing, or verify your MCP endpoints.";
    const responseText =
      toolCallCount > 0
        ? finalText.trim() || friendlyPostToolSpeech(intent)
        : finalText.trim().length > 0 && /tool|spotify|call|playing|activat/i.test(finalText)
          ? fallback
          : finalText.trim() || fallback;

    emit({ type: "complete", response: responseText });
  });

  if (!queueRunning) {
    queueRunning = true;
    while (orchestrationQueue.length) {
      const task = orchestrationQueue.shift();
      if (!task) continue;
      try {
        await task();
      } catch (error) {
        emit({ type: "error", error: error instanceof Error ? error.message : "Orchestration failed" });
      }
    }
    queueRunning = false;
  }
}

function getSessionId(serverUrl: string) {
  return sessions.get(serverUrl) ?? connections.get(serverUrl)?.sessionId;
}

function normalizeToolArguments(input: unknown) {
  if (input === null || input === undefined) return {};
  if (typeof input === "object" && !Array.isArray(input)) return input;
  return { value: input };
}
