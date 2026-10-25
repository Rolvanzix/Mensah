import React, { useState } from 'react';
import { Trader } from '../types/strike';
import {
  formatPercent,
  formatTradingStyle,
  formatUSD,
  getDrawdown30d,
  getTrader24hVolatility,
  getTraderActiveDays,
  getTraderProfitFactor,
  getTraderRiskClassification,
  getTraderWinRate,
  truncateAddress,
} from '../services/strikeApi';
import { RechartsSparkline } from './charts/RechartsSparkline';
import { ScoreRadialGauge } from './ui/ScoreRadialGauge';
import { RiskBarGauge } from './ui/RiskBarGauge';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  Bot,
  Calculator,
  Check,
  Copy,
  Layers,
  Shield,
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
  const roi7d = parseFloat(trader.roi?.['7d'] || '0');
  const isPositive = roi30d >= 0;
  const maxDrawdown = getDrawdown30d(trader);
  const volAlert = getTrader24hVolatility(trader);
  const riskClass = getTraderRiskClassification(trader);
  const winRate = getTraderWinRate(trader);
  const profitFactor = getTraderProfitFactor(trader);
  const activeDays = getTraderActiveDays(trader);

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
      className={`bg-white rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
        volAlert.severity === 'high'
          ? 'border-rose-300 hover:border-rose-400'
          : volAlert.severity === 'moderate'
          ? 'border-amber-300 hover:border-amber-400'
          : 'border-slate-200/90 hover:border-emerald-300'
      }`}
    >
      <div>
        {/* Top Header: Identity, Score, & Risk Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                {displayName}
              </span>
              {isNamed && (
                <span className="text-xs text-slate-400 font-mono">
                  {truncateAddress(trader.address, 3)}
                </span>
              )}
              <button
                onClick={handleCopyAddress}
                title="Copy Address"
                className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Protocol, Style, and Transparent Risk Classification */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="capitalize font-semibold text-slate-700">
                {trader.platform || 'Strike'}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>{formatTradingStyle(trader.style)}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border font-mono ${riskClass.badgeClass}`}>
                {riskClass.label}
              </span>
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
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isWatchlisted
                  ? 'bg-amber-50 border-amber-300 text-amber-600'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Visual Volatility Alert Pill */}
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
            className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs my-2.5 transition-all ${
              volAlert.severity === 'high'
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/70'
                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/70'
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
              <span className="font-semibold text-slate-800 truncate">
                {volAlert.severity === 'high' ? 'Drawdown Spike' : 'Volatility Alert'}:
              </span>
              <span className="font-bold tabular-nums">
                -{volAlert.drawdown24hPct.toFixed(1)}% (24h)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 shrink-0 ml-2">
              <span>Ask MENSAH</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </span>
          </div>
        )}

        {/* Primary Hero Metric: 30D Return + Net Gain */}
        <div className="my-3 flex items-baseline justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              30D Return
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className={`text-2xl font-extrabold tracking-tight tabular-nums ${
                  isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatPercent(roi30d)}
              </span>
              <span className="text-xs text-slate-500 font-medium tabular-nums">
                {pnl30d >= 0 ? '+' : ''}{formatUSD(pnl30d, true)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Vault Balance
            </div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5 tabular-nums">
              {formatUSD(trader.account_value, true)}
            </div>
          </div>
        </div>

        {/* Traceable Metrics Grid (Win Rate, Profit Factor, Active Days) */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] my-2.5">
          <div>
            <span className="text-[10px] text-slate-500 block">Win Rate</span>
            <span className="font-mono font-bold text-slate-900">
              {winRate !== null ? `${winRate.toFixed(1)}%` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Profit Factor</span>
            <span className="font-mono font-bold text-slate-800">
              {profitFactor !== null ? `${profitFactor.toFixed(2)}x` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Active Days</span>
            <span className="font-mono font-bold text-slate-800">
              {activeDays}d / 30d
            </span>
          </div>
        </div>

        {/* Integrated 30D Equity Wave Graphic */}
        <div className="my-2.5 bg-slate-50/80 rounded-xl p-2 border border-slate-200/80">
          <div className="w-full h-11 flex items-center overflow-hidden">
            <RechartsSparkline
              data={trader.equity_curve_30d}
              height={40}
              isPositive={isPositive}
              showTooltip={true}
            />
          </div>
        </div>

        {/* Top Traded Assets Chips */}
        {trader.top_assets && trader.top_assets.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap my-2">
            <span className="text-[10px] text-slate-400 font-medium">Assets:</span>
            {trader.top_assets.slice(0, 4).map((a, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-700"
              >
                {a.asset}
              </span>
            ))}
          </div>
        )}

        {/* Graphical Risk Bar Gauge */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-100">
          <RiskBarGauge drawdownPct={maxDrawdown} />
        </div>
      </div>

      {/* Card Action Controls */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSimulate(trader);
          }}
          className="flex-1 py-2 px-3.5 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          title="Practise Following This Strategy"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Practise Strategy</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectTrader(trader);
          }}
          className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
        >
          View Details
        </button>

        {onOpenCopilot && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenCopilot(
                trader,
                `Evaluate ${displayName}. What are the primary risks, and is this trader suitable for strategy practice?`
              );
            }}
            title="Ask MENSAH about this trader"
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl transition-colors cursor-pointer"
          >
            <Bot className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
