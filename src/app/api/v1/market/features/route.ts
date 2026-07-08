import { featureEngineering, type Timeframe } from "@/modules/market_data";
import { fail, handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const tf = (searchParams.get("timeframe") ?? "1D") as Timeframe;
  const normalization = (searchParams.get("normalization") ?? "zscore") as
    | "zscore"
    | "minmax"
    | "none";
  const limit = Number(searchParams.get("limit") ?? "500");
  if (!symbol) return fail("symbol is required");
  return handle(() => featureEngineering.build(symbol, tf, { normalization, limit }));
}
