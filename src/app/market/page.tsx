"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/app/lib/api-client";
import { CandleChart, type Candle } from "@/components/CandleChart";
import { Badge, Card, EmptyState, ErrorState, Spinner } from "@/components/ui";

interface MdSymbol {
  id: number;
  symbol: string;
  name: string | null;
  sector: string | null;
  instrumentType: string;
}

interface IndicatorSnapshot {
  latest: Record<string, number>;
}

const TIMEFRAMES = ["5m", "15m", "1D"] as const;

export default function MarketWatchPage() {
  const [symbols, setSymbols] = useState<MdSymbol[]>([]);
  const [selected, setSelected] = useState<string>("RELIANCE");
  const [timeframe, setTimeframe] = useState<string>("1D");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bootstrap market data (idempotent) then load the symbol universe.
  useEffect(() => {
    (async () => {
      try {
        await api.post("/api/v1/market/bootstrap");
        const list = await api.get<MdSymbol[]>("/api/v1/market/symbols?type=EQ");
        setSymbols(list);
        if (list.length && !list.find((s) => s.symbol === selected)) {
          setSelected(list[0].symbol);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load symbols");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChart = useCallback(async () => {
    setChartLoading(true);
    try {
      const [hist, ind] = await Promise.all([
        api.get<{ candles: Candle[] }>(
          `/api/v1/market/history?symbol=${selected}&timeframe=${timeframe}&limit=120`,
        ),
        api.get<IndicatorSnapshot>(
          `/api/v1/market/indicators?symbol=${selected}&timeframe=${timeframe}`,
        ),
      ]);
      setCandles(hist.candles);
      setIndicators(ind.latest);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chart");
    } finally {
      setChartLoading(false);
    }
  }, [selected, timeframe]);

  useEffect(() => {
    void loadChart();
  }, [loadChart]);

  const fmt = (v: number | undefined) =>
    v === undefined || Number.isNaN(v) ? "—" : Number(v).toFixed(2);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <h1 className="mb-4 text-2xl font-bold">Market Watch</h1>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card title="Symbols">
          {loading ? (
            <Spinner />
          ) : error && symbols.length === 0 ? (
            <ErrorState message={error} />
          ) : symbols.length === 0 ? (
            <EmptyState message="No symbols found." />
          ) : (
            <ul className="max-h-[70vh] space-y-1 overflow-auto">
              {symbols.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelected(s.symbol)}
                    className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition ${
                      selected === s.symbol
                        ? "bg-indigo-500/20 text-indigo-200"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span className="font-medium">{s.symbol}</span>
                    {s.sector && <Badge>{s.sector}</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card
            title={`${selected} · ${timeframe}`}
            actions={
              <div className="flex gap-1">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`rounded px-2.5 py-1 text-xs ${
                      timeframe === tf ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            }
          >
            {chartLoading ? <Spinner label="Loading chart…" /> : <CandleChart candles={candles} />}
          </Card>

          <Card title="Indicators">
            {indicators ? (
              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                {Object.entries(indicators).map(([k, v]) => (
                  <div key={k} className="rounded bg-slate-800/50 px-3 py-2">
                    <div className="text-xs uppercase text-slate-500">{k}</div>
                    <div className="font-mono">{fmt(v)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <Spinner />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
