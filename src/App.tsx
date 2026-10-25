import React, { useEffect, useMemo, useState } from 'react';
import { FilterState, Trader } from './types/strike';
import { MarketSummary } from './types/market';
import { fetchDiscoverTraders, getDrawdown30d } from './services/strikeApi';
import { fetchStrikeMarkets } from './services/strikeMarketApi';
import { getWatchlist, toggleWatchlist } from './utils/watchlist';
import { Sidebar, NavRoute } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MarketTickerBar } from './components/MarketTickerBar';
import { MarketsView } from './components/MarketsView';
import { SettingsView } from './components/SettingsView';
import { Dashboard } from './components/Dashboard';
import { MarketStatsSummary } from './components/MarketStatsSummary';
import { DiscoveryFilters } from './components/DiscoveryFilters';
import { TraderCard } from './components/TraderCard';
import { TraderTable } from './components/TraderTable';
import { TraderDetailModal } from './components/TraderDetailModal';
import { SimulatorView } from './components/simulator/SimulatorView';
import { WatchlistView } from './components/WatchlistView';
import { StrikeCopilot, StrikeCopilotWorkspace } from './components/StrikeCopilot';
import { useAuth } from './contexts/AuthContext';
import { AlertCircle, Compass, RefreshCw } from 'lucide-react';

