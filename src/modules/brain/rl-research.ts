// AITradeMinds — Reinforcement Learning research interface. RESEARCH ONLY.
// Provides a replay buffer + episode recording + Q-value inspection scaffolding.
// NEVER activates automatically; NEVER touches production decisions.
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { brainRepository } from "./repository";

export interface Experience {
  episode: string;
  agent: string;
  state: Record<string, number>;
  action: string;
  reward: number;
  nextState?: Record<string, number>;
  terminal?: boolean;
}

class RlResearch {
  /** Record an experience tuple into the replay buffer (append-only, research). */
  async record(exp: Experience): Promise<void> {
    await brainRepository.saveExperience({
      episode: exp.episode,
      agent: exp.agent,
      state: exp.state,
      action: exp.action,
      reward: exp.reward,
      nextState: exp.nextState,
      terminal: exp.terminal ?? false,
    });
  }

  /**
   * Tabular Q-value estimate over a research episode (Monte-Carlo returns).
   * Read-only analysis; produces recommendations, never live policy.
   */
  async analyzeEpisode(episode: string, gamma = 0.95): Promise<{
    experiences: number;
    actionValues: Record<string, { count: number; avgReturn: number }>;
    bestAction: string | null;
  }> {
    const buffer = await brainRepository.replayBuffer(episode, 1000);
    // Monte-Carlo discounted returns per step.
    const returns: Array<{ action: string; g: number }> = [];
    let g = 0;
    for (let i = buffer.length - 1; i >= 0; i -= 1) {
      g = buffer[i].reward + gamma * g;
      returns.push({ action: buffer[i].action, g });
    }
    const agg = new Map<string, { count: number; total: number }>();
    for (const r of returns) {
      const e = agg.get(r.action) ?? { count: 0, total: 0 };
      e.count += 1;
      e.total += r.g;
      agg.set(r.action, e);
    }
    const actionValues: Record<string, { count: number; avgReturn: number }> = {};
    let bestAction: string | null = null;
    let bestVal = -Infinity;
    for (const [action, v] of agg.entries()) {
      const avg = v.count ? v.total / v.count : 0;
      actionValues[action] = { count: v.count, avgReturn: +avg.toFixed(6) };
      if (avg > bestVal) {
        bestVal = avg;
        bestAction = action;
      }
    }
    eventBus.publish("training", {
      event: "brain.research.completed",
      message: `RL episode ${episode}: ${buffer.length} experiences`,
      ts: Date.now(),
    });
    return { experiences: buffer.length, actionValues, bestAction };
  }
}

export const rlResearch = singleton("brain.rlResearch", () => new RlResearch());
