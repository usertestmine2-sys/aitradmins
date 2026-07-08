import { bootstrapMarketData, isBootstrapped } from "@/modules/market_data";
import { handle, ok } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function POST() {
  return handle(() => bootstrapMarketData());
}

export async function GET() {
  return ok({ bootstrapped: isBootstrapped() });
}
