import React from 'react';
import { Trader } from '../types/strike';
import { formatPercent, formatUSD, truncateAddress } from '../services/strikeApi';
import { Flame, Shield, TrendingUp, Users } from 'lucide-react';

interface MarketStatsSummaryProps {
  traders: Trader[];
  onSelectTrader: (trader: Trader) => void;
}

export const MarketStatsSummary: React.FC<MarketStatsSummaryProps> = ({
  traders,
  onSelectTrader,
}) => {
  if (traders.length === 0) return null;

  // Real statistics aggregated from verified Strike & Hyperliquid traders
  let totalVolume30d = 0;
  let totalScore = 0;
  let totalRoi = 0;
  let topTrader = traders[0];
  let topRoi = -Infinity;

  traders.forEach((t) => {
    const vol = parseFloat(t.volume?.['30d'] || '0');
    totalVolume30d += isNaN(vol) ? 0 : vol;

    const sc = parseFloat(t.copy_score || '0');
    totalScore += isNaN(sc) ? 0 : sc;

    const roi = parseFloat(t.roi?.['30d'] || '0');
    if (!isNaN(roi)) {
      totalRoi += roi;
      if (roi > topRoi) {
        topRoi = roi;
        topTrader = t;
      }
    }
  });

  const avgScore = Math.round(totalScore / traders.length);
  const avgRoi = totalRoi / traders.length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Tracked Traders */}
      <div className="bg-[#121722] p-4 sm:p-5 rounded-2xl border border-[#1c2438] shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tracked Traders
          </span>
          <div className="w-7 h-7 rounded-lg bg-[#19202f] flex items-center justify-center text-slate-400">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums">
          {traders.length}
        </div>
        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d]" />
          <span>Strike & Hyperliquid verified</span>
        </div>
      </div>

      {/* 2. Average Score with graphical bar */}
      <div className="bg-[#121722] p-4 sm:p-5 rounded-2xl border border-[#1c2438] shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Average Score
          </span>
          <div className="w-7 h-7 rounded-lg bg-[#00f29d]/10 flex items-center justify-center text-[#00f29d]">
            <Shield className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-extrabold text-[#00f29d] tracking-tight tabular-nums">
            {avgScore}
          </span>
          <span className="text-xs text-slate-500 font-medium">/ 100</span>
        </div>
        {/* Graphical mini progress bar */}
        <div className="w-full h-1 bg-[#1c2438] rounded-full mt-2.5 overflow-hidden">
          <div
            className="h-full bg-[#00f29d] rounded-full transition-all duration-500"
            style={{ width: `${avgScore}%` }}
          />
        </div>
      </div>

      {/* 3. 30D Combined Volume */}
      <div className="bg-[#121722] p-4 sm:p-5 rounded-2xl border border-[#1c2438] shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            30D Volume
          </span>
          <div className="w-7 h-7 rounded-lg bg-[#38bdf8]/10 flex items-center justify-center text-[#38bdf8]">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums">
          {formatUSD(totalVolume30d, true)}
        </div>
        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <span>Avg 30D Return:</span>
          <span className={`font-semibold tabular-nums ${avgRoi >= 0 ? 'text-[#00f29d]' : 'text-rose-400'}`}>
            {formatPercent(avgRoi)}
          </span>
        </div>
      </div>

      {/* 4. Top 30D Performer */}
      <div
        onClick={() => topTrader && onSelectTrader(topTrader)}
        className="bg-[#121722] p-4 sm:p-5 rounded-2xl border border-[#1c2438] hover:border-[#00f29d]/50 transition-all cursor-pointer group shadow-sm hover:shadow-md"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Top Return
          </span>
          <div className="w-7 h-7 rounded-lg bg-[#00f29d]/10 flex items-center justify-center text-[#00f29d] group-hover:scale-110 transition-transform">
            <Flame className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-[#00f29d] tracking-tight tabular-nums group-hover:brightness-110">
          {formatPercent(topRoi)}
        </div>
        <div className="text-xs text-slate-300 truncate mt-1 flex items-center gap-1">
          <span className="text-slate-500">Leader:</span>
          <span className="font-medium text-white truncate">
            {topTrader?.display_name || truncateAddress(topTrader?.address, 4)}
          </span>
        </div>
      </div>
    </div>
  );
};
