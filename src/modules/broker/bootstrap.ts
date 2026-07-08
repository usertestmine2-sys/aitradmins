// AITradeMinds — Broker Foundation bootstrap.
// Registers brokers into the Broker Manager and wires the health-monitor job into
// the Operations Center (single scheduler). Idempotent. No live execution.
import { singleton } from "@/kernel";
import { scheduler } from "@/modules/infra";
import { brokerManager } from "./manager";
import { brokerRegistry } from "./registry";

interface BrokerBootState {
  done: boolean;
}

const state = singleton<BrokerBootState>("broker.bootstrap.state", () => ({ done: false }));

export function bootstrapBrokers(): { brokers: string[]; job: string } {
  if (!state.done) {
    brokerManager.init();
    // Register broker health monitoring into the Operations Center scheduler.
    scheduler.register({
      name: "broker.healthMonitor",
      intervalMs: 15_000,
      handler: () => brokerManager.monitorAll(),
    });
    state.done = true;
  }
  return {
    brokers: brokerRegistry.names(),
    job: "broker.healthMonitor",
  };
}
