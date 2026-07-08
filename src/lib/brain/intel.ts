import { desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { marketIntel } from "@/db/schema";
import { ema } from "@/lib/brain/indicators";
import { getSeries } from "@/lib/brain/market";

/**
 * Indian Market Intelligence (Evolution Phase-1 boost).
 * NIFTY + BANKNIFTY dual regime, sector rotation strength, FII/DII flow
 * sensitivity, news impact scoring with short-term vs long-term shock
 * separation. Pure enhancement — consumed by the existing Brain pipeline.
 */

export interface IndexRegimeDetail {
  index: string;
  regime: "BULLISH" | "BEARISH" | "SIDEWAYS" | "UNKNOWN";
  emaSpreadPct: number | null;
}

export interface SectorRotationEntry {
  sector: string;
  strength: number; // avg 20d ROC across sector members, %
  members: number;
  rank: number;
}

export interface GlobalFactor {
  factor: string; // OIL | USDINR | GOLD | INDIAVIX
  last: number | null;
  roc20Pct: number | null;
  niftyCorrelation: number | null; // 20d daily-return correlation
}

export interface MarketIntelligence {
  indexRegimes: IndexRegimeDetail[];
  regimeAgreement: boolean;
  sectorRotation: SectorRotationEntry[];
  fiiDiiIndex: number | null; // -1..1 normalized 5-obs net flow sensitivity
  newsRiskMultiplier: number; // ≥1; scales risk score
  activeNews: { title: string; impact: string; horizon: string; symbol: string | null }[];
  globalFactors: GlobalFactor[]; // analysis only — never execution inputs on their own
  vixElevated: boolean;
}

const REGIME_INDICES = ["NIFTY", "BANKNIFTY"] as const;

async function indexRegime(index: string): Promise<IndexRegimeDetail> {
  const series = await getSeries(index);
  if (series.length < 50) return { index, regime: "UNKNOWN", emaSpreadPct: null };
  const closes = series.map((b) => b.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const close = closes[closes.length - 1];
  if (e20 == null || e50 == null) return { index, regime: "UNKNOWN", emaSpreadPct: null };
  const spreadPct = ((e20 - e50) / e50) * 100;
  const regime =
    close > e20 && spreadPct > 0.25 ? "BULLISH" : close < e20 && spreadPct < -0.25 ? "BEARISH" : "SIDEWAYS";
  return { index, regime, emaSpreadPct: Math.round(spreadPct * 100) / 100 };
}

async function sectorMap(): Promise<Map<string, string>> {
  const rows = await db.select().from(marketIntel).where(eq(marketIntel.kind, "sector_map"));
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.symbol && row.sector) map.set(row.symbol, row.sector);
  }
  return map;
}

async function sectorRotation(universe: string[]): Promise<SectorRotationEntry[]> {
  const map = await sectorMap();
  const bySector = new Map<string, number[]>();
  for (const symbol of universe) {
    const sector = map.get(symbol);
    if (!sector) continue;
    const series = await getSeries(symbol);
    if (series.length < 21) continue;
    const closes = series.map((b) => b.close);
    const past = closes[closes.length - 21];
    if (past <= 0) continue;
    const roc20 = ((closes[closes.length - 1] - past) / past) * 100;
    (bySector.get(sector) ?? bySector.set(sector, []).get(sector)!).push(roc20);
  }
  const entries = [...bySector.entries()]
    .map(([sector, rocs]) => ({
      sector,
      strength: Math.round((rocs.reduce((a, b) => a + b, 0) / rocs.length) * 100) / 100,
      members: rocs.length,
      rank: 0,
    }))
    .sort((a, b) => b.strength - a.strength);
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}

/** FII/DII sensitivity: tanh-normalized sum of the last 5 net-flow observations (₹ crore). */
async function fiiDiiIndex(): Promise<number | null> {
  const rows = await db
    .select()
    .from(marketIntel)
    .where(eq(marketIntel.kind, "fii_dii"))
    .orderBy(desc(marketIntel.effectiveDate))
    .limit(5);
  const flows = rows.map((r) => r.value).filter((v): v is number => typeof v === "number");
  if (flows.length === 0) return null;
  const net = flows.reduce((a, b) => a + b, 0);
  return Math.round(Math.tanh(net / 10_000) * 1000) / 1000;
}

const EVENT_KINDS = ["news", "rbi_event", "budget_event", "corporate_action"] as const;
/** Kind-specific base multipliers: RBI/Budget events carry systematic weight. */
const KIND_FACTOR: Record<string, number> = {
  news: 1,
  rbi_event: 1.5,
  budget_event: 1.6,
  corporate_action: 0.7,
};

/**
 * Event risk multiplier over news, RBI events, Budget events, and corporate
 * actions. Short-term high-impact items dominate; long-term items carry
 * reduced immediate weight (shock separation). 7-day active window.
 */
