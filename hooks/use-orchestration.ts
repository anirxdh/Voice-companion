"use client";

import { useCallback, useEffect, useRef } from "react";
import { connectToMCPServers, getAvailableTools, getRemoteMcpTools, orchestrateIntent } from "@/lib/mcp-client";
import { interruptSpeech, speakWithElevenLabs } from "@/lib/elevenlabs";
import { inferPreviewKind, normalizeMediaPreview } from "@/lib/media-preview";
import {
  extractAlarmHm,
  extractApodCalendarDate,
  extractMapsPlaceQuery,
  extractDirectionsFromTo,
  extractBrowseUrl,
  extractStickyNoteAppendBody,
  extractTimerDurationSec,
  extractWikiScoutQuery,
  extractWeatherCityQuery,
  extractOpenBrowserUrl,
  stickyNoteVoiceAction,
  wantsBrowseOrchestration,
  wantsClockDeskOrchestration,
  wantsDirectionsOrchestration,
  wantsMapsOrchestration,
  wantsNewsOrchestration,
  wantsOrbitOrchestration,
  wantsScoutOrchestration,
  wantsStickyNoteOrchestration,
  wantsWeatherOrchestration,
  wantsOpenBrowser,
  wantsBrowserPageAction
} from "@/lib/environment-intents";
import { inferTaskRoom, isActionIntent, isConversationalIntent, isLocalTimeIntent } from "@/lib/intent";
import { spokenLocalTimeLine } from "@/lib/local-time";
import { dtoToWeatherPayload, formatWeatherPreviewSummary, formatWeatherSpeech } from "@/lib/weather-format";
import type { WeatherDto } from "@/lib/weather-format";
import { useSuperNovaStore } from "@/store/use-supernova-store";
import type { OrchestrationUpdate } from "@/types/supernova";

function ttsLineForGroqConversation(raw: string): string {
  const normalized = raw.trim().replace(/\s+/g, " ");
  if (!normalized) return "I missed that—say it once more, a little tighter.";
  if (/^(hello|hi|hey)\b([\s,!?.]+)\b(hello|hi|hey)\b/iu.test(normalized)) {
    return "Still here—name one concrete thing for Super Nova to play, fetch, forecast, relay, time, or read from headlines.";
  }
  if (/^(hello|hi|hey|good\s+(morning|afternoon|evening))[\s,!?.]*$/iu.test(normalized)) {
    return "Understood—I’m ready. Mention audio or video MCP, timers, forecasts, atlas, browse links, scouts, headlines, inbox, orbit deck, or notes.";
  }
  return raw.trim();
}

