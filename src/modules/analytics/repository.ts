// AITradeMinds — Analytics Repository. Append-only report storage over @/db.
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { analyticsReports, type AnalyticsReport } from "@/db/schema";
import { singleton } from "@/kernel";

class AnalyticsRepository {
  async saveReport(row: typeof analyticsReports.$inferInsert): Promise<AnalyticsReport> {
    const [saved] = await db.insert(analyticsReports).values(row).returning();
    return saved;
  }

  async listReports(kind?: string, limit = 50): Promise<AnalyticsReport[]> {
    return db
      .select()
      .from(analyticsReports)
      .where(kind ? eq(analyticsReports.kind, kind) : undefined)
      .orderBy(desc(analyticsReports.createdAt))
      .limit(limit);
  }

  async getReport(id: number): Promise<AnalyticsReport | undefined> {
    const [row] = await db
      .select()
      .from(analyticsReports)
      .where(eq(analyticsReports.id, id))
      .limit(1);
    return row;
  }

  async latest(kind: string): Promise<AnalyticsReport | undefined> {
    const [row] = await db
      .select()
      .from(analyticsReports)
      .where(and(eq(analyticsReports.kind, kind)))
      .orderBy(desc(analyticsReports.createdAt))
      .limit(1);
    return row;
  }
}

export const analyticsRepository = singleton(
  "analytics.repository",
  () => new AnalyticsRepository(),
);
