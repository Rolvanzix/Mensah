import React from 'react';
import { SimulatedTrade } from '../../types/simulator';
import { formatUSD } from '../../services/strikeApi';
import { X, Calculator, ShieldAlert, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

interface TradeCalculationModalProps {
  trade: SimulatedTrade | null;
  onClose: () => void;
}

export const TradeCalculationModal: React.FC<TradeCalculationModalProps> = ({ trade, onClose }) => {
  if (!trade) return null;

  const isLong = trade.direction === 'LONG';
  const isWin = trade.isWin;
  const breakdown = trade.formulaBreakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#059669]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Trade #{trade.tradeNumber} Calculation Audit
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    isLong
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {trade.direction} {trade.symbol}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Deterministic mathematical audit for simulated execution on Strike Finance.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 text-xs text-slate-700">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500">Net Realized PnL</span>
              <div
                className={`font-mono text-base font-bold mt-0.5 ${
                  isWin ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {isWin ? '+' : ''}
                {formatUSD(trade.netPnLUsd)}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {trade.roiOnMarginPct > 0 ? '+' : ''}
                {trade.roiOnMarginPct}% on margin
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500">Notional Size</span>
              <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                {formatUSD(trade.positionSizeUsd)}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {formatUSD(trade.marginAllocatedUsd)} margin · {trade.leverage}x
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500">Entry / Exit</span>
              <div className="font-mono text-xs font-semibold text-slate-900 mt-1">
                {breakdown.entryPriceFormatted} → {breakdown.exitPriceFormatted}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Duration: {trade.holdingHours} hours
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500">Est. Liquidation</span>
              <div className="font-mono text-base font-bold text-amber-600 mt-0.5">
                ${trade.liquidationPriceEstimate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {isLong ? 'Below' : 'Above'} entry
              </span>
            </div>
          </div>

          {/* Formula Steps */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
              <span>Step-by-Step Mathematical Calculations</span>
            </h4>

            {/* Step 1: Position Sizing */}
            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-slate-200 space-y-1">
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>1. Position Sizing & Margin Allocation</span>
                <span className="text-[10px] bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">
                  Exact Calculation
                </span>
              </div>
              <div className="font-mono text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                Notional Size = Allocated Margin × Applied Leverage = {breakdown.marginAllocatedFormatted} × {breakdown.appliedLeverageFormatted} = {breakdown.nominalSizeFormatted}
              </div>
            </div>

            {/* Step 2: Gross PnL */}
            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-slate-200 space-y-1">
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>2. Gross Perpetual PnL</span>
                <span className="text-[10px] bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">
                  Exact Calculation
                </span>
              </div>
              <div className="font-mono text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                {breakdown.grossPnLFormula}
              </div>
            </div>

            {/* Step 3: Strike Perpetual Taker Fees */}
            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-slate-200 space-y-1">
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>3. Strike Finance Protocol Fees (0.06% Open + 0.06% Close)</span>
                <span className="text-[10px] bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">
                  Exact Calculation
                </span>
              </div>
              <div className="font-mono text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                {breakdown.feesFormula}
              </div>
              <div className="text-[11px] text-slate-500 pt-0.5">
                Open fee: ${trade.feeOpenUsd.toFixed(2)} · Close fee: ${trade.feeCloseUsd.toFixed(2)}
              </div>
            </div>

            {/* Step 4: Funding Rate Cost */}
            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-slate-200 space-y-1">
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>4. Funding Rate Adjustment (8h Intervals)</span>
                <span className="text-[10px] bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">
                  Exact Calculation
                </span>
              </div>
              <div className="font-mono text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                {breakdown.fundingFormula}
              </div>
              <div className="text-[11px] text-slate-500 pt-0.5">
                Rate: {trade.fundingRate8hPct > 0 ? '+' : ''}{trade.fundingRate8hPct}% per 8 hours ({trade.direction === 'LONG' ? 'Long pays Short' : 'Short pays Long'}).
              </div>
            </div>

            {/* Step 5: Net Realized PnL */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1">
              <div className="flex justify-between items-center text-[#059669] font-bold">
                <span>5. Net Realized PnL Result</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                  Final Result
                </span>
              </div>
              <div className="font-mono text-xs text-slate-900 bg-white p-2.5 rounded-lg border border-emerald-200">
                {breakdown.netPnLFormula}
              </div>
            </div>

            {/* Step 6: Estimated Liquidation Price */}
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
              <div className="flex justify-between items-center text-amber-800 font-semibold">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>6. Estimated Liquidation Price (Risk Metric)</span>
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  Estimated Value
                </span>
              </div>
              <div className="font-mono text-xs text-amber-900 bg-white p-2.5 rounded-lg border border-amber-200">
                {breakdown.liquidationPriceEstimateFormula}
              </div>
              <div className="text-[11px] text-slate-500 pt-1">
                Notice: Liquidation price is an isolated margin estimate. Live protocol index or oracle spikes may liquidate positions early.
              </div>
            </div>
          </div>

          {/* Assumptions Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-slate-600 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-800 font-semibold mb-1">
              <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Documented Simulation Assumptions</span>
            </div>
            {breakdown.assumptions.map((assump, idx) => (
              <div key={idx}>• {assump}</div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors border border-slate-200 cursor-pointer"
          >
            Close Audit Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
