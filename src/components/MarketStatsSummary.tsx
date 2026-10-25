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
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tracked Traders
          </span>
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
          {traders.length}
        </div>
        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Active Strike & Hyperliquid</span>
        </div>
      </div>

      {/* 2. Aggregate 30D Volume */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            30D Copy Volume
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
          {formatUSD(totalVolume30d)}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Settled perpetual volume
        </div>
      </div>

      {/* 3. Average Copy Score */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Mean Copy Score
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Shield className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight tabular-nums">
          {avgScore}
          <span className="text-sm font-normal text-slate-400">/100</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Multi-factor risk & consistency
        </div>
      </div>

      {/* 4. Top Performer */}
      <div
        onClick={() => onSelectTrader(topTrader)}
        className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Top 30D Return
          </span>
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Flame className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight tabular-nums">
          {formatPercent(topRoi)}
        </div>
        <div className="text-xs text-slate-600 mt-1 truncate group-hover:text-emerald-600 transition-colors font-medium">
          {topTrader.display_name || truncateAddress(topTrader.address, 4)}
        </div>
      </div>
    </div>
  );
};
