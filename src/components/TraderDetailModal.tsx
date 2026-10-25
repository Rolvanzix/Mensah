import React, { useEffect, useState } from 'react';
import { Trader } from '../types/strike';
import {
  fetchTraderDetail,
  formatPercent,
  formatTradingStyle,
  formatUSD,
  getCopyScoreMeta,
  getDrawdown30d,
  getTraderActiveDays,
  getTraderProfitFactor,
  getTraderRiskClassification,
  getTraderWinRate,
  getTrader24hVolatility,
  truncateAddress,
} from '../services/strikeApi';
import { RechartsEquityArea } from './charts/RechartsEquityArea';
import { RechartsCoverageChart } from './charts/RechartsCoverageChart';
import { ScoreRadialGauge } from './ui/ScoreRadialGauge';
import { RiskBarGauge } from './ui/RiskBarGauge';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Bot,
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Layers,
  LineChart,
  Percent,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

interface TraderDetailModalProps {
  trader: Trader;
  onClose: () => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (address: string) => void;
  onSimulate: (trader: Trader) => void;
  onOpenCopilot?: (trader: Trader, initialPrompt?: string) => void;
}

export const TraderDetailModal: React.FC<TraderDetailModalProps> = ({
  trader: initialTrader,
  onClose,
  isWatchlisted,
  onToggleWatchlist,
  onSimulate,
  onOpenCopilot,
}) => {
  const [trader, setTrader] = useState<Trader>(initialTrader);
  const [loading, setLoading] = useState<boolean>(false);
  const [curveDisplayMode, setCurveDisplayMode] = useState<'both' | 'equity' | 'pnl' | 'roi'>('both');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const loadDetail = async () => {
      setLoading(true);
      try {
        const full = await fetchTraderDetail(initialTrader.address);
        if (isMounted) setTrader(full);
      } catch (err: any) {
        console.warn('Using cached discover data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [initialTrader.address]);

  const copyScore = parseFloat(trader.copy_score || '0');
  const scoreMeta = getCopyScoreMeta(copyScore);
  const maxDd = getDrawdown30d(trader);
  const roi30d = parseFloat(trader.roi?.['30d'] || '0');
  const pnl30d = parseFloat(trader.pnl?.['30d'] || '0');
  const isPos = roi30d >= 0;
  const volAlert = getTrader24hVolatility(trader);
  const riskClass = getTraderRiskClassification(trader);
  const winRate = getTraderWinRate(trader);
  const profitFactor = getTraderProfitFactor(trader);
  const activeDays = getTraderActiveDays(trader);
  const peakPos = parseFloat(trader.peak_concurrent_entries || '1');

  const handleCopy = () => {
    navigator.clipboard.writeText(trader.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const breakdown = trader.copy_score_breakdown || trader.copy_score_breakdowns?.['30d'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#101520] border border-[#1c2438] rounded-3xl w-full max-w-5xl my-auto overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1c2438] bg-[#0a0d14] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#19202f] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 min-w-0">
              <ScoreRadialGauge score={copyScore} size={42} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white truncate">
                    {trader.display_name || truncateAddress(trader.address, 6)}
                  </h2>
                  <button
                    onClick={handleCopy}
                    title="Copy Address"
                    className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#00f29d]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href="https://app.hyperliquid.xyz/trade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-300 p-0.5"
                    title="View on Hyperliquid"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="capitalize font-semibold text-slate-300">{trader.platform || 'Strike'}</span>
                  <span className="text-slate-600">·</span>
                  <span>{formatTradingStyle(trader.style)}</span>
                  <span className="text-slate-600">·</span>
                  <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold border font-mono ${riskClass.badgeClass}`}>
                    {riskClass.label}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-[10px] text-[#00f29d] flex items-center gap-1 font-mono">
                    <BadgeCheck className="w-3 h-3" />
                    Verified On-Chain Data
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenCopilot && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCopilot(
                    trader,
                    `Explain ${trader.display_name || truncateAddress(trader.address, 4)}'s trading style and risks in plain English.`
                  );
                }}
                className="px-3.5 py-2 rounded-xl border border-[#1c2438] bg-[#121722] text-slate-300 hover:text-[#00f29d] hover:border-[#00f29d]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Ask MENSAH"
              >
                <Bot className="w-4 h-4 text-[#00f29d]" />
                <span className="hidden sm:inline">Ask MENSAH</span>
              </button>
            )}

            <button
              onClick={() => onToggleWatchlist(trader.address)}
              className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                isWatchlisted
                  ? 'bg-amber-400/15 border-amber-500/40 text-amber-400'
                  : 'bg-[#121722] border-[#1c2438] text-slate-400 hover:text-white'
              }`}
              title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Bookmark className={`w-4 h-4 ${isWatchlisted ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => {
                onClose();
                onSimulate(trader);
              }}
              className="px-4 py-2 bg-[#00f29d] hover:bg-[#50ffae] text-[#003921] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#00f29d]/15 transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>Practise Strategy</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#19202f] transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Volatility Alert Banner (if active) */}
          {volAlert.hasAlert && (
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                volAlert.severity === 'high'
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  : 'bg-amber-950/25 border-amber-500/35 text-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    volAlert.severity === 'high' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {volAlert.severity === 'high'
                        ? 'Severe 24h Drawdown Spike Detected'
                        : '24-Hour Volatility Alert'}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/40 text-white font-mono">
                      -{volAlert.drawdown24hPct.toFixed(1)}% dip
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {volAlert.description} Past 24h net return: {volAlert.roi1dPct >= 0 ? '+' : ''}
                    {volAlert.roi1dPct.toFixed(1)}%. We recommend checking simulation results and maintaining conservative leverage.
                  </p>
                </div>
              </div>

              {onOpenCopilot && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCopilot(
                      trader,
                      `Explain the 24h Volatility Alert on ${trader.display_name || truncateAddress(trader.address, 4)}. Is it safe to copy right now?`
                    );
                  }}
                  className="px-3.5 py-2 bg-[#121722] hover:bg-[#19202f] text-[#00f29d] border border-[#00f29d]/30 hover:border-[#00f29d] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  <span>Ask Copilot</span>
                </button>
              )}
            </div>
          )}

          {/* FEATURE 3: TRANSPARENT RISK SCORING PANEL */}
          <div className="bg-[#121722] rounded-2xl p-5 border border-[#1c2438] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#1c2438]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00f29d]" />
                <h3 className="font-bold text-sm text-white">Transparent Risk Scoring & Evaluation</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border font-mono ${riskClass.badgeClass}`}>
                {riskClass.label}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {riskClass.description}
            </p>

            {/* Contributing factors bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {riskClass.factors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-300 bg-[#0a0d14] p-2.5 rounded-xl border border-[#1c2438]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d] shrink-0 mt-1.5" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>

            {/* Mandatory Non-Misleading Risk Disclosure */}
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/25 text-[11px] text-amber-200/90 leading-relaxed">
              <strong>Risk Notice:</strong> A trader is not classified as safe merely because they have historically generated positive returns. Perpetual trading involves leverage and liquidation risks. Past performance on Strike does not guarantee future results.
            </div>
          </div>

          {/* FEATURE 2: TRACEABLE PERFORMANCE METRICS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#121722] p-3.5 rounded-2xl border border-[#1c2438]">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                30D Net Return
              </span>
              <div className={`text-xl font-extrabold my-0.5 tabular-nums font-mono ${isPos ? 'text-[#00f29d]' : 'text-rose-400'}`}>
                {formatPercent(roi30d)}
              </div>
              <span className="text-[10px] text-slate-500 tabular-nums">
                PnL: {pnl30d >= 0 ? '+' : ''}{formatUSD(pnl30d, true)}
              </span>
            </div>

            <div className="bg-[#121722] p-3.5 rounded-2xl border border-[#1c2438]">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                Win Rate
              </span>
              <div className="text-xl font-extrabold text-white my-0.5 tabular-nums font-mono">
                {winRate !== null ? `${winRate.toFixed(1)}%` : 'N/A'}
              </div>
              <span className="text-[10px] text-slate-500">
                Profitable Days / Periods
              </span>
            </div>

            <div className="bg-[#121722] p-3.5 rounded-2xl border border-[#1c2438]">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                Largest Loss from Peak (30D)
              </span>
              <div className="text-xl font-extrabold text-rose-400 my-0.5 tabular-nums font-mono">
                -{maxDd.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500">
                Largest historical drawdown
              </span>
            </div>

            <div className="bg-[#121722] p-3.5 rounded-2xl border border-[#1c2438]">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                Win/Loss Ratio
              </span>
              <div className="text-xl font-extrabold text-cyan-400 my-0.5 tabular-nums font-mono">
                {profitFactor !== null ? `${profitFactor.toFixed(2)}x` : 'N/A'}
              </div>
              <span className="text-[10px] text-slate-500">
                Gross gains / losses ratio
              </span>
            </div>

            <div className="bg-[#121722] p-3.5 rounded-2xl border border-[#1c2438]">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                Active Days
              </span>
              <div className="text-xl font-extrabold text-white my-0.5 tabular-nums font-mono">
                {activeDays}d
              </div>
              <span className="text-[10px] text-slate-500">
                In 30-day window
              </span>
            </div>

            <div className="bg-[#121722] p-3.5 rounded-2xl border border-[#1c2438]">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                Max Concurrent Trades
              </span>
              <div className="text-xl font-extrabold text-white my-0.5 tabular-nums font-mono">
                {peakPos.toFixed(0)}
              </div>
              <span className="text-[10px] text-slate-500">
                Peak running positions
              </span>
            </div>
          </div>

          {/* Historical Performance Curves */}
          <div className="bg-[#121722] rounded-2xl p-5 sm:p-6 border border-[#1c2438] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c2438]">
              <div>
                <h3 className="font-bold text-sm text-white">Historical Performance Curves</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified equity trajectory and cumulative PnL over the last 30 days
                </p>
              </div>

              {/* View Selector */}
              <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-xl border border-[#1c2438] text-xs">
                <button
                  onClick={() => setCurveDisplayMode('both')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer font-medium ${
                    curveDisplayMode === 'both'
                      ? 'bg-[#19202f] text-[#00f29d] font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Both Curves
                </button>
                <button
                  onClick={() => setCurveDisplayMode('equity')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium ${
                    curveDisplayMode === 'equity'
                      ? 'bg-[#19202f] text-[#00f29d] font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Equity ($)
                </button>
                <button
                  onClick={() => setCurveDisplayMode('pnl')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium ${
                    curveDisplayMode === 'pnl'
                      ? 'bg-[#19202f] text-[#00f29d] font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cumulative PnL ($)
                </button>
              </div>
            </div>

            {/* Displaying Both Curves Stacked or Solo */}
            {curveDisplayMode === 'both' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                <div className="bg-[#0a0d14] p-4 rounded-xl border border-[#1c2438]">
                  <RechartsEquityArea
                    equityCurve={trader.equity_curve_30d}
                    pnlCurve={trader.pnl_curve_30d}
                    mode="equity"
                    height={220}
                    title="30-Day Equity Curve ($)"
                  />
                </div>
                <div className="bg-[#0a0d14] p-4 rounded-xl border border-[#1c2438]">
                  <RechartsEquityArea
                    equityCurve={trader.equity_curve_30d}
                    pnlCurve={trader.pnl_curve_30d}
                    mode="pnl"
                    height={220}
                    title="30-Day Cumulative PnL ($)"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-[#0a0d14] p-4 rounded-xl border border-[#1c2438]">
                <RechartsEquityArea
                  equityCurve={trader.equity_curve_30d}
                  pnlCurve={trader.pnl_curve_30d}
                  mode={curveDisplayMode}
                  height={270}
                  title={curveDisplayMode === 'equity' ? '30-Day Equity Curve ($)' : '30-Day Cumulative PnL ($)'}
                />
              </div>
            )}
          </div>

          {/* Multi-Horizon Performance Record */}
          <div className="bg-[#121722] rounded-2xl p-5 border border-[#1c2438]">
            <h3 className="font-bold text-sm text-white mb-1">Multi-Horizon Track Record</h3>
            <p className="text-xs text-slate-400 mb-3">
              Audited historical returns and trading volumes over supported timeframes
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0a0d14] text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-2.5 px-3">Horizon</th>
                    <th className="py-2.5 px-3 text-right">Return (ROI)</th>
                    <th className="py-2.5 px-3 text-right">Net PnL ($)</th>
                    <th className="py-2.5 px-3 text-right">Trading Volume</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2438]">
                  {(['1d', '7d', '30d', 'all'] as const).map((period) => {
                    const roi = parseFloat(trader.roi?.[period] || '0');
                    const pnl = parseFloat(trader.pnl?.[period] || '0');
                    const vol = parseFloat(trader.volume?.[period] || '0');
                    const periodScore = trader.copy_scores?.[period as '7d' | '30d' | 'all'];

                    return (
                      <tr key={period} className="hover:bg-[#19202f]/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-white uppercase font-mono">
                          {period === 'all' ? 'All-Time' : period}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold tabular-nums font-mono ${
                            roi >= 0 ? 'text-[#00f29d]' : 'text-rose-400'
                          }`}
                        >
                          {formatPercent(roi)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-medium tabular-nums font-mono ${
                            pnl >= 0 ? 'text-[#00f29d]' : 'text-rose-400'
                          }`}
                        >
                          {pnl >= 0 ? '+' : ''}{formatUSD(pnl)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums font-mono">
                          {formatUSD(vol, true)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {periodScore ? (
                            <span className="font-bold text-white bg-[#0a0d14] px-2 py-0.5 rounded text-xs border border-[#1c2438] tabular-nums font-mono">
                              {periodScore}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Traded Assets / Trading History Summary */}
          {trader.top_assets && trader.top_assets.length > 0 && (
            <div className="bg-[#121722] rounded-2xl p-5 border border-[#1c2438] space-y-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#00f29d]" />
                <h3 className="font-bold text-sm text-white">Trading History & Asset Allocation</h3>
              </div>
              <p className="text-xs text-slate-400">
                Primary perpetual contracts actively traded by this lead account on Strike / Hyperliquid order books:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {trader.top_assets.map((asset, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a0d14] border border-[#1c2438] text-xs font-mono"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#00f29d]" />
                    <span className="font-bold text-white">{asset.asset}</span>
                    {asset.symbol && <span className="text-[10px] text-slate-500">{asset.symbol}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strike Score Factor Weights Breakdown */}
          {breakdown && (
            <div className="bg-[#121722] rounded-2xl p-5 border border-[#1c2438]">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#00f29d]" />
                <h3 className="font-bold text-sm text-white">Strike Quantitative Score Factors</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Transparent factor points contributing to the lead trader's 0–100 Strike Score:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(breakdown).map(([key, item]) => {
                  if (!item || typeof item !== 'object') return null;
                  const norm = parseFloat(item.normalized || '0') * 100;
                  const pts = parseFloat(item.points || '0');
                  const label = key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase());

                  return (
                    <div
                      key={key}
                      className="bg-[#0a0d14] p-3.5 rounded-xl border border-[#1c2438] text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-300 mb-1">
                        <span className="font-medium truncate">{label}</span>
                        <span className="font-bold text-[#00f29d] tabular-nums font-mono">{pts.toFixed(1)} pts</span>
                      </div>
                      <div className="w-full bg-[#1c2438] h-1.5 rounded-full overflow-hidden my-2">
                        <div
                          className="bg-[#00f29d] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, norm))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums font-mono">
                        <span>Raw: {item.raw ? parseFloat(item.raw).toFixed(3) : '0'}</span>
                        <span>{norm.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Copy Amount Coverage Ladder */}
          {trader.copy_amount_coverage && trader.copy_amount_coverage.length > 0 && (
            <div className="bg-[#121722] rounded-2xl p-5 border border-[#1c2438]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#38bdf8]" />
                  <h3 className="font-bold text-sm text-white">Execution Coverage Ladder</h3>
                </div>
                <span className="text-xs text-slate-400">Slippage vs Sizing</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Orderbook liquidity depth indicating safe copying size before market impact
              </p>
              <RechartsCoverageChart coverageData={trader.copy_amount_coverage} height={200} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