export default function App() {
  const { firebaseUser } = useAuth();
  const userId = firebaseUser?.uid || 'guest_local_user';

  const [currentRoute, setCurrentRoute] = useState<NavRoute>('home');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [detailModalTrader, setDetailModalTrader] = useState<Trader | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState<string | undefined>(undefined);
  const [userCapital, setUserCapital] = useState<number>(10000);

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

  // Load watchlist on mount or user switch
  useEffect(() => {
    setWatchlist(getWatchlist(userId));

    const handleWatchlistUpdate = (e: any) => {
      if (e?.detail) {
        if (e.detail.userId && e.detail.userId !== userId) return;
        const list = Array.isArray(e.detail) ? e.detail : e.detail.updated || [];
        setWatchlist(list);
      }
    };

    const handleUserSwitch = () => {
      setWatchlist(getWatchlist(userId));
    };

    window.addEventListener('strike_watchlist_updated', handleWatchlistUpdate);
    window.addEventListener('mensah_user_switched', handleUserSwitch);
    return () => {
      window.removeEventListener('strike_watchlist_updated', handleWatchlistUpdate);
      window.removeEventListener('mensah_user_switched', handleUserSwitch);
    };
  }, [userId]);

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

    // Fetch verified Strike markets for Intelligence layer
    fetchStrikeMarkets().then((res) => {
      if (res.markets && res.markets.length > 0) {
        setMarkets(res.markets);
      }
    });
  }, []);

  const handleToggleWatchlist = (address: string) => {
    toggleWatchlist(address, userId);
    setWatchlist(getWatchlist(userId));
  };

  const handleSimulateTrader = (trader: Trader) => {
    setSelectedTrader(trader);
    setCurrentRoute('simulator');
  };

  const handleOpenCopilot = (trader?: Trader, prompt?: string) => {
    if (trader) setSelectedTrader(trader);
    if (prompt) setCopilotInitialPrompt(prompt);
    setIsCopilotOpen(true);
  };

  const handleNavigate = (route: string) => {
    if (route === 'dashboard') setCurrentRoute('home');
    else if (route === 'copilot') setCurrentRoute('intelligence');
    else if (route === 'practice') setCurrentRoute('simulator');
    else setCurrentRoute(route as NavRoute);
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

        // Risk Tier filter
        if (filters.riskTier && filters.riskTier !== 'all') {
          const maxDd = getDrawdown30d(trader);
          if (filters.riskTier === 'elite' && (score < 70 || maxDd > 18)) {
            return false;
          }
          if (filters.riskTier === 'low' && (maxDd >= 15 || score < 50)) {
            return false;
          }
          if (filters.riskTier === 'moderate' && (maxDd < 15 || maxDd >= 25)) {
            return false;
          }
          if (filters.riskTier === 'high' && maxDd < 25 && score >= 45) {
            return false;
          }
        }

        // Performance Filter
        if (filters.performanceFilter && filters.performanceFilter !== 'all') {
          const roi30 = parseFloat(trader.roi?.['30d'] || '0');
          const roi7 = parseFloat(trader.roi?.['7d'] || '0');
          const maxDd = getDrawdown30d(trader);

          if (filters.performanceFilter === 'profitable_30d' && roi30 <= 0) {
            return false;
          }
          if (filters.performanceFilter === 'profitable_7d' && roi7 <= 0) {
            return false;
          }
          if (filters.performanceFilter === 'low_drawdown' && maxDd > 12) {
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

        // Search query (name, address, or traded assets)
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase().trim();
          const matchAddress = trader.address?.toLowerCase().includes(q);
          const matchName = trader.display_name?.toLowerCase().includes(q);
          const matchAsset = trader.top_assets?.some((a) => a.asset.toLowerCase().includes(q) || a.symbol?.toLowerCase().includes(q));
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
          case 'roi_7d':
            valA = parseFloat(a.roi?.['7d'] || '0');
            valB = parseFloat(b.roi?.['7d'] || '0');
            break;
          case 'roi_all':
            valA = parseFloat(a.roi?.['all'] || '0');
            valB = parseFloat(b.roi?.['all'] || '0');
            break;
          case 'win_rate': {
            const wrA = a.copy_score_breakdown?.consistency_30d?.raw ? parseFloat(a.copy_score_breakdown.consistency_30d.raw) : 0;
            const wrB = b.copy_score_breakdown?.consistency_30d?.raw ? parseFloat(b.copy_score_breakdown.consistency_30d.raw) : 0;
            valA = wrA;
            valB = wrB;
            break;
          }
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans antialiased">
      {/* Left Navigation Sidebar matching reference design */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={(r) => {
          setCurrentRoute(r);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        watchlistCount={watchlist.length}
      />

      {/* Main Page Area offset by sidebar width on large screens */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar with search input, notifications, and JD profile badge */}
        <TopBar
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearchSubmit={(q) => {
            setSearchQuery(q);
            if (currentRoute !== 'discovery') setCurrentRoute('discovery');
          }}
          userCapital={userCapital}
        />

        {/* Central Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24">
          {/* ROUTE: HOME / DASHBOARD */}
          {currentRoute === 'home' && (
            <Dashboard
              traders={traders}
              watchlistAddresses={watchlist}
              onToggleWatchlist={handleToggleWatchlist}
              onSelectTrader={(t) => setDetailModalTrader(t)}
              onSimulateTrader={handleSimulateTrader}
              onNavigateToTab={handleNavigate}
              onOpenCopilot={handleOpenCopilot}
              isDemonstrationData={false}
            />
          )}

          {/* ROUTE: DISCOVER TRADERS */}
          {currentRoute === 'discovery' && (
            <div className="space-y-6">
              <MarketStatsSummary
                traders={traders}
                onSelectTrader={(t) => setDetailModalTrader(t)}
              />

              {/* Title & Quick Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Trader Discovery
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Verified traders on Strike and Hyperliquid evaluated by risk-adjusted return and consistency.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadTraders}
                    disabled={loading}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-300 text-xs font-medium text-slate-700 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-400'}`} />
                    <span>Refresh Feed</span>
                  </button>
                </div>
              </div>

              {/* Error Message if any */}
              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-700">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={loadTraders}
                    className="px-3 py-1 bg-rose-100 border border-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-200 transition-colors cursor-pointer"
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
                      className="bg-white rounded-2xl p-5 h-72 border border-slate-200 animate-pulse flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                        <div className="h-14 bg-slate-50 rounded-xl mt-4"></div>
                      </div>
                      <div className="h-9 bg-slate-100 rounded-xl mt-4"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredTraders.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
                  <Compass className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                  <h3 className="text-base font-bold text-slate-900 mb-1">No Traders Match Your Filters</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    Try lowering your minimum score or clearing filters to see more traders.
                  </p>
                  <button
                    onClick={() =>
                      setFilters({
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
                      })
                    }
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors border border-slate-200 cursor-pointer"
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

          {/* ROUTE: INTELLIGENCE WORKSPACE */}
          {currentRoute === 'intelligence' && (
            <StrikeCopilotWorkspace
              activeTrader={selectedTrader || detailModalTrader}
              allTraders={traders}
              markets={markets}
              userCapital={userCapital}
              setUserCapital={setUserCapital}
              onNavigateToSimulator={(trader) => {
                if (trader) handleSimulateTrader(trader);
                else setCurrentRoute('simulator');
              }}
              onNavigateToDiscovery={() => setCurrentRoute('discovery')}
              onNavigateToDashboard={() => setCurrentRoute('home')}
              onSelectTrader={(t) => setSelectedTrader(t)}
            />
          )}

          {/* ROUTE: SIMULATOR (PRACTICE TRADING) */}
          {currentRoute === 'simulator' && (
            <SimulatorView
              traders={traders}
              selectedTrader={selectedTrader}
              onSelectTrader={setSelectedTrader}
              watchlistAddresses={watchlist}
              markets={markets}
              onOpenCopilot={(prompt) => handleOpenCopilot(undefined, prompt)}
            />
          )}

          {/* ROUTE: MARKETS */}
          {currentRoute === 'markets' && (
            <MarketsView
              markets={markets}
              onSelectMarket={() => {}}
              onOpenCopilot={(prompt) => handleOpenCopilot(undefined, prompt)}
              onPracticeMarket={() => setCurrentRoute('simulator')}
            />
          )}

          {/* ROUTE: WATCHLIST */}
          {currentRoute === 'watchlist' && (
            <WatchlistView
              traders={traders}
              watchlistAddresses={watchlist}
              onToggleWatchlist={handleToggleWatchlist}
              onSelectTrader={(t) => setDetailModalTrader(t)}
              onSimulate={handleSimulateTrader}
              onNavigateDiscovery={() => setCurrentRoute('discovery')}
            />
          )}

          {/* ROUTE: SETTINGS */}
          {currentRoute === 'settings' && (
            <SettingsView
              userCapital={userCapital}
              setUserCapital={setUserCapital}
            />
          )}
        </main>
      </div>

      {/* Docked bottom market ticker matching reference */}
      <MarketTickerBar markets={markets} />

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

      {/* Mensah Intelligence Slide-Over AI Assistant */}
      <StrikeCopilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onOpen={() => setIsCopilotOpen(true)}
        activeTrader={selectedTrader || detailModalTrader}
        allTraders={traders}
        markets={markets}
        userCapital={userCapital}
        currentView={
          currentRoute === 'home'
            ? 'dashboard'
            : currentRoute === 'intelligence'
            ? 'copilot'
            : currentRoute === 'simulator'
            ? 'simulator'
            : currentRoute === 'watchlist'
            ? 'watchlist'
            : 'discovery'
        }
        onSelectTrader={(t) => setSelectedTrader(t)}
        onExpandToDedicatedPage={() => setCurrentRoute('intelligence')}
        onNavigateToSimulator={(trader) => {
          if (trader) setSelectedTrader(trader);
          setCurrentRoute('simulator');
          setIsCopilotOpen(false);
        }}
        onNavigateToDiscovery={() => {
          setCurrentRoute('discovery');
          setIsCopilotOpen(false);
        }}
        onNavigateToDashboard={() => {
          setCurrentRoute('home');
          setIsCopilotOpen(false);
        }}
        initialPrompt={copilotInitialPrompt}
        onClearInitialPrompt={() => setCopilotInitialPrompt(undefined)}
      />
    </div>
  );
}
