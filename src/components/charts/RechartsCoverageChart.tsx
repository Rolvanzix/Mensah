import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CopyAmountCoverage } from '../../types/strike';
import { formatUSD } from '../../services/strikeApi';

interface RechartsCoverageChartProps {
  coverageData: CopyAmountCoverage[];
  height?: number;
}

export const RechartsCoverageChart: React.FC<RechartsCoverageChartProps> = ({
  coverageData,
  height = 200,
}) => {
  if (!coverageData || coverageData.length === 0) return null;

  const chartData = coverageData.map((item) => {
    const amt = parseFloat(item.copy_amount);
    const cov = parseFloat(item.coverage) * 100;
    return {
      copy_amount: amt,
      coverage: cov,
      displayAmount: formatUSD(amt, true),
      label: formatUSD(amt, true),
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0B0F17]/95 border border-slate-700/80 backdrop-blur-md px-3 py-2 rounded-lg shadow-xl text-xs font-mono">
          <div className="text-slate-400">
            Copier Sizing: <span className="text-white font-bold">{formatUSD(data.copy_amount)}</span>
          </div>
          <div className="text-emerald-400 font-bold mt-1">
            Execution Coverage: {data.coverage.toFixed(1)}%
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            fontFamily="JetBrains Mono, monospace"
          />
          <YAxis
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            fontFamily="JetBrains Mono, monospace"
            domain={[0, 100]}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="coverage" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => {
              const color =
                entry.coverage >= 90
                  ? '#10B981' // emerald-500
                  : entry.coverage >= 70
                  ? '#06B6D4' // cyan-500
                  : entry.coverage >= 40
                  ? '#F59E0B' // amber-500
                  : '#64748B'; // slate-500
              return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.85} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
