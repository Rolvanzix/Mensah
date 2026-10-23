import React, { useMemo, useState } from 'react';
import { formatUSD } from '../services/strikeApi';

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  data: [number, number][]; // [timestamp_ms, value]
}

interface DetailedChartProps {
  series: ChartSeries[];
  height?: number;
  formatValue?: (val: number) => string;
  showZeroLine?: boolean;
}

export const DetailedChart: React.FC<DetailedChartProps> = ({
  series,
  height = 280,
  formatValue = (v) => formatUSD(v, true),
  showZeroLine = false,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { minVal, maxVal, timestamps, primaryDataLength } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let primaryLen = 0;
    const allTs: number[] = [];

    series.forEach((s) => {
      if (s.data.length > primaryLen) {
        primaryLen = s.data.length;
      }
      s.data.forEach(([ts, val]) => {
        allTs.push(ts);
        if (val < min) min = val;
        if (val > max) max = val;
      });
    });

    if (min === Infinity) {
      return { minVal: 0, maxVal: 1, timestamps: [], primaryDataLength: 0 };
    }

    if (showZeroLine) {
      if (min > 0) min = 0;
      if (max < 0) max = 0;
    }

    // Add a 5% margin top and bottom for breathing room
    const span = max - min || 1;
    min -= span * 0.05;
    max += span * 0.05;

    return { minVal: min, maxVal: max, timestamps: allTs, primaryDataLength: primaryLen };
  }, [series, showZeroLine]);

  const chartPaths = useMemo(() => {
    const width = 800; // virtual SVG width
    const range = maxVal - minVal || 1;
    const paddingY = 20;
    const drawHeight = height - paddingY * 2;

    return series.map((s) => {
      if (s.data.length < 2) return { ...s, pathD: '', areaD: '', points: [] };

      const pts = s.data.map(([ts, val], idx) => {
        const x = (idx / (s.data.length - 1)) * width;
        const y = height - paddingY - ((val - minVal) / range) * drawHeight;
        return { x, y, ts, val };
      });

      const path = pts.reduce(
        (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
        ''
      );
      const area = `${path} L ${width} ${height - paddingY} L 0 ${height - paddingY} Z`;

      return {
        ...s,
        pathD: path,
        areaD: area,
        points: pts,
      };
    });
  }, [series, minVal, maxVal, height]);

  // Compute zero line Y position if requested
  const zeroLineY = useMemo(() => {
    if (!showZeroLine) return null;
    const range = maxVal - minVal || 1;
    const paddingY = 20;
    const drawHeight = height - paddingY * 2;
    return height - paddingY - ((0 - minVal) / range) * drawHeight;
  }, [minVal, maxVal, height, showZeroLine]);

  // Grid line values
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 4;
    for (let i = 0; i <= count; i++) {
      const val = minVal + ((maxVal - minVal) * i) / count;
      const y = height - 20 - (i / count) * (height - 40);
      ticks.push({ val, y });
    }
    return ticks;
  }, [minVal, maxVal, height]);

  // Date ticks (5 points across timeline)
  const xTicks = useMemo(() => {
    const primary = series[0]?.data;
    if (!primary || primary.length === 0) return [];
    const step = Math.floor((primary.length - 1) / 4) || 1;
    const ticks = [];
    for (let i = 0; i < primary.length; i += step) {
      const [ts] = primary[i];
      const d = new Date(ts);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const x = (i / (primary.length - 1)) * 800;
      ticks.push({ label, x, ts });
    }
    return ticks;
  }, [series]);

  const activePoints = useMemo(() => {
    if (hoverIndex === null) return [];
    return chartPaths.map((cp) => {
      const pt = cp.points[Math.min(hoverIndex, cp.points.length - 1)];
      return {
        seriesId: cp.id,
        name: cp.name,
        color: cp.color,
        val: pt ? pt.val : 0,
        ts: pt ? pt.ts : 0,
        x: pt ? pt.x : 0,
        y: pt ? pt.y : 0,
      };
    });
  }, [chartPaths, hoverIndex]);

  const activeDate = activePoints[0]?.ts
    ? new Date(activePoints[0].ts).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="relative w-full select-none" onMouseLeave={() => setHoverIndex(null)}>
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3 text-xs">
        <div className="flex items-center gap-4">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 font-medium text-slate-300">
              <span
                className="w-2.5 h-0.5 rounded-full inline-block"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
        {activeDate && (
          <div className="font-mono text-xs text-slate-400">
            <span>{activeDate}</span>
          </div>
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 800 ${height}`}
          className="w-full h-auto overflow-visible"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, mouseX / rect.width));
            const idx = Math.round(ratio * (primaryDataLength - 1));
            setHoverIndex(idx);
          }}
        >
          {/* Horizontal Gridlines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1="0"
                y1={tick.y}
                x2="800"
                y2={tick.y}
                stroke="#1E293B"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x="8"
                y={tick.y - 4}
                fill="#64748B"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {formatValue(tick.val)}
              </text>
            </g>
          ))}

          {/* Zero Line if applicable */}
          {zeroLineY !== null && zeroLineY >= 0 && zeroLineY <= height && (
            <line
              x1="0"
              y1={zeroLineY}
              x2="800"
              y2={zeroLineY}
              stroke="#475569"
              strokeWidth="1.25"
            />
          )}

          {/* Series Areas and Paths */}
          {chartPaths.map((s) => {
            const gradId = `detail-grad-${s.id}`;
            return (
              <g key={s.id}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <path d={s.areaD} fill={`url(#${gradId})`} />
                <path
                  d={s.pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Hover Crosshair & Dots */}
          {activePoints.length > 0 && (
            <g>
              <line
                x1={activePoints[0].x}
                y1={10}
                x2={activePoints[0].x}
                y2={height - 20}
                stroke="#64748B"
                strokeWidth="1.2"
                strokeDasharray="3,3"
              />
              {activePoints.map((pt) => (
                <circle
                  key={pt.seriesId}
                  cx={pt.x}
                  cy={pt.y}
                  r="4.5"
                  fill={pt.color}
                  stroke="#0B0F17"
                  strokeWidth="2.5"
                />
              ))}
            </g>
          )}

          {/* X Axis Date labels */}
          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={tick.x}
              y={height - 4}
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
              fill="#64748B"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              {tick.label}
            </text>
          ))}
        </svg>

        {/* Floating Tooltip Box */}
        {activePoints.length > 0 && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-4 z-20 bg-slate-900/95 backdrop-blur border border-slate-700 p-2 rounded shadow-xl min-w-36 text-xs transform -translate-x-1/2"
            style={{
              left: `${Math.min(Math.max((activePoints[0].x / 800) * 100, 15), 85)}%`,
            }}
          >
            <div className="text-[10px] text-slate-400 mb-1 font-mono border-b border-slate-800 pb-1">
              {activeDate}
            </div>
            <div className="space-y-1">
              {activePoints.map((p) => (
                <div key={p.seriesId} className="flex items-center justify-between gap-3 font-mono">
                  <span className="text-[11px] text-slate-300 flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </span>
                  <span
                    className={`font-semibold ${
                      p.val > 0
                        ? 'text-emerald-400'
                        : p.val < 0
                        ? 'text-rose-400'
                        : 'text-slate-200'
                    }`}
                  >
                    {formatValue(p.val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
