// AITradeMinds — Scheduler / Worker runtime (in-proc).
// Single instance (globalThis via kernel registry). Opt-in start. Records every
// run to rt_jobs and routes failures to the dead-letter table.
// Extension point: a BullMqScheduler can implement the same registration API.
import { logger, singleton } from "@/kernel";
import { infraRepository } from "./repository";

export interface JobDefinition {
  name: string;
  intervalMs: number;
  handler: () => Promise<void> | void;
}

interface JobRecord extends JobDefinition {
  timer?: ReturnType<typeof setInterval>;
  runs: number;
  failures: number;
  lastDurationMs: number;
  lastStatus: "IDLE" | "SUCCESS" | "FAILED";
  lastRunAt: number | null;
}

class Scheduler {
  private readonly jobs = new Map<string, JobRecord>();
  private running = false;

  register(def: JobDefinition): void {
    if (this.jobs.has(def.name)) return; // idempotent — never duplicate a job
    const rec: JobRecord = {
      ...def,
      runs: 0,
      failures: 0,
      lastDurationMs: 0,
      lastStatus: "IDLE",
      lastRunAt: null,
    };
    this.jobs.set(def.name, rec);
    // If the scheduler is already running, schedule this job immediately so jobs
    // registered after start() still fire (composition roots register lazily).
    if (this.running) this.arm(rec);
  }

  private arm(rec: JobRecord): void {
    if (rec.timer) return;
    rec.timer = setInterval(() => {
      void this.execute(rec);
    }, rec.intervalMs);
    rec.timer.unref?.();
  }

  private async execute(rec: JobRecord): Promise<void> {
    const started = Date.now();
    let jobId: number | undefined;
    try {
      jobId = await infraRepository.startJob(rec.name);
      await rec.handler();
      const durationMs = Date.now() - started;
      rec.runs += 1;
      rec.lastDurationMs = durationMs;
      rec.lastStatus = "SUCCESS";
      rec.lastRunAt = Date.now();
      if (jobId !== undefined) await infraRepository.finishJob(jobId, "SUCCESS", durationMs);
    } catch (err) {
      const durationMs = Date.now() - started;
      rec.failures += 1;
      rec.lastStatus = "FAILED";
      rec.lastRunAt = Date.now();
      const message = err instanceof Error ? err.message : "unknown";
      logger.error("scheduler.job.failed", { job: rec.name, error: message });
      if (jobId !== undefined) await infraRepository.finishJob(jobId, "FAILED", durationMs, message);
      await infraRepository.deadLetter(`job:${rec.name}`, { job: rec.name }, message);
    }
  }

  async runNow(name: string): Promise<boolean> {
    const rec = this.jobs.get(name);
    if (!rec) return false;
    await this.execute(rec);
    return true;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    for (const rec of this.jobs.values()) this.arm(rec);
    logger.info("scheduler.started", { jobs: [...this.jobs.keys()] });
  }

  stop(): void {
    for (const rec of this.jobs.values()) {
      if (rec.timer) clearInterval(rec.timer);
      rec.timer = undefined;
    }
    this.running = false;
    logger.info("scheduler.stopped");
  }

  isRunning(): boolean {
    return this.running;
  }

  status() {
    return {
      running: this.running,
      jobs: [...this.jobs.values()].map((r) => ({
        name: r.name,
        intervalMs: r.intervalMs,
        runs: r.runs,
        failures: r.failures,
        lastStatus: r.lastStatus,
        lastDurationMs: r.lastDurationMs,
        lastRunAt: r.lastRunAt,
      })),
    };
  }
}

export const scheduler = singleton("infra.scheduler", () => new Scheduler());
