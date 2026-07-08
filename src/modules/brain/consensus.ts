// AITradeMinds — Consensus Engine. Aggregates AI Society opinions into ONE Brain
// decision using adaptive weighting (majority/confidence/reputation/regime). The
// Risk AI has veto influence toward HOLD. Append-only; nothing bypasses the Brain.
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { aiSociety, type AgentOpinion, type Vote } from "./ai-society";
import { modelReputation } from "./reputation";
import { brainRepository } from "./repository";

export type ConsensusMethod = "MAJORITY" | "CONFIDENCE" | "REPUTATION" | "REGIME";

export interface ConsensusResult {
  symbol: string;
  regime: string;
  method: ConsensusMethod;
  decision: Vote;
  score: number; // signed: + toward BUY, - toward SELL
  agreement: number; // fraction agreeing with the decision
  disagreement: number;
  opinions: AgentOpinion[];
  weights: Record<string, number>;
}

const voteSign = (v: Vote): number => (v === "BUY" ? 1 : v === "SELL" ? -1 : 0);

class ConsensusEngine {
  private async weightFor(
    method: ConsensusMethod,
    opinion: AgentOpinion,
    regime: string,
  ): Promise<number> {
    switch (method) {
      case "MAJORITY":
        return 1;
      case "CONFIDENCE":
        return opinion.confidence;
      case "REGIME":
      case "REPUTATION": {
        // Map agent → reputation influence (agents named *_AI align to model keys
        // where available; others default to neutral 1.0). Regime-aware lookup.
        const key = opinion.agent.replace("_AI", "");
        const influence = await modelReputation.influenceFor(
          key === "TREND" || key === "MOMENTUM" || key === "MEAN_REVERSION" || key === "RISK"
            ? key
            : "TREND",
          method === "REGIME" ? regime : "ALL",
        );
        return method === "REGIME" ? influence * opinion.confidence : influence;
      }
    }
  }

  async decide(
    symbol: string,
    regime: string,
    method: ConsensusMethod = "REPUTATION",
    exchange: "NSE" | "BSE" = "NSE",
  ): Promise<ConsensusResult> {
    const opinions = await aiSociety.opinions(symbol, exchange);
    const weights: Record<string, number> = {};
    let weightedScore = 0;
    let totalWeight = 0;

    for (const op of opinions) {
      let w = await this.weightFor(method, op, regime);
      // Risk AI pulls toward caution: its HOLD dampens the net score.
      if (op.agent === "RISK_AI" && op.vote === "HOLD") w *= 1.5;
      weights[op.agent] = +w.toFixed(4);
      weightedScore += voteSign(op.vote) * op.confidence * w;
      totalWeight += w;
    }

    const score = totalWeight > 0 ? +(weightedScore / totalWeight).toFixed(4) : 0;
    const decision: Vote = score > 0.15 ? "BUY" : score < -0.15 ? "SELL" : "HOLD";

    const agreeing = opinions.filter((o) => o.vote === decision).length;
    const agreement = +(agreeing / opinions.length).toFixed(4);
    const disagreement = +(1 - agreement).toFixed(4);

    await brainRepository.saveConsensus({
      symbol,
      exchange,
      regime,
      method,
      decision,
      score,
      agreement,
      disagreement,
      opinions,
    });
    eventBus.publish("training", {
      event: "brain.consensus.updated",
      message: `${symbol} ${decision} (${method}, agreement ${(agreement * 100).toFixed(0)}%)`,
      ts: Date.now(),
    });

    return { symbol, regime, method, decision, score, agreement, disagreement, opinions, weights };
  }

  async history(symbol?: string) {
    return brainRepository.recentConsensus(symbol, 50);
  }
}

export const consensusEngine = singleton("brain.consensus", () => new ConsensusEngine());
