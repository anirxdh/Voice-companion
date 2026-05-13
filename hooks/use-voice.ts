"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSuperNovaStore } from "@/store/use-supernova-store";
import { interruptSpeech } from "@/lib/elevenlabs";
import { unlockAudioAutoplay } from "@/lib/music-player";
import type { SpeechRecognition, SpeechRecognitionEvent } from "@/types/supernova";

const WAKE_PHRASES = ["hey vee", "vee"];

type UseVoiceOptions = {
  onIntent: (intent: string) => void;
};

export function useVoice({ onIntent }: UseVoiceOptions) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastFinalRef = useRef("");
  const keepListeningRef = useRef(false);
  const restartingRef = useRef(false);
  const startingRef = useRef(false);
  const listeningRef = useRef(false);
  const startResolveRef = useRef<((ok: boolean) => void) | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const phaseRef = useRef<"startup" | "idle" | "listening" | "thinking" | "orchestrating" | "speaking" | "interrupted" | "error">("idle");
  
  const micHoldRef = useRef(false);
  const isSuppressedRef = useRef(false);
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<"idle" | "starting" | "listening" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const { phase, isMicSuppressed, setPhase, setTranscript, setAudioLevel } = useSuperNovaStore();

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    isSuppressedRef.current = isMicSuppressed;
  }, [isMicSuppressed]);

  useEffect(() => {
    // Only phase-based holds actually stop the mic.
    // isMicSuppressed keeps the mic alive but filters commands in onresult.
    const phaseHold = phase === "thinking" || phase === "orchestrating";
    micHoldRef.current = phaseHold;

    const rec = recognitionRef.current;
    if (phaseHold && rec && keepListeningRef.current) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }

    if (!phaseHold && keepListeningRef.current && rec) {
      const timeoutId = window.setTimeout(() => {
        if (
          micHoldRef.current ||
          !keepListeningRef.current ||
          !recognitionRef.current ||
          listeningRef.current
        ) {
          return;
        }
        try {
          recognitionRef.current.start();
        } catch {
          /* ignore */
        }
      }, 420);
      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [phase, isMicSuppressed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setListening(true);
      listeningRef.current = true;
      setStatus("listening");
      setError(null);
      setPhase("listening");
      startingRef.current = false;
      if (startTimerRef.current != null) {
        window.clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
      if (startResolveRef.current) {
        startResolveRef.current(true);
        startResolveRef.current = null;
      }
    };
    recognition.onend = () => {
      setListening(false);
      listeningRef.current = false;
      if (
        !keepListeningRef.current ||
        !recognitionRef.current ||
        restartingRef.current ||
        micHoldRef.current
      ) {
        return;
      }
      restartingRef.current = true;
      window.setTimeout(() => {
        restartingRef.current = false;
        if (micHoldRef.current || !keepListeningRef.current || !recognitionRef.current) {
          return;
        }
        try {
          recognitionRef.current.start();
        } catch {
          setStatus("error");
        }
      }, 450);
    };
    recognition.onerror = (event) => {
      setListening(false);
      const code = event.error || "speech-recognition-error";
      if (event.error === "aborted" && !keepListeningRef.current) {
        setStatus("idle");
        setError(null);
        setPhase("idle");
        startingRef.current = false;
        if (startTimerRef.current != null) {
          window.clearTimeout(startTimerRef.current);
          startTimerRef.current = null;
        }
        if (startResolveRef.current) {
          startResolveRef.current(false);
          startResolveRef.current = null;
        }
        return;
      }

      if (event.error === "no-speech" || event.error === "network") {
        setStatus("listening");
        setError(null);
        setPhase("listening");
        if (keepListeningRef.current && !micHoldRef.current) {
          window.setTimeout(() => {
            if (!keepListeningRef.current || micHoldRef.current || !recognitionRef.current) return;
            try {
              recognitionRef.current.start();
            } catch {
              /* ignore */
            }
          }, 300);
        }
        return;
      }

      if (event.error === "aborted") {
        setStatus("idle");
        setError(null);
        setPhase("idle");
        startingRef.current = false;
        if (startTimerRef.current != null) {
          window.clearTimeout(startTimerRef.current);
          startTimerRef.current = null;
        }
        if (startResolveRef.current) {
          startResolveRef.current(false);
          startResolveRef.current = null;
        }
        return;
      }

      // Transient unknown error while user wants to keep listening — silently retry
      if (
        keepListeningRef.current &&
        event.error !== "not-allowed" &&
        event.error !== "service-not-allowed" &&
        event.error !== "audio-capture"
      ) {
        setStatus("listening");
        setError(null);
        setPhase("listening");
        window.setTimeout(() => {
          if (!keepListeningRef.current || !recognitionRef.current || listeningRef.current) return;
          try { recognitionRef.current.start(); } catch { /* ignore */ }
        }, 800);
        return;
      }

      setStatus("error");
      setError(code);
      setPhase("error");
      startingRef.current = false;
      if (startTimerRef.current != null) {
        window.clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
      if (startResolveRef.current) {
        startResolveRef.current(false);
        startResolveRef.current = null;
      }
      keepListeningRef.current = false;
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }

      // Phase hold (thinking/orchestrating): block everything
      if (micHoldRef.current) return;

      // Only confirmed final speech interrupts Vee — avoids self-interruption from speaker echo.
      // The triggering speech is re-queued as an intent so the user never has to repeat.
      if (phaseRef.current === "speaking" && final.trim().length > 1) {
        micHoldRef.current = true;
        interruptSpeech();
        lastFinalRef.current = "";
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        useSuperNovaStore.getState().setPhase("idle");
        const interruptedIntent = final.trim();
        window.setTimeout(() => onIntent(interruptedIntent), 80);
        return;
      }

      // Media suppression: mic stays on but only media-control commands pass through
      if (isSuppressedRef.current) {
        const MEDIA_CONTROL_RE = /\b(close|stop|hide|dismiss|exit|shut|pause|end)\b.{0,30}\b(browser|youtube|video|player|window|widget|panel|music|song|audio|tab)\b/i;
        if (final.trim() && MEDIA_CONTROL_RE.test(final)) {
          lastFinalRef.current = "";
          try { recognitionRef.current?.stop(); } catch { /* ignore */ }
          onIntent(final.trim());
        }
        return;
      }

      const current = `${lastFinalRef.current} ${final} ${interim}`.trim();
      setTranscript(current);
      setAudioLevel(Math.min(1, Math.max(0.14, current.length % 24 / 24)));

      if (final.trim()) {
        lastFinalRef.current = `${lastFinalRef.current} ${final}`.trim();
        const normalized = final.toLowerCase().trim();
        const matchedWake = WAKE_PHRASES.find((phrase) => normalized.startsWith(phrase));
        const intent = matchedWake
          ? final.slice(matchedWake.length).trim()
          : final.trim();
        if (intent.length > 1) {
          lastFinalRef.current = "";
          try {
            recognitionRef.current?.stop();
          } catch {
            /* best-effort: kill mic before VEIL replies so stray finals don't chain */
          }
          onIntent(intent);
        }
      }
    };

    recognitionRef.current = recognition;
    return () => {
      recognitionRef.current = null;
      recognition.stop();
    };
  }, [onIntent, setAudioLevel, setPhase, setTranscript]);

  const start = useCallback(async () => {
    if (startingRef.current || listeningRef.current) {
      return listeningRef.current;
    }

    // Unlock HTML5 audio autoplay while inside the user-gesture callback so
    // music and YouTube previews can play without a second click.
    unlockAudioAutoplay();

    startingRef.current = true;
    setStatus("starting");
    setError(null);
    keepListeningRef.current = true;

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (permissionError) {
      keepListeningRef.current = false;
      startingRef.current = false;
      setStatus("error");
      setError(permissionError instanceof Error ? permissionError.message : "Microphone permission denied");
      setPhase("error");
      return false;
    }

    try {
      const started = await new Promise<boolean>((resolve) => {
        startResolveRef.current = resolve;
        startTimerRef.current = window.setTimeout(() => {
          if (startResolveRef.current) {
            startResolveRef.current(false);
            startResolveRef.current = null;
          }
          startTimerRef.current = null;
          startingRef.current = false;
          setStatus("error");
          setError("Speech recognition did not start");
          setPhase("error");
        }, 2500);

        try {
          recognitionRef.current?.start();
        } catch (error) {
          if (startTimerRef.current != null) {
            window.clearTimeout(startTimerRef.current);
            startTimerRef.current = null;
          }
          startResolveRef.current = null;
          startingRef.current = false;
          keepListeningRef.current = false;
          setStatus("error");
          setError(error instanceof Error ? error.message : "Unable to start speech recognition");
          setPhase("error");
          resolve(false);
        }
      });
      return started;
    } catch {
      keepListeningRef.current = false;
      startingRef.current = false;
      setStatus("error");
      setError("Unable to start speech recognition");
      setPhase("error");
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    keepListeningRef.current = false;
    startingRef.current = false;
    setListening(false);
    listeningRef.current = false;
    setStatus("idle");
    setError(null);
    recognitionRef.current?.stop();
    setPhase("idle");
  }, []);

  return { supported, listening, status, error, start, stop };
}
