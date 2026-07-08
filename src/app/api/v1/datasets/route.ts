import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { trainingRepository } from "@/modules/training";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    const datasets = await trainingRepository.listDatasets(50);
    // Return metadata only; row payloads can be large.
    const safe = datasets.map((d) => ({
      trainingId: d.trainingId,
      symbol: d.symbol,
      timeframe: d.timeframe,
      featureVersion: d.featureVersion,
      featureCount: d.featureNames.length,
      rowCount: d.rowCount,
      regime: d.regime,
      createdAt: d.createdAt,
    }));
    return okResponse({ datasets: safe });
  } catch (err) {
    return toResponse(err);
  }
}
