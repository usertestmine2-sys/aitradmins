// AITradeMinds — Portfolio Intelligence Repository. Append-only, single db.
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  pfiAllocations,
  pfiRebalances,
  pfiRiskBudgets,
  type PfiAllocation,
  type PfiRebalance,
  type PfiRiskBudget,
} from "@/db/schema";
import { singleton } from "@/kernel";

class PortfolioIntelRepository {
  async saveAllocation(row: typeof pfiAllocations.$inferInsert): Promise<PfiAllocation> {
    const [saved] = await db.insert(pfiAllocations).values(row).returning();
    return saved;
  }
  async allocations(accountId: number, limit = 50): Promise<PfiAllocation[]> {
    return db
      .select()
      .from(pfiAllocations)
      .where(eq(pfiAllocations.accountId, accountId))
      .orderBy(desc(pfiAllocations.createdAt))
      .limit(limit);
  }

  async saveRebalance(row: typeof pfiRebalances.$inferInsert): Promise<PfiRebalance> {
    const [saved] = await db.insert(pfiRebalances).values(row).returning();
    return saved;
  }
  async rebalances(accountId: number, limit = 50): Promise<PfiRebalance[]> {
    return db
      .select()
      .from(pfiRebalances)
      .where(eq(pfiRebalances.accountId, accountId))
      .orderBy(desc(pfiRebalances.createdAt))
      .limit(limit);
  }

  async saveRiskBudget(row: typeof pfiRiskBudgets.$inferInsert): Promise<PfiRiskBudget> {
    const [saved] = await db.insert(pfiRiskBudgets).values(row).returning();
    return saved;
  }
  async riskBudgets(accountId: number, limit = 50): Promise<PfiRiskBudget[]> {
    return db
      .select()
      .from(pfiRiskBudgets)
      .where(eq(pfiRiskBudgets.accountId, accountId))
      .orderBy(desc(pfiRiskBudgets.createdAt))
      .limit(limit);
  }
}

export const portfolioIntelRepository = singleton(
  "portfolio_intel.repository",
  () => new PortfolioIntelRepository(),
);
