import { and, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { marketIntel } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";
import { getSeries } from "@/lib/brain/market";
import type { Bar } from "@/lib/brain/indicators";

/**
 * MARKET DNA ENGINE (Phase-3). Fingerprints the current market window and
 * scores similarity against historical windows of the same index, labelling
 * each with a regime phase and any coincident macro event tags (election,
 * budget, pandemic, war, rate cycle, liquidity cycle) drawn from the intel
 * store. Analysis only — feeds Brain context, never executes.
 */

const WINDOW = 20;
const STRIDE = 5;

export interface MarketFingerprint {
  startDate: string;
  endDate: string;
  returnPct: number;
  volatilityPct: number;
  maxDrawdownPct: number;
  trendPersistence: number; // share of up days, 0..1
  rangeCompression: number; // (high-low)/mean close over window
}

export interface DnaMatch {
  fingerprint: MarketFingerprint;
  phase: string;
  eventTags: string[];
  similarity: number; // 0..1
}

export interface DnaAssessment {
  index: string;
  current: MarketFingerprint | null;
  currentPhase: string;
  matches: DnaMatch[];
  historicalWindows: number;
}

function fingerprint(bars: Bar[]): MarketFingerprint {
  const closes = bars.map((b) => b.close);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const returns: number[] = [];
  let upDays = 0;
  for (let i = 1; i < closes.length; i++) {
    const r = (closes[i] - closes[i - 1]) / closes[i - 1];
    returns.push(r);
    if (r > 0) upDays += 1;
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const vol = Math.sqrt(returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length) * 100;
  let peak = closes[0];
  let maxDd = 0;
  for (const c of closes) {
    peak = Math.max(peak, c);
    maxDd = Math.max(maxDd, ((peak - c) / peak) * 100);
  }
  const hi = Math.max(...bars.map((b) => b.high));
  const lo = Math.min(...bars.map((b) => b.low));
  const meanClose = closes.reduce((a, b) => a + b, 0) / closes.length;
  return {
    startDate: bars[0].date,
    endDate: bars[bars.length - 1].date,
    returnPct: Math.round(((last - first) / first) * 10000) / 100,
    volatilityPct: Math.round(vol * 100) / 100,
    maxDrawdownPct: Math.round(maxDd * 100) / 100,
    trendPersistence: Math.round((upDays / returns.length) * 1000) / 1000,
    rangeCompression: Math.round(((hi - lo) / meanClose) * 10000) / 10000,
  };
}

function classifyPhase(fp: MarketFingerprint, previous: MarketFingerprint | null): string {
  if (fp.returnPct <= -12 || (fp.maxDrawdownPct >= 12 && fp.volatilityPct > 2.5)) return "CRASH";
  if (previous && previous.returnPct <= -8 && fp.returnPct >= 5) return "RECOVERY";
  if (fp.returnPct <= -5) return "BEAR";
  if (fp.returnPct >= 5) return "BULL";
  return "SIDEWAYS";
}

const EVENT_TAG_RULES: { tag: string; keywords: string[]; kinds: string[] }[] = [
  { tag: "election", keywords: ["election", "poll", "mandate"], kinds: ["news"] },
  { tag: "budget", keywords: ["budget"], kinds: ["budget_event", "news"] },
  { tag: "pandemic", keywords: ["pandemic", "virus", "lockdown", "covid"], kinds: ["news"] },
  { tag: "war", keywords: ["war", "conflict", "strike", "military"], kinds: ["news"] },
  { tag: "rate-cycle", keywords: ["rbi", "rate", "mpc", "repo"], kinds: ["rbi_event", "news"] },
  { tag: "liquidity-cycle", keywords: ["liquidity", "crr", "omo", "fii"], kinds: ["rbi_event", "news", "fii_dii"] },
];

async function eventTagsBetween(startDate: string, endDate: string): Promise<string[]> {
  const rows = await db
    .select()
    .from(marketIntel)
    .where(
      and(
        inArray(marketIntel.kind, ["news", "rbi_event", "budget_event", "fii_dii"]),
        gte(marketIntel.effectiveDate, startDate),
      ),
    )
    .limit(500);
  const inWindow = rows.filter((r) => r.effectiveDate <= endDate);
  const tags = new Set<string>();
  for (const row of inWindow) {
    const title = row.title.toLowerCase();
    for (const rule of EVENT_TAG_RULES) {
      if (rule.kinds.includes(row.kind) && rule.keywords.some((k) => title.includes(k))) {
        tags.add(rule.tag);
      }
    }
    if (row.kind === "budget_event") tags.add("budget");
    if (row.kind === "rbi_event") tags.add("rate-cycle");
  }
  return [...tags];
}

function similarity(a: MarketFingerprint, b: MarketFingerprint): number {
  // Normalized feature distance → similarity 0..1.
  const features: [number, number, number][] = [
    [a.returnPct, b.returnPct, 15],
    [a.volatilityPct, b.volatilityPct, 2],
    [a.maxDrawdownPct, b.maxDrawdownPct, 10],
    [a.trendPersistence, b.trendPersistence, 0.4],
    [a.rangeCompression, b.rangeCompression, 0.1],
  ];
  let distance = 0;
  for (const [x, y, scale] of features) {
    distance += ((x - y) / scale) ** 2;
  }
  return Math.round((1 / (1 + Math.sqrt(distance / features.length))) * 1000) / 1000;
}

export async function assessMarketDna(index = "NIFTY"): Promise<DnaAssessment> {
  const series = await getSeries(index, 2000);
  if (series.length < WINDOW * 2) {
    return { index, current: null, currentPhase: "UNKNOWN", matches: [], historicalWindows: 0 };
  }

  const current = fingerprint(series.slice(-WINDOW));
  const historical: { fp: MarketFingerprint; prev: MarketFingerprint | null }[] = [];
  for (let end = series.length - WINDOW; end >= WINDOW * 2; end -= STRIDE) {
    const windowBars = series.slice(end - WINDOW, end);
    const prevBars = end - WINDOW * 2 >= 0 ? series.slice(end - WINDOW * 2, end - WINDOW) : null;
    historical.push({ fp: fingerprint(windowBars), prev: prevBars ? fingerprint(prevBars) : null });
  }

  const prevCurrent =
    series.length >= WINDOW * 2 ? fingerprint(series.slice(-WINDOW * 2, -WINDOW)) : null;
  const currentPhase = classifyPhase(current, prevCurrent);

  const matches: DnaMatch[] = [];
  for (const { fp, prev } of historical) {
    matches.push({
      fingerprint: fp,
      phase: classifyPhase(fp, prev),
      eventTags: await eventTagsBetween(fp.startDate, fp.endDate),
      similarity: similarity(current, fp),
    });
  }
  matches.sort((a, b) => b.similarity - a.similarity);
  const top = matches.slice(0, 5);

  await appendEvent("dna.assessed", "brain-market-context", {
    index,
    currentPhase,
    currentReturnPct: current.returnPct,
    topMatch: top[0] ? { phase: top[0].phase, similarity: top[0].similarity, window: `${top[0].fingerprint.startDate}..${top[0].fingerprint.endDate}`, eventTags: top[0].eventTags } : null,
  });

  return { index, current, currentPhase, matches: top, historicalWindows: historical.length };
}
