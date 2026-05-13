import { NextRequest } from "next/server";
import { createOrchestrationStream } from "@/lib/groq";
import type { MCPTool } from "@/types/supernova";

export const runtime = "nodejs";

type ToolCallAgg = { name: string; arguments: string; id?: string };

export async function POST(request: NextRequest) {
  const { intent, tools, mode } = (await request.json()) as {
    intent: string;
    tools: MCPTool[];
    mode?: "orchestrate" | "conversation";
  };

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      /** Groq/OpenAI-compatible streams split `tool_calls` across many deltas; merge by index before execute. */
      const toolAgg = new Map<number, ToolCallAgg>();

      try {
        const completion = await createOrchestrationStream(intent, tools ?? [], mode ?? "orchestrate");
        for await (const chunk of completion) {
          const choice = chunk.choices?.[0];
          const delta = choice?.delta;

          const content = delta?.content;
          if (content) send({ type: "token", content });

          const tcs = delta?.tool_calls;
          if (tcs?.length) {
            for (const tc of tcs) {
              const ix = tc.index ?? 0;
              let row = toolAgg.get(ix);
              if (!row) {
                row = { name: "", arguments: "", id: undefined };
                toolAgg.set(ix, row);
              }
              if (tc.id) row.id = tc.id;
              if (tc.function?.name) row.name += tc.function.name;
              if (tc.function?.arguments) row.arguments += tc.function.arguments;
            }
          }
        }

        const ordered = [...toolAgg.entries()].sort((a, b) => a[0] - b[0]);
        for (const [, tc] of ordered) {
          const name = tc.name?.trim();
          if (!name) continue;
          let args: unknown = {};
          const rawArgs = tc.arguments?.trim();
          if (rawArgs) {
            try {
              args = JSON.parse(rawArgs);
            } catch {
              args = { raw: tc.arguments };
            }
          }
          send({ type: "tool_call", toolCall: { name, arguments: args } });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        send({ type: "error", content: error instanceof Error ? error.message : "Groq stream failed" });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    }
  });
}
