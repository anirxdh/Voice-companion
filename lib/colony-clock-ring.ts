/** Client-only alarm/timer feedback (Web Audio + optional Notification API). */

let ctxCache: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctxCache) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctxCache = new Ctx();
  }
  return ctxCache;
}

export async function resumeColonyAudio(): Promise<void> {
  const c = getAudioCtx();
  if (c?.state === "suspended") await c.resume().catch(() => undefined);
}

function beepOsc(ctx: AudioContext, startAt: number, freq: number, duration: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0.001, startAt);
  gain.gain.linearRampToValueAtTime(0.12, startAt + 0.015);
  gain.gain.linearRampToValueAtTime(0.001, startAt + duration);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

export function playColonyAlarmChime(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  void resumeColonyAudio();
  const t0 = ctx.currentTime + 0.03;
  beepOsc(ctx, t0, 880, 0.22);
  beepOsc(ctx, t0 + 0.35, 660, 0.22);
  beepOsc(ctx, t0 + 0.7, 880, 0.28);
}

export function playColonyTimerDoneChime(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  void resumeColonyAudio();
  const t0 = ctx.currentTime + 0.03;
  beepOsc(ctx, t0, 523.25, 0.12);
  beepOsc(ctx, t0 + 0.15, 659.25, 0.12);
}

export function colonyDeskNotify(payload: { title: string; body: string }): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(payload.title, {
      body: payload.body.slice(0, 220),
      tag: `veil-desk-${Date.now()}`,
      requireInteraction: true
    });
  } catch {
    /* ignore unsupported env */
  }
}
