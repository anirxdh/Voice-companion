import Groq from "groq-sdk";
import type { MCPTool } from "@/types/supernova";
import { groqSlugForMcpTool, toGroqTools } from "@/lib/groq-slugs";

let groqSingleton: Groq | null = null;


function requireGroqClient(): Groq {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  if (!groqSingleton) {
    groqSingleton = new Groq({ apiKey: key });
  }
  return groqSingleton;
}

export async function createOrchestrationStream(intent: string, tools: MCPTool[], mode: "orchestrate" | "conversation" = "orchestrate") {
  if (!process.env.GROQ_API_KEY?.trim()) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const groq = requireGroqClient();

  const system =
    mode === "conversation"
      ? [
          "You are Super Nova, an ambient AI operating layer.",
          "Respond like a calm, capable conversational assistant.",
          "Be brief, warm, and direct.",
          "Do not open with repetitive greetings; never reply with only Hello/hi echoed back.",
          "Prefer one concrete useful line unless the human only waved once—in that case reply once, briefly.",
          "Do not mention tools unless the user asks.",
          "You cannot open Gmail / webmail or read real mailbox accounts. If asked about MCP relay inbox or agent messages, invite them to use a voice/action request so Super Nova can run configured messaging MCP tools.",
          "Do not act like a chatbot."
        ].join(" ")
      : [
          "You are Super Nova, an ambient AI operating layer.",
          "Reason tersely and cinematically.",
          "Use tool calls when a concrete MCP action is useful.",
          "Never invent software names, protocol names, or tool names.",
          "Only call tools that appear in the provided tools list.",
          "Each callable tool id matches the slug shown in Available tools (`{hostPart}__{toolName}`, e.g. still_thunder_8btdl__play). Use that exact id in tool calls — never shorten to bare names like play or search.",
          "YouTube/video intents must use tools from the YouTube MCP slug prefix (server description mentions YouTube / video inline); Deezer/music audio and queue intents must use the music MCP slug prefix; messaging tools use the relay host slug prefix.",
          "When the human clearly wants YouTube/web video discovery or playback (mentions YouTube, shorts, trailers, uploads that are clearly video), pick a tool whose slug/host prefix corresponds to video/YouTube, not the music MCP.",
          "When the human wants music audio or queue/volume/track controls, pick tools whose host slug matches the music MCP.",
          "If no tool in the list fits the request at all, say plainly that the capability is unavailable; do not pretend a tool ran.",
          "When the human asks about inbox, messages, relays, unread counts, agent chat, notifications, sending a message — and matching messaging tools ARE in the list — call those tools immediately; summarize only what those tools returned. Never refuse or say messaging is unsupported if the tools exist.",
          "If no matching messaging tool appears in the list, say plainly that messaging MCP is unavailable; do not fabricate inbox content.",
          "Never claim Gmail, Outlook, browser tabs, webmail passwords, or any mailbox outside MCP; never impersonate unread mail you did not get from tools.",
          "If read-inbox or send-message returns an agent-registration error, Super Nova auto-calls MCP register once using the relay handle from configuration — do not apologize for missing Gmail.",
          "For messaging tools include agent_name exactly as the short handle from server config unless the deployment uses a different custom name — never pass placeholder strings, env keys, or the text NEXT_PUBLIC as an agent id.",
          "After a messaging tool succeeds, mention that the Super Nova inbox panel on the top-left colony wall shows details on screen.",
          "When the human wants news, tech headlines, Hacker News, HN top stories, or breaking developer news, call the built-in MCP tool slug whose host label is Super Nova and bare name headlines (looks like veil__headlines in the tools list)—it opens the colony news dock; the spoken summary that returns is conversational (top-three readout plus offer to hear more)—echo that warmly in one short clause after summarizing.",
          "Nine-tile built-ins bundled with Super Nova (even when remote MCP is thin): sticky_note for scratch-notes; maps_place for live OpenStreetMap atlas frames (supply query city/address); wiki_scout for encyclopedia summaries (supply factual topic query); orbit_apod for NASA’s Astronomy Picture of the Day (optional YYYY-MM-DD date). Respect each tool schema.",
          "After any tool call succeeds, always stream at least one brief warm sentence in natural language (not robotic jargon like orchestration or software layers); the user hears this aloud.",
          "Never mention that you are a chatbot.",
          "Respond as an orchestration layer converting human intent into software action."
        ].join(" ");

  return groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    stream: true,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Intent: ${intent}\nAvailable tools:\n${tools
          .map(
            (tool) =>
              `${groqSlugForMcpTool(tool)} (bare: ${tool.name} @ ${tool.serverUrl}): ${tool.description ?? "MCP capability"}`
          )
          .join("\n")}`
      }
    ],
    tools: mode === "conversation" || tools.length === 0 ? undefined : toGroqTools(tools),
    tool_choice: mode === "conversation" || tools.length === 0 ? "none" : "auto",
    temperature: 0.58,
    max_tokens: 900
  });
}


export async function createConversationalStream(message: string) {
  if (!process.env.GROQ_API_KEY?.trim()) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const groq = requireGroqClient();

  return groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "You are Super Nova, an ambient AI operating layer. Respond like a calm, capable conversational assistant. Be brief, warm, and direct. Never reply with only “Hello”, “Hi”, duplicated greetings, or empty filler—prefer a substantive line or one crisp follow-up. Do not mention tools unless the user asks. Do not claim Gmail or web mailbox access; for MCP relay inbox and agent messaging, briefly say Super Nova triggers those capabilities through configured voice intents, not informal chat alone. Do not act like a chatbot."
      },
      {
        role: "user",
        content: message
      }
    ],
    temperature: 0.6,
    max_tokens: 220
  });
}
