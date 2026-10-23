import React, { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPercent, formatUSD } from '../../services/strikeApi';

interface RechartsEquityAreaProps {
  equityCurve: [number, string][];
  pnlCurve?: [number, string][];
  mode?: 'equity' | 'pnl' | 'roi';
  height?: number;
  title?: string;
  showAxes?: boolean;
}

export const RechartsEquityArea: React.FC<RechartsEquityAreaProps> = ({
  equityCurve,
  pnlCurve = [],
  mode = 'equity',
  height = 260,
  title,
  showAxes = true,
}) => {
  const rawId = useId();
  const gradientId = useMemo(() => `equity-grad-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);

  const chartData = useMemo(() => {
    if (!equityCurve || equityCurve.length === 0) return [];

    const baseEquity = parseFloat(equityCurve[0][1]) || 1;

    // Create a fast timestamp lookup for pnl curve
    const pnlMap = new Map<number, number>();
    if (pnlCurve && pnlCurve.length > 0) {
      pnlCurve.forEach(([ts, val]) => {
        pnlMap.set(ts, parseFloat(val) || 0);
      });
    }

    return equityCurve.map(([ts, eqStr], idx) => {
      const eq = parseFloat(eqStr) || 0;
      const date = new Date(ts);
      const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      const fullDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      let pnl = 0;
      if (pnlMap.has(ts)) {
        pnl = pnlMap.get(ts)!;
      } else if (pnlCurve && pnlCurve[idx]) {
        pnl = parseFloat(pnlCurve[idx][1]) || 0;
      } else {
        pnl = eq - baseEquity;
      }

      const roiPct = baseEquity > 0 ? ((eq - baseEquity) / baseEquity) * 100 : 0;

      return {
        timestamp: ts,
        dateLabel,
        fullDate,
        equity: eq,
        pnl,
        roiPct,
        value: mode === 'equity' ? eq : mode === 'pnl' ? pnl : roiPct,
      };
    });
  }, [equityCurve, pnlCurve, mode]);

  const { isPositive, strokeColor, fillColor } = useMemo(() => {
    if (chartData.length < 2) {
      return { isPositive: true, strokeColor: '#00f29d', fillColor: '#00f29d' };
    }

    if (mode === 'pnl') {
      const lastPnl = chartData[chartData.length - 1].pnl;
      const pos = lastPnl >= 0;
      return {
        isPositive: pos,
        strokeColor: pos ? '#00f29d' : '#ffb4ab',
        fillColor: pos ? '#00f29d' : '#ffb4ab',
      };
    }

    if (mode === 'roi') {
      const lastRoi = chartData[chartData.length - 1].roiPct;
      const pos = lastRoi >= 0;
      return {
        isPositive: pos,
        strokeColor: pos ? '#00f29d' : '#ffb4ab',
        fillColor: pos ? '#00f29d' : '#ffb4ab',
      };
    }

    // Equity mode
    const firstEq = chartData[0].equity;
    const lastEq = chartData[chartData.length - 1].equity;
    const pos = lastEq >= firstEq;
    return {
      isPositive: pos,
      strokeColor: '#00f29d', // Strike Mint
      fillColor: '#00f29d',
    };
  }, [chartData, mode]);

  if (chartData.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-xs font-mono text-slate-500">
        Insufficient performance curve data points
      </div>
    );
  }

  // Custom sleek dark tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0b0e14]/95 border border-[#272a31] backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-2xl text-xs font-mono min-w-48 z-50">
          <div className="text-[11px] text-slate-400 pb-1.5 border-b border-[#272a31] mb-2 flex justify-between items-center">
            <span>{data.fullDate}</span>
          </div>

          <div className="space-y-1.5">
            {mode === 'equity' ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Equity Value:</span>
                  <span className="text-white font-bold">{formatUSD(data.equity)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Cumulative PnL:</span>
                  <span
                    className={`font-bold ${
                      data.pnl >= 0 ? 'text-[#00f29d]' : 'text-[#ffb4ab]'
                    }`}
                  >
                    {data.pnl >= 0 ? '+' : ''}{formatUSD(data.pnl)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Period Return:</span>
                  <span
                    className={`font-bold ${
                      data.roiPct >= 0 ? 'text-[#00f29d]' : 'text-[#ffb4ab]'
                    }`}
                  >
                    {formatPercent(data.roiPct / 100)}
                  </span>
                </div>
              </>
            ) : mode === 'pnl' ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Cumulative PnL:</span>
                  <span
                    className={`font-bold text-sm ${
                      data.pnl >= 0 ? 'text-[#00f29d]' : 'text-[#ffb4ab]'
                    }`}
                  >
                    {data.pnl >= 0 ? '+' : ''}{formatUSD(data.pnl)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Equity Value:</span>
                  <span className="text-white font-medium">{formatUSD(data.equity)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Period Return:</span>
                  <span
                    className={`font-bold ${
                      data.roiPct >= 0 ? 'text-[#00f29d]' : 'text-[#ffb4ab]'
                    }`}
                  >
                    {formatPercent(data.roiPct / 100)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Period Return:</span>
                  <span
                    className={`font-bold text-sm ${
                      data.roiPct >= 0 ? 'text-[#00f29d]' : 'text-[#ffb4ab]'
                    }`}
                  >
                    {formatPercent(data.roiPct / 100)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Cumulative PnL:</span>
                  <span
                    className={`font-bold ${
                      data.pnl >= 0 ? 'text-[#00f29d]' : 'text-[#ffb4ab]'
                    }`}
                  >
                    {data.pnl >= 0 ? '+' : ''}{formatUSD(data.pnl)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Equity Value:</span>
                  <span className="text-white font-medium">{formatUSD(data.equity)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col">
      {title && (
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-xs text-white">{title}</span>
          <span className="font-mono text-[11px] text-slate-400">
            Current: {mode === 'pnl' ? formatUSD(chartData[chartData.length - 1].pnl) : formatUSD(chartData[chartData.length - 1].equity)}
          </span>
        </div>
      )}

      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: showAxes ? -15 : 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={fillColor} stopOpacity={0.22} />
                <stop offset="95%" stopColor={fillColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e232e"
              vertical={false}
            />

            {showAxes && (
              <>
                <XAxis
                  dataKey="dateLabel"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#1e232e' }}
                  fontFamily="JetBrains Mono, monospace"
                  interval="preserveStartEnd"
                  minTickGap={35}
                />

                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="JetBrains Mono, monospace"
                  domain={['auto', 'auto']}
                  tickFormatter={(val) =>
                    mode === 'roi'
                      ? `${val >= 0 ? '+' : ''}${val.toFixed(0)}%`
                      : formatUSD(val, true)
                  }
                />
              </>
            )}

            {(mode === 'pnl' || mode === 'roi') && (
              <ReferenceLine y={0} stroke="#3b4a40" strokeDasharray="3 3" />
            )}

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              isAnimationActive={true}
              animationDuration={600}
              activeDot={{
                r: 4.5,
                fill: strokeColor,
                stroke: '#0b0e14',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
