import React from 'react';
import { Trader } from '../types/strike';
import {
  formatPercent,
  formatTradingStyle,
  formatUSD,
  getCopyScoreMeta,
  getDrawdown30d,
  getTrader24hVolatility,
  truncateAddress,
} from '../services/strikeApi';
import { RechartsSparkline } from './charts/RechartsSparkline';
import { ScoreRadialGauge } from './ui/ScoreRadialGauge';
import { Bookmark, Calculator, Check, Copy, TrendingDown, TrendingUp } from 'lucide-react';

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
    <div className="w-full overflow-x-auto bg-[#121722] border border-[#1c2438] rounded-2xl shadow-sm">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#1c2438] bg-[#0a0d14] text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <th className="py-3.5 px-4 w-12 text-center">#</th>
            <th className="py-3.5 px-4">Trader</th>
            <th className="py-3.5 px-4 text-center">Score</th>
            <th className="py-3.5 px-4">Market & Style</th>
            <th className="py-3.5 px-4 text-right">30D Return</th>
            <th className="py-3.5 px-4 text-right">30D Net PnL</th>
            <th className="py-3.5 px-4 text-right">30D Max DD</th>
            <th className="py-3.5 px-4 text-right">Vault Balance</th>
            <th className="py-3.5 px-4 text-center w-36">Trajectory</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1c2438]">
          {traders.map((trader, idx) => {
            const score = parseFloat(trader.copy_score || '0');
            const scoreMeta = getCopyScoreMeta(score);
            const roi30d = parseFloat(trader.roi?.['30d'] || '0');
            const pnl30d = parseFloat(trader.pnl?.['30d'] || '0');
            const maxDd = getDrawdown30d(trader);
            const volAlert = getTrader24hVolatility(trader);
            const isPos = roi30d >= 0;
            const watchlisted = isWatchlisted(trader.address);

            return (
              <tr
                key={trader.address}
                onClick={() => onSelectTrader(trader)}
                className="hover:bg-[#182030]/60 transition-colors cursor-pointer group"
              >
                {/* Index */}
                <td className="py-3.5 px-4 text-slate-500 text-center font-medium">{idx + 1}</td>

                {/* Trader Name / Address */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(trader.address);
                      }}
                      className="text-slate-500 hover:text-amber-400 p-1"
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${watchlisted ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    <div>
                      <div className="font-bold text-white group-hover:text-[#00f29d] transition-colors">
                        {trader.display_name || truncateAddress(trader.address, 4)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span>{truncateAddress(trader.address, 3)}</span>
                        <button
                          onClick={(e) => handleCopy(trader.address, e)}
                          title="Copy address"
                          className="hover:text-slate-300"
                        >
                          {copiedAddr === trader.address ? (
                            <Check className="w-2.5 h-2.5 text-[#00f29d]" />
                          ) : (
                            <Copy className="w-2.5 h-2.5" />
                          )}
                        </button>
                        {volAlert.hasAlert && (
                          <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1 rounded">
                            24h Spike
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

                {/* Style / Platform */}
                <td className="py-3.5 px-4">
                  <div className="text-slate-300 font-medium capitalize">
                    {formatTradingStyle(trader.style)}
                  </div>
                  <div className="text-[11px] text-slate-500 capitalize">
                    {trader.platform || 'Strike'} · {trader.bias || 'Neutral'}
                  </div>
                </td>

                {/* 30D Return */}
                <td className="py-3.5 px-4 text-right">
                  <span
                    className={`font-bold tabular-nums ${
                      isPos ? 'text-[#00f29d]' : 'text-rose-400'
                    }`}
                  >
                    {formatPercent(roi30d)}
                  </span>
                </td>

                {/* 30D PnL */}
                <td className="py-3.5 px-4 text-right">
                  <span className="font-semibold text-slate-200 tabular-nums">
                    {pnl30d >= 0 ? '+' : ''}{formatUSD(pnl30d, true)}
                  </span>
                </td>

                {/* Max Drawdown */}
                <td className="py-3.5 px-4 text-right">
                  <span className={`font-semibold tabular-nums ${maxDd > 20 ? 'text-rose-400' : 'text-slate-300'}`}>
                    -{maxDd.toFixed(1)}%
                  </span>
                </td>

                {/* Account Value */}
                <td className="py-3.5 px-4 text-right text-slate-200 font-semibold tabular-nums">
                  {formatUSD(trader.account_value, true)}
                </td>

                {/* 30D Sparkline */}
                <td className="py-3.5 px-4 text-center">
                  <div className="w-32 h-8 mx-auto bg-[#0a0d14] rounded-lg p-1 border border-[#1c2438]">
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSimulate(trader);
                    }}
                    className="py-1.5 px-3 bg-[#00f29d] hover:bg-[#50ffae] text-[#003921] font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3" />
                    <span>Simulate</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
