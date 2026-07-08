import { z } from "zod";
import { okResponse, toResponse, errors } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth, requireAdmin } from "@/modules/identity";
import { reportGenerator, REPORT_KINDS, bootstrapAnalytics } from "@/modules/analytics";
import type { ReportKind } from "@/modules/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapAnalytics();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const format = searchParams.get("format");
    if (id) {
      const report = await reportGenerator.get(Number(id));
      if (format === "csv") {
        return new Response(reportGenerator.toCsv(report), {
          status: 200,
          headers: {
            "content-type": "text/csv",
            "content-disposition": `attachment; filename="report-${id}.csv"`,
          },
        });
      }
      return okResponse({ report });
    }
    void ctx;
    const kind = searchParams.get("kind") ?? undefined;
    return okResponse({ reports: await reportGenerator.list(kind) });
  } catch (err) {
    return toResponse(err);
  }
}

const genSchema = z.object({
  kind: z.enum(REPORT_KINDS),
  period: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireAdmin(req);
    bootstrapAnalytics();
    const body = await parseBody(req, genSchema);
    if (!(REPORT_KINDS as readonly string[]).includes(body.kind)) {
      throw errors.badRequest("invalid report kind");
    }
    const report = await reportGenerator.generate(body.kind as ReportKind, {
      period: body.period,
      generatedBy: String(ctx.userId),
    });
    return okResponse({ report }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
