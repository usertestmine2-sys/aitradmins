// AITradeMinds — Master Execution Pipeline. The ONE unified decision flow:
// MarketData → Features → AI Society → Consensus → Brain → RMS → Portfolio →
// Paper OMS → Learning. Orchestrates existing singletons only (no re-implementation).
// Nothing bypasses the Brain. Append-only run history.
import { newCorrelationId, logger, runWithContext, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { providerManager } from "@/modules/market_data/providers/provider-manager";
import { consensusEngine, aiBrain } from "@/modules/brain";
import { riskEngine } from "@/modules/trading/rms";
import { oms } from "@/modules/trading/oms";
import { tradingRepository } from "@/modules/trading";
import { platformRepository } from "./repository";

export interface PipelineInput {
  userId: number;
  symbol: string;
  exchange?: "NSE" | "BSE";
  regime?: string;
  quantity?: number;
  autoExecutePaper?: boolean; // default false — recommend-only unless requested
}

export interface PipelineResult {
  correlationId: string;
  symbol: string;
  regime: string;
  consensus: { decision: string; score: number; agreement: number };
  risk: { decision: string; detail: string } | null;
  executed: boolean;
  orderStatus: string | null;
  stages: string[];
  latencyMs: number;
}

class MasterPipeline {
  /**
   * Run the full decision pipeline for one symbol. By default recommend-only;
   * with autoExecutePaper it routes an RMS-approved BUY through the paper OMS.
   */
  async run(input: PipelineInput): Promise<PipelineResult> {
    const correlationId = newCorrelationId();
    return runWithContext({ correlationId, userId: String(input.userId), source: "pipeline" }, async () => {
      const started = Date.now();
      const stages: string[] = [];
      const exchange = input.exchange ?? "NSE";
      const regime = input.regime ?? "RANGE";

      // Stage 1: Market data (real quote).
      const quote = await providerManager.getQuote(input.symbol, exchange);
      stages.push("market_data");

      // Stage 2+3: AI Society + Consensus (Brain aggregation).
      const consensus = await consensusEngine.decide(input.symbol, regime, "REPUTATION", exchange);
      stages.push("ai_society", "consensus");

      // Stage 4: Brain explanation (nothing bypasses the Brain).
      await aiBrain.explain("TREND", input.symbol, 0.5 + consensus.score / 2, regime);
      stages.push("brain");

      let riskResult: { decision: string; detail: string } | null = null;
      let executed = false;
      let orderStatus: string | null = null;

      // Stage 5: only actionable BUY consensus proceeds to risk/execution.
      if (consensus.decision === "BUY") {
        const account = await tradingRepository.ensureAccount(input.userId, "PAPER");
        const quantity = input.quantity ?? Math.max(1, Math.floor((0.05 * account.startingBalance) / quote.ltp));

        // Stage 5: RMS deterministic gate.
        const risk = await riskEngine.evaluate({
          accountId: account.id,
          symbol: input.symbol,
          side: "BUY",
          quantity,
          quote,
        });
        riskResult = { decision: risk.decision, detail: risk.detail };
        stages.push("risk_engine");

        // Stage 6+7+8: Portfolio + Paper OMS execution (only if RMS approved & requested).
        if (risk.decision === "APPROVED" && input.autoExecutePaper) {
          const placed = await oms.place({
            userId: input.userId,
            symbol: input.symbol,
            exchange,
            side: "BUY",
            orderType: "MARKET",
            quantity,
            strategy: "CONSENSUS",
            modelKey: "TREND",
            confidence: 0.5 + consensus.score / 2,
            regime,
          });
          executed = placed.status === "FILLED" || placed.status === "PARTIAL";
          orderStatus = placed.status;
          stages.push("portfolio", "paper_oms", "learning");
        }
      }

      const latencyMs = Date.now() - started;
      await platformRepository.saveRun({
        correlationId,
        symbol: input.symbol,
        regime,
        consensusDecision: consensus.decision,
        consensusScore: consensus.score,
        riskDecision: riskResult?.decision ?? "N/A",
        executed,
        orderStatus,
        stages,
        latencyMs,
        actorId: String(input.userId),
      });
      eventBus.publish("training", {
        event: "brain.command.executed",
        message: `pipeline ${input.symbol} ${consensus.decision} exec=${executed}`,
        ts: Date.now(),
      });
      logger.info("pipeline.run", { correlationId, symbol: input.symbol, decision: consensus.decision, executed });

      return {
        correlationId,
        symbol: input.symbol,
        regime,
        consensus: { decision: consensus.decision, score: consensus.score, agreement: consensus.agreement },
        risk: riskResult,
        executed,
        orderStatus,
        stages,
        latencyMs,
      };
    });
  }

  async history(limit = 50) {
    return platformRepository.runs(limit);
  }
}

export const masterPipeline = singleton("platform.pipeline", () => new MasterPipeline());
