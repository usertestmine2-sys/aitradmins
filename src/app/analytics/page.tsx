"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { api, getToken } from "@/app/lib/api-client";
import { useAuth } from "@/app/lib/auth-context";
import { Badge, Button, Card, EmptyState, ErrorState, Spinner } from "@/components/ui";
import { BarSeries, Gauge, Heatmap, Radar, StatTile } from "@/components/charts";

interface DashboardData {
  brain: {
    health: { score: number; grade: string; signals: Record<string, number>; notes: string[] };
    memory: Record<string, number>;
    knowledgeGrowth: number;
    topRelationships: Array<{ rel: string; confidence: number }>;
    reputation: Array<{ modelKey: string; regime: string; winRate: number; influence: number; sharpe: number }>;
    openRecommendations: number;
  };
  market: {
    session: { state: string; istTime: string };
    breadth: { nifty: { advances: number; declines: number; breadthPct: number }; banknifty: { advances: number; declines: number; breadthPct: number } };
    sectorRotation: Array<{ sector: string; avgChangePct: number }>;
    rotatingInto: string[];
    rotatingOut: string[];
  };
  training: { totalModels: number; activeModels: number; pendingApproval: number; datasets: number };
  broker: { brokers: Array<{ broker: string; state: string; health: { state: string } }> };
  system: { providers: { active: string | null }; cache: { hits: number; misses: number; size: number }; counts: { symbols: number; candles: number; news: number } };
  learning: { perModel: Array<{ modelKey: string; wins: number; losses: number; total: number; winRate: number }> };
  strategy: { available: boolean; note?: string };
  paperTrading: { available: boolean; note?: string };
  risk: { available: boolean; note?: string };
}

const TABS = [
  "Brain", "Learning", "Models", "Training", "Market",
  "Broker", "Operations", "Strategy", "Paper Trading", "Risk", "Reports",
] as const;
type Tab = (typeof TABS)[number];

function Pending({ note }: { note?: string }) {
  return (
    <Card title="Awaiting upstream module">
      <EmptyState message={note ?? "This dashboard activates when its data source is built (Phase 7/8)."} />
    </Card>
  );
}

export default function AnalyticsPage() {
  // Use a state to track client-side rendering
  const [isClient, setIsClient] = useState(false);
  const auth = useAuth();
  const { user, loading: authLoading } = auth;
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<Tab>("Brain");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const load = useCallback(async () => {
    try {
      await api.post("/api/v1/market/bootstrap");
      setData(await api.get<DashboardData>("/api/v1/dashboard"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isClient && !authLoading && getToken()) void load();
    else if (isClient && !authLoading) setLoading(false);
  }, [isClient, authLoading, load]);

  if (!isClient) return null; // Or a loading skeleton

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Card title="Sign in required">
          <EmptyState message="Analytics dashboards require an authenticated account." />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics & Reporting</h1>
        {data && (
          <Badge tone={data.brain.health.grade === "EXCELLENT" ? "up" : "warn"}>
            Brain: {data.brain.health.grade}
          </Badge>
        )}
      </div>

      {loading ? (
        <Spinner label="Loading dashboards…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <EmptyState message="No analytics data." />
      ) : (
        <>
          <nav className="mb-6 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  tab === t ? "bg-indigo-500 text-white" : "border border-slate-800 text-slate-400 hover:text-slate-100"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          {tab === "Brain" && <BrainTab data={data} />}
          {tab === "Learning" && <LearningTab data={data} />}
          {tab === "Models" && <ModelsTab data={data} />}
          {tab === "Training" && <TrainingTab data={data} />}
          {tab === "Market" && <MarketTab data={data} />}
          {tab === "Broker" && <BrokerTab data={data} />}
          {tab === "Operations" && <OperationsTab data={data} />}
          {tab === "Strategy" && <Pending note={data.strategy.note} />}
          {tab === "Paper Trading" && <Pending note={data.paperTrading.note} />}
          {tab === "Risk" && <Pending note={data.risk.note} />}
          {tab === "Reports" && <ReportsTab isAdmin={user?.roles.includes("admin") ?? false} />}
        </>
      )}
    </div>
  );
}

function BrainTab({ data }: { data: DashboardData }) {
  const b = data.brain;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Brain Health">
        <div className="flex justify-center">
          <Gauge value={b.health.score} label={b.health.grade} />
        </div>
        <ul className="mt-2 space-y-1 text-xs text-slate-400">
          {b.health.notes.map((n, i) => <li key={i}>• {n}</li>)}
        </ul>
      </Card>
      <Card title="Memory & Knowledge">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(b.memory).map(([k, v]) => <StatTile key={k} label={k} value={v} />)}
          <StatTile label="Knowledge Edges" value={b.knowledgeGrowth} />
          <StatTile label="Open Recs" value={b.openRecommendations} />
        </div>
      </Card>
      <Card title="Top Knowledge Relationships">
        {b.topRelationships.length === 0 ? (
          <EmptyState message="No learned relationships yet." />
        ) : (
          <BarSeries data={b.topRelationships.map((r) => ({ label: r.rel, value: r.confidence }))} />
        )}
      </Card>
    </div>
  );
}

function LearningTab({ data }: { data: DashboardData }) {
  return (
    <Card title="Learning — Win Rate per Model">
      <BarSeries data={data.learning.perModel.map((m) => ({ label: m.modelKey, value: m.winRate }))} />
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {data.learning.perModel.map((m) => (
          <StatTile key={m.modelKey} label={m.modelKey} value={`${m.wins}/${m.total}`} tone={m.winRate >= 0.5 ? "up" : "down"} />
        ))}
      </div>
    </Card>
  );
}

