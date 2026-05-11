"use client";

import { useCallback, useRef, useState } from "react";
import { MediaPreviewModal } from "@/components/media-preview-modal";
import { AppBackdrop } from "@/components/app-backdrop";
import { ColonyRoomPins } from "@/components/colony-room-pins";
import { ColonyCrowdSync } from "@/components/pets/colony-crowd-sync";
import { RoomPets } from "@/components/pets/room-pets";
import { ColonyClockRinger } from "@/hooks/use-colony-clock-ringer";
import { useOrchestration } from "@/hooks/use-orchestration";
import { useVoice } from "@/hooks/use-voice";
import { useVeilStore } from "@/store/use-veil-store";
import { interruptSpeech } from "@/lib/elevenlabs";
import { mainOrbPetSlug, petSpriteUrl } from "@/components/pets/colony-pet-registry";

export function VeilApp() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [sceneLive, setSceneLive] = useState(false);
  const stopTimerRef = useRef<number | null>(null);
  const setPhase = useVeilStore((state) => state.setPhase);
  const colonyCrowdMode = useVeilStore((s) => s.colonyCrowdMode);
  const { runIntent } = useOrchestration();

  const onIntent = useCallback(
    (intent: string) => {
      void runIntent(intent);
    },
    [runIntent]
  );

  const voice = useVoice({ onIntent });

  const clearStopTimer = () => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  const startVoice = async () => {
    if (voiceEnabled) return;
    clearStopTimer();
    setSceneLive(true);
    const started = await voice.start();
    setVoiceEnabled(started);
    if (started) {
      setPhase("listening");
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission().catch(() => undefined);
      }
      return;
    }
    setSceneLive(false);
  };

  const queueStopVoice = () => {
    if (!voiceEnabled) return;
    clearStopTimer();
    stopTimerRef.current = window.setTimeout(() => {
      stopTimerRef.current = null;
      voice.stop();
      setVoiceEnabled(false);
      setSceneLive(false);
      interruptSpeech();
      setPhase("idle");
    }, 180);
  };

  return (
    <main
      className="veil-surface scanlines relative h-screen w-screen overflow-hidden text-white"
      data-colony={sceneLive ? colonyCrowdMode : "idle"}
      data-scene-live={sceneLive ? "true" : "false"}
    >
      <AppBackdrop muted={!sceneLive} />
      <ColonyCrowdSync />
      <ColonyClockRinger />
      <RoomPets sceneMuted={!sceneLive} />
      <ColonyRoomPins visible={sceneLive} />
      <MediaPreviewModal sceneIsColony={sceneLive} ambientQuiet={!sceneLive} />

      <button
        type="button"
        onClick={queueStopVoice}
        onDoubleClick={() => void startVoice()}
        disabled={!voice.supported}
        aria-label="Voice orb"
        title="Double-click to unmute · voice control"
        className="voice-orb"
        data-mode={voice.error ? "error" : voice.status === "starting" ? "thinking" : voice.listening ? "listening" : voiceEnabled ? "hearing" : "idle"}
      >
        <span className="voice-pet" aria-hidden="true" style={{ backgroundImage: `url(${petSpriteUrl(mainOrbPetSlug())})` }} />
        <div className="voice-wave" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index} style={{ ["--i" as string]: index, ["--level" as string]: voice.listening ? 1.8 : voiceEnabled ? 1.15 : 0.72 }} />
          ))}
        </div>
        <span className="sr-only">
          {voice.supported
            ? voice.listening
              ? "Listening"
              : voice.status === "starting"
                ? "Requesting mic access"
                : voice.error
                  ? `Mic error: ${voice.error}`
                  : "Double-click to unmute"
            : "Web Speech API unavailable"}
        </span>
      </button>
    </main>
  );
}
