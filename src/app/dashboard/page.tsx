"use client";

import { useCallback, useEffect, useState } from "react";

type Json = Record<string, unknown>;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json()) as { ok: boolean; data?: T; error?: string };
  if (!body.ok) throw new Error(body.error ?? "Request failed");
  return body.data as T;
}

interface Overview {
  session: { state: string; istTime: string; nextOpen: string | null };
  providers: {
    active: string | null;
    status: Array<{ provider: string; health: string; priority: number; configured: boolean }>;
  };
  breadth: {
    nifty: { advances: number; declines: number; unchanged: number; breadthPct: number };
    banknifty: { advances: number; declines: number; unchanged: number; breadthPct: number };
  };
  sectorRotation: Array<{ sector: string; momentum: number; avgChangePct: number }>;
  rotatingInto: string[];
  rotatingOut: string[];
  topMovers: Array<{ symbol: string; value: number; detail: string }>;
  news: Array<{ id: number; headline: string; source: string; impact: string }>;
  metrics: {
    symbols: number;
    candles: number;
    cache: { hits: number; misses: number; size: number };
    feed: { ingested: number; rejected: number };
    events: Record<string, number>;
  };
}

const TABS = [
  "Overview",
  "Providers",
  "Scanner",
  "Option Chain",
  "Indicators",
  "News",
] as const;
type Tab = (typeof TABS)[number];