function ModelsTab({ data }: { data: DashboardData }) {
  const reps = data.brain.reputation;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Model Reputation (influence)">
        {reps.length === 0 ? (
          <EmptyState message="No reputation yet — feed trade outcomes to the Brain." />
        ) : (
          <BarSeries data={reps.map((r) => ({ label: `${r.modelKey}/${r.regime}`, value: r.influence }))} />
        )}
      </Card>
      <Card title="Reputation Radar (win-rate / influence / sharpe)">
        {reps.length === 0 ? (
          <EmptyState message="Awaiting outcomes." />
        ) : (
          <div className="flex justify-center">
            <Radar
              axes={[
                { label: "WinRate", value: reps[0].winRate },
                { label: "Influence", value: Math.min(1, reps[0].influence / 2) },
                { label: "Sharpe", value: Math.min(1, Math.max(0, reps[0].sharpe / 5)) },
              ]}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function TrainingTab({ data }: { data: DashboardData }) {
  const t = data.training;
  return (
    <Card title="Training Overview">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Total Models" value={t.totalModels} />
        <StatTile label="Active" value={t.activeModels} tone="up" />
        <StatTile label="Pending Approval" value={t.pendingApproval} tone="down" />
        <StatTile label="Datasets" value={t.datasets} />
      </div>
    </Card>
  );
}

function MarketTab({ data }: { data: DashboardData }) {
  const m = data.market;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Sector Rotation Heatmap">
        <Heatmap cells={m.sectorRotation.map((s) => ({ label: s.sector, value: s.avgChangePct }))} />
        <p className="mt-3 text-xs text-slate-400">
          Into: <span className="text-emerald-400">{m.rotatingInto.join(", ")}</span> · Out:{" "}
          <span className="text-rose-400">{m.rotatingOut.join(", ")}</span>
        </p>
      </Card>
      <Card title="Market Breadth">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="NIFTY ▲" value={m.breadth.nifty.advances} tone="up" />
          <StatTile label="NIFTY ▼" value={m.breadth.nifty.declines} tone="down" />
          <StatTile label="BANKNIFTY ▲" value={m.breadth.banknifty.advances} tone="up" />
          <StatTile label="BANKNIFTY ▼" value={m.breadth.banknifty.declines} tone="down" />
        </div>
        <p className="mt-3 text-xs text-slate-400">Session: {m.session.state} · IST {m.session.istTime}</p>
      </Card>
    </div>
  );
}

function BrokerTab({ data }: { data: DashboardData }) {
  return (
    <Card title="Broker Foundation">
      {data.broker.brokers.length === 0 ? (
        <EmptyState message="No brokers initialized (visit broker control plane to bootstrap)." />
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400"><tr><th className="py-1">Broker</th><th>State</th><th>Health</th></tr></thead>
          <tbody>
            {data.broker.brokers.map((b) => (
              <tr key={b.broker} className="border-t border-slate-800">
                <td className="py-1 font-medium">{b.broker}</td>
                <td>{b.state}</td>
                <td><Badge tone={b.health.state === "UP" ? "up" : b.health.state === "DEGRADED" ? "warn" : "down"}>{b.health.state}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function OperationsTab({ data }: { data: DashboardData }) {
  const s = data.system;
  const hitRatio = s.cache.hits + s.cache.misses > 0 ? (s.cache.hits / (s.cache.hits + s.cache.misses)) * 100 : 0;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="System Metrics">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <StatTile label="Symbols" value={s.counts.symbols} />
          <StatTile label="Candles" value={s.counts.candles} />
          <StatTile label="News" value={s.counts.news} />
          <StatTile label="Cache Size" value={s.cache.size} />
          <StatTile label="Provider" value={s.providers.active ?? "—"} />
        </div>
      </Card>
      <Card title="Cache Hit Ratio">
        <div className="flex justify-center"><Gauge value={hitRatio} label="cache %" /></div>
      </Card>
    </div>
  );
}

function ReportsTab({ isAdmin }: { isAdmin: boolean }) {
  type Report = { id: number; kind: string; title: string; createdAt: string };
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setReports((await api.get<{ reports: Report[] }>("/api/v1/reports")).reports);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const generate = async (kind: string) => {
    setBusy(true);
    try { await api.post("/api/v1/reports", { kind }); await refresh(); }
    finally { setBusy(false); }
  };

  const exportCsv = async (id: number) => {
    const res = await fetch(`/api/v1/reports?id=${id}&format=csv`, {
      headers: { authorization: `Bearer ${getToken() ?? ""}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      title="Reports"
      actions={isAdmin ? (
        <div className="flex gap-1">
          {["DAILY", "BRAIN", "TRAINING", "MARKET"].map((k) => (
            <Button key={k} variant="ghost" loading={busy} onClick={() => void generate(k)}>{k}</Button>
          ))}
        </div>
      ) : null}
    >
      {reports.length === 0 ? (
        <EmptyState message="No reports generated yet." />
      ) : (
        <ul className="space-y-1 text-sm">
          {reports.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded bg-slate-800/40 px-3 py-2">
              <span><Badge>{r.kind}</Badge> <span className="ml-2 text-slate-300">{r.title}</span></span>
              <button
                onClick={() => void exportCsv(r.id)}
                className="text-xs text-indigo-400 hover:underline"
              >
                Export CSV
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
