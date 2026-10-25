import React, { useEffect, useMemo, useState } from 'react';
import { Trader } from '../../types/strike';
import {
  SimulationConfig,
  SimulationResult,
  SimulationStatus,
} from '../../types/simulator';
import {
  deleteSimulation,
  getAllSimulationResults,
  getSavedSimulationConfigs,
  initializeSeedSimulations,
  updateSimulationStatus,
} from '../../services/simulationStorage';
import { formatUSD } from '../../services/strikeApi';
import { useAuth } from '../../contexts/AuthContext';
import { SimulationResultsDashboard } from './SimulationResultsDashboard';
import { CreateSimulationModal } from './CreateSimulationModal';
import { DeleteSimulationModal } from './DeleteSimulationModal';
import { SoloPracticeDesk } from './SoloPracticeDesk';
import { RunningTradesSection } from './RunningTradesSection';
import { MarketSummary } from '../../types/market';
import { PracticePosition } from '../../types/practiceTrading';
import { fetchUserPositions } from '../../services/practiceTradingService';
import {
  Sliders,
  Play,
  Pause,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ChevronRight,
  ShieldCheck,
  Wallet,
  Info,
  LineChart,
  UserCheck,
} from 'lucide-react';

interface SimulatorViewProps {
  traders: Trader[];
  selectedTrader: Trader | null;
  onSelectTrader: (trader: Trader) => void;
  watchlistAddresses: string[];
  markets?: MarketSummary[];
  onOpenCopilot?: (prompt: string) => void;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  traders,
  selectedTrader,
  onSelectTrader,
  watchlistAddresses,
  markets = [],
  onOpenCopilot = () => {},
}) => {
  const { firebaseUser, userProfile, isGuest } = useAuth();
  const userId = firebaseUser?.uid || 'guest_local_user';
  const totalVirtualBalance = userProfile?.virtualBalance ?? 10000;

  // Primary mode: 'solo' (Solo Practice Trading) | 'running' (Trades Currently Running) | 'strategy' (Follow Another Trader's Strategy)
  const [mainMode, setMainMode] = useState<'solo' | 'running' | 'strategy'>('solo');

  // User's active & closed practice positions
  const [openPositions, setOpenPositions] = useState<PracticePosition[]>([]);
  const [closedPositions, setClosedPositions] = useState<PracticePosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(false);

  // Strategy simulation configs
  const [configs, setConfigs] = useState<SimulationConfig[]>([]);
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'details' | 'all'>('details');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [deletingConfig, setDeletingConfig] = useState<SimulationConfig | null>(null);

  // Load user's practice positions
  const loadPositions = async () => {
    setLoadingPositions(true);
    try {
      const data = await fetchUserPositions(userId, isGuest);
      setOpenPositions(data.open);
      setClosedPositions(data.closed);
    } catch (err) {
      console.warn('Failed to fetch user practice positions:', err);
    } finally {
      setLoadingPositions(false);
    }
  };

  useEffect(() => {
    loadPositions();
  }, [userId, isGuest]);

  // Current market prices lookup map
  const currentPricesMap = useMemo(() => {
    const map: Record<string, number> = {};
    markets.forEach((m) => {
      map[m.symbol] = m.price;
    });
    return map;
  }, [markets]);

  // Initialize and load saved simulation configs scoped by userId
  useEffect(() => {
    if (traders.length === 0) return;
    const initial = initializeSeedSimulations(traders, userId);
    setConfigs(initial);

    if (initial.length > 0) {
      if (selectedTrader) {
        const matching = initial.find(
          (c) => c.traderAddress.toLowerCase() === selectedTrader.address.toLowerCase()
        );
        if (matching) {
          setActiveSimulationId(matching.id);
        } else {
          setActiveSimulationId(initial[0].id);
        }
      } else {
        setActiveSimulationId(initial[0].id);
      }
    } else {
      setActiveSimulationId(null);
    }
  }, [traders, selectedTrader, userId]);

  // Listen to store updates & user switch
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e?.detail?.userId && e.detail.userId !== userId) return;
      setConfigs(getSavedSimulationConfigs(userId));
    };

    const handleUserSwitch = () => {
      const userSims = getSavedSimulationConfigs(userId);
      setConfigs(userSims);
      setActiveSimulationId(userSims[0]?.id || null);
    };

    window.addEventListener('mensah_simulations_store_updated', handleUpdate);
    window.addEventListener('mensah_user_switched', handleUserSwitch);
    return () => {
      window.removeEventListener('mensah_simulations_store_updated', handleUpdate);
      window.removeEventListener('mensah_user_switched', handleUserSwitch);
    };
  }, [userId]);

  // Compute live results for all simulations
  const simulationResultsList = useMemo(() => {
    return getAllSimulationResults(configs, traders);
  }, [configs, traders]);

  // Virtual balance calculations
  const openPositionsCollateral = useMemo(() => {
    return openPositions.reduce((sum, p) => sum + p.amount, 0);
  }, [openPositions]);

  const activeCommittedFunds = useMemo(() => {
    return configs
      .filter((c) => c.status === 'active')
      .reduce((sum, c) => sum + (c.startingBalance || 0), 0);
  }, [configs]);

  const availableVirtualBalance = Math.max(0, totalVirtualBalance);

  // Current active simulation result
  const activeSimulationResult = useMemo(() => {
    if (!activeSimulationId) {
      return simulationResultsList[0]?.result || null;
    }
    const found = simulationResultsList.find((item) => item.config.id === activeSimulationId);
    return found ? found.result : simulationResultsList[0]?.result || null;
  }, [simulationResultsList, activeSimulationId]);

  // Current active trader for the simulation
  const activeTrader = useMemo(() => {
    if (!activeSimulationResult) return selectedTrader || traders[0] || null;
    return (
      traders.find(
        (t) => t.address.toLowerCase() === activeSimulationResult.config.traderAddress.toLowerCase()
      ) ||
      selectedTrader ||
      traders[0] ||
      null
    );
  }, [activeSimulationResult, traders, selectedTrader]);

  // Toggle status (Pause / Resume)
  const handleToggleStatus = (id: string, currentStatus: SimulationStatus) => {
    const nextStatus: SimulationStatus = currentStatus === 'active' ? 'paused' : 'active';
    const updated = updateSimulationStatus(id, nextStatus, userId);
    setConfigs(updated);
  };

  // Stop simulation
  const handleStopSimulation = (id: string) => {
    const updated = updateSimulationStatus(id, 'stopped', userId);
    setConfigs(updated);
  };

  // Delete confirmation
  const handleConfirmDelete = () => {
    if (!deletingConfig) return;
    const updated = deleteSimulation(deletingConfig.id, userId);
    setConfigs(updated);
    if (activeSimulationId === deletingConfig.id) {
      setActiveSimulationId(updated[0]?.id || null);
    }
    setDeletingConfig(null);
  };

  // New simulation created
  const handleSimulationCreated = (newConfig: SimulationConfig) => {
    setConfigs(getSavedSimulationConfigs(userId));
    setActiveSimulationId(newConfig.id);
    setIsCreateModalOpen(false);
    setViewTab('details');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Practice Trading Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#059669]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Practice Trading
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-[#059669]">
                $10,000 Virtual Funds
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate trades risk-free using live Strike Finance market prices and candlestick charts.
            </p>
          </div>
        </div>

        {/* 3 Main Action Mode Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setMainMode('solo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mainMode === 'solo'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-3.5 h-3.5 text-emerald-600" />
            <span>Start Practising</span>
          </button>

          <button
            onClick={() => setMainMode('running')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mainMode === 'running'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Trades Currently Running</span>
            {openPositions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500 text-slate-950">
                {openPositions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainMode('strategy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mainMode === 'strategy'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Follow a Strategy</span>
          </button>
        </div>
      </div>

      {/* Virtual Account Practice Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#059669] shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Virtual Balance
              </span>
              <span className="font-mono text-lg font-extrabold text-slate-900">
                {formatUSD(totalVirtualBalance)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Practice trading with virtual funds using verified live market prices. No real money is risked.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 font-medium uppercase font-sans block">Funds In Running Trades</span>
            <span className="font-bold text-slate-800 text-sm">
              {formatUSD(openPositionsCollateral)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-medium uppercase font-sans block">Available Capital</span>
            <span className="font-extrabold text-[#059669] text-sm">
              {formatUSD(availableVirtualBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* MODE 1: SOLO PRACTICE DESK (Open simulated trades on real charts) */}
      {mainMode === 'solo' && (
        <SoloPracticeDesk
          markets={markets}
          userVirtualBalance={availableVirtualBalance}
          onTradeOpened={() => {
            loadPositions();
            setMainMode('running');
          }}
          onOpenCopilot={onOpenCopilot}
        />
      )}

      {/* MODE 2: TRADES CURRENTLY RUNNING & HISTORY */}
      {mainMode === 'running' && (
        <RunningTradesSection
          openPositions={openPositions}
          closedPositions={closedPositions}
          currentPrices={currentPricesMap}
          onTradesUpdated={loadPositions}
          onOpenPracticeDesk={() => setMainMode('solo')}
        />
      )}

      {/* MODE 3: STRATEGY SIMULATION (Follow another trader's strategy) */}
      {mainMode === 'strategy' && (
        <div className="space-y-4">
          {/* Quick Strategy Switcher Ribbon if multiple simulations exist */}
          {configs.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-medium whitespace-nowrap text-[11px]">
                Switch Strategy:
              </span>
              {simulationResultsList.map(({ config, result }) => {
                const isSelected = config.id === activeSimulationResult.config.id;
                const isPos = result.netPnL >= 0;

                return (
                  <button
                    key={config.id}
                    onClick={() => setActiveSimulationId(config.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <span>{config.name}</span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        isPos ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isPos ? '+' : ''}
                      {result.roiPct.toFixed(1)}%
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Simulation Dashboard */}
          <SimulationResultsDashboard
            result={activeSimulationResult}
            trader={activeTrader}
            onToggleStatus={handleToggleStatus}
            onStopSimulation={handleStopSimulation}
            onDeleteRequest={() => setDeletingConfig(activeSimulationResult.config)}
            onNewSimulationRequest={() => setIsCreateModalOpen(true)}
          />
        </div>
      )}

      {/* VIEW 2: ALL SIMULATIONS LIST */}
      {viewTab === 'all' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Portfolio Simulation Management
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage active backtests, toggle execution states, review completed strategies, and inspect results.
                </p>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Strategy</span>
              </button>
            </div>

            {/* Simulations Grid / List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {simulationResultsList.map(({ config, result }) => {
                const isPos = result.netPnL >= 0;

                return (
                  <div
                    key={config.id}
                    className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-200 transition-colors flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top status & tags */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            config.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : config.status === 'paused'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : config.status === 'stopped'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {config.status}
                        </span>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                          <span>{config.period.toUpperCase()}</span>
                          <span>·</span>
                          <span>{config.maxLeverage}x Lev</span>
                        </div>
                      </div>

                      {/* Name & Trader */}
                      <h4 className="text-sm font-bold text-slate-900 tracking-tight">{config.name}</h4>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Lead Trader: <strong className="text-slate-800">{config.traderName}</strong> ({config.traderStyle})
                      </div>

                      {/* Core KPI metrics row */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400">Allocated Bal</span>
                          <div className="font-mono font-semibold text-slate-900">
                            {formatUSD(result.startingBalance)}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400">Sim Balance</span>
                          <div className="font-mono font-semibold text-slate-800">
                            {formatUSD(result.currentBalance)}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400">Simulated Return</span>
                          <div
                            className={`font-mono font-bold ${
                              isPos ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPos ? '+' : ''}
                            {result.roiPct.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* Sub-metrics */}
                      <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
                        <span>Max DD: -{result.maxDrawdownPct.toFixed(1)}%</span>
                        <span>Win Rate: {result.winRatePct.toFixed(0)}%</span>
                        <span>{result.totalTrades} Trades</span>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        {/* Pause / Resume */}
                        {config.status !== 'stopped' && (
                          <button
                            onClick={() => handleToggleStatus(config.id, config.status)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors border border-slate-200 cursor-pointer"
                          >
                            {config.status === 'active' ? 'Pause' : 'Resume'}
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => setDeletingConfig(config)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete simulation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Open Details */}
                      <button
                        onClick={() => {
                          setActiveSimulationId(config.id);
                          setViewTab('details');
                        }}
                        className="px-3 py-1.5 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create Simulation Modal */}
      {isCreateModalOpen && (
        <CreateSimulationModal
          traders={traders}
          initialTrader={selectedTrader || activeTrader}
          onClose={() => setIsCreateModalOpen(false)}
          onSimulationCreated={handleSimulationCreated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingConfig && (
        <DeleteSimulationModal
          config={deletingConfig}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingConfig(null)}
        />
      )}
    </div>
  );
};
