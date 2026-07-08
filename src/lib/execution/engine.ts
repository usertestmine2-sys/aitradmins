import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { execOrders, execPortfolios, execPositions, marketBars } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";
import { getEventBus } from "@/lib/events/bus";
import { evaluateGates, readControlPlaneGates } from "@/lib/control-plane/reader";
import { registerComponent } from "@/lib/ops/registry";
import type {
  ApprovedDecision,
  ExecutionStateDTO,
  OrderDTO,
  OrderSide,
  OrderStatus,
  PortfolioDTO,
  PositionDTO,
  PositionDirection,
} from "@/lib/execution/types";

/**
 * Paper Trading Execution Engine — the ONLY execution path in the platform.
 *
 * Consumes `decision.approved` from the Event Backbone; emits the full
 * execution event flow through the Event Audit Store:
 *   execution.requested → order.created → order.validated → order.executed
 *   → position.updated → portfolio.updated → execution.completed
 *
 * Simulation only: no broker, no live capital. Fills are instant with a
 * fixed 5 bps adverse slippage model. All processing is serialized through
 * an in-process queue, and idempotent per decisionId.
 */

const ENGINE_ID = "execution-engine";
const PORTFOLIO_ID = "primary";
const INITIAL_CASH = 1_000_000; // ₹10,00,000 virtual capital
const BASE_SLIPPAGE_BPS = 5;
const HEARTBEAT_INTERVAL_MS = 30_000;
/** Liquidity realism: partial fill above this ADV participation; reject above hard cap. */
const PARTIAL_FILL_ADV_PCT = 0.1;
const REJECT_ADV_PCT = 0.25;

interface EngineState {
  started: boolean;
  chain: Promise<void>;
  queueDepth: number;
  requestsReceived: number;
  ordersExecuted: number;
  ordersRejected: number;
  ordersCancelled: number;
  totalExecMs: number;
  heartbeatTimer: NodeJS.Timeout | null;
}

const globalForEngine = globalThis as typeof globalThis & {
  __aitmExecutionEngine?: EngineState;
};

function getState(): EngineState {
  return (globalForEngine.__aitmExecutionEngine ??= {
    started: false,
    chain: Promise.resolve(),
    queueDepth: 0,
    requestsReceived: 0,
    ordersExecuted: 0,
    ordersRejected: 0,
    ordersCancelled: 0,
    totalExecMs: 0,
    heartbeatTimer: null,
  });
}

/** Idempotent engine start: bus subscription, self-registration, heartbeat loop. */
export function ensureExecutionEngineStarted(): void {
  const state = getState();
  if (state.started) return;
  state.started = true;

  // Consume ONLY decision.approved from the Event Backbone.
  getEventBus().subscribe((event) => {
    if (event.type !== "decision.approved") return;
    const decision = parseDecision(event.payload ?? {});
    if (!decision) return; // malformed payloads are ignored; the publisher validates
    state.queueDepth += 1;
    state.chain = state.chain
      .then(() => processDecision(decision))
      .catch((err: unknown) => {
        console.error("[execution] decision processing failed:", err);
      })
      .finally(() => {
        state.queueDepth = Math.max(0, state.queueDepth - 1);
      });
  });

  // Bootstrap + first heartbeat (best-effort; sweep marks OFFLINE if DB is down).
  void bootstrap().catch((err: unknown) => {
    console.error("[execution] bootstrap failed:", err);
  });

  state.heartbeatTimer = setInterval(() => {
    void emitHeartbeat().catch(() => {
      // heartbeat failures surface as staleness in Operations
    });
  }, HEARTBEAT_INTERVAL_MS);
  state.heartbeatTimer.unref();
}

