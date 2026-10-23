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
import { CopyScoreBreakdown } from '../../types/strike';

interface RechartsFactorBreakdownProps {
  breakdown: CopyScoreBreakdown;
  height?: number;
}

export const RechartsFactorBreakdown: React.FC<RechartsFactorBreakdownProps> = ({
  breakdown,
  height = 240,
}) => {
  if (!breakdown) return null;

  const chartData = Object.entries(breakdown)
    .filter(([_, item]) => item && typeof item === 'object')
    .map(([key, item]) => {
      const normalized = parseFloat(item?.normalized || '0') * 100;
      const points = parseFloat(item?.points || '0');
      const raw = item?.raw ? parseFloat(item.raw) : 0;

      const labelMap: Record<string, string> = {
        roi_30d: '30d ROI',
        roi_7d: '7d ROI',
        drawdown_30d: 'Low Drawdown',
        drawdown_7d: '7d Drawdown',
        profit_factor: 'Profit Factor',
        consistency_30d: 'Consistency',
        consistency_7d: '7d Consistency',
        asset_variety: 'Asset Variety',
        strike_copyable: 'Strike Feasible',
        size_feasibility: 'Size Feasible',
        active_days_7d: 'Active Days',
        activity_freshness_days: 'Freshness',
      };

      const name = labelMap[key] || key.replace(/_/g, ' ');

      return {
        key,
        name,
        normalized: Math.min(100, Math.max(0, Math.round(normalized))),
        points: points.toFixed(1),
        raw: raw.toFixed(3),
      };
    })
    .slice(0, 8); // Top factors

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[#0B0F17]/95 border border-slate-700/80 backdrop-blur-md px-3 py-2 rounded-lg shadow-xl text-xs font-mono">
          <div className="text-white font-bold mb-1">{d.name}</div>
          <div className="text-cyan-400">Score Weight: {d.points} pts</div>
          <div className="text-slate-300">Factor Optimization: {d.normalized}%</div>
          <div className="text-slate-500 text-[10px]">Raw Value: {d.raw}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke="#64748B"
            fontSize={10}
            fontFamily="JetBrains Mono, monospace"
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={95}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="normalized" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => {
              const color =
                entry.normalized >= 75
                  ? '#10B981'
                  : entry.normalized >= 50
                  ? '#06B6D4'
                  : entry.normalized >= 30
                  ? '#F59E0B'
                  : '#64748B';
              return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.85} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
