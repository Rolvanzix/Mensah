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
import { Bookmark, BookmarkCheck, ExternalLink, Sliders, TrendingUp, UserCheck } from 'lucide-react';

interface FollowedTradersSectionProps {
  traders: Trader[];
  watchlistAddresses: string[];
  onToggleWatchlist: (address: string) => void;
  onSelectTrader: (trader: Trader) => void;
  onSimulateTrader: (trader: Trader) => void;
  onNavigateToDiscovery: () => void;
}

export const FollowedTradersSection: React.FC<FollowedTradersSectionProps> = ({
  traders,
  watchlistAddresses,
  onToggleWatchlist,
  onSelectTrader,
  onSimulateTrader,
  onNavigateToDiscovery,
}) => {
  const followedTraders = traders.filter((t) =>
    watchlistAddresses.includes(t.address.toLowerCase())
  );

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookmarkCheck className="w-4 h-4 text-[#00f29d]" />
          <h2 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider text-[11px]">
            Followed Traders ({followedTraders.length})
          </h2>
        </div>
        <button
          onClick={onNavigateToDiscovery}
          className="text-xs font-semibold text-[#00f29d] hover:underline cursor-pointer"
        >
          Discover More Traders →
        </button>
      </div>

      {followedTraders.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#121722]/50 border border-dashed border-[#273248] text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#19202f] border border-[#273248] flex items-center justify-center text-slate-400 mx-auto">
            <Bookmark className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No traders followed yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Add verified Strike lead traders to your watchlist to monitor their returns, intraday volatility spikes, and paper simulation models in one place.
            </p>
          </div>
          <button
            onClick={onNavigateToDiscovery}
            className="px-4 py-2 bg-[#19202f] hover:bg-[#222b3e] border border-[#273248] hover:border-[#00f29d]/40 text-xs font-semibold text-[#00f29d] rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <span>Browse Discovery Feed</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {followedTraders.map((trader) => {
            const score = parseFloat(trader.copy_score || '0');
            const meta = getCopyScoreMeta(score);
            const roi30 = parseFloat(trader.roi?.['30d'] || '0');
            const maxDd = getDrawdown30d(trader);
            const isRoiPositive = roi30 >= 0;

            return (
              <div
                key={trader.address}
                className="p-4 rounded-2xl bg-[#121722]/80 border border-[#1c2438] hover:border-[#273248] transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Trader Name, Score, Unfollow button */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#19202f] border border-[#273248] flex items-center justify-center font-mono font-bold text-xs text-[#00f29d]">
                        {(trader.display_name || trader.address).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate max-w-[140px]">
                          {trader.display_name || truncateAddress(trader.address, 4)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {truncateAddress(trader.address, 4)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border font-mono ${meta.badgeClass}`}
                      >
                        {score.toFixed(0)} Score
                      </span>
                      <button
                        onClick={() => onToggleWatchlist(trader.address)}
                        className="p-1.5 rounded-lg bg-[#19202f] text-[#00f29d] hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remove from watchlist"
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#1c2438]">
                    <div>
                      <span className="text-[10px] text-slate-500 block">30d Net ROI</span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          isRoiPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatPercent(roi30)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">30d Max DD</span>
                      <span className="font-mono text-xs font-bold text-rose-400">
                        -{maxDd.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1c2438]">
                  <button
                    onClick={() => onSelectTrader(trader)}
                    className="py-1.5 px-2 bg-[#19202f] hover:bg-[#222b3e] text-slate-300 rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Profile</span>
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
      )}
    </div>
  );
};