async function bootstrap(): Promise<void> {
  // Self-registration in the Dynamic Component Registry: health, alerts and
  // the dependency cascade in Operations work automatically from here.
  await registerComponent({
    id: ENGINE_ID,
    name: "Execution Engine",
    description:
      "Paper trading execution engine. Consumes decision.approved; simulation only — no broker, no live capital.",
    kind: "engine",
    mode: "heartbeat",
    heartbeatTimeoutSec: 120,
    dependencies: [
      { componentId: "database", criticality: "critical" },
      { componentId: "control-plane", criticality: "critical" },
      { componentId: "event-backbone", criticality: "required" },
    ],
    alertRules: [
      {
        metric: "queue_depth",
        op: "gt",
        threshold: 50,
        severity: "warning",
        title: "Execution queue backlog",
      },
    ],
    source: "platform",
  });
  await ensurePortfolio();
  await emitHeartbeat();
}

async function emitHeartbeat(): Promise<void> {
  const state = getState();
  const avgExecMs =
    state.ordersExecuted > 0 ? state.totalExecMs / state.ordersExecuted : 0;
  await appendEvent("system.heartbeat.received", ENGINE_ID, {
    status: "HEALTHY",
    message: `Paper execution active — ${state.ordersExecuted} executed, ${state.ordersRejected} rejected.`,
    metrics: {
      queue_depth: state.queueDepth,
      requests_received: state.requestsReceived,
      orders_executed: state.ordersExecuted,
      orders_rejected: state.ordersRejected,
      orders_cancelled: state.ordersCancelled,
      avg_exec_ms: Math.round(avgExecMs * 100) / 100,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Decision processing (serialized)                                    */
/* ------------------------------------------------------------------ */

function parseDecision(payload: Record<string, unknown>): ApprovedDecision | null {
  const decisionId = typeof payload.decisionId === "string" ? payload.decisionId : "";
  const symbol = typeof payload.symbol === "string" ? payload.symbol : "";
  const side = payload.side;
  const quantity = payload.quantity;
  const price = payload.price;
  const source = payload.source === "strategy" ? "strategy" : "ai";
  if (
    !decisionId ||
    !symbol ||
    (side !== "BUY" && side !== "SELL" && side !== "SHORT" && side !== "COVER") ||
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return null;
  }
  return { decisionId, symbol, side, quantity, price, source };
}

async function processDecision(decision: ApprovedDecision): Promise<void> {
  const state = getState();
  const startedAt = performance.now();
  state.requestsReceived += 1;

  await appendEvent("execution.requested", ENGINE_ID, {
    decisionId: decision.decisionId,
    symbol: decision.symbol,
    side: decision.side,
    quantity: decision.quantity,
    price: decision.price,
    source: decision.source,
  });

  // Idempotency: one order per decision, forever.
  const duplicate = await db
    .select({ id: execOrders.id, status: execOrders.status })
    .from(execOrders)
    .where(eq(execOrders.decisionId, decision.decisionId))
    .limit(1);
  if (duplicate.length > 0) {
    await appendEvent("execution.completed", ENGINE_ID, {
      decisionId: decision.decisionId,
      status: "duplicate",
      orderId: duplicate[0].id,
      message: `Decision already processed (order ${duplicate[0].id}, status ${duplicate[0].status}).`,
    });
    return;
  }

  // ORDER: CREATED
  const orderId = randomUUID();
  const now = new Date();
  await db.insert(execOrders).values({
    id: orderId,
    decisionId: decision.decisionId,
    symbol: decision.symbol,
    side: decision.side,
    quantity: decision.quantity,
    requestPrice: decision.price,
    status: "CREATED",
    source: decision.source,
    createdAt: now,
    updatedAt: now,
  });
  await appendEvent("order.created", ENGINE_ID, {
    orderId,
    decisionId: decision.decisionId,
    symbol: decision.symbol,
    side: decision.side,
    quantity: decision.quantity,
  });

  // VALIDATION: Control Plane gates + funds/position availability.
  const gates = await readControlPlaneGates();
  const gateBlock = evaluateGates(gates, decision.source);
  const fundBlock = gateBlock ? null : await validateFunds(decision);
  const blockReason = gateBlock ?? fundBlock;

  if (blockReason) {
    state.ordersRejected += 1;
    await setOrderStatus(orderId, "REJECTED", blockReason);
    await appendEvent("order.rejected", ENGINE_ID, {
      orderId,
      decisionId: decision.decisionId,
      symbol: decision.symbol,
      side: decision.side,
      reason: blockReason,
    });
    await appendEvent("execution.completed", ENGINE_ID, {
      decisionId: decision.decisionId,
      orderId,
      status: "rejected",
      reason: blockReason,
    });
    return;
  }

  await setOrderStatus(orderId, "VALIDATED");
  await appendEvent("order.validated", ENGINE_ID, { orderId, decisionId: decision.decisionId });

  // QUEUED (recorded state; fills are instant in paper simulation)
  await setOrderStatus(orderId, "QUEUED");

  // Execution-time governance re-check: state may have changed since validation.
  const gatesAtExec = await readControlPlaneGates();
  const execBlock = evaluateGates(gatesAtExec, decision.source);
  if (execBlock) {
    state.ordersCancelled += 1;
    await setOrderStatus(orderId, "CANCELLED", execBlock);
    await appendEvent("order.cancelled", ENGINE_ID, {
      orderId,
      decisionId: decision.decisionId,
      reason: execBlock,
    });
    await appendEvent("execution.completed", ENGINE_ID, {
      decisionId: decision.decisionId,
      orderId,
      status: "cancelled",
      reason: execBlock,
    });
    return;
  }

  // EXECUTED: high-fidelity fill simulation (Evolution Phase-1 realism).
  const fill = await simulateFill(decision);

  if (fill.fillQuantity <= 0) {
    state.ordersRejected += 1;
    await setOrderStatus(orderId, "REJECTED", fill.note);
    await appendEvent("order.rejected", ENGINE_ID, {
      orderId,
      decisionId: decision.decisionId,
      symbol: decision.symbol,
      reason: fill.note,
    });
    await appendEvent("execution.completed", ENGINE_ID, {
      decisionId: decision.decisionId,
      orderId,
      status: "rejected",
      reason: fill.note,
    });
    return;
  }

  // Simulated exchange/order latency (deterministic per decision).
  await sleepMs(fill.latencyMs);

  const fillPrice = fill.fillPrice;
  const partial = fill.fillQuantity < decision.quantity;
  await db
    .update(execOrders)
    .set({
      status: "EXECUTED",
      fillPrice,
      quantity: fill.fillQuantity,
      reason: partial ? fill.note : "",
      updatedAt: new Date(),
    })
    .where(eq(execOrders.id, orderId));
  await appendEvent("order.executed", ENGINE_ID, {
    orderId,
    decisionId: decision.decisionId,
    symbol: decision.symbol,
    side: decision.side,
    quantity: fill.fillQuantity,
    requestedQuantity: decision.quantity,
    partialFill: partial,
    fillPrice,
    slippageBps: fill.slippageBps,
    gapBps: fill.gapBps,
    latencyMs: fill.latencyMs,
  });

  // POSITION + PORTFOLIO updates.
  const positionSummary = await applyFill(decision.symbol, decision.side, fill.fillQuantity, fillPrice);
  await appendEvent("position.updated", ENGINE_ID, {
    symbol: decision.symbol,
    direction: positionSummary.direction,
    quantity: positionSummary.quantity,
    avgEntryPrice: positionSummary.avgEntryPrice,
    realizedPnlDelta: positionSummary.realizedPnlDelta,
    closed: positionSummary.closed,
  });

  const portfolio = await getPortfolioSnapshot();
  await appendEvent("portfolio.updated", ENGINE_ID, {
    cash: portfolio.cash,
    usedMargin: portfolio.usedMargin,
    availableMargin: portfolio.availableMargin,
    equity: portfolio.equity,
    realizedPnl: portfolio.realizedPnl,
    unrealizedPnl: portfolio.unrealizedPnl,
  });

  state.ordersExecuted += 1;
  state.totalExecMs += performance.now() - startedAt;

  await appendEvent("execution.completed", ENGINE_ID, {
    decisionId: decision.decisionId,
    orderId,
    status: "executed",
    symbol: decision.symbol,
    side: decision.side,
    quantity: fill.fillQuantity,
    fillPrice,
    durationMs: Math.round(performance.now() - startedAt),
  });
}

/** Conservative estimate used for margin validation (base slippage only). */
function applySlippage(side: OrderSide, price: number): number {
  const factor = BASE_SLIPPAGE_BPS / 10_000;
  const adjusted = side === "BUY" || side === "COVER" ? price * (1 + factor) : price * (1 - factor);
  return Math.round(adjusted * 10_000) / 10_000;
}

/* ------------------------------------------------------------------ */
/* High-fidelity fill simulation (Evolution Phase-1)                   */
/* ------------------------------------------------------------------ */

interface FillSimulation {
  fillQuantity: number;
  fillPrice: number;
  slippageBps: number;
  gapBps: number;
  latencyMs: number;
  note: string;
}

/** Deterministic 0..1 pseudo-random derived from the decision id + salt. */
function detRandom(seed: string, salt: string): number {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest();
  return hash.readUInt32BE(0) / 0xffffffff;
}

/**
 * Fill model:
 *  - slippage = base 5bps + volatility component + ADV-participation impact
 *  - overnight gap simulation scaled by daily volatility (deterministic)
 *  - order latency 40–400ms (deterministic per decision)
 *  - partial fill above 10% ADV participation; rejection above 25%
 * Falls back to the base model when no bar history exists for the symbol.
 */
async function simulateFill(decision: ApprovedDecision): Promise<FillSimulation> {
  const bars = await db
    .select()
    .from(marketBars)
    .where(eq(marketBars.symbol, decision.symbol))
    .orderBy(desc(marketBars.barDate))
    .limit(21);

  const adverse = decision.side === "BUY" || decision.side === "COVER" ? 1 : -1;
  const latencyMs = Math.round(40 + detRandom(decision.decisionId, "latency") * 360);

  if (bars.length < 5) {
    // No market history: base model, full fill.
    const price = decision.price * (1 + (adverse * BASE_SLIPPAGE_BPS) / 10_000);
    return {
      fillQuantity: decision.quantity,
      fillPrice: Math.round(price * 10_000) / 10_000,
      slippageBps: BASE_SLIPPAGE_BPS,
      gapBps: 0,
      latencyMs,
      note: "base fill model (no bar history)",
    };
  }

  const ordered = bars.reverse();
  const closes = ordered.map((b) => b.close);
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  const meanR = returns.reduce((a, b) => a + b, 0) / returns.length;
  const dailyVolPct =
    Math.sqrt(returns.reduce((a, r) => a + (r - meanR) ** 2, 0) / returns.length) * 100;
  const advShares = ordered.reduce((a, b) => a + b.volume, 0) / ordered.length;
  const participation = advShares > 0 ? decision.quantity / advShares : 0;

  // Liquidity realism.
  if (participation > REJECT_ADV_PCT) {
    return {
      fillQuantity: 0,
      fillPrice: 0,
      slippageBps: 0,
      gapBps: 0,
      latencyMs,
      note: `liquidity rejection: order is ${(participation * 100).toFixed(1)}% of ADV (cap ${REJECT_ADV_PCT * 100}%)`,
    };
  }
  let fillQuantity = decision.quantity;
  let note = "";
  if (participation > PARTIAL_FILL_ADV_PCT) {
    fillQuantity = Math.max(1, Math.floor(advShares * PARTIAL_FILL_ADV_PCT));
    note = `partial fill ${fillQuantity}/${decision.quantity} (liquidity: ${(participation * 100).toFixed(1)}% of ADV)`;
  }

  // Volatility- and impact-scaled slippage + bid/ask spread (always adverse).
  // Spread model: liquid names ~3bps half-spread, widening as ADV value falls.
  const advValue = advShares * decision.price;
  const spreadBps = advValue >= 1e9 ? 3 : advValue >= 1e8 ? 6 : advValue >= 1e7 ? 12 : 25;
  const volBps = dailyVolPct * 4; // 1%/day vol ≈ +4bps
  const impactBps = Math.min(60, participation * 400); // market impact
  const slippageBps = Math.round((BASE_SLIPPAGE_BPS + spreadBps + volBps + impactBps) * 10) / 10;

  // Overnight gap simulation: symmetric, volatility-scaled, deterministic.
  const gapDraw = detRandom(decision.decisionId, "gap") * 2 - 1; // -1..1
  const gapBps = Math.round(gapDraw * dailyVolPct * 0.5 * 100 * 10) / 10; // up to ±0.5×daily vol

  const price =
    decision.price * (1 + gapBps / 10_000) * (1 + (adverse * slippageBps) / 10_000);

  return {
    fillQuantity,
    fillPrice: Math.round(price * 10_000) / 10_000,
    slippageBps,
    gapBps,
    latencyMs,
    note: note || `vol ${dailyVolPct.toFixed(2)}%/day, participation ${(participation * 100).toFixed(2)}% ADV`,
  };
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

async function validateFunds(decision: ApprovedDecision): Promise<string | null> {
  const portfolio = await ensurePortfolio();
  const available = portfolio.cash - portfolio.usedMargin;
  const estimatedCost = decision.quantity * applySlippage(decision.side, decision.price);

  switch (decision.side) {
    case "BUY":
      if (estimatedCost > available) {
        return `Insufficient available margin: need ₹${estimatedCost.toFixed(2)}, available ₹${available.toFixed(2)}.`;
      }
      return null;
    case "SHORT":
      if (estimatedCost > available) {
        return `Insufficient margin for short: need ₹${estimatedCost.toFixed(2)}, available ₹${available.toFixed(2)}.`;
      }
      return null;
    case "SELL": {
      const position = await getOpenPosition(decision.symbol, "LONG");
      if (!position || position.quantity < decision.quantity) {
        return `Insufficient long quantity in ${decision.symbol}: have ${position?.quantity ?? 0}, selling ${decision.quantity}.`;
      }
      return null;
    }
    case "COVER": {
      const position = await getOpenPosition(decision.symbol, "SHORT");
      if (!position || position.quantity < decision.quantity) {
        return `Insufficient short quantity in ${decision.symbol}: have ${position?.quantity ?? 0}, covering ${decision.quantity}.`;
      }
      return null;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Position + portfolio accounting                                     */
/* ------------------------------------------------------------------ */

interface FillSummary {
  direction: PositionDirection;
  quantity: number;
  avgEntryPrice: number;
  realizedPnlDelta: number;
  closed: boolean;
}

async function applyFill(
  symbol: string,
  side: OrderSide,
  quantity: number,
  fillPrice: number,
): Promise<FillSummary> {
  const portfolio = await ensurePortfolio();
  const direction: PositionDirection = side === "BUY" || side === "SELL" ? "LONG" : "SHORT";
  const position = await getOpenPosition(symbol, direction);
  const now = new Date();

  let realizedDelta = 0;
  let cashDelta = 0;
  let marginDelta = 0;
  let resultQty = 0;
  let resultAvg = fillPrice;
  let closed = false;

  if (side === "BUY") {
    cashDelta = -quantity * fillPrice;
    if (position) {
      resultQty = position.quantity + quantity;
      resultAvg = (position.quantity * position.avgEntryPrice + quantity * fillPrice) / resultQty;
      await db
        .update(execPositions)
        .set({ quantity: resultQty, avgEntryPrice: resultAvg, markPrice: fillPrice, updatedAt: now })
        .where(eq(execPositions.id, position.id));
    } else {
      resultQty = quantity;
      await db.insert(execPositions).values({
        symbol,
        direction: "LONG",
        quantity,
        avgEntryPrice: fillPrice,
        markPrice: fillPrice,
        openedAt: now,
        updatedAt: now,
      });
    }
  } else if (side === "SELL") {
    if (!position) throw new Error("SELL without open long position (validation bypass)");
    realizedDelta = (fillPrice - position.avgEntryPrice) * quantity;
    cashDelta = quantity * fillPrice;
    resultQty = position.quantity - quantity;
    resultAvg = position.avgEntryPrice;
    closed = resultQty <= 1e-9;
    await db
      .update(execPositions)
      .set({
        quantity: closed ? 0 : resultQty,
        markPrice: fillPrice,
        realizedPnl: position.realizedPnl + realizedDelta,
        status: closed ? "closed" : "open",
        closedAt: closed ? now : null,
        updatedAt: now,
      })
      .where(eq(execPositions.id, position.id));
  } else if (side === "SHORT") {
    marginDelta = quantity * fillPrice; // 100% notional reserved
    if (position) {
      resultQty = position.quantity + quantity;
      resultAvg = (position.quantity * position.avgEntryPrice + quantity * fillPrice) / resultQty;
      await db
        .update(execPositions)
        .set({ quantity: resultQty, avgEntryPrice: resultAvg, markPrice: fillPrice, updatedAt: now })
        .where(eq(execPositions.id, position.id));
    } else {
      resultQty = quantity;
      await db.insert(execPositions).values({
        symbol,
        direction: "SHORT",
        quantity,
        avgEntryPrice: fillPrice,
        markPrice: fillPrice,
        openedAt: now,
        updatedAt: now,
      });
    }
  } else {
    // COVER
    if (!position) throw new Error("COVER without open short position (validation bypass)");
    realizedDelta = (position.avgEntryPrice - fillPrice) * quantity;
    cashDelta = realizedDelta; // margin was reserved, only PnL settles to cash
    marginDelta = -quantity * position.avgEntryPrice; // release reserved margin
    resultQty = position.quantity - quantity;
    resultAvg = position.avgEntryPrice;
    closed = resultQty <= 1e-9;
    await db
      .update(execPositions)
      .set({
        quantity: closed ? 0 : resultQty,
        markPrice: fillPrice,
        realizedPnl: position.realizedPnl + realizedDelta,
        status: closed ? "closed" : "open",
        closedAt: closed ? now : null,
        updatedAt: now,
      })
      .where(eq(execPositions.id, position.id));
  }

  await db
    .update(execPortfolios)
    .set({
      cash: portfolio.cash + cashDelta,
      usedMargin: Math.max(0, portfolio.usedMargin + marginDelta),
      realizedPnl: portfolio.realizedPnl + realizedDelta,
      updatedAt: now,
    })
    .where(eq(execPortfolios.id, PORTFOLIO_ID));

  return {
    direction,
    quantity: closed ? 0 : resultQty,
    avgEntryPrice: resultAvg,
    realizedPnlDelta: realizedDelta,
    closed,
  };
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

async function ensurePortfolio(): Promise<typeof execPortfolios.$inferSelect> {
  const rows = await db.select().from(execPortfolios).where(eq(execPortfolios.id, PORTFOLIO_ID)).limit(1);
  if (rows.length > 0) return rows[0];
  await db
    .insert(execPortfolios)
    .values({ id: PORTFOLIO_ID, cash: INITIAL_CASH, usedMargin: 0, realizedPnl: 0 })
    .onConflictDoNothing();
  const created = await db.select().from(execPortfolios).where(eq(execPortfolios.id, PORTFOLIO_ID)).limit(1);
  return created[0];
}

async function getOpenPosition(
  symbol: string,
  direction: PositionDirection,
): Promise<typeof execPositions.$inferSelect | null> {
  const rows = await db
    .select()
    .from(execPositions)
    .where(
      and(
        eq(execPositions.symbol, symbol),
        eq(execPositions.direction, direction),
        eq(execPositions.status, "open"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

function positionUnrealized(p: typeof execPositions.$inferSelect): number {
  return p.direction === "LONG"
    ? (p.markPrice - p.avgEntryPrice) * p.quantity
    : (p.avgEntryPrice - p.markPrice) * p.quantity;
}

export async function getPortfolioSnapshot(): Promise<PortfolioDTO> {
  const portfolio = await ensurePortfolio();
  const openPositions = await db.select().from(execPositions).where(eq(execPositions.status, "open"));

  let unrealized = 0;
  let longValue = 0;
  let shortUnrealized = 0;
  for (const p of openPositions) {
    const u = positionUnrealized(p);
    unrealized += u;
    if (p.direction === "LONG") longValue += p.quantity * p.markPrice;
    else shortUnrealized += u;
  }

  return {
    id: portfolio.id,
    cash: round2(portfolio.cash),
    usedMargin: round2(portfolio.usedMargin),
    availableMargin: round2(portfolio.cash - portfolio.usedMargin),
    equity: round2(portfolio.cash + longValue + shortUnrealized),
    realizedPnl: round2(portfolio.realizedPnl),
    unrealizedPnl: round2(unrealized),
    longMarketValue: round2(longValue),
    openPositions: openPositions.length,
    updatedAt: portfolio.updatedAt.toISOString(),
  };
}

export async function getExecutionState(): Promise<ExecutionStateDTO> {
  const [portfolio, openPositions, orders] = await Promise.all([
    getPortfolioSnapshot(),
    db.select().from(execPositions).where(eq(execPositions.status, "open")),
    db.select().from(execOrders).orderBy(desc(execOrders.createdAt)).limit(50),
  ]);

  const now = Date.now();
  const positions: PositionDTO[] = openPositions.map((p) => ({
    id: p.id,
    symbol: p.symbol,
    direction: p.direction as PositionDirection,
    quantity: p.quantity,
    avgEntryPrice: round2(p.avgEntryPrice),
    markPrice: round2(p.markPrice),
    unrealizedPnl: round2(positionUnrealized(p)),
    realizedPnl: round2(p.realizedPnl),
    status: "open",
    openedAt: p.openedAt.toISOString(),
    holdingTimeSec: Math.max(0, Math.round((now - p.openedAt.getTime()) / 1000)),
  }));

  const recentOrders: OrderDTO[] = orders.map((o) => ({
    id: o.id,
    decisionId: o.decisionId,
    symbol: o.symbol,
    side: o.side as OrderSide,
    quantity: o.quantity,
    requestPrice: o.requestPrice,
    fillPrice: o.fillPrice,
    status: o.status as OrderStatus,
    reason: o.reason,
    source: o.source,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  return { portfolio, positions, recentOrders };
}

/** Mark-to-market update for open positions; recomputes unrealized PnL. */
export async function updateMarks(marks: Record<string, number>): Promise<number> {
  const openPositions = await db.select().from(execPositions).where(eq(execPositions.status, "open"));
  const now = new Date();
  let updated = 0;
  for (const p of openPositions) {
    const mark = marks[p.symbol];
    if (typeof mark !== "number" || !Number.isFinite(mark) || mark <= 0) continue;
    await db.update(execPositions).set({ markPrice: mark, updatedAt: now }).where(eq(execPositions.id, p.id));
    updated += 1;
  }
  if (updated > 0) {
    const portfolio = await getPortfolioSnapshot();
    await appendEvent("portfolio.updated", ENGINE_ID, {
      trigger: "mark-to-market",
      marksApplied: updated,
      equity: portfolio.equity,
      unrealizedPnl: portfolio.unrealizedPnl,
    });
  }
  return updated;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function setOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<void> {
  await db
    .update(execOrders)
    .set({ status, reason: reason ?? "", updatedAt: new Date() })
    .where(eq(execOrders.id, orderId));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
