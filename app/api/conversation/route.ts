import { NextRequest } from "next/server";
import { createConversationalStream } from "@/lib/groq";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { message } = (await request.json()) as { message: string };

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        const completion = await createConversationalStream(message);
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            send({ type: "token", content });
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        send({ type: "error", content: error instanceof Error ? error.message : "Conversation stream failed" });
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
