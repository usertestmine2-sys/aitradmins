import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth, requireAdmin } from "@/modules/identity";
import { MODEL_KEYS, type ModelKey } from "@/modules/training";
import {
  aiBrain,
  bootstrapBrain,
  knowledgeGraph,
  metaLearning,
  modelReputation,
  brainHealth,
} from "@/modules/brain";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapBrain();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") ?? "status";
    if (view === "knowledge") {
      return okResponse({ edges: await knowledgeGraph.strongest(50) });
    }
    if (view === "explain") {
      const modelKey = (searchParams.get("modelKey") ?? "TREND") as ModelKey;
      const symbol = searchParams.get("symbol") ?? "RELIANCE";
      const confidence = Number(searchParams.get("confidence") ?? "0.6");
      const regime = searchParams.get("regime") ?? "RANGE";
      return okResponse(await aiBrain.explain(modelKey, symbol, confidence, regime));
    }
    if (view === "meta") {
      const modelKey = (searchParams.get("modelKey") ?? undefined) as ModelKey | undefined;
      return okResponse({ recommendations: await metaLearning.recommendations(modelKey) });
    }
    if (view === "reputation") {
      const modelKey = (searchParams.get("modelKey") ?? undefined) as ModelKey | undefined;
      return okResponse({ leaderboard: await modelReputation.leaderboard(modelKey) });
    }
    if (view === "health") {
      return okResponse(await brainHealth.score());
    }
    return okResponse(await aiBrain.status());
  } catch (err) {
    return toResponse(err);
  }
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("evolve"),
    modelKey: z.enum(MODEL_KEYS),
    symbol: z.string().min(1),
    strategy: z.string().optional(),
    regime: z.string().optional(),
    expectedReward: z.number(),
    actualReward: z.number(),
    confidence: z.number().min(0).max(1),
    drawdown: z.number().optional(),
    features: z.record(z.string(), z.number()).optional(),
  }),
  z.object({
    action: z.literal("approve"),
    modelKey: z.enum(MODEL_KEYS),
    version: z.number().int().positive(),
    humanApproved: z.boolean(),
  }),
  z.object({
    action: z.literal("research"),
    modelKey: z.enum(MODEL_KEYS),
    symbol: z.string().min(1),
    timeframe: z.string().default("1D"),
    window: z.enum(["1M", "3M", "6M", "1Y", "5Y"]),
  }),
  z.object({
    action: z.literal("meta"),
    modelKey: z.enum(MODEL_KEYS),
  }),
]);

export async function POST(req: Request) {
  try {
    bootstrapBrain();
    const body = await parseBody(req, bodySchema);

    if (body.action === "evolve") {
      await requireAuth(req);
      const result = await aiBrain.evolve({
        modelKey: body.modelKey as ModelKey,
        symbol: body.symbol,
        strategy: body.strategy,
        regime: body.regime,
        expectedReward: body.expectedReward,
        actualReward: body.actualReward,
        confidence: body.confidence,
        drawdown: body.drawdown,
        features: body.features,
        source: "PAPER",
      });
      return okResponse(result, { status: 201 });
    }

    if (body.action === "approve") {
      await requireAdmin(req);
      const result = await aiBrain.approveModel(
        body.modelKey as ModelKey,
        body.version,
        body.humanApproved,
      );
      return okResponse(result);
    }

    if (body.action === "meta") {
      await requireAdmin(req);
      const analysis = await metaLearning.analyze(body.modelKey as ModelKey);
      return okResponse(analysis, { status: 201 });
    }

    // research
    await requireAdmin(req);
    const result = await aiBrain.research(
      body.modelKey as ModelKey,
      body.symbol,
      body.timeframe,
      body.window,
    );
    return okResponse(result, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
