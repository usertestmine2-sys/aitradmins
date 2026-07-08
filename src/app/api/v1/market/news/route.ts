import { newsIntelligence, type NewsSource } from "@/modules/market_data";
import { handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const source = (searchParams.get("source") ?? undefined) as NewsSource | undefined;
  const symbol = searchParams.get("symbol") ?? undefined;
  const view = searchParams.get("view");
  const limit = Number(searchParams.get("limit") ?? "50");
  return handle(() =>
    view === "calendar" ? newsIntelligence.calendar() : newsIntelligence.feed({ source, symbol, limit }),
  );
}
