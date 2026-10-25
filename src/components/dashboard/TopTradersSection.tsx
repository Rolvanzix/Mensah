import React from 'react';
import { Trader } from '../../types/strike';
import { getDrawdown30d, truncateAddress } from '../../services/strikeApi';
import { Users, ArrowRight, Check, Play } from 'lucide-react';

interface TopTradersSectionProps {
  traders: Trader[];
  watchlistAddresses: string[];
  onToggleWatchlist: (address: string) => void;
  onSelectTrader: (trader: Trader) => void;
  onSimulateTrader: (trader: Trader) => void;
  onViewAllTraders: () => void;
}

export const TopTradersSection: React.FC<TopTradersSectionProps> = ({
  traders,
  watchlistAddresses,
  onToggleWatchlist,
  onSelectTrader,
  onSimulateTrader,
  onViewAllTraders,
}) => {
  // Render sparkline directly from verified Strike equity curve
  const renderTraderSparkline = (trader: Trader) => {
    const rawCurve = trader.equity_curve_30d || [];
    const points: number[] = rawCurve
      .map((pt) => (Array.isArray(pt) ? parseFloat(String(pt[1])) : NaN))
      .filter((v) => !isNaN(v) && v > 0);

    const w = 180;
    const h = 36;

    if (points.length < 2) {
      return (
        <div className="w-full h-8 flex items-center justify-center text-[10px] text-slate-400 font-mono">
          Single snapshot recorded
        </div>
      );
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const isUptrend = points[points.length - 1] >= points[0];

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * w;
      const y = h - ((val - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${coords.join(' L ')}`;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8 overflow-visible">
        <path
          d={pathD}
          fill="none"
          stroke={isUptrend ? '#10b981' : '#f43f5e'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Top 4 verified traders sorted by copy score
  const displayedTraders = [...traders]
    .sort((a, b) => (parseFloat(b.copy_score) || 0) - (parseFloat(a.copy_score) || 0))
    .slice(0, 4);

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-700" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Top Verified Traders</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Strike / Hyperliquid
          </span>
        </div>

        <button
          onClick={onViewAllTraders}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>View all {traders.length} traders</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {displayedTraders.map((trader, idx) => {
          const isFollowed = watchlistAddresses.includes(trader.address.toLowerCase());
          const name = trader.display_name || truncateAddress(trader.address, 4);
          const roi30 = trader.roi?.['30d']
            ? +(parseFloat(trader.roi['30d']) * 100).toFixed(1)
            : trader.roi?.['all']
            ? +(parseFloat(trader.roi['all']) * 100).toFixed(1)
            : 0;
          const isRoiPos = roi30 >= 0;

          const winRate = trader.copy_score_breakdown?.consistency_30d?.raw
            ? Math.round(parseFloat(trader.copy_score_breakdown.consistency_30d.raw))
            : trader.copy_score
            ? Math.round(parseFloat(trader.copy_score))
            : 60;

          const maxDd = getDrawdown30d(trader);
          const isLowRisk = maxDd < 15;
          const isMediumRisk = maxDd >= 15 && maxDd < 30;
          const riskLabel = isLowRisk ? 'Low Risk' : isMediumRisk ? 'Medium Risk' : 'High Risk';

          // Avatar gradient
          const avatarColors = [
            'from-slate-800 to-slate-950 text-white',
            'from-teal-800 to-slate-900 text-teal-200',
            'from-emerald-900 to-slate-950 text-emerald-200',
            'from-indigo-900 to-slate-950 text-indigo-200',
          ];
          const avatarBg = avatarColors[idx % avatarColors.length];

          return (
            <div
              key={trader.address}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Header: Avatar & Name */}
                <div
                  onClick={() => onSelectTrader(trader)}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <div
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}
                  >
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                      {name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono truncate block">
                      {truncateAddress(trader.address, 4)}
                    </span>
                  </div>
                </div>

                {/* 2-Column Metrics: Return & Win Rate */}
                <div className="grid grid-cols-2 gap-2 mt-3.5 mb-2.5">
                  <div>
                    <div
                      className={`font-bold font-mono text-sm sm:text-base ${
                        isRoiPos ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isRoiPos ? '+' : ''}
                      {roi30}%
                    </div>
                    <span className="text-[10px] text-slate-400">30d return</span>
                  </div>
                  <div>
                    <div className="font-bold font-mono text-sm sm:text-base text-slate-900">
                      {winRate}%
                    </div>
                    <span className="text-[10px] text-slate-400">Consistency</span>
                  </div>
                </div>

                {/* Risk Tier Badge & Drawdown */}
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isLowRisk
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : isMediumRisk
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}
                  >
                    {riskLabel}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Max DD: {maxDd.toFixed(1)}%
                  </span>
                </div>

                {/* Real Verified Sparkline curve */}
                <div className="py-1">{renderTraderSparkline(trader)}</div>
              </div>

              {/* Actions: Follow and Simulate Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWatchlist(trader.address);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center justify-center gap-1 ${
                    isFollowed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {isFollowed ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span className="truncate">Saved</span>
                    </>
                  ) : (
                    <span>Watch</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSimulateTrader(trader);
                  }}
                  className="py-1.5 px-2 rounded-xl text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Simulate</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
