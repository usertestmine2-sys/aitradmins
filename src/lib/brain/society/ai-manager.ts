import { appendEvent } from "@/lib/events/audit-store";
import {
  ensureSocietySeeded,
  listModels,
  openSocietySession,
  type SocietySession,
} from "@/lib/brain/society/manager";
import { MODEL_DEFINITIONS } from "@/lib/brain/society/models";
import type { MarketContext, ModelStateDTO } from "@/lib/brain/types";

/**
 * AI MANAGER (Phase-3) — the single management layer for the AI Society,
 * composed over the existing Model Manager (no duplication: lifecycle,
 * heartbeats, stats and sessions remain in society/manager.ts).
 *
 * Adds: reasoning task allocation, permissions, isolation attestation,
 * load balancing statistics, and disagreement collection. The AI Brain
 * remains the coordinator; the AI Manager never makes decisions.
 */

/** Structural permission set. Command/override/modification rights DO NOT EXIST. */
export interface AiPermissions {
  reason: true;
  vote: true;
  challenge: true;
  writeOwnMemory: true;
  commandOtherModels: false;
  overrideConsensus: false;
  modifyOtherMemory: false;
  modifyStrategies: false;
}

export const MODEL_PERMISSIONS: AiPermissions = {
  reason: true,
  vote: true,
  challenge: true,
  writeOwnMemory: true,
  commandOtherModels: false,
  overrideConsensus: false,
  modifyOtherMemory: false,
  modifyStrategies: false,
};

interface LoadStats {
  tasksAllocated: number;
  sessionsServed: number;
  lastSessionAt: string | null;
}

const globalForAiManager = globalThis as typeof globalThis & {
  __aitmAiLoad?: Map<string, LoadStats>;
};

function loadMap(): Map<string, LoadStats> {
  return (globalForAiManager.__aitmAiLoad ??= new Map());
}

export interface AiManagerState {
  models: (ModelStateDTO & { permissions: AiPermissions; load: LoadStats })[];
  isolation: {
    privateMemoryScoped: boolean;
    directModelToModelChannels: number; // structurally zero
    mediator: string;
  };
  equalAuthority: boolean;
}

export async function getAiManagerState(): Promise<AiManagerState> {
  await ensureSocietySeeded();
  const models = await listModels();
  return {
    models: models.map((m) => ({
      ...m,
      permissions: MODEL_PERMISSIONS,
      load: loadMap().get(m.id) ?? { tasksAllocated: 0, sessionsServed: 0, lastSessionAt: null },
    })),
    isolation: {
      privateMemoryScoped: true, // model_memory access layer is single-model scoped by construction
      directModelToModelChannels: 0, // models are pure functions; no channel exists
      mediator: "ai-brain",
    },
    equalAuthority: true, // no rank field exists in brain_models by design
  };
}

/**
 * Managed session: allocates the universe reasoning task to every ACTIVE
 * model (equal allocation — equal authority), tracks load, and delegates all
 * session mechanics to the existing Model Manager.
 */
export async function openManagedSession(
  cycleId: string,
  context: MarketContext,
  universeSize: number,
): Promise<SocietySession> {
  const session = await openSocietySession(cycleId, context);
  const now = new Date().toISOString();
  for (const model of session.activeModels) {
    const stats = loadMap().get(model.id) ?? { tasksAllocated: 0, sessionsServed: 0, lastSessionAt: null };
    stats.tasksAllocated += universeSize;
    stats.sessionsServed += 1;
    stats.lastSessionAt = now;
    loadMap().set(model.id, stats);
    await appendEvent("ai.task.allocated", model.id, {
      cycleId,
      task: "analyze-universe",
      symbols: universeSize,
      allocation: "equal", // no model receives preferential task routing
    });
  }
  // Suspended/stopped models receive no allocation — natural load balancing
  // by lifecycle, controlled only through the Model Manager.
  return session;
}

export { MODEL_DEFINITIONS };
