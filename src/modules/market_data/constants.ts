// AI Arena — Market Data constants (single source of truth for enums/config).

export const EXCHANGES = ["NSE", "BSE", "MCX", "NFO", "CDS"] as const;
export type Exchange = (typeof EXCHANGES)[number];

export const INSTRUMENT_TYPES = [
  "EQ",
  "ETF",
  "INDEX",
  "FUT",
  "OPT",
  "CUR",
  "COM",
] as const;
export type InstrumentType = (typeof INSTRUMENT_TYPES)[number];

export const SYMBOL_STATUSES = [
  "ACTIVE",
  "IPO",
  "DELISTED",
  "SUSPENDED",
  "RELISTED",
] as const;
export type SymbolStatus = (typeof SYMBOL_STATUSES)[number];

// Canonical timeframe list. `seconds` drives resampling/aggregation math.
export const TIMEFRAMES = [
  "1m",
  "3m",
  "5m",
  "10m",
  "15m",
  "30m",
  "45m",
  "60m",
  "2H",
  "4H",
  "1D",
  "1W",
  "1M",
] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "1m": 60,
  "3m": 180,
  "5m": 300,
  "10m": 600,
  "15m": 900,
  "30m": 1800,
  "45m": 2700,
  "60m": 3600,
  "2H": 7200,
  "4H": 14400,
  "1D": 86400,
  "1W": 604800,
  "1M": 2592000,
};

export const PROVIDERS = [
  "NSE",
  "BSE",
  "ANGEL",
  "ZERODHA",
  "DHAN",
  "UPSTOX",
  "TRUEDATA",
  "SIMULATION",
] as const;
export type ProviderName = (typeof PROVIDERS)[number];

export const PROVIDER_HEALTH = ["UP", "DEGRADED", "DOWN"] as const;
export type ProviderHealthState = (typeof PROVIDER_HEALTH)[number];

export const MARKET_SESSIONS = [
  "PRE_OPEN",
  "OPEN",
  "POST_CLOSE",
  "CLOSED",
  "HOLIDAY",
] as const;
export type MarketSessionState = (typeof MARKET_SESSIONS)[number];

export const CORPORATE_ACTIONS = [
  "DIVIDEND",
  "SPLIT",
  "BONUS",
  "RIGHTS",
  "MERGER",
  "DEMERGER",
  "DELISTING",
  "RELISTING",
  "FACE_VALUE",
] as const;
export type CorporateActionType = (typeof CORPORATE_ACTIONS)[number];

export const SCANNER_TYPES = [
  "VOLUME_BREAKOUT",
  "PRICE_BREAKOUT",
  "MOMENTUM",
  "VWAP",
  "GAP",
  "DELIVERY",
  "OI",
  "HIGH_52W",
  "LOW_52W",
  "UPPER_CIRCUIT",
  "LOWER_CIRCUIT",
  "OPENING_RANGE",
  "INTRADAY_STRENGTH",
  "RELATIVE_STRENGTH",
  "CUSTOM",
] as const;
export type ScannerType = (typeof SCANNER_TYPES)[number];

export const WATCHLIST_TYPES = ["USER", "SECTOR", "AI", "STRATEGY"] as const;
export type WatchlistType = (typeof WATCHLIST_TYPES)[number];

export const NEWS_SOURCES = [
  "EXCHANGE",
  "CORP_ANNOUNCEMENT",
  "SEBI",
  "RBI",
  "ECONOMIC_CALENDAR",
  "RESULTS",
  "DIVIDEND",
  "SPLIT",
  "IPO",
] as const;
export type NewsSource = (typeof NEWS_SOURCES)[number];

// Market timing in IST (minutes from midnight).
export const IST_OFFSET_MINUTES = 330;
export const SESSION_TIMINGS = {
  preOpenStart: 9 * 60, // 09:00
  open: 9 * 60 + 15, // 09:15
  close: 15 * 60 + 30, // 15:30
  postCloseEnd: 16 * 60, // 16:00
};

// NSE trading holidays (static reference set; extend via SymbolMaster if needed).
export const MARKET_HOLIDAYS_2026 = [
  "2026-01-26",
  "2026-03-06",
  "2026-03-25",
  "2026-04-01",
  "2026-04-03",
  "2026-04-14",
  "2026-05-01",
  "2026-08-15",
  "2026-10-02",
  "2026-11-09",
  "2026-12-25",
] as const;

export const CACHE_TTL = {
  quote: 2_000,
  candles: 15_000,
  symbol: 300_000,
  optionChain: 5_000,
  breadth: 10_000,
  scanner: 10_000,
  news: 60_000,
  sector: 30_000,
} as const;

export const CACHE_NS = {
  quote: "quote",
  candles: "candles",
  symbol: "symbol",
  optionChain: "optionChain",
  breadth: "breadth",
  scanner: "scanner",
  news: "news",
  sector: "sector",
  provider: "provider",
} as const;
