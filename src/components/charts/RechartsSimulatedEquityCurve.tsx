import React, { useId, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SimulationResult } from '../../types/strike';
import { formatPercent, formatUSD } from '../../services/strikeApi';

interface RechartsSimulatedEquityCurveProps {
  recommendedResult: SimulationResult;
  comparisonResult?: SimulationResult;
  initialCapital: number;
  height?: number;
}

export const RechartsSimulatedEquityCurve: React.FC<RechartsSimulatedEquityCurveProps> = ({
  recommendedResult,
  comparisonResult,
  initialCapital,
  height = 280,
}) => {
  const [viewStyle, setViewStyle] = useState<'recommended' | 'comparison'>('recommended');
  const rawId = useId();
  const gradientId = useMemo(() => `sim-grad-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);

  const chartData = useMemo(() => {
    if (!recommendedResult.curve || recommendedResult.curve.length === 0) return [];

    return recommendedResult.curve.map((recPt, idx) => {
      const compPt = comparisonResult?.curve[idx] || recPt;
      const date = new Date(recPt.timestamp);
      const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      const fullDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        timestamp: recPt.timestamp,
        dateLabel,
        fullDate,
        simulatedEquity: Math.round(recPt.simulatedEquity),
        netPnL: recPt.simulatedPnL,
        roiPct: initialCapital > 0 ? (recPt.simulatedPnL / initialCapital) * 100 : 0,
        drawdownPct: recPt.drawdownPct,
        compEquity: Math.round(compPt.simulatedEquity),
        compPnL: compPt.simulatedPnL,
      };
    });
  }, [recommendedResult, comparisonResult, initialCapital]);

  const isPositive = recommendedResult.netPnL >= 0;
  const strokeColor = isPositive ? '#00f29d' : '#ffb4ab';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0b0e14]/95 border border-[#272a31] backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-2xl text-xs font-mono min-w-52 z-50">
          <div className="text-[11px] text-slate-400 pb-1.5 border-b border-[#272a31] mb-2 flex justify-between items-center">
            <span>{data.fullDate}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Simulated Equity:</span>
              <span className="text-white font-bold">{formatUSD(data.simulatedEquity)}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Simulated PnL:</span>
              <span
                className={`font-bold ${
                  data.netPnL >= 0 ? 'text-[#00f29d]' : 'text-[#ffb4ab]'
                }`}
              >
                {data.netPnL >= 0 ? '+' : ''}{formatUSD(data.netPnL)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Net Return:</span>
              <span
                className={`font-bold ${
                  data.roiPct >= 0 ? 'text-[#00f29d]' : 'text-[#ffb4ab]'
                }`}
              >
                {formatPercent(data.roiPct / 100)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 text-slate-400 pt-1 border-t border-[#272a31]">
              <span>Step Drawdown:</span>
              <span className="text-slate-200">-{data.drawdownPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col space-y-2">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#272a31]">
        <div>
          <span className="text-xs font-bold text-white flex items-center gap-2">
            <span>Simulated Equity Curve</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00f29d]/15 text-[#00f29d] border border-[#00f29d]/30 capitalize">
              Recommended: {recommendedResult.mode.replace('_', ' ')}
            </span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Compounded trajectory starting from {formatUSD(initialCapital)}
          </span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[#0b0e14] p-1 rounded-lg border border-[#272a31] text-xs font-mono">
          <button
            onClick={() => setViewStyle('recommended')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewStyle === 'recommended'
                ? 'bg-[#1e232e] text-[#00f29d] font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Recommended Mode (Area)
          </button>
          <button
            onClick={() => setViewStyle('comparison')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewStyle === 'comparison'
                ? 'bg-[#1e232e] text-[#00f29d] font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Dual Comparison (Lines)
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {viewStyle === 'recommended' ? (
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e232e" vertical={false} />

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
                tickFormatter={(val) => formatUSD(val, true)}
              />

              <ReferenceLine
                y={initialCapital}
                stroke="#475569"
                strokeDasharray="3 3"
                label={{
                  value: `Base: ${formatUSD(initialCapital, true)}`,
                  position: 'insideTopLeft',
                  fill: '#64748b',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono',
                }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="simulatedEquity"
                name="Simulated Balance"
                stroke={strokeColor}
                strokeWidth={2.2}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                isAnimationActive={true}
                animationDuration={600}
                activeDot={{
                  r: 5,
                  fill: strokeColor,
                  stroke: '#0b0e14',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          ) : (
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e232e" vertical={false} />

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
                tickFormatter={(val) => formatUSD(val, true)}
              />

              <ReferenceLine y={initialCapital} stroke="#475569" strokeDasharray="3 3" />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '6px', fontSize: '11px' }}
                formatter={(val) => <span className="text-slate-300 font-mono">{val}</span>}
              />

              <Line
                type="monotone"
                dataKey="simulatedEquity"
                name={`Recommended (${recommendedResult.mode.replace('_', ' ')})`}
                stroke="#00f29d"
                strokeWidth={2.2}
                dot={false}
                activeDot={{ r: 4.5, fill: '#00f29d', stroke: '#0b0e14', strokeWidth: 2 }}
              />

              {comparisonResult && (
                <Line
                  type="monotone"
                  dataKey="compEquity"
                  name={`Alternate (${comparisonResult.mode.replace('_', ' ')})`}
                  stroke="#7bd0ff"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4.5, fill: '#7bd0ff', stroke: '#0b0e14', strokeWidth: 2 }}
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
