import React, { useMemo } from 'react';
import {
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
import { formatUSD } from '../../services/strikeApi';

interface RechartsComparisonChartProps {
  ratioResult: SimulationResult;
  amountResult: SimulationResult;
  initialCapital: number;
  height?: number;
}

export const RechartsComparisonChart: React.FC<RechartsComparisonChartProps> = ({
  ratioResult,
  amountResult,
  initialCapital,
  height = 280,
}) => {
  const chartData = useMemo(() => {
    if (!ratioResult.curve || ratioResult.curve.length === 0) return [];

    return ratioResult.curve.map((ratioPt, idx) => {
      const amountPt = amountResult.curve[idx] || ratioPt;
      const date = new Date(ratioPt.timestamp);
      const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      const fullDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        timestamp: ratioPt.timestamp,
        dateLabel,
        fullDate,
        fixedRatio: Math.round(ratioPt.simulatedEquity),
        fixedAmount: Math.round(amountPt.simulatedEquity),
        ratioPnL: ratioPt.simulatedPnL,
        amountPnL: amountPt.simulatedPnL,
        ratioDrawdown: ratioPt.drawdownPct,
        amountDrawdown: amountPt.drawdownPct,
      };
    });
  }, [ratioResult, amountResult]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0B0F17]/95 border border-slate-700/80 backdrop-blur-md px-3.5 py-2.5 rounded-lg shadow-2xl text-xs font-mono min-w-52 z-50">
          <div className="text-[11px] text-slate-400 pb-1.5 border-b border-slate-800 mb-2">
            <span>{data.fullDate}</span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-cyan-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
                  Fixed Ratio:
                </span>
                <span>{formatUSD(data.fixedRatio)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pl-3.5">
                <span>PnL: {data.ratioPnL >= 0 ? '+' : ''}{formatUSD(data.ratioPnL)}</span>
                <span>DD: {data.ratioDrawdown.toFixed(1)}%</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                  Fixed Amount:
                </span>
                <span>{formatUSD(data.fixedAmount)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pl-3.5">
                <span>PnL: {data.amountPnL >= 0 ? '+' : ''}{formatUSD(data.amountPnL)}</span>
                <span>DD: {data.amountDrawdown.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1E293B"
            vertical={false}
          />

          <XAxis
            dataKey="dateLabel"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            fontFamily="JetBrains Mono, monospace"
            interval="preserveStartEnd"
            minTickGap={30}
          />

          <YAxis
            stroke="#64748B"
            fontSize={11}
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
              value: `Baseline: ${formatUSD(initialCapital, true)}`,
              position: 'insideTopLeft',
              fill: '#64748B',
              fontSize: 10,
              fontFamily: 'JetBrains Mono',
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
            formatter={(value) => (
              <span className="text-slate-300 font-mono text-xs">{value}</span>
            )}
          />

          <Line
            type="monotone"
            dataKey="fixedRatio"
            name="Fixed Ratio ($)"
            stroke="#06B6D4" // Cyan
            strokeWidth={2.2}
            dot={false}
            activeDot={{ r: 5, fill: '#06B6D4', stroke: '#0B0F17', strokeWidth: 2 }}
          />

          <Line
            type="monotone"
            dataKey="fixedAmount"
            name="Fixed Amount ($)"
            stroke="#10B981" // Emerald
            strokeWidth={2.2}
            dot={false}
            activeDot={{ r: 5, fill: '#10B981', stroke: '#0B0F17', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
