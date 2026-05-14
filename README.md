# SuperNova — Voice OS

A voice-controlled AI operating system. One voice command summons weather, music, maps, NASA photos, YouTube, Wikipedia, timers, and more — all rendered as living widgets inside an animated colony environment.

---

## Stack

- **Next.js 15** — App Router, API routes
- **React 19** — UI
- **TypeScript** — end to end
- **Tailwind CSS** — styling
- **Zustand** — global state
- **Framer Motion** — animations
- **Three.js / React Three Fiber** — 3D environment
- **Web Speech API** — voice recognition (Chrome)
- **ElevenLabs** — text-to-speech (Vee's voice)
- **Groq** — LLM intent processing
- **MCP (Model Context Protocol)** — tool routing (YouTube, music, messaging)
- **OpenStreetMap + OSRM** — maps and directions (no API key needed)
- **NASA APOD API** — astronomy photo of the day (free key included)

---

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in:

```env
GROQ_API_KEY=                        # https://console.groq.com
ELEVENLABS_API_KEY=                  # https://elevenlabs.io
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=     # your chosen voice ID

# MCP endpoints (music + YouTube ship preconfigured)
NEXT_PUBLIC_MCP_ENDPOINT_YOUTUBE_VIDEO=https://still-thunder-8btdl.run.mcp-use.com/mcp
NEXT_PUBLIC_MCP_ENDPOINT_MUSIC=https://young-surf-xt5j8.run.mcp-use.com/mcp

# Optional
FIRECRAWL_API_KEY=                   # enables richer web browsing
NEXT_PUBLIC_COLONY_PET_THEME=        # leave empty for office sprites, or set `onepiece`
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Chrome** (Web Speech API required).

---

## How It Works

```
Voice → Web Speech API → Groq LLM → Intent detection → API route or MCP tool
                                                              ↓
                                               Widget rendered + ElevenLabs TTS
```

1. Click the **orb** to wake the assistant
2. Speak — the mic visualizer responds in real time
3. Intent is classified and routed to the right tool
4. A widget animates onto screen while Vee speaks the result
5. Colony pet walks to the active room

---

## Features

- **Live mic visualizer** — real frequency data from your microphone while listening; switches to music analyser during playback
- **Music player** — album art, 96px frequency visualizer, autoplay after TTS
- **Colony environment** — animated pet character walks between rooms as you issue commands
- **Multi-widget** — stack weather, directions, timer, and music on screen simultaneously
- **MCP tool support** — plug in any MCP-compatible server via environment variable
- **One Piece theme** — set `NEXT_PUBLIC_COLONY_PET_THEME=onepiece` for crew sprites

---

## Project Structure

```
app/
  api/          # Server-side API routes (weather, directions, scout, orbit, etc.)
components/
  colony/       # Pet character + room glow
  hud/          # Voice HUD overlay
  orb/          # Central voice orb
  pets/         # Colony crowd sync + crew deck
lib/
  elevenlabs.ts     # TTS
  mic-analyser.ts   # Real-time mic frequency capture
  music-player.ts   # Audio playback + analyser
  environment-intents.ts  # Intent classification
hooks/
  use-voice.ts        # Web Speech API wrapper
  use-orchestration.ts # Intent → tool routing
public/
  assets/pets/  # Sprite sheets for colony characters
  backgrounds/  # Animated background
```

---

## Requirements

- **Chrome** (Web Speech API is Chrome-only)
- Node.js 18+
- Groq API key (free tier works)
- ElevenLabs API key (free tier: 10k chars/month)
