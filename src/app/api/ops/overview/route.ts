import { getOverviewWithMonitor } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const overview = await getOverviewWithMonitor();
    return Response.json(overview);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "overview unavailable" },
      { status: 500 },
    );
  }
}
