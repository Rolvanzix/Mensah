import React from 'react';
import { Trader } from '../types/strike';
import {
  formatPercent,
  formatTradingStyle,
  formatUSD,
  getCopyScoreMeta,
  getDrawdown30d,
  truncateAddress,
} from '../services/strikeApi';
import { ScoreRadialGauge } from './ui/ScoreRadialGauge';
import { BadgeCheck, Bookmark, ExternalLink, ShieldAlert, ShieldCheck, Sliders, TrendingUp } from 'lucide-react';

interface TraderOverviewSectionProps {
  traders: Trader[];
  watchlistAddresses: string[];
  onToggleWatchlist: (address: string) => void;
  onSelectTrader: (trader: Trader) => void;
  onSimulateTrader: (trader: Trader) => void;
  onViewAllTraders: () => void;
  isDemonstrationData?: boolean;
}

export const TraderOverviewSection: React.FC<TraderOverviewSectionProps> = ({
  traders,
  watchlistAddresses,
  onToggleWatchlist,
  onSelectTrader,
  onSimulateTrader,
  onViewAllTraders,
  isDemonstrationData = false,
}) => {
  // Sort top verified traders by copy score descending
  const topTraders = [...traders]
    .sort((a, b) => parseFloat(b.copy_score || '0') - parseFloat(a.copy_score || '0'))
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-[#00f29d]" />
          <h2 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider text-[11px]">
            Verified Strike Trader Overview
          </h2>
          {isDemonstrationData ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-300 border border-amber-500/30">
              Demonstration Profiles (Not Actual Strike Traders)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00f29d]/10 text-[#00f29d] border border-[#00f29d]/30">
              Verified On-Chain Data
            </span>
          )}
        </div>

        <button
          onClick={onViewAllTraders}
          className="text-xs font-semibold text-[#00f29d] hover:underline cursor-pointer self-start sm:self-auto"
        >
          View All {traders.length} Verified Traders →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {topTraders.map((trader) => {
          const score = parseFloat(trader.copy_score || '0');
          const meta = getCopyScoreMeta(score);
          const roi30 = parseFloat(trader.roi?.['30d'] || '0');
          const maxDd = getDrawdown30d(trader);
          const isFollowed = watchlistAddresses.includes(trader.address.toLowerCase());
          const isRoiPositive = roi30 >= 0;

          // Win rate from breakdown consistency
          const consistency = trader.copy_score_breakdown?.consistency_30d?.raw
            ? (parseFloat(trader.copy_score_breakdown.consistency_30d.raw) * 100).toFixed(0) + '%'
            : null;

          // Risk classification based on drawdown and score
          let riskLabel = 'Moderate Risk';
          let riskColor = 'text-amber-400 bg-amber-950/40 border-amber-500/30';
          if (score >= 65 && maxDd < 15) {
            riskLabel = 'Low Risk';
            riskColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
          } else if (maxDd > 25 || score < 40) {
            riskLabel = 'High Risk';
            riskColor = 'text-rose-400 bg-rose-950/40 border-rose-500/30';
          }

          return (
            <div
              key={trader.address}
              className="p-4 rounded-2xl bg-[#121722]/80 border border-[#1c2438] hover:border-[#273248] transition-all flex flex-col justify-between space-y-3.5 group shadow-sm hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
            >
              <div>
                {/* Header: Avatar, Name, Watchlist toggle */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#19202f] border border-[#273248] flex items-center justify-center font-mono font-bold text-xs text-[#00f29d] group-hover:border-[#00f29d]/40 transition-colors">
                      {(trader.display_name || trader.address).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate max-w-[120px] group-hover:text-[#00f29d] transition-colors">
                        {trader.display_name || truncateAddress(trader.address, 4)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {truncateAddress(trader.address, 4)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleWatchlist(trader.address)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isFollowed
                        ? 'bg-[#00f29d]/20 border-[#00f29d]/40 text-[#00f29d]'
                        : 'bg-[#19202f] border-[#273248] text-slate-400 hover:text-white'
                    }`}
                    title={isFollowed ? 'Unfollow' : 'Follow trader'}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Score and Risk Classification Pill */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#1c2438]">
                  <div className="flex items-center gap-1.5">
                    <ScoreRadialGauge score={score} size={28} />
                    <span className="font-mono text-xs font-bold text-white">
                      {score.toFixed(0)} <span className="text-[10px] text-slate-500">/ 100</span>
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${riskColor}`}>
                    {riskLabel}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-[#1c2438]/80 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">30d Return</span>
                    <span
                      className={`font-mono font-bold ${
                        isRoiPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(roi30)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">30d Drawdown</span>
                    <span className="font-mono font-bold text-rose-400">
                      -{maxDd.toFixed(1)}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Style / Bias</span>
                    <span className="text-[10px] text-slate-300 font-medium capitalize">
                      {trader.style || 'Discretionary'} · {trader.bias || 'mixed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Consistency</span>
                    <span className="font-mono font-semibold text-slate-300">
                      {consistency || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1c2438]">
                <button
                  onClick={() => onSelectTrader(trader)}
                  className="py-1.5 px-2 bg-[#19202f] hover:bg-[#222b3e] text-slate-300 rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Analytics</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>
                <button
                  onClick={() => onSimulateTrader(trader)}
                  className="py-1.5 px-2 bg-[#00f29d]/10 hover:bg-[#00f29d]/20 text-[#00f29d] border border-[#00f29d]/30 rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Simulate</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
