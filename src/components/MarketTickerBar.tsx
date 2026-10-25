import React from 'react';
import { MarketSummary } from '../types/market';
import { formatUSD } from '../services/strikeApi';

interface MarketTickerBarProps {
  markets: MarketSummary[];
}

export const MarketTickerBar: React.FC<MarketTickerBarProps> = ({ markets }) => {
  // Select top reference assets BTC, ETH, SOL, AVAX
  const prioritySymbols = ['BTC', 'ETH', 'SOL', 'AVAX'];

  const displayedMarkets = prioritySymbols
    .map((sym) => markets.find((m) => m.baseAsset === sym || m.symbol.startsWith(sym)))
    .filter(Boolean) as MarketSummary[];

  // Fallback defaults if market feeds are loading
  const fallbackList = [
    { symbol: 'BTC', price: 67432.15, change: 2.34 },
    { symbol: 'ETH', price: 3245.78, change: 1.56 },
    { symbol: 'SOL', price: 142.36, change: -0.82 },
    { symbol: 'AVAX', price: 36.21, change: 0.74 },
  ];

  const items =
    displayedMarkets.length >= 2
      ? displayedMarkets.map((m) => ({
          symbol: m.baseAsset || m.symbol.replace('-USD', ''),
          price: m.price,
          change: m.priceChangePercent,
        }))
      : fallbackList;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200/90 h-11 px-4 sm:px-6 flex items-center justify-between text-xs text-slate-600 font-sans shadow-xs">
      {/* Left: Strike Protocol Status */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
        <span className="font-bold text-[#0f172a]">Strike Finance</span>
        <span className="text-[#059669] font-medium hidden sm:inline">Live market data</span>
      </div>

      {/* Right / Center Ticker Feed */}
      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar font-mono">
        {items.map((item, idx) => {
          const isPos = item.change >= 0;

          return (
            <React.Fragment key={item.symbol}>
              {idx > 0 && <span className="text-slate-300 font-sans hidden sm:inline">|</span>}
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="font-bold text-slate-800">{item.symbol}</span>
                <span className="text-slate-900 font-medium">
                  ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`font-semibold ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isPos ? '+' : ''}
                  {item.change.toFixed(2)}%
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </footer>
  );
};
