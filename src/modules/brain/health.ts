// AITradeMinds — Brain Health Score. Monitors drift/backlog/quality and produces
// a single health grade for the Operations Center. Reuses brain + training repos.
import { singleton } from "@/kernel";
import { trainingRepository } from "@/modules/training";
import { brainRepository } from "./repository";

export interface BrainHealth {
  score: number; // 0..100
  grade: "EXCELLENT" | "HEALTHY" | "WARNING" | "CRITICAL";
  signals: {
    memoryGrowth: number;
    knowledgeEdges: number;
    openRecommendations: number;
    criticalRecommendations: number;
    dnaCount: number;
    models: number;
  };
  notes: string[];
}

class BrainHealthMonitor {
  async score(): Promise<BrainHealth> {
    const [memory, edges, recs, dnaCount, models] = await Promise.all([
      brainRepository.memoryCounts(),
      brainRepository.topEdges(1000),
      brainRepository.listRecommendations(undefined, 200),
      brainRepository.dnaCount(),
      trainingRepository.listModels(undefined, 200),
    ]);

    const memoryGrowth = Object.values(memory).reduce((a, b) => a + b, 0);
    const openRecs = recs.filter((r) => r.status === "OPEN");
    const criticalRecs = openRecs.filter((r) => r.severity === "CRITICAL");

    // Start at 100, deduct for risk signals (drift proxies + backlog).
    let score = 100;
    const notes: string[] = [];

    if (criticalRecs.length > 0) {
      score -= criticalRecs.length * 15;
      notes.push(`${criticalRecs.length} critical meta recommendation(s)`);
    }
    if (openRecs.length > 10) {
      score -= 10;
      notes.push(`${openRecs.length} open recommendations (backlog)`);
    }
    if (edges.length === 0) {
      score -= 20;
      notes.push("Knowledge graph empty (cold start)");
    }
    if (models.length === 0) {
      score -= 25;
      notes.push("No trained models");
    }
    if (dnaCount === 0) {
      score -= 10;
      notes.push("No Market DNA extracted");
    }
    if (memoryGrowth === 0) {
      score -= 5;
      notes.push("No learning memory yet");
    }
    if (notes.length === 0) notes.push("All health signals nominal");

    score = Math.max(0, Math.min(100, score));
    const grade: BrainHealth["grade"] =
      score >= 90 ? "EXCELLENT" : score >= 70 ? "HEALTHY" : score >= 50 ? "WARNING" : "CRITICAL";

    return {
      score,
      grade,
      signals: {
        memoryGrowth,
        knowledgeEdges: edges.length,
        openRecommendations: openRecs.length,
        criticalRecommendations: criticalRecs.length,
        dnaCount,
        models: models.length,
      },
      notes,
    };
  }
}

export const brainHealth = singleton("brain.health", () => new BrainHealthMonitor());
