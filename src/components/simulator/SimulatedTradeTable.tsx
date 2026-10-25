import React, { useMemo, useState } from 'react';
import { SimulatedTrade, TradeDirection } from '../../types/simulator';
import { formatUSD } from '../../services/strikeApi';
import { TradeCalculationModal } from './TradeCalculationModal';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
} from 'lucide-react';

interface SimulatedTradeTableProps {
  trades: SimulatedTrade[];
  onSelectTradeForChart?: (trade: SimulatedTrade) => void;
  selectedTradeId?: string | null;
}

export const SimulatedTradeTable: React.FC<SimulatedTradeTableProps> = ({
  trades,
  onSelectTradeForChart,
  selectedTradeId,
}) => {
  const [directionFilter, setDirectionFilter] = useState<'ALL' | TradeDirection>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectedTrade, setInspectedTrade] = useState<SimulatedTrade | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Extract unique symbols
  const uniqueSymbols = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => set.add(t.symbol));
    return Array.from(set);
  }, [trades]);

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (directionFilter !== 'ALL' && trade.direction !== directionFilter) {
        return false;
      }
      if (outcomeFilter === 'WIN' && !trade.isWin) {
        return false;
      }
      if (outcomeFilter === 'LOSS' && trade.isWin) {
        return false;
      }
      if (symbolFilter !== 'ALL' && trade.symbol !== symbolFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = trade.tradeNumber.toString().includes(q);
        const matchSym = trade.symbol.toLowerCase().includes(q);
        if (!matchNum && !matchSym) return false;
      }
      return true;
    });
  }, [trades, directionFilter, outcomeFilter, symbolFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrades.slice(start, start + pageSize);
  }, [filteredTrades, currentPage, pageSize]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Simulated Trade Log</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-medium">
              {filteredTrades.length} / {trades.length} Trades
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Step-by-step audit of each executed position, margin, fees, and realized profit/loss.
          </p>
        </div>

        {/* Search & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search symbol or #..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#f8fafc] border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] w-36 sm:w-44 shadow-xs"
            />
          </div>

          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => {
              setDirectionFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none cursor-pointer shadow-xs"
          >
            <option value="ALL">All Directions</option>
            <option value="LONG">Long Only</option>
            <option value="SHORT">Short Only</option>
          </select>

          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => {
              setOutcomeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none cursor-pointer shadow-xs"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN">Winning Trades</option>
            <option value="LOSS">Losing Trades</option>
          </select>

          {/* Symbol Filter */}
          {uniqueSymbols.length > 1 && (
            <select
              value={symbolFilter}
              onChange={(e) => {
                setSymbolFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none cursor-pointer shadow-xs"
            >
              <option value="ALL">All Assets</option>
              {uniqueSymbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Asset & Side</th>
              <th className="py-2.5 px-3 text-right">Entry / Exit</th>
              <th className="py-2.5 px-3 text-right">Notional (Margin)</th>
              <th className="py-2.5 px-3 text-right">Fees & Funding</th>
              <th className="py-2.5 px-3 text-right">Net Realized PnL</th>
              <th className="py-2.5 px-3 text-right">ROI (Margin)</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {paginatedTrades.map((t) => {
              const isLong = t.direction === 'LONG';
              const isPos = t.isWin;
              const isSelected = selectedTradeId === t.id;

              return (
                <tr
                  key={t.id}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-emerald-50/70 border-l-2 border-l-[#059669]'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-3 px-3 text-slate-500 font-semibold">{t.tradeNumber}</td>
                  <td className="py-3 px-3 text-slate-500 font-sans whitespace-nowrap text-[11px]">
                    {t.dateFormatted}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 font-sans">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isLong
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.direction}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{t.symbol}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="text-slate-900 font-semibold">
                      ${t.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Entry: ${t.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="text-slate-900 font-semibold">{formatUSD(t.positionSizeUsd)}</div>
                    <div className="text-[10px] text-slate-500">
                      {formatUSD(t.marginAllocatedUsd)} · {t.leverage}x
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap text-[11px]">
                    <div className="text-slate-700">-${t.totalFeesUsd.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">
                      Funding: {t.fundingCostUsd >= 0 ? `-$${t.fundingCostUsd.toFixed(2)}` : `+$${Math.abs(t.fundingCostUsd).toFixed(2)}`}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <span
                      className={`font-bold ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {isPos ? '+' : ''}
                      {formatUSD(t.netPnLUsd)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <span
                      className={`font-semibold text-xs ${
                        t.roiOnMarginPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.roiOnMarginPct >= 0 ? '+' : ''}
                      {t.roiOnMarginPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 font-sans">
                      {onSelectTradeForChart && (
                        <button
                          onClick={() => onSelectTradeForChart(t)}
                          className={`px-2 py-1 rounded-lg transition-colors text-[11px] inline-flex items-center gap-1 cursor-pointer border ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                          title="View trade markers on market candlestick chart"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Chart</span>
                        </button>
                      )}
                      <button
                        onClick={() => setInspectedTrade(t)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        title="Inspect calculation formula and assumptions"
                      >
                        <Calculator className="w-3 h-3 text-slate-500" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div>
          Showing page {currentPage} of {totalPages} ({filteredTrades.length} results)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-600 cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-slate-800 font-bold">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-600 cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inspect Trade Modal */}
      <TradeCalculationModal
        trade={inspectedTrade}
        onClose={() => setInspectedTrade(null)}
      />
    </div>
  );
};
