import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth } from "@/modules/identity";
import { consensusEngine, aiSociety, bootstrapBrain } from "@/modules/brain";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapBrain();
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") ?? undefined;
    if (searchParams.get("view") === "agents") {
      return okResponse({ agents: aiSociety.agents() });
    }
    return okResponse({ history: await consensusEngine.history(symbol) });
  } catch (err) {
    return toResponse(err);
  }
}

const schema = z.object({
  symbol: z.string().min(1),
  exchange: z.enum(["NSE", "BSE"]).optional(),
  regime: z.string().default("RANGE"),
  method: z.enum(["MAJORITY", "CONFIDENCE", "REPUTATION", "REGIME"]).optional(),
});

export async function POST(req: Request) {
  try {
    await requireAuth(req);
    bootstrapBrain();
    const body = await parseBody(req, schema);
    const result = await consensusEngine.decide(
      body.symbol,
      body.regime,
      body.method ?? "REPUTATION",
      body.exchange ?? "NSE",
    );
    return okResponse(result, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
