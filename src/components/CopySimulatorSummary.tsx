import React from 'react';
import { SimulatorOverview } from '../utils/simulationStore';
import { formatPercent, formatUSD } from '../services/strikeApi';
import { Sliders, TrendingUp, TrendingDown, ShieldCheck, ArrowRight, Play, Pause } from 'lucide-react';

interface CopySimulatorSummaryProps {
  overview: SimulatorOverview;
  onOpenSimulator: () => void;
  onToggleActive?: (id: string) => void;
}

export const CopySimulatorSummary: React.FC<CopySimulatorSummaryProps> = ({
  overview,
  onOpenSimulator,
  onToggleActive,
}) => {
  const isPositive = overview.netPnL >= 0;

  return (
    <div className="bg-[#121722]/90 border border-[#1c2438] rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header and Disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c2438]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#00f29d]/10 border border-[#00f29d]/30 text-[#00f29d]">
              <Sliders className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Copy Simulator Summary
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#19202f] border border-[#273248] text-[#00f29d]">
              Paper Portfolio
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Simulation data is completely segregated from real on-chain trading funds.</span>
          </p>
        </div>

        <button
          onClick={onOpenSimulator}
          className="self-start sm:self-auto px-3.5 py-1.5 bg-[#00f29d] hover:bg-[#00d68b] text-[#0b0e14] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,242,157,0.25)] cursor-pointer"
        >
          <span>Open Full Simulator</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Core Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Starting Balance */}
        <div className="p-3.5 rounded-xl bg-[#0b0e14]/70 border border-[#1c2438]">
          <span className="text-[11px] font-medium text-slate-400">
            Simulated Starting Balance
          </span>
          <div className="font-mono text-base sm:text-lg font-bold text-white mt-1">
            {formatUSD(overview.startingBalance)}
          </div>
          <span className="text-[10px] text-slate-500">Allocated capital</span>
        </div>

        {/* Current Balance */}
        <div className="p-3.5 rounded-xl bg-[#0b0e14]/70 border border-[#1c2438]">
          <span className="text-[11px] font-medium text-slate-400">
            Current Simulated Balance
          </span>
          <div className="font-mono text-base sm:text-lg font-bold text-white mt-1">
            {formatUSD(overview.currentBalance)}
          </div>
          <span className="text-[10px] text-slate-500">Mark-to-curve value</span>
        </div>

        {/* Net PnL */}
        <div className="p-3.5 rounded-xl bg-[#0b0e14]/70 border border-[#1c2438]">
          <span className="text-[11px] font-medium text-slate-400">
            Simulated Profit / Loss
          </span>
          <div
            className={`font-mono text-base sm:text-lg font-bold mt-1 flex items-center gap-1.5 ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>
              {isPositive ? '+' : ''}
              {formatUSD(overview.netPnL)}
            </span>
          </div>
          <span
            className={`font-mono text-[10px] font-semibold ${
              isPositive ? 'text-emerald-400/80' : 'text-rose-400/80'
            }`}
          >
            {isPositive ? '+' : ''}
            {overview.roiPct.toFixed(2)}% net simulated return
          </span>
        </div>

        {/* Active Simulations */}
        <div className="p-3.5 rounded-xl bg-[#0b0e14]/70 border border-[#1c2438]">
          <span className="text-[11px] font-medium text-slate-400">
            Active Strategy Models
          </span>
          <div className="font-mono text-base sm:text-lg font-bold text-[#00f29d] mt-1">
            {overview.activeSimulationsCount}
          </div>
          <span className="text-[10px] text-slate-500">
            {overview.simulations.length} total models configured
          </span>
        </div>
      </div>

      {/* Mini Active Strategy Rows if available */}
      {overview.simulations.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Active Mirrored Models
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {overview.simulations.slice(0, 2).map((sim) => {
              const simPositive = sim.netPnL >= 0;
              return (
                <div
                  key={sim.id}
                  className="p-3 rounded-xl bg-[#0b0e14]/50 border border-[#1c2438] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate">{sim.traderName}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#19202f] text-slate-400 font-mono">
                        {sim.leverage}x
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#19202f] text-[#00f29d] font-mono capitalize">
                        {sim.copyMode.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Allocated: {formatUSD(sim.startingCapital)} · Max DD: -{sim.maxDrawdownPct.toFixed(1)}%
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-bold ${
                        simPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {simPositive ? '+' : ''}
                      {formatUSD(sim.netPnL)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {simPositive ? '+' : ''}
                      {sim.roiPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
