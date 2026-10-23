import React, { useState } from 'react';
import { Trader } from '../types/strike';
import {
  formatPercent,
  formatTradingStyle,
  formatUSD,
  getDrawdown30d,
  getTrader24hVolatility,
  truncateAddress,
} from '../services/strikeApi';
import { RechartsSparkline } from './charts/RechartsSparkline';
import { ScoreRadialGauge } from './ui/ScoreRadialGauge';
import { RiskBarGauge } from './ui/RiskBarGauge';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Bot,
  Calculator,
  Check,
  Copy,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface TraderCardProps {
  trader: Trader;
  isWatchlisted: boolean;
  onToggleWatchlist: (address: string) => void;
  onSelectTrader: (trader: Trader) => void;
  onSimulate: (trader: Trader) => void;
  onOpenCopilot?: (trader: Trader, initialPrompt?: string) => void;
}

export const TraderCard: React.FC<TraderCardProps> = ({
  trader,
  isWatchlisted,
  onToggleWatchlist,
  onSelectTrader,
  onSimulate,
  onOpenCopilot,
}) => {
  const [copied, setCopied] = useState(false);

  const copyScore = parseFloat(trader.copy_score || '0');
  const pnl30d = parseFloat(trader.pnl?.['30d'] || '0');
  const roi30d = parseFloat(trader.roi?.['30d'] || '0');
  const isPositive = roi30d >= 0;
  const maxDrawdown = getDrawdown30d(trader);
  const volAlert = getTrader24hVolatility(trader);

  const displayName = trader.display_name || truncateAddress(trader.address, 4);
  const isNamed = Boolean(trader.display_name);

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(trader.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      onClick={() => onSelectTrader(trader)}
      className={`bg-[#121722] rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
        volAlert.severity === 'high'
          ? 'border-rose-500/35 hover:border-rose-500/60 shadow-rose-950/10'
          : volAlert.severity === 'moderate'
          ? 'border-amber-500/30 hover:border-amber-500/50 shadow-amber-950/10'
          : 'border-[#1c2438] hover:border-[#00f29d]/40'
      }`}
    >
      <div>
        {/* Top Header: Identity & Radial Score */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white group-hover:text-[#00f29d] transition-colors truncate">
                {displayName}
              </span>
              {isNamed && (
                <span className="text-xs text-slate-500 tabular-nums">
                  {truncateAddress(trader.address, 3)}
                </span>
              )}
              <button
                onClick={handleCopyAddress}
                title="Copy Address"
                className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[#00f29d]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Clean metadata without pill boxes */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span className="capitalize font-medium text-slate-300">{trader.platform || 'Strike'}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{formatTradingStyle(trader.style)}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="capitalize">{trader.bias || 'Neutral'}</span>
            </div>
          </div>

          {/* Radial Graphical Score & Bookmark */}
          <div className="flex items-center gap-2 shrink-0">
            <ScoreRadialGauge score={copyScore} size={42} strokeWidth={3.5} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist(trader.address);
              }}
              title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
              className={`p-2 rounded-xl border transition-colors ${
                isWatchlisted
                  ? 'bg-amber-400/15 border-amber-500/40 text-amber-400'
                  : 'bg-[#0b0e14] border-[#1c2438] text-slate-500 hover:text-white'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Visual Volatility Alert Pill (Non-chaotic, high signal) */}
        {volAlert.hasAlert && (
          <div
            onClick={(e) => {
              if (onOpenCopilot) {
                e.stopPropagation();
                onOpenCopilot(
                  trader,
                  `Explain the 24h Volatility Alert on ${displayName}. Why did this trader experience a ${volAlert.drawdown24hPct.toFixed(1)}% drawdown spike in the last 24 hours?`
                );
              }
            }}
            className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs my-3 transition-all ${
              volAlert.severity === 'high'
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-300 hover:bg-rose-950/50'
                : 'bg-amber-950/25 border-amber-500/35 text-amber-300 hover:bg-amber-950/45'
            }`}
            title={volAlert.description}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    volAlert.severity === 'high' ? 'bg-rose-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    volAlert.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="font-semibold text-white truncate">
                {volAlert.severity === 'high' ? 'Drawdown Spike' : 'Volatility Alert'}:
              </span>
              <span className="font-bold tabular-nums">
                -{volAlert.drawdown24hPct.toFixed(1)}% (24h)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 shrink-0 ml-2">
              <span>Ask Copilot</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </span>
          </div>
        )}

        {/* Primary Hero Metric: 30D Return + Net Gain */}
        <div className="my-3 flex items-baseline justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              30D Return
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className={`text-2xl font-extrabold tracking-tight tabular-nums ${
                  isPositive ? 'text-[#00f29d]' : 'text-rose-400'
                }`}
              >
                {formatPercent(roi30d)}
              </span>
              <span className="text-xs text-slate-400 font-medium tabular-nums">
                {pnl30d >= 0 ? '+' : ''}{formatUSD(pnl30d, true)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Vault Balance
            </div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5 tabular-nums">
              {formatUSD(trader.account_value, true)}
            </div>
          </div>
        </div>

        {/* Integrated 30D Equity Wave Graphic */}
        <div className="my-3 bg-[#0a0d14] rounded-xl p-2 border border-[#1c2438]">
          <div className="w-full h-12 flex items-center overflow-hidden">
            <RechartsSparkline
              data={trader.equity_curve_30d}
              height={44}
              isPositive={isPositive}
              showTooltip={true}
            />
          </div>
        </div>

        {/* Graphical Risk Bar Gauge */}
        <div className="mt-3 pt-3 border-t border-[#1c2438]">
          <RiskBarGauge drawdownPct={maxDrawdown} />
        </div>
      </div>

      {/* Card Action Controls */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1c2438]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSimulate(trader);
          }}
          className="flex-1 py-2 px-3.5 bg-[#00f29d] hover:bg-[#50ffae] text-[#003921] font-bold text-xs rounded-xl transition-all shadow-md shadow-[#00f29d]/15 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          title="Run Copy Simulation"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Simulate</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectTrader(trader);
          }}
          className="py-2 px-3 bg-[#19202f] hover:bg-[#222c40] text-slate-200 font-medium text-xs rounded-xl transition-colors cursor-pointer"
        >
          Details
        </button>

        {onOpenCopilot && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenCopilot(
                trader,
                `Evaluate ${displayName}. What are the primary risks, and is this trader suitable for copy trading?`
              );
            }}
            title="Ask Strike Copilot about this trader"
            className="p-2 bg-[#0a0d14] hover:bg-[#19202f] text-slate-400 hover:text-[#00f29d] border border-[#1c2438] hover:border-[#00f29d]/40 rounded-xl transition-colors cursor-pointer"
          >
            <Bot className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
