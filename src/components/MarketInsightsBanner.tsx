import React from 'react';
import { MarketInsight } from '../types/market';
import { Activity, AlertTriangle, ArrowUpRight, BarChart2, Flame, Percent } from 'lucide-react';

interface MarketInsightsBannerProps {
  insights: MarketInsight[];
  onSelectSymbol?: (symbol: string) => void;
}

export const MarketInsightsBanner: React.FC<MarketInsightsBannerProps> = ({
  insights,
  onSelectSymbol,
}) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00f29d]" />
          <h2 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider text-[11px]">
            Market Insights & Signals
          </h2>
        </div>
        <span className="text-[11px] text-slate-400">
          Derived from live Strike order books & funding settlement
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {insights.slice(0, 3).map((insight) => {
          const isPositive = insight.severity === 'positive';
          const isWarning = insight.severity === 'warning';

          const icon =
            insight.type === 'momentum' ? (
              <Flame className={`w-4 h-4 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`} />
            ) : insight.type === 'funding' ? (
              <Percent className="w-4 h-4 text-amber-400" />
            ) : insight.type === 'volatility' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <BarChart2 className="w-4 h-4 text-cyan-400" />
            );

          const borderClass = isPositive
            ? 'border-emerald-500/30 bg-emerald-950/15'
            : isWarning
            ? 'border-rose-500/30 bg-rose-950/15'
            : 'border-[#273248] bg-[#121722]/80';

          return (
            <div
              key={insight.id}
              onClick={() => insight.symbol && onSelectSymbol?.(insight.symbol)}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${borderClass} ${
                insight.symbol ? 'cursor-pointer hover:border-[#00f29d]/40' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-[#19202f] border border-[#273248]">
                      {icon}
                    </div>
                    <span className="font-bold text-xs text-white leading-tight">
                      {insight.title}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      isPositive
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : isWarning
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-cyan-500/20 text-cyan-300'
                    }`}
                  >
                    {insight.metricValue}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {insight.description}
                </p>
              </div>

              {insight.symbol && (
                <div className="mt-2.5 pt-2 border-t border-[#1c2438] flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono text-slate-300">{insight.symbol}</span>
                  <span className="flex items-center gap-1 text-[#00f29d] font-semibold hover:underline">
                    Filter in Discovery <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
