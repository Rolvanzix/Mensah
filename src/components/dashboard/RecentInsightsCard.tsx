import React, { useMemo } from 'react';
import { Lightbulb, TrendingUp, DollarSign, Activity, ArrowRight, ShieldAlert } from 'lucide-react';
import { MarketSummary } from '../../types/market';
import { generateMarketInsights } from '../../services/strikeMarketApi';

interface RecentInsightsCardProps {
  markets?: MarketSummary[];
  onViewAll?: () => void;
  onSelectInsight?: (query: string) => void;
}

export const RecentInsightsCard: React.FC<RecentInsightsCardProps> = ({
  markets = [],
  onViewAll,
  onSelectInsight,
}) => {
  // Generate real verified market insights from Strike data
  const realInsights = useMemo(() => {
    if (!markets || markets.length === 0) return [];
    return generateMarketInsights(markets);
  }, [markets]);

  // Display top 3 insights or live status if feed is syncing
  const displayedItems = realInsights.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm text-slate-900 tracking-tight">Market Intelligence</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Strike Computed
          </span>
        </div>

        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Deep dive</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Insight Rows */}
      {displayedItems.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          Syncing perpetual data feeds across Strike order books...
        </div>
      ) : (
        <div className="divide-y divide-slate-100 my-1">
          {displayedItems.map((item) => {
            const isFunding = item.type === 'funding';
            const isVol = item.type === 'volatility';
            const isMover = item.type === 'momentum';

            const icon = isFunding ? (
              <DollarSign className="w-4 h-4 text-blue-600" />
            ) : isVol ? (
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            ) : isMover ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <Activity className="w-4 h-4 text-indigo-600" />
            );

            const bg = isFunding
              ? 'bg-blue-50 text-blue-700 border-blue-100'
              : isVol
              ? 'bg-amber-50 text-amber-700 border-amber-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-100';

            const query = `Analyze the ${item.title}: ${item.description}`;

            return (
              <div
                key={item.id}
                onClick={() => onSelectInsight?.(query)}
                className="py-3 flex items-start gap-3 hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition-colors cursor-pointer group"
              >
                {/* Circular Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${bg}`}
                >
                  {icon}
                </div>

                {/* Title & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {item.metricValue}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
