import type { NextRequest } from "next/server";
import { ensureMonitorStarted } from "@/lib/ops/monitor";
import { getRealtimeHub } from "@/lib/ops/realtime";

export const dynamic = "force-dynamic";

/** Server-sent events stream: live system.* events for the Operations Dashboard. */
export async function GET(request: NextRequest) {
  ensureMonitorStarted();
  const hub = getRealtimeHub();
  const encoder = new TextEncoder();
  let clientId = 0;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      clientId = hub.addClient((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.enqueue(encoder.encode(`event: ops.connected\ndata: {"clientId":${clientId}}\n\n`));
      request.signal.addEventListener("abort", () => {
        hub.removeClient(clientId);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      hub.removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
