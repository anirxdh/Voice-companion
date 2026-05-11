export type SpeakOptions = {
  text: string;
  voiceId?: string;
  signal?: AbortSignal;
  emotion?: "calm" | "warm" | "urgent" | "focused";
};

let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;

export function interruptSpeech() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
}

export async function speakWithElevenLabs({ text, voiceId, signal, emotion = "calm" }: SpeakOptions) {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  interruptSpeech();

  const response = await fetch("/api/elevenlabs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: trimmed, voiceId, emotion }),
    signal
  });

  if (!response.ok) {
    throw new Error("ElevenLabs synthesis failed");
  }

  const blob = await response.blob();
  activeUrl = URL.createObjectURL(blob);
  activeAudio = new Audio(activeUrl);
  activeAudio.preload = "auto";

  await activeAudio.play();
  await new Promise<void>((resolve) => {
    if (!activeAudio) return resolve();
    activeAudio.onended = () => resolve();
    activeAudio.onerror = () => resolve();
  });
}
