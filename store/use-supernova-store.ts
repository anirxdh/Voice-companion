"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  ActiveTimerEntry,
  ActiveTool,
  AgentEntity,
  AIPhase,
  AlarmEntry,
  MCPTool,
  MediaPreview,
  MemoryCard,
  OrchestrationEdge,
  OrchestrationNode,
  ProactiveInsight,
  TimelineEvent,
  WeatherRoomPin
} from "@/types/supernova";
import { uid } from "@/lib/utils";

type SuperNovaState = {
  phase: AIPhase;
  transcript: string;
  thoughtStream: string;
  finalResponse: string;
  mcpConnected: boolean;
  availableTools: MCPTool[];
  activeTools: ActiveTool[];
  agents: AgentEntity[];
  nodes: OrchestrationNode[];
  edges: OrchestrationEdge[];
  timeline: TimelineEvent[];
  memoryCards: MemoryCard[];
  insights: ProactiveInsight[];
  audioLevel: number;
  
  ambientPreview: MediaPreview | null;
  
  relayPreview: MediaPreview | null;
  activeRoom: string | null;
  colonyCrowdMode: "idle" | "pulse" | "theatre";
  browserModalUrl: string | null;
  isMicSuppressed: boolean;
  crewDeckOpen: boolean;
  selectedCrewEntryId: string | null;
  weatherPins: WeatherRoomPin[];
  alarmEntries: AlarmEntry[];
  activeTimers: ActiveTimerEntry[];
  addWeatherPin: (pin: Omit<WeatherRoomPin, "id"> & { id?: string }) => void;
  removeWeatherPin: (id: string) => void;
  clearWeatherPins: () => void;
  addAlarmEntry: (entry: Omit<AlarmEntry, "id"> & { id?: string }) => void;
  removeAlarmEntry: (id: string) => void;
  markAlarmRingAtMinuteBucket: (id: string, minuteBucket: number) => void;
  startActiveTimer: (payload: { durationSec: number; label?: string }) => void;
  removeActiveTimer: (id: string) => void;
  setPhase: (phase: AIPhase) => void;
  setTranscript: (value: string) => void;
  appendThought: (value: string) => void;
  setFinalResponse: (value: string) => void;
  setMCPConnected: (value: boolean) => void;
  setAvailableTools: (tools: MCPTool[]) => void;
  upsertActiveTool: (tool: ActiveTool) => void;
  upsertNode: (node: OrchestrationNode) => void;
  upsertEdge: (edge: OrchestrationEdge) => void;
  upsertAgent: (agent: AgentEntity) => void;
  addTimelineEvent: (event: Omit<TimelineEvent, "id" | "timestamp">) => void;
  setAudioLevel: (level: number) => void;
  openAmbientPreview: (preview: MediaPreview) => void;
  openRelayPreview: (preview: MediaPreview) => void;
  
  openPreview: (preview: MediaPreview) => void;
  closeAmbientPreview: () => void;
  closeRelayPreview: () => void;
  
  closePreview: () => void;
  setActiveRoom: (room: string | null) => void;
  setColonyCrowdMode: (mode: SuperNovaState["colonyCrowdMode"]) => void;
  openBrowserModal: (url: string) => void;
  closeBrowserModal: () => void;
  setMicSuppressed: (suppressed: boolean) => void;
  openCrewDeck: () => void;
  closeCrewDeck: () => void;
  toggleCrewDeck: () => void;
  setSelectedCrewEntryId: (selectedCrewEntryId: string | null) => void;
  resetOrchestration: () => void;
  interrupt: () => void;
};

const initialAgents: AgentEntity[] = [
  { id: "intent", name: "Intent Core", role: "Understanding intent", status: "idle" },
  { id: "memory", name: "Memory Agent", role: "Restoring context", status: "idle" },
  { id: "orchestrator", name: "Workflow Agent", role: "Coordinating tools", status: "idle" },
  { id: "voice", name: "Voice Agent", role: "Responding emotionally", status: "idle" }
];

const noopJsonStorage = () => ({
  getItem: (): string | null => null,
  setItem: (): void => undefined,
  removeItem: (): void => undefined
});

