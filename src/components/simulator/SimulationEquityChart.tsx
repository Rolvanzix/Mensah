import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { SimulationEquityPoint } from '../../types/simulator';
import { formatUSD } from '../../services/strikeApi';

interface SimulationEquityChartProps {
  equityCurve: SimulationEquityPoint[];
  startingBalance: number;
  traderName: string;
  height?: number;
}

export const SimulationEquityChart: React.FC<SimulationEquityChartProps> = ({
  equityCurve,
  startingBalance,
  traderName,
  height = 320,
}) => {
  if (!equityCurve || equityCurve.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        No trajectory points available for this simulation period.
      </div>
    );
  }

  // Find min and max for chart domain
  const values = equityCurve.flatMap((p) => [p.simulatedEquity, p.benchmarkTraderEquity]);
  const minVal = Math.min(...values, startingBalance);
  const maxVal = Math.max(...values, startingBalance);
  const padding = (maxVal - minVal) * 0.1 || startingBalance * 0.1;
  const yDomain = [Math.max(0, Math.floor(minVal - padding)), Math.ceil(maxVal + padding)];

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <span className="w-3 h-1 bg-[#059669] rounded-full inline-block" />
            <span>Simulated Copy Portfolio</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-500">
            <span className="w-3 h-1 bg-[#0284c7] rounded-full inline-block" />
            <span>{traderName} (Lead Trader Benchmark)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-[11px] font-mono">
          <span>Starting: {formatUSD(startingBalance)}</span>
        </div>
      </div>

      <div style={{ width: '100%', height }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="dateStr"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              dy={5}
            />
            <YAxis
              domain={yDomain}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${Math.round(val).toLocaleString()}`}
              dx={-5}
              width={65}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as SimulationEquityPoint;
                const simEq = data.simulatedEquity;
                const benchEq = data.benchmarkTraderEquity;
                const netPnL = simEq - startingBalance;
                const isPos = netPnL >= 0;

                return (
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[210px]">
                    <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 flex justify-between">
                      <span>{data.dateStr}</span>
                      <span className="text-[10px] text-slate-400 font-normal">Simulated Point</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#059669]" />
                        Simulated Balance:
                      </span>
                      <span className="font-mono font-bold text-slate-900">{formatUSD(simEq)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                        Trader Benchmark:
                      </span>
                      <span className="font-mono text-slate-700">{formatUSD(benchEq)}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-slate-600">Net Return:</span>
                      <span
                        className={`font-mono font-bold ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}
                      >
                        {isPos ? '+' : ''}
                        {formatUSD(netPnL)} ({((netPnL / startingBalance) * 100).toFixed(2)}%)
                      </span>
                    </div>

                    {data.drawdownPct > 0 && (
                      <div className="flex justify-between items-center text-[11px] text-amber-700">
                        <span>Drawdown from Peak:</span>
                        <span className="font-mono">-{data.drawdownPct.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={startingBalance}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
              label={{
                value: 'Baseline',
                fill: '#94a3b8',
                fontSize: 10,
                position: 'insideBottomRight',
              }}
            />
            {/* Lead Trader Benchmark Curve */}
            <Line
              type="monotone"
              dataKey="benchmarkTraderEquity"
              name={traderName}
              stroke="#0284c7"
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4, fill: '#0284c7' }}
              strokeOpacity={0.8}
            />
            {/* User Simulated Copy Curve */}
            <Line
              type="monotone"
              dataKey="simulatedEquity"
              name="Simulated Copy"
              stroke="#059669"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#059669' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
