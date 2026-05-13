export type AIPhase = "startup" | "idle" | "listening" | "thinking" | "orchestrating" | "speaking" | "interrupted" | "error";

export type AgentStatus = "idle" | "planning" | "connecting" | "running" | "complete" | "error";

export type TimelineEventKind = "voice" | "reasoning" | "tool" | "agent" | "system" | "error";

export type MCPTool = {
  id: string;
  serverUrl: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

export type ActiveTool = {
  id: string;
  toolName: string;
  serverUrl: string;
  status: AgentStatus;
  startedAt: number;
  completedAt?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
};

export type OrchestrationNode = {
  id: string;
  label: string;
  status: AgentStatus;
  toolName?: string;
  serverUrl?: string;
  x: number;
  y: number;
};

export type OrchestrationEdge = {
  id: string;
  from: string;
  to: string;
  status: "queued" | "active" | "complete" | "error";
};

export type TimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  title: string;
  detail: string;
  timestamp: number;
};

export type MemoryCard = {
  id: string;
  title: string;
  detail: string;
  signal: string;
  confidence: number;
};

export type ProactiveInsight = {
  id: string;
  title: string;
  detail: string;
  mood: "calm" | "urgent" | "focus" | "recovery";
};

export type WeatherPreviewPayload = {
  city: string;
  tempC?: number;
  feelsC?: number;
  label?: string;
  highC?: number;
  lowC?: number;
  precipChance?: number;
  wind?: number;
  humidity?: number;
  sunrise?: string;
  sunset?: string;
  fetchedAt?: string;
};


export type WeatherRoomPin = {
  id: string;
  room: string;
  city: string;
  title: string;
  summary?: string;
  tempC?: number;
  label?: string;
};

export type AlarmEntry = {
  id: string;
  hour24: number;
  minute: number;
  label?: string;
  enabled: boolean;
  
  lastFiredAtBucket?: number;
};

export type ActiveTimerEntry = {
  id: string;
  label?: string;
  endsAtMs: number;
};

export type NewsPreviewItem = {
  title: string;
  url?: string;
  source?: string;
  score?: number;
};


export type ColonyStickyNote = {
  id: string;
  text: string;
  createdAt: string;
};

export type ColonyScoutBrief = {
  query: string;
  title: string;
  extract: string;
  pageUrl?: string;
  thumbUrl?: string;
};

export type ColonyOrbitBrief = {
  title: string;
  explanation: string;
  imageUrl?: string;
  date?: string;
  credit?: string;
};


export type ColonyBrowseBrief = {
  url: string;
  title?: string;
  markdown: string;
  source: "firecrawl" | "plain";
};

export type MediaPreview = {
  
  kind:
    | "music"
    | "video"
    | "youtube"
    | "voice"
    | "message"
    | "weather"
    | "clockdesk"
    | "newsdesk"
    | "notesdesk"
    | "mapdesk"
    | "browsedesk"
    | "scoutdesk"
    | "orbitdesk";
  title: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  previewUrl?: string;
  videoUrl?: string;
  embedUrl?: string;
  
  mapEmbedUrl?: string;
  deezerUrl?: string;
  audiusUrl?: string;
  summary?: string;
  spokenText?: string;
  
  mcpToolName?: string;
  
  weather?: WeatherPreviewPayload;
  
  news?: NewsPreviewItem[];
  stickyNotes?: ColonyStickyNote[];
  scoutBrief?: ColonyScoutBrief;
  orbitBrief?: ColonyOrbitBrief;
  browseBrief?: ColonyBrowseBrief;
  directions?: DirectionsData;
};

export type TravelMode = { mode: "driving" | "walking" | "cycling"; distanceM: number; durationSec: number };

export type DirectionsData = {
  origin: string;
  destination: string;
  originLabel?: string;
  destLabel?: string;
  routes: TravelMode[];
  mapEmbedUrl?: string;
};

export type AgentEntity = {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  toolName?: string;
};

export type OrchestrationUpdate =
  | { type: "token"; content: string }
  | { type: "node"; node: OrchestrationNode }
  | { type: "edge"; edge: OrchestrationEdge }
  | { type: "tool-start"; tool: ActiveTool }
  | { type: "tool-result"; tool: ActiveTool }
  | { type: "timeline"; event: TimelineEvent }
  | { type: "complete"; response: string; skipSpeech?: boolean }
  | { type: "open-browser"; url: string }
  | { type: "error"; error: string };

export type AgentExecutionContext = {
  intent: string;
  tools: MCPTool[];
  emit: (update: OrchestrationUpdate) => void;
};

export type AgentExecutionResult = {
  agentId: string;
  status: AgentStatus;
  summary: string;
  data?: unknown;
};

export type SpeechRecognitionConstructor = new () => SpeechRecognition;

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

export type SpeechRecognitionErrorEvent = Event & {
  error: string;
  message?: string;
};

export type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
