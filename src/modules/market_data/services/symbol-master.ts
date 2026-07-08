// AI Arena — Symbol Master. Complete Indian market instrument reference.
import { CACHE_NS, CACHE_TTL } from "../constants";
import { cache } from "../core/cache";
import { repository } from "../core/repository";
import type { MdSymbol, MdSymbolInsert } from "@/db/schema";

// Seed universe covering equity, ETF, indices, futures & options scaffolding.
const SEED_EQUITIES: Array<{
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  lotSize: number;
}> = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", industry: "Refineries", lotSize: 250 },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", industry: "Software", lotSize: 175 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Financials", industry: "Private Bank", lotSize: 550 },
  { symbol: "INFY", name: "Infosys", sector: "IT", industry: "Software", lotSize: 400 },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Financials", industry: "Private Bank", lotSize: 700 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Financials", industry: "PSU Bank", lotSize: 750 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", industry: "Telecom Services", lotSize: 475 },
  { symbol: "ITC", name: "ITC Ltd", sector: "FMCG", industry: "Cigarettes", lotSize: 1600 },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Industrials", industry: "Construction", lotSize: 150 },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Financials", industry: "Private Bank", lotSize: 625 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Financials", industry: "Private Bank", lotSize: 400 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG", industry: "Personal Care", lotSize: 300 },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto", industry: "Passenger Cars", lotSize: 50 },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", industry: "Commercial Vehicles", lotSize: 550 },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Pharma", industry: "Pharmaceuticals", lotSize: 350 },
  { symbol: "WIPRO", name: "Wipro", sector: "IT", industry: "Software", lotSize: 1500 },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Industrials", industry: "Trading", lotSize: 300 },
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer Durables", industry: "Jewellery", lotSize: 175 },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer Durables", industry: "Paints", lotSize: 200 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Financials", industry: "NBFC", lotSize: 125 },
];

const SEED_INDICES = [
  { symbol: "NIFTY", name: "Nifty 50", lotSize: 75 },
  { symbol: "BANKNIFTY", name: "Nifty Bank", lotSize: 30 },
  { symbol: "FINNIFTY", name: "Nifty Financial Services", lotSize: 65 },
  { symbol: "MIDCPNIFTY", name: "Nifty Midcap Select", lotSize: 120 },
  { symbol: "SENSEX", name: "BSE Sensex", lotSize: 20 },
];

const SEED_ETFS = [
  { symbol: "NIFTYBEES", name: "Nippon Nifty ETF", sector: "ETF", industry: "Index ETF" },
  { symbol: "BANKBEES", name: "Nippon Bank ETF", sector: "ETF", industry: "Sector ETF" },
  { symbol: "GOLDBEES", name: "Nippon Gold ETF", sector: "ETF", industry: "Commodity ETF" },
];

class SymbolMaster {
  async seed(): Promise<number> {
    const rows: MdSymbolInsert[] = [];
    for (const e of SEED_EQUITIES) {
      rows.push({
        symbol: e.symbol,
        exchange: "NSE",
        instrumentType: "EQ",
        segment: "CASH",
        name: e.name,
        sector: e.sector,
        industry: e.industry,
        lotSize: e.lotSize,
        tickSize: 0.05,
        freezeQty: e.lotSize * 24,
        faceValue: e.symbol === "ITC" ? 1 : 10,
        status: "ACTIVE",
      });
    }
    for (const idx of SEED_INDICES) {
      rows.push({
        symbol: idx.symbol,
        exchange: idx.symbol === "SENSEX" ? "BSE" : "NSE",
        instrumentType: "INDEX",
        segment: "INDEX",
        name: idx.name,
        sector: "Index",
        industry: "Benchmark",
        lotSize: idx.lotSize,
        tickSize: 0.05,
      });
    }
    for (const etf of SEED_ETFS) {
      rows.push({
        symbol: etf.symbol,
        exchange: "NSE",
        instrumentType: "ETF",
        segment: "CASH",
        name: etf.name,
        sector: etf.sector,
        industry: etf.industry,
        lotSize: 1,
        tickSize: 0.01,
      });
    }
    const count = await repository.upsertSymbols(rows);
    cache.invalidate(CACHE_NS.symbol);
    return count;
  }

  // Build option-chain instrument rows for an underlying/expiry (Expiry Builder).
  async buildOptionInstruments(
    underlying: string,
    expiry: string,
    spot: number,
    step: number,
    depth = 10,
  ): Promise<number> {
    const rows: MdSymbolInsert[] = [];
    const atm = Math.round(spot / step) * step;
    for (let i = -depth; i <= depth; i += 1) {
      const strike = atm + i * step;
      if (strike <= 0) continue;
      for (const optionType of ["CE", "PE"] as const) {
        rows.push({
          symbol: `${underlying}${expiry.replace(/-/g, "")}${strike}${optionType}`,
          exchange: "NFO",
          instrumentType: "OPT",
          segment: "FNO",
          name: `${underlying} ${strike} ${optionType}`,
          sector: "Derivatives",
          industry: "Options",
          lotSize: underlying === "NIFTY" ? 75 : 30,
          tickSize: 0.05,
          expiry,
          strike,
          optionType,
          status: "ACTIVE",
        });
      }
    }
    const count = await repository.upsertSymbols(rows);
    cache.invalidate(CACHE_NS.symbol);
    return count;
  }

  async get(symbol: string, exchange = "NSE"): Promise<MdSymbol | undefined> {
    return cache.getOrSet(CACHE_NS.symbol, `${exchange}:${symbol}`, CACHE_TTL.symbol, () =>
      repository.findSymbol(symbol, exchange),
    );
  }

  async search(query: string): Promise<MdSymbol[]> {
    return repository.searchSymbols(query);
  }

  async list(filters: { instrumentType?: string; sector?: string; status?: string }) {
    return repository.listSymbols(filters);
  }

  async sectors(): Promise<string[]> {
    return cache.getOrSet(CACHE_NS.sector, "list", CACHE_TTL.sector, () => repository.sectors());
  }

  // Corporate metadata mutation (bonus/split/rights/face-value change).
  async applyMetadataChange(
    symbol: string,
    change: Partial<Pick<MdSymbol, "faceValue" | "lotSize" | "status">>,
    exchange = "NSE",
  ): Promise<void> {
    const existing = await repository.findSymbol(symbol, exchange);
    if (!existing) return;
    await repository.upsertSymbols([
      {
        symbol: existing.symbol,
        exchange: existing.exchange,
        instrumentType: existing.instrumentType,
        name: existing.name,
        sector: existing.sector,
        industry: existing.industry,
        lotSize: change.lotSize ?? existing.lotSize,
        tickSize: existing.tickSize,
        freezeQty: existing.freezeQty,
        faceValue: change.faceValue ?? existing.faceValue,
        status: change.status ?? existing.status,
      },
    ]);
    cache.invalidate(CACHE_NS.symbol, `${exchange}:${symbol}`);
  }
}

export const symbolMaster = new SymbolMaster();
