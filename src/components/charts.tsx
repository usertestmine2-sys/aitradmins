// AITradeMinds — Zero-dependency SVG visualization library for analytics.
// Line, bar, radar, heatmap, gauge, calibration curve. Accessible + dark-mode.
"use client";

export function LineSeries({
  values,
  height = 120,
  width = 320,
  color = "#818cf8",
  label,
}: {
  values: number[];
  height?: number;
  width?: number;
  color?: string;
  label?: string;
}) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) {
    return <p className="py-6 text-center text-xs text-slate-500">Not enough data</p>;
  }
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const step = width / (clean.length - 1);
  const points = clean
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={label ?? "line chart"}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

export function BarSeries({
  data,
  height = 160,
  color = "#34d399",
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
}) {
  if (data.length === 0) return <p className="py-6 text-center text-xs text-slate-500">No data</p>;
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div className="space-y-1.5" role="img" aria-label="bar chart">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-28 shrink-0 truncate text-slate-400">{d.label}</span>
          <div className="h-4 flex-1 rounded bg-slate-800">
            <div
              className="h-4 rounded"
              style={{
                width: `${(Math.abs(d.value) / max) * 100}%`,
                backgroundColor: d.value < 0 ? "#f87171" : color,
              }}
            />
          </div>
          <span className="w-16 shrink-0 text-right font-mono text-slate-300">
            {d.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Gauge({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const angle = pct * 180;
  const color = pct >= 0.9 ? "#34d399" : pct >= 0.7 ? "#818cf8" : pct >= 0.5 ? "#fbbf24" : "#f87171";
  const cx = 60;
  const cy = 60;
  const r = 50;
  const rad = (Math.PI * (180 - angle)) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy - r * Math.sin(rad);
  return (
    <div className="flex flex-col items-center" role="img" aria-label={`${label} gauge`}>
      <svg viewBox="0 0 120 70" className="w-40">
        <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="#1e293b" strokeWidth={8} />
        <path
          d={`M10,60 A50,50 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}`}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
        />
        <text x="60" y="55" textAnchor="middle" fontSize="20" fill={color} fontWeight="bold">
          {Math.round(value)}
        </text>
      </svg>
      <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
}

export function Radar({
  axes,
  size = 200,
}: {
  axes: Array<{ label: string; value: number }>;
  size?: number;
}) {
  if (axes.length < 3) return <p className="py-6 text-center text-xs text-slate-500">Radar needs 3+ axes</p>;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 30;
  const n = axes.length;
  const point = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = r * Math.max(0, Math.min(1, val));
    return `${(cx + rr * Math.cos(angle)).toFixed(1)},${(cy + rr * Math.sin(angle)).toFixed(1)}`;
  };
  const poly = axes.map((a, i) => point(i, a.value)).join(" ");
  const grid = [0.25, 0.5, 0.75, 1].map((g) => axes.map((_, i) => point(i, g)).join(" "));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[220px]" role="img" aria-label="radar chart">
      {grid.map((g, i) => (
        <polygon key={i} points={g} fill="none" stroke="#1e293b" strokeWidth={1} />
      ))}
      <polygon points={poly} fill="rgba(129,140,248,0.25)" stroke="#818cf8" strokeWidth={2} />
      {axes.map((a, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + (r + 14) * Math.cos(angle);
        const ly = cy + (r + 14) * Math.sin(angle);
        return (
          <text key={a.label} x={lx} y={ly} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

export function Heatmap({
  cells,
}: {
  cells: Array<{ label: string; value: number }>;
}) {
  if (cells.length === 0) return <p className="py-6 text-center text-xs text-slate-500">No data</p>;
  const max = Math.max(...cells.map((c) => Math.abs(c.value)), 0.0001);
  const color = (v: number) => {
    const intensity = Math.min(1, Math.abs(v) / max);
    return v >= 0
      ? `rgba(52,211,153,${0.15 + intensity * 0.7})`
      : `rgba(248,113,113,${0.15 + intensity * 0.7})`;
  };
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3" role="img" aria-label="heatmap">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded p-2 text-center"
          style={{ backgroundColor: color(c.value) }}
        >
          <div className="truncate text-xs text-slate-100">{c.label}</div>
          <div className="font-mono text-sm font-semibold text-white">{c.value.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}

export function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "up" | "down";
}) {
  const toneColor =
    tone === "up" ? "text-emerald-400" : tone === "down" ? "text-rose-400" : "text-slate-100";
  return (
    <div className="rounded-lg bg-slate-800/50 px-3 py-2">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-mono text-lg font-semibold ${toneColor}`}>{value}</div>
    </div>
  );
}
