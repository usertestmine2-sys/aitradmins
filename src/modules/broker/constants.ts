// AITradeMinds — Broker Foundation constants.
// AITradeMinds is NOT a broker. User funds ALWAYS remain inside the broker.
// This layer only abstracts connectivity + capability discovery. No fund custody.

export const BROKERS = [
  "ZERODHA",
  "ANGELONE",
  "DHAN",
  "UPSTOX",
  "FYERS",
  "ICICIDIRECT",
  "PAPER",
] as const;
export type BrokerName = (typeof BROKERS)[number];

// Connection lifecycle states (single canonical set).
export const CONNECTION_STATES = [
  "DISCONNECTED",
  "CONNECTING",
  "CONNECTED",
  "AUTHENTICATING",
  "READY",
  "DEGRADED",
  "ERROR",
  "RECONNECTING",
  "DISABLED",
] as const;
export type ConnectionState = (typeof CONNECTION_STATES)[number];

// Legal state transitions for the connection state machine.
export const STATE_TRANSITIONS: Record<ConnectionState, ConnectionState[]> = {
  DISCONNECTED: ["CONNECTING", "DISABLED"],
  CONNECTING: ["CONNECTED", "ERROR", "DISABLED"],
  CONNECTED: ["AUTHENTICATING", "ERROR", "DISCONNECTED", "DISABLED"],
  AUTHENTICATING: ["READY", "ERROR", "DISCONNECTED", "DISABLED"],
  READY: ["DEGRADED", "ERROR", "RECONNECTING", "DISCONNECTED", "DISABLED"],
  DEGRADED: ["READY", "ERROR", "RECONNECTING", "DISCONNECTED", "DISABLED"],
  ERROR: ["RECONNECTING", "DISCONNECTED", "DISABLED"],
  RECONNECTING: ["CONNECTING", "READY", "ERROR", "DISCONNECTED", "DISABLED"],
  DISABLED: ["DISCONNECTED"],
};

// Broker capability flags — discovered per adapter, consumed by future OMS.
export const BROKER_CAPABILITIES = [
  "EQUITY_CASH",
  "EQUITY_FNO",
  "CURRENCY",
  "COMMODITY",
  "MARKET_ORDER",
  "LIMIT_ORDER",
  "SL_ORDER",
  "SL_M_ORDER",
  "BRACKET_ORDER",
  "COVER_ORDER",
  "GTT",
  "MODIFY_ORDER",
  "CANCEL_ORDER",
  "ORDER_BOOK",
  "POSITIONS",
  "HOLDINGS",
  "FUNDS_READ",
  "WEBSOCKET_STREAM",
  "HISTORICAL_DATA",
] as const;
export type BrokerCapability = (typeof BROKER_CAPABILITIES)[number];

// Broker event topic names (domain.action). Published on the single Event Bus.
export const BROKER_EVENTS = {
  connected: "broker.connected",
  disconnected: "broker.disconnected",
  healthChanged: "broker.health.changed",
  authSuccess: "broker.authentication.success",
  authFailed: "broker.authentication.failed",
  tokenExpired: "broker.token.expired",
  reconnecting: "broker.reconnecting",
  disabled: "broker.disabled",
} as const;

export const HEALTH_STATES = ["UP", "DEGRADED", "DOWN"] as const;
export type BrokerHealthState = (typeof HEALTH_STATES)[number];
