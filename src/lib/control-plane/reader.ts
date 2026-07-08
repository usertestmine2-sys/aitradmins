import { db } from "@/db";
import { controlPlaneState } from "@/db/schema";

/**
 * Control Plane governance reader — the single enforcement-side read path
 * for execution gating. (The Operations probe observes the same table for
 * monitoring; this module exists so execution never depends on the ops layer.)
 */

export interface ControlPlaneGates {
  globalExecutionState: string;
  aiEnabled: boolean;
  strategyEnabled: boolean;
  emergencyStop: boolean;
}

export async function readControlPlaneGates(): Promise<ControlPlaneGates> {
  const rows = await db.select().from(controlPlaneState);
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return {
    globalExecutionState: byKey.get("global_execution_state") ?? "UNKNOWN",
    aiEnabled: byKey.get("ai_enabled") === "true",
    strategyEnabled: byKey.get("strategy_enabled") === "true",
    emergencyStop: byKey.get("emergency_stop") === "true",
  };
}

export type DecisionSource = "ai" | "strategy";

/** Returns null when execution is permitted, otherwise a human-readable block reason. */
export function evaluateGates(gates: ControlPlaneGates, source: DecisionSource): string | null {
  if (gates.emergencyStop) {
    return "Emergency stop is ACTIVE — all execution halted platform-wide.";
  }
  if (gates.globalExecutionState === "HALTED") {
    return "Global execution state is HALTED.";
  }
  if (source === "ai" && !gates.aiEnabled) {
    return "AI execution is DISABLED by the Control Plane.";
  }
  if (source === "strategy" && !gates.strategyEnabled) {
    return "Strategy execution is DISABLED by the Control Plane.";
  }
  return null;
}
