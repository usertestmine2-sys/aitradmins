// AITradeMinds — Platform Repository. Append-only pipeline runs, supervisor
// alerts, health snapshots. Reuses the single db context.
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  platHealthSnapshots,
  platPipelineRuns,
  platSupervisorAlerts,
  type PlatHealthSnapshot,
  type PlatPipelineRun,
  type PlatSupervisorAlert,
} from "@/db/schema";
import { singleton } from "@/kernel";

class PlatformRepository {
  async saveRun(row: typeof platPipelineRuns.$inferInsert): Promise<PlatPipelineRun> {
    const [saved] = await db.insert(platPipelineRuns).values(row).returning();
    return saved;
  }
  async runs(limit = 50): Promise<PlatPipelineRun[]> {
    return db.select().from(platPipelineRuns).orderBy(desc(platPipelineRuns.createdAt)).limit(limit);
  }

  async saveAlert(row: typeof platSupervisorAlerts.$inferInsert): Promise<PlatSupervisorAlert> {
    const [saved] = await db.insert(platSupervisorAlerts).values(row).returning();
    return saved;
  }
  async alerts(limit = 100): Promise<PlatSupervisorAlert[]> {
    return db.select().from(platSupervisorAlerts).orderBy(desc(platSupervisorAlerts.createdAt)).limit(limit);
  }
  async openAlerts(): Promise<PlatSupervisorAlert[]> {
    return db.select().from(platSupervisorAlerts).where(eq(platSupervisorAlerts.status, "OPEN")).limit(200);
  }

  async saveHealth(row: typeof platHealthSnapshots.$inferInsert): Promise<PlatHealthSnapshot> {
    const [saved] = await db.insert(platHealthSnapshots).values(row).returning();
    return saved;
  }
  async healthHistory(limit = 50): Promise<PlatHealthSnapshot[]> {
    return db.select().from(platHealthSnapshots).orderBy(desc(platHealthSnapshots.createdAt)).limit(limit);
  }
}

export const platformRepository = singleton("platform.repository", () => new PlatformRepository());
