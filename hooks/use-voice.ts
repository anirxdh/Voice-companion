"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVeilStore } from "@/store/use-veil-store";
import type { SpeechRecognition, SpeechRecognitionEvent } from "@/types/veil";

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
  const phaseRef = useRef<"startup" | "idle" | "listening" | "thinking" | "orchestrating" | "speaking" | "interrupted" | "error">("idle");
  /** When true, Web Speech stays off — avoids Echo + duplicate intents firing `abort`/interrupt during VEIL replies. */
  const micHoldRef = useRef(false);
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<"idle" | "starting" | "listening" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const { phase, setPhase, setTranscript, setAudioLevel } = useVeilStore();

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const hold =
      phase === "thinking" || phase === "orchestrating" || phase === "speaking";

    micHoldRef.current = hold;

    const rec = recognitionRef.current;
    if (hold && rec && keepListeningRef.current) {
      try {
        rec.stop();
      } catch {
        /* already halted */
      }
    }

    if (!hold && keepListeningRef.current && rec) {
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
          /* already listening */
        }
      }, 420);
      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [phase]);

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
      if (event.error === "aborted" && !keepListeningRef.current) {
        setStatus("idle");
        setError(null);
        setPhase("idle");
        return;
      }
      setStatus("error");
      setError(event.error || "speech-recognition-error");
      setPhase("error");
      if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") {
        keepListeningRef.current = false;
      }
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }

      if (micHoldRef.current) return;

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
      return true;
    }

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
      recognitionRef.current?.start();
      startingRef.current = false;
      return true;
    } catch {
      try {
        window.setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {
            setStatus("error");
          }
        }, 250);
        startingRef.current = false;
        return true;
      } catch (startError) {
        keepListeningRef.current = false;
        startingRef.current = false;
        setStatus("error");
        setError(startError instanceof Error ? startError.message : "Unable to start speech recognition");
        setPhase("error");
        return false;
      }
    }
  }, []);

  const stop = useCallback(() => {
    keepListeningRef.current = false;
    startingRef.current = false;
    setListening(false);
    listeningRef.current = false;
    setStatus("idle");
    recognitionRef.current?.stop();
    setPhase("idle");
  }, []);

  return { supported, listening, status, error, start, stop };
}
