import React from 'react';
import { Trader } from '../types/strike';
import {
  formatPercent,
  formatTradingStyle,
  formatUSD,
  getCopyScoreMeta,
  getDrawdown30d,
  getTraderRiskClassification,
  getTraderWinRate,
  getTrader24hVolatility,
  truncateAddress,
} from '../services/strikeApi';
import { RechartsSparkline } from './charts/RechartsSparkline';
import { ScoreRadialGauge } from './ui/ScoreRadialGauge';
import { Bookmark, Calculator, Check, Copy, ExternalLink, Shield } from 'lucide-react';

interface TraderTableProps {
  traders: Trader[];
  isWatchlisted: (address: string) => boolean;
  onToggleWatchlist: (address: string) => void;
  onSelectTrader: (trader: Trader) => void;
  onSimulate: (trader: Trader) => void;
}

export const TraderTable: React.FC<TraderTableProps> = ({
  traders,
  isWatchlisted,
  onToggleWatchlist,
  onSelectTrader,
  onSimulate,
}) => {
  const [copiedAddr, setCopiedAddr] = React.useState<string | null>(null);

  const handleCopy = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedAddr(address);
    setTimeout(() => setCopiedAddr(null), 1500);
  };

  return (
    <div className="w-full overflow-x-auto bg-white border border-slate-200/90 rounded-2xl shadow-xs">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <th className="py-3.5 px-4 w-12 text-center">#</th>
            <th className="py-3.5 px-4">Lead Trader</th>
            <th className="py-3.5 px-4 text-center">Score</th>
            <th className="py-3.5 px-4">Risk Tier</th>
            <th className="py-3.5 px-4 text-right">30D Return</th>
            <th className="py-3.5 px-4 text-right">Win Rate</th>
            <th className="py-3.5 px-4 text-right">Largest Loss (30D)</th>
            <th className="py-3.5 px-4 text-right">Total Profit/Loss ($)</th>
            <th className="py-3.5 px-4 text-right">Vault Balance</th>
            <th className="py-3.5 px-4 text-center w-32">30D Curve</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {traders.map((trader, idx) => {
            const score = parseFloat(trader.copy_score || '0');
            const roi30d = parseFloat(trader.roi?.['30d'] || '0');
            const pnl30d = parseFloat(trader.pnl?.['30d'] || '0');
            const maxDd = getDrawdown30d(trader);
            const volAlert = getTrader24hVolatility(trader);
            const riskClass = getTraderRiskClassification(trader);
            const winRate = getTraderWinRate(trader);
            const isPos = roi30d >= 0;
            const watchlisted = isWatchlisted(trader.address);

            return (
              <tr
                key={trader.address}
                onClick={() => onSelectTrader(trader)}
                className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
              >
                {/* Index */}
                <td className="py-3.5 px-4 text-slate-400 text-center font-medium font-mono">{idx + 1}</td>

                {/* Trader Name / Address */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(trader.address);
                      }}
                      className="text-slate-400 hover:text-amber-500 p-1 cursor-pointer"
                      title={watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${watchlisted ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </button>

                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                        <span>{trader.display_name || truncateAddress(trader.address, 4)}</span>
                        <span className="text-[10px] text-slate-400 capitalize font-normal">
                          · {formatTradingStyle(trader.style)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono">
                        <span>{truncateAddress(trader.address, 3)}</span>
                        <button
                          onClick={(e) => handleCopy(trader.address, e)}
                          title="Copy address"
                          className="hover:text-slate-600 cursor-pointer"
                        >
                          {copiedAddr === trader.address ? (
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-2.5 h-2.5" />
                          )}
                        </button>
                        {volAlert.hasAlert && (
                          <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-sans">
                            24h Dip
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Graphical Radial Score */}
                <td className="py-3.5 px-4 text-center">
                  <div className="flex justify-center">
                    <ScoreRadialGauge score={score} size={34} strokeWidth={3} />
                  </div>
                </td>

                {/* Risk Classification */}
                <td className="py-3.5 px-4">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border font-mono whitespace-nowrap ${riskClass.badgeClass}`}>
                    {riskClass.label}
                  </span>
                </td>

                {/* 30D Return */}
                <td className="py-3.5 px-4 text-right">
                  <span
                    className={`font-bold tabular-nums font-mono ${
                      isPos ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatPercent(roi30d)}
                  </span>
                </td>

                {/* Win Rate */}
                <td className="py-3.5 px-4 text-right">
                  <span className="font-mono font-semibold text-slate-700 tabular-nums">
                    {winRate !== null ? `${winRate.toFixed(1)}%` : '—'}
                  </span>
                </td>

                {/* Max Drawdown */}
                <td className="py-3.5 px-4 text-right">
                  <span className={`font-semibold tabular-nums font-mono ${maxDd > 20 ? 'text-rose-600' : 'text-slate-700'}`}>
                    -{maxDd.toFixed(1)}%
                  </span>
                </td>

                {/* 30D PnL */}
                <td className="py-3.5 px-4 text-right">
                  <span className="font-semibold text-slate-800 tabular-nums font-mono">
                    {pnl30d >= 0 ? '+' : ''}{formatUSD(pnl30d, true)}
                  </span>
                </td>

                {/* Account Value */}
                <td className="py-3.5 px-4 text-right text-slate-800 font-semibold tabular-nums font-mono">
                  {formatUSD(trader.account_value, true)}
                </td>

                {/* 30D Sparkline */}
                <td className="py-3.5 px-4 text-center">
                  <div className="w-28 h-8 mx-auto bg-slate-50/80 rounded-lg p-1 border border-slate-200">
                    <RechartsSparkline
                      data={trader.equity_curve_30d}
                      height={24}
                      isPositive={isPos}
                      showTooltip={false}
                    />
                  </div>
                </td>

                {/* Action Buttons */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTrader(trader);
                      }}
                      className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSimulate(trader);
                      }}
                      className="py-1 px-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Practise Strategy</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
