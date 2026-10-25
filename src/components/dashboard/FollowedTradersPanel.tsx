import React from 'react';
import { Trader } from '../../types/strike';
import { truncateAddress } from '../../services/strikeApi';
import { Users, ArrowRight, ChevronRight, Bookmark } from 'lucide-react';

interface FollowedTradersPanelProps {
  traders: Trader[];
  watchlistAddresses: string[];
  onSelectTrader: (trader: Trader) => void;
  onViewAllWatchlist: () => void;
}

export const FollowedTradersPanel: React.FC<FollowedTradersPanelProps> = ({
  traders,
  watchlistAddresses,
  onSelectTrader,
  onViewAllWatchlist,
}) => {
  // Filter for watchlisted traders
  const followed = traders.filter((t) =>
    watchlistAddresses.includes(t.address.toLowerCase())
  );

  const hasFollowed = followed.length > 0;
  // If user hasn't followed any yet, show top verified Strike traders with clear recommendation label
  const displayedList = hasFollowed
    ? followed.slice(0, 4)
    : [...traders].sort((a, b) => (parseFloat(b.copy_score) || 0) - (parseFloat(a.copy_score) || 0)).slice(0, 3);

  // Render mini sparkline dynamically from verified 30d equity curve
  const renderSparkline = (trader: Trader) => {
    const rawCurve = trader.equity_curve_30d || [];
    const points: number[] = rawCurve
      .map((pt) => (Array.isArray(pt) ? parseFloat(String(pt[1])) : NaN))
      .filter((v) => !isNaN(v) && v > 0);

    const w = 60;
    const h = 20;

    if (points.length < 2) {
      return (
        <span className="text-[9px] font-mono text-slate-400">1 pt</span>
      );
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const isUptrend = points[points.length - 1] >= points[0];

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * w;
      const y = h - ((val - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${coords.join(' L ')}`;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-14 h-5 overflow-visible">
        <path
          d={pathD}
          fill="none"
          stroke={isUptrend ? '#10b981' : '#f43f5e'}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-sm text-slate-900 tracking-tight">
            {hasFollowed ? 'Watchlisted Traders' : 'Recommended Traders'}
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {hasFollowed ? `${followed.length} saved` : 'Strike Feed'}
          </span>
        </div>

        <button
          onClick={onViewAllWatchlist}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {!hasFollowed && (
        <p className="text-[11px] text-slate-400">
          You haven't bookmarked any traders yet. Showing top verified Strike traders:
        </p>
      )}

      {/* List of traders */}
      <div className="divide-y divide-slate-100">
        {displayedList.map((trader, idx) => {
          const name = trader.display_name || truncateAddress(trader.address, 4);
          const roi30 = trader.roi?.['30d']
            ? +(parseFloat(trader.roi['30d']) * 100).toFixed(1)
            : trader.roi?.['all']
            ? +(parseFloat(trader.roi['all']) * 100).toFixed(1)
            : 0;
          const isPos = roi30 >= 0;

          // Avatar gradient
          const avatarGradients = [
            'from-slate-800 to-slate-950 text-white',
            'from-teal-800 to-slate-900 text-teal-200',
            'from-indigo-900 to-slate-950 text-indigo-200',
            'from-emerald-900 to-slate-950 text-emerald-200',
          ];
          const bg = avatarGradients[idx % avatarGradients.length];

          return (
            <div
              key={trader.address}
              onClick={() => onSelectTrader(trader)}
              className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition-colors cursor-pointer group"
            >
              {/* Left: Avatar & Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}
                >
                  {name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-slate-900 truncate block group-hover:text-emerald-600 transition-colors">
                    {name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate block">
                    {truncateAddress(trader.address, 4)}
                  </span>
                </div>
              </div>

              {/* Right: Return + Real Sparkline + Chevron */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`font-mono font-bold text-xs ${
                    isPos ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {isPos ? '+' : ''}{roi30}%
                </span>
                <div className="hidden sm:block">{renderSparkline(trader)}</div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
