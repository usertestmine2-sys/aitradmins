import { scannerEngine, SCANNER_TYPES, type ScannerType } from "@/modules/market_data";
import { fail, handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") ?? "MOMENTUM") as ScannerType;
  if (!(SCANNER_TYPES as readonly string[]).includes(type)) return fail("invalid scanner type");
  const universeParam = searchParams.get("universe");
  const universe = universeParam ? universeParam.split(",").map((s) => s.trim()) : undefined;
  return handle(() => scannerEngine.scan(type, universe));
}
