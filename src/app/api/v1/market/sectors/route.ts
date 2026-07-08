import { sectorIntelligence } from "@/modules/market_data";
import { handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "rotation";
  return handle<unknown>(() =>
    view === "industry" ? sectorIntelligence.industryRotation() : sectorIntelligence.rotation(),
  );
}
