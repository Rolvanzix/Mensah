import React, { useId, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatUSD } from '../../services/strikeApi';

interface RechartsSparklineProps {
  data: [number, string][];
  height?: number;
  isPositive?: boolean;
  showTooltip?: boolean;
}

export const RechartsSparkline: React.FC<RechartsSparklineProps> = ({
  data,
  height = 38,
  isPositive = true,
  showTooltip = true,
}) => {
  const rawId = useId();
  const gradientId = useMemo(() => `sparkline-grad-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map(([ts, valStr]) => {
      const val = parseFloat(valStr) || 0;
      const date = new Date(ts);
      const shortDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const fullDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return {
        timestamp: ts,
        shortDate,
        fullDate,
        value: val,
      };
    });
  }, [data]);

  if (chartData.length < 2) {
    return (
      <div className="flex items-center justify-center text-[10px] font-mono text-slate-500 h-full w-full">
        No curve
      </div>
    );
  }

  const strokeColor = isPositive ? '#00f29d' : '#ff7373';

  return (
    <div className="w-full relative overflow-visible" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 3, right: 2, left: 2, bottom: 2 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {showTooltip && (
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '2 2' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#0b0e14]/95 border border-[#272a31] text-[10px] font-mono px-2.5 py-1.5 rounded-md shadow-xl text-white pointer-events-none whitespace-nowrap z-50 backdrop-blur-sm">
                      <div className="text-slate-400 text-[9px]">{d.fullDate}</div>
                      <div className={`font-bold mt-0.5 ${isPositive ? 'text-[#00f29d]' : 'text-[#ff7373]'}`}>
                        {formatUSD(d.value, true)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            isAnimationActive={false}
            dot={false}
            activeDot={
              showTooltip
                ? { r: 3.5, fill: strokeColor, stroke: '#0b0e14', strokeWidth: 1.5 }
                : false
            }
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
