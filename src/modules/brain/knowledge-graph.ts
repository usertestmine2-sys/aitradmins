// AITradeMinds — Knowledge Graph. Confidence-weighted relationships that the
// Brain learns over time (stock↔sector, indicator→outcome, macro→impact, ...).
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { brainRepository } from "./repository";

export interface Relationship {
  sourceType: string;
  sourceId: string;
  relation: string;
  targetType: string;
  targetId: string;
  confidenceDelta: number;
}

class KnowledgeGraph {
  /** Reinforce or weaken a relationship based on an observation. */
  async observe(rel: Relationship): Promise<void> {
    await brainRepository.upsertEdge(rel);
    eventBus.publish("training", {
      event: "brain.knowledge.updated",
      message: `${rel.sourceId} ${rel.relation} ${rel.targetId}`,
      ts: Date.now(),
    });
  }

  async neighbors(sourceType: string, sourceId: string) {
    return brainRepository.edgesFrom(sourceType, sourceId);
  }

  async strongest(limit = 50) {
    return brainRepository.topEdges(limit);
  }
}

export const knowledgeGraph = singleton("brain.knowledgeGraph", () => new KnowledgeGraph());
