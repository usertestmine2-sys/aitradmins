// AITradeMinds — Broker Foundation types & the ONE common broker interface.
// Every broker (Zerodha, Angel One, Dhan, Upstox, Fyers, ICICI Direct) implements
// IBroker. No broker-specific logic exists anywhere else in the platform.
import type {
  BrokerCapability,
  BrokerHealthState,
  BrokerName,
  ConnectionState,
} from "./constants";

// Secure credential abstraction. AITradeMinds NEVER stores raw secrets in this
// object at rest — adapters receive a reference resolved from the credential
// vault at connect time. This foundation defines the shape only.
export interface BrokerCredentialRef {
  broker: BrokerName;
  // Opaque handle into the credential vault (Phase 8 provides the vault store).
  ref: string;
  // Non-secret metadata safe to log.
  clientId?: string;
}

export interface BrokerHealth {
  state: BrokerHealthState;
  latencyMs: number;
  lastCheck: number;
  message?: string;
}

export interface BrokerCapabilities {
  broker: BrokerName;
  capabilities: BrokerCapability[];
  supports(cap: BrokerCapability): boolean;
}

// THE single broker interface. Order execution methods are intentionally NOT
// part of this phase — this is connectivity + discovery only. Execution methods
// will EXTEND this interface in the next phase (backward compatible).
export interface IBroker {
  readonly name: BrokerName;
  readonly priority: number;

  /** Whether credentials are configured/available for this broker. */
  isConfigured(): boolean;

  /** Discover the capabilities this broker adapter supports. */
  discoverCapabilities(): BrokerCapability[];

  /** Establish transport connection (no auth yet). */
  connect(cred: BrokerCredentialRef): Promise<void>;

  /** Authenticate an already-connected session. */
  authenticate(cred: BrokerCredentialRef): Promise<void>;

  /** Gracefully disconnect. */
  disconnect(): Promise<void>;

  /** Lightweight health probe; returns latency in ms. */
  ping(): Promise<number>;
}

export interface BrokerStatus {
  broker: BrokerName;
  priority: number;
  configured: boolean;
  state: ConnectionState;
  health: BrokerHealth;
  capabilities: BrokerCapability[];
}
