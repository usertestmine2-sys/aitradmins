import { corporateActionEngine, type CorporateActionType } from "@/modules/market_data";
import { fail, handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return fail("symbol is required");
  return handle(() => corporateActionEngine.list(symbol));
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action?: "register" | "process";
    symbol?: string;
    actionType?: CorporateActionType;
    exDate?: string;
    ratioFrom?: number;
    ratioTo?: number;
    value?: number;
    details?: string;
    apply?: boolean;
  };
  return handle(async () => {
    if (body.action === "process") return corporateActionEngine.processPending();
    if (!body.symbol || !body.actionType || !body.exDate)
      throw new Error("symbol, actionType and exDate are required");
    const registered = await corporateActionEngine.register({
      symbol: body.symbol,
      actionType: body.actionType,
      exDate: body.exDate,
      ratioFrom: body.ratioFrom,
      ratioTo: body.ratioTo,
      value: body.value,
      details: body.details,
    });
    if (body.apply) {
      const adjusted = await corporateActionEngine.applyHistoricalAdjustment(registered);
      return { registered, adjustedCandles: adjusted };
    }
    return { registered };
  });
}
