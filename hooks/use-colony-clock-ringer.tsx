"use client";

import { useEffect } from "react";
import {
  colonyDeskNotify,
  playColonyAlarmChime,
  playColonyTimerDoneChime,
  resumeColonyAudio
} from "@/lib/colony-clock-ring";
import { interruptSpeech, speakWithElevenLabs } from "@/lib/elevenlabs";
import { useSuperNovaStore } from "@/store/use-supernova-store";


export function ColonyClockRinger() {
  useEffect(() => {
    const onPointerDown = () => void resumeColonyAudio();
    document.addEventListener("pointerdown", onPointerDown);

    const timerRungSig = new Set<string>();

    const tick = () => {
      const nowWall = Date.now();
      const nowDate = new Date();
      const minuteBucket = Math.floor(nowWall / 60000);

      const snapshot = useSuperNovaStore.getState();

      const ampmLine = nowDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      const h24 = nowDate.getHours();
      const mins = nowDate.getMinutes();

      const candidates = snapshot.alarmEntries.filter(
        (alarm) =>
          alarm.enabled &&
          alarm.hour24 === h24 &&
          alarm.minute === mins &&
          alarm.lastFiredAtBucket !== minuteBucket
      );

      if (candidates.length > 0) {
        const st0 = useSuperNovaStore.getState();
        for (const c of candidates) {
          st0.markAlarmRingAtMinuteBucket(c.id, minuteBucket);
        }

        const lead = candidates[0];
        const hh = String(lead.hour24).padStart(2, "0");
        const mm = String(lead.minute).padStart(2, "0");
        const subtitle = `${hh}:${mm} (${ampmLine})${lead.label ? ` · ${lead.label}` : ""}`;

        playColonyAlarmChime();
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([120, 80, 120]);
        }

        colonyDeskNotify({
          title: "Super Nova alarm",
          body: subtitle
        });

        const st = useSuperNovaStore.getState();
        st.addTimelineEvent({
          kind: "system",
          title: "Alarm sounding",
          detail: subtitle
        });

        st.openAmbientPreview({
          kind: "clockdesk",
          title: "Clock · alarms",
          summary: `Alarm ringing — ${subtitle}`
        });

        interruptSpeech();
        const line = lead.label?.trim()
          ? `Alarm ringing: ${subtitle}. ${lead.label.trim()}`
          : `Alarm ringing — time is ${subtitle}.`;

        void speakWithElevenLabs({
          text: line.slice(0, 460),
          voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
          emotion: "urgent"
        }).catch(() => undefined);
      }

      const timersSnap = [...useSuperNovaStore.getState().activeTimers];

      for (const t of timersSnap) {
        if (t.endsAtMs > nowWall) continue;
        const sig = `${t.id}:${t.endsAtMs}`;
        const st = useSuperNovaStore.getState();

        if (timerRungSig.has(sig)) {
          st.removeActiveTimer(t.id);
          continue;
        }
        timerRungSig.add(sig);

        playColonyTimerDoneChime();
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([160, 100, 160]);
        }

        const labelSuffix = t.label?.trim() ? ` · ${t.label.trim()}` : "";
        colonyDeskNotify({
          title: "Super Nova timer",
          body: `Timer finished${labelSuffix}`
        });

        st.addTimelineEvent({
          kind: "system",
          title: "Timer done",
          detail: `Finished${labelSuffix || ""}`
        });

        st.removeActiveTimer(t.id);

        st.openAmbientPreview({
          kind: "clockdesk",
          title: "Clock · timers · alarms",
          summary: `Timer finished${t.label?.trim() ? ` (${t.label.trim()})` : ""}`
        });

        interruptSpeech();
        const voiceLine = t.label?.trim()
          ? `Your ${t.label.trim()} countdown finished`
          : "Your countdown finished";

        void speakWithElevenLabs({
          text: voiceLine.slice(0, 280),
          voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
          emotion: "focused"
        }).catch(() => undefined);
      }
    };

    const id = window.setInterval(tick, 500);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.clearInterval(id);
    };
  }, []);

  return null;
}
