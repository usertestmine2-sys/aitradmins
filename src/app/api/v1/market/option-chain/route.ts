import { optionChainEngine } from "@/modules/market_data";
import { fail, handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

function nextThursday(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const add = (4 - day + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const underlying = searchParams.get("underlying") ?? "NIFTY";
  const expiry = searchParams.get("expiry") ?? nextThursday();
  const depth = Number(searchParams.get("depth") ?? "10");
  if (!underlying) return fail("underlying is required");
  return handle(async () => {
    const chain = await optionChainEngine.build(underlying, expiry, depth);
    return { ...chain, topStrikes: optionChainEngine.rankStrikes(chain) };
  });
}
