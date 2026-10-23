import React, { useEffect, useMemo, useState } from 'react';
import { FilterState, Trader } from './types/strike';
import { fetchDiscoverTraders, getDrawdown30d } from './services/strikeApi';
import { getWatchlist, toggleWatchlist } from './utils/watchlist';
import { Header, NavigationTab } from './components/Header';
import { MarketStatsSummary } from './components/MarketStatsSummary';
import { DiscoveryFilters } from './components/DiscoveryFilters';
import { TraderCard } from './components/TraderCard';
import { TraderTable } from './components/TraderTable';
import { TraderDetailModal } from './components/TraderDetailModal';
import { CopySimulator } from './components/CopySimulator';
import { WatchlistView } from './components/WatchlistView';
import { StrikeCopilot, StrikeCopilotWorkspace } from './components/StrikeCopilot';
import { AlertCircle, Compass, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('discovery');
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [detailModalTrader, setDetailModalTrader] = useState<Trader | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState<string | undefined>(undefined);
  const [userCapital, setUserCapital] = useState<number>(2000);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
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

  // Sync search input from header
  useEffect(() => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  }, [searchQuery]);

  // Load watchlist on mount
  useEffect(() => {
    setWatchlist(getWatchlist());

    const handleWatchlistUpdate = (e: any) => {
      if (e.detail) setWatchlist(e.detail);
    };

    window.addEventListener('strike_watchlist_updated', handleWatchlistUpdate);
    return () => {
      window.removeEventListener('strike_watchlist_updated', handleWatchlistUpdate);
    };
  }, []);

  // Fetch real Strike discovery data
  const loadTraders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDiscoverTraders();
      setTraders(data);
      if (data.length > 0 && !selectedTrader) {
        setSelectedTrader(data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching Strike traders:', err);
      setError('Unable to load trader feed. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTraders();
  }, []);

  const handleToggleWatchlist = (address: string) => {
    toggleWatchlist(address);
    setWatchlist(getWatchlist());
  };

  const handleSimulateTrader = (trader: Trader) => {
    setSelectedTrader(trader);
    setActiveTab('simulator');
  };

  const handleOpenCopilot = (trader?: Trader, prompt?: string) => {
    if (trader) setSelectedTrader(trader);
    if (prompt) setCopilotInitialPrompt(prompt);
    setIsCopilotOpen(true);
  };

  // Filtered & Sorted Traders
  const filteredTraders = useMemo(() => {
    return traders
      .filter((trader) => {
        // Platform filter
        if (filters.platform !== 'all') {
          if (trader.platform?.toLowerCase() !== filters.platform.toLowerCase()) {
            return false;
          }
        }

        // Min copy score filter
        const score = parseFloat(trader.copy_score || '0');
        if (filters.minCopyScore > 0 && score < filters.minCopyScore) {
          return false;
        }

        // Style filter
        if (filters.style !== 'all') {
          if (trader.style?.toLowerCase() !== filters.style.toLowerCase()) {
            return false;
          }
        }

        // Bias filter
        if (filters.bias !== 'all') {
          if (trader.bias?.toLowerCase() !== filters.bias.toLowerCase()) {
            return false;
          }
        }

        // Recommended only
        if (filters.recommendedOnly) {
          if (trader.recommended_direction !== 'copy') {
            return false;
          }
        }

        // Watchlist only
        if (filters.watchlistOnly) {
          if (!watchlist.includes(trader.address.toLowerCase())) {
            return false;
          }
        }

        // Search query
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase().trim();
          const matchAddress = trader.address?.toLowerCase().includes(q);
          const matchName = trader.display_name?.toLowerCase().includes(q);
          const matchAsset = trader.top_assets?.some((a) => a.asset.toLowerCase().includes(q));
          if (!matchAddress && !matchName && !matchAsset) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;

        switch (filters.sortBy) {
          case 'copy_score':
            valA = parseFloat(a.copy_score || '0');
            valB = parseFloat(b.copy_score || '0');
            break;
          case 'pnl_30d':
            valA = parseFloat(a.pnl?.['30d'] || '0');
            valB = parseFloat(b.pnl?.['30d'] || '0');
            break;
          case 'roi_30d':
            valA = parseFloat(a.roi?.['30d'] || '0');
            valB = parseFloat(b.roi?.['30d'] || '0');
            break;
          case 'max_drawdown':
            valA = getDrawdown30d(a);
            valB = getDrawdown30d(b);
            break;
          case 'account_value':
            valA = parseFloat(a.account_value || '0');
            valB = parseFloat(b.account_value || '0');
            break;
          case 'volume_30d':
            valA = parseFloat(a.volume?.['30d'] || '0');
            valB = parseFloat(b.volume?.['30d'] || '0');
            break;
          default:
            valA = parseFloat(a.copy_score || '0');
            valB = parseFloat(b.copy_score || '0');
        }

        return filters.sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [traders, filters, watchlist]);

  return (
    <div className="min-h-screen bg-[#0a0d14] text-[#e1e2eb] flex flex-col font-sans selection:bg-[#00f29d]/30 selection:text-white">
      {/* Clean Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        watchlistCount={watchlist.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* TAB 1: DISCOVERY */}
        {activeTab === 'discovery' && (
          <div className="space-y-6">
            {/* Real Stats Summary Ribbon */}
            <MarketStatsSummary
              traders={traders}
              onSelectTrader={(t) => setDetailModalTrader(t)}
            />

            {/* Title & Quick Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1c2438]">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Trader Discovery
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Verified traders on Strike and Hyperliquid evaluated by risk-adjusted return and consistency.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadTraders}
                  disabled={loading}
                  className="px-3.5 py-2 bg-[#121722] hover:bg-[#19202f] border border-[#1c2438] hover:border-[#00f29d]/40 text-xs font-medium text-slate-300 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00f29d]' : 'text-slate-400'}`} />
                  <span>Refresh Feed</span>
                </button>
              </div>
            </div>

            {/* Error Message if any */}
            {error && (
              <div className="bg-rose-950/25 border border-rose-500/40 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-300">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={loadTraders}
                  className="px-3 py-1 bg-rose-900/40 border border-rose-500/40 rounded-lg text-xs font-semibold hover:bg-rose-900/60 transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Discovery Filters */}
            <DiscoveryFilters
              filters={filters}
              onChange={setFilters}
              viewMode={viewMode}
              setViewMode={setViewMode}
              totalTraders={traders.length}
              filteredCount={filteredTraders.length}
            />

            {/* Loading Skeletons */}
            {loading && traders.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-[#121722] rounded-2xl p-5 h-72 border border-[#1c2438] animate-pulse flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="h-4 bg-[#19202f] rounded w-1/2"></div>
                      <div className="h-3 bg-[#19202f]/60 rounded w-1/3"></div>
                      <div className="h-14 bg-[#0a0d14] rounded-xl mt-4"></div>
                    </div>
                    <div className="h-9 bg-[#19202f]/60 rounded-xl mt-4"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredTraders.length === 0 && (
              <div className="bg-[#121722] border border-[#1c2438] rounded-2xl p-12 text-center text-slate-400">
                <Compass className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Traders Match Your Filters</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Try lowering your minimum score or clearing filters to see more traders.
                </p>
                <button
                  onClick={() =>
                    setFilters({
                      platform: 'all',
                      minCopyScore: 0,
                      style: 'all',
                      bias: 'all',
                      recommendedOnly: false,
                      searchQuery: '',
                      sortBy: 'copy_score',
                      sortOrder: 'desc',
                      watchlistOnly: false,
                    })
                  }
                  className="px-4 py-2 bg-[#19202f] hover:bg-[#222c40] text-white text-xs font-semibold rounded-xl transition-colors border border-[#1c2438] cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* Grid or Table Results */}
            {!loading && filteredTraders.length > 0 && (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTraders.map((trader) => (
                      <TraderCard
                        key={trader.address}
                        trader={trader}
                        isWatchlisted={watchlist.includes(trader.address.toLowerCase())}
                        onToggleWatchlist={handleToggleWatchlist}
                        onSelectTrader={(t) => setDetailModalTrader(t)}
                        onSimulate={handleSimulateTrader}
                        onOpenCopilot={handleOpenCopilot}
                      />
                    ))}
                  </div>
                ) : (
                  <TraderTable
                    traders={filteredTraders}
                    isWatchlisted={(addr) => watchlist.includes(addr.toLowerCase())}
                    onToggleWatchlist={handleToggleWatchlist}
                    onSelectTrader={(t) => setDetailModalTrader(t)}
                    onSimulate={handleSimulateTrader}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: SIMULATOR */}
        {activeTab === 'simulator' && (
          <CopySimulator
            traders={traders}
            selectedTrader={selectedTrader}
            onSelectTrader={setSelectedTrader}
            watchlistAddresses={watchlist}
          />
        )}

        {/* TAB 3: WATCHLIST */}
        {activeTab === 'watchlist' && (
          <WatchlistView
            traders={traders}
            watchlistAddresses={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onSelectTrader={(t) => setDetailModalTrader(t)}
            onSimulate={handleSimulateTrader}
            onNavigateDiscovery={() => setActiveTab('discovery')}
          />
        )}

        {/* TAB 4: COPILOT DEDICATED WORKSPACE */}
        {activeTab === 'copilot' && (
          <StrikeCopilotWorkspace
            activeTrader={selectedTrader || detailModalTrader}
            allTraders={traders}
            userCapital={userCapital}
            setUserCapital={setUserCapital}
            onNavigateToSimulator={(trader) => {
              if (trader) handleSimulateTrader(trader);
              else setActiveTab('simulator');
            }}
            onNavigateToDiscovery={() => setActiveTab('discovery')}
            onSelectTrader={(t) => setSelectedTrader(t)}
          />
        )}
      </main>

      {/* Trader Detail Modal */}
      {detailModalTrader && (
        <TraderDetailModal
          trader={detailModalTrader}
          onClose={() => setDetailModalTrader(null)}
          isWatchlisted={watchlist.includes(detailModalTrader.address.toLowerCase())}
          onToggleWatchlist={handleToggleWatchlist}
          onSimulate={handleSimulateTrader}
          onOpenCopilot={handleOpenCopilot}
        />
      )}

      {/* Strike Copilot AI Assistant (Slide-over Drawer) */}
      <StrikeCopilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onOpen={() => setIsCopilotOpen(true)}
        activeTrader={selectedTrader || detailModalTrader}
        allTraders={traders}
        userCapital={userCapital}
        currentView={activeTab}
        onSelectTrader={(t) => setSelectedTrader(t)}
        onExpandToDedicatedPage={() => setActiveTab('copilot')}
        onNavigateToSimulator={(trader) => {
          if (trader) setSelectedTrader(trader);
          setActiveTab('simulator');
          setIsCopilotOpen(false);
        }}
        onNavigateToDiscovery={() => {
          setActiveTab('discovery');
          setIsCopilotOpen(false);
        }}
        initialPrompt={copilotInitialPrompt}
        onClearInitialPrompt={() => setCopilotInitialPrompt(undefined)}
      />

      {/* Clean Minimal Footer */}
      <footer className="border-t border-[#1c2438] bg-[#0a0d14] py-8 px-4 sm:px-6 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-bold text-white tracking-tight">Strike Copy Intelligence</span>
            <span>·</span>
            <span>Risk-Adjusted Discovery & Simulation</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <a
              href="https://strikefinance.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00f29d] transition-colors"
            >
              Strike Finance
            </a>
            <span>·</span>
            <a
              href="https://app.hyperliquid.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#38bdf8] transition-colors"
            >
              Hyperliquid
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
