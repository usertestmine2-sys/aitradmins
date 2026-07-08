import { marketSession } from "@/modules/market_data";
import { handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => marketSession.getState());
}
