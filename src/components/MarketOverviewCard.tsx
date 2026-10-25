import React from 'react';
import { MarketSummary } from '../types/market';
import { formatUSD } from '../services/strikeApi';
import { TrendingDown, TrendingUp, Minus, Clock, Zap } from 'lucide-react';

interface MarketOverviewCardProps {
  market: MarketSummary;
  onSelectMarket?: (market: MarketSummary) => void;
}

export const MarketOverviewCard: React.FC<MarketOverviewCardProps> = ({
  market,
  onSelectMarket,
}) => {
  const isPositive = market.priceChangePercent >= 0;
  const isNeutral = Math.abs(market.priceChangePercent) < 0.2;
  const accentColor = isNeutral ? '#94a3b8' : isPositive ? '#00f29d' : '#f43f5e';

  // Format high/low price percentage position
  const range = market.highPrice - market.lowPrice;
  const positionPct =
    range > 0 ? Math.max(0, Math.min(100, ((market.price - market.lowPrice) / range) * 100)) : 50;

  // Generate SVG path from sparkline points
  const sparklinePoints = market.sparkline || [];
  let pathD = '';
  let fillD = '';
  if (sparklinePoints.length >= 2) {
    const min = Math.min(...sparklinePoints);
    const max = Math.max(...sparklinePoints);
    const h = 42;
    const w = 120;
    const spread = max - min || 1;

    const coords = sparklinePoints.map((val, idx) => {
      const x = (idx / (sparklinePoints.length - 1)) * w;
      const y = h - ((val - min) / spread) * (h - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    pathD = `M ${coords.join(' L ')}`;
    fillD = `M ${coords[0]} L ${coords.join(' L ')} L ${w},${h} L 0,${h} Z`;
  }

  return (
    <div
      onClick={() => onSelectMarket?.(market)}
      className="bg-[#121722]/80 hover:bg-[#161d2b] border border-[#1c2438] hover:border-[#273248] rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-sm hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
    >
      {/* Top Header: Symbol, Category, Trend */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#19202f] border border-[#273248] flex items-center justify-center font-mono font-bold text-xs text-white group-hover:border-[#00f29d]/40 transition-colors">
            {market.baseAsset.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white group-hover:text-[#00f29d] transition-colors">
                {market.symbol}
              </span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#19202f] border border-[#273248] text-slate-400 font-medium">
                {market.category}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Perpetual Contract</span>
          </div>
        </div>

        {/* Trend Badge */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
            market.trend === 'bullish'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
              : market.trend === 'bearish'
              ? 'bg-rose-950/40 border-rose-500/30 text-rose-400'
              : 'bg-slate-900 border-slate-700/40 text-slate-400'
          }`}
        >
          {market.trend === 'bullish' ? (
            <TrendingUp className="w-3 h-3" />
          ) : market.trend === 'bearish' ? (
            <TrendingDown className="w-3 h-3" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
          <span className="capitalize">{market.trend}</span>
        </div>
      </div>

      {/* Middle Row: Price, 24h Change, & Mini Sparkline Chart */}
      <div className="grid grid-cols-2 items-end gap-3 my-3">
        <div>
          <div className="font-mono text-lg sm:text-xl font-bold text-white tracking-tight">
            {formatUSD(market.price, false)}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`font-mono text-xs font-semibold ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {market.priceChangePercent.toFixed(2)}%
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              ({isPositive ? '+' : ''}
              {market.priceChange >= 1 || market.priceChange <= -1
                ? market.priceChange.toFixed(2)
                : market.priceChange.toFixed(4)}
              )
            </span>
          </div>
        </div>

        {/* Small Price Sparkline Chart */}
        <div className="flex justify-end items-center h-11 relative">
          {pathD ? (
            <svg
              viewBox="0 0 120 42"
              className="w-full max-w-[120px] h-11 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={`grad-${market.symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={fillD} fill={`url(#grad-${market.symbol})`} />
              <path
                d={pathD}
                fill="none"
                stroke={accentColor}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <div className="text-[10px] text-slate-500 italic">No chart data</div>
          )}
        </div>
      </div>

      {/* Bottom Row: Funding Rate & 24h High/Low Gauge */}
      <div className="pt-2.5 border-t border-[#1c2438]/80 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>8h Funding:</span>
          </span>
          <span
            className={`font-mono font-semibold ${
              market.fundingRate8hPct === null
                ? 'text-slate-500'
                : (market.fundingRate8hPct || 0) > 0
                ? 'text-amber-400'
                : (market.fundingRate8hPct || 0) < 0
                ? 'text-cyan-400'
                : 'text-slate-400'
            }`}
          >
            {market.fundingRate8hPct !== null
              ? `${(market.fundingRate8hPct || 0) > 0 ? '+' : ''}${(
                  market.fundingRate8hPct || 0
                ).toFixed(4)}%`
              : 'N/A'}
          </span>
        </div>

        {/* 24h Range Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>L: {formatUSD(market.lowPrice, true)}</span>
            <span>H: {formatUSD(market.highPrice, true)}</span>
          </div>
          <div className="w-full h-1 bg-[#1c2438] rounded-full overflow-hidden relative">
            <div
              className="absolute top-0 bottom-0 w-2 rounded-full bg-[#00f29d] -ml-1 transition-all"
              style={{ left: `${positionPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
