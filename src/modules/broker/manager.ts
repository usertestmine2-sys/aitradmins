// AITradeMinds — Broker Manager. The single coordinator for broker connectivity.
// Owns per-broker state machines, drives connect/auth lifecycle, delegates health
// to the monitor, and emits broker events on the single Event Bus. NO live order
// execution in this phase. NO fund custody — user money stays inside the broker.
import { errors, logger, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import {
  BROKER_EVENTS,
  type BrokerName,
  type ConnectionState,
} from "./constants";
import { createAllBrokers } from "./adapters";
import { brokerRegistry } from "./registry";
import { BrokerHealthMonitor } from "./health-monitor";
import { ConnectionStateMachine } from "./state-machine";
import type { BrokerCredentialRef, BrokerStatus, IBroker } from "./types";

interface BrokerRecord {
  broker: IBroker;
  machine: ConnectionStateMachine;
}

class BrokerManager {
  private readonly records = new Map<BrokerName, BrokerRecord>();
  private readonly monitor = new BrokerHealthMonitor();
  private initialized = false;

  /** Idempotently register all brokers into the registry + state machines. */
  init(): void {
    if (this.initialized) return;
    for (const broker of createAllBrokers()) {
      brokerRegistry.register(broker);
      this.records.set(broker.name, {
        broker,
        machine: new ConnectionStateMachine(broker.name),
      });
    }
    this.initialized = true;
    logger.info("broker.manager.init", { brokers: [...this.records.keys()] });
  }

  private record(name: BrokerName): BrokerRecord {
    const rec = this.records.get(name);
    if (!rec) throw errors.notFound(`Broker not registered: ${name}`);
    return rec;
  }

  private emit(event: string, name: BrokerName, extra: Record<string, unknown> = {}): void {
    eventBus.publish("broker", { event, broker: name, ts: Date.now(), ...extra });
  }

  private setState(rec: BrokerRecord, to: ConnectionState): void {
    rec.machine.transition(to);
  }

  /** Full connect + authenticate lifecycle for one broker. */
  async connect(name: BrokerName, cred: BrokerCredentialRef): Promise<ConnectionState> {
    const rec = this.record(name);
    if (!rec.broker.isConfigured()) {
      this.setState(rec, "DISABLED");
      this.emit(BROKER_EVENTS.disabled, name, { message: "not configured" });
      return rec.machine.current();
    }
    try {
      this.setState(rec, "CONNECTING");
      await rec.broker.connect(cred);
      this.setState(rec, "CONNECTED");
      this.emit(BROKER_EVENTS.connected, name);

      this.setState(rec, "AUTHENTICATING");
      await rec.broker.authenticate(cred);
      this.setState(rec, "READY");
      this.emit(BROKER_EVENTS.authSuccess, name);
      return rec.machine.current();
    } catch (err) {
      this.setState(rec, "ERROR");
      const message = err instanceof Error ? err.message : "connect failed";
      this.emit(BROKER_EVENTS.authFailed, name, { message });
      logger.error("broker.connect.failed", { broker: name, error: message });
      throw errors.dependencyUnavailable(`Broker ${name} connect failed: ${message}`);
    }
  }

  async disconnect(name: BrokerName): Promise<void> {
    const rec = this.record(name);
    await rec.broker.disconnect();
    this.setState(rec, "DISCONNECTED");
    this.emit(BROKER_EVENTS.disconnected, name);
  }

  /** Transition READY brokers through a reconnect cycle (foundation only). */
  async reconnect(name: BrokerName, cred: BrokerCredentialRef): Promise<ConnectionState> {
    const rec = this.record(name);
    if (rec.machine.canTransition("RECONNECTING")) {
      this.setState(rec, "RECONNECTING");
      this.emit(BROKER_EVENTS.reconnecting, name);
    }
    return this.connect(name, cred);
  }

  disable(name: BrokerName): void {
    const rec = this.record(name);
    this.setState(rec, "DISABLED");
    this.emit(BROKER_EVENTS.disabled, name);
  }

  /** Probe health for all configured brokers (used by the scheduler job). */
  async monitorAll(): Promise<void> {
    for (const rec of this.records.values()) {
      if (rec.broker.isConfigured()) await this.monitor.probe(rec.broker);
    }
  }

  state(name: BrokerName): ConnectionState {
    return this.record(name).machine.current();
  }

  capabilities(name: BrokerName) {
    return this.record(name).broker.discoverCapabilities();
  }

  status(): BrokerStatus[] {
    return [...this.records.values()]
      .sort((a, b) => a.broker.priority - b.broker.priority)
      .map((rec) => ({
        broker: rec.broker.name,
        priority: rec.broker.priority,
        configured: rec.broker.isConfigured(),
        state: rec.machine.current(),
        health: this.monitor.current(rec.broker.name),
        capabilities: rec.broker.discoverCapabilities(),
      }));
  }
}

export const brokerManager = singleton("broker.manager", () => new BrokerManager());
