import { toResponse } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { cache } from "@/modules/market_data/core/cache";
import { scheduler, bootstrapRealtime } from "@/modules/infra";
import { assertAdmin } from "@/modules/infra/http-guard";

export const dynamic = "force-dynamic";

// Prometheus text exposition format.
export async function GET(req: Request) {
  try {
    await assertAdmin(req);
    bootstrapRealtime();

    const lines: string[] = [];
    const c = cache.stats();
    lines.push("# TYPE aitm_cache_hits counter");
    lines.push(`aitm_cache_hits ${c.hits}`);
    lines.push("# TYPE aitm_cache_misses counter");
    lines.push(`aitm_cache_misses ${c.misses}`);
    lines.push("# TYPE aitm_cache_l2_hits counter");
    lines.push(`aitm_cache_l2_hits ${c.l2Hits}`);
    lines.push("# TYPE aitm_cache_size gauge");
    lines.push(`aitm_cache_size ${c.size}`);

    lines.push("# TYPE aitm_events_published counter");
    for (const [event, count] of Object.entries(eventBus.metrics())) {
      lines.push(`aitm_events_published{event="${event}"} ${count}`);
    }

    lines.push("# TYPE aitm_job_runs counter");
    lines.push("# TYPE aitm_job_failures counter");
    for (const job of scheduler.status().jobs) {
      lines.push(`aitm_job_runs{job="${job.name}"} ${job.runs}`);
      lines.push(`aitm_job_failures{job="${job.name}"} ${job.failures}`);
    }

    const mem = process.memoryUsage();
    lines.push("# TYPE aitm_process_rss_bytes gauge");
    lines.push(`aitm_process_rss_bytes ${mem.rss}`);
    lines.push("# TYPE aitm_process_heap_used_bytes gauge");
    lines.push(`aitm_process_heap_used_bytes ${mem.heapUsed}`);

    return new Response(lines.join("\n") + "\n", {
      status: 200,
      headers: { "content-type": "text/plain; version=0.0.4" },
    });
  } catch (err) {
    return toResponse(err);
  }
}
