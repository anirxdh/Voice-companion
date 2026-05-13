"use client";

import { useCallback, useState } from "react";
import { MediaPreviewModal } from "@/components/media-preview-modal";
import { AppBackdrop } from "@/components/app-backdrop";
import { ColonyRoomPins } from "@/components/colony-room-pins";
import { ColonyCrowdSync } from "@/components/pets/colony-crowd-sync";
import { ColonyClockRinger } from "@/hooks/use-colony-clock-ringer";
import { useOrchestration } from "@/hooks/use-orchestration";
import { useVoice } from "@/hooks/use-voice";
import { useMediaMicSuppress } from "@/hooks/use-media-mic-suppress";
import { useSuperNovaStore } from "@/store/use-supernova-store";
import { interruptSpeech } from "@/lib/elevenlabs";
import { BrowserWidget } from "@/components/browser/browser-widget";
import { ColonyHero } from "@/components/colony/colony-hero";
import { RoomGlow } from "@/components/colony/room-glow";
import { VoiceHud } from "@/components/hud/voice-hud";

export function SuperNovaApp() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [sceneLive, setSceneLive] = useState(false);
  const setPhase = useSuperNovaStore((s) => s.setPhase);
  const colonyCrowdMode = useSuperNovaStore((s) => s.colonyCrowdMode);
  const { runIntent } = useOrchestration();

  const onIntent = useCallback(
    (intent: string) => { void runIntent(intent); },
    [runIntent]
  );

  const voice = useVoice({ onIntent });
  useMediaMicSuppress();

  const handleOrbClick = useCallback(async () => {
    if (sceneLive) {
      voice.stop();
      setVoiceEnabled(false);
      setSceneLive(false);
      interruptSpeech();
      setPhase("idle");
      return;
    }

    setSceneLive(true);

    const started = await voice.start();
    setVoiceEnabled(started);
    if (started) {
      setPhase("listening");
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission().catch(() => undefined);
      }
    }
  }, [sceneLive, voice, setPhase]);

  return (
    <main
      className="veil-surface scanlines relative h-screen w-screen overflow-hidden text-white"
      data-colony={sceneLive ? colonyCrowdMode : "idle"}
      data-scene-live={sceneLive ? "true" : "false"}
    >
      {}
      <AppBackdrop muted={!sceneLive} />

      {}
      <ColonyCrowdSync />
      <ColonyClockRinger />

      {}
      <RoomGlow visible={sceneLive} />

      {}
      <ColonyHero sceneMuted={!sceneLive} />

      {}
      <ColonyRoomPins visible={sceneLive} />

      {}
      <MediaPreviewModal sceneIsColony={sceneLive} ambientQuiet={!sceneLive} />

      {}
      <BrowserWidget />

      {}
      <VoiceHud visible={sceneLive} />

      {}
      <button
        type="button"
        onClick={handleOrbClick}
        disabled={!voice.supported}
        aria-label="Voice Control"
        title={sceneLive ? "Click to sleep" : "Click to wake agents"}
        className="voice-orb"
        data-mode={
          voice.error
            ? "error"
            : voice.status === "starting"
              ? "thinking"
              : voice.listening
                ? "listening"
                : sceneLive
                  ? "hearing"
                  : "idle"
        }
        style={{
          position: "fixed",
          bottom: "clamp(16px, 2vh, 28px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
        }}
      >
        <div className="voice-wave" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              style={{
                ["--i" as string]: i,
                ["--level" as string]: voice.listening ? 1.8 : sceneLive ? 1.15 : 0.72,
              }}
            />
          ))}
        </div>
        <span className="sr-only">
          {voice.supported
            ? voice.listening
              ? "Listening — click to sleep"
              : voice.status === "starting"
                ? "Requesting mic access…"
                : voice.error
                  ? `Mic error: ${voice.error}`
                  : sceneLive
                    ? "Awake — click to sleep"
                    : "Click to wake agents"
            : "Web Speech API unavailable"}
        </span>
      </button>
    </main>
  );
}
