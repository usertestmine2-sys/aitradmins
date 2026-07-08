// AITradeMinds — Analytics Service. READ-ONLY aggregator over existing singletons.
// Consumes Brain, Training, Market, Broker, Ops Center. Never bypasses the Brain;
// never duplicates data — it composes what the owning services expose.
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { cache } from "@/modules/market_data/core/cache";
import { repository as marketRepo } from "@/modules/market_data/core/repository";
import { breadthEngine } from "@/modules/market_data/services/breadth";
import { sectorIntelligence } from "@/modules/market_data/services/sector-intelligence";
import { marketSession } from "@/modules/market_data/session/session";
import { providerManager } from "@/modules/market_data/providers/provider-manager";
import { scheduler, infraRepository } from "@/modules/infra";
import { brokerManager } from "@/modules/broker";
import { trainingRepository, MODEL_KEYS } from "@/modules/training";
import {
  brainHealth,
  brainRepository,
  metaLearning,
  modelReputation,
} from "@/modules/brain";

import { tradingRepository, executionQuality, portfolioEngine } from "@/modules/trading";

// Risk/strategy analytics are computed from real trading data once accounts exist;
// otherwise an honest empty summary is returned (never fabricated).
const NO_ACCOUNT = { available: false, note: "No paper account activity yet" };

class AnalyticsService {
  // ---- Brain analytics ----
  async brain() {
    const [health, memory, edges, recs] = await Promise.all([
      brainHealth.score(),
      brainRepository.memoryCounts(),
      brainRepository.topEdges(20),
      brainRepository.listRecommendations(undefined, 50),
    ]);
    const reputation = await modelReputation.leaderboard();
    return {
      health,
      memory,
      knowledgeGrowth: edges.length,
      topRelationships: edges.slice(0, 10).map((e) => ({
        rel: `${e.sourceId} ${e.relation} ${e.targetId}`,
        confidence: +e.confidence.toFixed(3),
      })),
      reputation,
      openRecommendations: recs.filter((r) => r.status === "OPEN").length,
    };
  }

  // ---- AI model analytics (Trend/Momentum/MeanReversion/Risk) ----
  async models() {
    const out = [];
    for (const key of MODEL_KEYS) {
      const models = await trainingRepository.listModels(key, 50);
      const active = models.find((m) => m.active);
      const lessons = await trainingRepository.lessonStats(key);
      const reps = await modelReputation.leaderboard(key);
      const meta = models.length ? await metaLearning.recommendations(key) : [];
      out.push({
        modelKey: key,
        versions: models.length,
        activeVersion: active?.version ?? null,
        activeMetrics: (active?.metrics as Record<string, number> | undefined) ?? null,
        lessons,
        reputation: reps,
        openRecommendations: meta.filter((m) => m.status === "OPEN").length,
      });
    }
    return out;
  }

  // ---- Training analytics ----
  async training() {
    const models = await trainingRepository.listModels(undefined, 200);
    const datasets = await trainingRepository.listDatasets(50);
    const jobs = await infraRepository.recentJobs(25);
    return {
      totalModels: models.length,
      activeModels: models.filter((m) => m.active).length,
      pendingApproval: models.filter((m) => m.approvalStatus === "PENDING").length,
      datasets: datasets.length,
      recentTrainingJobs: jobs
        .filter((j) => j.name.startsWith("training"))
        .map((j) => ({ name: j.name, status: j.status, durationMs: j.durationMs })),
    };
  }

  // ---- Market analytics ----
  async market() {
    const [nifty, banknifty, rotation] = await Promise.all([
      breadthEngine.nifty(),
      breadthEngine.bankNifty(),
      sectorIntelligence.rotation(),
    ]);
    return {
      session: marketSession.getState(),
      breadth: { nifty, banknifty },
      sectorRotation: rotation.ranked.slice(0, 8),
      rotatingInto: rotation.rotatingInto,
      rotatingOut: rotation.rotatingOut,
    };
  }

  // ---- Broker analytics ----
  async broker() {
    return { brokers: brokerManager.status() };
  }

  // ---- Operations / system analytics ----
  async system() {
    return {
      session: marketSession.getState(),
      providers: { active: providerManager.activeProvider(), status: providerManager.status() },
      scheduler: scheduler.status(),
      cache: cache.stats(),
      events: eventBus.metrics(),
      counts: {
        symbols: await marketRepo.count("symbols"),
        candles: await marketRepo.count("candles"),
        news: await marketRepo.count("news"),
      },
    };
  }

  // ---- Strategy / Paper / Risk analytics (real, per-account) ----
  async paperTrading(accountId?: number) {
    if (!accountId) return { available: true, note: "Query with an account context", scope: "per-account" };
    const [portfolio, quality] = await Promise.all([
      portfolioEngine.snapshot(accountId),
      executionQuality.summary(accountId),
    ]);
    return { available: true, portfolio, executionQuality: quality };
  }

  async risk(accountId?: number) {
    if (!accountId) return { available: true, note: "Query with an account context", scope: "per-account" };
    const decisions = await tradingRepository.riskDecisions(accountId, 100);
    const rejected = decisions.filter((d) => d.decision === "REJECTED").length;
    return {
      available: true,
      total: decisions.length,
      rejected,
      approved: decisions.length - rejected,
      recent: decisions.slice(0, 10),
    };
  }

  async strategy(accountId?: number) {
    if (!accountId) return NO_ACCOUNT;
    const orders = await tradingRepository.listOrders(accountId, 500);
    const byStrategy = new Map<string, { orders: number; filled: number }>();
    for (const o of orders) {
      const s = o.strategy ?? "manual";
      const e = byStrategy.get(s) ?? { orders: 0, filled: 0 };
      e.orders += 1;
      if (o.status === "FILLED" || o.status === "PARTIAL") e.filled += 1;
      byStrategy.set(s, e);
    }
    return {
      available: true,
      strategies: [...byStrategy.entries()].map(([name, v]) => ({ name, ...v })),
    };
  }

  // ---- Learning analytics ----
  async learning() {
    const out = [];
    for (const key of MODEL_KEYS) {
      const stats = await trainingRepository.lessonStats(key);
      out.push({ modelKey: key, ...stats, winRate: stats.total ? +(stats.wins / stats.total).toFixed(4) : 0 });
    }
    return { perModel: out };
  }

  // ---- Unified dashboard snapshot ----
  async dashboard() {
    const [brain, market, broker, training, system, learning] = await Promise.all([
      this.brain(),
      this.market(),
      this.broker(),
      this.training(),
      this.system(),
      this.learning(),
    ]);
    const snapshot = {
      brain,
      market,
      broker,
      training,
      system,
      learning,
      strategy: { available: true, scope: "per-account" },
      paperTrading: { available: true, scope: "per-account" },
      risk: { available: true, scope: "per-account" },
      ts: Date.now(),
    };
    eventBus.publish("training", {
      event: "analytics.generated",
      message: `dashboard snapshot (brain health ${brain.health.grade})`,
      ts: Date.now(),
    });
    return snapshot;
  }
}

export const analyticsService = singleton("analytics.service", () => new AnalyticsService());
