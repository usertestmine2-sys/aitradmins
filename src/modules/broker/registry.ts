// AITradeMinds — Broker Registry. Dynamic component registry for brokers.
// Registers each broker into the platform singleton registry (kernel) so the
// Operations Center and dependency graph can discover them. One instance only.
import { singleton } from "@/kernel";
import type { BrokerName } from "./constants";
import type { IBroker } from "./types";

class BrokerRegistry {
  private readonly brokers = new Map<BrokerName, IBroker>();

  register(broker: IBroker): void {
    if (this.brokers.has(broker.name)) return; // idempotent — never duplicate
    this.brokers.set(broker.name, broker);
  }

  get(name: BrokerName): IBroker | undefined {
    return this.brokers.get(name);
  }

  all(): IBroker[] {
    return [...this.brokers.values()].sort((a, b) => a.priority - b.priority);
  }

  names(): BrokerName[] {
    return this.all().map((b) => b.name);
  }

  has(name: BrokerName): boolean {
    return this.brokers.has(name);
  }
}

export const brokerRegistry = singleton("broker.registry", () => new BrokerRegistry());
