import { watchlistEngine, type WatchlistType } from "@/modules/market_data";
import { handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  return handle(async () => {
    if (id) return watchlistEngine.view(Number(id));
    return watchlistEngine.list();
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action?: "create" | "addSymbol" | "removeSymbol" | "delete" | "buildSector" | "buildAi";
    id?: number;
    name?: string;
    type?: WatchlistType;
    pinned?: boolean;
    symbol?: string;
    sector?: string;
  };
  return handle(async () => {
    switch (body.action) {
      case "addSymbol":
        if (!body.id || !body.symbol) throw new Error("id and symbol required");
        await watchlistEngine.addSymbol(body.id, body.symbol);
        return watchlistEngine.view(body.id);
      case "removeSymbol":
        if (!body.id || !body.symbol) throw new Error("id and symbol required");
        await watchlistEngine.removeSymbol(body.id, body.symbol);
        return watchlistEngine.view(body.id);
      case "delete":
        if (!body.id) throw new Error("id required");
        await watchlistEngine.remove(body.id);
        return { deleted: body.id };
      case "buildSector":
        if (!body.sector) throw new Error("sector required");
        return watchlistEngine.buildSectorWatchlist(body.sector);
      case "buildAi":
        return watchlistEngine.buildAiWatchlist(body.name);
      case "create":
      default:
        if (!body.name) throw new Error("name required");
        return watchlistEngine.create(body.name, body.type ?? "USER", body.pinned ?? false);
    }
  });
}
