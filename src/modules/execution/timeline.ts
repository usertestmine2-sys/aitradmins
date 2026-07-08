// AITradeMinds — Trade Timeline. Builds the visual state-machine of an order from
// the append-only order events (reuses tradingRepository) + execution journal.
// SIGNAL→CONSENSUS→RMS→OMS→PENDING→FILLED→POSITION→EXIT→LEARNING.
import { singleton } from "@/kernel";
import { errors } from "@/kernel";
import { tradingRepository } from "@/modules/trading";
import { executionRepository } from "./repository";

// Maps OMS order statuses to the canonical timeline stages.
const STATUS_TO_STAGE: Record<string, string> = {
  CREATED: "SIGNAL",
  VALIDATED: "OMS",
  RISK_APPROVED: "RMS",
  REJECTED: "RMS",
  SUBMITTED: "OMS",
  ACCEPTED: "PENDING",
  PARTIAL: "FILLED",
  FILLED: "FILLED",
  CANCELLED: "EXIT",
  EXPIRED: "EXIT",
};

export interface TimelineStage {
  stage: string;
  status: string;
  reason: string | null;
  latencyMs: number;
  ts: string;
}

class TimelineEngine {
  async build(orderId: number): Promise<{
    orderId: number;
    symbol: string;
    finalStatus: string;
    totalLatencyMs: number;
    stages: TimelineStage[];
  }> {
    const order = await tradingRepository.getOrder(orderId);
    if (!order) throw errors.notFound(`Order ${orderId} not found`);
    const events = await tradingRepository.orderEvents(orderId);

    const stages: TimelineStage[] = events.map((e) => ({
      stage: STATUS_TO_STAGE[e.toStatus] ?? e.toStatus,
      status: e.toStatus,
      reason: e.reason,
      latencyMs: e.latencyMs,
      ts: e.createdAt.toISOString(),
    }));

    // Append POSITION / LEARNING stages if a fill occurred.
    if (order.status === "FILLED" || order.status === "PARTIAL") {
      stages.push({ stage: "POSITION", status: "OPEN", reason: null, latencyMs: 0, ts: order.updatedAt.toISOString() });
      stages.push({ stage: "LEARNING", status: "FED_BRAIN", reason: null, latencyMs: 0, ts: order.updatedAt.toISOString() });
    }

    const totalLatencyMs = stages.reduce((a, s) => a + s.latencyMs, 0);
    const built = { orderId, symbol: order.symbol, finalStatus: order.status, totalLatencyMs, stages };

    // Persist immutable timeline (idempotent by order).
    await executionRepository.saveTimeline({
      orderId,
      accountId: order.accountId,
      symbol: order.symbol,
      stages,
      finalStatus: order.status,
      totalLatencyMs,
    });
    return built;
  }
}

export const timelineEngine = singleton("execution.timeline", () => new TimelineEngine());
