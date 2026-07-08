import { providerManager } from "@/modules/market_data";
import { handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ({
    active: providerManager.activeProvider(),
    providers: providerManager.status(),
  }));
}

export async function POST() {
  return handle(async () => {
    await providerManager.heartbeat();
    return { active: providerManager.activeProvider(), providers: providerManager.status() };
  });
}
