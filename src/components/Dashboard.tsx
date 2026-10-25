import React, { useEffect, useMemo, useState } from 'react';
import { Trader } from '../types/strike';
import { MarketSummary } from '../types/market';
import { fetchStrikeMarkets } from '../services/strikeMarketApi';
import { getSimulatorOverview, SimulatorOverview } from '../utils/simulationStore';
import { fetchUserPositions, calculatePnL, closePracticeTrade } from '../services/practiceTradingService';
import { PracticePosition } from '../types/practiceTrading';
import { formatUSD } from '../services/strikeApi';
import { useAuth } from '../contexts/AuthContext';
import { MarketOverviewSection } from './dashboard/MarketOverviewSection';
import { TopTradersSection } from './dashboard/TopTradersSection';
import { SimulatedPortfolioCard } from './dashboard/SimulatedPortfolioCard';
import { RecentInsightsCard } from './dashboard/RecentInsightsCard';
import { IntelligencePanel } from './dashboard/IntelligencePanel';
import { FollowedTradersPanel } from './dashboard/FollowedTradersPanel';
import { NavRoute } from './Sidebar';
import { Play, ArrowRight, ShieldCheck, TrendingUp, TrendingDown, Activity, Sparkles } from 'lucide-react';

interface DashboardProps {
  traders: Trader[];
  watchlistAddresses: string[];
  onToggleWatchlist: (address: string) => void;
  onSelectTrader: (trader: Trader) => void;
  onSimulateTrader: (trader: Trader) => void;
  onNavigateToTab: (tab: NavRoute) => void;
  onOpenCopilot: (trader?: Trader, prompt?: string) => void;
  isDemonstrationData?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  traders,
  watchlistAddresses,
  onToggleWatchlist,
  onSelectTrader,
  onSimulateTrader,
  onNavigateToTab,
  onOpenCopilot,
}) => {
  const { userProfile, firebaseUser, isGuest } = useAuth();
  const userId = firebaseUser?.uid || 'guest_local_user';
  const virtualBalance = userProfile?.virtualBalance ?? 10000;

  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [openPositions, setOpenPositions] = useState<PracticePosition[]>([]);
  const [storeTrigger, setStoreTrigger] = useState<number>(0);

  // Simulator summary state strictly scoped by active user
  const simulatorOverview: SimulatorOverview = useMemo(() => {
    return getSimulatorOverview(traders, userId);
  }, [traders, userId, storeTrigger]);

  // Load user's running positions
  const loadPositions = async () => {
    try {
      const data = await fetchUserPositions(userId, isGuest);
      setOpenPositions(data.open);
    } catch {
      // Ignore
    }
  };

  // Immediate reset and load on user change or store update
  useEffect(() => {
    setOpenPositions([]);
    loadPositions();

    const handleUpdate = (e: any) => {
      if (e?.detail?.userId && e.detail.userId !== userId) return;
      setStoreTrigger((prev) => prev + 1);
      loadPositions();
    };

    const handleUserSwitch = () => {
      setOpenPositions([]);
      setStoreTrigger((prev) => prev + 1);
      loadPositions();
    };

    window.addEventListener('mensah_simulations_store_updated', handleUpdate);
    window.addEventListener('mensah_user_switched', handleUserSwitch);
    return () => {
      window.removeEventListener('mensah_simulations_store_updated', handleUpdate);
      window.removeEventListener('mensah_user_switched', handleUserSwitch);
    };
  }, [userId, isGuest]);

  // Load official Strike market data
  useEffect(() => {
    fetchStrikeMarkets().then((res) => {
      if (res.markets && res.markets.length > 0) {
        setMarkets(res.markets);
      }
    });

    const now = new Date();
    setCurrentDateStr(
      now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    );
    setCurrentTimeStr(
      now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
    );
  }, []);

  // Price map
  const currentPricesMap = useMemo(() => {
    const map: Record<string, number> = {};
    markets.forEach((m) => {
      map[m.symbol] = m.price;
    });
    return map;
  }, [markets]);

  const displayName = userProfile?.displayName || (firebaseUser?.email ? firebaseUser.email.split('@')[0] : 'Trader');

  return (
    <div className="space-y-6 pb-16">
      {/* 1. WELCOME BANNER (Personalized & Action-Oriented) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
            Risk-Free Practice Mode
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            Practice trading risk-free with your <strong>{formatUSD(virtualBalance)}</strong> virtual funds on live Strike Finance market charts, or practice following top verified traders.
          </p>
        </div>

        {/* Date, UTC timestamp, and Action Buttons */}
        <div className="flex flex-col sm:items-end gap-2.5 pt-1">
          <div className="text-right font-mono">
            <div className="text-xs font-bold text-slate-800">{currentDateStr || 'Today'}</div>
            <div className="text-[11px] text-slate-400">{currentTimeStr || 'Live Feed UTC'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab('simulator')}
              className="px-3.5 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Start Practising</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('markets')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              Explore Markets
            </button>
          </div>
        </div>
      </div>

      {/* 1.5 ACTIVE PRACTICE TRADES STRIP (If running trades exist) */}
      {openPositions.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                Trades Currently Running ({openPositions.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('simulator')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              Manage in Practice Trading →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {openPositions.slice(0, 3).map((pos) => {
              const curPrice = currentPricesMap[pos.marketSymbol] || pos.entryPrice;
              const { unrealizedPnL, unrealizedPnLPct } = calculatePnL(
                pos.side,
                pos.entryPrice,
                curPrice,
                pos.positionSize,
                pos.amount
              );
              const isPos = unrealizedPnL >= 0;

              return (
                <div
                  key={pos.id}
                  className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{pos.marketSymbol}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          pos.side === 'long' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {pos.side.toUpperCase()} {pos.leverage}x
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      Entry: ${pos.entryPrice.toLocaleString()} · Val: {formatUSD(pos.amount)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Current Profit/Loss</span>
                    <span
                      className={`font-mono font-bold ${
                        isPos ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isPos ? '+' : ''}{formatUSD(unrealizedPnL)} ({isPos ? '+' : ''}{unrealizedPnLPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. MAIN 2-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / CENTER COLUMN (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* A. Market Overview (4 cards: BTC, ETH, SOL, AVAX) */}
          <MarketOverviewSection
            markets={markets}
            onViewAllMarkets={() => onNavigateToTab('markets')}
            onSelectMarket={(m) => {
              onOpenCopilot(undefined, `Analyze current market conditions and funding for ${m.symbol}`);
            }}
          />

          {/* B. Top Traders (4 cards: AlphaFlux, CryptoNova, ZenTrader, DeltaEdge) */}
          <TopTradersSection
            traders={traders}
            watchlistAddresses={watchlistAddresses}
            onToggleWatchlist={onToggleWatchlist}
            onSelectTrader={onSelectTrader}
            onSimulateTrader={onSimulateTrader}
            onViewAllTraders={() => onNavigateToTab('discovery')}
          />

          {/* C. Bottom Row: 2 Cards Side-by-Side (Your Simulated Portfolio + Recent Insights) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SimulatedPortfolioCard
              overview={simulatorOverview}
              onOpenSimulator={() => onNavigateToTab('simulator')}
              onViewAllSimulations={() => onNavigateToTab('simulator')}
            />

            <RecentInsightsCard
              markets={markets}
              onViewAll={() => onOpenCopilot(undefined, 'Summarize the key market insights and volatility updates on Strike Finance.')}
              onSelectInsight={(query) => onOpenCopilot(undefined, query)}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-6">
          {/* A. Mensah Intelligence Panel with quick inquiry buttons & input */}
          <IntelligencePanel
            onAskQuestion={(query) => onOpenCopilot(undefined, query)}
          />

          {/* B. Followed Traders Panel with returns and sparklines */}
          <FollowedTradersPanel
            traders={traders}
            watchlistAddresses={watchlistAddresses}
            onSelectTrader={onSelectTrader}
            onViewAllWatchlist={() => onNavigateToTab('watchlist')}
          />
        </div>
      </div>
    </div>
  );
};
