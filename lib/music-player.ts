let activeMusicAudio: HTMLAudioElement | null = null;
let activeMusicUrl: string | null = null;

const playbackStateListeners = new Set<(playing: boolean) => void>();
const telemetryWired = new WeakSet<HTMLAudioElement>();

function emitPlaybackPlaying(playing: boolean) {
  playbackStateListeners.forEach((listener) => {
    try {
      listener(playing);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeMusicPlaybackState(listener: (playing: boolean) => void): () => void {
  playbackStateListeners.add(listener);
  return () => playbackStateListeners.delete(listener);
}

export function isMusicGloballyPlaying(): boolean {
  return Boolean(activeMusicAudio && !activeMusicAudio.paused && !activeMusicAudio.ended);
}

function notifyPlaybackTelemetry() {
  emitPlaybackPlaying(isMusicGloballyPlaying());
}

function wirePlaybackTelemetry(audio: HTMLAudioElement) {
  if (telemetryWired.has(audio)) return;
  telemetryWired.add(audio);
  const tick = () => notifyPlaybackTelemetry();
  /** Avoid `playing` — it can fire repeatedly during buffering and churns reactive UI / crowd mode. */
  audio.addEventListener("play", tick);
  audio.addEventListener("pause", tick);
  audio.addEventListener("ended", tick);
}

type PlaybackGraph = {
  ctx: AudioContext;
  analyser: AnalyserNode;
  media: HTMLAudioElement;
};

let playbackGraph: PlaybackGraph | null = null;

function teardownPlaybackGraph() {
  if (!playbackGraph) return;
  try {
    playbackGraph.analyser.disconnect();
    playbackGraph.ctx.close().catch(() => undefined);
  } catch {
    /* graph already torn down */
  }
  playbackGraph = null;
}

/** Analyzer for the strip visualizer — one graph per playback element. */
export function getPlaybackAnalyser(): AnalyserNode | null {
  return playbackGraph?.media === activeMusicAudio ? playbackGraph.analyser : null;
}

/** Single Web Audio route per `<audio>`; required for reactive bars (CORS may block analyze). */
function syncPlaybackAnalyser(audio: HTMLAudioElement) {
  if (playbackGraph?.media === audio) return playbackGraph.analyser;
  teardownPlaybackGraph();
  try {
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.54;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    void ctx.resume();
    playbackGraph = { ctx, analyser, media: audio };
    return analyser;
  } catch {
    playbackGraph = null;
    return null;
  }
}

export function stopMusicPlayback() {
  teardownPlaybackGraph();
  if (activeMusicAudio) {
    activeMusicAudio.pause();
    activeMusicAudio.src = "";
    activeMusicAudio = null;
  }
  activeMusicUrl = null;
  emitPlaybackPlaying(false);
}

export async function playMusicPreview(previewUrl: string) {
  stopMusicPlayback();
  const audio = new Audio(previewUrl);
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  activeMusicAudio = audio;
  activeMusicUrl = previewUrl;
  wirePlaybackTelemetry(audio);
  await audio.play();
  syncPlaybackAnalyser(audio);
  notifyPlaybackTelemetry();
  return audio;
}

/** Keeps MCP-started playback instead of restarting the same preview. */
export async function reuseOrPlayPreview(previewUrl: string): Promise<HTMLAudioElement> {
  if (
    activeMusicAudio &&
    activeMusicUrl === previewUrl &&
    (!activeMusicAudio.paused || activeMusicAudio.currentTime > 0)
  ) {
    wirePlaybackTelemetry(activeMusicAudio);
    syncPlaybackAnalyser(activeMusicAudio);
    notifyPlaybackTelemetry();
    return activeMusicAudio;
  }
  return playMusicPreview(previewUrl);
}
