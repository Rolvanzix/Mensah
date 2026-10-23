import React, { useMemo, useState } from 'react';
import { ConfidenceLevel, CopyMode, RecommendationAnalysis, SimulatorParams, Trader } from '../types/strike';
import { getAdvancedRecommendation, runCopySimulation } from '../utils/simulation';
import {
  formatPercent,
  formatTradingStyle,
  formatUSD,
  getCopyScoreMeta,
  getDrawdown30d,
  truncateAddress,
} from '../services/strikeApi';
import { RechartsSimulatedEquityCurve } from './charts/RechartsSimulatedEquityCurve';
import { ScoreRadialGauge } from './ui/ScoreRadialGauge';
import { RiskBarGauge } from './ui/RiskBarGauge';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Flame,
  Info,
  Scale,
  Shield,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';

interface CopySimulatorProps {
  traders: Trader[];
  selectedTrader: Trader | null;
  onSelectTrader: (trader: Trader) => void;
  watchlistAddresses: string[];
}

export const CopySimulator: React.FC<CopySimulatorProps> = ({
  traders,
  selectedTrader,
  onSelectTrader,
  watchlistAddresses,
}) => {
  const [capital, setCapital] = useState<number>(2000);
  const [copyMode, setCopyMode] = useState<CopyMode>('fixed_ratio');
  const [leverage, setLeverage] = useState<number>(2);
  const [maxMarginPerSymbol, setMaxMarginPerSymbol] = useState<number>(500);
  const [fixedAmountPerTrade, setFixedAmountPerTrade] = useState<number>(200);
  const [feeBufferBps, setFeeBufferBps] = useState<number>(8);
  const [appliedJustNow, setAppliedJustNow] = useState<boolean>(false);

  const activeTrader = selectedTrader || traders[0] || null;

  // Run comprehensive recommendation analysis
  const analysis = useMemo<RecommendationAnalysis | null>(() => {
    if (!activeTrader) return null;
    return getAdvancedRecommendation(activeTrader, capital, { feeBufferBps });
  }, [activeTrader, capital, feeBufferBps]);

  const handleApplyRecommended = () => {
    if (!analysis) return;
    setCopyMode(analysis.suggestedParams.copyMode);
    setLeverage(analysis.suggestedParams.leverage);
    setMaxMarginPerSymbol(analysis.suggestedParams.maxMarginPerSymbol);
    setFixedAmountPerTrade(analysis.suggestedParams.fixedAmountPerTrade);
    setAppliedJustNow(true);
    setTimeout(() => setAppliedJustNow(false), 2000);
  };

  const currentParams: SimulatorParams = {
    capital,
    copyMode,
    leverage,
    maxMarginPerSymbol,
    fixedAmountPerTrade,
    feeBufferBps,
  };

  const simulationResult = useMemo(() => {
    if (!activeTrader) return null;
    return runCopySimulation(activeTrader, currentParams);
  }, [activeTrader, currentParams]);

  const comparisonResults = useMemo(() => {
    if (!activeTrader) return null;
    const ratioResult = runCopySimulation(activeTrader, {
      ...currentParams,
      copyMode: 'fixed_ratio',
    });
    const amountResult = runCopySimulation(activeTrader, {
      ...currentParams,
      copyMode: 'fixed_amount',
    });
    return { ratioResult, amountResult };
  }, [activeTrader, currentParams]);

  if (!activeTrader) {
    return (
      <div className="bg-[#121722] border border-[#1c2438] rounded-2xl p-12 text-center text-slate-400">
        <Sliders className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-base font-bold text-white mb-1">No Trader Selected</h3>
        <p className="text-xs text-slate-400">
          Select a trader from the discovery list or watchlist to run a copy simulation.
        </p>
      </div>
    );
  }

  const scoreMeta = getCopyScoreMeta(activeTrader.copy_score);

  const recommendedResult = analysis?.winnerMode === 'fixed_amount'
    ? comparisonResults?.amountResult || simulationResult
    : comparisonResults?.ratioResult || simulationResult;

  const comparisonResult = analysis?.winnerMode === 'fixed_amount'
    ? comparisonResults?.ratioResult
    : comparisonResults?.amountResult;

  return (
    <div className="space-y-6">
      {/* Top Trader Selector Header */}
      <div className="bg-[#121722] rounded-2xl p-4 sm:p-5 border border-[#1c2438] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <ScoreRadialGauge score={parseFloat(activeTrader.copy_score || '0')} size={44} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {activeTrader.display_name || truncateAddress(activeTrader.address, 6)}
              </h2>
              <span className="text-xs text-slate-500 tabular-nums">
                ({truncateAddress(activeTrader.address, 4)})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="capitalize">{activeTrader.platform || 'Strike'}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{formatTradingStyle(activeTrader.style)}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-[#00f29d] font-medium">{scoreMeta.tier} Tier</span>
            </div>
          </div>
        </div>

        {/* Switch Trader Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Switch Trader:</span>
          <div className="relative">
            <select
              aria-label="Switch Trader to Simulate"
              value={activeTrader.address}
              onChange={(e) => {
                const found = traders.find((t) => t.address === e.target.value);
                if (found) onSelectTrader(found);
              }}
              className="bg-[#0a0d14] text-slate-200 text-xs font-medium rounded-xl px-3 py-2 pr-8 border border-[#1c2438] outline-none cursor-pointer appearance-none"
            >
              {traders.map((t) => (
                <option key={t.address} value={t.address} className="bg-[#121722]">
                  {t.display_name || truncateAddress(t.address, 4)} ({parseFloat(t.copy_score || '0').toFixed(0)} Score)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Visually Prominent Recommendation Showcase (Non-chaotic, high aesthetic) */}
      {analysis && (
        <section
          aria-labelledby="recommendation-heading"
          className="relative overflow-hidden bg-gradient-to-b from-[#162030] to-[#111722] rounded-2xl p-5 sm:p-6 border border-[#00f29d]/40 shadow-xl"
        >
          {/* Subtle ambient glow backdrop */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#00f29d]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          {/* Top Banner: Winner & Confidence */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/50">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00f29d] bg-[#00f29d]/15 px-2.5 py-1 rounded-lg border border-[#00f29d]/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Optimal Strategy Recommendation</span>
                </span>
                {analysis.wasCloseCall && (
                  <span className="text-xs text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    <span>Scores within 10% · Lower drawdown favored</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00f29d] text-[#003921] flex items-center justify-center font-bold shadow-md shadow-[#00f29d]/20 shrink-0">
                  <Trophy className="w-5 h-5 fill-[#003921]" />
                </div>
                <div>
                  <h3 id="recommendation-heading" className="text-2xl font-extrabold text-white tracking-tight">
                    {analysis.winnerMode === 'fixed_ratio' ? 'Fixed Ratio' : 'Fixed Amount'} Mode
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Empirically proven to deliver higher returns per dollar of maximum drawdown.
                  </p>
                </div>
              </div>
            </div>

            {/* Confidence & Action */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-[#0a0d14]/80 border border-[#1c2438] rounded-xl px-4 py-2.5 flex flex-col items-start sm:items-end">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-slate-400">Confidence:</span>
                  <span className={`font-semibold ${
                    analysis.confidence === 'High'
                      ? 'text-[#00f29d]'
                      : analysis.confidence === 'Medium'
                      ? 'text-[#38bdf8]'
                      : 'text-amber-400'
                  }`}>
                    {analysis.confidence}
                  </span>
                </div>
                {/* Visual 3-bar confidence indicator */}
                <div className="flex items-center gap-1 mt-1.5">
                  <div className={`h-1.5 w-5 rounded-full ${
                    analysis.confidence === 'High' ? 'bg-[#00f29d]' : analysis.confidence === 'Medium' ? 'bg-[#38bdf8]' : 'bg-amber-400'
                  }`} />
                  <div className={`h-1.5 w-5 rounded-full ${
                    analysis.confidence === 'High' ? 'bg-[#00f29d]' : analysis.confidence === 'Medium' ? 'bg-[#38bdf8]' : 'bg-slate-700'
                  }`} />
                  <div className={`h-1.5 w-5 rounded-full ${
                    analysis.confidence === 'High' ? 'bg-[#00f29d]' : 'bg-slate-700'
                  }`} />
                </div>
              </div>

              <button
                onClick={handleApplyRecommended}
                className="px-4 py-2.5 bg-[#00f29d] hover:bg-[#50ffae] text-[#003921] font-bold text-xs rounded-xl shadow-lg shadow-[#00f29d]/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                {appliedJustNow ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 fill-[#003921] text-[#00f29d]" />
                    <span>Applied to Simulator!</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-[#003921]" />
                    <span>Apply Recommended Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Calm Plain-English Strategy Explanation */}
          <div className="relative z-10 my-4 bg-[#0a0d14]/70 border border-[#1c2438] rounded-xl p-4 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-[#00f29d]/10 text-[#00f29d] shrink-0 mt-0.5">
              <Target className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              <strong className="text-white mr-1.5">Why this mode:</strong>
              {analysis.explanation}
            </p>
          </div>

          {/* 3 Visual Quantitative Pillars (Graphical Representation, Zero Clutter) */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Risk-Adjusted Efficiency Score */}
            <div className="bg-[#0a0d14]/80 p-4 rounded-xl border border-[#1c2438]">
              <div className="text-xs text-slate-400 font-medium">Risk-Adjusted Efficiency</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-[#00f29d] tabular-nums">
                  {analysis.winnerScore.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  vs {analysis.alternateScore.toFixed(2)} alternate
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1c2438] rounded-full mt-2.5 overflow-hidden">
                <div
                  className="h-full bg-[#00f29d] rounded-full"
                  style={{
                    width: `${Math.min(100, (analysis.winnerScore / Math.max(analysis.alternateScore, 1)) * 50)}%`,
                  }}
                />
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
                <span>Net PnL / Max Drawdown</span>
                <span className="text-[#00f29d] font-semibold">
                  {analysis.wasCloseCall ? 'Tie-breaker' : `+${analysis.scoreDifferencePct.toFixed(0)}% better`}
                </span>
              </div>
            </div>

            {/* 2. Suggested Leverage */}
            <div className="bg-[#0a0d14]/80 p-4 rounded-xl border border-[#1c2438]">
              <div className="text-xs text-slate-400 font-medium">Calibrated Leverage</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-[#38bdf8] tabular-nums">
                  {analysis.recommendedLeverage}x
                </span>
                <span className="text-xs text-slate-500 capitalize">
                  ({activeTrader.style || 'Balanced'} style)
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1c2438] rounded-full mt-2.5 overflow-hidden">
                <div
                  className="h-full bg-[#38bdf8] rounded-full"
                  style={{ width: `${(analysis.recommendedLeverage / 10) * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5">
                Tuned to {getDrawdown30d(activeTrader).toFixed(1)}% historical drawdown
              </div>
            </div>

            {/* 3. Position Sizing */}
            <div className="bg-[#0a0d14]/80 p-4 rounded-xl border border-[#1c2438]">
              <div className="text-xs text-slate-400 font-medium">Suggested Position Size</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-white tabular-nums">
                  ${analysis.suggestedPositionSizeUsd.toLocaleString()}
                </span>
                <span className="text-xs text-[#00f29d] font-medium tabular-nums">
                  ~{analysis.suggestedPositionSizePct}% capital
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1c2438] rounded-full mt-2.5 overflow-hidden">
                <div
                  className="h-full bg-slate-200 rounded-full"
                  style={{ width: `${Math.min(100, analysis.suggestedPositionSizePct * 2)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5">
                Max margin cap: ${analysis.suggestedMaxMarginPerSymbol.toLocaleString()}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Simulator Workspace: Side-by-Side Controls & Outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Simulation Controls */}
        <div className="lg:col-span-5 bg-[#121722] rounded-2xl p-5 border border-[#1c2438] space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1c2438]">
            <div className="flex items-center gap-2 font-bold text-sm text-white">
              <Sliders className="w-4 h-4 text-[#00f29d]" />
              <span>Simulation Settings</span>
            </div>
            <button
              onClick={handleApplyRecommended}
              className="text-xs font-medium text-[#00f29d] hover:text-[#50ffae] transition-colors cursor-pointer"
            >
              Reset to Recommended
            </button>
          </div>

          {/* Starting Capital */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="sim-capital-input" className="text-slate-300 font-medium">
                Starting Capital
              </label>
              <span className="font-bold text-white tabular-nums">{formatUSD(capital)}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-sans">
                $
              </span>
              <input
                id="sim-capital-input"
                type="number"
                min="500"
                step="500"
                value={capital}
                onChange={(e) => setCapital(Math.max(100, Number(e.target.value)))}
                className="w-full bg-[#0a0d14] border border-[#1c2438] rounded-xl py-2 pl-7 pr-3 text-sm text-white font-medium outline-none focus:border-[#00f29d] tabular-nums"
              />
            </div>
            {/* Quick capital selector chips */}
            <div className="flex items-center gap-1.5 mt-2">
              {[1000, 2000, 5000, 10000, 25000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setCapital(amt)}
                  className={`flex-1 py-1 rounded-lg text-xs font-medium transition-colors border cursor-pointer tabular-nums ${
                    capital === amt
                      ? 'bg-[#00f29d]/15 border-[#00f29d]/40 text-[#00f29d]'
                      : 'bg-[#0a0d14] border-[#1c2438] text-slate-400 hover:text-white'
                  }`}
                >
                  ${amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* Copy Execution Mode */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Copy Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCopyMode('fixed_ratio')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  copyMode === 'fixed_ratio'
                    ? 'bg-[#19202f] border-[#00f29d]/50 text-white shadow-sm'
                    : 'bg-[#0a0d14] border-[#1c2438] text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs text-white flex items-center justify-between">
                  <span>Fixed Ratio</span>
                  {analysis?.winnerMode === 'fixed_ratio' && (
                    <span className="text-[10px] text-[#00f29d] font-bold">Recommended</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Scales sizing in direct proportion to lead trader.
                </div>
              </button>

              <button
                onClick={() => setCopyMode('fixed_amount')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  copyMode === 'fixed_amount'
                    ? 'bg-[#19202f] border-[#38bdf8]/50 text-white shadow-sm'
                    : 'bg-[#0a0d14] border-[#1c2438] text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs text-white flex items-center justify-between">
                  <span>Fixed Amount</span>
                  {analysis?.winnerMode === 'fixed_amount' && (
                    <span className="text-[10px] text-[#00f29d] font-bold">Recommended</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Allocates constant dollar amount per trade.
                </div>
              </button>
            </div>
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="sim-leverage-slider" className="text-slate-300 font-medium">
                Leverage Multiplier
              </label>
              <span className="font-bold text-[#00f29d] tabular-nums">{leverage}x</span>
            </div>
            <input
              id="sim-leverage-slider"
              aria-label="Leverage Multiplier"
              type="range"
              min="1"
              max="10"
              step="1"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full h-1.5 bg-[#1c2438] rounded-lg appearance-none cursor-pointer accent-[#00f29d]"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>1x (Spot)</span>
              <span>3x (Balanced)</span>
              <span>5x (Aggressive)</span>
              <span>10x (Max)</span>
            </div>
          </div>

          {/* Max Margin Per Symbol */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="sim-max-margin" className="text-slate-300 font-medium">
                Max Margin Per Symbol
              </label>
              <span className="text-slate-400 tabular-nums">
                {((maxMarginPerSymbol / capital) * 100).toFixed(0)}% capital
              </span>
            </div>
            <input
              id="sim-max-margin"
              type="number"
              min="50"
              step="100"
              value={maxMarginPerSymbol}
              onChange={(e) => setMaxMarginPerSymbol(Math.max(50, Number(e.target.value)))}
              className="w-full bg-[#0a0d14] border border-[#1c2438] rounded-xl py-2 px-3 text-sm text-white font-medium outline-none focus:border-[#00f29d] tabular-nums"
            />
          </div>

          {/* Fixed Amount Per Position (if in Fixed Amount mode) */}
          {copyMode === 'fixed_amount' && (
            <div className="bg-[#0a0d14] p-3.5 rounded-xl border border-[#1c2438]">
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="sim-fixed-trade" className="text-slate-300 font-medium">
                  Fixed Margin Per Trade
                </label>
                <span className="text-[#00f29d] font-bold tabular-nums">${fixedAmountPerTrade}</span>
              </div>
              <input
                id="sim-fixed-trade"
                type="number"
                min="50"
                step="50"
                value={fixedAmountPerTrade}
                onChange={(e) => setFixedAmountPerTrade(Math.max(50, Number(e.target.value)))}
                className="w-full bg-[#121722] border border-[#1c2438] rounded-lg py-1.5 px-3 text-xs text-white font-medium outline-none focus:border-[#00f29d] tabular-nums"
              />
            </div>
          )}

          {/* Fee & Slippage Buffer */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="sim-slippage-buffer" className="text-slate-400 font-medium">
                Slippage & Fee Buffer
              </label>
              <span className="text-slate-300 tabular-nums">{(feeBufferBps / 100).toFixed(2)}% ({feeBufferBps} bps)</span>
            </div>
            <input
              id="sim-slippage-buffer"
              aria-label="Execution Slippage Buffer"
              type="range"
              min="0"
              max="20"
              step="2"
              value={feeBufferBps}
              onChange={(e) => setFeeBufferBps(Number(e.target.value))}
              className="w-full h-1.5 bg-[#1c2438] rounded-lg appearance-none cursor-pointer accent-[#00f29d]"
            />
          </div>
        </div>

        {/* Right Column: Outcomes & Simulated Trajectory */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main 4 KPI Outcome Cards */}
          {simulationResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. Net PnL */}
              <div className="bg-[#121722] p-4 rounded-2xl border border-[#1c2438] shadow-sm">
                <div className="text-xs text-slate-400 font-medium">Simulated Net Return</div>
                <div
                  className={`text-xl sm:text-2xl font-extrabold mt-1 tabular-nums ${
                    simulationResult.netPnL >= 0 ? 'text-[#00f29d]' : 'text-rose-400'
                  }`}
                >
                  {simulationResult.netPnL >= 0 ? '+' : ''}
                  {formatUSD(simulationResult.netPnL)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                  {formatPercent(simulationResult.roiPct / 100)} ROI
                </div>
              </div>

              {/* 2. Final Equity */}
              <div className="bg-[#121722] p-4 rounded-2xl border border-[#1c2438] shadow-sm">
                <div className="text-xs text-slate-400 font-medium">Projected Balance</div>
                <div className="text-xl sm:text-2xl font-extrabold text-white mt-1 tabular-nums">
                  {formatUSD(simulationResult.finalEquity)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  From {formatUSD(capital)}
                </div>
              </div>

              {/* 3. Max Drawdown */}
              <div className="bg-[#121722] p-4 rounded-2xl border border-[#1c2438] shadow-sm">
                <div className="text-xs text-slate-400 font-medium">Simulated Max DD</div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-200 mt-1 tabular-nums">
                  -{simulationResult.maxDrawdownPct.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  -${formatUSD(simulationResult.maxDrawdownUsd, true).replace('$', '')} peak dip
                </div>
              </div>

              {/* 4. Profit Factor */}
              <div className="bg-[#121722] p-4 rounded-2xl border border-[#1c2438] shadow-sm">
                <div className="text-xs text-slate-400 font-medium">Profit Factor</div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#38bdf8] mt-1 tabular-nums">
                  {simulationResult.profitFactor > 50 ? '99+' : simulationResult.profitFactor.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {simulationResult.winPeriodsPct.toFixed(0)}% winning steps
                </div>
              </div>
            </div>
          )}

          {/* Risk Alerts (clean & calm) */}
          {simulationResult && simulationResult.warnings.length > 0 && (
            <div className="bg-amber-950/25 border border-amber-500/35 rounded-2xl p-4 text-xs text-amber-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Simulation Risk Notes</span>
              </div>
              {simulationResult.warnings.map((w, idx) => (
                <div key={idx} className="text-slate-300 text-xs pl-5">
                  • {w}
                </div>
              ))}
            </div>
          )}

          {/* Simulated Equity Curve Comparison (Recharts) */}
          {recommendedResult && (
            <div className="bg-[#121722] rounded-2xl p-5 border border-[#1c2438] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-white">Projected Portfolio Trajectory</h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-[#00f29d] font-medium">
                    <span className="w-2.5 h-0.5 bg-[#00f29d] rounded" />
                    <span>Fixed Ratio</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[#38bdf8] font-medium">
                    <span className="w-2.5 h-0.5 bg-[#38bdf8] rounded" />
                    <span>Fixed Amount</span>
                  </span>
                </div>
              </div>
              <RechartsSimulatedEquityCurve
                recommendedResult={recommendedResult}
                comparisonResult={comparisonResult}
                initialCapital={capital}
                height={260}
              />
            </div>
          )}

          {/* Clean Side-by-Side Mode Comparison (Non-chaotic cards) */}
          {comparisonResults && (
            <div className="bg-[#121722] rounded-2xl p-5 border border-[#1c2438] shadow-sm">
              <h4 className="font-bold text-sm text-white mb-3">Mode Comparison Summary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Fixed Ratio Card */}
                <div className={`p-4 rounded-xl border ${
                  analysis?.winnerMode === 'fixed_ratio'
                    ? 'bg-[#00f29d]/10 border-[#00f29d]/40'
                    : 'bg-[#0a0d14] border-[#1c2438]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">Fixed Ratio</span>
                    {analysis?.winnerMode === 'fixed_ratio' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00f29d] text-[#003921]">
                        WINNER
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Net Profit:</span>
                      <span className="font-bold text-[#00f29d] tabular-nums">
                        {formatUSD(comparisonResults.ratioResult.netPnL)} ({formatPercent(comparisonResults.ratioResult.roiPct / 100)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Drawdown:</span>
                      <span className="font-semibold text-slate-200 tabular-nums">
                        -{comparisonResults.ratioResult.maxDrawdownPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Efficiency Score:</span>
                      <span className="font-semibold text-slate-200 tabular-nums">
                        {(comparisonResults.ratioResult.netPnL / Math.max(comparisonResults.ratioResult.maxDrawdownUsd, 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fixed Amount Card */}
                <div className={`p-4 rounded-xl border ${
                  analysis?.winnerMode === 'fixed_amount'
                    ? 'bg-[#00f29d]/10 border-[#00f29d]/40'
                    : 'bg-[#0a0d14] border-[#1c2438]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">Fixed Amount</span>
                    {analysis?.winnerMode === 'fixed_amount' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00f29d] text-[#003921]">
                        WINNER
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Net Profit:</span>
                      <span className="font-bold text-[#38bdf8] tabular-nums">
                        {formatUSD(comparisonResults.amountResult.netPnL)} ({formatPercent(comparisonResults.amountResult.roiPct / 100)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Drawdown:</span>
                      <span className="font-semibold text-slate-200 tabular-nums">
                        -{comparisonResults.amountResult.maxDrawdownPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Efficiency Score:</span>
                      <span className="font-semibold text-slate-200 tabular-nums">
                        {(comparisonResults.amountResult.netPnL / Math.max(comparisonResults.amountResult.maxDrawdownUsd, 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
