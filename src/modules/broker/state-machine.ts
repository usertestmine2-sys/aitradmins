// AITradeMinds — Broker Connection State Machine.
// Enforces legal transitions; rejects illegal ones. Pure + deterministic.
import { errors, logger } from "@/kernel";
import {
  STATE_TRANSITIONS,
  type BrokerName,
  type ConnectionState,
} from "./constants";

export class ConnectionStateMachine {
  private state: ConnectionState = "DISCONNECTED";

  constructor(private readonly broker: BrokerName) {}

  current(): ConnectionState {
    return this.state;
  }

  canTransition(to: ConnectionState): boolean {
    return STATE_TRANSITIONS[this.state].includes(to);
  }

  /** Transition to a new state or throw if illegal. Returns previous state. */
  transition(to: ConnectionState): ConnectionState {
    if (this.state === to) return this.state;
    if (!this.canTransition(to)) {
      throw errors.conflict(
        `Illegal broker state transition ${this.broker}: ${this.state} -> ${to}`,
      );
    }
    const previous = this.state;
    this.state = to;
    logger.debug("broker.state.transition", {
      broker: this.broker,
      from: previous,
      to,
    });
    return previous;
  }

  is(state: ConnectionState): boolean {
    return this.state === state;
  }

  isOperational(): boolean {
    return this.state === "READY" || this.state === "DEGRADED";
  }
}
