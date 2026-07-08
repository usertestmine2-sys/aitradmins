// AITradeMinds — Report Generator. Composes analytics into append-only reports
// and supports export formats (JSON/CSV). Reuses the Analytics Service.
import { errors, logger, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { analyticsService } from "./service";
import { analyticsRepository } from "./repository";
import type { AnalyticsReport } from "@/db/schema";

export const REPORT_KINDS = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "BRAIN",
  "STRATEGY",
  "TRAINING",
  "RISK",
  "PAPER",
  "BROKER",
  "MARKET",
  "RESEARCH",
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

class ReportGenerator {
  private async payloadFor(kind: ReportKind): Promise<Record<string, unknown>> {
    switch (kind) {
      case "BRAIN":
        return { brain: await analyticsService.brain(), models: await analyticsService.models() };
      case "TRAINING":
        return { training: await analyticsService.training(), learning: await analyticsService.learning() };
      case "MARKET":
        return { market: await analyticsService.market() };
      case "BROKER":
        return { broker: await analyticsService.broker() };
      case "STRATEGY":
        return { strategy: await analyticsService.strategy() };
      case "PAPER":
        return { paperTrading: await analyticsService.paperTrading() };
      case "RISK":
        return { risk: await analyticsService.risk() };
      case "DAILY":
      case "WEEKLY":
      case "MONTHLY":
      case "QUARTERLY":
      case "YEARLY":
      case "RESEARCH":
      default:
        return (await analyticsService.dashboard()) as unknown as Record<string, unknown>;
    }
  }

  async generate(
    kind: ReportKind,
    opts: { period?: string; generatedBy?: string } = {},
  ): Promise<AnalyticsReport> {
    const payload = await this.payloadFor(kind);
    const report = await analyticsRepository.saveReport({
      kind,
      period: opts.period,
      title: `${kind} report ${opts.period ?? new Date().toISOString().slice(0, 10)}`,
      payload,
      generatedBy: opts.generatedBy,
    });
    eventBus.publish("training", {
      event: "report.created",
      message: `${kind} report #${report.id}`,
      ts: Date.now(),
    });
    logger.info("report.created", { kind, id: report.id });
    return report;
  }

  async list(kind?: string) {
    return analyticsRepository.listReports(kind, 50);
  }

  async get(id: number): Promise<AnalyticsReport> {
    const report = await analyticsRepository.getReport(id);
    if (!report) throw errors.notFound(`Report ${id} not found`);
    return report;
  }

  /** Flatten a report's top-level numeric metrics into CSV rows. */
  toCsv(report: AnalyticsReport): string {
    const rows: string[] = ["section,metric,value"];
    const walk = (section: string, obj: unknown) => {
      if (obj === null || typeof obj !== "object") {
        rows.push(`${section},value,${String(obj)}`);
        return;
      }
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
          rows.push(`${section},${k},${String(v)}`);
        }
      }
    };
    for (const [section, value] of Object.entries(report.payload)) walk(section, value);
    return rows.join("\n");
  }
}

export const reportGenerator = singleton("analytics.reportGenerator", () => new ReportGenerator());