export function useOrchestration() {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    connectToMCPServers()
      .then((connections) => {
        if (!active) return;
        useSuperNovaStore.getState().setMCPConnected(connections.some((connection) => connection.connected));
        useSuperNovaStore.getState().setAvailableTools(getAvailableTools());
        const remote = getRemoteMcpTools().length;
        if (remote > 0) {
          useSuperNovaStore.getState().addTimelineEvent({
            kind: "system",
            title: "MCP fabric online",
            detail: `${remote} remote tools reachable · ${getAvailableTools().length} total with built-ins`
          });
        }
      })
      .catch((error) => {
        if (!active) return;
        useSuperNovaStore.getState().setMCPConnected(false);
        useSuperNovaStore.getState().addTimelineEvent({
          kind: "error",
          title: "MCP fabric degraded",
          detail: error instanceof Error ? error.message : "Unable to connect"
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const handleUpdate = useCallback(
    (update: OrchestrationUpdate) => {
      if (update.type === "token") useSuperNovaStore.getState().appendThought(update.content);
      if (update.type === "node") useSuperNovaStore.getState().upsertNode(update.node);
      if (update.type === "edge") useSuperNovaStore.getState().upsertEdge(update.edge);
      if (update.type === "tool-start") {
        useSuperNovaStore.getState().upsertActiveTool(update.tool);
        useSuperNovaStore.getState().upsertAgent({
          id: update.tool.id,
          name: update.tool.toolName,
          role: "Executing MCP tool",
          status: "running",
          toolName: update.tool.toolName
        });
      }
      if (update.type === "tool-result") {
        useSuperNovaStore.getState().upsertActiveTool(update.tool);
        const preview = normalizeMediaPreview(
          update.tool.output,
          inferPreviewKind(update.tool.toolName, { serverUrl: update.tool.serverUrl }),
          useSuperNovaStore.getState().finalResponse,
          update.tool.toolName
        );
        if (preview) {
          if (preview.kind === "message") {
            useSuperNovaStore.getState().openRelayPreview(preview);
          } else if (preview.kind === "youtube" || preview.kind === "video") {
            // Route all YouTube/video through the browser widget (screenshot-based fullscreen)
            // instead of an iframe dock
            const rawUrl = preview.videoUrl || preview.embedUrl || "";
            const watchUrl = (() => {
              const em = rawUrl.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]+)/i);
              if (em?.[1]) return `https://www.youtube.com/watch?v=${em[1]}`;
              const wa = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/i);
              if (wa?.[1]) return `https://www.youtube.com/watch?v=${wa[1]}`;
              return rawUrl || "https://www.youtube.com";
            })();
            useSuperNovaStore.getState().setActiveRoom("browser");
            useSuperNovaStore.getState().openBrowserModal(watchUrl);
            fetch("/api/browser", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "open", url: watchUrl })
            }).catch(() => undefined);
          } else {
            useSuperNovaStore.getState().openAmbientPreview(preview);
          }
        }
        useSuperNovaStore.getState().upsertAgent({
          id: update.tool.id,
          name: update.tool.toolName,
          role: "Execution complete",
          status: update.tool.status,
          toolName: update.tool.toolName
        });
      }
      if (update.type === "open-browser") {
        useSuperNovaStore.getState().setActiveRoom("browser");
        useSuperNovaStore.getState().openBrowserModal(update.url);
        fetch("/api/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "open", url: update.url })
        }).catch(() => undefined);
      }
      if (update.type === "timeline") useSuperNovaStore.getState().addTimelineEvent(update.event);
      if (update.type === "error") {
        useSuperNovaStore.getState().setPhase("error");
        useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Orchestration fault", detail: update.error });
      }
      if (update.type === "complete") {
        useSuperNovaStore.getState().setFinalResponse(update.response);
        if (update.skipSpeech) {
          interruptSpeech();
          useSuperNovaStore.getState().setPhase("idle");
          return;
        }
        useSuperNovaStore.getState().setPhase("speaking");
        abortRef.current = new AbortController();
        speakWithElevenLabs({
          text: update.response,
          voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
          signal: abortRef.current.signal,
          emotion: "calm"
        })
          .catch(() => undefined)
          .finally(() => useSuperNovaStore.getState().setPhase("idle"));
      }
    },
    []
  );

  const runConversation = useCallback(
    async (message: string) => {
      abortRef.current?.abort();
      useSuperNovaStore.getState().resetOrchestration();
      useSuperNovaStore.getState().setTranscript(message);
      useSuperNovaStore.getState().setPhase("thinking");

      const response = await fetch("/api/conversation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message })
      });

      if (!response.ok || !response.body) {
        throw new Error("Conversation stream failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalText = "";
      let buffer = "";

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
          const event = JSON.parse(payload) as { type: string; content?: string };
          if (event.type === "token" && event.content) {
            finalText += event.content;
            useSuperNovaStore.getState().appendThought(event.content);
          }
        }
      }

      const spoken = ttsLineForGroqConversation(finalText);
      useSuperNovaStore.getState().setFinalResponse(spoken);
      useSuperNovaStore.getState().setPhase("speaking");
      abortRef.current = new AbortController();
      speakWithElevenLabs({
        text: spoken,
        voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
        signal: abortRef.current.signal,
        emotion: "warm"
      })
        .catch(() => undefined)
        .finally(() => {
          useSuperNovaStore.getState().setActiveRoom(null);
          useSuperNovaStore.getState().setPhase("idle");
        });
    },
    []
  );

  const runIntent = useCallback(
    async (intent: string) => {
      abortRef.current?.abort();

      // "close browser / close YouTube / stop video / hide player"
      if (
        /\b(close|stop|hide|dismiss|exit|shut)\b.{0,24}\b(browser|youtube|video|player|window|widget|panel)\b/i.test(intent.trim()) &&
        useSuperNovaStore.getState().browserModalUrl !== null
      ) {
        useSuperNovaStore.getState().closeBrowserModal();
        useSuperNovaStore.getState().setFinalResponse("Browser closed.");
        useSuperNovaStore.getState().setPhase("speaking");
        abortRef.current = new AbortController();
        speakWithElevenLabs({
          text: "Browser closed.",
          voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
          signal: abortRef.current.signal,
          emotion: "calm"
        }).catch(() => undefined).finally(() => useSuperNovaStore.getState().setPhase("idle"));
        return;
      }

      if (isLocalTimeIntent(intent)) {
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        useSuperNovaStore.getState().setActiveRoom("clock");
        useSuperNovaStore.getState().setPhase("thinking");
        useSuperNovaStore.getState().addTimelineEvent({
          kind: "system",
          title: "Local clock",
          detail: "Time from weather timezone or browser locale."
        });
        const line = await spokenLocalTimeLine();
        useSuperNovaStore.getState().openAmbientPreview({
          kind: "clockdesk",
          title: "Wall clock",
          summary: line
        });
        useSuperNovaStore.getState().setFinalResponse(line);
        useSuperNovaStore.getState().setPhase("speaking");
        abortRef.current = new AbortController();
        await speakWithElevenLabs({
          text: line,
          voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
          signal: abortRef.current.signal,
          emotion: "calm"
        })
          .catch(() => undefined)
          .finally(() => {
            useSuperNovaStore.getState().setActiveRoom(null);
            useSuperNovaStore.getState().setPhase("idle");
          });
        return;
      }

      if (wantsWeatherOrchestration(intent)) {
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        const cityQuery = extractWeatherCityQuery(intent);
        useSuperNovaStore.getState().setActiveRoom(cityQuery ? "browser" : "browser");
        useSuperNovaStore.getState().setPhase("thinking");
        useSuperNovaStore.getState().addTimelineEvent({
          kind: "system",
          title: cityQuery ? "City forecast" : "Local forecast",
          detail: cityQuery ? `${cityQuery} · pinned to browser desk` : "Super Nova weather dock"
        });

        try {
          const qs = cityQuery ? `?city=${encodeURIComponent(cityQuery)}` : "";
          const res = await fetch(`/api/weather${qs}`, { headers: { accept: "application/json" } });
          const raw = (await res.json()) as WeatherDto & { error?: string; city?: string };
          const speech = formatWeatherSpeech(raw);

          if (cityQuery) {
            useSuperNovaStore.getState().addWeatherPin({
              room: "browser",
              city: raw.city ?? cityQuery,
              title: `${raw.city ?? cityQuery}`,
              summary: formatWeatherPreviewSummary(raw),
              tempC: raw.current?.tempC,
              label: raw.current?.label
            });
          } else {
            useSuperNovaStore.getState().openAmbientPreview({
              kind: "weather",
              title: `${raw.city ?? "Forecast"} · now`,
              summary: formatWeatherPreviewSummary(raw),
              weather: dtoToWeatherPayload(raw),
              spokenText: speech
            });
          }

          useSuperNovaStore.getState().setFinalResponse(speech);
          useSuperNovaStore.getState().setPhase("speaking");
          abortRef.current = new AbortController();
          await speakWithElevenLabs({
            text: speech,
            voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
            signal: abortRef.current.signal,
            emotion: "calm"
          })
            .catch(() => undefined)
            .finally(() => {
              useSuperNovaStore.getState().setActiveRoom(null);
              useSuperNovaStore.getState().setPhase("idle");
            });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Weather request failed.";
          useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Weather unavailable", detail: msg });
          useSuperNovaStore.getState().setPhase("idle");
          useSuperNovaStore.getState().setActiveRoom(null);
        }
        return;
      }

      if (wantsNewsOrchestration(intent)) {
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        useSuperNovaStore.getState().setActiveRoom("downloads");
        useSuperNovaStore.getState().setPhase("thinking");
        useSuperNovaStore.getState().addTimelineEvent({
          kind: "system",
          title: "Headline stack",
          detail: "Hacker News snapshot · anchored bottom-center in the colony"
        });
        try {
          const res = await fetch(`/api/news`, { headers: { accept: "application/json" } });
          const json = (await res.json()) as {
            title?: string;
            speech?: string;
            summary?: string;
            items?: Array<{ title: string; url?: string; source?: string; score?: number }>;
          };
          const speech =
            typeof json.speech === "string" && json.speech.trim().length > 2
              ? json.speech.trim()
              : typeof json.summary === "string" && json.summary.trim()
                ? json.summary.trim().slice(0, 780)
                : "Headlines are on screen—you can ask me to read three aloud anytime.";
          const items = (Array.isArray(json.items) ? json.items : []).filter((row) => row && typeof row.title === "string");
          useSuperNovaStore.getState().openAmbientPreview({
            kind: "newsdesk",
            title: json.title ?? "Headlines · Hacker News",
            summary: typeof json.summary === "string" ? json.summary : undefined,
            news: items.slice(0, 14),
            spokenText: speech
          });
          useSuperNovaStore.getState().setFinalResponse(speech);
          useSuperNovaStore.getState().setPhase("speaking");
          abortRef.current = new AbortController();
          await speakWithElevenLabs({
            text: speech,
            voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
            signal: abortRef.current.signal,
            emotion: "warm"
          })
            .catch(() => undefined)
            .finally(() => {
              useSuperNovaStore.getState().setActiveRoom(null);
              useSuperNovaStore.getState().setPhase("idle");
            });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "News request failed.";
          useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "News unavailable", detail: msg });
          useSuperNovaStore.getState().setPhase("idle");
          useSuperNovaStore.getState().setActiveRoom(null);
        }
        return;
      }

      if (wantsStickyNoteOrchestration(intent)) {
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        useSuperNovaStore.getState().setActiveRoom("notes");
        useSuperNovaStore.getState().setPhase("thinking");
        useSuperNovaStore.getState().addTimelineEvent({
          kind: "system",
          title: "Sticky ledger",
          detail: ".supernova-notes.json · voices map to MCP sticky_note"
        });
        try {
          const act = stickyNoteVoiceAction(intent);
          let body: Record<string, unknown> = { action: act };
          if (act === "append") {
            const line = extractStickyNoteAppendBody(intent);
            if (!line.trim()) {
              useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Sticky pad", detail: "Need words to jot after that cue." });
              useSuperNovaStore.getState().setPhase("idle");
              useSuperNovaStore.getState().setActiveRoom(null);
              return;
            }
            body = { action: "append", text: line };
          }

          const res = await fetch("/api/colony-notes", {
            method: "POST",
            headers: { accept: "application/json", "content-type": "application/json" },
            body: JSON.stringify(body)
          });
          const json = (await res.json()) as {
            speech?: string;
            notes?: Array<{ id: string; text: string; createdAt: string }>;
            summaryLines?: string;
          };

          const speech =
            typeof json.speech === "string" && json.speech.trim()
              ? json.speech.trim()
              : typeof json.summaryLines === "string"
                ? json.summaryLines.slice(0, 420)
                : "Notes synced.";

          useSuperNovaStore.getState().openAmbientPreview({
            kind: "notesdesk",
            title: "Sticky notes · Super Nova pad",
            summary: typeof json.summaryLines === "string" ? json.summaryLines : undefined,
            stickyNotes: Array.isArray(json.notes) ? json.notes : [],
            spokenText: speech
          });

          useSuperNovaStore.getState().setFinalResponse(speech);
          useSuperNovaStore.getState().setPhase("speaking");
          abortRef.current = new AbortController();
          await speakWithElevenLabs({
            text: speech,
            voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
            signal: abortRef.current.signal,
            emotion: "calm"
          })
            .catch(() => undefined)
            .finally(() => {
              useSuperNovaStore.getState().setActiveRoom(null);
              useSuperNovaStore.getState().setPhase("idle");
            });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Notes request failed.";
          useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Notes unavailable", detail: msg });
          useSuperNovaStore.getState().setPhase("idle");
          useSuperNovaStore.getState().setActiveRoom(null);
        }
        return;
      }

      if (wantsBrowseOrchestration(intent.trim())) {
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        useSuperNovaStore.getState().setActiveRoom("browser");
        useSuperNovaStore.getState().setPhase("thinking");
        useSuperNovaStore.getState().addTimelineEvent({
          kind: "system",
          title: "Browse strip",
          detail: "/api/browse · veil__browse_page · optional FIRECRAWL_API_KEY"
        });

        try {
          const url = extractBrowseUrl(intent.trim());
          if (!url?.trim()) {
            useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Browse", detail: "Add a cue like browse or summarise plus https link." });
            useSuperNovaStore.getState().setPhase("idle");
            useSuperNovaStore.getState().setActiveRoom(null);
            return;
          }

          const res = await fetch(`/api/browse?url=${encodeURIComponent(url.trim())}`, { headers: { accept: "application/json" } });
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
            const errLine = typeof json.speech === "string" ? json.speech : typeof json.error === "string" ? json.error : "Browse failed.";
            useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Browse fault", detail: errLine.slice(0, 320) });
            useSuperNovaStore.getState().setPhase("idle");
            useSuperNovaStore.getState().setActiveRoom(null);
            return;
          }

          const speech =
            typeof json.speech === "string" && json.speech.trim()
              ? json.speech.trim()
              : typeof json.summary === "string"
                ? json.summary.slice(0, 460)
                : "Snapshotted that page.";

          const briefUrl = typeof json.url === "string" ? json.url : url.trim();
          const mk = typeof json.markdown === "string" ? json.markdown : "";

          useSuperNovaStore.getState().openAmbientPreview({
            kind: "browsedesk",
            title: json.title ?? briefUrl.replace(/^https?:\/\//iu, "").slice(0, 96),
            summary: typeof json.summary === "string" ? json.summary : mk.slice(0, 880),
            browseBrief: {
              url: briefUrl,
              title: typeof json.title === "string" ? json.title : undefined,
              markdown: mk || (typeof json.summary === "string" ? json.summary : speech),
              source: json.source === "firecrawl" ? "firecrawl" : "plain"
            },
            spokenText: speech
          });

          useSuperNovaStore.getState().setFinalResponse(speech);
          useSuperNovaStore.getState().setPhase("speaking");
          abortRef.current = new AbortController();
          await speakWithElevenLabs({
            text: speech,
            voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
            signal: abortRef.current.signal,
            emotion: "calm"
          })
            .catch(() => undefined)
            .finally(() => {
              useSuperNovaStore.getState().setActiveRoom(null);
              useSuperNovaStore.getState().setPhase("idle");
            });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Browse failed.";
          useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Browse unavailable", detail: msg });
          useSuperNovaStore.getState().setPhase("idle");
          useSuperNovaStore.getState().setActiveRoom(null);
        }
        return;
      }

      if (wantsDirectionsOrchestration(intent)) {
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        useSuperNovaStore.getState().setActiveRoom("library");
        useSuperNovaStore.getState().setPhase("thinking");
        useSuperNovaStore.getState().addTimelineEvent({ kind: "system", title: "Directions", detail: "OSRM routing + OpenStreetMap" });

        try {
          const fromTo = extractDirectionsFromTo(intent);
          if (!fromTo) {
            useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Directions", detail: "Couldn't parse origin and destination." });
            useSuperNovaStore.getState().setPhase("idle");
            useSuperNovaStore.getState().setActiveRoom(null);
            return;
          }

          const res = await fetch(`/api/directions?from=${encodeURIComponent(fromTo.from)}&to=${encodeURIComponent(fromTo.to)}`, { headers: { accept: "application/json" } });
          const json = (await res.json()) as {
            title?: string; speech?: string;
            origin?: string; destination?: string;
            originLabel?: string; destLabel?: string;
            routes?: Array<{ mode: string; distanceM: number; durationSec: number }>;
            mapEmbedUrl?: string; error?: string;
          };

          if (json.error || !json.routes) {
            const speech = json.speech ?? `Couldn't get directions from ${fromTo.from} to ${fromTo.to}.`;
            useSuperNovaStore.getState().setFinalResponse(speech);
            useSuperNovaStore.getState().setPhase("speaking");
            abortRef.current = new AbortController();
            await speakWithElevenLabs({ text: speech, voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID, signal: abortRef.current.signal, emotion: "calm" }).catch(() => undefined).finally(() => { useSuperNovaStore.getState().setPhase("idle"); useSuperNovaStore.getState().setActiveRoom(null); });
            return;
          }

          const speech = typeof json.speech === "string" && json.speech.trim() ? json.speech.trim() : `Got directions from ${json.originLabel ?? json.origin ?? fromTo.from} to ${json.destLabel ?? json.destination ?? fromTo.to}.`;

          useSuperNovaStore.getState().openAmbientPreview({
            kind: "mapdesk",
            title: json.title ?? `${json.originLabel ?? fromTo.from} → ${json.destLabel ?? fromTo.to}`,
            summary: speech,
            mapEmbedUrl: json.mapEmbedUrl,
            directions: {
              origin: json.origin ?? fromTo.from,
              destination: json.destination ?? fromTo.to,
              originLabel: json.originLabel,
              destLabel: json.destLabel,
              routes: (json.routes ?? []) as Array<{ mode: "driving" | "walking" | "cycling"; distanceM: number; durationSec: number }>,
              mapEmbedUrl: json.mapEmbedUrl,
            },
            spokenText: speech,
          });

          useSuperNovaStore.getState().setFinalResponse(speech);
          useSuperNovaStore.getState().setPhase("speaking");
          abortRef.current = new AbortController();
          await speakWithElevenLabs({ text: speech, voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID, signal: abortRef.current.signal, emotion: "calm" }).catch(() => undefined).finally(() => { useSuperNovaStore.getState().setActiveRoom(null); useSuperNovaStore.getState().setPhase("idle"); });
        } catch (err) {
          useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Directions", detail: String(err) });
          useSuperNovaStore.getState().setPhase("idle");
          useSuperNovaStore.getState().setActiveRoom(null);
        }
        return;
      }

      if (wantsMapsOrchestration(intent)) {
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        useSuperNovaStore.getState().setActiveRoom("library");
        useSuperNovaStore.getState().setPhase("thinking");
        useSuperNovaStore.getState().addTimelineEvent({
          kind: "system",
          title: "Atlas frame",
          detail: "Nominatim + Live OpenStreetMap embed"
        });

        try {
          const q = extractMapsPlaceQuery(intent);
          if (!q) {
            useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Atlas", detail: "Name what to locate on Earth." });
            useSuperNovaStore.getState().setPhase("idle");
            useSuperNovaStore.getState().setActiveRoom(null);
            return;
          }

          const res = await fetch(`/api/maps?query=${encodeURIComponent(q)}`, { headers: { accept: "application/json" } });
          const json = (await res.json()) as {
            title?: string;
            speech?: string;
            summary?: string;
            embedUrl?: string;
          };

          const speech =
            typeof json.speech === "string" && json.speech.trim()
              ? json.speech.trim()
              : typeof json.summary === "string"
                ? json.summary.slice(0, 460)
                : "Atlas synced.";

          useSuperNovaStore.getState().openAmbientPreview({
            kind: "mapdesk",
            title: json.title ?? `Atlas · ${q}`,
            summary: json.summary ?? q,
            mapEmbedUrl: json.embedUrl,
            spokenText: speech
          });

          useSuperNovaStore.getState().setFinalResponse(speech);
          useSuperNovaStore.getState().setPhase("speaking");
          abortRef.current = new AbortController();
          await speakWithElevenLabs({
            text: speech,
            voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
            signal: abortRef.current.signal,
            emotion: "calm"
          })
            .catch(() => undefined)
            .finally(() => {
              useSuperNovaStore.getState().setActiveRoom(null);
              useSuperNovaStore.getState().setPhase("idle");
            });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Maps request failed.";
          useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Atlas fault", detail: msg });
          useSuperNovaStore.getState().setPhase("idle");
          useSuperNovaStore.getState().setActiveRoom(null);
        }
        return;
      }

      if (wantsScoutOrchestration(intent)) {
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        useSuperNovaStore.getState().setActiveRoom("hub");
        useSuperNovaStore.getState().setPhase("thinking");
        useSuperNovaStore.getState().addTimelineEvent({
          kind: "system",
          title: "Wikipedia scout",
          detail: "Public search + synopsis · wiki_scout"
        });

        try {
          const q = extractWikiScoutQuery(intent);
          if (!q) {
            useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Scout paused", detail: "Need something factual to dossier." });
            useSuperNovaStore.getState().setPhase("idle");
            useSuperNovaStore.getState().setActiveRoom(null);
            return;
          }

          const res = await fetch(`/api/scout?query=${encodeURIComponent(q)}`, { headers: { accept: "application/json" } });
          const json = (await res.json()) as {
            title?: string;
            speech?: string;
            summary?: string;
            scout?: {
              query?: string;
              title?: string;
              extract?: string;
              pageUrl?: string;
              thumbUrl?: string;
            };
          };

          const speech =
            typeof json.speech === "string" && json.speech.trim()
              ? json.speech.trim()
              : typeof json.summary === "string"
                ? json.summary.slice(0, 520)
                : "Reading the encyclopedia aloud.";

          useSuperNovaStore.getState().openAmbientPreview({
            kind: "scoutdesk",
            title: json.title ?? `Scout · ${q}`,
            summary: json.summary,
            scoutBrief: {
              query: json.scout?.query ?? q,
              title: json.scout?.title ?? "Wikipedia dossier",
              extract: json.scout?.extract ?? json.summary ?? speech,
              pageUrl: json.scout?.pageUrl,
              thumbUrl: json.scout?.thumbUrl
            },
            spokenText: speech
          });

          useSuperNovaStore.getState().setFinalResponse(speech);
          useSuperNovaStore.getState().setPhase("speaking");
          abortRef.current = new AbortController();
          await speakWithElevenLabs({
            text: speech,
            voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
            signal: abortRef.current.signal,
            emotion: "calm"
          })
            .catch(() => undefined)
            .finally(() => {
              useSuperNovaStore.getState().setActiveRoom(null);
              useSuperNovaStore.getState().setPhase("idle");
            });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Scout request failed.";
          useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Scout fault", detail: msg });
          useSuperNovaStore.getState().setPhase("idle");
          useSuperNovaStore.getState().setActiveRoom(null);
        }
        return;
      }

      if (wantsOrbitOrchestration(intent)) {
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        useSuperNovaStore.getState().setActiveRoom("archive");
        useSuperNovaStore.getState().setPhase("thinking");
        useSuperNovaStore.getState().addTimelineEvent({
          kind: "system",
          title: "Orbit observatory",
          detail: "NASA Astronomy Picture of the Day · orbit_apod"
        });

        try {
          const iso = extractApodCalendarDate(intent);
          const res = await fetch(iso ? `/api/orbit?date=${encodeURIComponent(iso)}` : "/api/orbit", {
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

          const speech =
            typeof json.speech === "string" && json.speech.trim()
              ? json.speech.trim()
              : typeof json.summary === "string"
                ? json.summary.slice(0, 520)
                : "Transmitting orbital imagery cues.";

          useSuperNovaStore.getState().openAmbientPreview({
            kind: "orbitdesk",
            title: json.title ?? "Orbit · observatory",
            summary: json.summary ?? json.orbit?.explanation,
            orbitBrief: json.orbit,
            spokenText: speech
          });

          useSuperNovaStore.getState().setFinalResponse(speech);
          useSuperNovaStore.getState().setPhase("speaking");
          abortRef.current = new AbortController();
          await speakWithElevenLabs({
            text: speech,
            voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
            signal: abortRef.current.signal,
            emotion: "calm"
          })
            .catch(() => undefined)
            .finally(() => {
              useSuperNovaStore.getState().setActiveRoom(null);
              useSuperNovaStore.getState().setPhase("idle");
            });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Orbit request failed.";
          useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Orbit uplink fault", detail: msg });
          useSuperNovaStore.getState().setPhase("idle");
          useSuperNovaStore.getState().setActiveRoom(null);
        }
        return;
      }

      if (wantsClockDeskOrchestration(intent)) {
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        useSuperNovaStore.getState().setActiveRoom("clock");
        useSuperNovaStore.getState().setPhase("thinking");

        const notes: string[] = [];
        const timerSec = extractTimerDurationSec(intent);
        if (timerSec != null) {
          const labelMin = Math.max(1, Math.round(timerSec / 60));
          useSuperNovaStore.getState().startActiveTimer({
            durationSec: timerSec,
            label: timerSec >= 3600 ? `${Math.round(timerSec / 3600)}h` : `${labelMin}m`
          });
          if (timerSec >= 3600) notes.push(`${Math.round(timerSec / 3600)} hour timer armed`);
          else if (timerSec >= 60) notes.push(`${Math.round(timerSec / 60)} minute timer armed`);
          else notes.push(`${timerSec} second timer armed`);
        }
        const alarm = extractAlarmHm(intent);
        if (alarm != null) {
          useSuperNovaStore.getState().addAlarmEntry({ hour24: alarm.hour24, minute: alarm.minute, enabled: true });
          notes.push(`Alarm saved for ${String(alarm.hour24).padStart(2, "0")}:${String(alarm.minute).padStart(2, "0")}`);
        }

        useSuperNovaStore.getState().addTimelineEvent({
          kind: "system",
          title: "Clock workspace",
          detail: notes.length ? notes.join(" · ") : "Opened timers & alarms dock"
        });

        const line = notes.join(". ") || "Opening the clock workspace.";
        useSuperNovaStore.getState().openAmbientPreview({
          kind: "clockdesk",
          title: "Clock · timers · alarms",
          summary: notes.length ? notes.join(" · ") : undefined
        });
        useSuperNovaStore.getState().setFinalResponse(line);
        useSuperNovaStore.getState().setPhase("speaking");
        abortRef.current = new AbortController();
        await speakWithElevenLabs({
          text: line,
          voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
          signal: abortRef.current.signal,
          emotion: "calm"
        })
          .catch(() => undefined)
          .finally(() => {
            useSuperNovaStore.getState().setActiveRoom(null);
            useSuperNovaStore.getState().setPhase("idle");
          });
        return;
      }

      // Browser page action — only fires when the browser is already open
      if (wantsBrowserPageAction(intent) && useSuperNovaStore.getState().browserModalUrl) {
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        useSuperNovaStore.getState().setActiveRoom("browser");
        useSuperNovaStore.getState().setPhase("orchestrating");
        useSuperNovaStore.getState().addTimelineEvent({
          kind: "system",
          title: "Browser action",
          detail: intent.slice(0, 80)
        });
        try {
          const res = await fetch("/api/browser", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "task", command: intent.trim() })
          });
          const json = (await res.json()) as { success?: boolean; steps?: number; error?: string };
          const speech = json.success
            ? `Done — ran ${json.steps ?? "the"} steps on the page.`
            : `Browser action failed: ${json.error ?? "unknown error"}.`;
          useSuperNovaStore.getState().setFinalResponse(speech);
          useSuperNovaStore.getState().setPhase("speaking");
          abortRef.current = new AbortController();
          await speakWithElevenLabs({
            text: speech,
            voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
            signal: abortRef.current.signal,
            emotion: "calm"
          })
            .catch(() => undefined)
            .finally(() => {
              useSuperNovaStore.getState().setActiveRoom(null);
              useSuperNovaStore.getState().setPhase("idle");
            });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Browser action failed.";
          useSuperNovaStore.getState().addTimelineEvent({ kind: "error", title: "Browser action fault", detail: msg });
          useSuperNovaStore.getState().setPhase("idle");
          useSuperNovaStore.getState().setActiveRoom(null);
        }
        return;
      }

      if (wantsOpenBrowser(intent)) {
        const url = extractOpenBrowserUrl(intent.trim());
        const hostname = (() => {
          try { return new URL(url).hostname.replace(/^www\./, ""); }
          catch { return url; }
        })();
        useSuperNovaStore.getState().resetOrchestration();
        useSuperNovaStore.getState().setTranscript(intent);
        useSuperNovaStore.getState().setActiveRoom("browser");
        useSuperNovaStore.getState().setPhase("thinking");
        useSuperNovaStore.getState().addTimelineEvent({
          kind: "system",
          title: "Browser opened",
          detail: `Navigating to ${hostname}`
        });
        useSuperNovaStore.getState().openBrowserModal(url);
        fetch("/api/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "open", url })
        }).catch(() => undefined);
        const speech = `Opening ${hostname} for you.`;
        useSuperNovaStore.getState().setFinalResponse(speech);
        useSuperNovaStore.getState().setPhase("speaking");
        abortRef.current = new AbortController();
        await speakWithElevenLabs({
          text: speech,
          voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
          signal: abortRef.current.signal,
          emotion: "calm"
        })
          .catch(() => undefined)
          .finally(() => {
            useSuperNovaStore.getState().setActiveRoom(null);
            useSuperNovaStore.getState().setPhase("idle");
          });
        return;
      }

      if (isConversationalIntent(intent) || !isActionIntent(intent)) {
        useSuperNovaStore.getState().setActiveRoom(null);
        await runConversation(intent);
        return;
      }
      useSuperNovaStore.getState().resetOrchestration();
      useSuperNovaStore.getState().setTranscript(intent);
      useSuperNovaStore.getState().setActiveRoom(inferTaskRoom(intent));
      useSuperNovaStore.getState().setPhase("orchestrating");
      useSuperNovaStore.getState().upsertAgent({ id: "intent", name: "Intent Core", role: "Understanding intent", status: "running" });
      useSuperNovaStore.getState().upsertAgent({ id: "orchestrator", name: "Workflow Agent", role: "Planning workflow", status: "planning" });
      await orchestrateIntent(intent, handleUpdate);
    },
    [handleUpdate, runConversation]
  );

  return { runIntent };
}