async function newsRisk(): Promise<{
  multiplier: number;
  active: MarketIntelligence["activeNews"];
}> {
  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(marketIntel)
    .where(inArray(marketIntel.kind, [...EVENT_KINDS]))
    .orderBy(desc(marketIntel.effectiveDate))
    .limit(80);
  const fresh = rows.filter((r) => r.effectiveDate >= since);

  const IMPACT_WEIGHT: Record<string, number> = { high: 0.35, medium: 0.15, low: 0.05 };
  let multiplier = 1;
  for (const item of fresh) {
    const base = (IMPACT_WEIGHT[item.impact ?? "low"] ?? 0.05) * (KIND_FACTOR[item.kind] ?? 1);
    const horizonFactor = item.horizon === "long_term" ? 0.4 : 1; // short-term shocks bite now
    multiplier += base * horizonFactor;
  }
  return {
    multiplier: Math.min(2.5, Math.round(multiplier * 100) / 100),
    active: fresh.slice(0, 10).map((r) => ({
      title: r.title,
      impact: r.impact ?? "low",
      horizon: r.horizon ?? "short_term",
      symbol: r.symbol,
    })),
  };
}

/** Global correlation factors (analysis only): Oil, USDINR, Gold, India VIX. */
const GLOBAL_FACTOR_SYMBOLS = ["OIL", "USDINR", "GOLD", "INDIAVIX"] as const;

function dailyReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  return returns;
}

function correlation(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 10) return null;
  const xs = a.slice(-n);
  const ys = b.slice(-n);
  const mx = xs.reduce((p, c) => p + c, 0) / n;
  const my = ys.reduce((p, c) => p + c, 0) / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    cov += (xs[i] - mx) * (ys[i] - my);
    vx += (xs[i] - mx) ** 2;
    vy += (ys[i] - my) ** 2;
  }
  if (vx === 0 || vy === 0) return null;
  return Math.round((cov / Math.sqrt(vx * vy)) * 1000) / 1000;
}

async function globalFactors(): Promise<{ factors: GlobalFactor[]; vixElevated: boolean }> {
  const nifty = await getSeries("NIFTY");
  const niftyReturns = dailyReturns(nifty.map((b) => b.close)).slice(-20);
  const factors: GlobalFactor[] = [];
  let vixElevated = false;

  for (const symbol of GLOBAL_FACTOR_SYMBOLS) {
    const series = await getSeries(symbol);
    if (series.length < 5) {
      factors.push({ factor: symbol, last: null, roc20Pct: null, niftyCorrelation: null });
      continue;
    }
    const closes = series.map((b) => b.close);
    const last = closes[closes.length - 1];
    const base = closes.length > 20 ? closes[closes.length - 21] : closes[0];
    const roc20Pct = base > 0 ? Math.round(((last - base) / base) * 10000) / 100 : null;
    const corr = correlation(dailyReturns(closes).slice(-20), niftyReturns);
    factors.push({ factor: symbol, last, roc20Pct, niftyCorrelation: corr });
    if (symbol === "INDIAVIX" && last >= 18) vixElevated = true;
  }
  return { factors, vixElevated };
}

export async function buildMarketIntelligence(universe: string[]): Promise<MarketIntelligence> {
  const [regimes, rotation, fii, news, globals] = await Promise.all([
    Promise.all(REGIME_INDICES.map((i) => indexRegime(i))),
    sectorRotation(universe),
    fiiDiiIndex(),
    newsRisk(),
    globalFactors(),
  ]);
  const known = regimes.filter((r) => r.regime !== "UNKNOWN");
  // Elevated India VIX systematically raises the risk multiplier.
  const multiplier = Math.min(2.5, Math.round(news.multiplier * (globals.vixElevated ? 1.2 : 1) * 100) / 100);
  return {
    indexRegimes: regimes,
    regimeAgreement: known.length >= 2 && new Set(known.map((r) => r.regime)).size === 1,
    sectorRotation: rotation,
    fiiDiiIndex: fii,
    newsRiskMultiplier: multiplier,
    activeNews: news.active,
    globalFactors: globals.factors,
    vixElevated: globals.vixElevated,
  };
}

/** Sector strength (0..1) for a symbol, from rotation ranking. Neutral 0.5 when unmapped. */
export function sectorStrengthFor(
  symbol: string,
  map: Map<string, string>,
  rotation: SectorRotationEntry[],
): number {
  const sector = map.get(symbol);
  if (!sector || rotation.length === 0) return 0.5;
  const entry = rotation.find((r) => r.sector === sector);
  if (!entry) return 0.5;
  return rotation.length === 1 ? 0.5 : 1 - (entry.rank - 1) / (rotation.length - 1);
}

export { sectorMap };

/** Recent bars needed by the intel-aware modules (re-export barrier avoided). */
export async function recentIntel(limit = 30) {
  return db.select().from(marketIntel).orderBy(desc(marketIntel.id)).limit(limit);
}

export async function intelSince(dateIso: string) {
  return db.select().from(marketIntel).where(gte(marketIntel.effectiveDate, dateIso));
}