export const useSuperNovaStore = create<SuperNovaState>()(
  persist(
    (set) => ({
  phase: "startup",
  transcript: "",
  thoughtStream: "",
  finalResponse: "",
  mcpConnected: false,
  availableTools: [],
  activeTools: [],
  agents: initialAgents,
  nodes: [
    { id: "human", label: "Human intent", status: "idle", x: 20, y: 54 },
    { id: "supernova", label: "Super Nova", status: "idle", x: 50, y: 42 },
    { id: "software", label: "Software layer", status: "idle", x: 80, y: 58 }
  ],
  edges: [
    { id: "human-veil", from: "human", to: "supernova", status: "queued" },
    { id: "veil-software", from: "supernova", to: "software", status: "queued" }
  ],
  timeline: [],
  memoryCards: [
    {
      id: "reply-alex",
      title: "Alex thread",
      detail: "A reply is still open from earlier today.",
      signal: "communication",
      confidence: 0.84
    },
    {
      id: "tomorrow",
      title: "Tomorrow workspace",
      detail: "Calendar context suggests a planning window after 9:00 AM.",
      signal: "continuity",
      confidence: 0.72
    },
    {
      id: "music-state",
      title: "Evening rhythm",
      detail: "Relaxed audio context usually starts around this time.",
      signal: "ambient",
      confidence: 0.67
    }
  ],
  insights: [
    {
      id: "break",
      title: "Attention drift detected",
      detail: "You have been in a focus block long enough for a reset to help.",
      mood: "recovery"
    },
    {
      id: "followup",
      title: "Unfinished social loop",
      detail: "You still have one conversation that may need a response.",
      mood: "calm"
    },
    {
      id: "briefing",
      title: "Morning continuity",
      detail: "Super Nova can prepare a brief from calendar, notes, and message context.",
      mood: "focus"
    }
  ],
  audioLevel: 0,
  ambientPreview: null,
  relayPreview: null,
  activeRoom: null,
  colonyCrowdMode: "idle",
  browserModalUrl: null,
  isMicSuppressed: false,
  crewDeckOpen: false,
  selectedCrewEntryId: "luffy-grin",
  weatherPins: [],
  alarmEntries: [],
  activeTimers: [],
  setPhase: (phase) => set({ phase }),
  setTranscript: (transcript) => set({ transcript }),
  appendThought: (value) => set((state) => ({ thoughtStream: `${state.thoughtStream}${value}`.slice(-1600) })),
  setFinalResponse: (finalResponse) => set({ finalResponse }),
  setMCPConnected: (mcpConnected) => set({ mcpConnected }),
  setAvailableTools: (availableTools) => set({ availableTools }),
  upsertActiveTool: (tool) =>
    set((state) => ({
      activeTools: [tool, ...state.activeTools.filter((item) => item.id !== tool.id)].slice(0, 8)
    })),
  upsertNode: (node) =>
    set((state) => ({
      nodes: [node, ...state.nodes.filter((item) => item.id !== node.id)]
    })),
  upsertEdge: (edge) =>
    set((state) => ({
      edges: [edge, ...state.edges.filter((item) => item.id !== edge.id)]
    })),
  upsertAgent: (agent) =>
    set((state) => ({
      agents: state.agents.map((item) => (item.id === agent.id ? agent : item)).concat(state.agents.some((item) => item.id === agent.id) ? [] : [agent])
    })),
  addTimelineEvent: (event) =>
    set((state) => ({
      timeline: [{ ...event, id: uid("event"), timestamp: Date.now() }, ...state.timeline].slice(0, 18)
    })),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  openAmbientPreview: (preview) => {
    if (preview.kind === "message") return;
    set({ ambientPreview: preview });
  },
  openRelayPreview: (preview) => {
    if (preview.kind !== "message") return;
    set({ relayPreview: preview });
  },
  openPreview: (preview) =>
    set(preview.kind === "message" ? { relayPreview: preview } : { ambientPreview: preview }),
  closeAmbientPreview: () => set({ ambientPreview: null }),
  closeRelayPreview: () => set({ relayPreview: null }),
  closePreview: () =>
    set((state) =>
      state.relayPreview ? { relayPreview: null } : { ambientPreview: null }
    ),
  setActiveRoom: (activeRoom) => set({ activeRoom }),
  setColonyCrowdMode: (colonyCrowdMode) => set({ colonyCrowdMode }),
  openBrowserModal: (browserModalUrl) => set({ browserModalUrl }),
  closeBrowserModal: () => set({ browserModalUrl: null }),
  setMicSuppressed: (isMicSuppressed) => set({ isMicSuppressed }),
  openCrewDeck: () => set({ crewDeckOpen: true }),
  closeCrewDeck: () => set({ crewDeckOpen: false }),
  toggleCrewDeck: () => set((s) => ({ crewDeckOpen: !s.crewDeckOpen })),
  setSelectedCrewEntryId: (selectedCrewEntryId) => set({ selectedCrewEntryId }),
  addWeatherPin: (pin) =>
    set((state) => {
      const id = pin.id ?? uid("wpin");
      const cityKey = pin.city.trim().toLowerCase();
      const rest = state.weatherPins.filter((p) => p.city.trim().toLowerCase() !== cityKey);
      return { weatherPins: [{ ...pin, id }, ...rest].slice(0, 6) };
    }),
  removeWeatherPin: (id) => set((state) => ({ weatherPins: state.weatherPins.filter((p) => p.id !== id) })),
  clearWeatherPins: () => set({ weatherPins: [] }),
  addAlarmEntry: (entry) =>
    set((state) => {
      const enabled = entry.enabled ?? true;
      const labelNew = typeof entry.label === "string" ? entry.label.trim() : undefined;

      const match = state.alarmEntries.find(
        (a) => a.hour24 === entry.hour24 && a.minute === entry.minute && (a.label?.trim() || "") === (labelNew ?? "")
      );
      if (match) {
        const merged: AlarmEntry = {
          ...match,
          enabled,
          label: labelNew !== undefined ? (labelNew || undefined) : match.label,
          /** Keep de-dupe id + prior ring bookkeeping so confirmations don’t stack duplicate alarms. */
          lastFiredAtBucket: match.lastFiredAtBucket
        };
        const rest = state.alarmEntries.filter((a) => a.id !== match.id);
        return { alarmEntries: [merged, ...rest].slice(0, 16) };
      }

      const id = entry.id ?? uid("alarm");
      return {
        alarmEntries: [{ ...entry, id, enabled, label: labelNew || undefined }, ...state.alarmEntries].slice(0, 16)
      };
    }),
  removeAlarmEntry: (id) =>
    set((state) => ({
      alarmEntries: state.alarmEntries.filter((a) => a.id !== id)
    })),
  markAlarmRingAtMinuteBucket: (id, minuteBucket) =>
    set((state) => ({
      alarmEntries: state.alarmEntries.map((a) => (a.id === id ? { ...a, lastFiredAtBucket: minuteBucket } : a))
    })),
  startActiveTimer: ({ durationSec, label }) =>
    set((state) => ({
      activeTimers: [
        {
          id: uid("timer"),
          label,
          endsAtMs: Date.now() + durationSec * 1000
        },
        ...state.activeTimers.filter((t) => t.endsAtMs > Date.now())
      ].slice(0, 6)
    })),
  removeActiveTimer: (id) => set((state) => ({ activeTimers: state.activeTimers.filter((t) => t.id !== id) })),
  resetOrchestration: () =>
    set((state) => ({
      thoughtStream: "",
      finalResponse: "",
      activeTools: [],
      ambientPreview: state.ambientPreview?.kind === "clockdesk" ? state.ambientPreview : null,
      relayPreview: null,
      activeRoom: null,
      colonyCrowdMode: "idle",
      agents: initialAgents.map((agent) => ({ ...agent, status: "idle" })),
      nodes: [
        { id: "human", label: "Human intent", status: "idle", x: 20, y: 54 },
        { id: "supernova", label: "Super Nova", status: "idle", x: 50, y: 42 },
        { id: "software", label: "Software layer", status: "idle", x: 80, y: 58 }
      ],
      edges: [
        { id: "human-veil", from: "human", to: "supernova", status: "queued" },
        { id: "veil-software", from: "supernova", to: "software", status: "queued" }
      ]
    })),
  interrupt: () =>
    set({
      phase: "interrupted",
      activeRoom: null,
      agents: initialAgents.map((agent) => ({ ...agent, status: agent.id === "voice" ? "error" : "idle" }))
    })
}),
    {
      name: "veil-colony-desk",
      version: 1,
      storage: createJSONStorage(typeof window !== "undefined" ? () => localStorage : noopJsonStorage),
      partialize: (state) => ({
        alarmEntries: state.alarmEntries,
        activeTimers: state.activeTimers.filter((t) => t.endsAtMs > Date.now())
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<Pick<SuperNovaState, "alarmEntries" | "activeTimers">> | null;
        if (!p || typeof p !== "object") return current;
        const now = Date.now();
        return {
          ...current,
          alarmEntries: Array.isArray(p.alarmEntries) ? p.alarmEntries : current.alarmEntries,
          activeTimers: Array.isArray(p.activeTimers) ? p.activeTimers.filter((t) => t.endsAtMs > now) : current.activeTimers
        };
      }
    }
  )
);
