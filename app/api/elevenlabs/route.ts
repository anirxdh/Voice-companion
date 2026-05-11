import { NextRequest } from "next/server";

export const runtime = "nodejs";

const emotionSettings = {
  calm: { stability: 0.52, similarity_boost: 0.76, style: 0.28 },
  warm: { stability: 0.45, similarity_boost: 0.78, style: 0.45 },
  urgent: { stability: 0.36, similarity_boost: 0.72, style: 0.62 },
  focused: { stability: 0.61, similarity_boost: 0.74, style: 0.22 }
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ELEVENLABS_API_KEY is not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    const raw = await request.text();
    body = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = body as { text?: unknown; voiceId?: string; emotion?: string };
  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  if (!text) {
    return Response.json({ error: "Missing or empty text" }, { status: 400 });
  }

  const voiceId = parsed.voiceId;
  const emotion = (parsed.emotion as keyof typeof emotionSettings) ?? "calm";

  const id = voiceId || process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}/stream?optimize_streaming_latency=4`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "content-type": "application/json",
      accept: "audio/mpeg"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: emotionSettings[emotion] ?? emotionSettings.calm
    })
  });

  if (!response.ok || !response.body) {
    return Response.json({ error: "ElevenLabs synthesis failed" }, { status: response.status || 500 });
  }

  return new Response(response.body, {
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store"
    }
  });
}
