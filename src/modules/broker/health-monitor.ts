// AITradeMinds — Broker Health Monitor. Probes brokers and derives health.
// Publishes broker.health.changed on the single Event Bus. No parallel monitor.
import { logger } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { BROKER_EVENTS, type BrokerName } from "./constants";
import type { BrokerHealth, IBroker } from "./types";

const DEGRADED_MS = 150;
const DOWN_MS = 1000;

export class BrokerHealthMonitor {
  private readonly health = new Map<BrokerName, BrokerHealth>();

  current(name: BrokerName): BrokerHealth {
    return (
      this.health.get(name) ?? {
        state: "DOWN",
        latencyMs: 0,
        lastCheck: 0,
        message: "not yet probed",
      }
    );
  }

  async probe(broker: IBroker): Promise<BrokerHealth> {
    const previous = this.health.get(broker.name);
    let next: BrokerHealth;
    try {
      const latency = await broker.ping();
      next = {
        state: latency > DOWN_MS ? "DOWN" : latency > DEGRADED_MS ? "DEGRADED" : "UP",
        latencyMs: latency,
        lastCheck: Date.now(),
      };
    } catch (err) {
      next = {
        state: "DOWN",
        latencyMs: 0,
        lastCheck: Date.now(),
        message: err instanceof Error ? err.message : "probe failed",
      };
    }
    this.health.set(broker.name, next);

    if (!previous || previous.state !== next.state) {
      logger.info("broker.health.changed", { broker: broker.name, state: next.state });
      eventBus.publish("broker", {
        event: BROKER_EVENTS.healthChanged,
        broker: broker.name,
        health: next.state,
        ts: Date.now(),
      });
    }
    return next;
  }

  snapshot(): Record<string, BrokerHealth> {
    return Object.fromEntries(this.health.entries());
  }
}