const healthColor: Record<string, string> = {
  UP: "bg-emerald-500",
  DEGRADED: "bg-amber-500",
  DOWN: "bg-rose-500",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await api<Overview>("/api/v1/market/overview"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await api("/api/v1/market/bootstrap", { method: "POST" });
        await loadOverview();
      } catch (e) {
        setError(e instanceof Error ? e.message : "bootstrap failed");
      } finally {
        setBooting(false);
      }
    })();
  }, [loadOverview]);

  return (
    <div className="px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">AITradeMinds</p>
            <h1 className="text-3xl font-bold">Market Data Platform</h1>
          </div>
          {overview && (
            <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  overview.session.state === "OPEN" ? "bg-emerald-500" : "bg-slate-500"
                }`}
              />
              <span className="font-medium">{overview.session.state}</span>
              <span className="text-slate-400">IST {overview.session.istTime}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">Feed: {overview.providers.active ?? "—"}</span>
            </div>
          )}
        </header>

        {booting && <p className="text-slate-400">Bootstrapping market data (seeding symbols, candles, providers)…</p>}
        {error && <p className="mb-4 rounded-lg bg-rose-950/60 p-3 text-rose-300">Error: {error}</p>}

        <nav className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                tab === t
                  ? "bg-indigo-500 text-white"
                  : "border border-slate-800 text-slate-400 hover:text-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === "Overview" && overview && <OverviewPanel data={overview} />}
        {tab === "Providers" && overview && <ProvidersPanel data={overview} />}
        {tab === "Scanner" && <ScannerPanel />}
        {tab === "Option Chain" && <OptionChainPanel />}
        {tab === "Indicators" && <IndicatorsPanel />}
        {tab === "News" && <NewsPanel />}
      </div>
    </div>
  );
}

function OverviewPanel({ data }: { data: Overview }) {
  const b = data.breadth;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card title="NIFTY Breadth">
        <div className="flex items-end gap-4">
          <span className="text-emerald-400 text-2xl font-bold">{b.nifty.advances} ▲</span>
          <span className="text-rose-400 text-2xl font-bold">{b.nifty.declines} ▼</span>
          <span className="text-slate-400">{b.nifty.unchanged} =</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">Breadth {b.nifty.breadthPct}%</p>
      </Card>
      <Card title="BANKNIFTY Breadth">
        <div className="flex items-end gap-4">
          <span className="text-emerald-400 text-2xl font-bold">{b.banknifty.advances} ▲</span>
          <span className="text-rose-400 text-2xl font-bold">{b.banknifty.declines} ▼</span>
          <span className="text-slate-400">{b.banknifty.unchanged} =</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">Breadth {b.banknifty.breadthPct}%</p>
      </Card>
      <Card title="Platform Metrics">
        <ul className="space-y-1 text-sm text-slate-300">
          <li>Symbols: {data.metrics.symbols}</li>
          <li>Candles: {data.metrics.candles}</li>
          <li>
            Cache: {data.metrics.cache.hits} hits / {data.metrics.cache.misses} miss (size{" "}
            {data.metrics.cache.size})
          </li>
          <li>
            Feed: {data.metrics.feed.ingested} ok / {data.metrics.feed.rejected} rejected
          </li>
        </ul>
      </Card>
      <Card title="Sector Rotation">
        <div className="mb-2 text-xs text-slate-400">
          Into: <span className="text-emerald-400">{data.rotatingInto.join(", ")}</span> · Out:{" "}
          <span className="text-rose-400">{data.rotatingOut.join(", ")}</span>
        </div>
        <ul className="space-y-1 text-sm">
          {data.sectorRotation.map((s) => (
            <li key={s.sector} className="flex justify-between">
              <span>{s.sector}</span>
              <span className={s.avgChangePct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {s.avgChangePct}%
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Top Momentum Movers">
        <ul className="space-y-1 text-sm">
          {data.topMovers.map((m) => (
            <li key={m.symbol} className="flex justify-between">
              <span>{m.symbol}</span>
              <span className="text-indigo-300">{m.value}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Latest News">
        <ul className="space-y-2 text-sm">
          {data.news.map((n) => (
            <li key={n.id}>
              <span className="mr-2 rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">
                {n.source}
              </span>
              {n.headline}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ProvidersPanel({ data }: { data: Overview }) {
  return (
    <Card title="Provider Manager · Health & Priority Routing">
      <table className="w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Provider</th>
            <th>Priority</th>
            <th>Configured</th>
            <th>Health</th>
          </tr>
        </thead>
        <tbody>
          {data.providers.status.map((p) => (
            <tr key={p.provider} className="border-t border-slate-800">
              <td className="py-2 font-medium">{p.provider}</td>
              <td>{p.priority}</td>
              <td>{p.configured ? "yes" : "no"}</td>
              <td>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs ${
                    p.health === "UP" ? "text-emerald-300" : p.health === "DEGRADED" ? "text-amber-300" : "text-rose-300"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${healthColor[p.health] ?? "bg-slate-500"}`} />
                  {p.health}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function ScannerPanel() {
  const [type, setType] = useState("MOMENTUM");
  const [rows, setRows] = useState<Array<{ symbol: string; value: number; detail: string }>>([]);
  const [loading, setLoading] = useState(false);
  const scannerTypes = [
    "VOLUME_BREAKOUT", "PRICE_BREAKOUT", "MOMENTUM", "VWAP", "GAP", "HIGH_52W",
    "LOW_52W", "RELATIVE_STRENGTH", "INTRADAY_STRENGTH", "OPENING_RANGE",
  ];
  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ matches: typeof rows }>(`/api/v1/market/scanner?type=${type}`);
      setRows(res.matches);
    } finally {
      setLoading(false);
    }
  }, [type]);
  useEffect(() => {
    run();
  }, [run]);
  return (
    <Card title="Scanner Engine">
      <div className="mb-4 flex flex-wrap gap-2">
        {scannerTypes.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded px-2.5 py-1 text-xs ${type === t ? "bg-indigo-500" : "bg-slate-800 text-slate-400"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-slate-400">Scanning…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">No matches.</p>
      ) : (
        <ul className="grid gap-1 text-sm md:grid-cols-2">
          {rows.map((r) => (
            <li key={r.symbol} className="flex justify-between rounded bg-slate-800/50 px-3 py-1.5">
              <span>{r.symbol}</span>
              <span className="text-slate-400">{r.detail} · {r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function OptionChainPanel() {
  const [underlying, setUnderlying] = useState("NIFTY");
  type Chain = {
    spot: number;
    atmStrike: number;
    pcr: number;
    maxPain: number;
    rows: Array<{
      strike: number;
      call: { ltp: number; oi: number; iv: number };
      put: { ltp: number; oi: number; iv: number };
    }>;
  };
  const [chain, setChain] = useState<Chain | null>(null);
  useEffect(() => {
    (async () =>
      setChain(await api<Chain>(`/api/v1/market/option-chain?underlying=${underlying}&depth=6`)))();
  }, [underlying]);
  return (
    <Card title="Option Chain Engine">
      <div className="mb-4 flex gap-2">
        {["NIFTY", "BANKNIFTY", "FINNIFTY"].map((u) => (
          <button
            key={u}
            onClick={() => setUnderlying(u)}
            className={`rounded px-3 py-1 text-xs ${underlying === u ? "bg-indigo-500" : "bg-slate-800 text-slate-400"}`}
          >
            {u}
          </button>
        ))}
      </div>
      {chain && (
        <>
          <div className="mb-3 flex gap-6 text-sm text-slate-300">
            <span>Spot: {chain.spot}</span>
            <span>ATM: {chain.atmStrike}</span>
            <span>PCR: {chain.pcr}</span>
            <span>Max Pain: {chain.maxPain}</span>
          </div>
          <table className="w-full text-center text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="py-1">Call OI</th>
                <th>Call LTP</th>
                <th>IV</th>
                <th className="bg-slate-800">Strike</th>
                <th>IV</th>
                <th>Put LTP</th>
                <th>Put OI</th>
              </tr>
            </thead>
            <tbody>
              {chain.rows.map((r) => (
                <tr key={r.strike} className={`border-t border-slate-800 ${r.strike === chain.atmStrike ? "bg-indigo-950/40" : ""}`}>
                  <td className="py-1 text-emerald-300">{r.call.oi.toLocaleString()}</td>
                  <td>{r.call.ltp}</td>
                  <td className="text-slate-500">{r.call.iv}</td>
                  <td className="bg-slate-800 font-semibold">{r.strike}</td>
                  <td className="text-slate-500">{r.put.iv}</td>
                  <td>{r.put.ltp}</td>
                  <td className="text-rose-300">{r.put.oi.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}

function IndicatorsPanel() {
  const [symbol, setSymbol] = useState("RELIANCE");
  type Ind = { latest: Record<string, number>; count: number };
  const [data, setData] = useState<Ind | null>(null);
  useEffect(() => {
    (async () =>
      setData(await api<Ind>(`/api/v1/market/indicators?symbol=${symbol}&timeframe=1D`)))();
  }, [symbol]);
  return (
    <Card title="Indicator Engine">
      <div className="mb-4 flex gap-2">
        {["RELIANCE", "TCS", "HDFCBANK", "INFY", "SBIN"].map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className={`rounded px-3 py-1 text-xs ${symbol === s ? "bg-indigo-500" : "bg-slate-800 text-slate-400"}`}
          >
            {s}
          </button>
        ))}
      </div>
      {data && (
        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          {Object.entries(data.latest).map(([k, v]) => (
            <div key={k} className="rounded bg-slate-800/50 px-3 py-2">
              <div className="text-xs uppercase text-slate-500">{k}</div>
              <div className="font-mono">{Number.isFinite(v) ? Number(v).toFixed(2) : "—"}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NewsPanel() {
  type News = { id: number; headline: string; source: string; category: string; impact: string };
  const [news, setNews] = useState<News[]>([]);
  useEffect(() => {
    (async () => setNews(await api<News[]>("/api/v1/market/news?limit=30")))();
  }, []);
  return (
    <Card title="News Intelligence">
      <ul className="space-y-2 text-sm">
        {news.map((n) => (
          <li key={n.id} className="flex items-start gap-3 rounded bg-slate-800/40 px-3 py-2">
            <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs">{n.source}</span>
            <span className="flex-1">{n.headline}</span>
            <span
              className={`text-xs ${
                n.impact === "HIGH" ? "text-rose-400" : n.impact === "MEDIUM" ? "text-amber-400" : "text-slate-500"
              }`}
            >
              {n.impact}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
