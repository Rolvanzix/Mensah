import React, { useMemo, useState } from 'react';
import { MarketCategory, MarketSummary } from '../types/market';
import { formatUSD } from '../services/strikeApi';
import { TradingViewChart } from './charts/TradingViewChart';
import { KlineInterval } from '../services/klineService';
import {
  Globe,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Sparkles,
  Filter,
  BarChart2,
  X,
  TrendingUp,
} from 'lucide-react';

interface MarketsViewProps {
  markets: MarketSummary[];
  onSelectMarket: (market: MarketSummary) => void;
  onOpenCopilot: (prompt: string) => void;
  onPracticeMarket?: (market: MarketSummary) => void;
}

export const MarketsView: React.FC<MarketsViewProps> = ({
  markets,
  onSelectMarket,
  onOpenCopilot,
  onPracticeMarket,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChartMarket, setActiveChartMarket] = useState<MarketSummary | null>(null);
  const [chartInterval, setChartInterval] = useState<KlineInterval>('1h');

  const filtered = useMemo(() => {
    return markets.filter((m) => {
      if (selectedCategory !== 'all' && m.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSym = m.symbol.toLowerCase().includes(q);
        const matchBase = m.baseAsset.toLowerCase().includes(q);
        if (!matchSym && !matchBase) return false;
      }
      return true;
    });
  }, [markets, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Perpetual Markets
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time Strike Finance perpetual contracts with 8h funding rates, mark prices, and rolling volume.
          </p>
        </div>

        <button
          onClick={() => onOpenCopilot('Give me an overview of perpetual funding rate trends across Strike markets.')}
          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ask Market Copilot</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['all', 'crypto', 'commodities', 'equities'] as MarketCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search perpetual symbol..."
            className="w-full sm:w-60 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#059669] focus:bg-white"
          />
        </div>
      </div>

      {/* Interactive Live Candlestick Chart Workspace */}
      {activeChartMarket && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {activeChartMarket.baseAsset.slice(0, 3)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    {activeChartMarket.symbol} Perpetual
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Strike Feed
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5">
                  <span>Price: <strong className="text-slate-900">${activeChartMarket.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                  <span>24h: <strong className={activeChartMarket.priceChangePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{activeChartMarket.priceChangePercent >= 0 ? '+' : ''}{activeChartMarket.priceChangePercent.toFixed(2)}%</strong></span>
                  <span>8h Funding: <strong className="text-slate-700">{activeChartMarket.fundingRate8hPct !== null ? `${activeChartMarket.fundingRate8hPct.toFixed(4)}%` : 'N/A'}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => onOpenCopilot(`Analyze real-time order flow and funding rates for ${activeChartMarket.symbol}`)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copilot Analysis</span>
              </button>
              <button
                onClick={() => setActiveChartMarket(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close Chart"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Genuine Lightweight Charts Component */}
          <TradingViewChart
            symbol={activeChartMarket.symbol}
            interval={chartInterval}
            onIntervalChange={setChartInterval}
            height={380}
          />
        </div>
      )}

      {/* Markets Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Market</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">24h Change</th>
                <th className="py-3 px-4 text-right">8h Funding Rate</th>
                <th className="py-3 px-4 text-right">24h Volume</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.map((m) => {
                const isPos = m.priceChangePercent >= 0;
                const isChartOpen = activeChartMarket?.symbol === m.symbol;

                return (
                  <tr
                    key={m.symbol}
                    onClick={() => setActiveChartMarket(m)}
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                      isChartOpen ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-sans">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-xs text-slate-800">
                          {m.baseAsset.slice(0, 3)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">{m.symbol}</span>
                          <span className="text-[10px] text-slate-400 font-mono capitalize">
                            {m.category} · Strike Perp
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-slate-900 text-sm">
                        ${m.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          isPos ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {isPos ? '+' : ''}
                        {m.priceChangePercent.toFixed(2)}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="text-slate-700 font-medium">
                        {m.fundingRate8hPct !== null ? `${(m.fundingRate8hPct).toFixed(4)}%` : 'N/A'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right text-slate-600 font-sans">
                      {formatUSD(m.quoteVolume)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setActiveChartMarket(m);
                            onSelectMarket(m);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                            isChartOpen
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <BarChart2 className="w-3 h-3" />
                          <span>{isChartOpen ? 'Charting' : 'Chart'}</span>
                        </button>
                        {onPracticeMarket && (
                          <button
                            onClick={() => onPracticeMarket(m)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-sans font-bold transition-colors cursor-pointer"
                          >
                            Simulate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
