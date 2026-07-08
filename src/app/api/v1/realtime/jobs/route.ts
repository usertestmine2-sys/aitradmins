import { okResponse, toResponse, errors } from "@/kernel";
import { scheduler, infraRepository, bootstrapRealtime } from "@/modules/infra";
import { assertAdmin } from "@/modules/infra/http-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await assertAdmin(req);
    bootstrapRealtime();
    const recent = await infraRepository.recentJobs(25);
    return okResponse({ scheduler: scheduler.status(), recent });
  } catch (err) {
    return toResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await assertAdmin(req);
    bootstrapRealtime();
    const body = (await req.json()) as { action?: "start" | "stop" | "runNow"; name?: string };
    switch (body.action) {
      case "start":
        scheduler.start();
        return okResponse({ running: scheduler.isRunning() });
      case "stop":
        scheduler.stop();
        return okResponse({ running: scheduler.isRunning() });
      case "runNow": {
        if (!body.name) throw errors.badRequest("name is required");
        const ran = await scheduler.runNow(body.name);
        if (!ran) throw errors.notFound(`job ${body.name} not found`);
        return okResponse({ ran: body.name, status: scheduler.status() });
      }
      default:
        throw errors.badRequest("action must be start|stop|runNow");
    }
  } catch (err) {
    return toResponse(err);
  }
}
