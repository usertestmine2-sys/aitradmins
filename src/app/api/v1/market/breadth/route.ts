import { breadthEngine } from "@/modules/market_data";
import { handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "nifty";
  const sector = searchParams.get("sector");
  const industry = searchParams.get("industry");
  return handle(async () => {
    if (sector) return breadthEngine.sector(sector);
    if (industry) return breadthEngine.industry(industry);
    if (scope === "banknifty") return breadthEngine.bankNifty();
    if (scope === "market") return breadthEngine.overall();
    return breadthEngine.nifty();
  });
}
