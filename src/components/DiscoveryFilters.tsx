import React from 'react';
import { FilterState, SortField } from '../types/strike';
import { ArrowUpDown, Check, Filter, LayoutGrid, List, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';

interface DiscoveryFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
  totalTraders: number;
  filteredCount: number;
}

export const DiscoveryFilters: React.FC<DiscoveryFiltersProps> = ({
  filters,
  onChange,
  viewMode,
  setViewMode,
  totalTraders,
  filteredCount,
}) => {
  const handleUpdate = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onChange({
      platform: 'all',
      minCopyScore: 0,
      style: 'all',
      bias: 'all',
      recommendedOnly: false,
      searchQuery: '',
      sortBy: 'copy_score',
      sortOrder: 'desc',
      watchlistOnly: false,
    });
  };

  const hasActiveFilters =
    filters.platform !== 'all' ||
    filters.minCopyScore > 0 ||
    filters.style !== 'all' ||
    filters.bias !== 'all' ||
    filters.recommendedOnly ||
    filters.watchlistOnly;

  return (
    <div className="bg-[#121722] rounded-2xl p-4 sm:p-5 border border-[#1c2438] shadow-sm space-y-4">
      {/* Primary Row: Protocol & Strategy Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Market Protocols */}
        <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-xl border border-[#1c2438] overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => handleUpdate('platform', 'all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filters.platform === 'all'
                ? 'bg-[#19202f] text-[#00f29d] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Markets
          </button>

          <button
            onClick={() => handleUpdate('platform', 'strike')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filters.platform === 'strike'
                ? 'bg-[#19202f] text-[#00f29d] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d]" />
            Strike Native
          </button>

          <button
            onClick={() => handleUpdate('platform', 'hyperliquid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filters.platform === 'hyperliquid'
                ? 'bg-[#19202f] text-[#38bdf8] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
            Hyperliquid
          </button>
        </div>

        {/* Strategy Styles */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Styles' },
            { id: 'swing', label: 'Swing & Trend' },
            { id: 'day', label: 'Day Scalp' },
            { id: 'algo', label: 'Algorithmic' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => handleUpdate('style', st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                filters.style === st.id
                  ? 'bg-[#19202f] text-white border border-[#273248]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Sort & View Controls */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
          <div className="flex items-center bg-[#0a0d14] rounded-xl px-3 py-1.5 border border-[#1c2438] text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 mr-2" />
            <select
              value={filters.sortBy}
              onChange={(e) => handleUpdate('sortBy', e.target.value as SortField)}
              className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer pr-1"
            >
              <option className="bg-[#121722]" value="copy_score">
                Risk-Adjusted Score
              </option>
              <option className="bg-[#121722]" value="roi_30d">
                Highest 30D Return
              </option>
              <option className="bg-[#121722]" value="max_drawdown">
                Lowest Drawdown (Safe)
              </option>
              <option className="bg-[#121722]" value="pnl_30d">
                Max Net Profit ($)
              </option>
              <option className="bg-[#121722]" value="account_value">
                Vault Account Balance
              </option>
            </select>
          </div>

          {/* Grid / Table View Switcher */}
          <div className="flex items-center bg-[#0a0d14] p-1 rounded-xl border border-[#1c2438]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#19202f] text-[#00f29d]'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Grid Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#19202f] text-[#00f29d]'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Row: Score Tier & Quality Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1c2438] text-xs">
        {/* Score Threshold Tiers */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium mr-1">Quality:</span>
          {[
            { min: 0, label: 'All Scores' },
            { min: 45, label: '45+ Solid' },
            { min: 65, label: '65+ Strong' },
            { min: 75, label: '75+ Elite' },
          ].map((tier) => (
            <button
              key={tier.min}
              onClick={() => handleUpdate('minCopyScore', tier.min)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filters.minCopyScore === tier.min
                  ? 'bg-[#00f29d]/15 text-[#00f29d] border border-[#00f29d]/30'
                  : 'bg-[#0a0d14] text-slate-400 hover:text-white border border-[#1c2438]'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>

        {/* Right side: Direction toggle and Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleUpdate('recommendedOnly', !filters.recommendedOnly)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              filters.recommendedOnly
                ? 'bg-[#00f29d]/20 text-[#00f29d] border border-[#00f29d]/40'
                : 'bg-[#0a0d14] text-slate-400 hover:text-white border border-[#1c2438]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00f29d]" />
            <span>Recommended Only</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <div className="text-xs text-slate-500 pl-2">
            Showing <strong className="text-slate-300 tabular-nums">{filteredCount}</strong> of {totalTraders}
          </div>
        </div>
      </div>
    </div>
  );
};
