import React, { useEffect, useState } from 'react';
import { Trader } from '../types/strike';
import {
  fetchTraderDetail,
  formatPercent,
  formatTradingStyle,
  formatUSD,
  getCopyScoreMeta,
  getDrawdown30d,
  getTrader24hVolatility,
  truncateAddress,
} from '../services/strikeApi';
import { RechartsEquityArea } from './charts/RechartsEquityArea';
import { RechartsCoverageChart } from './charts/RechartsCoverageChart';
import { ScoreRadialGauge } from './ui/ScoreRadialGauge';
import { RiskBarGauge } from './ui/RiskBarGauge';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Bot,
  Calculator,
  Check,
  Copy,
  ExternalLink,
  Layers,
  LineChart,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
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
                    className="text-slate-500 hover:text-slate-300 p-0.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#00f29d]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href="https://app.hyperliquid.xyz/trade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-300 p-0.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="capitalize">{trader.platform || 'Strike'}</span>
                  <span className="text-slate-600">·</span>
                  <span>{formatTradingStyle(trader.style)}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-[#00f29d] font-medium">{scoreMeta.tier} Tier</span>
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
                    `Analyze ${trader.display_name || truncateAddress(trader.address, 4)}. Is this trader safe to copy given their ${maxDd.toFixed(1)}% historical drawdown?`
                  );
                }}
                className="px-3.5 py-2 rounded-xl border border-[#1c2438] bg-[#121722] text-slate-300 hover:text-[#00f29d] hover:border-[#00f29d]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Ask Strike Copilot"
              >
                <Bot className="w-4 h-4 text-[#00f29d]" />
                <span className="hidden sm:inline">Ask Copilot</span>
              </button>
            )}

            <button
              onClick={() => onToggleWatchlist(trader.address)}
              className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                isWatchlisted
                  ? 'bg-amber-400/15 border-amber-500/40 text-amber-400'
                  : 'bg-[#121722] border-[#1c2438] text-slate-400 hover:text-white'
              }`}
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
              <span>Simulate Strategy</span>
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
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/40 text-white">
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

          {/* 4 Clean Metric Blocks with Graphical Gauge */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#121722] p-4 rounded-2xl border border-[#1c2438]">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Strike Score
              </span>
              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#00f29d] tabular-nums">
                  {copyScore.toFixed(0)}
                </span>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <div className="text-xs text-slate-400">
                {scoreMeta.tier} Grade Quality
              </div>
            </div>

            <div className="bg-[#121722] p-4 rounded-2xl border border-[#1c2438]">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                30D Net Return
              </span>
              <div
                className={`text-2xl sm:text-3xl font-extrabold my-1 tabular-nums ${
                  isPos ? 'text-[#00f29d]' : 'text-rose-400'
                }`}
              >
                {formatPercent(roi30d)}
              </div>
              <div className="text-xs text-slate-400 tabular-nums">
                PnL: {pnl30d >= 0 ? '+' : ''}{formatUSD(pnl30d)}
              </div>
            </div>

            <div className="bg-[#121722] p-4 rounded-2xl border border-[#1c2438]">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                30D Max Drawdown
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-200 my-1 tabular-nums">
                -{maxDd.toFixed(1)}%
              </div>
              <div className="mt-1">
                <RiskBarGauge drawdownPct={maxDd} showDetails={false} />
              </div>
            </div>

            <div className="bg-[#121722] p-4 rounded-2xl border border-[#1c2438]">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Vault Balance
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white my-1 tabular-nums">
                {formatUSD(trader.account_value, true)}
              </div>
              <div className="text-xs text-slate-400">
                {parseFloat(trader.peak_concurrent_entries || '0').toFixed(0)} peak entries
              </div>
            </div>
          </div>

          {/* 30-Day Historical Performance Charts */}
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
            <h3 className="font-bold text-sm text-white mb-3">Multi-Horizon Track Record</h3>
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
                        <td className="py-2.5 px-3 font-semibold text-white uppercase">
                          {period === 'all' ? 'All-Time' : period}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                            roi >= 0 ? 'text-[#00f29d]' : 'text-rose-400'
                          }`}
                        >
                          {formatPercent(roi)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-medium tabular-nums ${
                            pnl >= 0 ? 'text-[#00f29d]' : 'text-rose-400'
                          }`}
                        >
                          {pnl >= 0 ? '+' : ''}{formatUSD(pnl)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                          {formatUSD(vol, true)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {periodScore ? (
                            <span className="font-bold text-white bg-[#0a0d14] px-2 py-0.5 rounded text-xs border border-[#1c2438] tabular-nums">
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

          {/* Score Factor Breakdown */}
          {breakdown && (
            <div className="bg-[#121722] rounded-2xl p-5 border border-[#1c2438]">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#00f29d]" />
                <h3 className="font-bold text-sm text-white">Strike Score Factor Weights</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Empirical quantitative factors contributing to the final Strike Score
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
                        <span className="font-bold text-[#00f29d] tabular-nums">{pts.toFixed(1)} pts</span>
                      </div>
                      <div className="w-full bg-[#1c2438] h-1.5 rounded-full overflow-hidden my-2">
                        <div
                          className="bg-[#00f29d] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, norm))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
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
