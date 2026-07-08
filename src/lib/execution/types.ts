/**
 * Execution domain types. Client-safe: no Node.js imports.
 */

export const ORDER_SIDES = ["BUY", "SELL", "SHORT", "COVER"] as const;
export type OrderSide = (typeof ORDER_SIDES)[number];

export function isOrderSide(value: unknown): value is OrderSide {
  return typeof value === "string" && (ORDER_SIDES as readonly string[]).includes(value);
}

export const ORDER_STATUSES = [
  "CREATED",
  "VALIDATED",
  "QUEUED",
  "EXECUTED",
  "CANCELLED",
  "REJECTED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PositionDirection = "LONG" | "SHORT";

/** An approved decision consumed by the Execution Engine via decision.approved. */
export interface ApprovedDecision {
  decisionId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  source: "ai" | "strategy";
}

export interface OrderDTO {
  id: string;
  decisionId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  requestPrice: number;
  fillPrice: number | null;
  status: OrderStatus;
  reason: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface PositionDTO {
  id: number;
  symbol: string;
  direction: PositionDirection;
  quantity: number;
  avgEntryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  status: "open" | "closed";
  openedAt: string;
  holdingTimeSec: number;
}

export interface PortfolioDTO {
  id: string;
  cash: number;
  usedMargin: number;
  availableMargin: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  longMarketValue: number;
  openPositions: number;
  updatedAt: string;
}

export interface ExecutionStateDTO {
  portfolio: PortfolioDTO;
  positions: PositionDTO[];
  recentOrders: OrderDTO[];
}
