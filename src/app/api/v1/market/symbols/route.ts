import { symbolMaster } from "@/modules/market_data";
import { handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const instrumentType = searchParams.get("type") ?? undefined;
  const sector = searchParams.get("sector") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  return handle(async () => {
    if (q) return symbolMaster.search(q);
    return symbolMaster.list({ instrumentType, sector, status });
  });
}
