import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAdmin, requireAuth } from "@/modules/identity";
import { trainingRepository, trainingManager, MODEL_KEYS } from "@/modules/training";
import type { ModelKey } from "@/modules/training";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const modelKey = searchParams.get("modelKey") ?? undefined;
    const models = await trainingRepository.listModels(modelKey ?? undefined, 100);
    // Weights are large; return metadata + metrics, not raw weight vectors.
    const safe = models.map((m) => ({
      modelKey: m.modelKey,
      version: m.version,
      hash: m.hash,
      parentVersion: m.parentVersion,
      active: m.active,
      approvalStatus: m.approvalStatus,
      metrics: m.metrics,
      featureCount: m.featureNames.length,
      createdAt: m.createdAt,
    }));
    return okResponse({ models: safe });
  } catch (err) {
    return toResponse(err);
  }
}

const approveSchema = z.object({
  action: z.literal("approve"),
  modelKey: z.enum(MODEL_KEYS),
  version: z.number().int().positive(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await parseBody(req, approveSchema);
    await trainingManager.approve(body.modelKey as ModelKey, body.version);
    const active = await trainingRepository.activeModel(body.modelKey);
    return okResponse({ activated: { modelKey: body.modelKey, version: active?.version } });
  } catch (err) {
    return toResponse(err);
  }
}
