// AITradeMinds — SVG candlestick chart. Zero-dependency, responsive, accessible.
"use client";

export interface Candle {
  ts: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function CandleChart({
  candles,
  height = 320,
  width = 900,
}: {
  candles: Candle[];
  height?: number;
  width?: number;
}) {
  if (candles.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No candle data.</p>;
  }

  const padding = { top: 10, right: 50, bottom: 20, left: 10 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const range = max - min || 1;

  const y = (v: number) => padding.top + ((max - v) / range) * plotH;
  const slot = plotW / candles.length;
  const bodyW = Math.max(1, slot * 0.6);

  const gridLines = 4;
  const grid = Array.from({ length: gridLines + 1 }, (_, i) => {
    const v = max - (range * i) / gridLines;
    return { v, y: y(v) };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Price candlestick chart"
      preserveAspectRatio="xMidYMid meet"
    >
      {grid.map((g, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            x2={padding.left + plotW}
            y1={g.y}
            y2={g.y}
            stroke="#1e293b"
            strokeWidth={1}
          />
          <text x={padding.left + plotW + 6} y={g.y + 3} fontSize={10} fill="#64748b">
            {g.v.toFixed(2)}
          </text>
        </g>
      ))}
      {candles.map((c, i) => {
        const cx = padding.left + slot * i + slot / 2;
        const up = c.close >= c.open;
        const color = up ? "#34d399" : "#f87171";
        const yOpen = y(c.open);
        const yClose = y(c.close);
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(1, Math.abs(yClose - yOpen));
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
            <rect
              x={cx - bodyW / 2}
              y={bodyTop}
              width={bodyW}
              height={bodyH}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}
