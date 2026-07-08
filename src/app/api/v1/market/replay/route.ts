import { replayEngine, type Timeframe } from "@/modules/market_data";
import { handle } from "@/modules/market_data/http";
import type { ReplayMode } from "@/modules/market_data/services/replay";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  return handle(async () => (id ? replayEngine.status(id) : replayEngine.list()));
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action?: "create" | "step" | "pause" | "resume" | "speed";
    id?: string;
    symbol?: string;
    timeframe?: Timeframe;
    mode?: ReplayMode;
    steps?: number;
    speed?: number;
  };
  return handle(async () => {
    switch (body.action) {
      case "step":
        if (!body.id) throw new Error("id required");
        return replayEngine.step(body.id, body.steps ?? 1);
      case "pause":
        if (!body.id) throw new Error("id required");
        return { paused: replayEngine.pause(body.id) };
      case "resume":
        if (!body.id) throw new Error("id required");
        return { resumed: replayEngine.resume(body.id) };
      case "speed":
        if (!body.id || body.speed === undefined) throw new Error("id and speed required");
        return { set: replayEngine.setSpeed(body.id, body.speed) };
      case "create":
      default:
        if (!body.symbol) throw new Error("symbol required");
        return replayEngine.create(body.symbol, body.timeframe ?? "1D", body.mode ?? "HISTORICAL", {
          speed: body.speed,
        });
    }
  });
}


