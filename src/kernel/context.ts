// AITradeMinds — Kernel Context. Correlation/trace propagation via AsyncLocalStorage.
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export interface RequestContext {
  correlationId: string;
  userId?: string;
  tenantId?: string;
  source?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function newCorrelationId(): string {
  return randomUUID();
}

/** Run a function within a context; all logs/events inside inherit it. */
export function runWithContext<T>(ctx: Partial<RequestContext>, fn: () => T): T {
  const full: RequestContext = {
    correlationId: ctx.correlationId ?? newCorrelationId(),
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    source: ctx.source,
  };
  return storage.run(full, fn);
}

export function getContext(): RequestContext | undefined {
  return storage.getStore();
}
