// AITradeMinds — Model Reputation. Every AI earns reputation from outcomes; the
// Brain dynamically adjusts each model's influence. Reuses brainRepository.
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { brainRepository } from "./repository";
import type { BrainModelReputation } from "@/db/schema";

export interface ReputationScore {
  modelKey: string;
  regime: string;
  trades: number;
  winRate: number;
  avgReward: number;
  sharpe: number;
  maxDrawdown: number;
  recentScore: number;
  influence: number;
}

class ModelReputation {
  /** Record a trade outcome and recompute influence for that model/regime. */
  async record(row: {
    modelKey: string;
    regime: string;
    reward: number;
    drawdown?: number;
  }): Promise<void> {
    await brainRepository.updateReputation({
      modelKey: row.modelKey,
      regime: row.regime,
      win: row.reward > 0,
      reward: row.reward,
      drawdown: row.drawdown ?? 0,
    });
    // Recompute influence: reward-adjusted, drawdown-penalized, recency-weighted.
    const reps = await brainRepository.reputations(row.modelKey);
    const rep = reps.find((r) => r.regime === row.regime);
    if (rep) {
      const score = this.score(rep);
      const influence = Math.max(
        0.1,
        Math.min(2, 0.5 + score.winRate + score.recentScore - score.maxDrawdown),
      );
      await brainRepository.setInfluence(row.modelKey, row.regime, +influence.toFixed(4));
      eventBus.publish("training", {
        event: "brain.reputation.updated",
        modelKey: row.modelKey,
        message: `${row.regime} influence=${influence.toFixed(2)}`,
        ts: Date.now(),
      });
    }
  }

  private score(rep: BrainModelReputation): ReputationScore {
    const winRate = rep.trades ? rep.wins / rep.trades : 0;
    const avgReward = rep.trades ? rep.cumReward / rep.trades : 0;
    const variance = rep.trades
      ? rep.cumReturnSq / rep.trades - avgReward * avgReward
      : 0;
    const sd = Math.sqrt(Math.max(0, variance));
    const sharpe = sd === 0 ? 0 : (avgReward / sd) * Math.sqrt(252);
    return {
      modelKey: rep.modelKey,
      regime: rep.regime,
      trades: rep.trades,
      winRate: +winRate.toFixed(4),
      avgReward: +avgReward.toFixed(6),
      sharpe: +sharpe.toFixed(4),
      maxDrawdown: +rep.maxDrawdown.toFixed(6),
      recentScore: +rep.recentScore.toFixed(4),
      influence: +rep.influence.toFixed(4),
    };
  }

  async leaderboard(modelKey?: string): Promise<ReputationScore[]> {
    const reps = await brainRepository.reputations(modelKey);
    return reps.map((r) => this.score(r));
  }

  /** The Brain's aggregation weight for a model in a regime (falls back to 1). */
  async influenceFor(modelKey: string, regime: string): Promise<number> {
    const reps = await brainRepository.reputations(modelKey);
    const rep = reps.find((r) => r.regime === regime) ?? reps.find((r) => r.regime === "ALL");
    return rep?.influence ?? 1;
  }
}

export const modelReputation = singleton("brain.reputation", () => new ModelReputation());
