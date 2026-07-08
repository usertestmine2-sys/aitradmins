import type { SystemEvent, SystemEventType } from "@/lib/ops/types";

/**
 * Event Backbone — in-process publish/subscribe bus for system.* events.
 * Singleton across route bundles via globalThis. Counters feed the
 * Operations Center's own health reporting.
 */

export type BusListener = (event: SystemEvent) => void;

export interface BusStats {
  published: number;
  delivered: number;
  dropped: number;
  subscribers: number;
}

class EventBus {
  private listeners = new Set<BusListener>();
  private published = 0;
  private delivered = 0;
  private dropped = 0;

  publish(type: SystemEventType, componentId?: string | null, payload?: Record<string, unknown>): void {
    const event: SystemEvent = {
      type,
      componentId: componentId ?? null,
      payload: payload ?? {},
      at: new Date().toISOString(),
    };
    this.published += 1;
    for (const listener of this.listeners) {
      try {
        listener(event);
        this.delivered += 1;
      } catch {
        this.dropped += 1;
      }
    }
  }

  subscribe(listener: BusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  stats(): BusStats {
    return {
      published: this.published,
      delivered: this.delivered,
      dropped: this.dropped,
      subscribers: this.listeners.size,
    };
  }
}

const globalForBus = globalThis as typeof globalThis & {
  __aitmEventBus?: EventBus;
};

export function getEventBus(): EventBus {
  if (!globalForBus.__aitmEventBus) {
    globalForBus.__aitmEventBus = new EventBus();
  }
  return globalForBus.__aitmEventBus;
}
