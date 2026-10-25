import React, { useMemo } from 'react';
import { Trader } from '../types/strike';
import { TraderCard } from './TraderCard';
import { formatUSD } from '../services/strikeApi';
import { Bookmark, Calculator, Compass, Sparkles } from 'lucide-react';

interface WatchlistViewProps {
  traders: Trader[];
  watchlistAddresses: string[];
  onToggleWatchlist: (address: string) => void;
  onSelectTrader: (trader: Trader) => void;
  onSimulate: (trader: Trader) => void;
  onNavigateDiscovery: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  traders,
  watchlistAddresses,
  onToggleWatchlist,
  onSelectTrader,
  onSimulate,
  onNavigateDiscovery,
}) => {
  const watchlistedTraders = useMemo(() => {
    return traders.filter((t) => watchlistAddresses.includes(t.address.toLowerCase()));
  }, [traders, watchlistAddresses]);

  // Combined stats
  const aggregateStats = useMemo(() => {
    if (watchlistedTraders.length === 0) return null;

    let total30dPnL = 0;
    let avgScore = 0;
    let totalAccountValue = 0;

    watchlistedTraders.forEach((t) => {
      total30dPnL += parseFloat(t.pnl?.['30d'] || '0');
      avgScore += parseFloat(t.copy_score || '0');
      totalAccountValue += parseFloat(t.account_value || '0');
    });

    avgScore = avgScore / watchlistedTraders.length;

    return {
      count: watchlistedTraders.length,
      total30dPnL,
      avgScore,
      totalAccountValue,
    };
  }, [watchlistedTraders]);

  if (watchlistedTraders.length === 0) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center max-w-xl mx-auto my-12 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-500">
          <Bookmark className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Your Watchlist is Empty</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed max-w-md mx-auto">
          Bookmark verified traders from the Discovery board to monitor their 30-day equity trajectories,
          compare them side-by-side, or simulate copying multiple traders in a diversified portfolio.
        </p>
        <button
          onClick={onNavigateDiscovery}
          className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-xl transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          <span>Explore Discovery Board</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Watchlist Header and Aggregate Metrics */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Bookmark className="w-4 h-4 fill-amber-500 text-amber-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Saved Watchlist</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                {watchlistedTraders.length} Bookmarked
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Curated shortlist of verified traders for ongoing monitoring and portfolio simulation
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSimulate(watchlistedTraders[0])}
              className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>Simulate Lead Trader</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        {aggregateStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Bookmarked</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {aggregateStats.count}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Verified traders</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Average Score</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums">
                {aggregateStats.avgScore.toFixed(0)} <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${aggregateStats.avgScore}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Combined 30D Return</span>
              <div
                className={`text-2xl font-extrabold mt-1 tabular-nums ${
                  aggregateStats.total30dPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {aggregateStats.total30dPnL >= 0 ? '+' : ''}
                {formatUSD(aggregateStats.total30dPnL, true)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Total net profits</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Combined Vault Value</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {formatUSD(aggregateStats.totalAccountValue, true)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Aggregate capital base</div>
            </div>
          </div>
        )}
      </div>

      {/* Trader Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {watchlistedTraders.map((trader) => (
          <TraderCard
            key={trader.address}
            trader={trader}
            isWatchlisted={true}
            onToggleWatchlist={onToggleWatchlist}
            onSelectTrader={onSelectTrader}
            onSimulate={onSimulate}
          />
        ))}
      </div>
    </div>
  );
};
