import { historicalManager, TIMEFRAMES, type Timeframe } from "@/modules/market_data";
import { fail, handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const tf = (searchParams.get("timeframe") ?? "1D") as Timeframe;
  const limit = Number(searchParams.get("limit") ?? "300");
  if (!symbol) return fail("symbol is required");
  if (!(TIMEFRAMES as readonly string[]).includes(tf)) return fail("invalid timeframe");
  return handle(async () => {
    const candles = await historicalManager.getHistory(symbol, tf, { limit });
    return { symbol, timeframe: tf, candles };
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    symbol: string;
    timeframe?: Timeframe;
    action?: "backfill" | "incremental" | "repair" | "retention";
    bars?: number;
  };
  const tf = body.timeframe ?? "1D";
  if (!body.symbol && body.action !== "retention") return fail("symbol is required");
  return handle(async () => {
    switch (body.action) {
      case "incremental":
        return { updated: await historicalManager.incrementalUpdate(body.symbol, tf) };
      case "repair":
        return historicalManager.repairGaps(body.symbol, tf);
      case "retention":
        return historicalManager.applyRetention();
      case "backfill":
      default:
        return { written: await historicalManager.backfill(body.symbol, tf, body.bars ?? 200) };
    }
  });
}
