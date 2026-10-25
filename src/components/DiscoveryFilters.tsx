import React from 'react';
import { FilterState, PerformanceFilter, RiskTier, SortField } from '../types/strike';
import {
  ArrowDownUp,
  LayoutGrid,
  List,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

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

  const toggleSortOrder = () => {
    handleUpdate('sortOrder', filters.sortOrder === 'desc' ? 'asc' : 'desc');
  };

  const resetFilters = () => {
    onChange({
      platform: 'all',
      minCopyScore: 0,
      style: 'all',
      bias: 'all',
      riskTier: 'all',
      performanceFilter: 'all',
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
    (filters.riskTier && filters.riskTier !== 'all') ||
    (filters.performanceFilter && filters.performanceFilter !== 'all') ||
    filters.recommendedOnly ||
    filters.watchlistOnly ||
    Boolean(filters.searchQuery);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
      {/* Search & Main Sorting Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => handleUpdate('searchQuery', e.target.value)}
            placeholder="Search by trader name, 0x address, or traded perp..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#059669] focus:bg-white rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-colors"
          />
          {filters.searchQuery && (
            <button
              onClick={() => handleUpdate('searchQuery', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort Field & Order Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200 text-xs">
            <span className="text-slate-500 mr-2 font-medium">Sort By:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => handleUpdate('sortBy', e.target.value as SortField)}
              className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer pr-1"
            >
              <option value="copy_score">Risk-Adjusted Score</option>
              <option value="roi_30d">Highest 30D Return (%)</option>
              <option value="roi_7d">Highest 7D Return (%)</option>
              <option value="roi_all">All-Time Return (%)</option>
              <option value="win_rate">Consistency / Win Rate (%)</option>
              <option value="max_drawdown">Lowest Drawdown (Safest)</option>
              <option value="pnl_30d">Net Profit ($ PnL)</option>
              <option value="account_value">Vault Account Balance ($)</option>
            </select>
          </div>

          {/* Toggle Order (Asc / Desc) */}
          <button
            onClick={toggleSortOrder}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            title={filters.sortOrder === 'desc' ? 'Descending (High to Low)' : 'Ascending (Low to High)'}
          >
            <ArrowDownUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="uppercase text-[10px] font-mono">{filters.sortOrder}</span>
          </button>

          {/* Grid / Table View Switcher */}
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Analytical Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Risk Classification & Performance Filter Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
        {/* Risk Classification Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-medium text-slate-500 shrink-0 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Risk Tier:</span>
          </span>
          {[
            { id: 'all', label: 'All Tiers' },
            { id: 'elite', label: 'Elite Tier' },
            { id: 'low', label: 'Low Risk (<15% DD)' },
            { id: 'moderate', label: 'Moderate' },
            { id: 'high', label: 'High Volatility' },
          ].map((tier) => (
            <button
              key={tier.id}
              onClick={() => handleUpdate('riskTier', tier.id as RiskTier)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                (filters.riskTier || 'all') === tier.id
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>

        {/* Historical Performance Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar justify-start lg:justify-end">
          <span className="text-[11px] font-medium text-slate-500 shrink-0 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            <span>Performance:</span>
          </span>
          {[
            { id: 'all', label: 'All Records' },
            { id: 'profitable_30d', label: 'Positive 30D' },
            { id: 'profitable_7d', label: 'Positive 7D' },
            { id: 'low_drawdown', label: 'Tight Drawdown (<12%)' },
          ].map((perf) => (
            <button
              key={perf.id}
              onClick={() => handleUpdate('performanceFilter', perf.id as PerformanceFilter)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                (filters.performanceFilter || 'all') === perf.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {perf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Protocols & Recommended Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
        {/* Market Protocols */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => handleUpdate('platform', 'all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filters.platform === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Protocols
          </button>

          <button
            onClick={() => handleUpdate('platform', 'strike')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filters.platform === 'strike'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Strike Native
          </button>

          <button
            onClick={() => handleUpdate('platform', 'hyperliquid')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filters.platform === 'hyperliquid'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Hyperliquid
          </button>
        </div>

        {/* Quality Tiers & Recommended Only Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleUpdate('recommendedOnly', !filters.recommendedOnly)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
              filters.recommendedOnly
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Recommended Direction</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-1 text-xs text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 rounded-xl hover:border-rose-200"
              title="Reset all search & filter parameters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <div className="text-xs text-slate-500 pl-1 font-mono">
            Showing <strong className="text-slate-900 font-bold">{filteredCount}</strong> / {totalTraders}
          </div>
        </div>
      </div>
    </div>
  );
};
