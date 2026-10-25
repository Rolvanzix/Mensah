import React from 'react';
import { MarketSummary } from '../../types/market';
import { TrendingUp, ArrowRight, ArrowUpRight, ArrowDownRight, Radio } from 'lucide-react';
import { formatUSD } from '../../services/strikeApi';

interface MarketOverviewSectionProps {
  markets: MarketSummary[];
  onViewAllMarkets: () => void;
  onSelectMarket?: (market: MarketSummary) => void;
}

export const MarketOverviewSection: React.FC<MarketOverviewSectionProps> = ({
  markets,
  onViewAllMarkets,
  onSelectMarket,
}) => {
  // Target 4 prominent perpetual markets
  const targetTokens = [
    {
      symbol: 'BTC-USD',
      name: 'Bitcoin',
      color: 'bg-amber-500 text-white',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.25 14.5v1.25h-1.5v-1.25H10.5v-1.25h.5c.41 0 .75-.34.75-.75v-5c0-.41-.34-.75-.75-.75h-.5V7.5h1.25V6.25h1.5V7.5h.75c1.24 0 2.25 1.01 2.25 2.25 0 .72-.34 1.36-.88 1.76.78.38 1.38 1.15 1.38 2.24 0 1.52-1.23 2.75-2.75 2.75h-.5z" />
        </svg>
      ),
    },
    {
      symbol: 'ETH-USD',
      name: 'Ethereum',
      color: 'bg-indigo-600 text-white',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
        </svg>
      ),
    },
    {
      symbol: 'SOL-USD',
      name: 'Solana',
      color: 'bg-slate-900 text-white',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M4 17.5l2.5-2.5h13.5l-2.5 2.5H4zm0-6l2.5-2.5h13.5L17.5 11.5H4zM6.5 4H20l-2.5 2.5H4L6.5 4z" />
        </svg>
      ),
    },
    {
      symbol: 'AVAX-USD',
      name: 'Avalanche',
      color: 'bg-rose-500 text-white',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M12 2L2 19.5h20L12 2zm0 4.5l6.5 11.5h-13L12 6.5z" />
        </svg>
      ),
    },
  ];

  // Helper for rendering SVG mini curve from real prices
  const renderRealCurve = (points: number[], isPos: boolean) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const w = 110;
    const h = 32;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * w;
      const y = h - ((val - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const strokeColor = isPos ? '#059669' : '#e11d48';

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-24 h-7 overflow-visible">
        <path
          d={`M ${coords.join(' L ')}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-[#059669]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">Market Overview</h2>
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-600" />
                <span>Strike Verified</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Real-time perpetual prices and funding rates streaming from Strike Finance.
            </p>
          </div>
        </div>

        <button
          onClick={onViewAllMarkets}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>All markets</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {targetTokens.map((item) => {
          const market = markets.find(
            (m) => m.symbol.toUpperCase() === item.symbol.toUpperCase()
          );

          if (!market) {
            return (
              <div
                key={item.symbol}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between h-28 animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                    {item.icon}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-700">{item.name}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">{item.symbol}</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">Streaming live price...</div>
              </div>
            );
          }

          const isPos = market.priceChangePercent >= 0;

          return (
            <div
              key={item.symbol}
              onClick={() => onSelectMarket && onSelectMarket(market)}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-slate-50/60 transition-all cursor-pointer flex flex-col justify-between group"
            >
              {/* Top row: Icon, Name, and Mini Price Curve */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center shadow-xs shrink-0`}>
                    {item.icon}
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 group-hover:text-[#059669] transition-colors">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {item.symbol}
                    </span>
                  </div>
                </div>

                {/* Real SVG Mini Sparkline */}
                {market.sparkline && market.sparkline.length >= 2 && (
                  <div className="pt-1">
                    {renderRealCurve(market.sparkline, isPos)}
                  </div>
                )}
              </div>

              {/* Bottom row: Verified Strike Price & 24h Change */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                <div>
                  <div className="font-mono font-extrabold text-slate-900 text-sm">
                    ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {market.fundingRate8hPct !== null && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      8h Fund: {market.fundingRate8hPct > 0 ? '+' : ''}{market.fundingRate8hPct.toFixed(4)}%
                    </div>
                  )}
                </div>

                <div
                  className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                    isPos
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{isPos ? '+' : ''}{market.priceChangePercent.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
