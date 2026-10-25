import React, { useMemo, useState } from 'react';
import { Trader } from '../../types/strike';
import { SimulationConfig, SimulationPeriod } from '../../types/simulator';
import { validateSimulationConfig } from '../../services/simulationEngine';
import { createNewSimulation, getSavedSimulationConfigs } from '../../services/simulationStorage';
import { formatUSD, formatTradingStyle, truncateAddress } from '../../services/strikeApi';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  Play,
  Sliders,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Search,
  CheckCircle2,
  Info,
  Wallet,
} from 'lucide-react';

interface CreateSimulationModalProps {
  traders: Trader[];
  initialTrader?: Trader | null;
  onClose: () => void;
  onSimulationCreated: (newConfig: SimulationConfig) => void;
}

export const CreateSimulationModal: React.FC<CreateSimulationModalProps> = ({
  traders,
  initialTrader,
  onClose,
  onSimulationCreated,
}) => {
  const { firebaseUser, userProfile } = useAuth();
  const userId = firebaseUser?.uid || 'guest_local_user';
  const totalVirtualBalance = userProfile?.virtualBalance ?? 10000;

  // Calculate funds currently allocated to active simulations for this user
  const activeCommittedFunds = useMemo(() => {
    const existing = getSavedSimulationConfigs(userId);
    return existing
      .filter((c) => c.status === 'active')
      .reduce((sum, c) => sum + (c.startingBalance || 0), 0);
  }, [userId]);

  const availableVirtualBalance = Math.max(0, totalVirtualBalance - activeCommittedFunds);

  const [selectedTraderAddress, setSelectedTraderAddress] = useState<string>(
    initialTrader?.address || traders[0]?.address || ''
  );
  // Default to 2500 or availableVirtualBalance if smaller
  const [startingBalance, setStartingBalance] = useState<number>(
    Math.min(2500, Math.max(500, availableVirtualBalance))
  );
  const [maxAllocationPct, setMaxAllocationPct] = useState<number>(20); // 20%
  const [maxLeverage, setMaxLeverage] = useState<number>(3);
  const [period, setPeriod] = useState<SimulationPeriod>('30d');
  const [strategyName, setStrategyName] = useState<string>('');
  const [traderSearch, setTraderSearch] = useState<string>('');

  const activeTrader = useMemo(() => {
    return traders.find((t) => t.address.toLowerCase() === selectedTraderAddress.toLowerCase()) || traders[0];
  }, [traders, selectedTraderAddress]);

  // Max allocation calculated in USD
  const maxAllocationPerTrade = useMemo(() => {
    return +(startingBalance * (maxAllocationPct / 100)).toFixed(0);
  }, [startingBalance, maxAllocationPct]);

  // Validation
  const validation = useMemo(() => {
    const baseVal = validateSimulationConfig({
      startingBalance,
      maxAllocationPerTrade,
      maxLeverage,
      period,
    });

    const customErrors = [...baseVal.errors];
    if (availableVirtualBalance > 0 && startingBalance > availableVirtualBalance) {
      customErrors.push(
        `Allocation of ${formatUSD(startingBalance)} exceeds your available virtual balance (${formatUSD(availableVirtualBalance)}).`
      );
    }

    return {
      ...baseVal,
      errors: customErrors,
      isValid: customErrors.length === 0,
    };
  }, [startingBalance, maxAllocationPerTrade, maxLeverage, period, availableVirtualBalance]);

  // Filtered trader options for selector
  const filteredTraderList = useMemo(() => {
    if (!traderSearch.trim()) return traders;
    const q = traderSearch.toLowerCase().trim();
    return traders.filter(
      (t) =>
        t.display_name?.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q) ||
        t.style?.toLowerCase().includes(q)
    );
  }, [traders, traderSearch]);

  // Balance presets adapted to available virtual balance
  const balancePresets = useMemo(() => {
    const defaultList = [500, 1000, 2500, 5000];
    const filtered = defaultList.filter((p) => p <= availableVirtualBalance);
    if (availableVirtualBalance > 0 && !filtered.includes(availableVirtualBalance)) {
      filtered.push(availableVirtualBalance);
    }
    return filtered.length > 0 ? filtered : [500];
  }, [availableVirtualBalance]);

  const handleStartSimulation = () => {
    if (!validation.isValid || !activeTrader) return;

    const { config } = createNewSimulation({
      name: strategyName,
      trader: activeTrader,
      startingBalance,
      maxAllocationPerTrade,
      maxAllocationPct,
      maxLeverage,
      period,
    }, userId);

    onSimulationCreated(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#059669]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Simulate Copy-Trader
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-[#059669]">
                  Practice Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Deterministic trade simulation using Strike Finance perpetual data and isolated margin rules.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-6 text-xs text-slate-700">
          {/* Virtual Balance Info Card */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100/80 text-[#059669] shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Virtual Balance:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    {formatUSD(totalVirtualBalance)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Practice with virtual funds using live market prices. No real money is traded.
                </p>
              </div>
            </div>

            <div className="sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l border-emerald-200 pt-2 sm:pt-0 sm:pl-4">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Available to Allocate</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">
                {formatUSD(availableVirtualBalance)}
              </span>
            </div>
          </div>

          {/* 1. Trader Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Select Trader to Mirror
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedTraderAddress}
                  onChange={(e) => setSelectedTraderAddress(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-medium outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] cursor-pointer shadow-xs"
                >
                  {filteredTraderList.map((t) => (
                    <option key={t.address} value={t.address}>
                      {t.display_name || truncateAddress(t.address, 6)} · {formatTradingStyle(t.style)} · Score {parseFloat(t.copy_score || '0').toFixed(0)} · 30D ROI {t.roi?.['30d'] ? `${(parseFloat(t.roi['30d']) * 100).toFixed(0)}%` : '0%'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Trader Badge Snapshot */}
            {activeTrader && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900 text-sm">
                    {activeTrader.display_name || truncateAddress(activeTrader.address, 6)}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Platform: <span className="capitalize text-slate-700 font-medium">{activeTrader.platform || 'Strike'}</span> · Style: <span className="text-slate-700 font-medium">{formatTradingStyle(activeTrader.style)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Copy Score</span>
                    <div className="font-bold text-[#059669] font-mono text-sm">
                      {parseFloat(activeTrader.copy_score || '0').toFixed(0)}/100
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">30D ROI</span>
                    <div className="font-bold text-slate-800 font-mono text-sm">
                      {activeTrader.roi?.['30d'] ? `+${(parseFloat(activeTrader.roi['30d']) * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Virtual Capital Allocation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="starting-balance-input" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Allocate Virtual Funds (USD)
              </label>
              <span className="font-mono text-xs font-bold text-[#059669]">
                {formatUSD(startingBalance)}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {balancePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setStartingBalance(preset)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-mono font-semibold transition-colors border cursor-pointer ${
                    startingBalance === preset
                      ? 'bg-emerald-50 border-[#059669] text-[#059669]'
                      : 'bg-[#f8fafc] border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  ${preset >= 1000 ? `${preset / 1000}k` : preset}
                </button>
              ))}
            </div>

            <input
              id="starting-balance-input"
              type="number"
              min="100"
              max={availableVirtualBalance}
              step="100"
              value={startingBalance}
              onChange={(e) => setStartingBalance(Math.max(0, Number(e.target.value)))}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 font-mono font-medium outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-xs"
            />
            <p className="text-[11px] text-slate-500">
              Allocated virtual funds are deducted from your available balance while the copy simulation runs.
            </p>
          </div>

          {/* 3. Max Allocation Per Trade */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="allocation-slider" className="font-bold text-slate-800 uppercase tracking-wider">
                3. Maximum Allocation Per Trade
              </label>
              <div className="text-right font-mono">
                <span className="text-[#059669] font-bold">{maxAllocationPct}%</span>
                <span className="text-slate-500 text-[11px] ml-1.5">
                  ({formatUSD(maxAllocationPerTrade)} max margin)
                </span>
              </div>
            </div>

            <input
              id="allocation-slider"
              type="range"
              min="5"
              max="50"
              step="5"
              value={maxAllocationPct}
              onChange={(e) => setMaxAllocationPct(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#059669]"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>5% (Conservative)</span>
              <span>20% (Recommended)</span>
              <span>35% (Aggressive)</span>
              <span>50% (Max)</span>
            </div>
          </div>

          {/* 4. Maximum Leverage Cap */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="leverage-slider" className="font-bold text-slate-800 uppercase tracking-wider">
                4. Maximum Leverage Cap
              </label>
              <span className="font-mono text-xs font-bold text-[#059669]">{maxLeverage}x</span>
            </div>

            <input
              id="leverage-slider"
              type="range"
              min="1"
              max="20"
              step="1"
              value={maxLeverage}
              onChange={(e) => setMaxLeverage(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#059669]"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>1x (Spot-like)</span>
              <span>3x (Standard)</span>
              <span>5x (Moderate)</span>
              <span>10x (Elevated)</span>
              <span>20x (Extreme)</span>
            </div>

            {maxLeverage > 5 && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-[11px] text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  High leverage increases liquidation sensitivity. At {maxLeverage}x, a ~{(100 / maxLeverage - 2).toFixed(1)}% adverse price move triggers simulated liquidation.
                </span>
              </div>
            )}
          </div>

          {/* 5. Historical Period */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              5. Backtest Period
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['7d', '14d', '30d', '90d'] as SimulationPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors border cursor-pointer ${
                    period === p
                      ? 'bg-emerald-50 border-[#059669] text-[#059669]'
                      : 'bg-[#f8fafc] border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {p.toUpperCase()} Window
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Derives trade events from {activeTrader?.display_name || 'the trader'}&apos;s verified trade history over this period.
            </p>
          </div>

          {/* Optional Strategy Name */}
          <div className="space-y-1.5">
            <label htmlFor="strategy-name-input" className="block text-xs font-bold text-slate-700">
              Custom Strategy Label (Optional)
            </label>
            <input
              id="strategy-name-input"
              type="text"
              placeholder={`e.g. ${activeTrader?.display_name || 'Alpha'} · ${maxLeverage}x Model`}
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-xs"
            />
          </div>

          {/* Validation Errors & Warnings */}
          {validation.errors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Configuration Invalidation</span>
              </div>
              {validation.errors.map((err, idx) => (
                <div key={idx} className="pl-5">• {err}</div>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Risk Advisory Notes</span>
              </div>
              {validation.warnings.map((warn, idx) => (
                <div key={idx} className="pl-5">• {warn}</div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800">Allocation:</span> {formatUSD(startingBalance)} · {maxLeverage}x Max Lev · {period.toUpperCase()} Window
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleStartSimulation}
              disabled={!validation.isValid}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Copy Simulation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
