// AITradeMinds — Order Management System. Full lifecycle coordinator:
// CREATED -> VALIDATED -> RISK_APPROVED/REJECTED -> SUBMITTED -> ACCEPTED ->
// PARTIAL/FILLED -> (position) -> Brain.evolve. Every transition is audited.
// Nothing bypasses RMS; nothing bypasses the Brain on completion.
import { errors, logger, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { providerManager } from "@/modules/market_data/providers/provider-manager";
import { aiBrain } from "@/modules/brain";
import type { ModelKey } from "@/modules/training";
import { tradingRepository } from "./repository";
import { riskEngine, type RiskLimits } from "./rms";
import { paperEngine } from "./paper-engine";
import { portfolioEngine } from "./portfolio";
import { portfolioLedger } from "@/modules/portfolio/ledger";
import { snapshotEngine } from "@/modules/portfolio/snapshot-engine";
import { qualityTracker } from "@/modules/execution/quality-tracker";
import { executionJournalService } from "@/modules/execution/journal";
import type { TradeOrder } from "@/db/schema";

export interface PlaceOrderInput {
  userId: number;
  symbol: string;
  exchange?: "NSE" | "BSE";
  side: "BUY" | "SELL";
  orderType?: "MARKET" | "LIMIT" | "SL" | "SL_M";
  product?: "INTRADAY" | "DELIVERY" | "FUT" | "OPT";
  quantity: number;
  limitPrice?: number;
  triggerPrice?: number;
  strategy?: string;
  modelKey?: ModelKey;
  confidence?: number;
  regime?: string;
  limits?: Partial<RiskLimits>;
}

export interface PlaceOrderResult {
  order: TradeOrder;
  status: string;
  fill?: { price: number; quantity: number; slippage: number; latencyMs: number };
  risk: { decision: string; rulesFailed: string[]; detail: string };
}

class OrderManagementSystem {
  private async transition(
    orderId: number,
    from: string | null,
    to: string,
    startedAt: number,
    reason?: string,
  ): Promise<void> {
    await tradingRepository.recordOrderEvent({
      orderId,
      fromStatus: from,
      toStatus: to,
      latencyMs: Date.now() - startedAt,
      reason,
    });
    await tradingRepository.updateOrder(orderId, { status: to });
    eventBus.publish("trading", {
      event: `order.${to.toLowerCase()}`,
      orderId,
      ts: Date.now(),
    });
  }

  async place(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const started = Date.now();
    if (input.quantity <= 0) throw errors.badRequest("quantity must be positive");

    const account = await tradingRepository.ensureAccount(input.userId, "PAPER");
    const exchange = input.exchange ?? "NSE";
    const orderType = input.orderType ?? "MARKET";
    const product = input.product ?? "INTRADAY";

    // 1) CREATED
    const order = await tradingRepository.createOrder({
      accountId: account.id,
      symbol: input.symbol,
      exchange,
      side: input.side,
      orderType,
      product,
      quantity: input.quantity,
      limitPrice: input.limitPrice,
      triggerPrice: input.triggerPrice,
      strategy: input.strategy,
      confidence: input.confidence,
      status: "CREATED",
    });
    await this.transition(order.id, null, "CREATED", started);

    // 2) VALIDATED (fetch live quote — real market data)
    const quote = await providerManager.getQuote(input.symbol, exchange);
    await this.transition(order.id, "CREATED", "VALIDATED", started);

    // 3) RISK (deterministic gate — un-bypassable)
    const risk = await riskEngine.evaluate({
      accountId: account.id,
      symbol: input.symbol,
      side: input.side,
      quantity: input.quantity,
      quote,
      limits: input.limits,
    });
    if (risk.decision === "REJECTED") {
      await tradingRepository.updateOrder(order.id, { rejectReason: risk.detail });
      await this.transition(order.id, "VALIDATED", "REJECTED", started, risk.detail);
      const finalOrder = await tradingRepository.getOrder(order.id);
      return {
        order: finalOrder!,
        status: "REJECTED",
        risk: { decision: risk.decision, rulesFailed: risk.rulesFailed, detail: risk.detail },
      };
    }
    await this.transition(order.id, "VALIDATED", "RISK_APPROVED", started);

    // 4) SUBMITTED -> ACCEPTED (paper broker)
    await this.transition(order.id, "RISK_APPROVED", "SUBMITTED", started);
    await this.transition(order.id, "SUBMITTED", "ACCEPTED", started);

    // 5) Deterministic execution simulation
    const sim = paperEngine.simulate({
      symbol: input.symbol,
      side: input.side,
      quantity: input.quantity,
      orderType,
      limitPrice: input.limitPrice,
      triggerPrice: input.triggerPrice,
      quote,
    });

    if (sim.status === "REJECTED" || sim.filledQuantity === 0) {
      await tradingRepository.updateOrder(order.id, { rejectReason: "not marketable / not triggered" });
      await this.transition(order.id, "ACCEPTED", "EXPIRED", started, "not filled");
      const finalOrder = await tradingRepository.getOrder(order.id);
      return {
        order: finalOrder!,
        status: "EXPIRED",
        risk: { decision: risk.decision, rulesFailed: [], detail: risk.detail },
      };
    }

    // 6) Record fill + update order
    const fill = await tradingRepository.recordFill({
      orderId: order.id,
      accountId: account.id,
      symbol: input.symbol,
      side: input.side,
      quantity: sim.filledQuantity,
      price: sim.price,
      expectedPrice: sim.expectedPrice,
      slippage: sim.slippage,
      spread: sim.spread,
      latencyMs: sim.latencyMs,
    });
    const filledStatus = sim.status === "PARTIAL" ? "PARTIAL" : "FILLED";
    await tradingRepository.updateOrder(order.id, {
      filledQuantity: sim.filledQuantity,
      avgFillPrice: sim.price,
    });
    await this.transition(order.id, "ACCEPTED", filledStatus, started);

    // 7) Update portfolio (positions + realized PnL + cash) + double-entry ledger
    const { realizedDelta } = await portfolioEngine.applyFill(fill, product);
    await portfolioLedger.recordFill(fill);
    // Immutable snapshot of resulting portfolio state (append-only timeline).
    await snapshotEngine.capture(account.id);

    // 7b) Execution Intelligence (Phase 8B): per-trade quality + append-only journal.
    const orderRow = (await tradingRepository.getOrder(order.id))!;
    await qualityTracker.track(orderRow, fill);
    await executionJournalService.record([
      { accountId: account.id, orderId: order.id, symbol: input.symbol, stage: "FILLED", event: filledStatus, detail: { price: sim.price, qty: sim.filledQuantity } },
      { accountId: account.id, orderId: order.id, symbol: input.symbol, stage: "POSITION", event: realizedDelta !== 0 ? "CLOSED" : "OPENED", detail: { realizedDelta } },
    ]);

    eventBus.publish("trading", {
      event: "execution.completed",
      accountId: account.id,
      orderId: order.id,
      symbol: input.symbol,
      message: `${filledStatus} ${sim.filledQuantity}@${sim.price}`,
      ts: Date.now(),
    });

    // 8) LEARNING LOOP — feed the Brain (nothing bypasses it). Only when a
    // position closed (realized outcome exists) do we evolve on actual reward.
    if (realizedDelta !== 0 && input.modelKey) {
      const notional = sim.filledQuantity * sim.expectedPrice || 1;
      const actualReward = +(realizedDelta / notional).toFixed(6);
      await aiBrain.evolve({
        modelKey: input.modelKey,
        symbol: input.symbol,
        strategy: input.strategy,
        regime: input.regime,
        expectedReward: input.confidence ? (input.confidence - 0.5) * 0.04 : 0,
        actualReward,
        confidence: input.confidence ?? 0.5,
        drawdown: Math.max(0, -actualReward),
        slippage: Math.abs(sim.slippage),
        source: "PAPER",
      });
      await executionJournalService.record([
        { accountId: account.id, orderId: order.id, symbol: input.symbol, stage: "LEARNING", event: "FED_BRAIN", detail: { actualReward } },
      ]);
      eventBus.publish("trading", {
        event: "learning.triggered",
        accountId: account.id,
        symbol: input.symbol,
        ts: Date.now(),
      });
      eventBus.publish("trading", {
        event: "learning.execution.completed",
        accountId: account.id,
        orderId: order.id,
        symbol: input.symbol,
        ts: Date.now(),
      });
    }

    logger.info("oms.order.filled", { orderId: order.id, status: filledStatus, price: sim.price });
    const finalOrder = await tradingRepository.getOrder(order.id);
    return {
      order: finalOrder!,
      status: filledStatus,
      fill: {
        price: sim.price,
        quantity: sim.filledQuantity,
        slippage: sim.slippage,
        latencyMs: sim.latencyMs,
      },
      risk: { decision: risk.decision, rulesFailed: [], detail: risk.detail },
    };
  }

  async cancel(userId: number, orderId: number): Promise<{ status: string }> {
    const account = await tradingRepository.ensureAccount(userId, "PAPER");
    const order = await tradingRepository.getOrder(orderId);
    if (!order || order.accountId !== account.id) throw errors.notFound("Order not found");
    if (["FILLED", "CANCELLED", "EXPIRED", "REJECTED"].includes(order.status)) {
      throw errors.conflict(`Cannot cancel order in status ${order.status}`);
    }
    await this.transition(orderId, order.status, "CANCELLED", Date.now(), "user cancel");
    return { status: "CANCELLED" };
  }
}

export const oms = singleton("trading.oms", () => new OrderManagementSystem());
