/** Client-side line for TTS when the user asks for the local clock (no MCP time tool). */
export async function spokenLocalTimeLine(): Promise<string> {
  try {
    const res = await fetch("/api/weather");
    if (res.ok) {
      const data = (await res.json()) as { timezone?: string; city?: string };
      const tz = typeof data.timezone === "string" && data.timezone.length > 0 ? data.timezone : undefined;
      if (tz) {
        const line = new Date().toLocaleString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          timeZoneName: "short",
          timeZone: tz
        });
        const place = data.city ? ` (${data.city})` : "";
        return `It's ${line}${place}.`;
      }
    }
  } catch {
    /* fall through */
  }

  return `It's ${new Date().toLocaleString(undefined, { weekday: "long", dateStyle: "medium", timeStyle: "short" })} in your browser's local zone.`;
}
