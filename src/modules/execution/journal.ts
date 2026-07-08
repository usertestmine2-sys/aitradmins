// AITradeMinds — Execution Journal. Append-only record of every execution-stage
// event. NO update, NO delete. Batch-writes for performance. Reuses execution repo.
import { singleton } from "@/kernel";
import { getContext } from "@/kernel/context";
import { executionRepository } from "./repository";

export type ExecutionStage =
  | "SIGNAL"
  | "CONSENSUS"
  | "RMS"
  | "OMS"
  | "PENDING"
  | "FILLED"
  | "POSITION"
  | "EXIT"
  | "LEARNING";

export interface JournalEntry {
  accountId: number;
  orderId?: number;
  symbol?: string;
  stage: ExecutionStage;
  event: string;
  detail?: Record<string, unknown>;
}

class ExecutionJournalService {
  /** Append a batch of journal entries (immutable). */
  async record(entries: JournalEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const correlationId = getContext()?.correlationId;
    await executionRepository.journalBatch(
      entries.map((e) => ({
        accountId: e.accountId,
        orderId: e.orderId,
        symbol: e.symbol,
        stage: e.stage,
        event: e.event,
        detail: e.detail ?? {},
        correlationId,
      })),
    );
  }

  async forAccount(accountId: number, limit = 300) {
    return executionRepository.journal(accountId, limit);
  }

  async forOrder(orderId: number) {
    return executionRepository.journalForOrder(orderId);
  }
}

export const executionJournalService = singleton("execution.journal", () => new ExecutionJournalService());
