// AITradeMinds — Brain Self-Review. The Brain evaluates itself: strengths,
// weaknesses, improvement proposals (recommend-only). Reuses health + meta +
// reputation + training. Append-only.
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { trainingRepository, MODEL_KEYS } from "@/modules/training";
import { brainHealth } from "./health";
import { modelReputation } from "./reputation";
import { metaLearning } from "./meta-learning";
import { brainRepository } from "./repository";
import type { BrainSelfReview } from "@/db/schema";

export type ReviewScope = "DAILY" | "WEEKLY" | "MONTHLY" | "REGIME";

class SelfReview {
  async run(scope: ReviewScope = "DAILY"): Promise<BrainSelfReview> {
    const health = await brainHealth.score();
    const reputations = await modelReputation.leaderboard();

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const proposals: string[] = [];

    if (health.grade === "EXCELLENT" || health.grade === "HEALTHY") {
      strengths.push(`Brain health ${health.grade} (${health.score})`);
    } else {
      weaknesses.push(`Brain health ${health.grade} (${health.score})`);
      proposals.push("Address health signals: " + health.notes.join("; "));
    }

    // Strongest and weakest performers.
    const ranked = [...reputations].sort((a, b) => b.winRate - a.winRate);
    if (ranked.length) {
      strengths.push(`Best performer: ${ranked[0].modelKey}/${ranked[0].regime} (win ${(ranked[0].winRate * 100).toFixed(0)}%)`);
      const worst = ranked[ranked.length - 1];
      if (worst.trades >= 3 && worst.winRate < 0.4) {
        weaknesses.push(`Weak performer: ${worst.modelKey}/${worst.regime} (win ${(worst.winRate * 100).toFixed(0)}%)`);
        proposals.push(`Retrain or reduce influence of ${worst.modelKey} in ${worst.regime}`);
      }
    } else {
      weaknesses.push("No model reputation data yet");
      proposals.push("Run paper trades to build reputation");
    }

    // Meta-learning recommendations feed self-review proposals.
    for (const key of MODEL_KEYS) {
      const models = await trainingRepository.listModels(key, 5);
      if (models.length === 0) continue;
      const recs = await metaLearning.recommendations(key);
      const open = recs.filter((r) => r.status === "OPEN");
      if (open.length) proposals.push(`${key}: ${open.length} open meta recommendation(s)`);
    }

    if (proposals.length === 0) proposals.push("No improvement actions required this cycle");

    const review = await brainRepository.saveSelfReview({
      scope,
      healthScore: health.score,
      strengths,
      weaknesses,
      proposals,
    });
    eventBus.publish("training", {
      event: "brain.selfreview.completed",
      message: `${scope}: ${strengths.length} strengths, ${weaknesses.length} weaknesses, ${proposals.length} proposals`,
      ts: Date.now(),
    });
    return review;
  }

  async history() {
    return brainRepository.selfReviews(20);
  }
}

export const selfReview = singleton("brain.selfReview", () => new SelfReview());
